// Crime system: a full criminal career arc from childhood mischief to
// organized crime and heists, plus the "heat" mechanic that makes a
// life of crime escalate realistically — the more you get away with,
// the more attention you draw, and the worse your odds get from there.
//
// Actual incarceration mechanics (prison life, escape, parole) live in
// prison.js; this file is about the crimes themselves and the criminal
// career (gangs, rank, heat).

const GANG_RANKS = ["prospect", "associate", "soldier", "capo", "boss"];

function gangRankIndex(character) {
  if (!character.criminal.gang) return -1;
  return GANG_RANKS.indexOf(character.criminal.gang.rank);
}

function hasMinRank(character, rank) {
  return gangRankIndex(character) >= GANG_RANKS.indexOf(rank);
}

// Every crime in the game, flattened into one list with a `tier` used
// purely for menu grouping. Success/caught odds are computed generically
// in resolveCrime() from smarts/looks/heat/gang rank, so adding a new
// crime is just appending an entry here.
const CRIMES = [
  // ---------------- Childhood Mischief (6-12) ----------------
  {
    id: "steal_cookie", tier: "mischief", minAge: 6, maxAge: 12,
    label: "Sneak a cookie before dinner", baseChance: 0.85,
    reward: () => ({ happiness: 2 }), caughtFine: 0, caughtJailYears: 0,
    successText: "You snag a cookie and no one's the wiser.",
    caughtText: "Caught red-handed (and chocolate-mouthed). No dessert for a week.",
    caughtHappiness: -4,
  },
  {
    id: "copy_homework", tier: "mischief", minAge: 7, maxAge: 13,
    label: "Copy a classmate's homework", baseChance: 0.7,
    reward: () => ({ smarts: -1, happiness: 2 }), caughtFine: 0, caughtJailYears: 0,
    successText: "You turn it in as your own. Easy A.",
    caughtText: "The teacher notices the identical handwriting-adjacent mistakes. Detention.",
    caughtHappiness: -5, caughtSmarts: -2,
  },
  {
    id: "sneak_into_movies", tier: "mischief", minAge: 8, maxAge: 13,
    label: "Sneak into a movie without paying", baseChance: 0.75,
    reward: () => ({ happiness: 5 }), caughtFine: 10, caughtJailYears: 0,
    successText: "You slip past the usher and catch the whole movie.",
    caughtText: "An usher catches you and walks you straight back out.",
    caughtHappiness: -3,
  },
  {
    id: "lie_about_tooth", tier: "mischief", minAge: 6, maxAge: 10,
    label: "Tell the tooth fairy you lost two teeth (you lost one)", baseChance: 0.6,
    reward: () => ({ money: 5, happiness: 3 }), caughtFine: 0, caughtJailYears: 0,
    successText: "The tooth fairy doesn't do dental exams. Double the payout.",
    caughtText: "Your parents count your teeth. You are grounded from the tooth fairy.",
    caughtHappiness: -6,
  },
  {
    id: "prank_call_neighbor", tier: "mischief", minAge: 8, maxAge: 13,
    label: "Prank call the neighbor", baseChance: 0.65,
    reward: () => ({ happiness: 4 }), caughtFine: 0, caughtJailYears: 0,
    successText: "You disguise your voice perfectly. Hilarious.",
    caughtText: "Caller ID betrays you. The neighbor tells your parents personally.",
    caughtHappiness: -5,
  },
  {
    id: "blame_sibling", tier: "mischief", minAge: 6, maxAge: 13,
    label: "Blame a chore you skipped on your sibling", baseChance: 0.55,
    requires: (c) => c.relationships.some((r) => r.type === "Sibling"),
    reward: () => ({ happiness: 5 }), caughtFine: 0, caughtJailYears: 0,
    successText: "Your sibling takes the fall. Slightly evil, deeply satisfying.",
    caughtText: "Your sibling has receipts. Your parents see right through it.",
    caughtHappiness: -6,
    caughtRelationship: true, // dings the sibling relationship specifically
  },

  // ---------------- Teen Delinquency (13-18) ----------------
  {
    id: "shoplift_candy", tier: "teen", minAge: 13, maxAge: 18,
    label: "Shoplift candy from the corner store", baseChance: 0.65,
    reward: () => ({ money: randInt(5, 20), happiness: 2 }), caughtFine: 30, caughtJailYears: 0,
    successText: "Pockets full of contraband sugar.", caughtText: "The clerk saw the whole thing and calls your parents.",
    caughtHappiness: -5,
  },
  {
    id: "vandalize_bathroom", tier: "teen", minAge: 13, maxAge: 18,
    label: "Vandalize the school bathroom stall", baseChance: 0.6,
    reward: () => ({ happiness: 4 }), caughtFine: 0, caughtJailYears: 0,
    successText: "Your masterpiece will be admired (or scrubbed off) for years.",
    caughtText: "Hall camera footage doesn't lie. A week of detention.",
    caughtHappiness: -6, caughtSmarts: -1,
  },
  {
    id: "cheat_on_exam", tier: "teen", minAge: 13, maxAge: 18,
    label: "Cheat on a big exam", baseChance: 0.6,
    reward: () => ({ smarts: 2 }), caughtFine: 0, caughtJailYears: 0,
    successText: "The cheat sheet works perfectly. A suspiciously good grade.",
    caughtText: "The teacher catches you mid-glance. Automatic zero, and a call home.",
    caughtHappiness: -6, caughtSmarts: -3,
  },
  {
    id: "forge_sick_note", tier: "teen", minAge: 13, maxAge: 18,
    label: "Forge a note to skip school", baseChance: 0.7,
    reward: () => ({ happiness: 6 }), caughtFine: 0, caughtJailYears: 0,
    successText: "The office doesn't even blink. Free day off.",
    caughtText: "The handwriting doesn't match your parent's at all. Busted.",
    caughtHappiness: -4,
  },
  {
    id: "sell_hall_passes", tier: "teen", minAge: 14, maxAge: 18,
    label: "Sell forged hall passes to classmates", baseChance: 0.5,
    reward: () => ({ money: randInt(20, 80) }), caughtFine: 0, caughtJailYears: 0,
    successText: "Word spreads quietly and business is good.",
    caughtText: "A classmate rats you out to the vice principal. Suspended.",
    caughtHappiness: -8,
  },
  {
    id: "tp_rival_house", tier: "teen", minAge: 13, maxAge: 18, repeatable: true,
    label: "TP a rival's house", baseChance: 0.7,
    reward: () => ({ happiness: 7 }), caughtFine: 20, caughtJailYears: 0,
    successText: "Their whole front yard is a beautiful, tissue-draped mess.",
    caughtText: "Their dad chases you down the block. You're grounded for a month.",
    caughtHappiness: -4,
  },
  {
    id: "fake_id_club", tier: "teen", minAge: 16, maxAge: 18,
    label: "Sneak into a club with a fake ID", baseChance: 0.5,
    reward: () => ({ happiness: 8 }), caughtFine: 50, caughtJailYears: 0,
    successText: "The bouncer barely glances at it. You're in.",
    caughtText: "The bouncer confiscates the fake and bans you on the spot.",
    caughtHappiness: -5,
  },

  // ---------------- Petty Crime (18+) ----------------
  {
    id: "jaywalk", tier: "petty", minAge: 18, maxAge: 99, repeatable: true,
    label: "Jaywalk across a busy street", baseChance: 0.9,
    reward: () => ({ happiness: 1 }), caughtFine: 40, caughtJailYears: 0,
    successText: "You dash across without a scratch.", caughtText: "A cop on the corner writes you a jaywalking ticket.",
  },
  {
    id: "pickpocket", tier: "petty", minAge: 18, maxAge: 99, repeatable: true,
    label: "Pickpocket a stranger", baseChance: 0.55,
    reward: () => ({ money: randInt(20, 120) }), caughtFine: 150, caughtJailYears: 0,
    successText: "Smooth. Nobody even noticed.", caughtText: "The stranger feels your hand and starts yelling for help.",
  },
  {
    id: "dine_and_dash", tier: "petty", minAge: 18, maxAge: 99, repeatable: true,
    label: "Dine and dash on a restaurant bill", baseChance: 0.6,
    reward: () => ({ money: randInt(15, 60) }), caughtFine: 100, caughtJailYears: 0,
    successText: "You're two blocks away before they even bring the check.",
    caughtText: "The manager catches you at the door and calls the police.",
    caughtHappiness: -3,
  },
  {
    id: "fare_jump", tier: "petty", minAge: 18, maxAge: 99, repeatable: true,
    label: "Jump the subway turnstile", baseChance: 0.75,
    reward: () => ({ money: 3 }), caughtFine: 75, caughtJailYears: 0,
    successText: "Clean hop, no one looks up from their phone.",
    caughtText: "A transit cop was watching the whole time.",
  },
  {
    id: "joyride_scooter", tier: "petty", minAge: 16, maxAge: 99, repeatable: true,
    label: "Joyride a stranger's e-scooter", baseChance: 0.65,
    reward: () => ({ happiness: 6 }), caughtFine: 60, caughtJailYears: 0,
    successText: "You ditch it a few blocks away, exhilarated.",
    caughtText: "The owner tracks it by GPS and confronts you.",
    caughtHappiness: -4,
  },
  {
    id: "sell_counterfeit", tier: "petty", minAge: 18, maxAge: 99, repeatable: true,
    label: "Sell counterfeit designer bags", baseChance: 0.5,
    reward: () => ({ money: randInt(500, 1500) }), caughtFine: 1000, caughtJailYears: 1,
    successText: "Business is booming — nobody can tell the difference.",
    caughtText: "An undercover buyer turns out to be a cop.",
  },

  // ---------------- Property & Theft (18+) ----------------
  {
    id: "shoplift_electronics", tier: "property", minAge: 18, maxAge: 99, repeatable: true,
    label: "Shoplift electronics from a store", baseChance: 0.45,
    reward: () => ({ money: randInt(200, 600) }), caughtFine: 500, caughtJailYears: 1,
    successText: "You walk out with a bag full of gadgets. Easy.",
    caughtText: "Loss prevention tackles you at the exit.",
  },
  {
    id: "burglary", tier: "property", minAge: 18, maxAge: 99, repeatable: true,
    label: "Break into a house", baseChance: 0.35,
    reward: () => ({ money: randInt(1000, 5000) }), caughtFine: 0, caughtJailYears: 3,
    successText: "You slip out with a bag of valuables before anyone wakes up.",
    caughtText: "The homeowner comes home early and calls the police.",
  },
  {
    id: "grand_theft_auto", tier: "property", minAge: 18, maxAge: 99, repeatable: true,
    label: "Steal a car", baseChance: 0.3,
    reward: () => ({ money: randInt(3000, 12000) }), caughtFine: 0, caughtJailYears: 4,
    successText: "You hotwire it and vanish into traffic.",
    caughtText: "A police cruiser spots you running a red light in the stolen car.",
  },
  {
    id: "chop_shop", tier: "property", minAge: 18, maxAge: 99, repeatable: true,
    label: "Run a stolen car through a chop shop", baseChance: 0.4,
    reward: () => ({ money: randInt(2000, 7000) }), caughtFine: 0, caughtJailYears: 3,
    successText: "The car is scrap parts within the hour. Untraceable, probably.",
    caughtText: "The chop shop was under surveillance the whole time. So were you.",
    heatOnCaught: 25,
  },
  {
    id: "identity_theft", tier: "property", minAge: 18, maxAge: 99, repeatable: true,
    label: "Steal someone's identity for credit fraud", baseChance: 0.4,
    reward: () => ({ money: randInt(1000, 4000) }), caughtFine: 0, caughtJailYears: 2,
    successText: "New credit cards, same old you. The charges go through clean.",
    caughtText: "The bank's fraud department flags the pattern and traces it back to you.",
  },

  // ---------------- White-Collar Crime (21+) ----------------
  {
    id: "embezzle", tier: "whitecollar", minAge: 21, maxAge: 99, repeatable: true,
    requires: (c) => !!c.career.job,
    label: "Embezzle funds from your employer", baseChance: 0.4,
    reward: (c) => ({ money: Math.round(c.career.job.salary * (0.3 + Math.random() * 0.5)) }),
    caughtFine: 0, caughtJailYears: 3,
    successText: "The books balance perfectly, on paper.",
    caughtText: "An internal audit finds the discrepancy — straight back to you.",
    caughtLoseJob: true,
  },
  {
    id: "insider_trading", tier: "whitecollar", minAge: 22, maxAge: 99, repeatable: true,
    requires: (c) => c.stats.smarts >= 55,
    label: "Trade on insider information", baseChance: 0.35,
    reward: () => ({ money: randInt(5000, 40000) }), caughtFine: 0, caughtJailYears: 3,
    successText: "The trade clears right before the news breaks. Huge payout.",
    caughtText: "The SEC flags the timing of your trade immediately.",
  },
  {
    id: "tax_fraud", tier: "whitecollar", minAge: 21, maxAge: 99, repeatable: true,
    label: "Fudge the numbers on your tax return", baseChance: 0.55,
    reward: () => ({ money: randInt(500, 3000) }), caughtFine: 5000, caughtJailYears: 1,
    successText: "The return goes through without a second look.",
    caughtText: "You get flagged for an audit, and it does not go well.",
  },
  {
    id: "ponzi_scheme", tier: "whitecollar", minAge: 25, maxAge: 99,
    requires: (c) => c.stats.smarts >= 50,
    label: "Run a Ponzi scheme for 'investors'", baseChance: 0.3,
    reward: () => ({ money: randInt(20000, 100000) }), caughtFine: 0, caughtJailYears: 6,
    successText: "New investor money pays off the old investors, for now, spectacularly.",
    caughtText: "The scheme collapses under its own weight and regulators come knocking.",
    heatOnCaught: 30,
  },
  {
    id: "insurance_fraud_fall", tier: "whitecollar", minAge: 21, maxAge: 99, repeatable: true,
    label: "Fake a slip-and-fall for insurance money", baseChance: 0.4,
    reward: () => ({ money: randInt(1000, 4000) }), caughtFine: 800, caughtJailYears: 1,
    successText: "The claims adjuster buys the whole performance.",
    caughtText: "Surveillance footage of you 'recovering' a little too quickly gives it away.",
  },
  {
    id: "counterfeit_currency", tier: "whitecollar", minAge: 21, maxAge: 99, repeatable: true,
    requires: (c) => c.stats.smarts >= 45,
    label: "Print counterfeit currency", baseChance: 0.3,
    reward: () => ({ money: randInt(2000, 8000) }), caughtFine: 0, caughtJailYears: 4,
    successText: "The bills pass every test you try them on.",
    caughtText: "The Secret Service does not appreciate your printer's watermark work.",
    heatOnCaught: 20,
  },

  // ---------------- Organized Crime (18+, requires gang) ----------------
  {
    id: "prospect_errand", tier: "organized", minAge: 16, maxAge: 99, repeatable: true,
    requires: (c) => hasMinRank(c, "prospect"),
    label: "Run an errand to prove yourself to the crew", baseChance: 0.7,
    reward: () => ({ money: randInt(100, 400) }), caughtFine: 100, caughtJailYears: 0,
    successText: "Simple job, done clean. The crew takes notice.",
    caughtText: "You fumble the handoff in full view of a patrol car. Embarrassing.",
    heatOnSuccess: 2, heatOnCaught: 8,
  },
  {
    id: "protection_racket", tier: "organized", minAge: 18, maxAge: 99, repeatable: true,
    requires: (c) => hasMinRank(c, "associate"),
    label: "Run a protection racket on local shops", baseChance: 0.5,
    reward: () => ({ money: randInt(500, 2000) }), caughtFine: 0, caughtJailYears: 2,
    successText: "The shop owners pay up without much fuss.",
    caughtText: "One shop owner was wired by the police the whole time.",
    heatOnSuccess: 4, heatOnCaught: 20,
  },
  {
    id: "drug_trafficking", tier: "organized", minAge: 18, maxAge: 99, repeatable: true,
    requires: (c) => hasMinRank(c, "associate"),
    label: "Move product across the city for the crew", baseChance: 0.45,
    reward: () => ({ money: randInt(2000, 10000) }), caughtFine: 0, caughtJailYears: 5,
    successText: "The delivery goes off without a hitch.",
    caughtText: "A checkpoint stop turns into the worst day of your life.",
    heatOnSuccess: 5, heatOnCaught: 30,
  },
  {
    id: "weapons_dealing", tier: "organized", minAge: 21, maxAge: 99, repeatable: true,
    requires: (c) => hasMinRank(c, "soldier"),
    label: "Broker a weapons deal for the crew", baseChance: 0.4,
    reward: () => ({ money: randInt(5000, 20000) }), caughtFine: 0, caughtJailYears: 7,
    successText: "The deal closes quietly, no questions asked.",
    caughtText: "ATF agents were on the other end of the deal.",
    heatOnSuccess: 6, heatOnCaught: 35,
  },
  {
    id: "money_laundering", tier: "organized", minAge: 21, maxAge: 99, repeatable: true,
    requires: (c) => hasMinRank(c, "soldier"),
    label: "Launder crew money through a front business", baseChance: 0.5,
    reward: () => ({ money: randInt(3000, 15000) }), caughtFine: 0, caughtJailYears: 4,
    successText: "The books come out squeaky clean.",
    caughtText: "Federal auditors trace the front business back to the crew — and you.",
    heatOnSuccess: 3, heatOnCaught: 25,
  },

  // ---------------- Heists (needs skill or gang rank) ----------------
  {
    id: "armored_truck", tier: "heist", minAge: 21, maxAge: 99,
    requires: (c) => hasMinRank(c, "soldier") || c.stats.smarts >= 75,
    label: "Rob an armored truck", baseChance: 0.25,
    reward: () => ({ money: randInt(15000, 60000) }), caughtFine: 0, caughtJailYears: 8,
    successText: "The truck never had a chance. A clean, fast job.",
    caughtText: "The guards' silent alarm brings police before you're a block away.",
    heatOnCaught: 30,
  },
  {
    id: "casino_heist", tier: "heist", minAge: 21, maxAge: 99,
    requires: (c) => hasMinRank(c, "capo") || (c.stats.smarts >= 80 && c.criminal.heat < 40),
    label: "Rig and rob a casino vault", baseChance: 0.2,
    reward: () => ({ money: randInt(40000, 200000) }), caughtFine: 0, caughtJailYears: 10,
    successText: "The vault door swings open right on schedule. A flawless score.",
    caughtText: "Casino security clocks the whole operation on camera 12.",
    heatOnCaught: 35,
  },
  {
    id: "art_heist", tier: "heist", minAge: 25, maxAge: 99,
    requires: (c) => hasMinRank(c, "capo") || (c.stats.smarts >= 82 && c.stats.looks >= 50),
    label: "Steal a painting from the museum gala", baseChance: 0.22,
    reward: () => ({ money: randInt(50000, 300000) }), caughtFine: 0, caughtJailYears: 9,
    successText: "You walk out of the gala with the painting under a coat. Unbelievable.",
    caughtText: "The replica you left behind fools no one for very long.",
    heatOnCaught: 30,
  },
  {
    id: "bank_heist", tier: "heist", minAge: 21, maxAge: 99,
    requires: (c) => hasMinRank(c, "boss") || (c.stats.smarts >= 85 && c.criminal.heat < 30),
    label: "Pull off the big bank job", baseChance: 0.12,
    reward: () => ({ money: randInt(100000, 500000) }), caughtFine: 0, caughtJailYears: 15,
    successText: "You pull off the heist of the century and disappear.",
    caughtText: "SWAT surrounds the building before you make it to the door.",
    heatOnCaught: 40,
  },

  // ---------------- Retirement Crime (60+) ----------------
  {
    id: "fake_charity_calls", tier: "retirement", minAge: 60, maxAge: 99, repeatable: true,
    label: "Run a fake charity phone scam from your recliner", baseChance: 0.5,
    reward: () => ({ money: randInt(200, 1500) }), caughtFine: 400, caughtJailYears: 1,
    successText: "Turns out a warm, grandparently voice is very convincing.",
    caughtText: "One 'donor' turns out to be an actual detective. Awkward.",
  },
  {
    id: "pension_fraud", tier: "retirement", minAge: 62, maxAge: 99, repeatable: true,
    label: "Fudge your pension paperwork for a bigger check", baseChance: 0.5,
    reward: () => ({ money: randInt(500, 3000) }), caughtFine: 1000, caughtJailYears: 1,
    successText: "The extra zero on the form goes completely unnoticed.",
    caughtText: "A routine audit catches the discrepancy immediately.",
  },
  {
    id: "one_last_job", tier: "retirement", minAge: 60, maxAge: 99,
    requires: (c) => c.criminal.timesArrested > 0 || !!c.criminal.gang,
    label: "Pull off one last nostalgic job, for old times' sake", baseChance: 0.3,
    reward: () => ({ money: randInt(20000, 80000), happiness: 15 }), caughtFine: 0, caughtJailYears: 5,
    successText: "Turns out you've still got it. One final, glorious score.",
    caughtText: "You're not as fast as you used to be. It shows.",
    caughtHappiness: -10,
  },
];

