// God Mode: a direct character editor. Not gated by any game logic —
// this is a debug/sandbox tool the player opts into via the topbar
// button, letting them reshape the current character's stats freely.

const GODMODE_FIELDS = [
  { key: "age", label: "Age", get: (c) => c.age, set: (c, v) => { c.age = Math.max(0, Math.round(v)); } },
  { key: "money", label: "Money ($)", get: (c) => c.money, set: (c, v) => { c.money = Math.round(v); } },
  { key: "health", label: "Health (0-100)", get: (c) => c.stats.health, set: (c, v) => { c.stats.health = clampStat(v); } },
  { key: "happiness", label: "Happiness (0-100)", get: (c) => c.stats.happiness, set: (c, v) => { c.stats.happiness = clampStat(v); } },
  { key: "smarts", label: "Smarts (0-100)", get: (c) => c.stats.smarts, set: (c, v) => { c.stats.smarts = clampStat(v); } },
  { key: "looks", label: "Looks (0-100)", get: (c) => c.stats.looks, set: (c, v) => { c.stats.looks = clampStat(v); } },
  { key: "mentalHealth", label: "Mental Health (0-100)", get: (c) => c.stats.mentalHealth, set: (c, v) => { c.stats.mentalHealth = clampStat(v); } },
  { key: "stress", label: "Stress (0-100)", get: (c) => c.stats.stress, set: (c, v) => { c.stats.stress = clampStat(v); } },
  { key: "discipline", label: "Discipline (0-100)", get: (c) => c.stats.discipline, set: (c, v) => { c.stats.discipline = clampStat(v); } },
  { key: "athleticism", label: "Athleticism (0-100)", get: (c) => c.stats.athleticism, set: (c, v) => { c.stats.athleticism = clampStat(v); } },
  { key: "socialSkill", label: "Social Skill (0-100)", get: (c) => c.stats.socialSkill, set: (c, v) => { c.stats.socialSkill = clampStat(v); } },
  { key: "reputation", label: "Reputation (-100..100)", get: (c) => c.reputation, set: (c, v) => { c.reputation = clampSigned(v); } },
  { key: "fame", label: "Fame (0-100)", get: (c) => c.fame, set: (c, v) => { c.fame = clampStat(v); } },
  { key: "morality", label: "Morality (-100..100)", get: (c) => c.morality, set: (c, v) => { c.morality = clampSigned(v); } },
  { key: "fertility", label: "Fertility (0-100)", get: (c) => c.fertility, set: (c, v) => { c.fertility = clampStat(v); } },
  { key: "heat", label: "Criminal Heat (0-100)", get: (c) => c.criminal.heat, set: (c, v) => { c.criminal.heat = clampStat(v); } },
];

const GODMODE_QUICK_ACTIONS = [
  {
    label: "Full Heal",
    apply: (c) => {
      c.stats.health = 100;
      c.stats.mentalHealth = 100;
      c.stats.stress = 0;
    },
  },
  {
    label: "Cure All Conditions",
    apply: (c) => { c.conditions = []; },
  },
  {
    label: "Add $1,000,000",
    apply: (c) => { c.money += 1000000; },
  },
  {
    label: "Wipe Criminal Record",
    apply: (c) => {
      c.flags.hasRecord = false;
      c.criminal.heat = 0;
      c.criminal.timesArrested = 0;
      c.jail.yearsLeft = 0;
      c.jail.isFugitive = false;
    },
  },
  {
    label: "Max All Stats",
    apply: (c) => {
      for (const k of Object.keys(c.stats)) c.stats[k] = 100;
      c.fame = 100;
      c.reputation = 100;
    },
  },
  {
    label: "Instant Death",
    apply: (c) => { c.stats.health = 0; c._godKill = true; },
  },
];

function openGodMode(character) {
  if (!character) return;

  const fieldsContainer = document.getElementById("godmode-fields");
  fieldsContainer.innerHTML = "";
  for (const f of GODMODE_FIELDS) {
    const row = document.createElement("label");
    row.className = "godmode-row";
    const span = document.createElement("span");
    span.textContent = f.label;
    const input = document.createElement("input");
    input.type = "number";
    input.id = `godmode-input-${f.key}`;
    input.value = f.get(character);
    row.appendChild(span);
    row.appendChild(input);
    fieldsContainer.appendChild(row);
  }

  const quickContainer = document.getElementById("godmode-quick");
  quickContainer.innerHTML = "";
  for (const action of GODMODE_QUICK_ACTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary small";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      action.apply(character);
      openGodMode(character); // refresh the input values to reflect the change
      renderGame();
      if (character._godKill) {
        character._godKill = false;
        closeGodMode();
        killCharacter();
      }
    });
    quickContainer.appendChild(btn);
  }

  document.getElementById("godmode-modal").classList.remove("hidden");
}

function applyGodMode(character) {
  if (!character) return;
  for (const f of GODMODE_FIELDS) {
    const input = document.getElementById(`godmode-input-${f.key}`);
    if (!input) continue;
    const v = parseFloat(input.value);
    if (!Number.isNaN(v)) f.set(character, v);
  }
  logEvent(character, character.age, `Reality bends around ${character.name}. (God Mode)`);
  renderGame();
  closeGodMode();
}

function closeGodMode() {
  document.getElementById("godmode-modal").classList.add("hidden");
}
