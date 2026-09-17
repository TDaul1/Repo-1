// App controller: screen switching, character creation, the age-up loop,
// and rendering. Phase 1 scope: no event engine yet — aging just applies
// stat drift and rolls the death curve.

let character = null;

const els = {
  createScreen: document.getElementById("create-screen"),
  gameScreen: document.getElementById("game-screen"),
  deathScreen: document.getElementById("death-screen"),

  nameInput: document.getElementById("name-input"),
  randomizeNameBtn: document.getElementById("randomize-name-btn"),
  nationalitySelect: document.getElementById("nationality-select"),
  genderSelect: document.getElementById("gender-select"),
  startBtn: document.getElementById("start-btn"),

  portrait: document.getElementById("portrait"),
  charName: document.getElementById("char-name"),
  charMeta: document.getElementById("char-meta"),
  barHealth: document.getElementById("bar-health"),
  barHappiness: document.getElementById("bar-happiness"),
  barSmarts: document.getElementById("bar-smarts"),
  barLooks: document.getElementById("bar-looks"),
  valHealth: document.getElementById("val-health"),
  valHappiness: document.getElementById("val-happiness"),
  valSmarts: document.getElementById("val-smarts"),
  valLooks: document.getElementById("val-looks"),
  valMoney: document.getElementById("val-money"),
  eventLog: document.getElementById("event-log"),
  ageUpBtn: document.getElementById("age-up-btn"),
  newLifeTopbarBtn: document.getElementById("new-life-topbar-btn"),

  deathTitle: document.getElementById("death-title"),
  deathCause: document.getElementById("death-cause"),
  deathSummary: document.getElementById("death-summary"),
  deathEpitaph: document.getElementById("death-epitaph"),
  newLifeBtn: document.getElementById("new-life-btn"),
};

function showScreen(name) {
  els.createScreen.classList.toggle("hidden", name !== "create");
  els.gameScreen.classList.toggle("hidden", name !== "game");
  els.deathScreen.classList.toggle("hidden", name !== "death");
}

function populateNationalitySelect() {
  els.nationalitySelect.innerHTML = "";
  for (const nat of NATIONALITIES) {
    const opt = document.createElement("option");
    opt.value = nat;
    opt.textContent = nat;
    els.nationalitySelect.appendChild(opt);
  }
  els.nationalitySelect.value = randomFrom(NATIONALITIES);
}

function portraitFor(character) {
  if (character.gender === "Male") return character.age < 13 ? "👦" : character.age < 20 ? "🧑" : "👨";
  if (character.gender === "Female") return character.age < 13 ? "👧" : character.age < 20 ? "🧑" : "👩";
  return character.age < 13 ? "🧒" : "🧑";
}

function renderGame() {
  const s = character.stats;

  els.portrait.textContent = portraitFor(character);
  els.charName.textContent = character.name;
  els.charMeta.textContent = `Age ${character.age} · ${character.gender} · ${character.nationality}`;

  els.barHealth.style.width = s.health + "%";
  els.barHappiness.style.width = s.happiness + "%";
  els.barSmarts.style.width = s.smarts + "%";
  els.barLooks.style.width = s.looks + "%";
  els.valHealth.textContent = s.health;
  els.valHappiness.textContent = s.happiness;
  els.valSmarts.textContent = s.smarts;
  els.valLooks.textContent = s.looks;
  els.valMoney.textContent = "$" + character.money.toLocaleString();

  renderLog();
}

let renderedLogCount = 0;

function renderLog() {
  // If this is a fresh/shorter log (new life), rebuild from scratch.
  // Otherwise only append the new entries so already-rendered rows don't
  // get destroyed and re-animated on every age-up.
  if (character.log.length < renderedLogCount) {
    els.eventLog.innerHTML = "";
    renderedLogCount = 0;
  }

  // column-reverse layout means we append in chronological order and the
  // newest entry visually lands at the top.
  for (let i = renderedLogCount; i < character.log.length; i++) {
    const entry = character.log[i];
    const row = document.createElement("div");
    row.className = "log-entry" + (entry.kind === "death" ? " death" : "");

    const ageEl = document.createElement("div");
    ageEl.className = "log-age";
    ageEl.textContent = entry.age === 0 ? "Birth" : `Age ${entry.age}`;

    const textEl = document.createElement("div");
    textEl.className = "log-text";
    textEl.textContent = entry.text;

    row.appendChild(ageEl);
    row.appendChild(textEl);
    els.eventLog.appendChild(row);
  }
  renderedLogCount = character.log.length;
}

function startNewLife() {
  const name = els.nameInput.value.trim() || randomFullName(els.genderSelect.value);
  character = createCharacter({
    name,
    nationality: els.nationalitySelect.value,
    gender: els.genderSelect.value,
  });

  logEvent(character, 0, `${character.name} was born in a ${character.nationality} family.`);
  renderedLogCount = 0;

  showScreen("game");
  renderGame();
}

function ageUp() {
  if (!character || !character.alive) return;

  character.age += 1;
  applyAgingDrift(character);

  const risk = deathChance(character.age, character.stats.health);
  if (Math.random() < risk) {
    killCharacter();
    return;
  }

  logEvent(character, character.age, `${character.name} turned ${character.age}.`);
  renderGame();
}

function killCharacter() {
  character.alive = false;
  const cause = causeOfDeath(character.age, character.stats.health);
  logEvent(character, character.age, `${character.name} died at age ${character.age} from ${cause}.`, "death");
  renderGame();
  showDeathScreen(cause);
}

function showDeathScreen(cause) {
  els.deathTitle.textContent = `${character.name} has died.`;
  els.deathCause.textContent = `Cause of death: ${cause}, at age ${character.age}.`;

  els.deathSummary.innerHTML = `
    <div class="row"><span>Age at death</span><b>${character.age}</b></div>
    <div class="row"><span>Nationality</span><b>${character.nationality}</b></div>
    <div class="row"><span>Net worth</span><b>$${character.money.toLocaleString()}</b></div>
    <div class="row"><span>Final health</span><b>${character.stats.health}</b></div>
    <div class="row"><span>Final happiness</span><b>${character.stats.happiness}</b></div>
  `;
  els.deathEpitaph.textContent = epitaphFor(character);

  showScreen("death");
}

function resetToCreateScreen() {
  character = null;
  els.nameInput.value = "";
  populateNationalitySelect();
  showScreen("create");
}

// ---------- event wiring ----------
els.randomizeNameBtn.addEventListener("click", () => {
  els.nameInput.value = randomFullName(els.genderSelect.value);
});
els.startBtn.addEventListener("click", startNewLife);
els.ageUpBtn.addEventListener("click", ageUp);
els.newLifeBtn.addEventListener("click", resetToCreateScreen);
els.newLifeTopbarBtn.addEventListener("click", () => {
  if (confirm("Start a new life? Your current life will be lost.")) {
    resetToCreateScreen();
  }
});

// ---------- init ----------
populateNationalitySelect();
showScreen("create");