function crimesForTier(character, tier) {
  return CRIMES.filter(
    (c) =>
      c.tier === tier &&
      character.age >= c.minAge &&
      character.age <= c.maxAge &&
      (!c.requires || c.requires(character))
  );
}

const TIER_LABELS = {
  mischief: "Childhood Mischief",
  teen: "Teen Delinquency",
  petty: "Petty Crime",
  property: "Property & Theft",
  whitecollar: "White-Collar Crime",
  organized: "Organized Crime",
  heist: "Heists",
  retirement: "Retirement Grifting",
};

function openCrimeActivity(character) {
  if (!character || !character.alive) return;

  // Behind bars: the Crime button becomes the Prison Life menu instead.
  if (character.jail.yearsLeft > 0) {
    openPrisonActivity(character);
    return;
  }

  const availableTiers = Object.keys(TIER_LABELS).filter((t) => crimesForTier(character, t).length > 0);

  const topChoices = [
    ...availableTiers.map((t) => ({ label: `${tierIcon(t)} ${TIER_LABELS[t]}`, action: "tier", tier: t })),
    ...(character.age >= 16 && !character.criminal.gang ? [{ label: "🤝 Try to get recruited by a gang", action: "recruit" }] : []),
    { label: "Stay on the straight and narrow", action: "cancel" },
  ];

  const heatNote = character.criminal.heat >= 60 ? " (You're seriously on law enforcement's radar right now.)" : "";
  openChoiceModal(`The criminal underworld beckons.${heatNote}`, topChoices, (choice) => {
    if (choice.action === "tier") openTierMenu(character, choice.tier);
    else if (choice.action === "recruit") attemptGangRecruitment(character);
  });
}

