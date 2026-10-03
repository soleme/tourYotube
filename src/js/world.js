'use strict';
// =====================================================================
//  world.js — 랜드마크, 건물, 거리, 하늘(시간/날씨)
// =====================================================================
// 레이어 기준선
const FAR_BASE = 132, MID_BASE = 141, WALK_Y = 134, SIDEWALK_Y = 140, CURB_Y = 157;
const WORLD_W = 640;
const PARALLAX = { far: 0.3, mid: 0.6 };
const SPOT_PHOTO_X = 300;
const LM_FAR_X = Math.round(160 + (SPOT_PHOTO_X - 160) * PARALLAX.far);   // 202
const LM_MID_X = Math.round(160 + (SPOT_PHOTO_X - 160) * PARALLAX.mid);   // 244

// ---------- 공통 지형 ----------
function mountain(g, cx, by, w, h, col, snow, snowFrac = 0.25, flat = 0, seed = 'm') {
  const r = seeded(seed + cx + w);
  const snowLine = [];
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = flat / 2 + (w / 2 - flat / 2) * t;
    const yy = by - h + y;
    rect(g, cx - half, yy, half * 2 + 1, 1, t < snowFrac ? snow : col);
    if (y > 2 && t >= snowFrac - 0.02 && t < snowFrac + 0.02) snowLine.push([half, yy]);
  }
  if (snow && snowLine.length) {
    const [half, yy] = snowLine[0];
    for (let x = -half; x <= half; x += 2) { const d = Math.floor(r() * 5); vline(g, cx + x, yy, d, snow); }
  }
  // 그늘 (오른쪽)
  g.save(); g.globalAlpha = 0.18;
  for (let y = 0; y < h; y++) { const t = y / h; const half = flat / 2 + (w / 2 - flat / 2) * t; rect(g, cx + half * 0.25, by - h + y, half * 0.75 + 1, 1, '#1b1530'); }
  g.restore();
}
function hills(g, x0, w, by, h, col, seed) {
  const r = seeded(seed);
  const ph = r() * 10, f1 = 0.02 + r() * 0.02, f2 = 0.05 + r() * 0.03;
  for (let x = 0; x < w; x++) {
    const hh = Math.round(h * (0.55 + 0.3 * Math.sin(x * f1 + ph) + 0.15 * Math.sin(x * f2 + ph * 2)));
    vline(g, x0 + x, by - hh, hh + 20, col);
  }
}
function water(g, x, y, w, h, c1, c2, seed = 'w') {
  rect(g, x, y, w, h, c1);
  const r = seeded(seed);
  for (let i = 0; i < w * h / 40; i++) hline(g, x + r() * w, y + 2 + r() * (h - 2), 2 + r() * 5, c2);
}
function treeRound(g, x, by, s, c1, c2) {
  rect(g, x - 1, by - 6 * s, 2, 6 * s, '#6b4a32');
  circ(g, x, by - 8 * s, Math.round(5 * s), c1);
  circ(g, x - 1, by - 9 * s, Math.round(3 * s), c2);
}
function treePalm(g, x, by, s) {
  const h = Math.round(22 * s);
  for (let i = 0; i < h; i++) px(g, x + Math.round(Math.sin(i / h * 1.2) * 3), by - i, i % 3 ? '#8a6a44' : '#6b4f30');
  const tx = x + Math.round(Math.sin(1.2) * 3), ty = by - h;
  const leaf = '#3f9a4a', leaf2 = '#2f7a3a';
  for (const [dx, dy] of [[-8, 3], [8, 3], [-6, -2], [6, -2], [-10, 6], [10, 6]]) line(g, tx, ty, tx + dx * s, ty + dy * s, dy > 2 ? leaf2 : leaf);
  rect(g, tx - 1, ty, 3, 2, '#5a4026');
}
function treeAcacia(g, x, by, s, col = '#5b7a3a') {
  const h = Math.round(16 * s);
  vline(g, x, by - h, h, '#4a3624'); line(g, x, by - h + 5, x - 5 * s, by - h, '#4a3624'); line(g, x, by - h + 4, x + 6 * s, by - h, '#4a3624');
  rect(g, x - 13 * s, by - h - 3 * s, 26 * s, 3 * s, col);
  rect(g, x - 10 * s, by - h - 5 * s, 20 * s, 2 * s, shade(col, 0.15));
}
function treePine(g, x, by, s, snow) {
  rect(g, x - 1, by - 4, 2, 4, '#5a3d2a');
  for (let i = 0; i < 3; i++) tri(g, x - (7 - i * 2) * s, by - 4 - (i + 1) * 6 * s, (14 - i * 4) * s, 8 * s, '#2f6b4a');
  if (snow) { px(g, x, by - 4 - 18 * s, '#ffffff'); hline(g, x - 2, by - 4 - 12 * s, 4, '#eef4fa'); }
}
function cactus(g, x, by, s = 1) {
  const c = '#4f9a5a', d = '#3a7a45';
  rect(g, x - 2, by - 16 * s, 4, 16 * s, c); vline(g, x + 1, by - 16 * s, 16 * s, d);
  rect(g, x - 6, by - 11 * s, 4, 2, c); rect(g, x - 6, by - 15 * s, 2, 5 * s, c);
  rect(g, x + 2, by - 8 * s, 4, 2, c); rect(g, x + 4, by - 12 * s, 2, 5 * s, d);
}
function bush(g, x, by, w, c1, c2) {
  for (let i = 0; i < w; i += 5) circ(g, x + i, by - 3, 3, i % 2 ? c1 : c2);
}

// ---------- 격자탑 (에펠/도쿄타워) ----------
function lattice(g, cx, by, h, bw, colAt, opt = {}) {
  const curve = opt.curve || 2.3;
  const hw = t => 1 + (bw / 2) * Math.pow(1 - t, curve);
  const archH = opt.arch ? Math.round(h * opt.arch) : 0;
  for (let y = 0; y < h; y++) {
    const t = y / h, w = hw(t), yy = by - y;
    const Lx = Math.round(cx - w), Rx = Math.round(cx + w);
    const [col, dark] = colAt(t);
    const leg = Math.max(1, Math.round(w * 0.2));
    const archW = archH && y < archH ? (w - leg - 1) * Math.sqrt(1 - (y / archH) ** 2) : -1;
    for (let x = Lx; x <= Rx; x++) {
      const u = x - cx;
      const isLeg = x < Lx + leg || x > Rx - leg;
      if (!isLeg && Math.abs(u) < archW) continue;
      if (isLeg || (x + y) % 5 === 0 || (x - y + 1000) % 5 === 0 || y % 10 === 0) px(g, x, yy, u < 0 ? col : dark);
    }
  }
  for (const p of opt.decks || []) {
    const yy = Math.round(by - h * p.t), w = hw(p.t) + 2;
    rect(g, cx - w, yy - p.h, w * 2 + 1, p.h, p.c);
    if (p.win) hline(g, cx - w + 1, yy - p.h + 1, w * 2 - 1, p.win);
  }
  return hw;
}

