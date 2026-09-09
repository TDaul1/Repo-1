'use strict';

/* ======================================================================
   ROCKET LAUNCH — canvas arcade ascent game
   Vanilla JS + Canvas2D. No external assets; all visuals are procedural.
   ====================================================================== */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0; // CSS pixels

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/* ---------------------------- utilities ---------------------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

function lerpColor(c1, c2, t) {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}
function rgb(c, a = 1) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

/* ============================== AUDIO =============================== */
const Audio_ = (() => {
  let ctxA = null;
  let masterGain = null;
  let engineGain = null, engineOsc = null, engineNoise = null;
  let muted = false;
  let noiseBuffer = null;

  function init() {
    if (ctxA) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctxA = new AC();
    masterGain = ctxA.createGain();
    masterGain.gain.value = muted ? 0 : 0.85;
    masterGain.connect(ctxA.destination);

    // pre-render white noise buffer for engine rumble / explosions
    const len = ctxA.sampleRate * 2;
    noiseBuffer = ctxA.createBuffer(1, len, ctxA.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, ctxA.currentTime, 0.05);
  }

  function makeNoiseSource(loop) {
    const src = ctxA.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = loop;
    return src;
  }

  function startEngine() {
    if (!ctxA || engineOsc) return;
    engineOsc = ctxA.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const oscGain = ctxA.createGain();
    oscGain.gain.value = 0;

    engineNoise = makeNoiseSource(true);
    const noiseFilter = ctxA.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 420;
    const noiseGain = ctxA.createGain();
    noiseGain.gain.value = 0;

    engineOsc.connect(oscGain).connect(masterGain);
    engineNoise.connect(noiseFilter).connect(noiseGain).connect(masterGain);

    engineOsc.start();
    engineNoise.start();

    engineGain = { oscGain, noiseGain };
    setEngineIntensity(0);
  }

  function setEngineIntensity(t) { // 0..1
    if (!engineGain) return;
    const now = ctxA.currentTime;
    engineGain.oscGain.gain.setTargetAtTime(t * 0.10, now, 0.05);
    engineGain.noiseGain.gain.setTargetAtTime(t * 0.16, now, 0.05);
    if (engineOsc) engineOsc.frequency.setTargetAtTime(55 + t * 40, now, 0.08);
  }

  function stopEngine() {
    if (!engineOsc) return;
    try { engineOsc.stop(); engineNoise.stop(); } catch (e) {}
    engineOsc = null; engineNoise = null; engineGain = null;
  }

  function blip(freq1, freq2, dur, type = 'sine', vol = 0.25) {
    if (!ctxA) return;
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq1, ctxA.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(freq2, 1), ctxA.currentTime + dur);
    g.gain.setValueAtTime(vol, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + dur);
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(ctxA.currentTime + dur + 0.02);
  }

  function collectSound() { blip(520, 1040, 0.18, 'triangle', 0.22); }
  function boostSound() { blip(300, 900, 0.35, 'sawtooth', 0.22); }

  function thump(freq, dur, vol) {
    if (!ctxA) return;
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, ctxA.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.3, 1), ctxA.currentTime + dur);
    g.gain.setValueAtTime(vol, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + dur);
    o.connect(g).connect(masterGain);
    o.start();
    o.stop(ctxA.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ctxA) return;
    const src = makeNoiseSource(false);
    const filt = ctxA.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const g = ctxA.createGain();
    g.gain.setValueAtTime(vol, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctxA.currentTime + dur);
    src.connect(filt).connect(g).connect(masterGain);
    src.start();
    src.stop(ctxA.currentTime + dur);
  }

  function hitSound() { noiseBurst(0.22, 0.35, 1200); thump(180, 0.2, 0.25); }
  function explosionSound() { noiseBurst(0.9, 0.55, 900); thump(90, 0.7, 0.4); }
  function stageSound() { thump(220, 0.25, 0.3); blip(200, 500, 0.15, 'square', 0.15); }

  function orbitFanfare() {
    if (!ctxA) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => blip(f, f, 0.4, 'triangle', 0.22), i * 110);
    });
  }

  return { init, setMuted, startEngine, stopEngine, setEngineIntensity, collectSound, boostSound, hitSound, explosionSound, stageSound, orbitFanfare };
})();

/* ============================== INPUT ================================ */
const Input = { thrust: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { Input.thrust = true; e.preventDefault(); }
  if (['ArrowLeft', 'KeyA'].includes(e.code)) Input.left = true;
  if (['ArrowRight', 'KeyD'].includes(e.code)) Input.right = true;
});
window.addEventListener('keyup', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) Input.thrust = false;
  if (['ArrowLeft', 'KeyA'].includes(e.code)) Input.left = false;
  if (['ArrowRight', 'KeyD'].includes(e.code)) Input.right = false;
});
window.addEventListener('blur', () => { Input.thrust = false; Input.left = false; Input.right = false; });

