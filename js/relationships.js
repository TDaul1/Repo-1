// Relationships: family seeded at birth, plus friends/partners the
// player can make through the activity menu. Each relationship carries
// a 0-100 quality score that decays slowly over time and responds to
// direct interaction.

const FRIEND_NAME_POOL = [
  "Jordan", "Casey", "Riley", "Skyler", "Devon", "Rowan", "Marley", "Ellis",
];

function seedFamily(character) {
  character.relationships.push({
    id: "parent_1",
    name: randomFullName(character.gender === "Male" ? "Female" : randomFrom(["Male", "Female"])),
    type: "Parent",
    quality: randInt(55, 95),
  });
  character.relationships.push({
    id: "parent_2",
    name: randomFullName(randomFrom(["Male", "Female"])),
    type: "Parent",
    quality: randInt(55, 95),
  });
  if (character.flags.hasSibling) {
    character.relationships.push({
      id: "sibling_1",
      name: randomFullName(randomFrom(["Male", "Female", "Nonbinary"])),
      type: "Sibling",
      quality: randInt(40, 90),
    });
  }
}

// Slow natural decay so relationships need occasional attention —
// called once per age-up from main.js.
function decayRelationships(character) {
  for (const rel of character.relationships) {
    rel.quality = clampStat(rel.quality + randInt(-3, 1));
  }
}

function openRelationshipsActivity(character) {
  if (!character || !character.alive) return;

  const canDate = character.age >= 16 && !character.relationships.some((r) => r.type === "Partner");

  const topChoices = [
    ...character.relationships.map((r) => ({ label: `${relIcon(r.type)} ${r.name} (${r.type}, ${r.quality}%)`, action: "manage", rel: r })),
    { label: "Make a new friend", action: "new_friend" },
    ...(canDate ? [{ label: "Look for a partner", action: "date" }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  openChoiceModal("Your relationships:", topChoices, (choice) => {
    if (choice.action === "manage") openManageRelationship(character, choice.rel);
    else if (choice.action === "new_friend") makeNewFriend(character);
    else if (choice.action === "date") lookForPartner(character);
  });
}

function relIcon(type) {
  if (type === "Parent") return "👤";
  if (type === "Sibling") return "🧑";
  if (type === "Friend") return "😄";
  if (type === "Partner") return "💞";
  if (type === "Child") return "🧒";
  return "🙂";
}

function openManageRelationship(character, rel) {
  openChoiceModal(
    `${rel.name} (${rel.type}) — relationship quality: ${rel.quality}%`,
    [
      { label: "Spend time together", action: "spend_time" },
      { label: "Give a gift ($50)", action: "gift" },
      { label: "Pick a fight", action: "fight" },
      ...(rel.type === "Friend" || rel.type === "Partner" ? [{ label: "Cut them off", action: "cut" }] : []),
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action === "spend_time") {
        rel.quality = clampStat(rel.quality + randInt(4, 10));
        character.stats.happiness = clampStat(character.stats.happiness + 3);
        logEvent(character, character.age, `${character.name} spent quality time with ${rel.name}.`);
      } else if (choice.action === "gift") {
        if (character.money < 50) {
          logEvent(character, character.age, `${character.name} can't afford a gift right now.`);
        } else {
          character.money -= 50;
          rel.quality = clampStat(rel.quality + randInt(6, 12));
          logEvent(character, character.age, `${character.name} gave ${rel.name} a gift. They loved it.`);
        }
      } else if (choice.action === "fight") {
        rel.quality = clampStat(rel.quality - randInt(10, 25));
        character.stats.happiness = clampStat(character.stats.happiness - 4);
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
  });
  character.stats.happiness = clampStat(character.stats.happiness + 4);
  logEvent(character, character.age, `${character.name} made a new friend: ${name}.`);
  renderGame();
}

function lookForPartner(character) {
  const chance = 0.35 + character.stats.looks / 300 + character.stats.happiness / 400;
  if (Math.random() < Math.min(0.85, chance)) {
    const name = randomFullName(randomFrom(["Male", "Female", "Nonbinary"]));
    character.relationships.push({
      id: `partner_${Date.now()}`,
      name,
      type: "Partner",
      quality: randInt(50, 85),
    });
    character.stats.happiness = clampStat(character.stats.happiness + 12);
    logEvent(character, character.age, `${character.name} started dating ${name}!`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 2);
    logEvent(character, character.age, `${character.name} struck out looking for romance this year.`);
  }
  renderGame();
}
