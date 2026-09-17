// Family depth: relationships aren't just a quality number anymore.
// Parents and siblings age and can die (with inheritance and grief);
// marriages happen; pregnancies resolve into new Child relationships
// who grow up. Ticked once per age-up from main.js (tickFamily) so
// family life continues even while the player is in jail or a fugitive.

// A rough standalone mortality curve for NPC relatives — deliberately
// simpler than the player's (no condition tracking for NPCs), but same
// shape so parents plausibly die of old age around the same ages a
// player character would.
function npcDeathChance(age) {
  if (age < 40) return 0.001;
  if (age < 60) return 0.002 + (age - 40) * 0.0008;
  if (age < 80) return 0.02 + (age - 60) * 0.009;
  return 0.18 + (age - 80) * 0.03;
}

function tickFamily(character) {
  for (const rel of character.relationships) {
    if (!rel.alive) continue;
    if (rel.age != null) rel.age += 1;

    const isElderRelative = rel.type === "Parent" || (rel.type === "Spouse" && rel.age >= 55);
    if (isElderRelative && rel.age >= 45 && Math.random() < npcDeathChance(rel.age)) {
      killRelative(character, rel);
    }
  }

  resolvePregnancy(character); // after the aging loop, so a newborn starts at age 0
  decayRelationships(character);
}

function killRelative(character, rel) {
  rel.alive = false;
  const happinessHit = Math.round(6 + (rel.quality / 100) * 18);
  character.stats.happiness = clampStat(character.stats.happiness - happinessHit);
  character.stats.mentalHealth = clampStat(character.stats.mentalHealth - Math.round(happinessHit / 2));

  logEvent(character, character.age, `${rel.name} (${rel.type.toLowerCase()}) passed away. ${character.name} takes it hard.`, "death");

  if ((rel.type === "Parent" || rel.type === "Spouse") && rel.quality >= 30) {
    const inheritance = Math.round(randInt(2000, 40000) * (rel.quality / 100));
    if (inheritance > 0) {
      character.money += inheritance;
      logEvent(character, character.age, `${character.name} inherited $${inheritance.toLocaleString()} from ${rel.name}.`);
    }
  }

  if (rel.type === "Spouse") {
    character.married = false;
    character.spouseId = null;
  }
}

function resolvePregnancy(character) {
  if (!character.pregnant) return;
  if (character.age < character.pregnant.dueAge) return;

  character.pregnant = null;
  const childName = randomFullName(randomFrom(["Male", "Female", "Nonbinary"]));
  character.relationships.push({
    id: `child_${Date.now()}`,
    name: childName,
    type: "Child",
    quality: randInt(60, 90),
    age: 0,
    alive: true,
  });
  character.stats.happiness = clampStat(character.stats.happiness + 15);
  character.stats.stress = clampStat(character.stats.stress + 10);
  addAchievement(character, `Became a parent to ${childName}`);
  logEvent(character, character.age, `${character.name} welcomed a new baby: ${childName}!`);
}

function proposeMarriage(character) {
  const partner = character.relationships.find((r) => r.type === "Partner" && r.alive);
  if (!partner) {
    logEvent(character, character.age, `${character.name} doesn't have anyone to propose to right now.`);
    renderGame();
    return;
  }
  if (partner.quality < 60) {
    logEvent(character, character.age, `${character.name} isn't sure the relationship with ${partner.name} is strong enough for that yet.`);
    renderGame();
    return;
  }

  const chance = 0.4 + (partner.quality - 60) / 100;
  if (Math.random() < Math.min(0.9, chance)) {
    partner.type = "Spouse";
    character.married = true;
    character.spouseId = partner.id;
    character.stats.happiness = clampStat(character.stats.happiness + 20);
    addAchievement(character, `Married ${partner.name}`);
    logEvent(character, character.age, `${character.name} proposed to ${partner.name}, and they said YES! Wedding bells.`);
  } else {
    partner.quality = clampStat(partner.quality - 15);
    character.stats.happiness = clampStat(character.stats.happiness - 10);
    logEvent(character, character.age, `${character.name} proposed to ${partner.name}... who said they need more time. Awkward.`);
  }
  renderGame();
}

function fileForDivorce(character) {
  const spouse = character.relationships.find((r) => r.type === "Spouse" && r.alive);
  if (!spouse) return;
  character.married = false;
  character.spouseId = null;
  spouse.type = "Ex-Spouse";

  // A messy split costs money roughly proportional to net worth.
  const settlement = Math.round(netWorth(character) * (0.1 + Math.random() * 0.15));
  character.money -= settlement;
  character.stats.happiness = clampStat(character.stats.happiness - 15);
  logEvent(character, character.age, `${character.name} and ${spouse.name} finalized their divorce. The settlement cost $${settlement.toLocaleString()}.`);
  renderGame();
}

function tryForBaby(character) {
  const hasPartnerOrSpouse = character.relationships.some((r) => (r.type === "Partner" || r.type === "Spouse") && r.alive);
  if (!hasPartnerOrSpouse) {
    logEvent(character, character.age, `${character.name} would need a partner for that.`);
    renderGame();
    return;
  }
  if (character.pregnant) {
    logEvent(character, character.age, `${character.name} is already expecting!`);
    renderGame();
    return;
  }
  if (character.age < 16 || character.age > 55) {
    logEvent(character, character.age, `${character.name} isn't in the right stage of life for that right now.`);
    renderGame();
    return;
  }

  const chance = character.fertility / 140;
  if (Math.random() < chance) {
    character.pregnant = { dueAge: character.age + 1 };
    logEvent(character, character.age, `${character.name} is expecting a baby!`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 3);
    logEvent(character, character.age, `${character.name} and their partner tried for a baby this year, without luck.`);
  }
  renderGame();
}
