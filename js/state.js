// Character state model and the core numeric rules for aging/death.
// Kept free of DOM code so every other module (event engine, career,
// family, health, finance...) can import and mutate this state without
// touching rendering logic.

function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// For signed -100..100 stats (reputation, morality, personality traits).
function clampSigned(value) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createCharacter({ name, nationality, gender }) {
  return {
    name,
    nationality,
    gender,
    age: 0,
    birthMonth: randInt(1, 12),
    birthDay: randInt(1, 28),
    alive: true,

    stats: {
      health: clampStat(randInt(75, 100)),
      happiness: clampStat(randInt(60, 100)),
      smarts: clampStat(randInt(30, 70)),
      looks: clampStat(randInt(30, 70)),
      // Deeper layer, largely hidden/secondary in the UI but mechanically
      // load-bearing throughout family/health/finance/talent systems.
      mentalHealth: clampStat(randInt(60, 95)),
      stress: clampStat(randInt(5, 25)),
      discipline: clampStat(randInt(30, 70)),
      athleticism: clampStat(randInt(30, 70)),
      socialSkill: clampStat(randInt(30, 70)),
    },

    reputation: 0, // -100..100, community standing
    fame: 0, // 0..100, celebrity/notoriety visibility
    morality: 0, // -100..100, drifts with major choices; flavors the epitaph
    personality: {
      bold: clampSigned(randInt(-40, 40)), // cautious <-> reckless; feeds crime/heist odds
      honest: clampSigned(randInt(-40, 40)), // feeds white-collar remorse/happiness swings
      generous: clampSigned(randInt(-40, 40)), // feeds relationship-building efficiency
    },

    skills: { music: 0, art: 0, sports: 0, tech: 0, cooking: 0 }, // 0-100, built by practicing
    talents: [], // discovered prodigy-tier talents, unlock special career/event paths

    fertility: clampStat(randInt(70, 100)),
    married: false,
    spouseId: null,
    pregnant: null, // { dueAge } while expecting

    money: randInt(0, 200), // birth gifts / allowance
    investments: [], // [{ id, type: 'stocks'|'crypto'|'retirement', principal, value }]
    business: null, // { name, type, capital, employees, yearsRun }

    relationships: [], // [{ id, name, type, quality, age, alive }] — seeded at birth in main.js
    conditions: [], // [{ id, name, category:'disease'|'injury'|'mental'|'addiction', severity, chronic, startedAge }]

    education: {
      stage: "none", // none -> elementary -> middle -> high -> high_grad -> college -> college_grad -> grad -> grad_grad
      gpa: 70,
      major: null,
      yearsInStage: 0,
      dropout: false,
    },
    career: {
      job: null, // { id, title, category, salary, level }
      yearsAtJob: 0,
    },
    assets: [], // [{ id, kind: 'car'|'house', name, value, icon }]
    criminal: {
      heat: 0, // 0-100, passive law-enforcement attention; raises catch odds on every crime
      timesArrested: 0,
      timesEscaped: 0,
      gang: null, // { name, rank: 'prospect'|'associate'|'soldier'|'capo'|'boss', loyalty } once recruited
    },
    jail: {
      yearsLeft: 0,
      totalSentence: 0,
      behaviorScore: 50, // 0-100, built up in prison.js; feeds parole odds
      crimeLabel: null, // flavor: what put them away
      prisonName: null, // assigned on first incarceration
      gangAffiliated: false, // joined a prison gang for protection this stint
      isFugitive: false, // true after a successful escape — recapture is rolled each age-up
    },

    world: {
      economy: "stable", // 'boom' | 'stable' | 'recession'
      economyYearsLeft: randInt(3, 8),
    },

    politics: { currentOffice: null, yearsInOffice: 0, history: [], scandals: 0 },
    achievements: [], // notable life milestones, surfaced on the death screen
    flags: {
      hasSibling: Math.random() < 0.6,
    },
    triggeredEventIds: new Set(), // non-repeatable events already used
    scheduledEvents: [], // [{ eventId, age }] follow-ups queued by earlier choices
    log: [], // { age, text, kind }
  };
}

function logEvent(character, age, text, kind = "normal") {
  character.log.push({ age, text, kind });
}

function addAchievement(character, text) {
  if (!character.achievements.includes(text)) {
    character.achievements.push(text);
  }
}

