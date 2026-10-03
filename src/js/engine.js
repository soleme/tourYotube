'use strict';
// =====================================================================
//  engine.js — 캔버스, 유틸, 도트 텍스트, 입력, 사운드
// =====================================================================
const W = 320, H = 180;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  c.g = g;
  return c;
}

// ---------- 수학/랜덤 ----------
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const avg = arr => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
function weighted(list) {
  let t = 0;
  for (const x of list) t += x.w;
  let r = Math.random() * t;
  for (const x of list) if ((r -= x.w) < 0) return x;
  return list[list.length - 1];
}
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(seed) {
  let s = typeof seed === 'string' ? hashStr(seed) : seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const won = n => (n < 0 ? '-' : '') + '₩' + fmt(Math.abs(n));
function kNum(n) {
  n = Math.floor(n);
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n >= 1e8) s = (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '억';
  else if (n >= 1e4) s = (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '만';
  else if (n >= 1e3) s = (n / 1e3).toFixed(1).replace(/\.0$/, '') + '천';
  else s = String(n);
  return (neg ? '-' : '') + s;
}

// ---------- 색 ----------
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgb2hex(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
const mixCache = new Map();
function mix(a, b, t) {
  t = Math.round(clamp(t, 0, 1) * 20) / 20;
  const k = a + b + t;
  let v = mixCache.get(k);
  if (!v) {
    const A = hex2rgb(a), B = hex2rgb(b);
    v = rgb2hex(Math.round(lerp(A[0], B[0], t)), Math.round(lerp(A[1], B[1], t)), Math.round(lerp(A[2], B[2], t)));
    mixCache.set(k, v);
  }
  return v;
}
const shade = (c, amt) => (amt > 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt));

// ---------- 도트 그리기 ----------
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
function hline(g, x, y, w, c) { rect(g, x, y, w, 1, c); }
function vline(g, x, y, h, c) { rect(g, x, y, 1, h, c); }
// 위로 뾰족한 삼각형 (x=왼쪽, y=꼭대기)
function tri(g, x, y, w, h, c) {
  g.fillStyle = c;
  for (let i = 0; i < h; i++) {
    const ww = Math.max(1, Math.round(w * (i + 1) / h));
    g.fillRect(Math.round(x + (w - ww) / 2), Math.round(y + i), ww, 1);
  }
}
function circ(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
// 반원(돔) — 바닥이 cy
function dome(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = -r; y <= 0; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.6));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function line(g, x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  g.fillStyle = c;
  for (let i = 0; i < 2000; i++) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
const patCache = new Map();
function checker(c1, c2) {
  const k = c1 + '|' + c2;
  let p = patCache.get(k);
  if (!p) {
    const c = makeCanvas(2, 2);
    c.g.fillStyle = c1; c.g.fillRect(0, 0, 2, 2);
    if (c2) { c.g.fillStyle = c2; c.g.fillRect(0, 0, 1, 1); c.g.fillRect(1, 1, 1, 1); }
    else { c.g.clearRect(0, 0, 1, 1); c.g.clearRect(1, 1, 1, 1); }
    p = ctx.createPattern(c, 'repeat');
    patCache.set(k, p);
  }
  return p;
}
function dither(g, x, y, w, h, c1, c2) { g.fillStyle = checker(c1, c2); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

// ---------- 스프라이트 ----------
const sprCache = new Map();
function sprite(rows, pal, key) {
  if (key && sprCache.has(key)) return sprCache.get(key);
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (col) { c.g.fillStyle = col; c.g.fillRect(x, y, 1, 1); }
    }
  }
  if (key) sprCache.set(key, c);
  return c;
}
function drawSpr(g, s, x, y, flip = false, scale = 1) {
  x = Math.round(x); y = Math.round(y);
  if (flip) {
    g.save(); g.translate(x + s.width * scale, y); g.scale(-1, 1);
    g.drawImage(s, 0, 0, s.width * scale, s.height * scale);
    g.restore();
  } else if (scale !== 1) g.drawImage(s, x, y, s.width * scale, s.height * scale);
  else g.drawImage(s, x, y);
}
// 실루엣(단색) 버전
function silhouette(s, color) {
  const key = s;
  if (!s._sil) s._sil = {};
  if (s._sil[color]) return s._sil[color];
  const c = makeCanvas(s.width, s.height);
  c.g.drawImage(s, 0, 0);
  c.g.globalCompositeOperation = 'source-in';
  c.g.fillStyle = color; c.g.fillRect(0, 0, s.width, s.height);
  s._sil[color] = c;
  return c;
}

// ---------- 도트 텍스트 (Galmuri) ----------
const FS = '10px Galmuri9';      // 작은 글씨 (10px 기준 폰트)
const FM = '12px Galmuri11';     // 보통 글씨 (12px 기준 폰트)
const FB = 'bold 12px Galmuri11';
const mctx = makeCanvas(4, 4).g;
function measure(str, font = FS) { mctx.font = font; return mctx.measureText(str).width; }
const txtCache = new Map();
function txtBitmap(str, font, color) {
  const key = font + '|' + color + '|' + str;
  let c = txtCache.get(key);
  if (c) return c;
  if (txtCache.size > 800) txtCache.clear();
  const size = parseInt(font.replace('bold ', ''), 10) || 10;
  const w = Math.max(1, Math.ceil(measure(str, font))) + 2, h = size + 4;
  c = makeCanvas(w, h);
  const g = c.g;
  g.font = font; g.textBaseline = 'top'; g.fillStyle = color;
  g.fillText(str, 1, 1);
  try {
    const id = g.getImageData(0, 0, w, h), d = id.data, rgb = hex2rgb(color);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] >= 100) { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; }
      else d[i + 3] = 0;
    }
    g.putImageData(id, 0, 0);
  } catch (e) { /* 일부 환경에서 getImageData 실패 → 원본 사용 */ }
  txtCache.set(key, c);
  return c;
}
function textWidth(str, font = FS) { return Math.ceil(measure(String(str), font)); }
function text(g, str, x, y, color = '#ffffff', o = {}) {
  str = String(str);
  const font = o.font || FS;
  const bm = txtBitmap(str, font, color);
  const w = bm.width - 2;
  let dx = Math.round(x) - 1;
  if (o.align === 'center') dx -= Math.floor(w / 2);
  else if (o.align === 'right') dx -= w;
  const dy = Math.round(y) - 1;
  if (o.outline) {
    const ob = txtBitmap(str, font, o.outline);
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(ob, dx + ox, dy + oy);
  } else if (o.shadow) g.drawImage(txtBitmap(str, font, o.shadow), dx + 1, dy + 1);
  g.drawImage(bm, dx, dy);
  return w;
}