// ---------- 랜드마크들: (g, cx, by, L) — L 에는 밤 조명 ----------
const LM = {
  namsan(g, cx, by, L) {
    // 롯데타워 (멀리)
    const lx = cx + 120;
    for (let y = 0; y < 96; y++) { const w = Math.round(1 + 6 * Math.pow(1 - y / 96, 0.8)); rect(g, lx - w, by - y, w * 2 + 1, 1, y % 6 === 0 ? '#9fb2c8' : '#b9c9db'); }
    vline(g, lx, by - 100, 4, '#9fb2c8');
    L.push({ x: lx, y: by - 98, c: '#ff5050', r: 1, blink: 1 });
    for (let i = 0; i < 10; i++) L.push({ x: lx - 2, y: by - 10 - i * 8, w: 5, h: 1, c: '#bfe3ff' });
    // 남산
    const hh = x => Math.round(54 * Math.pow(Math.max(0, 1 - (x / 100) ** 2), 0.8));
    for (let x = -100; x <= 100; x++) { const h = hh(x); if (h > 0) vline(g, cx + x, by - h, h, '#4c9447'); }
    const r = seeded('namsan');
    for (let i = 0; i < 70; i++) { const x = Math.round((r() * 2 - 1) * 94); const top = by - hh(x); circ(g, cx + x, top + 2 + Math.floor(r() * 26), 2, r() < 0.5 ? '#3d7d3a' : '#5aa852'); }
    // N서울타워
    const tx = cx + 6, b = by - 52;
    rect(g, tx - 6, b - 3, 13, 5, '#cfc8bd');
    rect(g, tx - 2, b - 42, 5, 42, '#ece8e0'); vline(g, tx - 2, b - 42, 42, '#c9c2b6'); vline(g, tx + 2, b - 42, 42, '#ffffff');
    rect(g, tx - 7, b - 49, 15, 3, '#d8d1c6');
    rect(g, tx - 6, b - 57, 13, 8, '#f2eee6'); rect(g, tx - 6, b - 54, 13, 2, '#5c7fa8');
    rect(g, tx - 4, b - 59, 9, 2, '#d8d1c6');
    rect(g, tx - 1, b - 78, 3, 19, '#ece8e0');
    vline(g, tx, b - 92, 14, '#d84040');
    L.push({ x: tx, y: b - 92, c: '#ff4040', r: 2, blink: 1 }, { x: tx - 6, y: b - 54, w: 13, h: 2, c: '#ffe9a8' },
      { x: tx, y: b - 40, r: 10, c: '#9f7bff', glow: 1 }, { x: tx - 1, y: b - 42, w: 3, h: 40, c: '#c9b8ff' });
  },
  tokyo(g, cx, by, L) {
    mountain(g, cx - 100, by, 170, 64, '#7d93c4', '#f4f6fb', 0.3, 12, 'fuji');
    bush(g, cx - 40, by, 90, '#4c8a4a', '#5aa852');
    const hw = lattice(g, cx + 12, by, 108, 54, t => (t > 0.42 && Math.floor(t * 14) % 2 === 0) || t < 0.04 ? ['#f4f4f4', '#d9d9d9'] : ['#ec5a33', '#b8401f'],
      { arch: 0.18, curve: 2.1, decks: [{ t: 0.33, h: 5, c: '#f4f4f4', win: '#6b8fb5' }, { t: 0.7, h: 3, c: '#f4f4f4', win: '#6b8fb5' }] });
    vline(g, cx + 12, by - 122, 14, '#f4f4f4');
    for (let i = 0; i < 18; i++) { const t = i / 18; const w = hw(t); L.push({ x: cx + 12 - w, y: by - t * 108, c: '#ffb347', r: 1 }, { x: cx + 12 + w, y: by - t * 108, c: '#ffb347', r: 1 }); }
    L.push({ x: cx + 12, y: by - 60, r: 22, c: '#ff8a3d', glow: 1 });
  },
  watArun(g, cx, by, L) {
    water(g, cx - 210, by - 8, 420, 30, '#8a8a62', '#a3a37a', 'chao');
    const prang = (x, b, s) => {
      const tiers = [[30, 8], [26, 8], [22, 9], [18, 9], [14, 9], [10, 8], [7, 8], [4, 8]];
      let y = b;
      tiers.forEach(([w, h], i) => {
        w = Math.max(1, Math.round(w * s)); h = Math.max(2, Math.round(h * s));
        rect(g, x - w, y - h, w * 2 + 1, h, '#efe6d4');
        rect(g, x + Math.floor(w * 0.4), y - h, Math.ceil(w * 0.6) + 1, h, '#d9ccb4');
        hline(g, x - w, y - h, w * 2 + 1, '#c9b89a');
        for (let k = -w + 1; k < w; k += 3) px(g, x + k, y - Math.ceil(h / 2), (Math.abs(k / 3) | 0) % 2 ? '#e07a7a' : '#5fb0c9');
        y -= h;
        if (i === 3 || i === 5) L.push({ x: x - w, y: y + 2, w: w * 2 + 1, h: 1, c: '#ffd27a' });
      });
      vline(g, x, y - Math.round(10 * s), Math.round(10 * s), '#c9b89a');
      px(g, x, y - Math.round(11 * s), '#ffd23f');
      L.push({ x, y: b - 30 * s, r: Math.round(20 * s), c: '#ffb24d', glow: 1 });
    };
    rect(g, cx - 64, by - 12, 129, 6, '#d9ccb4'); hline(g, cx - 64, by - 12, 129, '#efe6d4');
    prang(cx - 44, by - 12, 0.45); prang(cx + 44, by - 12, 0.45); prang(cx, by - 12, 1.0);
  },
  taj(g, cx, by, L) {
    const M = '#f7f3eb', Ms = '#ddd5c6', D = '#b9ad98';
    rect(g, cx - 120, by - 6, 240, 12, '#5c9a4e');
    rect(g, cx - 5, by - 6, 11, 12, '#7fb8d8');
    for (let i = -110; i < 110; i += 14) if (Math.abs(i) > 20) { rect(g, cx + i, by - 14, 3, 8, '#3f7a3a'); circ(g, cx + i + 1, by - 15, 2, '#2f6a32'); }
    rect(g, cx - 64, by - 12, 129, 6, Ms); hline(g, cx - 64, by - 12, 129, M);
    const minaret = x => {
      rect(g, x - 2, by - 62, 5, 50, M); vline(g, x + 2, by - 62, 50, Ms);
      for (let k = 0; k < 3; k++) rect(g, x - 3, by - 26 - k * 13, 7, 2, Ms);
      dome(g, x, by - 63, 3, M); px(g, x, by - 67, '#d9c27a');
    };
    minaret(cx - 58); minaret(cx + 58);
    rect(g, cx - 32, by - 46, 65, 34, M); rect(g, cx + 20, by - 46, 13, 34, Ms);
    const arch = (x, b, w, h, c) => { for (let y = 0; y < h; y++) { const t = (h - y) / h; const ww = t > 0.3 ? w : Math.round(w * Math.sqrt(t / 0.3)); rect(g, x - ww, b - y, ww * 2 + 1, 1, c); } };
    arch(cx, by - 12, 7, 28, D); arch(cx, by - 12, 5, 24, '#9c8e78');
    for (const s of [-1, 1]) { arch(cx + s * 22, by - 12, 4, 13, D); arch(cx + s * 22, by - 28, 4, 13, D); }
    rect(g, cx - 13, by - 52, 27, 6, M);
    // 양파 돔
    const R = 17, Hd = 28;
    for (let y = 0; y < Hd; y++) { const t = y / Hd; const w = Math.round(R * Math.pow(Math.sin(Math.PI * (0.3 + 0.7 * t)), 0.9)); rect(g, cx - w, by - 52 - y, w * 2 + 1, 1, M); rect(g, cx + Math.floor(w * 0.45), by - 52 - y, Math.ceil(w * 0.55), 1, Ms); }
    vline(g, cx, by - 86, 6, '#d9c27a');
    for (const s of [-1, 1]) { rect(g, cx + s * 24 - 4, by - 52, 9, 6, M); dome(g, cx + s * 24, by - 52, 5, M); px(g, cx + s * 24, by - 58, '#d9c27a'); }
    L.push({ x: cx, y: by - 50, r: 34, c: '#ffe8c8', glow: 1 });
  },
  pyramids(g, cx, by, L) {
    const r = seeded('dune');
    for (let x = -210; x < 210; x++) { const h = 6 + Math.round(4 * Math.sin(x * 0.03) + 3 * Math.sin(x * 0.11 + 1)); vline(g, cx + x, by - h, h + 20, '#e3c07a'); }
    const pyr = (x, b, w, h) => {
      for (let y = 0; y < h; y++) {
        const half = Math.round((w / 2) * (1 - y / h));
        const lit = y % 4 === 0 ? '#d9ae5e' : '#e8c172', dark = y % 4 === 0 ? '#a6783a' : '#b98a45';
        rect(g, x - half, b - y, half, 1, lit); rect(g, x, b - y, half + 1, 1, dark);
      }
    };
    pyr(cx - 62, by - 2, 56, 34); pyr(cx + 60, by - 2, 74, 48); pyr(cx, by, 100, 66);
    // 스핑크스
    const sx = cx - 34, sb = by + 2;
    rect(g, sx - 14, sb - 6, 22, 6, '#c9984f'); rect(g, sx + 6, sb - 13, 7, 8, '#c9984f'); rect(g, sx + 5, sb - 14, 9, 3, '#b0803e');
    rect(g, sx + 12, sb - 11, 2, 2, '#8a5e2c'); rect(g, sx + 8, sb - 2, 8, 2, '#c9984f');
    L.push({ x: cx, y: by - 30, r: 36, c: '#ffb070', glow: 1 });
  },
  savanna(g, cx, by, L) {
    mountain(g, cx - 40, by - 2, 230, 60, '#7a8bb0', '#f4f6fb', 0.18, 50, 'kili');
    rect(g, cx - 210, by - 8, 420, 30, '#cdb35c');
    const r = seeded('sav');
    for (let i = 0; i < 120; i++) px(g, cx - 210 + r() * 420, by - 8 + r() * 10, '#b39a48');
    treeAcacia(g, cx - 90, by - 6, 1.2); treeAcacia(g, cx + 70, by - 6, 1); treeAcacia(g, cx + 150, by - 6, 1.4); treeAcacia(g, cx - 170, by - 6, 0.9);
    drawSpr(g, AnimalSpr.giraffe[0], cx + 10, by - 22);
    drawSpr(g, AnimalSpr.giraffe[0], cx + 30, by - 20, true);
    // 코끼리 실루엣
    const ex = cx - 40, eb = by - 6;
    rect(g, ex, eb - 10, 18, 9, '#7c7f8a'); rect(g, ex + 15, eb - 12, 7, 8, '#7c7f8a'); vline(g, ex + 21, eb - 5, 5, '#7c7f8a');
    for (const lx of [1, 5, 11, 15]) rect(g, ex + lx, eb - 2, 3, 3, '#6c6f7a');
    L.push({ x: ex + 9, y: eb - 12, c: '#ffcf8a', r: 1 });
  },
  colosseum(g, cx, by, L) {
    const S1 = '#dcc6a0', S2 = '#c4ab84', A = '#7a634a', A2 = '#5c4a38';
    const w = 136, h = 62, x0 = Math.round(cx - w / 2);
    const tops = [];
    for (let x = 0; x < w; x++) {
      const u = x / w;
      let top = h;
      if (u > 0.6) top = h - Math.round((u - 0.6) / 0.4 * 24) - (x % 7 < 3 ? 2 : 0);
      top -= Math.round(Math.pow(Math.abs(u - 0.5) * 2, 3) * 6);
      tops.push(top);
      vline(g, x0 + x, by - top, top, u > 0.78 ? S2 : S1);
    }
    for (const ty of [15, 30, 45]) for (let x = 0; x < w; x++) if (tops[x] > ty + 1) px(g, x0 + x, by - ty, S2);
    for (let tier = 0; tier < 3; tier++) {
      const yb = by - 2 - tier * 15;
      for (let x = 3; x < w - 5; x += 9) {
        if (tops[x] < (tier + 1) * 15) continue;
        rect(g, x0 + x, yb - 10, 5, 10, tier === 0 ? A2 : A); rect(g, x0 + x + 1, yb - 11, 3, 1, A);
        if (tier < 2) L.push({ x: x0 + x + 1, y: yb - 9, w: 3, h: 8, c: '#ffcf7a' });
      }
    }
    for (let x = 4; x < w - 4; x += 6) if (tops[x] >= 60) rect(g, x0 + x, by - 56, 2, 3, A);
    L.push({ x: cx, y: by - 30, r: 40, c: '#ffbe6a', glow: 1 });
  },
  eiffel(g, cx, by, L) {
    for (let i = -140; i < 140; i += 18) if (Math.abs(i) > 40) treeRound(g, cx + i, by + 2, 1.2, '#4c8a4a', '#62a35a');
    const hw = lattice(g, cx, by, 122, 72, () => ['#9a7552', '#6f5338'], { arch: 0.2, curve: 2.6, decks: [{ t: 0.2, h: 4, c: '#7d5e40' }, { t: 0.5, h: 3, c: '#7d5e40' }, { t: 0.87, h: 2, c: '#7d5e40' }] });
    vline(g, cx, by - 134, 12, '#6f5338');
    for (let i = 0; i < 26; i++) { const t = i / 26; const w = hw(t); L.push({ x: cx - w, y: by - t * 122, c: '#ffcc66', r: 1 }, { x: cx + w, y: by - t * 122, c: '#ffcc66', r: 1 }); }
    L.push({ x: cx, y: by - 70, r: 30, c: '#ffb84d', glow: 1 }, { sparkle: 1, x: cx - 20, y: by - 122, w: 40, h: 110 }, { x: cx, y: by - 134, c: '#ffffff', r: 2, blink: 1 });
  },
  hallgrim(g, cx, by, L) {
    hills(g, cx - 210, 420, by - 6, 30, '#5a6b8a', 'esja');
    for (let x = -210; x < 210; x += 3) { const h = Math.round(30 * (0.55 + 0.3 * Math.sin((x + 210) * 0.03) )); }
    rect(g, cx - 210, by - 6, 420, 30, '#e8eef4');
    const C1 = '#e6e6e1', C2 = '#c8c8c2', C3 = '#aaaaa4';
    rect(g, cx + 4, by - 30, 44, 30, C2); tri(g, cx + 2, by - 40, 48, 10, '#8a8f99');
    for (let i = 0; i < 7; i++) {
      const hh = 76 - i * 9;
      rect(g, cx - 8 - (i + 1) * 4, by - hh, 4, hh, i % 2 ? C1 : C2);
      rect(g, cx + 6 + i * 4, by - hh, 4, hh, i % 2 ? C2 : C3);
    }
    rect(g, cx - 8, by - 98, 14, 98, C1); vline(g, cx + 5, by - 98, 98, C2);
    tri(g, cx - 7, by - 122, 12, 24, C1);
    vline(g, cx - 1, by - 128, 6, '#9aa0aa'); hline(g, cx - 3, by - 126, 5, '#9aa0aa');
    circ(g, cx - 1, by - 84, 3, '#f4f4f4'); px(g, cx - 1, by - 85, '#333'); px(g, cx, by - 84, '#333');
    for (let i = 0; i < 4; i++) rect(g, cx - 3, by - 70 + i * 12, 2, 7, '#7a8494');
    for (let i = 0; i < 4; i++) L.push({ x: cx - 3, y: by - 70 + i * 12, w: 2, h: 7, c: '#ffe0a0' });
    L.push({ x: cx - 1, y: by - 60, r: 30, c: '#d8e8ff', glow: 1 });
  },
  liberty(g, cx, by, L) {
    // 맨해튼 원경
    const r = seeded('mnh');
    let x = cx + 50;
    while (x < cx + 210) { const bw = 6 + Math.floor(r() * 10), bh = 20 + Math.floor(r() * 50); rect(g, x, by - 10 - bh, bw, bh, '#8a9ab8'); for (let i = 0; i < bh / 4; i++) if (r() < 0.6) L.push({ x: x + 1 + Math.floor(r() * (bw - 2)), y: by - 10 - bh + 2 + i * 4, w: 1, h: 1, c: '#ffe9a0' }); x += bw + 1; }
    const ex = cx + 120;
    rect(g, ex - 4, by - 92, 9, 82, '#7f8faf'); rect(g, ex - 2, by - 104, 5, 12, '#7f8faf'); vline(g, ex, by - 114, 10, '#7f8faf');
    L.push({ x: ex, y: by - 100, r: 4, c: '#ff6b9a', glow: 1 });
    water(g, cx - 210, by - 12, 420, 32, '#3d6f9e', '#5a8dbd', 'hudson');
    rect(g, cx - 32, by - 16, 64, 5, '#5e8a4e');
    rect(g, cx - 20, by - 22, 41, 6, '#b8a78a'); rect(g, cx - 16, by - 24, 33, 2, '#c9b99a');
    rect(g, cx - 7, by - 46, 15, 22, '#c9b99a'); vline(g, cx + 5, by - 46, 22, '#a8987a'); rect(g, cx - 8, by - 48, 17, 2, '#d8c8a8');
    for (let y = 0; y < 26; y++) { const w = Math.round(5 - y * 0.08); rect(g, cx - w, by - 48 - y, w * 2 + 1, 1, '#6fbfa8'); rect(g, cx + 1, by - 48 - y, w, 1, '#4c9a86'); }
    circ(g, cx, by - 77, 2, '#6fbfa8');
    for (const [dx, dy] of [[-3, -2], [-2, -4], [0, -5], [2, -4], [3, -2]]) px(g, cx + dx, by - 77 + dy, '#6fbfa8');
    line(g, cx + 3, by - 72, cx + 6, by - 88, '#6fbfa8'); line(g, cx + 4, by - 72, cx + 7, by - 88, '#4c9a86');
    rect(g, cx + 5, by - 91, 3, 2, '#c9a64a'); px(g, cx + 6, by - 93, '#ffb52e'); px(g, cx + 6, by - 92, '#ffd23f');
    rect(g, cx - 6, by - 68, 3, 6, '#4c9a86');
    L.push({ x: cx + 6, y: by - 92, r: 4, c: '#ffd36b', glow: 1 }, { x: cx + 6, y: by - 92, c: '#ffe9a0', r: 1 }, { x: cx, y: by - 50, r: 22, c: '#9fe0c8', glow: 1 });
  },
  teo(g, cx, by, L) {
    rect(g, cx - 210, by - 6, 420, 26, '#c9a876');
    mountain(g, cx - 150, by - 4, 120, 30, '#8a9a7a', null, 0, 20, 'mx1');
    mountain(g, cx + 150, by - 4, 140, 26, '#8a9a7a', null, 0, 30, 'mx2');
    const tiers = [[124, 13], [100, 12], [78, 11], [58, 10], [40, 9]];
    let y = by - 2;
    for (const [w, h] of tiers) {
      for (let k = 0; k < h; k++) { const ww = Math.round(w - k * 1.2); rect(g, cx - ww / 2, y - k, ww, 1, '#b8956a'); rect(g, cx + ww / 6, y - k, ww / 3, 1, '#9c7b55'); }
      hline(g, cx - w / 2 + h * 0.6, y - h + 1, w - h * 1.2, '#cfb088');
      y -= h;
    }
    for (let yy = by - 2; yy > y; yy -= 2) hline(g, cx - 5, yy, 10, '#d8c09a');
    rect(g, cx - 9, y - 8, 18, 8, '#a8845a'); rect(g, cx - 3, y - 6, 6, 6, '#6e5236');
    cactus(g, cx - 90, by + 4); cactus(g, cx + 84, by + 2, 0.8); cactus(g, cx - 150, by + 2, 0.7);
    L.push({ x: cx, y: by - 30, r: 40, c: '#ffb46a', glow: 1 });
  },
  cristo(g, cx, by, L) {
    water(g, cx - 210, by - 10, 420, 30, '#2f86c0', '#56a6d8', 'guan');
    const sx = cx + 100;
    for (let x = -24; x <= 24; x++) { const h = Math.round(46 * Math.pow(1 - (x / 24) ** 2, 0.6)); vline(g, sx + x, by - 8 - h, h, x > 6 ? '#5f6f62' : '#76887a'); if (h > 30) px(g, sx + x, by - 8 - h, '#4f8a4a'); }
    line(g, sx, by - 54, cx + 40, by - 70, '#444');
    for (let x = -80; x <= 80; x++) {
      const t = Math.abs(x) / 80;
      const h = Math.round(84 * Math.pow(1 - t, 1.25));
      vline(g, cx + x, by - 8 - h, h, x > 10 && x < 40 ? '#5f6f5a' : '#3f7a45');
      if (h > 6) vline(g, cx + x, by - 8 - h, 3, '#4f9a52');
    }
    const top = by - 8 - 84;
    rect(g, cx - 1, top - 3, 3, 3, '#d8d8d8');
    rect(g, cx - 1, top - 14, 3, 11, '#f4f4f4'); vline(g, cx + 1, top - 14, 11, '#d8d8d8');
    hline(g, cx - 7, top - 12, 15, '#f4f4f4'); hline(g, cx - 7, top - 11, 15, '#e0e0e0');
    rect(g, cx - 1, top - 17, 3, 3, '#f4f4f4');
    L.push({ x: cx, y: top - 9, r: 10, c: '#ffffff', glow: 1 }, { x: cx - 7, y: top - 12, w: 15, h: 1, c: '#ffffff' }, { x: cx - 1, y: top - 17, w: 3, h: 14, c: '#ffffff' });
  },
  opera(g, cx, by, L) {
    water(g, cx - 210, by - 12, 420, 34, '#2d78b0', '#4f9ad0', 'syd');
    // 하버브리지
    const bx = cx + 110;
    for (let x = -62; x <= 62; x++) { const y = Math.round(36 * (1 - (x / 62) ** 2)); rect(g, bx + x, by - 22 - y, 1, 2, '#7d8590'); if (x % 6 === 0 && y > 14) vline(g, bx + x, by - 22 - y, y - 14, '#8d95a0'); }
    hline(g, bx - 70, by - 36, 140, '#6d7580'); hline(g, bx - 70, by - 35, 140, '#5d6570');
    rect(g, bx - 70, by - 46, 7, 34, '#b8ab90'); rect(g, bx + 63, by - 46, 7, 34, '#b8ab90');
    for (let i = 0; i < 12; i++) L.push({ x: bx - 62 + i * 11, y: by - 22 - Math.round(36 * (1 - ((-62 + i * 11) / 62) ** 2)), c: '#ffe9a0', r: 1 });
    rect(g, cx - 54, by - 18, 108, 8, '#d8c4a0'); hline(g, cx - 54, by - 18, 108, '#e8d8b8');
    const sail = (x, b, w, h, lean) => {
      for (let y = 0; y < h; y++) {
        const t = y / h, ww = Math.max(1, Math.round(w * Math.pow(1 - t, 0.7)));
        const off = Math.round(t * t * w * 0.6 * lean);
        rect(g, x + off, b - y, ww, 1, '#f6f4ee');
        rect(g, x + off + Math.round(ww * 0.6), b - y, Math.ceil(ww * 0.4), 1, '#d9d6cc');
        if (y % 3 === 0) px(g, x + off + 1, b - y, '#e6e2d8');
      }
    };
    sail(cx - 52, by - 18, 32, 54, 1); sail(cx - 26, by - 18, 28, 44, 1); sail(cx - 4, by - 18, 22, 34, 1);
    sail(cx + 16, by - 18, 24, 40, 1); sail(cx + 36, by - 18, 18, 30, 1);
    L.push({ x: cx - 10, y: by - 34, r: 34, c: '#ffd9a8', glow: 1 });
  },
  sejong(g, cx, by, L) {
    mountain(g, cx - 120, by - 4, 160, 70, '#b9d4ea', '#ffffff', 0.5, 0, 'ice1');
    mountain(g, cx + 110, by - 4, 190, 56, '#a8c6e0', '#ffffff', 0.45, 20, 'ice2');
    mountain(g, cx - 10, by - 4, 120, 40, '#c9def0', '#ffffff', 0.6, 10, 'ice3');
    rect(g, cx - 210, by - 6, 420, 30, '#f0f6fc');
    const box = (x, w, h, c) => { rect(g, x, by - 6 - h, w, h, c); hline(g, x, by - 6 - h, w, shade(c, 0.3)); for (let i = 3; i < w - 3; i += 6) { rect(g, x + i, by - 6 - h + 3, 3, 3, '#cfe8ff'); L.push({ x: x + i, y: by - 6 - h + 3, w: 3, h: 3, c: '#ffe9a0' }); } };
    box(cx - 60, 30, 12, '#e8572e'); box(cx - 26, 22, 10, '#e8a12e'); box(cx + 2, 34, 14, '#e8572e');
    vline(g, cx + 46, by - 34, 28, '#9aa0aa');
    rect(g, cx + 47, by - 34, 10, 7, '#ffffff'); px(g, cx + 51, by - 31, '#e8394a'); px(g, cx + 52, by - 31, '#3a5bd9'); px(g, cx + 51, by - 30, '#3a5bd9'); px(g, cx + 52, by - 32, '#e8394a');
    circ(g, cx + 70, by - 14, 5, '#e8eef4'); rect(g, cx + 69, by - 9, 2, 4, '#9aa0aa');
  },
};

