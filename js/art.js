/* AI TYCOON — procedural art: AI avatar markup, community/rival crests,
   and a small hand-drawn icon set. Pure functions returning HTML strings,
   no DOM access, so this can be shared between engine tests and the UI. */

const Art = {};

/* ---------------------------------------------------------------------
   Deterministic PRNG so every community/rival always renders the same
   "seal" art across sessions (seeded by its id).
--------------------------------------------------------------------- */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

Art.PALETTES = [
  { bg: "#1c2740", ring: "#4fd1c5", accent: "#4fd1c5", accent2: "#2f8f86", sun: "#f5e6a8" },
  { bg: "#2a1f3d", ring: "#c792ea", accent: "#c792ea", accent2: "#8a5fc4", sun: "#f5e6a8" },
  { bg: "#1f2e22", ring: "#7ed957", accent: "#7ed957", accent2: "#4a9e3a", sun: "#f5e6a8" },
  { bg: "#3a2020", ring: "#ff8a65", accent: "#ff8a65", accent2: "#c65a3d", sun: "#f5e6a8" },
  { bg: "#20303a", ring: "#5ec8ea", accent: "#5ec8ea", accent2: "#3a8bab", sun: "#f5e6a8" },
  { bg: "#332616", ring: "#f5b942", accent: "#f5b942", accent2: "#c78f2b", sun: "#f5e6a8" },
  { bg: "#2c1f2e", ring: "#ff6f9c", accent: "#ff6f9c", accent2: "#c24a72", sun: "#f5e6a8" },
  { bg: "#1e2b3d", ring: "#7c9eff", accent: "#7c9eff", accent2: "#5170c4", sun: "#f5e6a8" }
];

/* ---------------------------------------------------------------------
   Community "town seal" — a little skyline inside a crest ring.
--------------------------------------------------------------------- */
Art.communityCrest = function (id, size) {
  const rnd = mulberry32(hashStr(id));
  const p = Art.PALETTES[Math.floor(rnd() * Art.PALETTES.length)];
  const buildings = 4 + Math.floor(rnd() * 3);
  const barWidth = 84 / buildings;
  let bars = "";
  for (let i = 0; i < buildings; i++) {
    const h = 22 + rnd() * 42;
    const x = 8 + i * barWidth + barWidth * 0.12;
    const w = barWidth * 0.76;
    const fill = i % 2 === 0 ? p.accent : p.accent2;
    bars += `<rect x="${x.toFixed(1)}" y="${(88 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.4" fill="${fill}" />`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="crest-svg" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="${p.bg}" stroke="${p.ring}" stroke-width="3"/>
    <circle cx="50" cy="27" r="8" fill="${p.sun}" opacity="0.85"/>
    ${bars}
    <rect x="4" y="88" width="92" height="7" fill="${p.ring}" opacity="0.9"/>
  </svg>`;
};

/* ---------------------------------------------------------------------
   Rival company "corporate mark" — abstract logo inside a crest ring,
   with the company's initial stamped on top.
--------------------------------------------------------------------- */
Art.rivalCrest = function (id, size, name) {
  const rnd = mulberry32(hashStr(id));
  const p = Art.PALETTES[Math.floor(rnd() * Art.PALETTES.length)];
  const shape = Math.floor(rnd() * 3);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  let mark;
  if (shape === 0) {
    mark = `<polygon points="50,16 84,76 16,76" fill="${p.accent}" opacity="0.92"/>
      <circle cx="50" cy="58" r="16" fill="${p.accent2}" opacity="0.85"/>`;
  } else if (shape === 1) {
    mark = `<rect x="26" y="26" width="48" height="48" rx="10" fill="${p.accent}" transform="rotate(45 50 50)" opacity="0.92"/>`;
  } else {
    mark = `<circle cx="40" cy="48" r="24" fill="${p.accent}" opacity="0.85"/>
      <circle cx="62" cy="48" r="24" fill="${p.accent2}" opacity="0.7"/>`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="crest-svg" aria-hidden="true">
    <circle cx="50" cy="50" r="46" fill="${p.bg}" stroke="${p.ring}" stroke-width="3"/>
    ${mark}
    <text x="50" y="59" text-anchor="middle" font-size="26" font-weight="700" fill="${p.bg}" font-family="Consolas, monospace">${initial}</text>
  </svg>`;
};

/* ---------------------------------------------------------------------
   AI avatar — a mood-reactive glowing orb. Calm and teal when aligned,
   amber and restless in the middle, red and glitchy near rogue.
--------------------------------------------------------------------- */
Art.aiMood = function (alignment) {
  if (alignment >= 60) return "calm";
  if (alignment >= 30) return "wary";
  return "volatile";
};

Art.aiAvatar = function (alignment, size, opts) {
  opts = opts || {};
  const mood = Art.aiMood(alignment);
  const speaking = opts.speaking ? " speaking" : "";
  return `<div class="ai-avatar mood-${mood}${speaking}" style="--size:${size}px" title="Alignment: ${Math.round(alignment)}">
    <div class="ai-avatar-glow"></div>
    <div class="ai-avatar-core">
      <div class="ai-avatar-eye"></div>
    </div>
  </div>`;
};

/* ---------------------------------------------------------------------
   Small line-icon set. Each returns an inline SVG string, 24x24 view.
--------------------------------------------------------------------- */
Art.ICON_PATHS = {
  money: '<path d="M3 7h18v10H3z"/><circle cx="12" cy="12" r="3"/><path d="M3 9c1.5 0 2-.8 2-2M21 9c-1.5 0-2-.8-2-2M3 15c1.5 0 2 .8 2 2M21 15c-1.5 0-2 .8-2 2"/>',
  water: '<path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/>',
  fire: '<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-1-2-1-3 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 3-6 5-10z"/>',
  megaphone: '<path d="M3 10v4h4l6 4V6l-6 4H3z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  gavel: '<path d="M13 3l4 4-3 3-4-4z"/><path d="M3 21l7-7"/><path d="M9 11l4 4-2 2-4-4z"/>',
  chartUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  chartDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  brain: '<path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3M9 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3M15 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  handshake: '<path d="M2 12l4-4 3 2 3-2 3 2 2-2 5 4"/><path d="M9 10l4 4M13 10l-3 4"/>',
  building: '<rect x="4" y="3" width="9" height="18"/><rect x="13" y="8" width="7" height="13"/><path d="M7 7h1M7 11h1M7 15h1M16 12h1M16 16h1"/>',
  newspaper: '<rect x="3" y="4" width="14" height="16" rx="1"/><path d="M17 8h4v10a2 2 0 0 1-2 2h-2"/><path d="M6 8h8M6 11h8M6 14h5"/>',
  warning: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 3h6"/><circle cx="9" cy="13" r="1.4"/><circle cx="15" cy="13" r="1.4"/><path d="M9 17h6"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  mask: '<path d="M4 8c2-1 5-2 8-2s6 1 8 2c0 6-3 11-8 12-5-1-8-6-8-12z"/><circle cx="9" cy="11" r="1.2"/><circle cx="15" cy="11" r="1.2"/>',
  scale: '<path d="M12 3v18M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  crown: '<path d="M4 18h16l-1-9-4 3-3-6-3 6-4-3z"/>'
};

Art.icon = function (name, size, extraClass) {
  const path = Art.ICON_PATHS[name] || Art.ICON_PATHS.newspaper;
  return `<svg class="icon ${extraClass || ""}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Art;
}
