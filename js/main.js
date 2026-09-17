// App controller: screen switching, character creation, the age-up loop,
// and rendering. Age-up runs the event engine (engine.js/events.js):
// 0-3 events fire per year, interactive ones are presented as a choice
// modal one at a time before the year finalizes and the death roll runs.

let character = null;
let eventQueue = [];
let currentSaveSlot = 1;

const els = {
  createScreen: document.getElementById("create-screen"),
  gameScreen: document.getElementById("game-screen"),
  deathScreen: document.getElementById("death-screen"),

  saveSlotsPanel: document.getElementById("save-slots-panel"),
  saveSlotSelect: document.getElementById("save-slot-select"),
  nameInput: document.getElementById("name-input"),
  randomizeNameBtn: document.getElementById("randomize-name-btn"),
  nationalitySelect: document.getElementById("nationality-select"),
  genderSelect: document.getElementById("gender-select"),
  startBtn: document.getElementById("start-btn"),

  portrait: document.getElementById("portrait"),
  charName: document.getElementById("char-name"),
  charMeta: document.getElementById("char-meta"),
  statusBadges: document.getElementById("status-badges"),
  extendedStatsCard: document.getElementById("extended-stats-card"),
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
  healthActivityBtn: document.getElementById("activity-health-btn"),
  schoolActivityBtn: document.getElementById("activity-school-btn"),
  jobActivityBtn: document.getElementById("activity-job-btn"),
  assetsActivityBtn: document.getElementById("activity-assets-btn"),
  relationshipsActivityBtn: document.getElementById("activity-relationships-btn"),
  crimeActivityBtn: document.getElementById("activity-crime-btn"),
  hobbiesActivityBtn: document.getElementById("activity-hobbies-btn"),
  godmodeTopbarBtn: document.getElementById("godmode-topbar-btn"),
  godmodeApplyBtn: document.getElementById("godmode-apply-btn"),
  godmodeCloseBtn: document.getElementById("godmode-close-btn"),

  eventModal: document.getElementById("event-modal"),
  eventModalPrompt: document.getElementById("event-modal-prompt"),
  eventModalChoices: document.getElementById("event-modal-choices"),

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

function renderSaveSlotsPanel() {
  const slots = listSaveSlots();

  els.saveSlotsPanel.innerHTML = "";
  for (const { slot, character: saved } of slots) {
    const row = document.createElement("div");
    row.className = "save-slot-row";

    const info = document.createElement("div");
    info.className = "save-slot-info";
    if (saved) {
      const statusBit = saved.alive ? `age ${saved.age}` : `deceased at ${saved.age}`;
      info.innerHTML = `Slot ${slot}: <b>${saved.name}</b> — ${statusBit}`;
    } else {
      info.textContent = `Slot ${slot}: empty`;
    }
    row.appendChild(info);

    const buttons = document.createElement("div");
    buttons.className = "save-slot-buttons";
    if (saved) {
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn-secondary";
      loadBtn.textContent = "Load";
      loadBtn.addEventListener("click", () => loadGame(slot));
      buttons.appendChild(loadBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-secondary";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Delete the save in Slot ${slot}? This can't be undone.`)) {
          deleteSlot(slot);
          renderSaveSlotsPanel();
        }
      });
      buttons.appendChild(deleteBtn);
    }
    row.appendChild(buttons);
    els.saveSlotsPanel.appendChild(row);
  }

  els.saveSlotSelect.innerHTML = "";
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    const occupied = slots.find((s) => s.slot === i)?.character;
    opt.textContent = occupied ? `Slot ${i} (overwrite ${occupied.name})` : `Slot ${i} (empty)`;
    els.saveSlotSelect.appendChild(opt);
  }
  els.saveSlotSelect.value = firstEmptySlot();
}

function loadGame(slot) {
  const saved = loadFromSlot(slot);
  if (!saved) return;
  character = saved;
  currentSaveSlot = slot;
  renderedLogCount = 0;

  if (character.alive) {
    showScreen("game");
    renderGame();
  } else {
    renderGame();
    showDeathScreen(character.deathCause || "unknown causes");
  }
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
  const jobBit = character.career.job ? ` · ${character.career.job.title}` : "";
  const jailBit = character.jail.yearsLeft > 0 ? ` · 🔒 In Prison` : character.jail.isFugitive ? ` · 🏃 Fugitive` : "";
  els.charMeta.textContent = `Age ${character.age} · ${character.gender} · ${character.nationality}${jobBit}${jailBit}`;

  els.barHealth.style.width = s.health + "%";
  els.barHappiness.style.width = s.happiness + "%";
  els.barSmarts.style.width = s.smarts + "%";
  els.barLooks.style.width = s.looks + "%";
  els.valHealth.textContent = s.health;
  els.valHappiness.textContent = s.happiness;
  els.valSmarts.textContent = s.smarts;
  els.valLooks.textContent = s.looks;
  els.valMoney.textContent = "$" + character.money.toLocaleString();

  renderStatusBadges();
  renderExtendedStats();
  renderLog();

  saveToSlot(currentSaveSlot, character);
}

