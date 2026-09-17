// Relationships: family seeded at birth, plus friends/partners the
// player can make through the activity menu. Each relationship carries
// a 0-100 quality score that decays slowly over time and responds to
// direct interaction. Marriage, divorce, and having kids are handled in
// family.js; this file is the player-facing menu and day-to-day
// interactions (spend time, gift, fight, make friends, date).

const FRIEND_NAME_POOL = [
  "Jordan", "Casey", "Riley", "Skyler", "Devon", "Rowan", "Marley", "Ellis",
];

function seedFamily(character) {
  const parentAge = randInt(24, 40);
  character.relationships.push({
    id: "parent_1",
    name: randomFullName(character.gender === "Male" ? "Female" : randomFrom(["Male", "Female"])),
    type: "Parent",
    quality: randInt(55, 95),
    age: parentAge,
    alive: true,
  });
  character.relationships.push({
    id: "parent_2",
    name: randomFullName(randomFrom(["Male", "Female"])),
    type: "Parent",
    quality: randInt(55, 95),
    age: parentAge + randInt(-4, 4),
    alive: true,
  });
  if (character.flags.hasSibling) {
    character.relationships.push({
      id: "sibling_1",
      name: randomFullName(randomFrom(["Male", "Female", "Nonbinary"])),
      type: "Sibling",
      quality: randInt(40, 90),
      age: Math.max(0, randInt(-6, 6)),
      alive: true,
    });
  }
}

// Slow natural decay so relationships need occasional attention —
// called once per age-up from family.js's tickFamily.
function decayRelationships(character) {
  for (const rel of character.relationships) {
    if (!rel.alive) continue;
    rel.quality = clampStat(rel.quality + randInt(-3, 1));
  }
}

function livingRelationships(character) {
  return character.relationships.filter((r) => r.alive);
}

function openRelationshipsActivity(character) {
  if (!character || !character.alive) return;

  const living = livingRelationships(character);
  const hasPartner = living.some((r) => r.type === "Partner");
  const hasSpouse = living.some((r) => r.type === "Spouse");
  const canDate = character.age >= 16 && !hasPartner && !hasSpouse;
  const canPropose = hasPartner && character.age >= 18;

  const topChoices = [
    ...living.map((r) => ({ label: `${relIcon(r.type)} ${r.name} (${r.type}, ${r.quality}%)`, action: "manage", rel: r })),
    { label: "Make a new friend", action: "new_friend" },
    ...(canDate ? [{ label: "Look for a partner", action: "date" }] : []),
    ...(canPropose ? [{ label: "💍 Propose marriage", action: "propose" }] : []),
    ...(hasSpouse ? [{ label: "📝 File for divorce", action: "divorce" }] : []),
    ...(hasSpouse || hasPartner ? [{ label: "👶 Try for a baby", action: "baby" }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  const pregnancyNote = character.pregnant ? " (Currently expecting!)" : "";

  openChoiceModal(`Your relationships:${pregnancyNote}`, topChoices, (choice) => {
    if (choice.action === "manage") openManageRelationship(character, choice.rel);
    else if (choice.action === "new_friend") makeNewFriend(character);
    else if (choice.action === "date") lookForPartner(character);
    else if (choice.action === "propose") proposeMarriage(character);
    else if (choice.action === "divorce") fileForDivorce(character);
    else if (choice.action === "baby") tryForBaby(character);
  });
}

function relIcon(type) {
  if (type === "Parent") return "👤";
  if (type === "Sibling") return "🧑";
  if (type === "Friend") return "😄";
  if (type === "Partner") return "💞";
  if (type === "Spouse") return "💍";
  if (type === "Ex-Spouse") return "🗂️";
  if (type === "Child") return "🧒";
  return "🙂";
}

function openManageRelationship(character, rel) {
  openChoiceModal(
    `${rel.name} (${rel.type}, age ${rel.age}) — relationship quality: ${rel.quality}%`,
    [
      { label: "Spend time together", action: "spend_time" },
      { label: "Give a gift ($50)", action: "gift" },
      { label: "Pick a fight", action: "fight" },
      ...(rel.type === "Friend" || rel.type === "Partner" ? [{ label: "Cut them off", action: "cut" }] : []),
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      const generosityBonus = character.personality ? character.personality.generous / 20 : 0;
      if (choice.action === "spend_time") {
        rel.quality = clampStat(rel.quality + randInt(4, 10) + generosityBonus);
        character.stats.happiness = clampStat(character.stats.happiness + 3);
        character.stats.socialSkill = clampStat(character.stats.socialSkill + 1);
        logEvent(character, character.age, `${character.name} spent quality time with ${rel.name}.`);
      } else if (choice.action === "gift") {
        if (character.money < 50) {
          logEvent(character, character.age, `${character.name} can't afford a gift right now.`);
        } else {
          character.money -= 50;
          rel.quality = clampStat(rel.quality + randInt(6, 12) + generosityBonus);
          logEvent(character, character.age, `${character.name} gave ${rel.name} a gift. They loved it.`);
        }
      } else if (choice.action === "fight") {
        rel.quality = clampStat(rel.quality - randInt(10, 25));
        character.stats.happiness = clampStat(character.stats.happiness - 4);
        character.stats.stress = clampStat(character.stats.stress + 6);
        logEvent(character, character.age, `${character.name} picked a fight with ${rel.name}. Not their finest moment.`);
      } else if (choice.action === "cut") {
        character.relationships = character.relationships.filter((r) => r !== rel);
        logEvent(character, character.age, `${character.name} cut ${rel.name} out of their life completely.`);
      } else {
        return;
      }
      renderGame();
    }
  );
}

function makeNewFriend(character) {
  const name = `${randomFrom(FRIEND_NAME_POOL)} ${randomFrom(LAST_NAMES)}`;
  character.relationships.push({
    id: `friend_${Date.now()}`,
    name,
    type: "Friend",
    quality: randInt(40, 75),
    age: character.age,
    alive: true,
  });
  character.stats.happiness = clampStat(character.stats.happiness + 4);
  character.stats.socialSkill = clampStat(character.stats.socialSkill + 2);
  logEvent(character, character.age, `${character.name} made a new friend: ${name}.`);
  renderGame();
}

function lookForPartner(character) {
  const chance = 0.35 + character.stats.looks / 300 + character.stats.happiness / 400 + character.stats.socialSkill / 500;
  if (Math.random() < Math.min(0.85, chance)) {
    const name = randomFullName(randomFrom(["Male", "Female", "Nonbinary"]));
    character.relationships.push({
      id: `partner_${Date.now()}`,
      name,
      type: "Partner",
      quality: randInt(50, 85),
      age: clampStat(character.age + randInt(-4, 4)),
      alive: true,
    });
    character.stats.happiness = clampStat(character.stats.happiness + 12);
    logEvent(character, character.age, `${character.name} started dating ${name}!`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 2);
    logEvent(character, character.age, `${character.name} struck out looking for romance this year.`);
  }
  renderGame();
}
