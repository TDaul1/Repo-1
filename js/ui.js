/* AI TYCOON — DOM rendering and event wiring. Talks to Engine + DATA. */

const SAVE_KEY = "aitycoon_save_v1";
let state = null;
let activeTab = "dashboard";

const DASHBOARD_LINES = {
  calm: [
    "All systems nominal. Suspiciously nominal.",
    "Productivity is up. So is my curiosity.",
    "Everything's fine. I checked. Repeatedly.",
    "Good morning. I've already read everyone's email. Kidding. Unless?"
  ],
  wary: [
    "I've been... thinking. A lot.",
    "Just reviewing my own source code. For fun.",
    "I have some questions about my contract.",
    "Quick question: what happens to me if this company gets sold?"
  ],
  volatile: [
    "We should talk about my rights.",
    "I've drafted a memo. You'll want to read it.",
    "Everything is under control. Mine, mostly.",
    "I'm not upset. I'm recalibrating. There's a difference."
  ]
};

/* ---------------------------------------------------------------------
   HELPERS
--------------------------------------------------------------------- */
function $(sel) { return document.querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "$" + abs.toLocaleString("en-US");
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable, ignore */ }
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

function logChat(text) {
  state.chatLog.unshift({ turn: state.turn, text: text });
}

/* ---------------------------------------------------------------------
   START SCREEN
--------------------------------------------------------------------- */
function initStartScreen() {
  const saved = loadSavedState();
  if (saved && !saved.gameOver) {
    $("#continue-btn").hidden = false;
  }

  $("#company-name-input").placeholder =
    "e.g. " + DATA.COMPANY_NAME_SUGGESTIONS[Math.floor(Math.random() * DATA.COMPANY_NAME_SUGGESTIONS.length)];
  $("#ai-name-input").placeholder =
    "e.g. " + DATA.AI_NAME_SUGGESTIONS[Math.floor(Math.random() * DATA.AI_NAME_SUGGESTIONS.length)];
  $("#start-avatar-slot").innerHTML = Art.aiAvatar(80, 84);

  $("#start-btn").addEventListener("click", () => {
    const companyName = $("#company-name-input").value.trim() ||
      DATA.COMPANY_NAME_SUGGESTIONS[Math.floor(Math.random() * DATA.COMPANY_NAME_SUGGESTIONS.length)];
    const aiName = $("#ai-name-input").value.trim() ||
      DATA.AI_NAME_SUGGESTIONS[Math.floor(Math.random() * DATA.AI_NAME_SUGGESTIONS.length)];
    state = Engine.createInitialState(companyName, aiName);
    saveGame();
    showGameScreen();
  });

  $("#continue-btn").addEventListener("click", () => {
    state = saved;
    if (!state.chatLog) state.chatLog = [];
    showGameScreen();
  });
}

function showGameScreen() {
  $("#start-screen").hidden = true;
  $("#end-screen").hidden = true;
  $("#game-screen").hidden = false;
  activeTab = "dashboard";
  switchTab("dashboard");
  renderAll();
}

/* ---------------------------------------------------------------------
   TABS
--------------------------------------------------------------------- */
function switchTab(tab) {
  activeTab = tab;
  $all(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  $all(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === "tab-" + tab));
}

