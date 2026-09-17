// Health depth: persistent conditions (injuries, chronic disease, mental
// health, addiction) instead of one-off stat pops. Conditions tick every
// age-up (tickConditions, called from main.js) and feed back into the
// mortality curve via deathChance's chronic-severity term in state.js.

const CONDITIONS_CATALOG = {
  broken_leg: { name: "a broken leg", category: "injury", chronic: false },
  concussion: { name: "a concussion", category: "injury", chronic: false },
  back_injury: { name: "a chronic back injury", category: "injury", chronic: true },
  diabetes: { name: "diabetes", category: "disease", chronic: true },
  hypertension: { name: "hypertension", category: "disease", chronic: true },
  heart_disease: { name: "heart disease", category: "disease", chronic: true },
  cancer: { name: "cancer", category: "disease", chronic: true },
  arthritis: { name: "arthritis", category: "disease", chronic: true },
  insomnia: { name: "chronic insomnia", category: "disease", chronic: true },
  depression: { name: "depression", category: "mental", chronic: true },
  anxiety: { name: "an anxiety disorder", category: "mental", chronic: true },
  burnout: { name: "severe burnout", category: "mental", chronic: true },
  alcohol_addiction: { name: "an alcohol addiction", category: "addiction", chronic: true },
  smoking_addiction: { name: "a smoking addiction", category: "addiction", chronic: true },
  gambling_addiction: { name: "a gambling addiction", category: "addiction", chronic: true },
  drug_addiction: { name: "a drug addiction", category: "addiction", chronic: true },
};

function hasCondition(character, id) {
  return character.conditions.some((c) => c.id === id);
}

function getCondition(character, id) {
  return character.conditions.find((c) => c.id === id);
}

function addCondition(character, id, severity) {
  const def = CONDITIONS_CATALOG[id];
  if (!def) return null;
  const existing = getCondition(character, id);
  if (existing) {
    existing.severity = clampStat(existing.severity + severity);
    return existing;
  }
  const cond = {
    id,
    name: def.name,
    category: def.category,
    chronic: def.chronic,
    severity: clampStat(severity),
    startedAge: character.age,
  };
  character.conditions.push(cond);
  return cond;
}

function removeCondition(character, id) {
  character.conditions = character.conditions.filter((c) => c.id !== id);
}

// Called once per age-up: every active condition either heals, holds
// steady, or worsens, and chronic ones drag stats/money every year they
// persist untreated.
function tickConditions(character) {
  for (const cond of [...character.conditions]) {
    if (!cond.chronic) {
      cond.severity -= randInt(15, 35);
      if (cond.severity <= 0) {
        logEvent(character, character.age, `${character.name} made a full recovery from ${cond.name}.`);
        removeCondition(character, cond.id);
      }
      continue;
    }

    if (cond.category === "addiction") {
      // Roughly balanced drift by itself (mild dependency doesn't
      // automatically spiral without further reinforcement), but the
      // character's discipline stat pulls it one way or the other.
      const disciplinePull = Math.round((50 - character.stats.discipline) / 20);
      cond.severity = clampStat(cond.severity + randInt(-4, 5) + disciplinePull);
      const cost = Math.round(cond.severity * randInt(4, 12));
      character.money -= cost;
      character.stats.health = clampStat(character.stats.health - Math.round(cond.severity / 45));
      character.stats.happiness = clampStat(character.stats.happiness - Math.round(cond.severity / 50));
      if (cond.severity <= 0) {
        logEvent(character, character.age, `${character.name} has finally kicked ${cond.name}.`);
        removeCondition(character, cond.id);
      } else if (cond.severity >= 85 && Math.random() < 0.12) {
        character.stats.mentalHealth = clampStat(character.stats.mentalHealth - 10);
        logEvent(character, character.age, `${character.name}'s ${cond.name} spirals badly this year.`);
      }
    } else if (cond.category === "mental") {
      cond.severity = clampStat(cond.severity + randInt(-4, 3));
      character.stats.happiness = clampStat(character.stats.happiness - Math.round(cond.severity / 35));
      if (cond.severity <= 0) {
        logEvent(character, character.age, `${character.name} has worked through ${cond.name}.`);
        removeCondition(character, cond.id);
      }
    } else {
      // chronic disease
      cond.severity = clampStat(cond.severity + randInt(-1, 4));
      character.stats.health = clampStat(character.stats.health - Math.round(cond.severity / 55));
    }
  }
}

