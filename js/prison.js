// Prison life: what happens during a sentence, not just a time-skip.
// Reached by clicking the Crime button while character.jail.yearsLeft
// > 0 (see openCrimeActivity in crime.js). Every action here trades
// against `behaviorScore`, which is what parole odds are built on, and
// a botched escape or fight can add real years to the sentence.

const PRISON_NAMES = [
  "Ashcombe Correctional", "Graymoor State Penitentiary", "Rockhaven Federal Prison",
  "Ironvale Correctional Facility", "Blackwell Island Prison",
];

function ensurePrisonAssigned(character) {
  if (!character.jail.prisonName) {
    character.jail.prisonName = randomFrom(PRISON_NAMES);
  }
}

function openPrisonActivity(character) {
  const j = character.jail;
  ensurePrisonAssigned(character);
  const served = j.totalSentence - j.yearsLeft;
  const eligibleForParole = j.totalSentence > 1 && served >= Math.ceil(j.totalSentence / 2);

  const choices = [
    { label: "Keep your head down", action: "lowkey" },
    { label: "Hit the yard (work out)", action: "workout" },
    ...(!j.gangAffiliated ? [{ label: "Fall in with a prison gang for protection", action: "join_gang" }] : []),
    { label: "Start a fight", action: "fight" },
    { label: "Take GED / college classes", action: "study" },
    { label: "Work a prison job", action: "job" },
    { label: "Try to bribe a guard", action: "bribe" },
    { label: "Attempt an escape", action: "escape" },
    ...(eligibleForParole ? [{ label: "Request a parole hearing", action: "parole" }] : []),
  ];

  openChoiceModal(
    `${j.prisonName} — doing time for ${j.crimeLabel || "your crimes"}. ${j.yearsLeft} year(s) left. Behavior: ${j.behaviorScore}%.`,
    choices,
    (choice) => resolvePrisonAction(character, choice.action)
  );
}

function resolvePrisonAction(character, action) {
  const j = character.jail;
  const s = character.stats;

  if (action === "lowkey") {
    j.behaviorScore = clampStat(j.behaviorScore + randInt(3, 7));
    s.happiness = clampStat(s.happiness - randInt(0, 2));
    logEvent(character, character.age, `${character.name} kept quiet and stayed out of trouble.`);
  } else if (action === "workout") {
    s.health = clampStat(s.health + randInt(3, 8));
    j.behaviorScore = clampStat(j.behaviorScore + 1);
    if (!j.gangAffiliated && Math.random() < 0.15) {
      s.health = clampStat(s.health - randInt(8, 18));
      s.happiness = clampStat(s.happiness - 6);
      j.behaviorScore = clampStat(j.behaviorScore - 10);
      logEvent(character, character.age, `${character.name} hit the yard and got jumped by another inmate.`);
    } else {
      logEvent(character, character.age, `${character.name} spent the yard time working out.`);
    }
  } else if (action === "join_gang") {
    const chance = 0.55 + (character.criminal.gang ? 0.2 : 0);
    if (Math.random() < chance) {
      j.gangAffiliated = true;
      j.behaviorScore = clampStat(j.behaviorScore - 8);
      s.happiness = clampStat(s.happiness + 4);
      logEvent(character, character.age, `${character.name} fell in with a prison gang. Protection has a price, but at least people leave you alone now.`);
    } else {
      s.happiness = clampStat(s.happiness - 3);
      logEvent(character, character.age, `${character.name} tried to fall in with a crew inside, but got turned away.`);
    }
  } else if (action === "fight") {
    const wins = Math.random() < 0.5 + (j.gangAffiliated ? 0.15 : 0);
    s.health = clampStat(s.health - randInt(5, 15));
    j.behaviorScore = clampStat(j.behaviorScore - randInt(12, 20));
    if (wins) {
      s.happiness = clampStat(s.happiness + 5);
      logEvent(character, character.age, `${character.name} won a yard fight. Reputation: up. Behavior record: down.`);
    } else {
      s.happiness = clampStat(s.happiness - 8);
      logEvent(character, character.age, `${character.name} lost a yard fight badly.`);
    }
    if (Math.random() < 0.3) {
      j.behaviorScore = clampStat(j.behaviorScore - 15);
      s.happiness = clampStat(s.happiness - 10);
      logEvent(character, character.age, `${character.name} was thrown in solitary confinement for a stretch.`);
    }
  } else if (action === "study") {
    s.smarts = clampStat(s.smarts + randInt(2, 5));
    j.behaviorScore = clampStat(j.behaviorScore + randInt(4, 8));
    logEvent(character, character.age, `${character.name} took GED classes offered by the prison education program.`);
  } else if (action === "job") {
    const pay = randInt(15, 60);
    character.money += pay;
    j.behaviorScore = clampStat(j.behaviorScore + 3);
    logEvent(character, character.age, `${character.name} worked a prison job (laundry, kitchen, take your pick) and earned $${pay}.`);
  } else if (action === "bribe") {
    const bribeAmount = 300;
    if (character.money < bribeAmount) {
      logEvent(character, character.age, `${character.name} doesn't have the $${bribeAmount} it'd take to grease any palms in here.`);
    } else {
      character.money -= bribeAmount;
      if (Math.random() < 0.4) {
        j.yearsLeft = Math.max(0, j.yearsLeft - 1);
        logEvent(character, character.age, `${character.name} slipped a guard $${bribeAmount}. A "clerical error" shaves a year off the sentence.`);
      } else {
        j.behaviorScore = clampStat(j.behaviorScore - 15);
        logEvent(character, character.age, `${character.name} tried to bribe a guard who reported it immediately. Behavior record takes a hit, and the money's gone.`);
      }
    }
  } else if (action === "escape") {
    resolveEscapeAttempt(character);
  } else if (action === "parole") {
    resolveParoleHearing(character);
  } else {
    return;
  }
  renderGame();
}