// ---------- 입력 ----------
const Input = { down: {}, pressed: {}, click: null };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'a', Enter: 'a', KeyZ: 'a', KeyJ: 'a', NumpadEnter: 'a',
  Escape: 'b', KeyX: 'b', KeyK: 'b', Backspace: 'b',
  KeyM: 'mute', Tab: 'menu', KeyQ: 'menu',
};
function vkey(k, isDown, repeat = false) {
  Snd.init();
  if (isDown) {
    if (k === 'mute' && !repeat) { Snd.toggle(); return; }
    if (UI.isOpen()) { if (!repeat || k === 'up' || k === 'down' || k === 'left' || k === 'right') UI.key(k); Input.down[k] = true; return; }
    if (!Input.down[k] && !repeat) Input.pressed[k] = true;
    Input.down[k] = true;
  } else Input.down[k] = false;
}
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); UI.key('a'); }
    else if (e.code === 'Escape') { e.preventDefault(); UI.key('b'); }
    return;
  }
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  vkey(k, true, e.repeat);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) Input.down[k] = false; });
addEventListener('blur', () => { Input.down = {}; });
cv.addEventListener('pointerdown', e => {
  Snd.init();
  if (UI.isOpen()) return;
  const r = cv.getBoundingClientRect();
  Input.click = { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
});
function endFrameInput() { Input.pressed = {}; Input.click = null; }

// ---------- 사운드 (WebAudio 칩튠) ----------
const Snd = {
  ac: null, master: null, sfx: null, mus: null, muted: false, noiseBuf: null,
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ac = new AC(); } catch (e) { return; }
    this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(this.ac.destination);
    this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.6; this.sfx.connect(this.master);
    this.mus = this.ac.createGain(); this.mus.gain.value = 0.28; this.mus.connect(this.master);
    const len = this.ac.sampleRate;
    this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (Music.pending) { const p = Music.pending; Music.pending = null; Music.play(p); }
  },
  tone(f, d, o = {}) {
    if (!this.ac || this.muted) return;
    const t = o.at || this.ac.currentTime + (o.delay || 0);
    const osc = this.ac.createOscillator(), g = this.ac.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f + o.slide), t + d);
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(o.out || this.sfx);
    osc.start(t); osc.stop(t + d + 0.03);
  },
  noise(d, o = {}) {
    if (!this.ac || this.muted) return;
    const t = o.at || this.ac.currentTime + (o.delay || 0);
    const src = this.ac.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ac.createBiquadFilter(); f.type = o.lp ? 'lowpass' : 'highpass'; f.frequency.value = o.lp || o.hp || 1000;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(o.vol == null ? 0.2 : o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(o.out || this.sfx);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.03);
  },
  play(name) { const f = SFX[name]; if (f) f(this); },
  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    try { localStorage.setItem('tdtv_mute', this.muted ? '1' : '0'); } catch (e) { }
    UI.toast(this.muted ? '소리 끔 (M)' : '소리 켬 (M)');
    if (typeof updateSoundBtn === 'function') updateSoundBtn();
  },
};
try { Snd.muted = localStorage.getItem('tdtv_mute') === '1'; } catch (e) { }
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  blip: s => s.tone(1046, 0.03, { vol: 0.05 }),
  type: s => s.tone(rand(700, 760), 0.025, { vol: 0.035 }),
  move: s => s.tone(660, 0.04, { vol: 0.08 }),
  select: s => { s.tone(784, 0.05, { vol: 0.12 }); s.tone(1175, 0.08, { vol: 0.12, delay: 0.05 }); },
  cancel: s => s.tone(392, 0.09, { vol: 0.12, slide: -150 }),
  coin: s => { s.tone(988, 0.06, { vol: 0.14 }); s.tone(1319, 0.2, { vol: 0.14, delay: 0.06 }); },
  spend: s => { s.tone(1319, 0.05, { vol: 0.1 }); s.tone(988, 0.12, { vol: 0.1, delay: 0.05 }); },
  bad: s => { s.tone(220, 0.15, { type: 'sawtooth', vol: 0.12 }); s.tone(160, 0.3, { type: 'sawtooth', vol: 0.12, delay: 0.14, slide: -60 }); },
  good: s => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.12, { vol: 0.12, delay: i * 0.07 })),
  shutter: s => { s.noise(0.05, { vol: 0.35, hp: 3000 }); s.noise(0.06, { vol: 0.25, hp: 1800, delay: 0.07 }); },
  step: s => s.noise(0.025, { vol: 0.04, lp: 900 }),
  eat: s => { s.noise(0.05, { vol: 0.18, lp: 1200 }); s.tone(rand(150, 240), 0.05, { vol: 0.07, type: 'triangle' }); },
  hit: s => s.tone(1568, 0.06, { vol: 0.1 }),
  perfect: s => { s.tone(1568, 0.05, { vol: 0.1 }); s.tone(2093, 0.08, { vol: 0.1, delay: 0.04 }); },
  miss: s => s.tone(130, 0.12, { vol: 0.12, type: 'sawtooth' }),
  door: s => { s.noise(0.08, { vol: 0.15, lp: 600 }); s.tone(330, 0.05, { vol: 0.06, delay: 0.05 }); },
  ding: s => { s.tone(1319, 0.25, { vol: 0.12, type: 'triangle' }); s.tone(1047, 0.4, { vol: 0.12, type: 'triangle', delay: 0.18 }); },
  plane: s => { s.noise(1.6, { vol: 0.12, lp: 500 }); s.tone(110, 1.4, { vol: 0.05, type: 'sawtooth', slide: 60 }); },
  whoosh: s => s.noise(0.3, { vol: 0.15, hp: 1500 }),
  jump: s => s.tone(400, 0.12, { vol: 0.1, slide: 500 }),
  fanfare: s => {
    const n = [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3], [784, 0.45], [1047, 0.55]];
    n.forEach(([f, d]) => { s.tone(f, 0.18, { vol: 0.13, delay: d }); s.tone(f / 2, 0.18, { vol: 0.08, delay: d, type: 'triangle' }); });
    s.tone(1319, 0.6, { vol: 0.13, delay: 0.7 }); s.tone(659, 0.6, { vol: 0.08, delay: 0.7, type: 'triangle' });
  },
  viral: s => {
    for (let i = 0; i < 8; i++) s.tone(400 + i * 120, 0.08, { vol: 0.1, delay: i * 0.05 });
    s.tone(1568, 0.5, { vol: 0.12, delay: 0.45 }); s.noise(0.5, { vol: 0.12, hp: 4000, delay: 0.45 });
  },
  tick: s => s.tone(2000, 0.015, { vol: 0.04 }),
};

