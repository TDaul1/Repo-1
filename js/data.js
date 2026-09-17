// Static reference data: nationalities and name pools used for character
// creation and the "randomize" button. Event data (Phase 2+) will live in
// its own file (events.js) so this file stays focused on flavor data.

const NATIONALITIES = [
  "American", "British", "Canadian", "Mexican", "Brazilian", "French",
  "German", "Italian", "Spanish", "Irish", "Swedish", "Polish",
  "Russian", "Nigerian", "Egyptian", "Kenyan", "South African",
  "Indian", "Chinese", "Japanese", "South Korean", "Vietnamese",
  "Filipino", "Australian", "New Zealander", "Turkish", "Greek",
];

const FIRST_NAMES_FEMALE = [
  "Olivia", "Emma", "Ava", "Sophia", "Isabella", "Mia", "Amara", "Zara",
  "Priya", "Wei", "Yuki", "Fatima", "Elena", "Camila", "Freya", "Nia",
  "Clara", "Sara", "Noor", "Lena", "Aisha", "Grace", "Hana", "Ingrid",
];

const FIRST_NAMES_MALE = [
  "Liam", "Noah", "Oliver", "Elijah", "James", "Lucas", "Kwame", "Arjun",
  "Wei", "Kenji", "Omar", "Diego", "Leon", "Mateo", "Finn", "Tunde",
  "Sami", "Marco", "Rahul", "Hiro", "Ivan", "Theo", "Amir", "Niko",
];

const FIRST_NAMES_NEUTRAL = [
  "Alex", "Jordan", "Taylor", "Morgan", "Riley", "Casey", "Sam", "Avery",
  "Quinn", "Rowan", "Skyler", "Reese", "Jamie", "Kai", "Dara", "Sage",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Garcia", "Müller", "Rossi", "Dubois", "Kowalski",
  "Ivanov", "Nakamura", "Kim", "Nguyen", "Okafor", "Mensah", "Patel",
  "Silva", "Andersson", "O'Brien", "Papadopoulos", "Yilmaz", "Costa",
  "Fischer", "Sato", "Wang", "Khan", "Novak", "Larsen",
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomFullName(gender) {
  let pool;
  if (gender === "Male") pool = FIRST_NAMES_MALE;
  else if (gender === "Female") pool = FIRST_NAMES_FEMALE;
  else pool = FIRST_NAMES_NEUTRAL;
  return `${randomFrom(pool)} ${randomFrom(LAST_NAMES)}`;
}
