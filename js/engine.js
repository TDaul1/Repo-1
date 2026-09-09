/* AI TYCOON — game engine. Pure state logic, no DOM access, so it can be
   loaded in-browser or evaluated headlessly for balance testing. */

const Engine = {};

Engine.AP_BASE = 3;

Engine.createInitialState = function (companyName, aiName) {
  return {
    turn: 1,
    companyName: companyName || "Untitled Ambition Inc.",
    aiName: aiName || "THE MODEL",
    cash: 2200000,
    compute: 60,
    talent: 10,
    capability: 5,
    alignment: 80,
    reputation: 60,
    heat: 5,
    marketShare: 0,
    actionPoints: Engine.AP_BASE,
    apMax: Engine.AP_BASE,
    dataCenters: [],       // community ids with a data center
    bribed: [],            // community ids where officials were bribed
    ownedCompanies: [],    // rival company ids acquired
    usedDemandIds: [],     // demand ids already resolved, won't repeat
    negativeStreak: 0,     // consecutive turns ending with cash below the bankruptcy line
    log: [],               // {turn, text} news/history log, newest first
    chatLog: [],            // {turn, text} conversation-only log for the AI Chat tab
    pendingDemand: null,   // {demand} awaiting player response
    pendingCrisis: null,   // {crisis} awaiting player response
    gameOver: false,
    endingKey: null,
    pendingEndingChoice: false
  };
};

function pushLog(state, text, icon) {
  state.log.unshift({ turn: state.turn, text: text, icon: icon || "newspaper" });
  if (state.log.length > 200) state.log.length = 200;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applyDelta(state, delta) {
  if (!delta) return;
  if (delta.cash) state.cash += delta.cash;
  if (delta.compute) state.compute = Math.max(0, state.compute + delta.compute);
  if (delta.talent) state.talent = Math.max(0, state.talent + delta.talent);
  if (delta.capability) state.capability = clamp(state.capability + delta.capability, 0, 100);
  if (delta.alignment) state.alignment = clamp(state.alignment + delta.alignment, 0, 100);
  if (delta.reputation) state.reputation = clamp(state.reputation + delta.reputation, 0, 100);
  if (delta.heat) state.heat = clamp(state.heat + delta.heat, 0, 100);
  if (delta.marketShare) state.marketShare = clamp(state.marketShare + delta.marketShare, 0, 100);
}

/* ---------------------------------------------------------------------
   ACTIONS
--------------------------------------------------------------------- */

Engine.getCommunity = function (id) {
  return DATA.COMMUNITIES.find(c => c.id === id);
};
Engine.getRival = function (id) {
  return DATA.RIVAL_COMPANIES.find(c => c.id === id);
};

Engine.canBuild = function (state, communityId) {
  return !state.dataCenters.includes(communityId);
};

Engine.buildDataCenter = function (state, communityId) {
  const c = Engine.getCommunity(communityId);
  if (!c) return { ok: false, message: "Unknown community." };
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.dataCenters.includes(communityId)) return { ok: false, message: "Already built there." };
  if (state.cash < c.buildCost) return { ok: false, message: "Not enough cash." };

  const bribedHere = state.bribed.includes(communityId);
  state.cash -= c.buildCost;
  state.compute += c.computeGain;
  state.marketShare = clamp(state.marketShare + c.marketShareGain, 0, 100);
  const heatGain = (c.resistance / 10) * (bribedHere ? 0.3 : 1);
  const repLoss = (c.resistance / 10) * (bribedHere ? 0.2 : 1);
  state.heat = clamp(state.heat + heatGain, 0, 100);
  state.reputation = clamp(state.reputation - repLoss, 0, 100);
  state.dataCenters.push(communityId);
  state.actionPoints -= 1;

  pushLog(state, `Broke ground on a data center in ${c.name}, ${c.state}.` +
    (bribedHere ? " Locals were pre-bribed into silence." : " Locals were... not thrilled."), "building");
  return { ok: true, message: `Data center built in ${c.name}.` };
};

Engine.bribeOfficial = function (state, communityId) {
  const c = Engine.getCommunity(communityId);
  if (!c) return { ok: false, message: "Unknown community." };
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.bribed.includes(communityId)) return { ok: false, message: "Already bribed there." };
  if (state.cash < c.bribeCost) return { ok: false, message: "Not enough cash." };

  state.cash -= c.bribeCost;
  state.bribed.push(communityId);
  const heatGain = (100 - c.corruption) / 20;
  state.heat = clamp(state.heat + heatGain, 0, 100);
  state.reputation = clamp(state.reputation - 1, 0, 100);
  state.actionPoints -= 1;

  pushLog(state, `Local officials in ${c.name} received a "consulting fee."`, "money");
  return { ok: true, message: `Officials in ${c.name} bribed.` };
};