// ---------- 중경 건물 스타일 ----------
const BSTYLE = {
  modern(g, x, by, w, city, r, L) {
    const h = 34 + Math.floor(r() * 62), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col); vline(g, x + w - 2, by - h, h, shade(col, -0.12)); hline(g, x, by - h, w, shade(col, 0.2));
    const wc = shade(col, -0.35);
    for (let yy = by - h + 4; yy < by - 6; yy += 5) for (let xx = x + 2; xx < x + w - 3; xx += 4) {
      rect(g, xx, yy, 2, 2, wc);
      if (r() < 0.45) L.push({ x: xx, y: yy, w: 2, h: 2, c: r() < 0.8 ? '#ffe39a' : '#bfe8ff', blink: r() < 0.05 ? 1 : 0 });
    }
    if (r() < 0.4) { const sx = x + 1 + Math.floor(r() * (w - 6)), sc = pick([city.accent, '#3fb6ff', '#ff5ec4', '#7cff6b']); rect(g, sx, by - h + 6, 4, 14, sc); for (let i = 0; i < 4; i++) hline(g, sx + 1, by - h + 8 + i * 3, 2, '#ffffff'); L.push({ x: sx, y: by - h + 6, w: 4, h: 14, c: sc, neon: 1 }); }
    if (r() < 0.35) { vline(g, x + 3, by - h - 8, 8, '#777'); L.push({ x: x + 3, y: by - h - 8, c: '#ff3b3b', r: 1, blink: 1 }); }
    else if (r() < 0.3) rect(g, x + w - 8, by - h - 5, 5, 5, '#8a8a99');
  },
  shophouse(g, x, by, w, city, r, L) {
    const h = 26 + Math.floor(r() * 24), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col); hline(g, x, by - h, w, shade(col, -0.2)); hline(g, x, by - h + 1, w, shade(col, 0.15));
    for (let yy = by - h + 4; yy < by - 14; yy += 8) for (let xx = x + 2; xx < x + w - 3; xx += 6) { rect(g, xx, yy, 3, 4, '#4a5a6a'); if (r() < 0.4) L.push({ x: xx, y: yy, w: 3, h: 4, c: '#ffd98a' }); }
    const sc = pick(['#e8394a', '#ffd23f', '#3fb6ff', '#2fa36b']);
    rect(g, x + 1, by - 14, w - 2, 4, sc); L.push({ x: x + 1, y: by - 14, w: w - 2, h: 4, c: sc, neon: 1 });
    line(g, x, by - h + 8, x + w, by - h + 10 + Math.floor(r() * 4), '#2a2a2a');
  },
  european(g, x, by, w, city, r, L) {
    const h = 36 + Math.floor(r() * 18), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col); vline(g, x + w - 1, by - h, h, shade(col, -0.15));
    const paris = city.id === 'paris';
    if (paris) { for (let i = 0; i < 7; i++) rect(g, x + Math.floor(i / 2), by - h - 7 + i, w - i, 1, '#6f7f99'); for (let xx = x + 3; xx < x + w - 4; xx += 7) rect(g, xx, by - h - 5, 3, 4, '#d8dde8'); }
    else { rect(g, x - 1, by - h - 2, w + 2, 2, '#b85a3a'); hline(g, x - 1, by - h - 3, w + 2, '#d07a4a'); }
    for (let yy = by - h + 4; yy < by - 8; yy += 8) {
      for (let xx = x + 2; xx < x + w - 3; xx += 6) { rect(g, xx, yy, 3, 5, '#4f5d70'); px(g, xx, yy, shade(col, 0.3)); if (r() < 0.45) L.push({ x: xx, y: yy, w: 3, h: 5, c: '#ffd98a' }); }
      hline(g, x + 1, yy + 6, w - 2, paris ? '#2b2b33' : shade(col, -0.25));
    }
    rect(g, x + Math.floor(w / 2) - 2, by - 7, 5, 7, '#5a3d2a');
    if (r() < 0.5) { rect(g, x + 3, by - h - (paris ? 10 : 6), 3, 4, '#a85a3a'); }
  },
  nordic(g, x, by, w, city, r, L) {
    w = Math.min(w, 22);
    const h = 16 + Math.floor(r() * 14), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col);
    for (let yy = by - h + 1; yy < by; yy += 2) hline(g, x, yy, w, shade(col, -0.06));
    const roof = pick(['#3a3f4a', '#8a2a2a', '#4a5f6a']);
    tri(g, x - 2, by - h - 9, w + 4, 10, roof);
    for (let xx = x + 3; xx < x + w - 3; xx += 6) { rect(g, xx, by - h + 4, 3, 4, '#f4f4f4'); px(g, xx + 1, by - h + 5, '#5a7a9a'); if (r() < 0.6) L.push({ x: xx, y: by - h + 4, w: 3, h: 4, c: '#ffcf70' }); }
    rect(g, x + 1, by - h - 1, w - 2, 1, '#ffffff');
  },
  desert(g, x, by, w, city, r, L) {
    const h = 18 + Math.floor(r() * 26), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col); hline(g, x - 1, by - h, w + 2, shade(col, 0.2)); vline(g, x + w - 1, by - h, h, shade(col, -0.15));
    for (let yy = by - h + 5; yy < by - 5; yy += 7) for (let xx = x + 3; xx < x + w - 3; xx += 6) { rect(g, xx, yy, 2, 3, '#4a3a2a'); if (r() < 0.4) L.push({ x: xx, y: yy, w: 2, h: 3, c: '#ffcf70' }); }
    const t = r();
    if (t < 0.25) { dome(g, x + Math.floor(w / 2), by - h, Math.floor(w / 3), city.id === 'agra' ? '#f4ece0' : '#7fa0a8'); }
    else if (t < 0.4) { const mx = x + w - 3; rect(g, mx, by - h - 22, 3, 22, col); dome(g, mx + 1, by - h - 22, 2, col); vline(g, mx + 1, by - h - 27, 3, '#c9a64a'); L.push({ x: mx + 1, y: by - h - 20, c: '#7cff9a', r: 1 }); }
    else if (t < 0.55) { rect(g, x + 2, by - h - 4, 6, 4, '#3a6a9a'); }
  },
  skyscraper(g, x, by, w, city, r, L) {
    const h = 60 + Math.floor(r() * 70), col = city.bld[Math.floor(r() * city.bld.length)];
    const step = r() < 0.5;
    rect(g, x, by - h, w, h, col); vline(g, x + w - 2, by - h, h, shade(col, -0.15)); vline(g, x, by - h, h, shade(col, 0.12));
    if (step) { rect(g, x + 3, by - h - 10, w - 6, 10, col); rect(g, x + Math.floor(w / 2) - 1, by - h - 18, 3, 8, col); }
    for (let yy = by - h + 3; yy < by - 4; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) { px(g, xx, yy, shade(col, -0.35)); if (r() < 0.5) L.push({ x: xx, y: yy, w: 1, h: 2, c: '#ffe9a0' }); }
    if (r() < 0.3) { rect(g, x + 3, by - h - 7, 6, 5, '#6b4a32'); rect(g, x + 4, by - h - 2, 1, 2, '#333'); rect(g, x + 7, by - h - 2, 1, 2, '#333'); }
  },
  colonial(g, x, by, w, city, r, L) {
    const h = 22 + Math.floor(r() * 16), col = city.bld[Math.floor(r() * city.bld.length)];
    rect(g, x, by - h, w, h, col); hline(g, x - 1, by - h, w + 2, shade(col, -0.2)); hline(g, x, by - h + 2, w, shade(col, 0.15));
    for (let xx = x + 2; xx < x + w - 4; xx += 7) {
      rect(g, xx, by - h + 5, 4, 6, '#4a3a4a'); hline(g, xx - 1, by - h + 11, 6, '#2a2a2a'); if (r() < 0.5) L.push({ x: xx, y: by - h + 5, w: 4, h: 6, c: '#ffcf70' });
    }
    const dx = x + Math.floor(w / 2) - 3; rect(g, dx, by - 9, 7, 9, '#5a3d2a'); rect(g, dx + 1, by - 10, 5, 1, '#5a3d2a');
    if (r() < 0.4) for (let i = 0; i < w; i += 3) px(g, x + i, by - h - 2 + (i % 2), pick(['#e8394a', '#ffd23f', '#3fb6ff', '#2fa36b', '#ff5ec4']));
  },
  favela(g, x, by, w, city, r, L) {
    const rows = 2 + Math.floor(r() * 3);
    let yb = by;
    for (let i = 0; i < rows; i++) {
      let xx = x;
      while (xx < x + w) {
        const bw = 6 + Math.floor(r() * 8), bh = 7 + Math.floor(r() * 5);
        const col = city.bld[Math.floor(r() * city.bld.length)];
        rect(g, xx, yb - bh, bw, bh, col); hline(g, xx, yb - bh, bw, shade(col, -0.25));
        rect(g, xx + 2, yb - bh + 3, 2, 2, '#3a3a4a');
        if (r() < 0.5) L.push({ x: xx + 2, y: yb - bh + 3, w: 2, h: 2, c: '#ffd98a' });
        xx += bw;
      }
      yb -= 7 + Math.floor(r() * 3);
    }
    if (r() < 0.5) treePalm(g, x + Math.floor(w / 2), by, 0.9);
  },
  savanna(g, x, by, w, city, r, L) {
    if (r() < 0.5) treeAcacia(g, x + w / 2, by, 0.8 + r() * 0.5);
    else if (r() < 0.5) { const hh = 10; rect(g, x + 2, by - hh, w - 6, hh, '#c9a070'); tri(g, x, by - hh - 7, w - 2, 8, '#8a6a3a'); rect(g, x + w / 2 - 2, by - 6, 4, 6, '#4a3020'); L.push({ x: x + w / 2 - 2, y: by - 6, w: 4, h: 6, c: '#ffb050' }); }
    else bush(g, x, by, w, '#7a9a4a', '#8aaa5a');
  },
  antarctic(g, x, by, w, city, r, L) {
    const hh = 4 + Math.floor(r() * 8);
    for (let i = 0; i < w; i++) { const y = Math.round(hh * Math.sin(Math.PI * i / w)); vline(g, x + i, by - y, y, i < w / 2 ? '#ffffff' : '#dce8f4'); }
    if (r() < 0.3) { rect(g, x + 4, by - 9, 12, 8, '#e8572e'); rect(g, x + 7, by - 7, 3, 3, '#cfe8ff'); L.push({ x: x + 7, y: by - 7, w: 3, h: 3, c: '#ffe9a0' }); }
  },
};
function filler(g, x, by, w, city, r) {
  const f = city.filler;
  for (let i = 4; i < w; i += 14) {
    const xx = x + i + Math.floor(r() * 4);
    if (f === 'palm') treePalm(g, xx, by, 0.8 + r() * 0.4);
    else if (f === 'acacia') treeAcacia(g, xx, by, 0.7);
    else if (f === 'cactus') cactus(g, xx, by, 0.8);
    else if (f === 'pine') treePine(g, xx, by, 1, city.snowy);
    else if (f === 'snow') { const hh = 3 + r() * 4; for (let k = 0; k < 10; k++) vline(g, xx + k, by - hh * Math.sin(Math.PI * k / 10), hh, '#ffffff'); }
    else if (f === 'blossom') treeRound(g, xx, by, 1, '#f7a8c4', '#ffd1e0');
    else treeRound(g, xx, by, 1, '#4c8a4a', '#62a35a');
  }
}