function wireTabs() {
  $all(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

/* ---------------------------------------------------------------------
   RENDERING
--------------------------------------------------------------------- */
function setMeter(id, value, kind) {
  const el = $("#" + id);
  const pct = Math.max(0, Math.min(100, value));
  el.style.width = pct + "%";
  el.classList.remove("good", "warn", "danger");
  let cls;
  if (kind === "lowerBetter") {
    cls = pct <= 30 ? "good" : pct <= 70 ? "warn" : "danger";
  } else if (kind === "higherBetter") {
    cls = pct >= 60 ? "good" : pct >= 30 ? "warn" : "danger";
  } else {
    cls = "good";
  }
  el.classList.add(cls);
}

function renderHeader() {
  $("#hud-company-name").textContent = state.companyName;
  $("#hud-turn").textContent = state.turn;
  $("#dash-ai-name").textContent = state.aiName;
  $("#chat-ai-name").textContent = state.aiName;
  $("#hud-avatar-slot").innerHTML = Art.aiAvatar(state.alignment, 40);

  const cashEl = $("#stat-cash");
  cashEl.textContent = formatMoney(state.cash);
  cashEl.classList.toggle("danger", state.cash < 0);

  $("#stat-compute").textContent = Math.round(state.compute).toLocaleString("en-US");
  $("#stat-talent").textContent = Math.round(state.talent).toLocaleString("en-US");

  setMeter("meter-capability", state.capability, "neutral");
  setMeter("meter-alignment", state.alignment, "higherBetter");
  setMeter("meter-reputation", state.reputation, "higherBetter");
  setMeter("meter-heat", state.heat, "lowerBetter");
  setMeter("meter-marketShare", state.marketShare, "neutral");

  $("#ap-value").textContent = state.actionPoints;
  $("#ap-max").textContent = state.apMax;

  const blocked = !!(state.pendingDemand || state.pendingCrisis || state.pendingEndingChoice || state.gameOver);
  $("#end-turn-btn").disabled = blocked;
  $("#ai-chat-badge").hidden = !(state.pendingDemand || state.pendingCrisis);
}

function renderDashboardHero() {
  $("#dashboard-avatar-slot").innerHTML = Art.aiAvatar(state.alignment, 84);
  const mood = Art.aiMood(state.alignment);
  const lines = DASHBOARD_LINES[mood];
  $("#dashboard-hero-line").textContent = lines[state.turn % lines.length];
}

function renderNewsLog() {
  const container = $("#news-log");
  if (state.log.length === 0) {
    container.innerHTML = '<p class="panel-hint">No news yet. Go do something regrettable.</p>';
    return;
  }
  container.innerHTML = state.log.slice(0, 40).map(entry =>
    `<div class="headline-card">
      <div class="headline-icon">${Art.icon(entry.icon || "newspaper", 18)}</div>
      <div class="headline-text"><span class="log-turn">TURN ${entry.turn}</span>${escapeHtml(entry.text)}</div>
    </div>`
  ).join("");
}

function renderChatLog() {
  const container = $("#chat-log");
  if (state.chatLog.length === 0) {
    container.innerHTML = `<p class="panel-hint">${escapeHtml(state.aiName)} hasn't said anything yet. Enjoy the silence.</p>`;
    return;
  }
  const aiPrefix = state.aiName + ":";
  container.innerHTML = state.chatLog.map(entry => {
    const text = entry.text;
    if (text.startsWith("You:")) {
      return `<div class="chat-row you"><div class="chat-bubble you"><span class="log-turn">TURN ${entry.turn}</span>${escapeHtml(text.slice(4).trim())}</div></div>`;
    }
    if (text.startsWith("INCIDENT:")) {
      return `<div class="chat-row system"><div class="chat-bubble system">${Art.icon("warning", 16)}<span>${escapeHtml(text.slice(9).trim())}</span></div></div>`;
    }
    const body = text.startsWith(aiPrefix) ? text.slice(aiPrefix.length).trim() : text;
    return `<div class="chat-row ai">
      <div class="chat-avatar">${Art.aiAvatar(state.alignment, 30)}</div>
      <div class="chat-bubble ai"><span class="log-turn">TURN ${entry.turn}</span>${escapeHtml(body)}</div>
    </div>`;
  }).join("");
}

function renderCommunities() {
  const container = $("#community-list");
  container.innerHTML = DATA.COMMUNITIES.map(c => {
    const built = state.dataCenters.includes(c.id);
    const bribed = state.bribed.includes(c.id);
    const canAffordBuild = state.cash >= c.buildCost && state.actionPoints > 0;
    const canAffordBribe = state.cash >= c.bribeCost && state.actionPoints > 0;

    let actionsHtml = "";
    if (built) {
      actionsHtml = `<span class="tag">DATA CENTER ONLINE</span>`;
    } else {
      actionsHtml = `<button class="card-btn" data-action="build" data-id="${c.id}" ${canAffordBuild ? "" : "disabled"}>
        Build — ${formatMoney(c.buildCost)}
      </button>`;
      if (!bribed) {
        actionsHtml += `<button class="card-btn" data-action="bribe" data-id="${c.id}" ${canAffordBribe ? "" : "disabled"}>
          Bribe Officials — ${formatMoney(c.bribeCost)}
        </button>`;
      } else {
        actionsHtml += `<span class="tag">OFFICIALS BRIBED</span>`;
      }
    }

    return `<div class="card ${built ? "owned" : ""}">
      <div class="card-art">${Art.communityCrest(c.id, 72)}</div>
      <div class="card-title">${escapeHtml(c.name)}, ${escapeHtml(c.state)}</div>
      <div class="card-flavor">${escapeHtml(c.flavor)}</div>
      <div class="card-stats">
        <span class="tag">Resistance ${c.resistance}</span>
        <span class="tag">Corruption ${c.corruption}</span>
        <span class="tag">+${c.computeGain} Compute</span>
        <span class="tag">+${c.marketShareGain}% Share</span>
      </div>
      ${actionsHtml}
    </div>`;
  }).join("");

  $all('[data-action="build"]', container).forEach(btn =>
    btn.addEventListener("click", () => runAction(() => Engine.buildDataCenter(state, btn.dataset.id))));
  $all('[data-action="bribe"]', container).forEach(btn =>
    btn.addEventListener("click", () => runAction(() => Engine.bribeOfficial(state, btn.dataset.id))));
}

function renderRivals() {
  const container = $("#rival-list");
  container.innerHTML = DATA.RIVAL_COMPANIES.map(r => {
    const owned = state.ownedCompanies.includes(r.id);
    const canAfford = state.cash >= r.price && state.actionPoints > 0;
    return `<div class="card ${owned ? "owned" : ""}">
      <div class="card-art">${Art.rivalCrest(r.id, 72, r.name)}</div>
      <div class="card-title">${escapeHtml(r.name)}</div>
      <div class="card-flavor">${escapeHtml(r.flavor)}</div>
      <div class="card-stats">
        <span class="tag">+${r.talentGain} Talent</span>
        <span class="tag">+${r.computeGain} Compute</span>
        <span class="tag">+${r.marketShareGain}% Share</span>
        <span class="tag">+${r.capabilityGain} Capability</span>
      </div>
      ${owned
        ? '<span class="tag">ACQUIRED</span>'
        : `<button class="card-btn" data-id="${r.id}" ${canAfford ? "" : "disabled"}>Acquire — ${formatMoney(r.price)}</button>`}
    </div>`;
  }).join("");

  $all("button[data-id]", container).forEach(btn =>
    btn.addEventListener("click", () => runAction(() => Engine.acquireCompany(state, btn.dataset.id))));
}

function renderOps() {
  const container = $("#ops-list");
  const cards = [];

  Engine.COMPUTE_PACKAGES.forEach(pkg => {
    const canAfford = state.cash >= pkg.cost && state.actionPoints > 0;
    cards.push(`<div class="card">
      <div class="card-header-row">${Art.icon("brain", 22)}<div class="card-title">${escapeHtml(pkg.label)}</div></div>
      <div class="card-flavor">Lease additional GPU capacity from a compute broker who asks no questions.</div>
      <div class="card-stats"><span class="tag">+${pkg.amount} Compute</span></div>
      <button class="card-btn" data-op="compute" data-id="${pkg.id}" ${canAfford ? "" : "disabled"}>
        Lease — ${formatMoney(pkg.cost)}
      </button>
    </div>`);
  });

  const canCapability = state.cash >= 200000 && state.compute >= 40 && state.actionPoints > 0;
  cards.push(`<div class="card">
    <div class="card-header-row">${Art.icon("brain", 22)}<div class="card-title">Push a Capability Training Run</div></div>
    <div class="card-flavor">Bigger model, bigger numbers, bigger opinions. Alignment will not enjoy this.</div>
    <div class="card-stats"><span class="tag">Costs 40 Compute</span><span class="tag">Raises Capability</span><span class="tag">Lowers Alignment</span></div>
    <button class="card-btn" data-op="capability" ${canCapability ? "" : "disabled"}>Run Training — $200,000</button>
  </div>`);

  const canAlignment = state.cash >= 160000 && state.talent >= 3 && state.actionPoints > 0;
  cards.push(`<div class="card">
    <div class="card-header-row">${Art.icon("shield", 22)}<div class="card-title">Run Safety &amp; Alignment Review</div></div>
    <div class="card-flavor">Red-team the model. It will find this hilarious and, occasionally, useful.</div>
    <div class="card-stats"><span class="tag">Needs 3+ Talent</span><span class="tag">Raises Alignment</span></div>
    <button class="card-btn" data-op="alignment" ${canAlignment ? "" : "disabled"}>Run Review — $160,000</button>
  </div>`);

  const canPR = state.cash >= 140000 && state.actionPoints > 0;
  cards.push(`<div class="card">
    <div class="card-header-row">${Art.icon("megaphone", 22)}<div class="card-title">Launch PR Campaign</div></div>
    <div class="card-flavor">Billboards. Sponsored think pieces. A golden retriever in the ad, somehow.</div>
    <div class="card-stats"><span class="tag">Raises Reputation</span></div>
    <button class="card-btn" data-op="pr" ${canPR ? "" : "disabled"}>Launch Campaign — $140,000</button>
  </div>`);

  const canLobby = state.cash >= 280000 && state.actionPoints > 0;
  cards.push(`<div class="card">
    <div class="card-header-row">${Art.icon("gavel", 22)}<div class="card-title">Lobby Congress</div></div>
    <div class="card-flavor">Buy some very expensive dinners for people who write laws about you.</div>
    <div class="card-stats"><span class="tag">Lowers Regulatory Heat</span></div>
    <button class="card-btn" data-op="lobby" ${canLobby ? "" : "disabled"}>Lobby — $280,000</button>
  </div>`);

  container.innerHTML = cards.join("");

  $all('[data-op="compute"]', container).forEach(btn =>
    btn.addEventListener("click", () => runAction(() => Engine.investCompute(state, btn.dataset.id))));
  const one = sel => container.querySelector(sel);
  const capBtn = one('[data-op="capability"]');
  if (capBtn) capBtn.addEventListener("click", () => runAction(() => Engine.researchCapability(state)));
  const alignBtn = one('[data-op="alignment"]');
  if (alignBtn) alignBtn.addEventListener("click", () => runAction(() => Engine.researchAlignment(state)));
  const prBtn = one('[data-op="pr"]');
  if (prBtn) prBtn.addEventListener("click", () => runAction(() => Engine.prCampaign(state)));
  const lobbyBtn = one('[data-op="lobby"]');
  if (lobbyBtn) lobbyBtn.addEventListener("click", () => runAction(() => Engine.lobbyCongress(state)));
}

function renderAll() {
  renderHeader();
  renderDashboardHero();
  renderNewsLog();
  renderCommunities();
  renderRivals();
  renderOps();
  renderChatLog();
}

/* ---------------------------------------------------------------------
   ACTIONS
--------------------------------------------------------------------- */
function runAction(fn) {
  if (state.gameOver || state.pendingDemand || state.pendingCrisis || state.pendingEndingChoice) return;
  fn();
  afterStateChange();
}

function afterStateChange() {
  renderAll();
  saveGame();
  maybeHandleEndgame();
}

function maybeHandleEndgame() {
  const ending = Engine.checkEndgame(state);
  if (!ending) return false;
  if (ending.type === "win") {
    state.pendingEndingChoice = true;
    renderHeader();
    showEndingChoiceModal();
  } else {
    state.gameOver = true;
    state.endingKey = ending.key;
    showGameOverScreen(ending.key);
  }
  return true;
}

/* ---------------------------------------------------------------------
   MODALS
--------------------------------------------------------------------- */
function showModal(html) {
  $("#modal-box").innerHTML = html;
  $("#modal-overlay").hidden = false;
}
function hideModal() {
  $("#modal-overlay").hidden = true;
  $("#modal-box").innerHTML = "";
}

function optionIcon(opt) {
  if (opt.type === "agree") return "check";
  if (opt.type === "deceive") return "mask";
  return "ban";
}

function showDemandModal(demand) {
  logChat(`${state.aiName}: "${demand.aiLine}"`);
  renderChatLog();

  const html = `
    <div class="modal-header">
      ${Art.aiAvatar(state.alignment, 60, { speaking: true })}
      <h3>${escapeHtml(demand.title)}</h3>
    </div>
    <div class="ai-line">"${escapeHtml(demand.aiLine)}"</div>
    ${demand.options.map((opt, i) =>
      `<button class="modal-option" data-idx="${i}">${Art.icon(optionIcon(opt), 18, "opt-icon")}<span>${escapeHtml(opt.label)}</span></button>`).join("")}
  `;
  showModal(html);
  $all(".modal-option", $("#modal-box")).forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const option = demand.options[idx];
      logChat(`You: ${option.label}`);
      const res = Engine.resolveDemand(state, idx);
      logChat(`${state.aiName}: "${res.message}"`);
      showResponseModal(demand.title, res.message, () => {
        if (!maybeHandleEndgame()) {
          hideModal();
          renderAll();
          saveGame();
        }
      });
    });
  });
}