function renderStatusBadges() {
  const badges = [];
  if (character.married) badges.push("💍 Married");
  if (character.pregnant) badges.push("🤰 Expecting");
  if (character.business) badges.push(`🏢 ${character.business.name}`);
  if (character.criminal.gang) badges.push(`🕴️ ${character.criminal.gang.rank} — ${character.criminal.gang.name}`);
  if (character.politics && character.politics.currentOffice) {
    const office = POLITICAL_OFFICES.find((o) => o.id === character.politics.currentOffice);
    if (office) badges.push(`🗳️ ${office.title}`);
  }
  if (character.flags.hasRecord) badges.push("📋 Criminal Record");
  for (const t of character.talents) badges.push(`⭐ ${t}`);
  if (character.conditions.length) {
    badges.push(...character.conditions.map((c) => `🩺 ${c.name} (${c.severity}%)`));
  }
  els.statusBadges.innerHTML = "";
  for (const b of badges) {
    const span = document.createElement("span");
    span.className = "status-badge";
    span.textContent = b;
    els.statusBadges.appendChild(span);
  }
}

function renderExtendedStats() {
  const s = character.stats;
  const rows = [
    ["🧘 Mental Health", s.mentalHealth],
    ["😰 Stress", s.stress],
    ["🎯 Discipline", s.discipline],
    ["🏃 Athleticism", s.athleticism],
    ["🗣️ Social", s.socialSkill],
    ["🏛️ Reputation", character.reputation],
    ["⚖️ Morality", character.morality],
    ["🌟 Fame", character.fame],
  ];
  els.extendedStatsCard.innerHTML = rows
    .map(([label, val]) => `<div class="ext-row"><span>${label}</span><b>${val}</b></div>`)
    .join("");
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

  currentSaveSlot = parseInt(els.saveSlotSelect.value, 10) || 1;

  logEvent(character, 0, `${character.name} was born in a ${character.nationality} family.`);
  seedFamily(character);
  renderedLogCount = 0;

  showScreen("game");
  renderGame();
}

function ageUp() {
  if (!character || !character.alive) return;

  character.age += 1;
  applyAgingDrift(character);

  // Universal systems that keep running no matter what's happening to
  // the player this year (locked up, on the run, or free).
  tickConditions(character);
  tickFamily(character);
  tickEconomy(character);
  tickInvestments(character);
  tickBusiness(character);

  if (character.jail.yearsLeft > 0) {
    character.jail.yearsLeft -= 1;
    character.jail.behaviorScore = clampStat(character.jail.behaviorScore + randInt(-2, 2));
    character.stats.happiness = clampStat(character.stats.happiness - randInt(2, 6));
    character.stats.health = clampStat(character.stats.health - randInt(0, 3));
    if (character.jail.yearsLeft > 0) {
      logEvent(character, character.age, `${character.name} spent another year at ${character.jail.prisonName || "the state pen"}. ${character.jail.yearsLeft} year(s) left.`);
    } else {
      logEvent(character, character.age, `${character.name} served out the remainder of the sentence and was released.`);
      character.jail.gangAffiliated = false;
      character.jail.prisonName = null;
      character.jail.crimeLabel = null;
    }
    renderGame();
    finalizeYear();
    return;
  }

  if (character.jail.isFugitive) {
    runFugitiveYear(character);
    // A fugitive still lives a (tense) year — random events still fire —
    // but can't hold a job or advance school while on the run.
    runYearEvents();
    return;
  }

  advanceEducation(character);
  runCareerYear(character);
  runPoliticsYear(character);
  runYearEvents();
}

// Shared tail for a "normal" year: rolls the event pool, resolves any
// flavor (no-choice) events immediately, and queues interactive ones as
// choice modals before finalizing (death roll).
function runYearEvents() {
  const events = selectEventsForYear(character, EVENTS);
  const interactive = events.filter((e) => e.choices && e.choices.length);
  const auto = events.filter((e) => !e.choices || !e.choices.length);

  for (const event of auto) resolveAutoEvent(character, event);

  if (interactive.length === 0) {
    if (auto.length === 0) {
      logEvent(character, character.age, `${character.name} turned ${character.age}.`);
    }
    renderGame();
    finalizeYear();
  } else {
    eventQueue = interactive;
    els.ageUpBtn.disabled = true;
    renderGame();
    advanceEventQueue();
  }
}

function advanceEventQueue() {
  if (eventQueue.length === 0) {
    els.ageUpBtn.disabled = false;
    finalizeYear();
    return;
  }
  const event = eventQueue.shift();
  openChoiceModal(event.prompt, event.choices, (choice) => {
    const outcome = rollOutcome(choice.outcomes);
    applyOutcome(character, event, outcome);
    renderGame();
    advanceEventQueue();
  });
}

// Resolved once the year's events (if any) are all settled: rolls the
// death check against the character's final stats for this age.
function finalizeYear() {
  if (!character.alive) return;
  const risk = deathChance(character.age, character.stats.health, character);
  if (Math.random() < risk) {
    killCharacter();
  }
}