function resolveEscapeAttempt(character) {
  const j = character.jail;
  const securityPenalty = Math.min(0.25, j.totalSentence * 0.015); // longer original sentence = tighter security
  const chance = Math.max(0.05, 0.2 + (character.stats.smarts - 50) / 300 - securityPenalty);

  if (Math.random() < chance) {
    character.criminal.timesEscaped += 1;
    j.isFugitive = true;
    j.yearsLeft = 0;
    j.behaviorScore = 0;
    character.criminal.heat = clampStat(character.criminal.heat + 40);
    logEvent(character, character.age, `${character.name} escaped from ${j.prisonName} over the north wall in the middle of the night. Now a fugitive.`);
  } else {
    const added = randInt(2, 5);
    j.yearsLeft += added;
    j.totalSentence += added;
    j.behaviorScore = 0;
    character.stats.health = clampStat(character.stats.health - randInt(5, 15));
    logEvent(character, character.age, `${character.name}'s escape attempt fails. Caught at the fence line — ${added} more years added to the sentence.`);
  }
}

function resolveParoleHearing(character) {
  const j = character.jail;
  const chance = Math.max(0.05, (j.behaviorScore - 30) / 100);
  if (Math.random() < chance) {
    logEvent(character, character.age, `${character.name} was granted parole after ${j.totalSentence - j.yearsLeft} years served. Released early on good behavior.`);
    j.yearsLeft = 0;
  } else {
    j.behaviorScore = clampStat(j.behaviorScore - 5);
    logEvent(character, character.age, `${character.name}'s parole request was denied. The board wasn't convinced.`);
  }
}

// Called once per age-up (from main.js) for a fugitive who isn't
// currently serving time: a passive chance of recapture that rises
// with accumulated heat.
function runFugitiveYear(character) {
  const recaptureChance = 0.15 + character.criminal.heat / 250;
  if (Math.random() < recaptureChance) {
    const penalty = randInt(3, 8);
    character.jail.yearsLeft = penalty;
    character.jail.totalSentence = penalty;
    character.jail.behaviorScore = 30;
    character.jail.isFugitive = false;
    character.jail.crimeLabel = "escaping custody";
    character.criminal.heat = clampStat(character.criminal.heat - 20);
    logEvent(character, character.age, `${character.name}'s luck as a fugitive runs out — recaptured and sentenced to ${penalty} more years, this time for the escape too.`);
  } else {
    logEvent(character, character.age, `${character.name} stays off the grid for another year, always looking over their shoulder.`);
  }
}
