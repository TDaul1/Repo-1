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
Art.VALLEY_GROUND2 = "#e4d6ab";
Art.VALLEY_ROAD = "#9a9284";
Art.VALLEY_ROAD_HI = "#b3aa98";
Art.VALLEY_ROAD_LINE = "#f2c94c";
Art.VALLEY_LOT = "#ded4b6";
Art.VALLEY_SCENERY = "#c9bd9a";
Art.VALLEY_SCENERY2 = "#8f8567";

/* Shared <defs> dropped into every icon/scene: a soft light-to-shadow
   sheen (works over any base fill) and a fine paper-grain filter so flat
   vector shapes read as an illustrated poster instead of raw digital fills. */
function valleyDefs() {
  return `<defs>
    <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.24"/>
    </linearGradient>
    <linearGradient id="cylShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000000" stop-opacity="0.28"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
    <radialGradient id="softGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#a6ff5c" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#a6ff5c" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"/>
    </filter>
  </defs>`;
}

/* A proper flat-illustration building: gradient-shaded wall + roof, a
   window grid with glassy highlights, and a soft ground shadow. This is
   the shared base every campus icon (bespoke or generic) is built from. */
function detailedBuilding(x, y, w, h, wallFill, roofFill, opts) {
  opts = opts || {};
  const rows = opts.rows || 3;
  const cols = opts.cols || 4;
  const roofH = h * 0.15;
  const wallY = y + roofH;
  const wallH = h - roofH;
  const padX = w * 0.1, padY = wallH * 0.14;
  const gw = (w - padX * 2) / cols;
  const gh = (wallH - padY * 2) / rows;
  let windows = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + padX + c * gw + gw * 0.14;
      const wy = wallY + padY + r * gh + gh * 0.14;
      const ww = (gw * 0.72).toFixed(1), wh = (gh * 0.72).toFixed(1);
      windows += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww}" height="${wh}" fill="#dff3f7" opacity="0.9"/>` +
        `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${ww}" height="${(gh * 0.34).toFixed(1)}" fill="#ffffff" opacity="0.4"/>`;
    }
  }
  return `<ellipse cx="${x + w / 2}" cy="${(y + h + 3).toFixed(1)}" rx="${(w * 0.58).toFixed(1)}" ry="${(h * 0.08).toFixed(1)}" fill="#2b2005" opacity="0.15"/>
    <rect x="${x}" y="${wallY.toFixed(1)}" width="${w}" height="${wallH.toFixed(1)}" fill="${wallFill}"/>
    <rect x="${x}" y="${wallY.toFixed(1)}" width="${w}" height="${wallH.toFixed(1)}" fill="url(#wallShade)"/>
    ${windows}
    <rect x="${(x - w * 0.04).toFixed(1)}" y="${y}" width="${(w * 1.08).toFixed(1)}" height="${roofH.toFixed(1)}" fill="${roofFill}"/>
    <rect x="${(x - w * 0.04).toFixed(1)}" y="${y}" width="${(w * 1.08).toFixed(1)}" height="${roofH.toFixed(1)}" fill="url(#wallShade)"/>`;
}

function treeCluster(cx, cy, scale, dark, mid, light) {
  scale = scale || 1;
  return `<g transform="translate(${cx},${cy}) scale(${scale})">
    <rect x="-1" y="4" width="2" height="6" fill="#6b5232"/>
    <circle cx="-2.5" cy="0" r="4.2" fill="${dark}" opacity="0.9"/>
    <circle cx="2.5" cy="-1" r="4.6" fill="${mid}" opacity="0.9"/>
    <circle cx="0" cy="-3.5" r="4" fill="${light}" opacity="0.9"/>
  </g>`;
}