// Mortality curve: base risk rises with age, then is scaled by current
// health. A character in perfect health is much safer than the base
// curve; very poor health multiplies risk sharply. Chronic conditions
// and severe mental-health decline add their own pressure on top.
function deathChance(age, health, character) {
  let base;
  if (age < 1) base = 0.004; // small infant-mortality risk
  else if (age < 40) base = 0.0008;
  else if (age < 60) base = 0.0015 + (age - 40) * 0.0006;
  else if (age < 80) base = 0.015 + (age - 60) * 0.007;
  else base = 0.15 + (age - 80) * 0.025;

  const healthFactor = 1 + ((100 - health) / 100) * 1.2;
  let chance = base * healthFactor;

  if (character) {
    const chronicSeverity = character.conditions
      .filter((c) => c.chronic)
      .reduce((sum, c) => sum + c.severity, 0);
    chance += (chronicSeverity / 100) * 0.01;

    if (character.stats.mentalHealth < 20) chance += 0.01;
  }

  return Math.min(chance, 0.97);
}

function causeOfDeath(age, health, character) {
  if (character) {
    const worstCondition = character.conditions
      .filter((c) => c.category === "disease" || c.category === "addiction")
      .sort((a, b) => b.severity - a.severity)[0];
    if (worstCondition && worstCondition.severity >= 60 && Math.random() < 0.6) {
      return worstCondition.category === "addiction"
        ? `complications from ${worstCondition.name}`
        : `complications from ${worstCondition.name}`;
    }
  }
  if (health <= 15) {
    return randomFrom([
      "a long illness",
      "complications from poor health",
      "organ failure",
    ]);
  }
  if (age >= 85) {
    return randomFrom(["old age", "a peaceful death in their sleep"]);
  }
  if (age < 1) {
    return "sudden infant death syndrome";
  }
  return randomFrom([
    "a sudden heart attack",
    "an unexpected accident",
    "a stroke",
    "natural causes",
  ]);
}

// Applies one year of small, event-free stat drift. Event/system-driven
// deltas are layered on top of this baseline elsewhere.
function applyAgingDrift(character) {
  const s = character.stats;

  s.happiness = clampStat(s.happiness + randInt(-4, 4));
  s.smarts = clampStat(s.smarts + randInt(-1, 3));
  s.looks = clampStat(s.looks + randInt(-3, 3));
  s.socialSkill = clampStat(s.socialSkill + randInt(-1, 2));
  s.stress = clampStat(s.stress + randInt(-3, 2));

  // Mental health tracks stress loosely: sustained high stress erodes it,
  // low stress lets it recover.
  if (s.stress > 65) s.mentalHealth = clampStat(s.mentalHealth - randInt(1, 4));
  else if (s.stress < 30) s.mentalHealth = clampStat(s.mentalHealth + randInt(0, 2));

  // Health drifts gently upward through childhood, flat through most of
  // adulthood, and decays with age past 50.
  if (character.age < 18) {
    s.health = clampStat(s.health + randInt(-1, 3));
    s.athleticism = clampStat(s.athleticism + randInt(-1, 3));
  } else if (character.age < 50) {
    s.health = clampStat(s.health + randInt(-2, 2));
    s.athleticism = clampStat(s.athleticism + randInt(-2, 1));
  } else {
    const decay = Math.floor((character.age - 50) / 15); // grows every ~15 years
    s.health = clampStat(s.health + randInt(-2 - decay, 1));
    s.athleticism = clampStat(s.athleticism - randInt(1, 3));
  }

  // Fertility declines with age past 30, floors near 0 by late 40s.
  if (character.age > 30) {
    character.fertility = clampStat(character.fertility - randInt(2, 5));
  }
}

function investmentsValue(character) {
  return character.investments.reduce((sum, i) => sum + i.value, 0);
}

function businessValue(character) {
  return character.business ? character.business.capital : 0;
}

function netWorth(character) {
  const assetValue = character.assets.reduce((sum, a) => sum + a.value, 0);
  return character.money + assetValue + investmentsValue(character) + businessValue(character);
}

function epitaphFor(character) {
  if (character.fame >= 70) {
    return `${character.name} is remembered by millions. The world feels a little smaller today.`;
  }
  if (character.morality <= -60) {
    return `${character.name} is gone. Few will mourn, and fewer will admit it.`;
  }
  if (character.morality >= 60) {
    return `${character.name} spent a lifetime looking out for others. It showed, right to the end.`;
  }
  const templates = [
    `Here lies ${character.name}, who lived ${character.age} years and was never boring.`,
    `${character.name}: gone at ${character.age}, remembered always.`,
    `In loving memory of ${character.name}, ${character.age} years young at heart.`,
    `${character.name} lived fast, loved hard, and left at ${character.age}.`,
    `Rest well, ${character.name}. ${character.age} years was a good run.`,
  ];
  return randomFrom(templates);
}