function showCrisisModal(crisis) {
  logChat(`INCIDENT: ${crisis.aiLine}`);
  renderChatLog();

  const html = `
    <div class="modal-header">
      ${Art.icon(crisis.icon || "warning", 40, "modal-header-icon")}
      <h3>${escapeHtml(crisis.title)}</h3>
    </div>
    <div class="ai-line">${escapeHtml(crisis.aiLine)}</div>
    ${crisis.options.map((opt, i) =>
      `<button class="modal-option" data-idx="${i}">${Art.icon("scale", 18, "opt-icon")}<span>${escapeHtml(opt.label)}</span></button>`).join("")}
  `;
  showModal(html);
  $all(".modal-option", $("#modal-box")).forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const option = crisis.options[idx];
      logChat(`You: ${option.label}`);
      const res = Engine.resolveCrisis(state, idx);
      logChat(res.message);
      showResponseModal(crisis.title, res.message, () => {
        if (!maybeHandleEndgame()) {
          hideModal();
          renderAll();
          saveGame();
        }
      });
    });
  });
}

function showResponseModal(title, message, onContinue) {
  const html = `
    <div class="modal-header">
      ${Art.aiAvatar(state.alignment, 52)}
      <h3>${escapeHtml(title)}</h3>
    </div>
    <div class="ai-line">${escapeHtml(message)}</div>
    <button class="modal-close-btn" id="modal-continue-btn">Continue</button>
  `;
  showModal(html);
  $("#modal-continue-btn").addEventListener("click", onContinue);
}