function tierIcon(tier) {
  return {
    mischief: "🍪", teen: "🎒", petty: "🧤", property: "🏚️", whitecollar: "💼",
    organized: "🕴️", heist: "💎", retirement: "👵",
  }[tier] || "🕶️";
}

function openTierMenu(character, tier) {
  const crimes = crimesForTier(character, tier);
  openChoiceModal(
    `${TIER_LABELS[tier]} — pick your play:`,
    [...crimes.map((c) => ({ label: c.label, action: "crime", crime: c })), { label: "Back out", action: "cancel" }],
    (choice) => {
      if (choice.action !== "crime") return;
      resolveCrime(character, choice.crime);
    }
  );
}

// Generic success-chance formula shared by every crime: base chance,
// nudged by smarts/looks, hurt by accumulated heat, helped by gang rank
// on organized-crime jobs.
function computeCrimeChance(character, crime) {
  let chance = crime.baseChance;
  chance += (character.stats.smarts - 50) / 400;
  chance += (character.stats.looks - 50) / 600;
  chance -= character.criminal.heat / 300;
  if (crime.tier === "organized" || crime.tier === "heist") {
    chance += gangRankIndex(character) * 0.03;
  }
  return Math.max(0.05, Math.min(0.95, chance));
}

function resolveCrime(character, crime) {
  const chance = computeCrimeChance(character, crime);
  character.criminal.heat = clampStat(character.criminal.heat); // no-op guard, keeps 0-100

  if (Math.random() < chance) {
    const reward = crime.reward(character) || {};
    if (reward.money) character.money += reward.money;
    if (reward.happiness) character.stats.happiness = clampStat(character.stats.happiness + reward.happiness);
    if (reward.smarts) character.stats.smarts = clampStat(character.stats.smarts + reward.smarts);
    character.stats.happiness = clampStat(character.stats.happiness + 2);
    character.criminal.heat = clampStat(character.criminal.heat + (crime.heatOnSuccess ?? 2));
    maybePromoteInGang(character, crime);
    logEvent(
      character,
      character.age,
      `${crime.successText}${reward.money ? ` (+$${reward.money.toLocaleString()})` : ""}`
    );
  } else {
    character.criminal.timesArrested += 1;
    character.flags.hasRecord = true;
    character.stats.happiness = clampStat(character.stats.happiness + (crime.caughtHappiness ?? -10));
    if (crime.caughtSmarts) character.stats.smarts = clampStat(character.stats.smarts + crime.caughtSmarts);
    character.criminal.heat = clampStat(character.criminal.heat + (crime.heatOnCaught ?? 15));

    if (crime.caughtRelationship) {
      const sib = character.relationships.find((r) => r.type === "Sibling");
      if (sib) sib.quality = clampStat(sib.quality - 20);
    }

    let text = crime.caughtText;
    if (crime.caughtFine > 0) {
      character.money -= crime.caughtFine;
      text += ` Fined $${crime.caughtFine.toLocaleString()}.`;
    }
    if (crime.caughtJailYears > 0) {
      character.jail.yearsLeft += crime.caughtJailYears;
      character.jail.totalSentence += crime.caughtJailYears;
      character.jail.behaviorScore = 50;
      character.jail.crimeLabel = crime.label;
      if (crime.caughtLoseJob || character.career.job) {
        text += character.career.job ? ` Lost the ${character.career.job.title} job too.` : "";
        character.career.job = null;
        character.career.yearsAtJob = 0;
      }
      text += ` Sentenced to ${crime.caughtJailYears} year${crime.caughtJailYears > 1 ? "s" : ""} in prison.`;
    }
    logEvent(character, character.age, text);
  }
  renderGame();
}