function bindHold(el, onDown, onUp) {
  const down = (e) => { e.preventDefault(); onDown(); el.classList.add('pressed'); };
  const up = (e) => { e.preventDefault(); onUp(); el.classList.remove('pressed'); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointerleave', up);
  el.addEventListener('pointercancel', up);
}

const isTouch = matchMedia('(pointer: coarse)').matches;
const touchControls = document.getElementById('touch-controls');

/* ============================= BACKGROUND ============================ */
// Sky keyframes by world altitude (px). top/bottom colors + star/haze alpha.
const SKY_KEYS = [
  { alt: 0, top: [79, 168, 255], bottom: [207, 238, 255], star: 0, haze: 0.0 },
  { alt: 1800, top: [58, 130, 224], bottom: [163, 214, 255], star: 0, haze: 0.05 },
  { alt: 10000, top: [30, 60, 140], bottom: [95, 140, 210], star: 0.18, haze: 0.15 },
  { alt: 28000, top: [12, 20, 66], bottom: [30, 42, 95], star: 0.55, haze: 0.35 },
  { alt: 60000, top: [4, 6, 18], bottom: [10, 14, 36], star: 0.9, haze: 0.15 },
  { alt: 90000, top: [1, 1, 6], bottom: [4, 4, 12], star: 1, haze: 0.05 },
];
function skyAt(altitude) {
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) {
    if (altitude >= SKY_KEYS[i].alt && altitude <= SKY_KEYS[i + 1].alt) {
      a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break;
    }
  }
  if (altitude > SKY_KEYS[SKY_KEYS.length - 1].alt) { a = b = SKY_KEYS[SKY_KEYS.length - 1]; }
  const span = Math.max(1, b.alt - a.alt);
  const t = clamp((altitude - a.alt) / span, 0, 1);
  return {
    top: lerpColor(a.top, b.top, t),
    bottom: lerpColor(a.bottom, b.bottom, t),
    star: lerp(a.star, b.star, t),
    haze: lerp(a.haze, b.haze, t),
  };
}

// Star layers (parallax), generated once in a wrap-around band.
function makeStars(count, spread) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({ x: rand(-spread, spread), y: rand(-spread * 2, spread * 2), r: rand(0.6, 1.8), tw: rand(0, TAU) });
  }
  return arr;
}
const starLayers = [
  { stars: makeStars(90, 900), speed: 0.05, size: 1 },
  { stars: makeStars(60, 900), speed: 0.12, size: 1.4 },
  { stars: makeStars(40, 900), speed: 0.22, size: 1.9 },
];

// Cloud puffs, procedural, recycled as camera scrolls past them.
function makeClouds(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: rand(-W, W),
      y: rand(0, 26000),
      w: rand(140, 340),
      h: rand(40, 90),
      speed: rand(6, 18),
      alpha: rand(0.35, 0.7),
    });
  }
  return arr;
}
let clouds = makeClouds(26);

