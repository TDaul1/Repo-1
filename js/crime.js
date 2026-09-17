// Crime: risk/reward actions. Getting caught costs money and/or jail
// time (which locks out Job/School/Crime activities until served — see
// runJailYear in main.js) and leaves a permanent record that job
// applications don't ask about but maybe should.

const CRIMES = [
  {
    id: "jaywalk",
    label: "Jaywalk across a busy street",
    successChance: 0.9,
    reward: () => ({ money: 0, happiness: 1 }),
    caughtFine: 40,
    caughtJailYears: 0,
    successText: "You dash across without a scratch.",
    caughtText: "A cop on the corner writes you a jaywalking ticket.",
  },
  {
    id: "pickpocket",
    label: "Pickpocket a stranger",
    successChance: 0.55,
    reward: () => ({ money: randInt(20, 120) }),
    caughtFine: 150,
    caughtJailYears: 0,
    successText: "Smooth. Nobody even noticed.",
    caughtText: "The stranger feels your hand and starts yelling for help.",
  },
  {
    id: "shoplift_electronics",
    label: "Shoplift electronics from a store",
    successChance: 0.45,
    reward: () => ({ money: randInt(200, 600) }),
    caughtFine: 500,
    caughtJailYears: 1,
    successText: "You walk out with a bag full of gadgets. Easy.",
    caughtText: "Loss prevention tackles you at the exit.",
  },
  {
    id: "sell_counterfeit",
    label: "Sell counterfeit designer bags",
    successChance: 0.5,
    reward: () => ({ money: randInt(500, 1500) }),
    caughtFine: 1000,
    caughtJailYears: 1,
    successText: "Business is booming — nobody can tell the difference.",
    caughtText: "An undercover buyer turns out to be a cop.",
  },
  {
    id: "burglary",
    label: "Break into a house",
    successChance: 0.35,
    reward: () => ({ money: randInt(1000, 5000) }),
    caughtFine: 0,
    caughtJailYears: 3,
    successText: "You slip out with a bag of valuables before anyone wakes up.",
    caughtText: "The homeowner comes home early and calls the police.",
  },
  {
    id: "grand_theft_auto",
    label: "Steal a car",
    successChance: 0.3,
    reward: () => ({ money: randInt(3000, 12000) }),
    caughtFine: 0,
    caughtJailYears: 4,
    successText: "You hotwire it and vanish into traffic.",
    caughtText: "A police cruiser spots you running a red light in the stolen car.",
  },
  {
    id: "bank_heist",
    label: "Rob a bank",
    successChance: 0.12,
    reward: () => ({ money: randInt(20000, 150000) }),
    caughtFine: 0,
    caughtJailYears: 10,
    successText: "You pull off the heist of the century and disappear.",
    caughtText: "SWAT surrounds the building before you make it to the door.",
  },
  {
    id: "insurance_fraud_squirrel",
    label: "Fake a squirrel-related workplace injury for insurance money",
    successChance: 0.4,
    reward: () => ({ money: randInt(1000, 4000) }),
    caughtFine: 800,
    caughtJailYears: 1,
    successText: "The claims adjuster somehow buys the entire squirrel story.",
    caughtText: "Surveillance footage of you setting up the 'accident' surfaces online.",
  },
];

function openCrimeActivity(character) {
  if (!character || !character.alive) return;

  if (character.jail.yearsLeft > 0) {
    logEvent(character, character.age, `${character.name} is still locked up. Can't commit crimes from a cell (that anyone would notice).`);
    renderGame();
    return;
  }

  openChoiceModal(
    "The criminal underworld beckons. What'll it be?",
    [
      ...CRIMES.map((c) => ({ label: c.label, action: "crime", crime: c })),
      { label: "Stay on the straight and narrow", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "crime") return;
      const crime = choice.crime;
      const looksLuck = character.stats.looks / 1000;
      const smartsLuck = character.stats.smarts / 500;
      const chance = Math.min(0.95, crime.successChance + looksLuck + smartsLuck);

      character.flags.hasRecord = character.flags.hasRecord || false;

      if (Math.random() < chance) {
        const reward = crime.reward();
        if (reward.money) character.money += reward.money;
        if (reward.happiness) character.stats.happiness = clampStat(character.stats.happiness + reward.happiness);
        character.stats.happiness = clampStat(character.stats.happiness + 3);
        logEvent(character, character.age, `${crime.successText}${reward.money ? ` (+$${reward.money.toLocaleString()})` : ""}`);
      } else {
        character.flags.hasRecord = true;
        character.stats.happiness = clampStat(character.stats.happiness - 10);
        let text = crime.caughtText;
        if (crime.caughtFine > 0) {
          character.money -= crime.caughtFine;
          text += ` Fined $${crime.caughtFine.toLocaleString()}.`;
        }
        if (crime.caughtJailYears > 0) {
          character.jail.yearsLeft += crime.caughtJailYears;
          if (character.career.job) {
            text += ` Lost the ${character.career.job.title} job too.`;
            character.career.job = null;
            character.career.yearsAtJob = 0;
          }
          text += ` Sentenced to ${crime.caughtJailYears} year${crime.caughtJailYears > 1 ? "s" : ""} in prison.`;
        }
        logEvent(character, character.age, text);
      }
      renderGame();
    }
  );
}