// ---------- 레이어 생성 ----------
function buildFar(city) {
  const c = makeCanvas(420, H), L = [];
  const g = c.g;
  hills(g, 0, 420, FAR_BASE + 2, 10, mix(city.ground[0], '#7a9a6a', 0.5), city.id + 'h');
  LM[city.landmark](g, LM_FAR_X, FAR_BASE, L);
  haze(c, city.sky[1], 0.22);
  return { c, L };
}
function buildMid(city) {
  const Wd = 540, c = makeCanvas(Wd, H), g = c.g, L = [];
  const r = seeded(city.id + 'mid');
  const gap0 = LM_MID_X - 42, gap1 = LM_MID_X + 42;
  let x = -4;
  while (x < Wd) {
    let bw = 18 + Math.floor(r() * 24);
    if (x + bw > gap0 && x < gap1) { filler(g, x, MID_BASE, Math.min(bw, gap1 - x + 4), city, r); x = Math.max(x + bw, gap1); continue; }
    BSTYLE[city.style](g, x, MID_BASE, bw, city, r, L);
    x += bw + Math.floor(r() * 3);
  }
  // 중간에 나무 몇 그루
  for (let i = 0; i < 6; i++) { const xx = Math.floor(r() * Wd); if (xx < gap0 || xx > gap1) filler(g, xx, MID_BASE + 1, 6, city, r); }
  haze(c, city.sky[1], 0.12);
  return { c, L };
}
function haze(c, col, a) {
  const g = c.g; g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.restore();
}