// Generic modal: shared by random life events and player-initiated
// activities. `choices` is [{ label, ...anything }]; the full choice
// object is handed back to onChoose so callers can carry their own data
// (outcomes for events, an action tag for activities).
function openChoiceModal(prompt, choices, onChoose) {
  els.eventModalPrompt.textContent = prompt;
  els.eventModalChoices.innerHTML = "";
  for (const choice of choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      closeChoiceModal();
      onChoose(choice);
    });
    els.eventModalChoices.appendChild(btn);
  }
  els.eventModal.classList.remove("hidden");
}

function closeChoiceModal() {
  els.eventModal.classList.add("hidden");
}

function killCharacter() {
  character.alive = false;
  const cause = causeOfDeath(character.age, character.stats.health, character);
  character.deathCause = cause;
  logEvent(character, character.age, `${character.name} died at age ${character.age} from ${cause}.`, "death");
  renderGame();
  showDeathScreen(cause);
}

function showDeathScreen(cause) {
  els.deathTitle.textContent = `${character.name} has died.`;
  els.deathCause.textContent = `Cause of death: ${cause}, at age ${character.age}.`;

  const careerLine = character.career.job ? character.career.job.title : "Never held a job";
  const eduLabels = {
    none: "No schooling", elementary: "Elementary school", middle: "Middle school",
    high: "High school (incomplete)", dropout: "High school dropout", high_grad: "High school graduate",
    college: "College (incomplete)", dropout_college: "College dropout", college_grad: "College graduate",
    grad: "Grad school (incomplete)", grad_grad: "Graduate degree",
  };
  const eduLine = eduLabels[character.education.stage] || character.education.stage;

  const crim = character.criminal;
  let criminalRow = "";
  if (crim.timesArrested > 0 || crim.gang) {
    const bits = [];
    if (crim.timesArrested > 0) bits.push(`arrested ${crim.timesArrested}x`);
    if (crim.timesEscaped > 0) bits.push(`escaped custody ${crim.timesEscaped}x`);
    if (crim.gang) bits.push(`${crim.gang.rank} in ${crim.gang.name}`);
    if (character.jail.isFugitive) bits.push("died a fugitive");
    else if (character.jail.yearsLeft > 0) bits.push(`died mid-sentence at ${character.jail.prisonName}`);
    criminalRow = `<div class="row"><span>Criminal record</span><b>${bits.join(", ")}</b></div>`;
  }

  const survivedBy = character.relationships.filter((r) => r.alive && (r.type === "Spouse" || r.type === "Child"));
  const familyRow = survivedBy.length
    ? `<div class="row"><span>Survived by</span><b>${survivedBy.map((r) => `${r.name} (${r.type})`).join(", ")}</b></div>`
    : "";

  const talentsRow = character.talents.length
    ? `<div class="row"><span>Talents</span><b>${character.talents.join(", ")}</b></div>`
    : "";

  const fameRow = character.fame >= 20 ? `<div class="row"><span>Fame</span><b>${character.fame}/100</b></div>` : "";

  const achievementsBlock = character.achievements.length
    ? `<div class="achievements-block"><div class="achievements-title">Life Achievements</div>${character.achievements
        .map((a) => `<div class="achievement-item">🏆 ${a}</div>`)
        .join("")}</div>`
    : "";

  els.deathSummary.innerHTML = `
    <div class="row"><span>Age at death</span><b>${character.age}</b></div>
    <div class="row"><span>Nationality</span><b>${character.nationality}</b></div>
    <div class="row"><span>Career</span><b>${careerLine}</b></div>
    <div class="row"><span>Education</span><b>${eduLine}</b></div>
    <div class="row"><span>Net worth</span><b>$${netWorth(character).toLocaleString()}</b></div>
    <div class="row"><span>Final health</span><b>${character.stats.health}</b></div>
    <div class="row"><span>Final happiness</span><b>${character.stats.happiness}</b></div>
    ${familyRow}
    ${talentsRow}
    ${fameRow}
    ${criminalRow}
    ${achievementsBlock}
  `;
  els.deathEpitaph.textContent = epitaphFor(character);

  showScreen("death");
}

function resetToCreateScreen() {
  character = null;
  els.nameInput.value = "";
  populateNationalitySelect();
  renderSaveSlotsPanel();
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
els.healthActivityBtn.addEventListener("click", () => openHealthActivity(character));
els.schoolActivityBtn.addEventListener("click", () => openSchoolActivity(character));
els.jobActivityBtn.addEventListener("click", () => openJobActivity(character));
els.assetsActivityBtn.addEventListener("click", () => openAssetsActivity(character));
els.relationshipsActivityBtn.addEventListener("click", () => openRelationshipsActivity(character));
els.crimeActivityBtn.addEventListener("click", () => openCrimeActivity(character));
els.hobbiesActivityBtn.addEventListener("click", () => openHobbiesActivity(character));
els.godmodeTopbarBtn.addEventListener("click", () => openGodMode(character));
els.godmodeApplyBtn.addEventListener("click", () => applyGodMode(character));
els.godmodeCloseBtn.addEventListener("click", closeGodMode);

// ---------- init ----------
populateNationalitySelect();
renderSaveSlotsPanel();
showScreen("create");
