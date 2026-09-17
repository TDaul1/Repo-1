// Generic event engine: selection, filtering, weighting, and outcome
// application. Contains zero references to any specific event — every
// piece of content lives in events.js as data, so the library can grow
// to hundreds of entries without touching this file.

function eventIsEligible(character, event) {
  if (character.age < event.minAge || character.age > event.maxAge) return false;
  if (!event.repeatable && character.triggeredEventIds.has(event.id)) return false;
  if (event.requires && !event.requires(character)) return false;
  return true;
}

function pickWeighted(candidates) {
  const total = candidates.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let r = Math.random() * total;
  for (const e of candidates) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return candidates[candidates.length - 1];
}

// Weighted sampling without replacement: pulls up to `count` distinct
// events from the eligible pool.
function selectRandomEvents(character, pool, count) {
  let candidates = pool.filter((e) => eventIsEligible(character, e));
  const picked = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const chosen = pickWeighted(candidates);
    picked.push(chosen);
    candidates = candidates.filter((e) => e !== chosen);
  }
  return picked;
}

// How many random events fire this year (0-3), weighted toward 1.
function rollEventCount() {
  const r = Math.random();
  if (r < 0.15) return 0;
  if (r < 0.6) return 1;
  if (r < 0.9) return 2;
  return 3;
}

// Follow-up events an earlier choice scheduled for this age or earlier
// (overdue follow-ups still fire). Always included, on top of the
// random roll, since they represent a promised consequence.
function takeDueScheduledEvents(character, pool) {
  const due = character.scheduledEvents.filter((s) => s.age <= character.age);
  character.scheduledEvents = character.scheduledEvents.filter((s) => s.age > character.age);
  return due
    .map((s) => pool.find((e) => e.id === s.eventId))
    .filter(Boolean);
}

function selectEventsForYear(character, pool) {
  const due = takeDueScheduledEvents(character, pool);
  const dueIds = new Set(due.map((e) => e.id));
  const remainingSlots = Math.max(0, rollEventCount() - due.length);
  const randomPicks = selectRandomEvents(
    character,
    pool.filter((e) => !dueIds.has(e.id)),
    remainingSlots
  );
  return [...due, ...randomPicks];
}

// Picks one outcome from a weighted list (chances need not sum to
// exactly 1; the last outcome is the fallback for rounding).
function rollOutcome(outcomes) {
  const r = Math.random();
  let cumulative = 0;
  for (const outcome of outcomes) {
    cumulative += outcome.chance;
    if (r <= cumulative) return outcome;
  }
  return outcomes[outcomes.length - 1];
}

function applyDeltas(character, deltas) {
  if (!deltas) return;
  const s = character.stats;
  if (deltas.health != null) s.health = clampStat(s.health + deltas.health);
  if (deltas.happiness != null) s.happiness = clampStat(s.happiness + deltas.happiness);
  if (deltas.smarts != null) s.smarts = clampStat(s.smarts + deltas.smarts);
  if (deltas.looks != null) s.looks = clampStat(s.looks + deltas.looks);
  if (deltas.mentalHealth != null) s.mentalHealth = clampStat(s.mentalHealth + deltas.mentalHealth);
  if (deltas.stress != null) s.stress = clampStat(s.stress + deltas.stress);
  if (deltas.discipline != null) s.discipline = clampStat(s.discipline + deltas.discipline);
  if (deltas.athleticism != null) s.athleticism = clampStat(s.athleticism + deltas.athleticism);
  if (deltas.socialSkill != null) s.socialSkill = clampStat(s.socialSkill + deltas.socialSkill);
  if (deltas.money != null) character.money += deltas.money;
  if (deltas.heat != null) character.criminal.heat = clampStat(character.criminal.heat + deltas.heat);
  if (deltas.reputation != null) character.reputation = clampSigned(character.reputation + deltas.reputation);
  if (deltas.fame != null) character.fame = clampStat(character.fame + deltas.fame);
  if (deltas.morality != null) character.morality = clampSigned(character.morality + deltas.morality);
}

// Applies one resolved outcome: stat deltas, flag changes, a scheduled
// follow-up if any, and logs the result. Marks the event as used so a
// non-repeatable event never fires again for this character.
function applyOutcome(character, event, outcome) {
  applyDeltas(character, outcome.deltas);
  if (outcome.flags) Object.assign(character.flags, outcome.flags);
  if (outcome.condition) {
    addCondition(character, outcome.condition.id, outcome.condition.severity);
  }
  if (outcome.achievement) {
    addAchievement(character, outcome.achievement);
  }
  if (outcome.schedule) {
    character.scheduledEvents.push({
      eventId: outcome.schedule.eventId,
      age: character.age + outcome.schedule.inYears,
    });
  }
  logEvent(character, character.age, outcome.text);
  character.triggeredEventIds.add(event.id);
}

// Flavor events with no `choices` resolve immediately: prompt + rolled
// outcome both land in the log with no player decision required.
function resolveAutoEvent(character, event) {
  logEvent(character, character.age, event.prompt);
  const outcome = rollOutcome(event.outcomes);
  applyOutcome(character, event, outcome);
}