/* ============================= PARTICLES ============================= */
class Particles {
  constructor() { this.items = []; }
  spawn(p) { this.items.push(p); }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.items.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.drag) { p.vx *= (1 - p.drag * dt); p.vy *= (1 - p.drag * dt); }
      p.rot = (p.rot || 0) + (p.vr || 0) * dt;
    }
  }
  draw(ctx, camX, camY, glow) {
    ctx.save();
    if (glow) ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const alpha = (p.fadeIn && t > 0.85) ? lerp(0, p.alpha ?? 1, (1 - t) / 0.15) : (p.alpha ?? 1) * t;
      const sx = p.x - camX + W / 2;
      const sy = H * 0.65 - (p.y - camY);
      const size = (p.size ?? 4) * (p.shrink ? t : 1);
      if (alpha <= 0.01 || size <= 0.1) continue;
      ctx.globalAlpha = alpha;
      if (p.shape === 'spark') {
        ctx.strokeStyle = rgb(p.color, 1);
        ctx.lineWidth = size * 0.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - p.vx * 0.02, sy + p.vy * 0.02);
        ctx.stroke();
      } else {
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size);
        grad.addColorStop(0, rgb(p.color, 1));
        grad.addColorStop(1, rgb(p.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
const exhaustParticles = new Particles();
const smokeParticles = new Particles();
const fxParticles = new Particles(); // sparks, explosions, collect bursts, confetti

/* =============================== ROCKET =============================== */
const STAGES = [
  { fuelMax: 900, thrust: 1280, label: 'STAGE 1' },
  { fuelMax: 800, thrust: 1200, label: 'STAGE 2' },
  { fuelMax: 700, thrust: 1120, label: 'STAGE 3' },
];
const MAX_SPEED = 1500;

const rocket = {
  x: 0, y: 0, // world position; y = altitude (up positive)
  vx: 0, vy: 0,
  angle: 0, // radians, 0 = pointing straight up
  angularVel: 0,
  stageIndex: 0,
  fuel: STAGES[0].fuelMax,
  hull: 100,
  invuln: 0,
  boostTimer: 0,
  thrusting: false,
  alive: true,
  radius: 20,
};

function resetRocket() {
  rocket.x = 0; rocket.y = 0;
  rocket.vx = 0; rocket.vy = 0;
  rocket.angle = 0; rocket.angularVel = 0;
  rocket.stageIndex = 0;
  rocket.fuel = STAGES[0].fuelMax;
  rocket.hull = 100;
  rocket.invuln = 1.2;
  rocket.boostTimer = 0;
  rocket.thrusting = false;
  rocket.alive = true;
}

function drawRocket(ctx, camX, camY, wobble) {
  const sx = rocket.x - camX + W / 2;
  const sy = H * 0.65 - (rocket.y - camY);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(rocket.angle + wobble);

  const flicker = rocket.thrusting ? rand(0.85, 1.15) : 1;
  const boosted = rocket.boostTimer > 0;

  // engine flame under the rocket — solid tapered cone (reads on bright sky) + additive hot core
  if (rocket.thrusting && rocket.fuel > 0) {
    const len = (boosted ? 74 : 52) * flicker;
    const sway = Math.sin(performance.now() * 0.025) * 3;
    ctx.save();
    ctx.translate(0, 26);

    const coneGrad = ctx.createLinearGradient(0, 0, 0, len);
    coneGrad.addColorStop(0, boosted ? 'rgba(255,240,190,0.95)' : 'rgba(255,220,140,0.95)');
    coneGrad.addColorStop(0.35, boosted ? 'rgba(255,195,100,0.85)' : 'rgba(255,150,60,0.85)');
    coneGrad.addColorStop(0.75, 'rgba(255,90,40,0.5)');
    coneGrad.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-5 + sway, len * 0.55, 0, len);
    ctx.quadraticCurveTo(5 + sway, len * 0.55, 8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    const glowR = 26 * flicker;
    const g = ctx.createRadialGradient(0, 8, 0, 0, 8, glowR);
    g.addColorStop(0, 'rgba(255,255,235,0.95)');
    g.addColorStop(0.5, boosted ? 'rgba(255,220,140,0.6)' : 'rgba(255,190,110,0.55)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 8, glowR, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // boost aura
  if (boosted) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
    g.addColorStop(0, 'rgba(255,230,150,0.35)');
    g.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // invulnerability flicker
  if (rocket.invuln > 0 && Math.floor(rocket.invuln * 14) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // fins
  ctx.fillStyle = '#c23b4a';
  ctx.beginPath();
  ctx.moveTo(-9, 18); ctx.lineTo(-24, 34); ctx.lineTo(-9, 30); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, 18); ctx.lineTo(24, 34); ctx.lineTo(9, 30); ctx.closePath(); ctx.fill();

  // body
  const bodyGrad = ctx.createLinearGradient(-11, 0, 11, 0);
  bodyGrad.addColorStop(0, '#8fa3b3');
  bodyGrad.addColorStop(0.45, '#f2f6fa');
  bodyGrad.addColorStop(0.55, '#e4ebf1');
  bodyGrad.addColorStop(1, '#7c8fa0');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.quadraticCurveTo(11, -24, 11, -4);
  ctx.lineTo(11, 26);
  ctx.lineTo(-11, 26);
  ctx.lineTo(-11, -4);
  ctx.quadraticCurveTo(-11, -24, 0, -32);
  ctx.closePath();
  ctx.fill();

  // nose cone tip accent
  ctx.fillStyle = boosted ? '#ffc94a' : '#4fe3ff';
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.quadraticCurveTo(6, -22, 6, -12);
  ctx.lineTo(-6, -12);
  ctx.quadraticCurveTo(-6, -22, 0, -32);
  ctx.closePath();
  ctx.fill();

  // window
  ctx.fillStyle = '#1c3f6f';
  ctx.beginPath(); ctx.arc(0, 2, 4.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();

  // panel lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-11, 14); ctx.lineTo(11, 14); ctx.stroke();

  // stage number badge
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.arc(0, 20, 5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '7px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(rocket.stageIndex + 1), 0, 20.5);

  ctx.restore();
}

/* ============================ WORLD OBJECTS ============================ */
let obstacles = [];
let collectibles = [];
let discardedStages = [];

function altitudeBand(altitude) {
  if (altitude < 6000) return 'low';
  if (altitude < 24000) return 'mid';
  if (altitude < 55000) return 'high';
  return 'space';
}

function spawnObstacle(maxAltitudeReached) {
  const band = altitudeBand(maxAltitudeReached);
  const y = maxAltitudeReached + rand(H * 0.9, H * 1.6);
  const x = rand(-W * 0.42, W * 0.42);
  let type;
  if (band === 'low') type = Math.random() < 0.7 ? 'bird' : 'balloon';
  else if (band === 'mid') type = Math.random() < 0.5 ? 'balloon' : 'debris';
  else if (band === 'high') type = Math.random() < 0.6 ? 'debris' : 'satellite';
  else type = Math.random() < 0.55 ? 'meteor' : 'satellite';

  const base = { type, x, y, born: y, phase: rand(0, TAU), r: 16 };
  if (type === 'bird') Object.assign(base, { r: 14, amp: rand(30, 70), freq: rand(1.5, 2.6), flap: 0 });
  if (type === 'balloon') Object.assign(base, { r: 22, driftX: rand(-8, 8) });
  if (type === 'debris') Object.assign(base, { r: rand(14, 24), vx: rand(-20, 20), rot: 0, vr: rand(-2, 2) });
  if (type === 'satellite') Object.assign(base, { r: 20, vx: rand(-14, 14), rot: 0, vr: rand(-0.6, 0.6) });
  if (type === 'meteor') Object.assign(base, { r: rand(10, 16), vx: rand(-140, -60) * (Math.random() < 0.5 ? -1 : 1), vy: rand(-260, -180) });
  obstacles.push(base);
}

function spawnCollectible(maxAltitudeReached) {
  const y = maxAltitudeReached + rand(H * 0.7, H * 1.4);
  const x = rand(-W * 0.4, W * 0.4);
  const roll = Math.random();
  const type = roll < 0.55 ? 'fuel' : (roll < 0.85 ? 'orb' : 'boost');
  collectibles.push({ type, x, y, r: type === 'boost' ? 16 : 12, phase: rand(0, TAU) });
}

function updateObstacles(dt, camAltitude) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.phase += dt;
    if (o.type === 'bird') { o.x += Math.sin(o.phase * o.freq) * o.amp * dt * 0.6; o.flap += dt; }
    if (o.type === 'balloon') { o.x += o.driftX * dt; o.y -= 6 * dt; }
    if (o.type === 'debris') { o.x += o.vx * dt; o.rot += o.vr * dt; }
    if (o.type === 'satellite') { o.x += o.vx * dt; o.rot += o.vr * dt; }
    if (o.type === 'meteor') { o.x += o.vx * dt; o.y += o.vy * dt; }
    o.x = clamp(o.x, -W * 0.55, W * 0.55);
    if (o.y < camAltitude - H) obstacles.splice(i, 1);
  }
}

function updateCollectibles(dt) {
  for (const c of collectibles) c.phase += dt;
}

function drawWorldObjects(ctx, camX, camY, altitude) {
  for (const o of obstacles) {
    if (o.y < altitude - H * 1.3 || o.y > altitude + H * 1.6) continue;
    const sx = o.x - camX + W / 2;
    const sy = H * 0.65 - (o.y - camY);
    ctx.save();
    ctx.translate(sx, sy);
    if (o.type === 'bird') {
      const flap = Math.sin(o.flap * 12) * 8;
      ctx.strokeStyle = '#2b2f3a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-4, -flap, 0, 0);
      ctx.moveTo(12, 0); ctx.quadraticCurveTo(4, -flap, 0, 0);
      ctx.stroke();
    } else if (o.type === 'balloon') {
      const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, o.r);
      g.addColorStop(0, '#ff9ec8'); g.addColorStop(1, '#e0457f');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, o.r, o.r * 1.15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, o.r * 1.15); ctx.lineTo(0, o.r * 1.15 + 14); ctx.stroke();
    } else if (o.type === 'debris') {
      ctx.rotate(o.rot);
      ctx.fillStyle = '#8a8f9a';
      ctx.strokeStyle = '#4a4f58';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-o.r, -o.r * 0.4); ctx.lineTo(-o.r * 0.3, -o.r); ctx.lineTo(o.r * 0.6, -o.r * 0.5);
      ctx.lineTo(o.r, o.r * 0.3); ctx.lineTo(o.r * 0.2, o.r); ctx.lineTo(-o.r * 0.7, o.r * 0.6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (o.type === 'satellite') {
      ctx.rotate(o.rot);
      ctx.fillStyle = '#c7cdd6';
      ctx.fillRect(-6, -10, 12, 20);
      ctx.fillStyle = '#4fa8ff';
      ctx.fillRect(-24, -4, 16, 8);
      ctx.fillRect(8, -4, 16, 8);
      ctx.strokeStyle = '#7c8fa0'; ctx.lineWidth = 1;
      ctx.strokeRect(-24, -4, 16, 8);
      ctx.strokeRect(8, -4, 16, 8);
    } else if (o.type === 'meteor') {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, o.r * 3);
      g.addColorStop(0, 'rgba(255,150,90,0.9)'); g.addColorStop(1, 'rgba(255,90,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, o.r * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffdca8';
      ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  for (const c of collectibles) {
    if (c.y < altitude - H * 1.3 || c.y > altitude + H * 1.6) continue;
    const sx = c.x - camX + W / 2;
    const sy = H * 0.65 - (c.y - camY) + Math.sin(c.phase * 3) * 4;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalCompositeOperation = 'lighter';
    let color, glyph;
    if (c.type === 'fuel') { color = [79, 227, 255]; glyph = '⛽'; }
    else if (c.type === 'boost') { color = [255, 201, 74]; glyph = '★'; }
    else { color = [93, 255, 163]; glyph = '●'; }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r * 2.2);
    g.addColorStop(0, rgb(color, 0.55));
    g.addColorStop(1, rgb(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, c.r * 2.2, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgb(color, 1);
    ctx.beginPath(); ctx.arc(0, 0, c.r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  for (let i = discardedStages.length - 1; i >= 0; i--) {
    const s = discardedStages[i];
    s.y += s.vy * (1 / 60); s.vy -= 400 * (1 / 60); s.rot += s.vr * (1 / 60); s.life -= 1 / 60;
    if (s.life <= 0) { discardedStages.splice(i, 1); continue; }
    const sx = s.x - camX + W / 2;
    const sy = H * 0.65 - (s.y - camY);
    ctx.save();
    ctx.globalAlpha = clamp(s.life / 2, 0, 1);
    ctx.translate(sx, sy);
    ctx.rotate(s.rot);
    ctx.fillStyle = '#7c8fa0';
    ctx.fillRect(-9, -14, 18, 28);
    ctx.restore();
  }
}

/* ================================ FX ================================= */
function spawnExhaust(intensity, boosted) {
  const backAngle = rocket.angle + Math.PI;
  const spread = 0.32;
  for (let i = 0; i < 2; i++) {
    const a = backAngle + rand(-spread, spread);
    const speed = rand(260, 420) * intensity;
    exhaustParticles.spawn({
      x: rocket.x - Math.sin(rocket.angle) * 24,
      y: rocket.y - Math.cos(rocket.angle) * 24,
      vx: Math.sin(a) * speed + rocket.vx * 0.3,
      vy: Math.cos(a) * speed + rocket.vy * 0.3,
      life: rand(0.18, 0.34), maxLife: 0.34,
      size: rand(7, 13) * (boosted ? 1.3 : 1),
      color: boosted ? [255, 226, 150] : [255, Math.round(rand(150, 210)), 70],
      drag: 1.2, shrink: true,
    });
  }
  if (Math.random() < 0.7) {
    smokeParticles.spawn({
      x: rocket.x - Math.sin(rocket.angle) * 26 + rand(-4, 4),
      y: rocket.y - Math.cos(rocket.angle) * 26,
      vx: rand(-18, 18), vy: rand(-40, -10),
      life: rand(0.8, 1.4), maxLife: 1.4,
      size: rand(10, 18), color: [180, 190, 200], alpha: 0.35,
      drag: 0.6, shrink: false,
    });
  }
}

function spawnSparks(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const speed = rand(80, 320);
    fxParticles.spawn({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: rand(0.3, 0.7), maxLife: 0.7, size: rand(3, 6),
      color, gravity: -300, drag: 0.5, shape: 'spark',
    });
  }
}

function spawnBurst(x, y, color, count, size, life) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const speed = rand(40, 220);
    fxParticles.spawn({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: rand(life * 0.6, life), maxLife: life, size: rand(size * 0.5, size),
      color, drag: 0.9, shrink: true,
    });
  }
}

function spawnConfetti(x, y) {
  const colors = [[255, 201, 74], [79, 227, 255], [93, 255, 163], [255, 79, 109], [186, 139, 255]];
  for (let i = 0; i < 60; i++) {
    const a = rand(0, TAU);
    const speed = rand(120, 420);
    fxParticles.spawn({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed + 100,
      life: rand(1, 2), maxLife: 2, size: rand(3, 6),
      color: colors[randInt(0, colors.length - 1)], gravity: -260, drag: 0.4,
    });
  }
}

let shakeAmt = 0;
function addShake(v) { shakeAmt = Math.min(shakeAmt + v, 28); }

/* ============================ GAME STATE ============================ */
const STORAGE_KEY = 'rocketLaunchBestAltKm';
let bestAltKm = parseFloat(localStorage.getItem(STORAGE_KEY) || '0');

let state = 'start'; // start | playing | ended
let maxAltitudeReached = 0;
let maxSpeed = 0;
let flightStart = 0;
let score = 0;
let orbitReached = false;
let orbitBannerShown = false;
let obstacleTimer = 0, collectibleTimer = 0;
let lastTime = 0;

const ORBIT_ALTITUDE = 60000;
const KM_PER_UNIT = 1 / 600;

function altKm(altitude) { return Math.max(0, altitude) * KM_PER_UNIT; }

function fullReset() {
  resetRocket();
  obstacles = [];
  collectibles = [];
  discardedStages = [];
  clouds = makeClouds(26);
  maxAltitudeReached = 0;
  maxSpeed = 0;
  score = 0;
  orbitReached = false;
  orbitBannerShown = false;
  obstacleTimer = 0;
  collectibleTimer = 1.2;
  flightStart = performance.now();
  shakeAmt = 0;
}

/* ============================== UPDATE ================================ */
function updatePhysics(dt) {
  const stage = STAGES[rocket.stageIndex];
  const altitude = rocket.y;
  const airDensity = clamp(1 - altitude / 9000, 0, 1);
  const gravity = 900 * Math.max(0.4, 1 - altitude / 70000);

  rocket.thrusting = Input.thrust && rocket.fuel > 0 && rocket.alive;

  // steering
  const steerRate = 2.6;
  if (Input.left) rocket.angularVel -= steerRate * dt;
  if (Input.right) rocket.angularVel += steerRate * dt;
  if (!Input.left && !Input.right) {
    rocket.angularVel += (-rocket.angle) * 3 * dt; // spring back to vertical
  }
  rocket.angularVel *= (1 - 3 * dt);
  rocket.angle = clamp(rocket.angle + rocket.angularVel * dt, -0.62, 0.62);

  // thrust
  if (rocket.thrusting) {
    const boostMul = rocket.boostTimer > 0 ? 1.55 : 1;
    const accel = stage.thrust * boostMul;
    rocket.vx += Math.sin(rocket.angle) * accel * dt;
    rocket.vy += Math.cos(rocket.angle) * accel * dt;
    rocket.fuel -= 62 * dt;
    if (rocket.fuel <= 0) {
      rocket.fuel = 0;
      if (rocket.stageIndex < STAGES.length - 1) {
        discardedStages.push({ x: rocket.x, y: rocket.y - 20, vy: rocket.vy - 60, vx: rocket.vx, rot: rocket.angle, vr: rand(-1.5, 1.5), life: 2 });
        rocket.stageIndex++;
        rocket.fuel = STAGES[rocket.stageIndex].fuelMax;
        addShake(10);
        Audio_.stageSound();
      }
    }
    spawnExhaust(1, rocket.boostTimer > 0);
    addShake(3 * dt * 60 * 0.15);
  }

  // gravity + drag
  rocket.vy -= gravity * dt;
  const dragK = 0.0016 * airDensity;
  rocket.vx -= Math.sign(rocket.vx) * dragK * rocket.vx * rocket.vx * dt;
  rocket.vy -= Math.sign(rocket.vy) * dragK * 0.5 * rocket.vy * rocket.vy * dt;

  // light wind in low atmosphere
  if (altitude < 12000) rocket.vx += Math.sin(performance.now() * 0.0004 + altitude * 0.001) * 6 * airDensity * dt;

  // soft speed cap so ascent stays controllable even in thin/vacuum air
  const curSpeed = Math.hypot(rocket.vx, rocket.vy);
  if (curSpeed > MAX_SPEED) {
    const over = curSpeed - MAX_SPEED;
    const decel = over * 2.5 * dt;
    rocket.vx -= (rocket.vx / curSpeed) * decel;
    rocket.vy -= (rocket.vy / curSpeed) * decel;
  }

  rocket.x += rocket.vx * dt;
  rocket.y += rocket.vy * dt;

  // soft horizontal bounds
  const limit = W * 0.46;
  if (rocket.x > limit) { rocket.x = limit; rocket.vx = Math.min(0, rocket.vx); }
  if (rocket.x < -limit) { rocket.x = -limit; rocket.vx = Math.max(0, rocket.vx); }

  if (rocket.y < 0) { rocket.y = 0; if (rocket.vy < 0) rocket.vy = 0; }

  if (rocket.boostTimer > 0) rocket.boostTimer -= dt;
  if (rocket.invuln > 0) rocket.invuln -= dt;

  Audio_.setEngineIntensity(rocket.thrusting ? 1 : 0);

  maxAltitudeReached = Math.max(maxAltitudeReached, rocket.y);
  const speed = Math.hypot(rocket.vx, rocket.vy);
  maxSpeed = Math.max(maxSpeed, speed);

  // crash: hit the ground with real downward speed after leaving it
  if (rocket.y <= 0.5 && rocket.vy <= 0 && maxAltitudeReached > 400 && rocket.alive) {
    if (maxAltitudeReached > 1200 || rocket.vy < -60) crashRocket();
  }
}

function crashRocket() {
  if (!rocket.alive) return;
  rocket.alive = false;
  spawnBurst(rocket.x, rocket.y, [255, 140, 60], 40, 14, 0.7);
  spawnSparks(rocket.x, rocket.y, [255, 220, 150], 30);
  addShake(26);
  Audio_.explosionSound();
  Audio_.stopEngine();
  endGame(false);
}

function checkCollisions() {
  if (rocket.invuln > 0 || !rocket.alive) return;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    const d = Math.hypot(o.x - rocket.x, o.y - rocket.y);
    if (d < o.r + rocket.radius * 0.7) {
      if (rocket.boostTimer > 0) { // invulnerable while boosted — smash through
        spawnSparks(o.x, o.y, [255, 201, 74], 14);
        obstacles.splice(i, 1);
        continue;
      }
      const dmg = { bird: 18, balloon: 10, debris: 26, satellite: 30, meteor: 40 }[o.type] || 20;
      rocket.hull -= dmg;
      rocket.invuln = 1.1;
      obstacles.splice(i, 1);
      spawnSparks(rocket.x, rocket.y, [255, 90, 90], 20);
      addShake(14);
      Audio_.hitSound();
      if (rocket.hull <= 0) { rocket.hull = 0; crashRocket(); }
      break;
    }
  }
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    const d = Math.hypot(c.x - rocket.x, c.y - rocket.y);
    if (d < c.r + rocket.radius * 0.8) {
      collectibles.splice(i, 1);
      spawnBurst(c.x, c.y, c.type === 'fuel' ? [79, 227, 255] : c.type === 'boost' ? [255, 201, 74] : [93, 255, 163], 16, 6, 0.5);
      if (c.type === 'fuel') {
        rocket.fuel = Math.min(STAGES[rocket.stageIndex].fuelMax, rocket.fuel + 160);
        score += 20;
        Audio_.collectSound();
      } else if (c.type === 'boost') {
        rocket.boostTimer = 5;
        rocket.hull = Math.min(100, rocket.hull + 8);
        score += 40;
        Audio_.boostSound();
      } else {
        score += 60;
        Audio_.collectSound();
      }
    }
  }
}

function updateSpawning(dt) {
  obstacleTimer -= dt;
  collectibleTimer -= dt;
  const band = altitudeBand(maxAltitudeReached);
  const obstacleInterval = band === 'low' ? 1.1 : band === 'mid' ? 0.9 : band === 'high' ? 0.75 : 0.65;
  if (obstacleTimer <= 0) {
    spawnObstacle(Math.max(maxAltitudeReached, rocket.y));
    obstacleTimer = obstacleInterval * rand(0.7, 1.3);
  }
  if (collectibleTimer <= 0) {
    spawnCollectible(Math.max(maxAltitudeReached, rocket.y));
    collectibleTimer = rand(1.4, 2.6);
  }
}

function checkOrbit() {
  if (!orbitReached && rocket.y >= ORBIT_ALTITUDE) {
    orbitReached = true;
    showBanner('ORBIT ACHIEVED!');
    spawnConfetti(rocket.x, rocket.y);
    Audio_.orbitFanfare();
  }
}

/* =============================== HUD =============================== */
const el = (id) => document.getElementById(id);
const hudAltKm = el('hud-alt-km'), hudScore = el('hud-score'), hudSpeed = el('hud-speed');
const orbitFill = el('orbit-fill');
const hullFill = el('hull-fill'), fuelFill = el('fuel-fill');
const stageLabel = el('stage-label'), stagePips = document.querySelectorAll('#stage-pips .pip');
const banner = el('banner');
let bannerTimeout = null;

function showBanner(text) {
  banner.textContent = text;
  banner.hidden = false;
  requestAnimationFrame(() => banner.classList.add('show'));
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => { banner.hidden = true; }, 400);
  }, 2200);
}