function carShape(cx, cy, rot, body) {
  return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <rect x="-5" y="-2.4" width="10" height="4.8" rx="1.6" fill="${body}"/>
    <rect x="-5" y="-2.4" width="10" height="4.8" rx="1.6" fill="url(#wallShade)"/>
    <rect x="-2.6" y="-3.4" width="5.4" height="2.4" rx="1" fill="#dff3f7" opacity="0.85"/>
    <circle cx="-2.8" cy="2.6" r="1.1" fill="#23262b"/>
    <circle cx="2.8" cy="2.6" r="1.1" fill="#23262b"/>
  </g>`;
}

/* ---------------------------------------------------------------------
   Background scene — one static aerial "tech corridor" illustration.
   Authored at 160x100 so it can stretch edge-to-edge behind the markers
   (whose own x/y percentages are independent of this viewBox).
--------------------------------------------------------------------- */
Art.techValleyBackground = function () {
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="none" class="valley-bg-svg" aria-hidden="true">
    ${valleyDefs()}
    <radialGradient id="groundWash" cx="42%" cy="38%" r="75%">
      <stop offset="0" stop-color="${Art.VALLEY_GROUND}"/>
      <stop offset="100%" stop-color="${Art.VALLEY_GROUND2}"/>
    </radialGradient>
    <rect x="0" y="0" width="160" height="100" fill="url(#groundWash)"/>

    <!-- highway corridor, running the length of the valley -->
    <polygon points="0,78 160,18 160,32 0,92" fill="${Art.VALLEY_ROAD}"/>
    <polygon points="0,78 160,18 160,21 0,81" fill="${Art.VALLEY_ROAD_HI}" opacity="0.6"/>
    <path d="M0,85 L160,25" stroke="${Art.VALLEY_ROAD_LINE}" stroke-width="1.1" stroke-dasharray="4.5 3.5" opacity="0.85"/>
    ${carShape(38, 71.5, -20.5, "#d9463f")}
    ${carShape(96, 51, -20.5, "#4a6fa5")}
    ${carShape(126, 38.5, -20.5, "#f2c94c")}

    <!-- ambient low-poly scenery: small detailed buildings + landscaping -->
    ${detailedBuilding(4, 6, 11, 10, Art.VALLEY_SCENERY, Art.VALLEY_SCENERY2, { rows: 2, cols: 2 })}
    ${detailedBuilding(134, 4, 10, 9, Art.VALLEY_SCENERY2, Art.VALLEY_SCENERY, { rows: 2, cols: 2 })}
    ${detailedBuilding(122, 84, 13, 11, Art.VALLEY_SCENERY, Art.VALLEY_SCENERY2, { rows: 2, cols: 3 })}
    ${detailedBuilding(70, 90, 9, 8, Art.VALLEY_SCENERY2, Art.VALLEY_SCENERY, { rows: 1, cols: 2 })}
    ${treeCluster(20, 15, 1.1, "#4a7a34", "#5f9142", "#79ad58")}
    ${treeCluster(65, 92, 0.9, "#4a7a34", "#5f9142", "#79ad58")}
    ${treeCluster(150, 18, 1, "#4a7a34", "#5f9142", "#79ad58")}
    ${treeCluster(112, 90, 0.85, "#4a7a34", "#5f9142", "#79ad58")}

    <!-- parking lot, bottom-right, well clear of any marker -->
    <g>
      <rect x="126" y="58" width="28" height="18" fill="${Art.VALLEY_LOT}"/>
      <rect x="126" y="58" width="28" height="18" fill="url(#wallShade)"/>
      <path d="M129,58 L129,76 M134,58 L134,76 M139,58 L139,76 M144,58 L144,76 M149,58 L149,76"
        stroke="#c2b592" stroke-width="0.6"/>
      ${carShape(131.5, 66, 90, "#7ed9c9")}
      ${carShape(141.5, 66, 90, "#e0b64a")}
    </g>

    <!-- gag 1: scooter graveyard -->
    <g transform="translate(94,58)">
      <ellipse cx="4" cy="10" rx="9" ry="2" fill="#2b2005" opacity="0.14"/>
      <circle cx="0" cy="6" r="2.1" fill="#3a3f45"/>
      <circle cx="4" cy="7" r="2.1" fill="#3a3f45"/>
      <circle cx="8" cy="5.5" r="2.1" fill="#3a3f45"/>
      <path d="M0,6 L2,0 L5,0 M4,7 L6,1 L9,1 M8,5.5 L10,-0.5 L13,-0.5" stroke="#7ed957" stroke-width="0.9" fill="none"/>
    </g>

    <!-- gag 2: a building rebranding itself mid-frame -->
    <g transform="translate(46,6)">
      ${detailedBuilding(0, 4, 13, 10, "#cfc4a2", "#a99c78", { rows: 1, cols: 3 })}
      <rect x="2" y="8.5" width="9" height="2.8" fill="#e7e0c8"/>
      <line x1="2" y1="8.5" x2="11" y2="11.3" stroke="#b7ab86" stroke-width="0.3"/>
      <rect x="1.5" y="12.2" width="10" height="2.4" fill="#f2c94c"/>
      <rect x="1.5" y="12.2" width="10" height="1.1" fill="#ffffff" opacity="0.35"/>
      <line x1="13" y1="14.5" x2="16.5" y2="1" stroke="#8a7f63" stroke-width="0.7"/>
      <circle cx="16.5" cy="1" r="1.2" fill="#e0a97a"/>
    </g>

    <!-- gag 3: a founder biking past his own billboard -->
    <g transform="translate(100,9)">
      <rect x="0" y="0" width="11" height="15" fill="#d9463f"/>
      <rect x="0" y="0" width="11" height="15" fill="url(#wallShade)"/>
      <rect x="1" y="1" width="9" height="7" fill="#f5e6c8"/>
      <circle cx="5.5" cy="4" r="1.7" fill="#e0a97a"/>
      <path d="M2,8 Q5.5,5.5 9,8 L9,8.4 L2,8.4 Z" fill="#3a3f45"/>
      <line x1="5.5" y1="15" x2="5.5" y2="19" stroke="#8a7f63" stroke-width="0.8"/>
      <g transform="translate(-3,17) scale(0.55)">
        <circle cx="0" cy="6" r="3" fill="none" stroke="#2b2f36" stroke-width="1"/>
        <circle cx="9" cy="6" r="3" fill="none" stroke="#2b2f36" stroke-width="1"/>
        <path d="M0,6 L4,2 L9,6 M4,2 L4,6" stroke="#2b2f36" stroke-width="1" fill="none"/>
        <circle cx="4" cy="1" r="1.1" fill="#e0a97a"/>
      </g>
    </g>

    <rect x="0" y="0" width="160" height="100" filter="url(#grain)" opacity="0.6"/>
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
    post += `<rect x="14" y="73" width="72" height="7" fill="#2b0f0d" opacity="0.2"/>
      <rect x="14" y="72" width="72" height="7" fill="#d9463f"/>
      <rect x="14" y="72" width="72" height="3" fill="#ffffff" opacity="0.25"/>
      <polygon points="50,72 46,79 50,76.5 54,79" fill="#f2c94c"/>`;
  }
  if (markerState.built) {
    post += `<line x1="82" y1="30" x2="82" y2="10" stroke="#5b6068" stroke-width="2"/>
      <polygon points="82,10 82,18 94,14" fill="#7ed957"/>
      <polygon points="82,10 82,18 94,14" fill="url(#wallShade)"/>`;
  }
  return { pre: pre, post: post };
}

function campusIcon(size, innerSvg, markerState) {
  const overlay = campusStateOverlay(markerState);
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="campus-svg" aria-hidden="true">
    ${valleyDefs()}
    ${overlay.pre}
    ${innerSvg}
    ${overlay.post}
  </svg>`;
}