// ---------- 음악 시퀀서 (도시마다 절차적 생성) ----------
const SCALES = {
  majPenta: [0, 2, 4, 7, 9], minPenta: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], japanese: [0, 1, 5, 7, 8], hijaz: [0, 1, 4, 5, 7, 8, 10],
  bhairav: [0, 1, 4, 5, 7, 8, 11], blues: [0, 3, 5, 6, 7, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
};
const trackCache = {};
function genTrack(id, o) {
  if (trackCache[id]) return trackCache[id];
  const r = seeded(id + '♪');
  const sc = SCALES[o.scale] || SCALES.majPenta, n = sc.length;
  const deg = d => sc[((d % n) + n) % n] + 12 * Math.floor(d / n);
  const len = 64;
  const mel = Array(len).fill(null), mlen = Array(len).fill(1), bass = Array(len).fill(null), drum = Array(len).fill(0);
  const prog = o.prog || [0, Math.floor(n * 0.6), Math.floor(n * 0.8), 0];
  const motif = [];
  let p = n + Math.floor(r() * 3);
  for (let i = 0; i < 32; i++) {
    const strong = i % 4 === 0, eighth = i % 2 === 0;
    const pr = strong ? 0.85 : eighth ? (o.busy || 0.45) : (o.busy || 0.45) * 0.3;
    if (r() < pr) { p = clamp(p + Math.round((r() - 0.5) * 4), n - 2, n * 2 + 2); motif.push(p); }
    else motif.push(null);
  }
  for (let i = 0; i < len; i++) {
    const bar = Math.floor(i / 16);
    let m = motif[i % 32];
    if (bar === 3 && i % 16 >= 8) m = (i % 4 === 0) ? n + (i % 16 === 12 ? 0 : 2) : null; // 마무리
    if (bar === 2 && m != null && r() < 0.3) m += 1;
    mel[i] = m == null ? null : o.root + deg(m) + (o.mel8 || 0);
    const chordDeg = prog[bar];
    if (i % 8 === 0 || (o.syncBass && i % 16 === 6)) bass[i] = o.root - 12 + deg(chordDeg);
    else if (i % 8 === 4 && o.walkBass) bass[i] = o.root - 12 + deg(chordDeg + 2);
    drum[i] = (i % 8 === 0) ? 1 : (i % 8 === 4) ? 2 : (i % 2 === 0 ? 3 : 0);
    if (o.latin && (i % 16 === 3 || i % 16 === 11)) drum[i] = 1;
  }
  for (let i = 0; i < len; i++) if (mel[i] != null) { let l = 1; while (i + l < len && mel[i + l] == null && l < 4) l++; mlen[i] = l; }
  const t = { id, bpm: o.bpm || 110, lead: o.lead || 'square', mel, mlen, bass, drum, len, drums: o.drums !== false };
  trackCache[id] = t;
  return t;
}
const Music = {
  cur: null, timer: null, step: 0, nextT: 0, pending: null,
  play(track) {
    if (!track) return this.stop();
    if (this.cur && this.cur.id === track.id) return;
    this.stop();
    if (!Snd.ac) { this.pending = track; return; }
    this.cur = track; this.step = 0; this.nextT = Snd.ac.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop() { clearInterval(this.timer); this.timer = null; this.cur = null; },
  tick() {
    const ac = Snd.ac, tr = this.cur;
    if (!ac || !tr) return;
    if (Snd.muted) { this.nextT = ac.currentTime + 0.05; return; }
    const spb = 60 / tr.bpm / 4;
    if (this.nextT < ac.currentTime - 0.3) this.nextT = ac.currentTime + 0.05;
    while (this.nextT < ac.currentTime + 0.12) {
      const i = this.step % tr.len, t = this.nextT;
      if (tr.mel[i] != null) Snd.tone(midi(tr.mel[i]), spb * tr.mlen[i] * 0.95, { type: tr.lead, vol: 0.09, out: Snd.mus, at: t });
      if (tr.bass[i] != null) Snd.tone(midi(tr.bass[i]), spb * 3.5, { type: 'triangle', vol: 0.22, out: Snd.mus, at: t });
      if (tr.drums) {
        const d = tr.drum[i];
        if (d === 1) Snd.tone(120, 0.1, { type: 'sine', vol: 0.3, slide: -70, out: Snd.mus, at: t });
        else if (d === 2) Snd.noise(0.09, { vol: 0.14, hp: 1500, out: Snd.mus, at: t });
        else if (d === 3) Snd.noise(0.02, { vol: 0.05, hp: 7000, out: Snd.mus, at: t });
      }
      this.nextT += spb; this.step++;
    }
  },
};