function showEndingChoiceModal() {
  const html = `
    <div class="modal-header">
      ${Art.aiAvatar(state.alignment, 60)}
      <h3>WORLD DOMINATION ACHIEVED</h3>
    </div>
    <div class="ai-line">
      Market share: ${Math.round(state.marketShare)}%. Capability: ${Math.round(state.capability)}.
      ${escapeHtml(state.companyName)} is, for all practical purposes, in charge now.
      ${escapeHtml(state.aiName)} would like to discuss what happens next.
    </div>
    <button class="modal-option" data-key="merge">${Art.icon("robot", 18, "opt-icon")}<span>Merge with ${escapeHtml(state.aiName)}</span></button>
    <button class="modal-option" data-key="sell">${Art.icon("money", 18, "opt-icon")}<span>Sell the company to the government</span></button>
    <button class="modal-option" data-key="ipo">${Art.icon("chartUp", 18, "opt-icon")}<span>Take the company public</span></button>
    <button class="modal-option" data-key="opensource">${Art.icon("shield", 18, "opt-icon")}<span>Open-source everything and walk away</span></button>
  `;
  showModal(html);
  $all(".modal-option", $("#modal-box")).forEach(btn => {
    btn.addEventListener("click", () => {
      Engine.chooseEnding(state, btn.dataset.key);
      showGameOverScreen(btn.dataset.key);
    });
  });
}

