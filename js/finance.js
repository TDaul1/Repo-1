// Financial depth: a fluctuating economy, investable instruments with
// real risk/return profiles, business ownership with its own yearly
// profit/loss simulation, and a simple progressive tax bite on earned
// income. All ticked once per age-up from main.js.

const INVESTMENT_TYPES = {
  stocks: { label: "Index Fund", meanReturn: 0.08, volatility: 0.16 },
  crypto: { label: "Cryptocurrency", meanReturn: 0.11, volatility: 0.55, crashChance: 0.07, crashRange: [0.25, 0.55] },
  retirement: { label: "Retirement Account", meanReturn: 0.05, volatility: 0.05 },
};

const BUSINESS_TYPES = [
  { id: "cafe", label: "Coffee Shop", startCapital: 20000 },
  { id: "shop", label: "Retail Store", startCapital: 35000 },
  { id: "agency", label: "Marketing Agency", startCapital: 15000 },
  { id: "tech_startup", label: "Tech Startup", startCapital: 50000 },
  { id: "food_truck", label: "Food Truck", startCapital: 12000 },
  { id: "novelty", label: "Novelty Sock Emporium", startCapital: 8000 },
];

function taxRate(income) {
  if (income <= 20000) return 0.08;
  if (income <= 45000) return 0.15;
  if (income <= 90000) return 0.24;
  if (income <= 180000) return 0.32;
  return 0.39;
}

// Applies tax to one chunk of earned income (salary or business profit)
// and returns the after-tax amount. Deliberately per-source rather than
// aggregated across the year — simpler, and close enough for a life sim.
function afterTax(character, grossAmount) {
  if (grossAmount <= 0) return grossAmount;
  const rate = taxRate(grossAmount);
  const tax = Math.round(grossAmount * rate);
  return { net: grossAmount - tax, tax, rate };
}

function tickEconomy(character) {
  const w = character.world;
  w.economyYearsLeft -= 1;
  if (w.economyYearsLeft <= 0) {
    const roll = Math.random();
    const previous = w.economy;
    w.economy = roll < 0.25 ? "boom" : roll < 0.45 ? "recession" : "stable";
    w.economyYearsLeft = randInt(3, 8);
    if (w.economy !== previous) {
      if (w.economy === "boom") logEvent(character, character.age, "The economy is booming. Stocks are up, jobs are plentiful.");
      else if (w.economy === "recession") logEvent(character, character.age, "The economy has slid into a recession. Money is tighter for everyone.");
      else logEvent(character, character.age, "The economy has leveled out to something more stable.");
    }
  }
}

function economyModifier(character) {
  if (character.world.economy === "boom") return 0.06;
  if (character.world.economy === "recession") return -0.09;
  return 0;
}

function tickInvestments(character) {
  const mod = economyModifier(character);
  for (const inv of character.investments) {
    const def = INVESTMENT_TYPES[inv.type];

    if (def.crashChance && Math.random() < def.crashChance) {
      const [lo, hi] = def.crashRange;
      const survivingFraction = lo + Math.random() * (hi - lo);
      inv.value = Math.round(inv.value * survivingFraction);
      logEvent(character, character.age, `${def.label} crashes hard — ${character.name}'s holdings lose most of their value overnight.`);
      continue;
    }

    const meanThisYear = def.meanReturn + mod * (inv.type === "crypto" ? 0.4 : 1);
    // Box-Muller-ish approximation via sum of uniforms for a roughly
    // normal-shaped return distribution instead of a flat random range.
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const returnRate = meanThisYear + noise * def.volatility;
    inv.value = Math.max(0, Math.round(inv.value * (1 + returnRate)));
  }
}

function tickBusiness(character) {
  if (!character.business) return;
  const biz = character.business;
  biz.yearsRun += 1;

  // Revenue capacity comes from the business's scale (capital invested
  // in it, not accumulated retained profit — profit is paid out to the
  // owner each year below, not reinvested automatically, so capital
  // can't compound into a runaway number on its own).
  const mod = economyModifier(character);
  const skillFactor = (character.stats.smarts - 50) / 300;
  const baseMargin = 0.06 + mod + skillFactor + randInt(-20, 20) / 100;
  const revenue = Math.round(biz.capital * (0.4 + Math.random() * 0.4));
  const profit = Math.round(revenue * baseMargin);

  if (profit > 0) {
    const { net, tax } = afterTax(character, profit);
    character.money += net;
    logEvent(character, character.age, `${biz.name} turned a $${profit.toLocaleString()} profit this year (paid $${tax.toLocaleString()} in tax).`);
  } else if (profit < 0) {
    // A loss is absorbed by the business's own capital, not the owner's
    // pocket directly — enough losses in a row and it goes under.
    biz.capital += profit;
    logEvent(character, character.age, `${biz.name} took a $${Math.abs(profit).toLocaleString()} loss this year.`);
  }

  if (biz.capital <= 0) {
    logEvent(character, character.age, `${biz.name} went under. The doors are closed for good.`);
    character.stats.happiness = clampStat(character.stats.happiness - 12);
    character.stats.stress = clampStat(character.stats.stress + 15);
    character.business = null;
  }
}

