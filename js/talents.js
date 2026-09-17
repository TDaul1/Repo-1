// Skills, talents, and fame. Skills (music/art/sports/tech/cooking) are
// built by practicing through the Hobbies activity; crossing 80 in a
// skill has a chance to "discover" a permanent talent, which unlocks
// flavor and a little extra fame. Busking/competing convert skill into
// money and fame directly.

const SKILL_LABELS = {
  music: "🎵 Music", art: "🎨 Art", sports: "🏅 Sports", tech: "💻 Tech", cooking: "🍳 Cooking",
};

const TALENT_BY_SKILL = {
  music: "Prodigy Musician", art: "Visionary Artist", sports: "Natural Athlete",
  tech: "Coding Savant", cooking: "Master Chef",
};

function openHobbiesActivity(character) {
  if (!character || !character.alive) return;

  const practiceChoices = Object.keys(SKILL_LABELS).map((skill) => ({
    label: `Practice ${SKILL_LABELS[skill]} (${character.skills[skill]}%)`,
    action: "practice",
    skill,
  }));

  const buskableSkill = Object.keys(SKILL_LABELS).find((s) => character.skills[s] >= 40);
  const competeSkill = Object.keys(SKILL_LABELS).find((s) => character.skills[s] >= 60);

  const choices = [
    ...practiceChoices,
    ...(buskableSkill ? [{ label: "Perform in public for tips", action: "busk", skill: buskableSkill }] : []),
    ...(competeSkill ? [{ label: "Enter a talent competition", action: "compete", skill: competeSkill }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  const talentLine = character.talents.length ? ` Talents: ${character.talents.join(", ")}.` : "";

  openChoiceModal(`Hobbies & Skills.${talentLine}`, choices, (choice) => {
    if (choice.action === "practice") practiceSkill(character, choice.skill);
    else if (choice.action === "busk") busk(character, choice.skill);
    else if (choice.action === "compete") compete(character, choice.skill);
  });
}

function practiceSkill(character, skill) {
  const disciplineBonus = character.stats.discipline / 40;
  const gain = randInt(2, 6) + Math.round(disciplineBonus);
  character.skills[skill] = clampStat(character.skills[skill] + gain);
  character.stats.happiness = clampStat(character.stats.happiness + 2);
  character.stats.stress = clampStat(character.stats.stress - 2);

  logEvent(character, character.age, `${character.name} practiced ${SKILL_LABELS[skill].split(" ")[1]}. Now at ${character.skills[skill]}%.`);

  maybeDiscoverTalent(character, skill);
  renderGame();
}

function maybeDiscoverTalent(character, skill) {
  const talentName = TALENT_BY_SKILL[skill];
  if (character.skills[skill] < 80) return;
  if (character.talents.includes(talentName)) return;
  if (Math.random() < 0.15) {
    character.talents.push(talentName);
    character.fame = clampStat(character.fame + 10);
    addAchievement(character, `Discovered a talent: ${talentName}`);
    logEvent(character, character.age, `${character.name} has a breakthrough — turns out they're a ${talentName}!`);
  }
}

function busk(character, skill) {
  const skillLevel = character.skills[skill];
  const earnings = Math.round(skillLevel * randInt(2, 6) * (character.talents.length ? 1.5 : 1));
  character.money += earnings;
  character.fame = clampStat(character.fame + Math.round(skillLevel / 40));
  character.stats.happiness = clampStat(character.stats.happiness + 4);
  character.stats.socialSkill = clampStat(character.stats.socialSkill + 1);
  logEvent(character, character.age, `${character.name} performed in public and made $${earnings.toLocaleString()} in tips.`);
  renderGame();
}

function compete(character, skill) {
  const skillLevel = character.skills[skill];
  const chance = 0.2 + skillLevel / 200 + (character.talents.length ? 0.15 : 0);
  if (Math.random() < Math.min(0.85, chance)) {
    const prize = randInt(500, 5000);
    character.money += prize;
    character.fame = clampStat(character.fame + randInt(5, 15));
    character.stats.happiness = clampStat(character.stats.happiness + 10);
    addAchievement(character, `Won a talent competition (${SKILL_LABELS[skill]})`);
    logEvent(character, character.age, `${character.name} won a talent competition! $${prize.toLocaleString()} prize and a taste of the spotlight.`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 5);
    logEvent(character, character.age, `${character.name} entered a talent competition and didn't place. Tough crowd.`);
  }
  renderGame();
}
