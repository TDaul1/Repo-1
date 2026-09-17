// Save/load: 3 localStorage slots, autosaved on every render so nothing
// is lost to an accidental refresh or tab close. Wrapped in try/catch
// throughout since localStorage can throw (private browsing, quota,
// disabled storage) — the game should keep working even if saving fails.

const SAVE_SLOT_COUNT = 3;
const SAVE_KEY_PREFIX = "lifeline_save_slot_";

function saveKey(slot) {
  return SAVE_KEY_PREFIX + slot;
}

function serializeCharacter(character) {
  return JSON.stringify({
    ...character,
    triggeredEventIds: Array.from(character.triggeredEventIds),
  });
}

function deserializeCharacter(json) {
  const parsed = JSON.parse(json);
  parsed.triggeredEventIds = new Set(parsed.triggeredEventIds || []);
  return parsed;
}

function saveToSlot(slot, character) {
  try {
    localStorage.setItem(saveKey(slot), serializeCharacter(character));
  } catch (e) {
    // storage unavailable or full — the game stays playable, just unsaved
  }
}

function loadFromSlot(slot) {
  try {
    const raw = localStorage.getItem(saveKey(slot));
    if (!raw) return null;
    return deserializeCharacter(raw);
  } catch (e) {
    return null;
  }
}

function deleteSlot(slot) {
  try {
    localStorage.removeItem(saveKey(slot));
  } catch (e) {
    // ignore
  }
}

function listSaveSlots() {
  const slots = [];
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    slots.push({ slot: i, character: loadFromSlot(i) });
  }
  return slots;
}

function firstEmptySlot() {
  const slots = listSaveSlots();
  const empty = slots.find((s) => !s.character);
  return empty ? empty.slot : 1;
}