// Small chance a successful organized-crime job bumps the character up
// the ranks. Heists don't promote — those are what you do once you're
// already at the top.
function maybePromoteInGang(character, crime) {
  if (crime.tier !== "organized" || !character.criminal.gang) return;
  const idx = gangRankIndex(character);
  if (idx >= GANG_RANKS.length - 1) return;
  if (Math.random() < 0.12) {
    character.criminal.gang.rank = GANG_RANKS[idx + 1];
    logEvent(character, character.age, `Word gets back to the top — ${character.name} is now a ${character.criminal.gang.rank} in ${character.criminal.gang.name}.`);
  }
}

const GANG_NAMES = ["The Ashwood Crew", "The Velvet Hand", "Ironside Syndicate", "The Nightshade Family", "Cobblestone Outfit"];

function attemptGangRecruitment(character) {
  const chance = 0.25 + character.criminal.timesArrested * 0.08 + (character.stats.looks - 50) / 400;
  if (Math.random() < Math.min(0.75, chance)) {
    const gangName = randomFrom(GANG_NAMES);
    character.criminal.gang = { name: gangName, rank: "prospect", loyalty: 60 };
    character.stats.happiness = clampStat(character.stats.happiness + 6);
    logEvent(character, character.age, `${character.name} was brought in as a prospect with ${gangName}. There's no easy way out now.`);
  } else {
    character.stats.happiness = clampStat(character.stats.happiness - 3);
    logEvent(character, character.age, `${character.name} tried to get in with a local crew, but nobody's vouching for a nobody.`);
  }
  renderGame();
}
