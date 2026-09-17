// Assets: buy/sell cars and houses. Deliberately simple valuation model
// (fixed happiness/looks bump on purchase, resale at a flat depreciation)
// — enough to make money meaningful without a full market simulation.

const CARS_FOR_SALE = [
  { id: "beater", name: "Rusty Beater Sedan", price: 1500, happiness: 2, looks: 0 },
  { id: "hatchback", name: "Reliable Hatchback", price: 8000, happiness: 4, looks: 1 },
  { id: "pickup", name: "Pickup Truck", price: 22000, happiness: 5, looks: 1 },
  { id: "sports_car", name: "Sports Car", price: 55000, happiness: 10, looks: 5 },
  { id: "luxury_sedan", name: "Luxury Sedan", price: 85000, happiness: 8, looks: 6 },
  { id: "clown_car", name: "Literal Clown Car", price: 900, happiness: 12, looks: -8 },
  { id: "hearse", name: "Repurposed Hearse", price: 4000, happiness: 3, looks: -3 },
];

const HOUSES_FOR_SALE = [
  { id: "studio", name: "Cramped Studio Apartment", price: 60000, happiness: 4, looks: 0 },
  { id: "starter_home", name: "Starter Home", price: 180000, happiness: 10, looks: 1 },
  { id: "family_home", name: "Family Home", price: 380000, happiness: 15, looks: 2 },
  { id: "mansion", name: "Sprawling Mansion", price: 1200000, happiness: 25, looks: 6 },
  { id: "houseboat", name: "Slightly Leaky Houseboat", price: 45000, happiness: 8, looks: -1 },
  { id: "treehouse", name: "Adult-Sized Treehouse", price: 30000, happiness: 14, looks: -2 },
];

function openAssetsActivity(character) {
  if (!character || !character.alive) return;

  const owned = character.assets;
  const topChoices = [
    { label: "Browse cars", action: "cars" },
    { label: "Browse houses", action: "houses" },
    ...(owned.length ? [{ label: "Sell something", action: "sell" }] : []),
    { label: "Never mind", action: "cancel" },
  ];

  openChoiceModal(`You have $${character.money.toLocaleString()}. What are you shopping for?`, topChoices, (choice) => {
    if (choice.action === "cars") openShopFor(character, CARS_FOR_SALE, "car", "🚗");
    else if (choice.action === "houses") openShopFor(character, HOUSES_FOR_SALE, "house", "🏠");
    else if (choice.action === "sell") openSellMenu(character);
  });
}

function openShopFor(character, catalog, kind, icon) {
  openChoiceModal(
    `Pick a ${kind === "car" ? "car" : "house"} to buy:`,
    [
      ...catalog.map((item) => ({
        label: `${item.name} — $${item.price.toLocaleString()}`,
        action: "buy",
        item,
      })),
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "buy") return;
      const item = choice.item;
      if (character.money < item.price) {
        logEvent(character, character.age, `${character.name} couldn't afford the ${item.name}. So close.`);
        renderGame();
        return;
      }
      character.money -= item.price;
      character.assets.push({ id: `${item.id}_${Date.now()}`, kind, name: item.name, value: item.price, icon });
      character.stats.happiness = clampStat(character.stats.happiness + item.happiness);
      character.stats.looks = clampStat(character.stats.looks + item.looks);
      logEvent(character, character.age, `${character.name} bought a ${item.name}!`);
      renderGame();
    }
  );
}

function openSellMenu(character) {
  openChoiceModal(
    "Sell which asset? (70% of original value)",
    [
      ...character.assets.map((a) => ({
        label: `${a.icon} ${a.name} — sell for $${Math.round(a.value * 0.7).toLocaleString()}`,
        action: "sell",
        asset: a,
      })),
      { label: "Never mind", action: "cancel" },
    ],
    (choice) => {
      if (choice.action !== "sell") return;
      const payout = Math.round(choice.asset.value * 0.7);
      character.money += payout;
      character.assets = character.assets.filter((a) => a !== choice.asset);
      logEvent(character, character.age, `${character.name} sold the ${choice.asset.name} for $${payout.toLocaleString()}.`);
      renderGame();
    }
  );
}