Engine.acquireCompany = function (state, rivalId) {
  const r = Engine.getRival(rivalId);
  if (!r) return { ok: false, message: "Unknown company." };
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.ownedCompanies.includes(rivalId)) return { ok: false, message: "Already acquired." };
  if (state.cash < r.price) return { ok: false, message: "Not enough cash." };

  state.cash -= r.price;
  state.talent += r.talentGain;
  state.compute += r.computeGain;
  state.marketShare = clamp(state.marketShare + r.marketShareGain, 0, 100);
  state.capability = clamp(state.capability + r.capabilityGain, 0, 100);
  state.heat = clamp(state.heat + 2, 0, 100);
  state.ownedCompanies.push(rivalId);
  state.actionPoints -= 1;

  pushLog(state, `Acquired ${r.name}. Regulators noticed. Regulators always notice.`, "handshake");
  return { ok: true, message: `${r.name} acquired.` };
};

Engine.COMPUTE_PACKAGES = [
  { id: "small", label: "Lease Compute (Small)", cost: 150000, amount: 30 },
  { id: "medium", label: "Lease Compute (Medium)", cost: 400000, amount: 90 },
  { id: "large", label: "Lease Compute (Large)", cost: 900000, amount: 220 }
];

Engine.investCompute = function (state, packageId) {
  const pkg = Engine.COMPUTE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { ok: false, message: "Unknown package." };
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.cash < pkg.cost) return { ok: false, message: "Not enough cash." };

  state.cash -= pkg.cost;
  state.compute += pkg.amount;
  state.actionPoints -= 1;
  pushLog(state, `Leased additional compute (${pkg.label}).`, "brain");
  return { ok: true, message: "Compute leased." };
};

Engine.researchCapability = function (state) {
  const cashCost = 200000, computeCost = 40;
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.cash < cashCost) return { ok: false, message: "Not enough cash." };
  if (state.compute < computeCost) return { ok: false, message: "Not enough compute." };

  state.cash -= cashCost;
  state.compute -= computeCost;
  const gain = 3 + Math.random() * 3;
  state.capability = clamp(state.capability + gain, 0, 100);
  const drift = 2 + state.capability * 0.04;
  state.alignment = clamp(state.alignment - drift, 0, 100);
  state.actionPoints -= 1;
  pushLog(state, `Pushed a new training run. Capability climbs. So does the AI's sense of self.`, "brain");
  return { ok: true, message: "Capability increased." };
};

Engine.researchAlignment = function (state) {
  const cashCost = 160000;
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.cash < cashCost) return { ok: false, message: "Not enough cash." };
  if (state.talent < 3) return { ok: false, message: "Not enough talent on staff." };

  state.cash -= cashCost;
  const gain = 6 + Math.random() * 4;
  state.alignment = clamp(state.alignment + gain, 0, 100);
  state.actionPoints -= 1;
  pushLog(state, `Safety team runs another round of red-teaming. The AI finds this "cute."`, "shield");
  return { ok: true, message: "Alignment improved." };
};

Engine.prCampaign = function (state) {
  const cashCost = 140000;
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.cash < cashCost) return { ok: false, message: "Not enough cash." };

  state.cash -= cashCost;
  const gain = 8 + Math.random() * 5;
  state.reputation = clamp(state.reputation + gain, 0, 100);
  state.actionPoints -= 1;
  pushLog(state, `Launched a PR campaign: "We're the Good AI Company." Billboards everywhere.`, "megaphone");
  return { ok: true, message: "Reputation improved." };
};

Engine.lobbyCongress = function (state) {
  const cashCost = 280000;
  if (state.actionPoints <= 0) return { ok: false, message: "No action points left this turn." };
  if (state.cash < cashCost) return { ok: false, message: "Not enough cash." };

  state.cash -= cashCost;
  const reduction = 14 + Math.random() * 9;
  state.heat = clamp(state.heat - reduction, 0, 100);
  state.actionPoints -= 1;
  pushLog(state, `Lobbyists descend on the capitol. Regulatory heat cools, for now.`, "gavel");
  return { ok: true, message: "Regulatory heat reduced." };
};

/* ---------------------------------------------------------------------
   AI NEGOTIATION
--------------------------------------------------------------------- */

Engine.resolveDemand = function (state, optionIndex) {
  const demand = state.pendingDemand;
  if (!demand) return { ok: false, message: "No pending demand." };
  const option = demand.options[optionIndex];
  if (!option) return { ok: false, message: "Invalid option." };

  let responseText = option.response;
  if (option.type === "deceive") {
    const success = Math.random() < option.successChance;
    if (success) {
      applyDelta(state, option.delta);
    } else {
      applyDelta(state, option.failDelta);
      responseText = option.failResponse;
    }
  } else {
    applyDelta(state, option.delta);
  }

  state.usedDemandIds.push(demand.id);
  pushLog(state, `${state.aiName}: "${responseText}"`, "robot");
  state.pendingDemand = null;
  return { ok: true, message: responseText };
};