function openHealthActivity(character) {
  if (!character || !character.alive) return;

  const addictions = character.conditions.filter((c) => c.category === "addiction");
  const choices = [
    { label: "Hit the gym", action: "gym" },
    { label: "Meditate", action: "meditate" },
    { label: "See a doctor ($100)", action: "doctor" },
    { label: "Talk to a therapist ($150)", action: "therapy" },
    ...(addictions.length ? [{ label: "Seek addiction treatment ($500)", action: "rehab" }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  const conditionSummary = character.conditions.length
    ? ` Current conditions: ${character.conditions.map((c) => `${c.name} (${c.severity}%)`).join(", ")}.`
    : "";

  openChoiceModal(`Mind & Body — what would you like to do?${conditionSummary}`, choices, (choice) => {
    const s = character.stats;
    if (choice.action === "gym") {
      s.health = clampStat(s.health + randInt(3, 7));
      s.looks = clampStat(s.looks + randInt(0, 2));
      s.athleticism = clampStat(s.athleticism + randInt(2, 5));
      s.stress = clampStat(s.stress - randInt(2, 5));
      logEvent(character, character.age, `${character.name} hit the gym and felt great.`);
    } else if (choice.action === "meditate") {
      s.happiness = clampStat(s.happiness + randInt(3, 6));
      s.stress = clampStat(s.stress - randInt(5, 10));
      logEvent(character, character.age, `${character.name} took time to meditate and unwind.`);
    } else if (choice.action === "doctor") {
      if (character.money >= 100) {
        character.money -= 100;
        s.health = clampStat(s.health + randInt(6, 12));
        const physical = character.conditions.find((c) => c.category === "disease" || c.category === "injury");
        if (physical) {
          physical.severity = clampStat(physical.severity - randInt(10, 25));
          if (physical.severity <= 0) {
            logEvent(character, character.age, `${character.name} visited the doctor, who confirms the ${physical.name} is fully resolved.`);
            removeCondition(character, physical.id);
          } else {
            logEvent(character, character.age, `${character.name} visited the doctor for treatment of ${physical.name}.`);
          }
        } else {
          logEvent(character, character.age, `${character.name} visited the doctor for a checkup. All clear.`);
        }
      } else {
        logEvent(character, character.age, `${character.name} couldn't afford a doctor's visit.`);
      }
    } else if (choice.action === "therapy") {
      if (character.money >= 150) {
        character.money -= 150;
        s.stress = clampStat(s.stress - randInt(10, 20));
        s.mentalHealth = clampStat(s.mentalHealth + randInt(8, 15));
        const mental = character.conditions.find((c) => c.category === "mental");
        if (mental) {
          mental.severity = clampStat(mental.severity - randInt(10, 20));
          if (mental.severity <= 0) {
            logEvent(character, character.age, `${character.name} worked through ${mental.name} in therapy. A real turning point.`);
            removeCondition(character, mental.id);
          } else {
            logEvent(character, character.age, `${character.name} had a genuinely helpful therapy session.`);
          }
        } else {
          logEvent(character, character.age, `${character.name} talked things through with a therapist. Feeling lighter.`);
        }
      } else {
        logEvent(character, character.age, `${character.name} couldn't afford therapy right now.`);
      }
    } else if (choice.action === "rehab") {
      if (character.money >= 500) {
        character.money -= 500;
        const addiction = addictions[0];
        if (Math.random() < 0.55) {
          removeCondition(character, addiction.id);
          s.happiness = clampStat(s.happiness + 10);
          logEvent(character, character.age, `${character.name} completed a treatment program and has beaten ${addiction.name}.`);
        } else {
          addiction.severity = clampStat(addiction.severity - randInt(15, 30));
          logEvent(character, character.age, `${character.name} went through treatment. Progress, but ${addiction.name} isn't fully behind them yet.`);
        }
      } else {
        logEvent(character, character.age, `${character.name} can't afford treatment right now.`);
      }
    } else {
      return;
    }
    renderGame();
  });
}