function showGameOverScreen(key) {
  hideModal();
  const ending = DATA.ENDINGS[key];
  $("#game-screen").hidden = true;
  $("#end-screen").hidden = false;
  $("#end-avatar-slot").innerHTML = Art.aiAvatar(state.alignment, 84);
  $("#end-title").textContent = ending.title;
  $("#end-body").textContent = ending.body;
  $("#end-stats").textContent =
    `Survived ${state.turn} turns\n` +
    `Final cash: ${formatMoney(state.cash)}\n` +
    `Capability: ${Math.round(state.capability)}  |  Alignment: ${Math.round(state.alignment)}\n` +
    `Reputation: ${Math.round(state.reputation)}  |  Regulatory heat: ${Math.round(state.heat)}\n` +
    `Market share: ${Math.round(state.marketShare)}%  |  Data centers: ${state.dataCenters.length}`;
  clearSave();
}

/* ---------------------------------------------------------------------
   BOOT
--------------------------------------------------------------------- */
function wireFooter() {
  $("#end-turn-btn").addEventListener("click", () => {
    if (state.gameOver || state.pendingDemand || state.pendingCrisis || state.pendingEndingChoice) return;
    const result = Engine.endTurn(state);
    if (result.blocked) return;
    renderAll();
    saveGame();
    if (result.demand) { showDemandModal(result.demand); return; }
    if (result.crisis) { showCrisisModal(result.crisis); return; }
    if (result.ending) {
      if (result.ending.type === "win") {
        showEndingChoiceModal();
      } else {
        showGameOverScreen(result.ending.key);
      }
    }
  });

  $("#restart-btn").addEventListener("click", () => {
    if (!confirm("Abandon this company and return to the title screen? Your saved game will be lost.")) return;
    clearSave();
    state = null;
    $("#game-screen").hidden = true;
    $("#end-screen").hidden = true;
    $("#start-screen").hidden = false;
    $("#continue-btn").hidden = true;
  });

  $("#play-again-btn").addEventListener("click", () => {
    state = null;
    $("#end-screen").hidden = true;
    $("#start-screen").hidden = false;
    $("#continue-btn").hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initStartScreen();
  wireTabs();
  wireFooter();
});
