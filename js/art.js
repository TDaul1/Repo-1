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

/* =======================================================================
   TECH VALLEY — the expansion map's aerial scene: a satirical, sun-bleached
   flat-illustration corridor. One static background scene plus a bespoke
   flat "campus" icon per marquee location (with its own sight gag), and a
   plain generic campus icon for the rest. Everything renders inline SVG,
   viewBox-scaled so it drops straight into the existing marker/board sizing.
======================================================================= */

Art.VALLEY_GROUND = "#f0e6cf";
Art.VALLEY_ROAD = "#c7bfa9";
Art.VALLEY_ROAD_LINE = "#f2c94c";
Art.VALLEY_LOT = "#ded4b6";
Art.VALLEY_SCENERY = "#c9bd9a";
Art.VALLEY_SCENERY2 = "#b9ad8a";

/* Generic low-poly building silhouette used both as background scenery
   and (seeded per id) as the marker icon for non-bespoke locations. */
function valleyBuildingBlock(x, y, w, h, bodyFill, roofFill) {
  return `<rect x="${x}" y="${y + h * 0.22}" width="${w}" height="${h * 0.78}" fill="${bodyFill}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h * 0.26}" fill="${roofFill}"/>`;
}

/* ---------------------------------------------------------------------
   Background scene — one static aerial "tech corridor" illustration.
   Authored at 160x100 so it can stretch edge-to-edge behind the markers
   (whose own x/y percentages are independent of this viewBox).
--------------------------------------------------------------------- */
Art.techValleyBackground = function () {
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="none" class="valley-bg-svg" aria-hidden="true">
    <rect x="0" y="0" width="160" height="100" fill="${Art.VALLEY_GROUND}"/>

    <!-- highway corridor, running the length of the valley -->
    <polygon points="0,78 160,18 160,32 0,92" fill="${Art.VALLEY_ROAD}"/>
    <polygon points="0,83 160,23 160,26 0,86" fill="${Art.VALLEY_ROAD_LINE}" opacity="0.75"/>

    <!-- ambient low-poly scenery blocks, kept clear of marker positions -->
    ${valleyBuildingBlock(6, 8, 10, 9, Art.VALLEY_SCENERY, Art.VALLEY_SCENERY2)}
    ${valleyBuildingBlock(20, 4, 7, 6, Art.VALLEY_SCENERY2, Art.VALLEY_SCENERY)}
    ${valleyBuildingBlock(118, 82, 12, 10, Art.VALLEY_SCENERY, Art.VALLEY_SCENERY2)}
    ${valleyBuildingBlock(136, 6, 9, 8, Art.VALLEY_SCENERY2, Art.VALLEY_SCENERY)}
    ${valleyBuildingBlock(74, 88, 8, 7, Art.VALLEY_SCENERY, Art.VALLEY_SCENERY2)}

    <!-- parking lot, bottom-right, well clear of any marker -->
    <g opacity="0.8">
      <rect x="128" y="60" width="26" height="16" fill="${Art.VALLEY_LOT}"/>
      <path d="M130,60 L130,76 M135,60 L135,76 M140,60 L140,76 M145,60 L145,76 M150,60 L150,76"
        stroke="#c2b592" stroke-width="0.8"/>
    </g>

    <!-- gag 1: scooter graveyard -->
    <g transform="translate(94,58)" opacity="0.9">
      <circle cx="0" cy="6" r="2.1" fill="#3a3f45"/>
      <circle cx="4" cy="7" r="2.1" fill="#3a3f45"/>
      <circle cx="8" cy="5.5" r="2.1" fill="#3a3f45"/>
      <path d="M0,6 L2,0 L5,0 M4,7 L6,1 L9,1 M8,5.5 L10,-0.5 L13,-0.5" stroke="#7ed957" stroke-width="0.9" fill="none"/>
    </g>

    <!-- gag 2: a building rebranding itself mid-frame -->
    <g transform="translate(46,6)">
      ${valleyBuildingBlock(0, 4, 12, 9, "#cfc4a2", "#a99c78")}
      <rect x="2" y="7" width="8" height="2.6" fill="#e7e0c8"/>
      <rect x="1.5" y="10.5" width="9" height="2.2" fill="#f2c94c"/>
      <line x1="12" y1="13" x2="15" y2="1" stroke="#8a7f63" stroke-width="0.7"/>
      <circle cx="15" cy="1" r="1.1" fill="#8a7f63"/>
    </g>

    <!-- gag 3: a founder biking past his own billboard -->
    <g transform="translate(100,10)">
      <rect x="0" y="0" width="10" height="14" fill="#d9463f"/>
      <rect x="1" y="1" width="8" height="6" fill="#f5e6c8"/>
      <circle cx="5" cy="3.6" r="1.6" fill="#e0a97a"/>
      <g transform="translate(-2,16) scale(0.55)">
        <circle cx="0" cy="6" r="3" fill="none" stroke="#2b2f36" stroke-width="1"/>
        <circle cx="9" cy="6" r="3" fill="none" stroke="#2b2f36" stroke-width="1"/>
        <path d="M0,6 L4,2 L9,6 M4,2 L4,6" stroke="#2b2f36" stroke-width="1" fill="none"/>
        <circle cx="4" cy="1" r="1.1" fill="#e0a97a"/>
      </g>
    </g>
  </svg>`;
};

/* ---------------------------------------------------------------------
   Per-marker state overlays (baked into the icon, not a CSS ring), plus
   the shared wrapper every campus icon (bespoke or generic) is run through.
--------------------------------------------------------------------- */
function campusStateOverlay(markerState) {
  markerState = markerState || {};
  let pre = "", post = "";
  if (markerState.selected) {
    pre += `<ellipse cx="50" cy="90" rx="34" ry="7" fill="#2b2f36" opacity="0.18"/>`;
  }
  if (markerState.bribed) {
    post += `<rect x="14" y="72" width="72" height="7" fill="#d9463f"/>
      <polygon points="50,72 46,79 50,76.5 54,79" fill="#f2c94c"/>`;
  }
  if (markerState.built) {
    post += `<line x1="82" y1="30" x2="82" y2="10" stroke="#5b6068" stroke-width="2"/>
      <polygon points="82,10 82,18 94,14" fill="#7ed957"/>`;
  }
  return { pre: pre, post: post };
}

function campusIcon(size, innerSvg, markerState) {
  const overlay = campusStateOverlay(markerState);
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="campus-svg" aria-hidden="true">
    ${overlay.pre}
    ${innerSvg}
    ${overlay.post}
  </svg>`;
}

