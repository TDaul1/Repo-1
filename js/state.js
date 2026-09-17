// Character state model and the core numeric rules for aging/death.
// Kept free of DOM code so later phases (event engine, career, etc.) can
// import and mutate this state without touching rendering logic.

function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
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
    alive: true,
    stats: {
      health: clampStat(randInt(75, 100)),
      happiness: clampStat(randInt(60, 100)),
      smarts: clampStat(randInt(30, 70)),
      looks: clampStat(randInt(30, 70)),
    },
    money: randInt(0, 200), // birth gifts / allowance
    relationships: [], // [{ id, name, type, quality }] — seeded at birth in main.js
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
    jail: { yearsLeft: 0 },
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

// Mortality curve: base risk rises with age, then is scaled by current
// health. A character in perfect health is much safer than the base
// curve; very poor health multiplies risk sharply.
function deathChance(age, health) {
  let base;
  if (age < 1) base = 0.004; // small infant-mortality risk
  else if (age < 40) base = 0.0008;
  else if (age < 60) base = 0.0015 + (age - 40) * 0.0006;
  else if (age < 80) base = 0.015 + (age - 60) * 0.007;
  else base = 0.15 + (age - 80) * 0.025;

  const healthFactor = 1 + ((100 - health) / 100) * 1.2;
  return Math.min(base * healthFactor, 0.97);
}

function causeOfDeath(age, health) {
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

// Applies one year of small, event-free stat drift. Later phases will
// layer event-driven deltas on top of this baseline.
function applyAgingDrift(character) {
  const s = character.stats;

  s.happiness = clampStat(s.happiness + randInt(-4, 4));
  s.smarts = clampStat(s.smarts + randInt(-1, 3));
  s.looks = clampStat(s.looks + randInt(-3, 3));

  // Health drifts gently upward through childhood, flat through most of
  // adulthood, and decays with age past 50.
  if (character.age < 18) {
    s.health = clampStat(s.health + randInt(-1, 3));
  } else if (character.age < 50) {
    s.health = clampStat(s.health + randInt(-2, 2));
  } else {
    const decay = Math.floor((character.age - 50) / 15); // grows every ~15 years
    s.health = clampStat(s.health + randInt(-2 - decay, 1));
  }
}

function netWorth(character) {
  const assetValue = character.assets.reduce((sum, a) => sum + a.value, 0);
  return character.money + assetValue;
}

function epitaphFor(character) {
  const templates = [
    `Here lies ${character.name}, who lived ${character.age} years and was never boring.`,
    `${character.name}: gone at ${character.age}, remembered always.`,
    `In loving memory of ${character.name}, ${character.age} years young at heart.`,
    `${character.name} lived fast, loved hard, and left at ${character.age}.`,
    `Rest well, ${character.name}. ${character.age} years was a good run.`,
  ];
  return randomFrom(templates);
}