function openAssetsActivity(character) {
  if (!character || !character.alive) return;

  const owned = character.assets;
  const topChoices = [
    { label: "Browse cars", action: "cars" },
    { label: "Browse houses", action: "houses" },
    { label: "📈 Investments", action: "investments" },
    ...(character.business ? [{ label: "🏢 Manage business", action: "business" }] : [{ label: "🏢 Start a business", action: "start_business" }]),
    ...(owned.length ? [{ label: "Sell something", action: "sell" }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  openChoiceModal(`You have $${character.money.toLocaleString()}. What are you shopping for?`, topChoices, (choice) => {
    if (choice.action === "cars") openShopFor(character, CARS_FOR_SALE, "car", "🚗");
    else if (choice.action === "houses") openShopFor(character, HOUSES_FOR_SALE, "house", "🏠");
    else if (choice.action === "sell") openSellMenu(character);
    else if (choice.action === "investments") openInvestmentsMenu(character);
    else if (choice.action === "start_business") openStartBusinessMenu(character);
    else if (choice.action === "business") openManageBusinessMenu(character);
  });
}

function openInvestmentsMenu(character) {
  const held = character.investments;
  const heldLines = held.map(
    (inv) => ({
      label: `${INVESTMENT_TYPES[inv.type].label}: $${inv.value.toLocaleString()} (in $${inv.principal.toLocaleString()}) — cash out`,
      action: "cash_out",
      inv,
    })
  );

  openChoiceModal(
    `Economy: ${character.world.economy}. Your portfolio is worth $${investmentsValue(character).toLocaleString()}.`,
    [
      { label: "Buy an Index Fund ($1,000+)", action: "buy", type: "stocks" },
      { label: "Buy Cryptocurrency ($500+)", action: "buy", type: "crypto" },
      { label: "Contribute to Retirement Account ($1,000+)", action: "buy", type: "retirement" },
      ...heldLines,
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action === "buy") {
        const minBuy = choice.type === "crypto" ? 500 : 1000;
        if (character.money < minBuy) {
          logEvent(character, character.age, `${character.name} doesn't have enough to invest in ${INVESTMENT_TYPES[choice.type].label} right now.`);
          renderGame();
          return;
        }
        const amount = Math.min(character.money, minBuy);
        character.money -= amount;
        character.investments.push({ id: `${choice.type}_${Date.now()}`, type: choice.type, principal: amount, value: amount });
        logEvent(character, character.age, `${character.name} put $${amount.toLocaleString()} into ${INVESTMENT_TYPES[choice.type].label}.`);
      } else if (choice.action === "cash_out") {
        const inv = choice.inv;
        const gain = inv.value - inv.principal;
        if (gain > 0) {
          const { net, tax } = afterTax(character, gain);
          character.money += inv.principal + net;
          logEvent(character, character.age, `${character.name} cashed out ${INVESTMENT_TYPES[inv.type].label} for $${inv.value.toLocaleString()} (paid $${tax.toLocaleString()} capital gains tax).`);
        } else {
          character.money += inv.value;
          logEvent(character, character.age, `${character.name} cashed out ${INVESTMENT_TYPES[inv.type].label} for $${inv.value.toLocaleString()}.`);
        }
        character.investments = character.investments.filter((i) => i !== inv);
      } else {
        return;
      }
      renderGame();
    }
  );
}

function openStartBusinessMenu(character) {
  openChoiceModal(
    "Start a business:",
    [
      ...BUSINESS_TYPES.map((b) => ({ label: `${b.label} — $${b.startCapital.toLocaleString()} startup capital`, action: "start", biz: b })),
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "start") return;
      if (character.money < choice.biz.startCapital) {
        logEvent(character, character.age, `${character.name} can't afford to start a ${choice.biz.label} yet.`);
        renderGame();
        return;
      }
      character.money -= choice.biz.startCapital;
      character.business = { name: `${character.name}'s ${choice.biz.label}`, type: choice.biz.id, capital: choice.biz.startCapital, employees: 0, yearsRun: 0 };
      logEvent(character, character.age, `${character.name} opened ${character.business.name}!`);
      addAchievement(character, `Started a business: ${character.business.name}`);
      renderGame();
    }
  );
}

function openManageBusinessMenu(character) {
  const biz = character.business;
  openChoiceModal(
    `${biz.name} — capital: $${biz.capital.toLocaleString()}, ${biz.employees} employee(s), running ${biz.yearsRun} year(s).`,
    [
      { label: "Hire an employee", action: "hire" },
      { label: "Invest more capital ($5,000)", action: "invest" },
      { label: "Sell the business", action: "sell" },
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action === "hire") {
        const hireCost = 3000 + biz.employees * 500;
        if (character.money < hireCost) {
          logEvent(character, character.age, `${character.name} can't afford to hire right now (would cost $${hireCost.toLocaleString()}).`);
          renderGame();
          return;
        }
        character.money -= hireCost;
        biz.employees += 1;
        // Diminishing returns: each additional hire adds less scale than the last.
        biz.capital = Math.round(biz.capital + 4000 / (1 + biz.employees * 0.15));
        logEvent(character, character.age, `${character.name} hired a new employee at ${biz.name} for $${hireCost.toLocaleString()}.`);
      } else if (choice.action === "invest") {
        if (character.money < 5000) {
          logEvent(character, character.age, `${character.name} doesn't have $5,000 to reinvest right now.`);
        } else {
          character.money -= 5000;
          biz.capital += 5000;
          logEvent(character, character.age, `${character.name} reinvested $5,000 into ${biz.name}.`);
        }
      } else if (choice.action === "sell") {
        const salePrice = Math.round(biz.capital * (0.7 + Math.random() * 0.3));
        character.money += salePrice;
        logEvent(character, character.age, `${character.name} sold ${biz.name} for $${salePrice.toLocaleString()}.`);
        character.business = null;
      } else {
        return;
      }
      renderGame();
    }
  );
}