/* ---------------------------------------------------------------------
   Bespoke campus icons — one hand-drawn gag per marquee location.
--------------------------------------------------------------------- */
Art.CAMPUS_BUILDERS = {
  gulch: function () { // PannerAI — rusted mining rig, crooked banner
    return `${valleyBuildingBlock(20, 34, 60, 40, "#caa06b", "#8a6b45")}
      <rect x="6" y="94" width="88" height="6" fill="#e3c98f"/>
      <polygon points="10,72 16,20 22,72" fill="none" stroke="#6b4a30" stroke-width="2.4"/>
      <line x1="8" y1="72" x2="24" y2="72" stroke="#6b4a30" stroke-width="2.4"/>
      <g transform="rotate(-4 50 54)">
        <rect x="26" y="48" width="48" height="10" fill="#d9463f"/>
        <rect x="26" y="48" width="48" height="10" fill="none" stroke="#8f231e" stroke-width="1"/>
      </g>`;
  },
  aquifer: function () { // AquaCortex — sprinklers, cracked lawn, water tower
    return `<rect x="6" y="94" width="88" height="6" fill="#b9d98a"/>
      <path d="M6,94 L20,90 L34,94 L48,89 L62,94 L76,90 L94,94" fill="none" stroke="#a08a5a" stroke-width="1.4"/>
      ${valleyBuildingBlock(18, 36, 52, 38, "#6fb3c2", "#3d7f8f")}
      <circle cx="82" cy="46" r="9" fill="#3d7f8f"/>
      <line x1="78" y1="55" x2="78" y2="70" stroke="#3d7f8f" stroke-width="2"/>
      <line x1="86" y1="55" x2="86" y2="70" stroke="#3d7f8f" stroke-width="2"/>
      <path d="M30,86 Q34,78 38,86" fill="none" stroke="#ffffff" stroke-width="1.3" opacity="0.85"/>
      <path d="M46,86 Q50,78 54,86" fill="none" stroke="#ffffff" stroke-width="1.3" opacity="0.85"/>`;
  },
  coalburg: function () { // CleanSeam Systems — smokestacks + one solar panel
    return `${valleyBuildingBlock(18, 40, 58, 34, "#8a8f97", "#5b6068")}
      <rect x="6" y="94" width="88" height="6" fill="#cfd3d6"/>
      <rect x="28" y="14" width="7" height="28" fill="#5b6068"/>
      <rect x="44" y="10" width="7" height="32" fill="#5b6068"/>
      <ellipse cx="47.5" cy="8" rx="6" ry="3.4" fill="#c2c6ca" opacity="0.8"/>
      <g transform="rotate(18 31 22)"><rect x="24" y="18" width="10" height="7" fill="#2b4a6b"/></g>
      <rect x="24" y="52" width="46" height="8" fill="#f2c94c"/>`;
  },
  cornfield: function () { // Silo.ai — repurposed silo, spinner crop circle
    return `<rect x="6" y="94" width="88" height="6" fill="#e8d77a"/>
      <g opacity="0.55" fill="none" stroke="#c9b45a" stroke-width="1">
        <circle cx="70" cy="86" r="6"/><circle cx="70" cy="86" r="10"/>
      </g>
      <rect x="36" y="20" width="28" height="56" rx="14" fill="#d9a441"/>
      <ellipse cx="50" cy="20" rx="14" ry="6" fill="#b5842f"/>
      <line x1="36" y1="34" x2="64" y2="34" stroke="#b5842f" stroke-width="1.4"/>
      <line x1="36" y1="46" x2="64" y2="46" stroke="#b5842f" stroke-width="1.4"/>
      <line x1="36" y1="58" x2="64" y2="58" stroke="#b5842f" stroke-width="1.4"/>`;
  },
  taxhaven: function () { // Nomintech Holdings — a mailbox and a folding table
    return `<rect x="6" y="94" width="88" height="6" fill="#d8cfa8"/>
      <rect x="40" y="66" width="20" height="2.4" fill="#cfa15a"/>
      <line x1="42" y1="68.4" x2="42" y2="78" stroke="#cfa15a" stroke-width="2"/>
      <line x1="58" y1="68.4" x2="58" y2="78" stroke="#cfa15a" stroke-width="2"/>
      <rect x="44" y="60" width="12" height="6" fill="#787878"/>
      <path d="M34,40 a10,10 0 0 1 20,0 v14 h-20 z" fill="#4a6fa5"/>
      <rect x="30" y="54" width="28" height="4" fill="#3a5d90"/>
      <line x1="44" y1="58" x2="44" y2="78" stroke="#3a5d90" stroke-width="2.4"/>
      <polygon points="52,38 58,38 52,32" fill="#d9463f"/>
      <rect x="38" y="24" width="18" height="8" fill="#ffffff" stroke="#3a5d90" stroke-width="0.8"/>`;
  },
  oceanpoint: function () { // KelpNet — cooling pipe into the surf, whale-lawyer boat
    return `${valleyBuildingBlock(30, 30, 44, 32, "#4a8f8a", "#2f5f5c")}
      <path d="M0,80 Q20,70 40,80 T80,80 T120,80 T160,80 V100 H0 Z" fill="#6fc7d9"/>
      <rect x="50" y="58" width="6" height="26" fill="#7a8a90"/>
      <polygon points="112,74 128,74 122,68 116,68" fill="#d94636"/>
      <line x1="122" y1="68" x2="122" y2="60" stroke="#5b3a30" stroke-width="1.2"/>`;
  },
  nuketown: function () { // HalfLife Compute — faint glow, electrolyte vending machine
    return `<circle cx="50" cy="55" r="42" fill="#a6ff5c" opacity="0.16"/>
      <circle cx="50" cy="55" r="30" fill="#a6ff5c" opacity="0.18"/>
      ${valleyBuildingBlock(22, 36, 52, 34, "#3a3f45", "#23262b")}
      <rect x="6" y="94" width="88" height="6" fill="#55606b"/>
      <rect x="78" y="58" width="12" height="20" fill="#2b6f4a"/>
      <rect x="80" y="61" width="8" height="7" fill="#a6ff5c" opacity="0.7"/>
      <g fill="#f2c94c" opacity="0.9">
        <polygon points="42,42 46,49 38,49"/><polygon points="58,42 62,49 54,49"/><polygon points="50,50 54,57 46,57"/>
      </g>`;
  },
  collegetown: function () { // QuadCore University Partners — protest sign vs hiring banner
    return `<rect x="6" y="94" width="88" height="6" fill="#7fae5c"/>
      ${valleyBuildingBlock(22, 34, 56, 36, "#a1503c", "#6b3323")}
      <circle cx="24" cy="70" r="2.2" fill="#4a7a34"/>
      <circle cx="21" cy="66" r="2" fill="#4a7a34"/>
      <circle cx="26" cy="63" r="1.7" fill="#4a7a34"/>
      <rect x="30" y="48" width="40" height="8" fill="#f2c94c"/>
      <line x1="76" y1="80" x2="76" y2="64" stroke="#6b3323" stroke-width="1.6"/>
      <rect x="70" y="58" width="14" height="8" fill="#e0483f"/>`;
  }
};

/* Generic flat campus icon (non-bespoke locations): seeded palette, no
   unique gag, but still on-brand with the rest of the valley. */
Art.VALLEY_GENERIC_COLORS = [
  { body: "#7c9eff", roof: "#5170c4" },
  { body: "#ff9d6f", roof: "#c4633a" },
  { body: "#7ed9c9", roof: "#3f9e8c" },
  { body: "#e0b64a", roof: "#a9822f" }
];

Art.campusMarker = function (community, size, markerState) {
  const builder = Art.CAMPUS_BUILDERS[community.id];
  if (builder) {
    return campusIcon(size, builder(), markerState);
  }
  const rnd = mulberry32(hashStr(community.id));
  const c = Art.VALLEY_GENERIC_COLORS[Math.floor(rnd() * Art.VALLEY_GENERIC_COLORS.length)];
  const inner = `<rect x="6" y="94" width="88" height="6" fill="${Art.VALLEY_LOT}"/>
    ${valleyBuildingBlock(24, 34, 52, 40, c.body, c.roof)}`;
  return campusIcon(size, inner, markerState);
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