// ---------- 앞쪽: 보도, 도로, 스팟 ----------
const SPOTS = [
  { id: 'airport', x: 34, label: '공항', hint: '공항 (다른 도시로)' },
  { id: 'hotel', x: 118, label: '숙소', hint: '숙소 (잠/편집/업로드)' },
  { id: 'photo', x: SPOT_PHOTO_X, label: '포토존', hint: '랜드마크 촬영' },
  { id: 'food', x: 408, label: '맛집', hint: '먹방 촬영' },
  { id: 'act', x: 504, label: '체험', hint: '현지 체험 촬영' },
  { id: 'shop', x: 594, label: '상점', hint: '장비/아이템 상점' },
];
function drawGround(g, city) {
  const [s1, s2] = city.ground, road = city.road;
  rect(g, 0, SIDEWALK_Y, WORLD_W, CURB_Y - SIDEWALK_Y, s1);
  const gs = city.groundStyle;
  if (gs === 'tile') { for (let x = 0; x < WORLD_W; x += 8) vline(g, x, SIDEWALK_Y, CURB_Y - SIDEWALK_Y, s2); hline(g, 0, SIDEWALK_Y + 8, WORLD_W, s2); }
  else if (gs === 'cobble') { for (let y = SIDEWALK_Y; y < CURB_Y; y += 4) for (let x = (y / 4 % 2) * 3; x < WORLD_W; x += 6) { rect(g, x, y, 5, 3, s1); hline(g, x, y + 3, 5, s2); vline(g, x + 5, y, 4, s2); } }
  else if (gs === 'wave') { for (let x = 0; x < WORLD_W; x++) for (let y = SIDEWALK_Y; y < CURB_Y; y++) { const v = Math.sin(x * 0.25 + Math.sin(y * 0.6) * 1.2) + (y - SIDEWALK_Y) * 0.0; if (((Math.floor(x / 6) + Math.floor((y - SIDEWALK_Y + Math.round(Math.sin(x * 0.5) * 2)) / 4)) % 2) === 0) px(g, x, y, s2); } }
  else if (gs === 'wood') { for (let y = SIDEWALK_Y; y < CURB_Y; y += 3) hline(g, 0, y, WORLD_W, s2); for (let x = 0; x < WORLD_W; x += 23) vline(g, x, SIDEWALK_Y, CURB_Y - SIDEWALK_Y, s2); }
  else { const r = seeded(city.id + 'gnd'); for (let i = 0; i < 500; i++) px(g, r() * WORLD_W, SIDEWALK_Y + r() * (CURB_Y - SIDEWALK_Y), s2); }
  hline(g, 0, SIDEWALK_Y, WORLD_W, shade(s1, 0.15));
  rect(g, 0, CURB_Y, WORLD_W, 2, shade(s1, -0.25));
  rect(g, 0, CURB_Y + 2, WORLD_W, H - CURB_Y - 2, road);
  if (city.roadLines !== false) for (let x = 0; x < WORLD_W; x += 24) rect(g, x, 170, 12, 1, '#e8e0c0');
  else { const r = seeded(city.id + 'road'); for (let i = 0; i < 300; i++) px(g, r() * WORLD_W, CURB_Y + 3 + r() * 20, shade(road, r() < 0.5 ? 0.1 : -0.1)); }
}
function signBoard(g, x, y, label, bg, fg, L, neon) {
  const w = textWidth(label) + 6;
  rect(g, x - w / 2 - 1, y - 1, w + 2, 13, OUT); rect(g, x - w / 2, y, w, 11, bg);
  text(g, label, x, y + 1, fg, { align: 'center' });
  if (L && neon) L.push({ x: Math.round(x - w / 2), y, w, h: 11, c: bg, neon: 1, label, fg });
}
function buildFront(city) {
  const c = makeCanvas(WORLD_W, H), g = c.g, L = [];
  drawGround(g, city);
  const by = SIDEWALK_Y + 1;
  const acc = city.accent;
  // 공항 표지판 + 벤치
  {
    const x = SPOTS[0].x;
    vline(g, x, by - 34, 34, '#5a5a66'); vline(g, x + 1, by - 34, 34, '#7a7a88');
    rect(g, x - 14, by - 46, 30, 13, '#2b6cb0'); rect(g, x - 13, by - 45, 28, 11, '#3a85d0');
    icon(g, 'plane', x - 11, by - 43); text(g, '공항', x + 6, by - 44, '#ffffff', { align: 'center' });
    rect(g, x + 8, by - 8, 20, 2, '#8a5a3a'); vline(g, x + 9, by - 6, 6, '#5a3a2a'); vline(g, x + 26, by - 6, 6, '#5a3a2a'); rect(g, x + 8, by - 13, 20, 2, '#8a5a3a');
    L.push({ x: x - 3, y: by - 45, w: 18, h: 11, c: '#3a85d0', neon: 1, label: '공항', fg: '#ffffff' });
  }
  // 숙소
  {
    const x = SPOTS[1].x, w = 60, h = 78, x0 = x - w / 2, col = city.hotel || '#c9a27a';
    rect(g, x0, by - h, w, h, col); vline(g, x0 + w - 2, by - h, h, shade(col, -0.15)); hline(g, x0 - 2, by - h, w + 4, shade(col, -0.3)); hline(g, x0 - 2, by - h + 1, w + 4, shade(col, 0.2));
    for (let yy = by - h + 8; yy < by - 22; yy += 11) for (let xx = x0 + 5; xx < x0 + w - 6; xx += 10) {
      rect(g, xx - 1, yy - 1, 8, 8, shade(col, -0.25)); rect(g, xx, yy, 6, 6, '#7fa8c9'); px(g, xx + 1, yy + 1, '#c9e4f5'); vline(g, xx + 3, yy, 6, shade(col, -0.25));
      if ((xx + yy) % 3 !== 0) L.push({ x: xx, y: yy, w: 6, h: 6, c: (xx * yy) % 5 ? '#ffd98a' : '#ffb870' });
    }
    rect(g, x - 10, by - 18, 20, 18, '#5a3d2a'); rect(g, x - 8, by - 16, 7, 16, '#8a6a4a'); rect(g, x + 1, by - 16, 7, 16, '#8a6a4a'); px(g, x - 2, by - 9, '#ffd23f'); px(g, x + 1, by - 9, '#ffd23f');
    for (let i = 0; i < 26; i += 2) { rect(g, x - 13 + i, by - 23, 2, 4, i % 4 ? '#ffffff' : acc); }
    signBoard(g, x, by - h - 13, 'HOTEL', '#e8394a', '#ffffff', L, true);
    L.push({ x: x - 8, y: by - 16, w: 16, h: 16, c: '#ffcf80' });
  }
  // 포토존
  {
    const x = SPOTS[2].x;
    for (let i = -14; i <= 14; i += 2) px(g, x + i, by + 8, '#ffd23f');
    vline(g, x - 18, by - 22, 22, '#5a5a66');
    const pw = textWidth('PHOTO') + 8;
    rect(g, x - 18 - pw / 2 - 1, by - 34, pw + 2, 13, OUT); rect(g, x - 18 - pw / 2, by - 33, pw, 11, '#ffd23f');
    text(g, 'PHOTO', x - 18, by - 32, OUT, { align: 'center' });
    // 삼각대
    line(g, x + 18, by - 14, x + 13, by, '#3d3d4a'); line(g, x + 18, by - 14, x + 23, by, '#3d3d4a'); line(g, x + 18, by - 14, x + 18, by, '#3d3d4a');
    rect(g, x + 14, by - 19, 9, 6, '#2a2a35'); rect(g, x + 22, by - 18, 2, 4, '#2a2a35'); px(g, x + 16, by - 17, '#7ad1ff');
  }
  // 맛집 포장마차
  {
    const x = SPOTS[3].x, w = 50, x0 = x - w / 2;
    rect(g, x0 + 2, by - 36, 2, 36, '#6b4a32'); rect(g, x0 + w - 4, by - 36, 2, 36, '#6b4a32');
    for (let i = 0; i < w + 4; i++) { const col = Math.floor(i / 5) % 2 ? '#ffffff' : acc; vline(g, x0 - 2 + i, by - 44, 7, col); px(g, x0 - 2 + i, by - 37 + ((Math.floor(i / 5)) % 2), col); }
    rect(g, x0, by - 16, w, 16, '#8a5a3a'); hline(g, x0, by - 16, w, '#b07a4a'); hline(g, x0 - 2, by - 17, w + 4, '#c98a5a');
    for (let i = 0; i < 4; i++) { rect(g, x0 + 6 + i * 11, by - 21, 7, 5, '#e8e0d0'); rect(g, x0 + 7 + i * 11, by - 22, 5, 1, pick(['#e8572e', '#ffd23f', '#8a4a2a', '#e8394a'])); }
    signBoard(g, x, by - 58, city.food.name, '#fff3d6', '#5a2a1a', L, true);
    for (let i = 0; i < 6; i++) L.push({ x: x0 + 2 + i * 9, y: by - 36, c: '#ffd36b', r: 1 });
  }
  // 체험 부스
  {
    const x = SPOTS[4].x, w = 46, x0 = x - w / 2, col = city.actCol || '#3a5bd9';
    tri(g, x0 - 2, by - 54, w + 4, 18, col); tri(g, x0 + 4, by - 50, w - 8, 12, shade(col, 0.2));
    rect(g, x0, by - 36, w, 36, shade(col, 0.35)); rect(g, x - 9, by - 24, 18, 24, OUT); rect(g, x - 8, by - 23, 16, 23, '#2a2240');
    vline(g, x, by - 66, 12, '#5a5a66'); rect(g, x + 1, by - 66, 8, 5, acc);
    signBoard(g, x, by - 36, city.act.short || '체험', '#2a2240', '#ffd23f', L, true);
    for (let i = 0; i < 5; i++) L.push({ x: x0 + 3 + i * 10, y: by - 36, c: pick(['#ff5ec4', '#7cff6b', '#3fb6ff', '#ffd23f']), r: 1, blink: 1 });
  }
  // 상점
  {
    const x = SPOTS[5].x, w = 54, h = 52, x0 = x - w / 2;
    rect(g, x0, by - h, w, h, '#e8eef2'); hline(g, x0, by - h, w, '#c9d0d8');
    rect(g, x0, by - h + 4, w, 8, '#2fa36b'); for (let i = 0; i < w; i += 4) px(g, x0 + i, by - h + 11, '#ffffff');
    text(g, 'SHOP', x, by - h + 3, '#ffffff', { align: 'center' });
    rect(g, x0 + 4, by - 34, 22, 20, '#9fd3f0'); rect(g, x0 + 30, by - 34, 20, 34, '#9fd3f0'); vline(g, x0 + 40, by - 34, 34, '#c9e4f5');
    for (let i = 0; i < 4; i++) rect(g, x0 + 6 + i * 5, by - 24, 3, 4, pick(['#e8394a', '#ffd23f', '#3a5bd9', '#2fa36b']));
    rect(g, x0 + 4, by - 14, 22, 14, '#c9d0d8');
    L.push({ x: x0 + 4, y: by - 34, w: 22, h: 20, c: '#e8fbff' }, { x: x0 + 30, y: by - 34, w: 20, h: 34, c: '#e8fbff' }, { x: x0, y: by - h + 4, w, h: 8, c: '#2fa36b', neon: 1, label: 'SHOP', fg: '#ffffff', ly: -2 });
  }
  // 가로등
  for (const lx of [76, 200, 250, 354, 456, 548]) {
    vline(g, lx, by - 40, 40, '#3d3d4a'); hline(g, lx - 3, by - 40, 7, '#3d3d4a'); rect(g, lx - 2, by - 39, 5, 2, '#f4f0d0');
    L.push({ x: lx, y: by - 38, r: 12, c: '#ffd88a', glow: 1, lamp: 1 }, { x: lx - 2, y: by - 39, w: 5, h: 2, c: '#fff6c8' });
  }
  return { c, L };
}

