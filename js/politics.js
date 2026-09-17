// Political career: a separate ladder from the regular job track,
// reachable from the Job activity once a character has enough
// reputation/fame to be a plausible candidate. Office holders draw a
// salary like any job (still taxed) but campaigning and governing feed
// back into reputation, fame, and morality instead of just a paycheck.

const POLITICAL_OFFICES = [
  { id: "city_council", title: "City Council Member", minAge: 25, minReputation: 20, minFame: 0, salary: 45000, term: 4 },
  { id: "mayor", title: "Mayor", minAge: 30, minReputation: 40, minFame: 10, salary: 95000, term: 4, requiresPrior: "city_council" },
  { id: "state_legislator", title: "State Legislator", minAge: 28, minReputation: 35, minFame: 5, salary: 60000, term: 2 },
  { id: "governor", title: "Governor", minAge: 35, minReputation: 55, minFame: 25, salary: 150000, term: 4, requiresPrior: "state_legislator" },
  { id: "senator", title: "Senator", minAge: 35, minReputation: 60, minFame: 30, salary: 175000, term: 6, requiresPrior: "governor" },
  { id: "president", title: "President", minAge: 40, minReputation: 80, minFame: 60, salary: 400000, term: 4, requiresPrior: "senator" },
];

function heldOfficeIds(character) {
  return character.politics ? character.politics.history : [];
}

function officeIsEligible(character, office) {
  if (character.age < office.minAge) return false;
  if (character.reputation < office.minReputation) return false;
  if (character.fame < office.minFame) return false;
  if (office.requiresPrior && !heldOfficeIds(character).includes(office.requiresPrior)) return false;
  return true;
}

function ensurePoliticsState(character) {
  if (!character.politics) {
    character.politics = { currentOffice: null, yearsInOffice: 0, history: [], scandals: 0 };
  }
  return character.politics;
}

function openPoliticsMenu(character) {
  const pol = ensurePoliticsState(character);

  if (pol.currentOffice) {
    const office = POLITICAL_OFFICES.find((o) => o.id === pol.currentOffice);
    openChoiceModal(
      `You serve as ${office.title} (year ${pol.yearsInOffice + 1} of ${office.term}).`,
      [
        { label: "Push a popular policy", action: "policy_popular" },
        { label: "Push a bold, risky reform", action: "policy_bold" },
        { label: "Focus on fundraising", action: "fundraise" },
        { label: "Resign", action: "resign" },
        { label: "Never mind", action: "cancel" },
      ],
      (choice) => {
        if (choice.action === "policy_popular") {
          character.reputation = clampSigned(character.reputation + randInt(2, 6));
          character.stats.happiness = clampStat(character.stats.happiness + 3);
          logEvent(character, character.age, `${character.name} champions a popular policy as ${office.title}. Approval ticks up.`);
        } else if (choice.action === "policy_bold") {
          if (Math.random() < 0.5) {
            character.reputation = clampSigned(character.reputation + randInt(8, 15));
            character.fame = clampStat(character.fame + randInt(5, 10));
            logEvent(character, character.age, `${character.name}'s bold reform as ${office.title} actually works. Major win.`);
          } else {
            character.reputation = clampSigned(character.reputation - randInt(10, 20));
            pol.scandals += 1;
            logEvent(character, character.age, `${character.name}'s bold reform as ${office.title} backfires badly. The backlash is real.`);
          }
        } else if (choice.action === "fundraise") {
          const raised = randInt(2000, 15000);
          character.money += raised;
          character.reputation = clampSigned(character.reputation - 2);
          logEvent(character, character.age, `${character.name} spends the year fundraising, pulling in $${raised.toLocaleString()} — donors expect something in return, though.`);
        } else if (choice.action === "resign") {
          logEvent(character, character.age, `${character.name} resigns as ${office.title}, effective immediately.`);
          pol.currentOffice = null;
          pol.yearsInOffice = 0;
          character.career.job = null;
        } else {
          return;
        }
        renderGame();
      }
    );
    return;
  }

  const eligible = POLITICAL_OFFICES.filter((o) => officeIsEligible(character, o));
  if (eligible.length === 0) {
    openChoiceModal(
      `Political office requires reputation and, for higher offices, fame and prior experience. Current reputation: ${character.reputation}, fame: ${character.fame}.`,
      [{ label: "Okay", action: "cancel" }],
      () => {}
    );
    return;
  }

  openChoiceModal(
    "Run for political office:",
    [
      ...eligible.map((o) => ({ label: `Run for ${o.title} — $${o.salary.toLocaleString()}/yr`, action: "run", office: o })),
      { label: "Not right now", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "run") return;
      runForOffice(character, choice.office);
    }
  );
}

function runForOffice(character, office) {
  const chance = 0.25 + character.reputation / 200 + character.fame / 300 + character.stats.socialSkill / 400;
  if (Math.random() < Math.min(0.85, chance)) {
    const pol = ensurePoliticsState(character);
    pol.currentOffice = office.id;
    pol.yearsInOffice = 0;
    if (!pol.history.includes(office.id)) pol.history.push(office.id);
    character.career.job = { id: `office_${office.id}`, title: office.title, category: "Politics", salary: office.salary };
    character.career.yearsAtJob = 0;
    character.fame = clampStat(character.fame + 10);
    character.stats.happiness = clampStat(character.stats.happiness + 12);
    addAchievement(character, `Elected ${office.title}`);
    logEvent(character, character.age, `${character.name} wins the election for ${office.title}!`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 8);
    character.reputation = clampSigned(character.reputation - 3);
    logEvent(character, character.age, `${character.name} loses the race for ${office.title}. A tough defeat.`);
  }
  renderGame();
}

// Runs alongside runCareerYear each age-up: advances the current term,
// and handles term limits/re-election automatically wearing off if the
// player doesn't manage it via the menu.
function runPoliticsYear(character) {
  const pol = character.politics;
  if (!pol || !pol.currentOffice) return;
  const office = POLITICAL_OFFICES.find((o) => o.id === pol.currentOffice);
  pol.yearsInOffice += 1;

  if (pol.yearsInOffice >= office.term) {
    const reelectChance = 0.3 + character.reputation / 200;
    if (Math.random() < Math.min(0.8, reelectChance)) {
      pol.yearsInOffice = 0;
      logEvent(character, character.age, `${character.name} is re-elected as ${office.title}.`);
    } else {
      logEvent(character, character.age, `${character.name}'s term as ${office.title} ends, and the seat goes to someone else.`);
      pol.currentOffice = null;
      pol.yearsInOffice = 0;
      character.career.job = null;
    }
  }
}