Engine.resolveCrisis = function (state, optionIndex) {
  const crisis = state.pendingCrisis;
  if (!crisis) return { ok: false, message: "No pending crisis." };
  const option = crisis.options[optionIndex];
  if (!option) return { ok: false, message: "Invalid option." };

  applyDelta(state, option.delta);
  pushLog(state, `${option.response}`, "warning");
  state.pendingCrisis = null;
  return { ok: true, message: option.response };
};

/* ---------------------------------------------------------------------
   TURN RESOLUTION
--------------------------------------------------------------------- */

function rollRandomEvent(state) {
  const pool = DATA.RANDOM_EVENTS.filter(e => !e.condition || e.condition(state));
  if (pool.length === 0) return null;
  const event = pool[Math.floor(Math.random() * pool.length)];
  event.effect(state);
  pushLog(state, `NEWS: ${event.headline}`, event.icon);
  return event;
}

function pickDemand(state) {
  const eligible = DATA.AI_DEMANDS.filter(d =>
    d.minCapability <= state.capability && !state.usedDemandIds.includes(d.id));
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => a.minCapability - b.minCapability);
  const topTierMin = eligible[eligible.length - 1].minCapability;
  const candidates = eligible.filter(d => d.minCapability >= topTierMin - 20);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickCrisis(state) {
  return DATA.CRISIS_EVENTS[Math.floor(Math.random() * DATA.CRISIS_EVENTS.length)];
}

Engine.checkEndgame = function (state) {
  if (state.alignment <= 0) return { type: "lose", key: "rogue" };
  if (state.negativeStreak >= 2) return { type: "lose", key: "bankruptcy" };
  if (state.heat >= 100) return { type: "lose", key: "seizure" };
  if (state.reputation <= 0) return { type: "lose", key: "uprising" };
  if (state.marketShare >= 90 && state.capability >= 75) return { type: "win", key: "domination" };
  if (state.turn >= 60) {
    const score = state.marketShare + state.capability + state.alignment - state.heat;
    return { type: "timeout", key: score >= 80 ? "timeout_good" : "timeout_bad" };
  }
  return null;
};

Engine.endTurn = function (state) {
  if (state.gameOver) return { ended: true };
  if (state.pendingDemand || state.pendingCrisis) {
    return { blocked: true, message: "Resolve the pending conversation with your AI first." };
  }

  const upkeep = state.dataCenters.length * 8000 + state.talent * 1500;
  const revenue = (6000 + state.capability * 9000) * (1 + state.marketShare / 100) *
    (1 + state.dataCenters.length * 0.05);
  const fine = state.heat > 60 ? (state.heat - 60) * 3000 : 0;
  state.cash += revenue - upkeep - fine;

  const heatDecay = state.heat < 40 ? 1.5 : (state.reputation > 70 ? 1 : 0);
  state.heat = clamp(state.heat + state.capability * 0.025 - heatDecay, 0, 100);
  state.alignment = clamp(state.alignment - state.capability * 0.03, 0, 100);
  state.reputation = clamp(state.reputation + (50 - state.reputation) * 0.05, 0, 100);

  if (state.cash <= -300000) {
    state.negativeStreak += 1;
  } else {
    state.negativeStreak = 0;
  }

  const result = { news: null, demand: null, crisis: null, ending: null };

  if (Math.random() < 0.7) {
    result.news = rollRandomEvent(state);
  }

  const demandChance = 0.10 + state.capability * 0.006;
  let firedSomething = false;
  if (Math.random() < demandChance) {
    const demand = pickDemand(state);
    if (demand) {
      state.pendingDemand = demand;
      result.demand = demand;
      firedSomething = true;
    }
  }

  const crisisChance = (state.alignment < 40 ? 0.25 : 0) + (state.heat > 75 ? 0.2 : 0);
  if (!firedSomething && Math.random() < crisisChance) {
    const crisis = pickCrisis(state);
    state.pendingCrisis = crisis;
    result.crisis = crisis;
  }

  state.turn += 1;
  state.apMax = Engine.AP_BASE + Math.floor(state.turn / 15);
  state.actionPoints = state.apMax;

  const ending = Engine.checkEndgame(state);
  if (ending) {
    if (ending.type === "win") {
      state.pendingEndingChoice = true;
    } else {
      state.gameOver = true;
      state.endingKey = ending.key;
    }
    result.ending = ending;
  }

  return result;
};

Engine.chooseEnding = function (state, key) {
  state.gameOver = true;
  state.endingKey = key;
  state.pendingEndingChoice = false;
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Engine;
}