function updateHUD() {
  hudAltKm.textContent = altKm(rocket.y).toFixed(1);
  hudScore.textContent = String(Math.floor(score + altKm(maxAltitudeReached) * 100));
  hudSpeed.textContent = Math.round(Math.hypot(rocket.vx, rocket.vy) * 0.36).toString();
  orbitFill.style.width = clamp((rocket.y / ORBIT_ALTITUDE) * 100, 0, 100) + '%';

  hullFill.style.width = clamp(rocket.hull, 0, 100) + '%';
  hullFill.classList.toggle('warn', rocket.hull <= 50 && rocket.hull > 25);
  hullFill.classList.toggle('crit', rocket.hull <= 25);

  const stage = STAGES[rocket.stageIndex];
  fuelFill.style.width = clamp((rocket.fuel / stage.fuelMax) * 100, 0, 100) + '%';
  stageLabel.textContent = stage.label;
  stagePips.forEach((pip, i) => {
    pip.classList.toggle('active', i === rocket.stageIndex);
    pip.classList.toggle('used', i < rocket.stageIndex);
  });
}

/* ============================== RENDER =============================== */
function drawBackground(altitude) {
  const sky = skyAt(altitude);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, rgb(sky.top));
  grad.addColorStop(1, rgb(sky.bottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // sun / glow near ground fading with altitude
  const sunAlpha = clamp(1 - altitude / 20000, 0, 1) * 0.5;
  if (sunAlpha > 0.01) {
    const g = ctx.createRadialGradient(W * 0.78, H * 0.22, 0, W * 0.78, H * 0.22, 260);
    g.addColorStop(0, `rgba(255,244,214,${sunAlpha})`);
    g.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // stars
  if (sky.star > 0.02) {
    ctx.save();
    ctx.globalAlpha = sky.star;
    const t = performance.now() * 0.001;
    for (const layer of starLayers) {
      for (const s of layer.stars) {
        const sx = ((s.x - altitude * 0 + W * 5) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
        const sy = (((s.y - altitude * layer.speed) % (H * 3)) + H * 3) % (H * 3) - H;
        const tw = 0.6 + Math.sin(t * 2 + s.tw) * 0.4;
        ctx.fillStyle = `rgba(255,255,255,${tw})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * layer.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // haze band (upper atmosphere glow)
  if (sky.haze > 0.01) {
    ctx.fillStyle = `rgba(140,170,255,${sky.haze * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawClouds(camX, camY, altitude) {
  if (altitude > 30000) return;
  const fade = clamp(1 - altitude / 26000, 0, 1);
  for (const c of clouds) {
    c.x += c.speed * (1 / 60);
    if (c.x - camX > W) c.x -= W * 2.2;
    if (c.x - camX < -W * 1.2) c.x += W * 2.2;
    const sx = c.x - camX + W / 2;
    const sy = H * 0.65 - (c.y - camY);
    if (sy < -200 || sy > H + 200) continue;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, c.w * 0.6);
    g.addColorStop(0, `rgba(255,255,255,${c.alpha * fade})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, sy, c.w * 0.6, c.h * 0.6, 0, 0, TAU);
    ctx.fill();
  }
}

function drawGround(camX, camY, altitude) {
  if (altitude > 3400) return;
  const sy = H * 0.65 - (0 - camY);
  const fade = clamp(1 - altitude / 3200, 0, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  const g = ctx.createLinearGradient(0, sy, 0, sy + 400);
  g.addColorStop(0, '#3c6b45');
  g.addColorStop(1, '#22402a');
  ctx.fillStyle = g;
  ctx.fillRect(0, sy, W, 400);

  // launch tower silhouette
  const towerX = -140 - camX + W / 2;
  ctx.fillStyle = '#5a6472';
  ctx.fillRect(towerX, sy - 220, 10, 220);
  ctx.fillRect(towerX - 30, sy - 20, 70, 20);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff5a5a' : '#5a6472';
    ctx.beginPath();
    ctx.arc(towerX + 5, sy - 30 - i * 44, 3, 0, TAU);
    ctx.fill();
  }

  // buildings
  ctx.fillStyle = '#33455a';
  const buildingXs = [-360, -260, 220, 320, 400];
  buildingXs.forEach((bx, i) => {
    const bw = 46 + (i % 3) * 10;
    const bh = 60 + (i % 4) * 30;
    const sx = bx - camX + W / 2;
    ctx.fillRect(sx, sy - bh, bw, bh);
  });

  // pad flame trench glow
  const padX = -camX + W / 2;
  const pg = ctx.createRadialGradient(padX, sy, 0, padX, sy, 90);
  pg.addColorStop(0, 'rgba(255,180,90,0.35)');
  pg.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(padX, sy, 90, 0, TAU); ctx.fill();

  ctx.restore();
}

function render() {
  const camX = rocket.x, camY = rocket.y;
  const altitude = rocket.y;

  drawBackground(altitude);
  drawClouds(camX, camY, altitude);
  drawGround(camX, camY, altitude);

  smokeParticles.draw(ctx, camX, camY, false);
  drawWorldObjects(ctx, camX, camY, altitude);

  if (rocket.alive) {
    const wobble = shakeAmt > 0 ? rand(-0.02, 0.02) : 0;
    drawRocket(ctx, camX, camY, wobble);
  }

  exhaustParticles.draw(ctx, camX, camY, true);
  fxParticles.draw(ctx, camX, camY, true);
}

/* ================================ LOOP ================================ */
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1 / 30);

  if (state === 'playing') {
    updatePhysics(dt);
    checkCollisions();
    updateObstacles(dt, rocket.y);
    updateCollectibles(dt);
    updateSpawning(dt);
    checkOrbit();
    updateHUD();
  }
  exhaustParticles.update(dt);
  smokeParticles.update(dt);
  fxParticles.update(dt);
  shakeAmt *= 0.86;
  if (shakeAmt < 0.05) shakeAmt = 0;

  ctx.save();
  if (shakeAmt > 0) {
    ctx.translate(rand(-shakeAmt, shakeAmt), rand(-shakeAmt, shakeAmt));
  }
  render();
  ctx.restore();
}
requestAnimationFrame(frame);

/* ============================ SCREEN FLOW ============================ */
const startScreen = el('start-screen');
const endScreen = el('end-screen');
const hud = el('hud');
const bestAltitudeEl = el('best-altitude');
bestAltitudeEl.textContent = bestAltKm.toFixed(1);

function endGame(won) {
  state = 'ended';
  const km = altKm(maxAltitudeReached);
  if (km > bestAltKm) {
    bestAltKm = km;
    localStorage.setItem(STORAGE_KEY, String(bestAltKm));
  }
  const flightTime = Math.round((performance.now() - flightStart) / 1000);
  const finalScore = Math.floor(score + km * 100);

  el('end-title').textContent = orbitReached ? 'ORBIT ACHIEVED' : 'MISSION ENDED';
  el('end-tagline').textContent = orbitReached
    ? 'Your rocket broke through to space before it went down.'
    : 'The rocket didn\'t make it. Fuel up and try again.';
  el('stat-altitude').textContent = km.toFixed(1) + ' km';
  el('stat-speed').textContent = Math.round(maxSpeed * 0.36) + ' m/s';
  el('stat-time').textContent = flightTime + 's';
  el('stat-score').textContent = String(finalScore);
  bestAltitudeEl.textContent = bestAltKm.toFixed(1);

  setTimeout(() => {
    hud.hidden = true;
    touchControls.hidden = true;
    endScreen.hidden = false;
  }, 900);
}

function startGame() {
  Audio_.init();
  fullReset();
  state = 'playing';
  startScreen.hidden = true;
  endScreen.hidden = true;
  hud.hidden = false;
  if (isTouch) touchControls.hidden = false;
  Audio_.startEngine();
}

el('launch-btn').addEventListener('click', startGame);
el('retry-btn').addEventListener('click', startGame);

let muted = localStorage.getItem('rocketLaunchMuted') === '1';
const muteBtn = el('mute-btn');
function applyMute() {
  Audio_.setMuted(muted);
  muteBtn.textContent = muted ? '🔇' : '🔊';
}
muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('rocketLaunchMuted', muted ? '1' : '0');
  applyMute();
});

/* touch controls */
bindHold(el('touch-thrust'), () => Input.thrust = true, () => Input.thrust = false);
bindHold(el('touch-left'), () => Input.left = true, () => Input.left = false);
bindHold(el('touch-right'), () => Input.right = true, () => Input.right = false);

// also allow press-and-hold anywhere on the canvas as thrust on touch devices
if (isTouch) {
  canvas.addEventListener('pointerdown', () => { if (state === 'playing') Input.thrust = true; });
  canvas.addEventListener('pointerup', () => Input.thrust = false);
  canvas.addEventListener('pointercancel', () => Input.thrust = false);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Input.thrust = false; Input.left = false; Input.right = false; }
});

// init mute icon state on load (audio ctx not created until first launch)
muteBtn.textContent = muted ? '🔇' : '🔊';