// ---------- 하늘 ----------
const SKY_KEYS = [
  { h: 0, top: '#070b24', mid: '#121a48', bot: '#222c66', tint: '#121845', ta: 0.6, night: 1 },
  { h: 4.5, top: '#070b24', mid: '#121a48', bot: '#222c66', tint: '#121845', ta: 0.6, night: 1 },
  { h: 6, top: '#3e4c9e', mid: '#b47fb8', bot: '#ffbe94', tint: '#7a5a9a', ta: 0.25, night: 0.3 },
  { h: 7.5, top: null, mid: null, bot: null, tint: '#ffffff', ta: 0, night: 0 },
  { h: 16.5, top: null, mid: null, bot: null, tint: '#ffffff', ta: 0, night: 0 },
  { h: 18, top: '#3a2f7a', mid: '#b2508a', bot: '#ff9a5a', tint: '#a8506a', ta: 0.22, night: 0.25 },
  { h: 19.5, top: '#0d1236', mid: '#2a2a6e', bot: '#5a3a7a', tint: '#1a1a50', ta: 0.5, night: 0.9 },
  { h: 21, top: '#070b24', mid: '#121a48', bot: '#222c66', tint: '#121845', ta: 0.6, night: 1 },
  { h: 24, top: '#070b24', mid: '#121a48', bot: '#222c66', tint: '#121845', ta: 0.6, night: 1 },
];
function skyAt(hour, city, weather) {
  hour = ((hour % 24) + 24) % 24;
  let a = SKY_KEYS[0], b = SKY_KEYS[1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) if (hour >= SKY_KEYS[i].h && hour <= SKY_KEYS[i + 1].h) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  const day = { top: city.sky[0], mid: mix(city.sky[0], city.sky[1], 0.5), bot: city.sky[1] };
  const ca = k => a[k] || day[k], cb = k => b[k] || day[k];
  const o = {
    top: mix(ca('top'), cb('top'), t), mid: mix(ca('mid'), cb('mid'), t), bot: mix(ca('bot'), cb('bot'), t),
    tint: t < 0.5 ? a.tint : b.tint, ta: lerp(a.ta, b.ta, t), night: lerp(a.night, b.night, t),
  };
  if (weather === 'rain' || weather === 'cloud' || weather === 'snow') {
    const k = weather === 'cloud' ? 0.35 : 0.5;
    const grey = o.night > 0.5 ? '#1a1d2e' : '#8a93a6';
    o.top = mix(o.top, grey, k); o.mid = mix(o.mid, grey, k); o.bot = mix(o.bot, grey, k);
    o.ta = Math.max(o.ta, weather === 'cloud' ? 0.08 : 0.15); if (o.ta === 0.15 || o.ta === 0.08) o.tint = '#4a5570';
  }
  return o;
}
function drawSkyBands(g, sk, y0 = 0, y1 = 150) {
  const n = 10, bh = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = t < 0.5 ? mix(sk.top, sk.mid, t * 2) : mix(sk.mid, sk.bot, (t - 0.5) * 2);
    const y = Math.round(y0 + i * bh);
    rect(g, 0, y, W, Math.ceil(bh) + 1, c);
    if (i > 0) { const pc = (t - 1 / (n - 1)) < 0.5 ? mix(sk.top, sk.mid, (t - 1 / (n - 1)) * 2) : mix(sk.mid, sk.bot, ((t - 1 / (n - 1)) - 0.5) * 2); dither(g, 0, y, W, 2, c, pc); }
  }
}
const STARS = (() => { const r = seeded('stars'); return Array.from({ length: 70 }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * 110), p: r() * 6, b: r() < 0.2 })); })();
const CLOUD_SPR = (() => {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const r = seeded('cloud' + k), w = 30 + Math.floor(r() * 30), h = 14, c = makeCanvas(w, h);
    for (let i = 0; i < 6; i++) { const cx = 6 + r() * (w - 12), rr = 3 + Math.floor(r() * 4); circ(c.g, cx, h - rr - 1, rr, '#ffffff'); }
    rect(c.g, 3, h - 3, w - 6, 2, '#ffffff');
    const id = c.g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (id.data[i + 3] && y > h - 4) { id.data[i] = 220; id.data[i + 1] = 228; id.data[i + 2] = 240; } }
    c.g.putImageData(id, 0, 0);
    out.push(c);
  }
  return out;
})();
function drawSky(g, sk, hour, t, opt = {}) {
  drawSkyBands(g, sk, 0, 150);
  // 별
  if (sk.night > 0.3) {
    for (const s of STARS) {
      const tw = Math.sin(t * 2 + s.p) > 0.6 - sk.night * 0.4;
      if (tw) px(g, s.x, s.y, s.b ? '#ffffff' : '#b8c4ff');
    }
  }
  // 해/달
  const hh = ((hour % 24) + 24) % 24;
  if (hh >= 5.5 && hh <= 19) {
    const k = (hh - 5.5) / 13.5, sx = 20 + k * 280, sy = 118 - Math.sin(Math.PI * k) * 92;
    circ(g, sx, sy, 9, sk.night > 0.1 || hh > 16.5 ? '#ffb070' : '#fff6c8');
    circ(g, sx, sy, 7, hh > 16.5 || hh < 7 ? '#ff8a5a' : '#ffe680');
  } else {
    const k = ((hh + 24 - 19) % 24) / 10.5, mx = 30 + k * 260, my = 110 - Math.sin(Math.PI * k) * 80;
    circ(g, mx, my, 6, '#fff4c8'); circ(g, mx + 3, my - 2, 5, sk.mid);
  }
  // 오로라
  if (opt.aurora && sk.night > 0.5) {
    for (let x = 0; x < W; x += 2) {
      const top = 22 + Math.sin(x * 0.03 + t * 0.6) * 10 + Math.sin(x * 0.011 - t * 0.3) * 14;
      const len = 26 + Math.sin(x * 0.05 + t) * 10;
      g.globalAlpha = 0.35 * sk.night * (opt.aurora || 1);
      rect(g, x, top, 2, len * 0.4, '#7dffb0');
      g.globalAlpha = 0.22 * sk.night * (opt.aurora || 1);
      rect(g, x, top + len * 0.4, 2, len * 0.6, '#3fd8a0');
      g.globalAlpha = 0.18 * sk.night * (opt.aurora || 1);
      rect(g, x, top - 8, 2, 8, '#c08aff');
    }
    g.globalAlpha = 1;
  }
  // 구름
  const nCloud = opt.weather === 'cloud' || opt.weather === 'rain' ? 7 : opt.weather === 'snow' ? 5 : 3;
  const cloudCol = opt.weather === 'rain' ? 0.45 : 0;
  for (let i = 0; i < nCloud; i++) {
    const cs = CLOUD_SPR[i % 4];
    const x = ((i * 97 + t * (3 + i % 3) - (opt.camX || 0) * 0.08) % (W + 80) + W + 80) % (W + 80) - 60;
    const y = 12 + (i * 23) % 50;
    g.globalAlpha = sk.night > 0.5 ? 0.35 : 0.9;
    drawSpr(g, cloudCol ? silhouette(cs, '#9aa2b4') : cs, x, y);
    g.globalAlpha = 1;
  }
}