/* ---------------------------------------------------------------------
   Bespoke campus icons — one hand-drawn gag per marquee location, each
   built on the shared detailedBuilding() base (gradient walls, windows,
   ground shadow) so the extra gag detail reads as one coherent scene.
--------------------------------------------------------------------- */
Art.CAMPUS_BUILDERS = {
  gulch: function () { // PannerAI — rusted mining rig, crooked banner
    return `<rect x="4" y="90" width="92" height="8" fill="#e3c98f"/>
      ${detailedBuilding(20, 30, 60, 44, "#caa06b", "#8a6b45", { rows: 3, cols: 4 })}
      <g opacity="0.95">
        <polygon points="10,72 16,18 22,72" fill="none" stroke="#6b4a30" stroke-width="2.6" stroke-linejoin="round"/>
        <line x1="11" y1="46" x2="21" y2="46" stroke="#6b4a30" stroke-width="1.8"/>
        <line x1="8" y1="72" x2="24" y2="72" stroke="#6b4a30" stroke-width="2.6"/>
        <ellipse cx="16" cy="73" rx="9" ry="1.6" fill="#2b2005" opacity="0.18"/>
      </g>
      <g transform="rotate(-4 50 54)">
        <rect x="27" y="49.5" width="48" height="10" fill="#2b0f0d" opacity="0.2"/>
        <rect x="26" y="48" width="48" height="10" fill="#d9463f"/>
        <rect x="26" y="48" width="48" height="4" fill="#ffffff" opacity="0.22"/>
        <rect x="26" y="48" width="48" height="10" fill="none" stroke="#8f231e" stroke-width="1"/>
      </g>`;
  },
  aquifer: function () { // AquaCortex — sprinklers, cracked lawn, water tower
    return `<rect x="4" y="90" width="92" height="8" fill="#b9d98a"/>
      <rect x="4" y="90" width="92" height="8" fill="url(#wallShade)"/>
      <path d="M4,90 L18,86 L32,90 L46,85 L60,90 L74,86 L96,90" fill="none" stroke="#a08a5a" stroke-width="1.2"/>
      ${detailedBuilding(16, 32, 52, 42, "#6fb3c2", "#3d7f8f", { rows: 3, cols: 3 })}
      <ellipse cx="82" cy="46" rx="9" ry="9" fill="#3d7f8f"/>
      <ellipse cx="82" cy="46" rx="9" ry="9" fill="url(#cylShade)"/>
      <ellipse cx="79" cy="42.5" rx="3" ry="2" fill="#ffffff" opacity="0.4"/>
      <line x1="77" y1="55" x2="77" y2="72" stroke="#3d7f8f" stroke-width="2.2"/>
      <line x1="87" y1="55" x2="87" y2="72" stroke="#3d7f8f" stroke-width="2.2"/>
      <line x1="77" y1="64" x2="87" y2="64" stroke="#3d7f8f" stroke-width="1.4"/>
      <path d="M30,86 Q34,76 38,86" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.9"/>
      <path d="M46,86 Q50,76 54,86" fill="none" stroke="#ffffff" stroke-width="1.4" opacity="0.9"/>
      <path d="M14,88 L22,82 M60,90 L70,83" stroke="#a08a5a" stroke-width="1" opacity="0.7"/>`;
  },
  coalburg: function () { // CleanSeam Systems — smokestacks + one solar panel
    return `<rect x="4" y="90" width="92" height="8" fill="#cfd3d6"/>
      ${detailedBuilding(16, 38, 58, 36, "#8a8f97", "#5b6068", { rows: 2, cols: 5 })}
      <g>
        <rect x="27" y="12" width="8" height="30" fill="#5b6068"/>
        <rect x="27" y="12" width="8" height="30" fill="url(#cylShade)"/>
        <rect x="44" y="8" width="8" height="34" fill="#5b6068"/>
        <rect x="44" y="8" width="8" height="34" fill="url(#cylShade)"/>
        <ellipse cx="48" cy="6" rx="7" ry="4" fill="#dfe2e4" opacity="0.55"/>
        <ellipse cx="52" cy="2" rx="5" ry="3" fill="#dfe2e4" opacity="0.4"/>
      </g>
      <g transform="rotate(16 30 22)">
        <rect x="22" y="17" width="12" height="9" fill="#1f3a54"/>
        <path d="M22,19 L34,19 M22,21.5 L34,21.5 M22,24 L34,24" stroke="#3d6690" stroke-width="0.5"/>
        <rect x="22" y="17" width="12" height="9" fill="none" stroke="#14283c" stroke-width="0.6"/>
      </g>
      <rect x="22" y="54" width="48" height="9" fill="#f2c94c"/>
      <rect x="22" y="54" width="48" height="4" fill="#ffffff" opacity="0.3"/>
      <circle cx="66" cy="58.5" r="2" fill="none" stroke="#8a6a1a" stroke-width="0.8"/>`;
  },
  cornfield: function () { // Silo.ai — repurposed silo, spinner crop circle
    return `<rect x="4" y="90" width="92" height="8" fill="#e8d77a"/>
      <path d="M4,93 L96,93 M4,96 L96,96" stroke="#cdb85e" stroke-width="0.7" opacity="0.7"/>
      <g opacity="0.6" fill="none" stroke="#c9b45a" stroke-width="1">
        <circle cx="72" cy="84" r="5"/><circle cx="72" cy="84" r="9" stroke-dasharray="2 2"/>
      </g>
      <ellipse cx="50" cy="78" rx="16" ry="4" fill="#2b2005" opacity="0.16"/>
      <rect x="36" y="18" width="28" height="58" rx="14" fill="#d9a441"/>
      <rect x="36" y="18" width="28" height="58" rx="14" fill="url(#cylShade)"/>
      <ellipse cx="50" cy="18" rx="14" ry="6" fill="#b5842f"/>
      <ellipse cx="50" cy="18" rx="14" ry="6" fill="url(#wallShade)"/>
      <polygon points="50,4 42,18 58,18" fill="#8a6a1a"/>
      <line x1="37" y1="30" x2="63" y2="30" stroke="#b5842f" stroke-width="1.2" opacity="0.7"/>
      <line x1="37" y1="42" x2="63" y2="42" stroke="#b5842f" stroke-width="1.2" opacity="0.7"/>
      <line x1="37" y1="54" x2="63" y2="54" stroke="#b5842f" stroke-width="1.2" opacity="0.7"/>
      <line x1="37" y1="66" x2="63" y2="66" stroke="#b5842f" stroke-width="1.2" opacity="0.7"/>`;
  },
  taxhaven: function () { // Nomintech Holdings — a mailbox and a folding table
    return `<rect x="4" y="90" width="92" height="8" fill="#d8cfa8"/>
      <ellipse cx="50" cy="80" rx="26" ry="4" fill="#2b2005" opacity="0.14"/>
      <rect x="40" y="66" width="20" height="2.4" fill="#cfa15a"/>
      <rect x="40" y="66" width="20" height="1" fill="#ffffff" opacity="0.3"/>
      <line x1="42" y1="68.4" x2="42" y2="78" stroke="#cfa15a" stroke-width="2"/>
      <line x1="58" y1="68.4" x2="58" y2="78" stroke="#cfa15a" stroke-width="2"/>
      <rect x="44" y="60" width="12" height="6" fill="#5c5c5c"/>
      <rect x="44" y="60" width="12" height="2.4" fill="#89b7c9" opacity="0.7"/>
      <path d="M34,40 a10,10 0 0 1 20,0 v14 h-20 z" fill="#4a6fa5"/>
      <path d="M34,40 a10,10 0 0 1 20,0 v14 h-20 z" fill="url(#cylShade)"/>
      <rect x="30" y="54" width="28" height="4" fill="#3a5d90"/>
      <line x1="44" y1="58" x2="44" y2="78" stroke="#3a5d90" stroke-width="2.4"/>
      <line x1="44" y1="58" x2="44" y2="78" stroke="#3a5d90" stroke-width="2.4"/>
      <polygon points="52,38 58,38 52,32" fill="#d9463f"/>
      <rect x="37" y="22" width="20" height="9" fill="#ffffff" stroke="#3a5d90" stroke-width="0.9"/>
      <rect x="37" y="22" width="20" height="9" fill="url(#wallShade)"/>
      <line x1="40" y1="25.5" x2="54" y2="25.5" stroke="#3a5d90" stroke-width="0.7"/>
      <line x1="40" y1="28" x2="50" y2="28" stroke="#3a5d90" stroke-width="0.7"/>`;
  },
  oceanpoint: function () { // KelpNet — cooling pipe into the surf, whale-lawyer boat
    return `${detailedBuilding(28, 26, 44, 38, "#4a8f8a", "#2f5f5c", { rows: 3, cols: 3 })}
      <path d="M0,84 Q20,74 40,84 T80,84 T120,84 T160,84 V100 H0 Z" fill="#3f8f9c" opacity="0.5"/>
      <path d="M0,80 Q20,70 40,80 T80,80 T120,80 T160,80 V100 H0 Z" fill="#6fc7d9"/>
      <path d="M0,80 Q20,70 40,80 T80,80 T120,80 T160,80" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.55"/>
      <rect x="50" y="54" width="6" height="28" fill="#7a8a90"/>
      <rect x="50" y="54" width="6" height="28" fill="url(#cylShade)"/>
      <g transform="translate(0,3)">
        <polygon points="112,74 128,74 123,66 117,66" fill="#d94636"/>
        <polygon points="112,74 128,74 123,66 117,66" fill="url(#wallShade)"/>
        <path d="M112,74 Q120,78 128,74" fill="none" stroke="#5b3a30" stroke-width="1"/>
        <line x1="122" y1="66" x2="122" y2="56" stroke="#5b3a30" stroke-width="1.2"/>
        <polygon points="122,56 122,61 130,58.5" fill="#f2c94c"/>
      </g>`;
  },
  nuketown: function () { // HalfLife Compute — faint glow, electrolyte vending machine
    return `<circle cx="50" cy="55" r="44" fill="url(#softGlow)"/>
      <rect x="4" y="90" width="92" height="8" fill="#55606b"/>
      ${detailedBuilding(20, 32, 52, 38, "#3a3f45", "#23262b", { rows: 3, cols: 4 })}
      <g>
        <rect x="76" y="56" width="14" height="22" rx="1.5" fill="#2b6f4a"/>
        <rect x="76" y="56" width="14" height="22" rx="1.5" fill="url(#wallShade)"/>
        <rect x="78" y="59" width="10" height="8" fill="#a6ff5c" opacity="0.75"/>
        <rect x="79" y="69" width="8" height="1.6" fill="#dfe2e4" opacity="0.8"/>
        <rect x="79" y="72" width="8" height="1.6" fill="#dfe2e4" opacity="0.8"/>
      </g>
      <g fill="#f2c94c" opacity="0.95">
        <polygon points="40,40 44,47 36,47"/><polygon points="56,40 60,47 52,47"/><polygon points="48,48 52,55 44,55"/>
      </g>
      <circle cx="48" cy="47.3" r="0.9" fill="#3a3f45"/>`;
  },
  collegetown: function () { // QuadCore University Partners — protest sign vs hiring banner
    return `<rect x="4" y="90" width="92" height="8" fill="#7fae5c"/>
      <rect x="4" y="90" width="92" height="8" fill="url(#wallShade)"/>
      ${detailedBuilding(20, 30, 56, 40, "#a1503c", "#6b3323", { rows: 3, cols: 5 })}
      <g opacity="0.92">
        <circle cx="22" cy="68" r="2.6" fill="#4a7a34"/>
        <circle cx="19" cy="63" r="2.3" fill="#5f9142"/>
        <circle cx="24" cy="59" r="2" fill="#4a7a34"/>
        <circle cx="20" cy="55" r="1.7" fill="#5f9142"/>
      </g>
      <rect x="28" y="46" width="40" height="9" fill="#f2c94c"/>
      <rect x="28" y="46" width="40" height="4" fill="#ffffff" opacity="0.3"/>
      <line x1="76" y1="80" x2="76" y2="62" stroke="#6b3323" stroke-width="1.8"/>
      <rect x="69" y="56" width="15" height="9" fill="#e0483f"/>
      <rect x="69" y="56" width="15" height="9" fill="url(#wallShade)"/>`;
  }
};

/* Generic flat campus icon (non-bespoke locations): seeded palette, no
   unique gag, but built from the same detailed-building base plus a
   small landscaping accent so it still reads as designed, not empty. */
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
  const inner = `<rect x="4" y="90" width="92" height="8" fill="${Art.VALLEY_LOT}"/>
    ${detailedBuilding(24, 32, 52, 42, c.body, c.roof, { rows: 3, cols: 3 })}
    ${treeCluster(16, 78, 0.85, "#4a7a34", "#5f9142", "#79ad58")}`;
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