// ---------- 밤 조명 그리기 ----------
function drawLights(g, L, ox, night, t) {
  if (night <= 0.05) return;
  g.save();
  for (const l of L) {
    const x = Math.round(l.x - ox);
    if (x < -40 || x > W + 40) continue;
    if (l.blink && Math.floor(t * 1.5 + l.x) % 2 === 0) continue;
    if (l.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.09 * night;
      for (let r = l.r; r > 2; r -= Math.max(2, Math.floor(l.r / 4))) circ(g, x, l.y, r, l.c);
      g.globalCompositeOperation = 'source-over';
    } else if (l.sparkle) {
      if (night > 0.6 && (Math.floor(t) % 3 === 0)) {
        const r = seeded(Math.floor(t * 8));
        g.globalAlpha = night;
        for (let i = 0; i < 14; i++) px(g, x + r() * l.w, l.y + r() * l.h, '#ffffff');
      }
    } else if (l.w) {
      g.globalAlpha = night * (l.neon ? (0.85 + 0.15 * Math.sin(t * 8 + l.x)) : 1);
      rect(g, x, l.y, l.w, l.h, l.c);
      if (l.label) text(g, l.label, x + l.w / 2, l.y + 1 + (l.ly || 0), l.fg || '#ffffff', { align: 'center' });
      if (l.neon) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 * night; rect(g, x - 2, l.y - 2, l.w + 4, l.h + 4, l.c); g.globalCompositeOperation = 'source-over'; }
    } else {
      g.globalAlpha = night;
      px(g, x, l.y, l.c);
      if (l.r > 1) { px(g, x - 1, l.y, l.c); px(g, x + 1, l.y, l.c); px(g, x, l.y - 1, l.c); px(g, x, l.y + 1, l.c); }
    }
  }
  g.restore();
}
