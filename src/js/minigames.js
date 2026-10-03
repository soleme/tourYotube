'use strict';
// =====================================================================
//  minigames.js — 랜드마크 구도 / 먹방 연타 / 리듬 체험
// =====================================================================
const MiniScene = {
  m: null,
  anchor() { return { x: 160, y: 80 }; },
  update(dt) { if (this.m) this.m.update(dt); },
  draw(g) { if (this.m) this.m.draw(g); },
};
function runMini(type, opts) {
  return new Promise(res => {
    const prev = scene;
    const m = MINIS[type](opts);
    m.done = score => {
      wipe(() => { MiniScene.m = null; scene = prev; if (prev === CityScene) Music.play(genTrack(CityScene.city.id, CityScene.city.music)); })
        .then(() => res(Math.round(clamp(score, 0, 100))));
    };
    wipe(() => { MiniScene.m = m; scene = MiniScene; Music.play(m.music || genTrack('mini', { scale: 'majPenta', root: 64, bpm: 140, busy: 0.6 })); });
  });
}
// 도시 배경만 그리기 (미니게임용)
function drawCityBackdrop(g, city, cam, hour, t, yOff = 0) {
  const L = cityLayers(city.id), sk = skyAt(hour, city, S.weather);
  drawSky(g, sk, hour, t, { aurora: city.aurora ? 1 : 0, weather: S.weather, camX: cam });
  drawLayers(g, L, cam, sk, t, yOff);
  return sk;
}
function miniCard(g, title, lines, t) {
  g.globalAlpha = 0.86; rect(g, 30, 34, 260, 96, OUT); g.globalAlpha = 1;
  rect(g, 30, 34, 260, 2, '#e8394a'); rect(g, 30, 128, 260, 2, '#e8394a');
  text(g, title, 160, 44, '#ffd23f', { align: 'center', font: FM });
  lines.forEach((l, i) => text(g, l, 160, 66 + i * 13, '#ffffff', { align: 'center' }));
  const n = Math.ceil(2.6 - t);
  if (t > 0.6 && n > 0) text(g, String(n), 160, 108, '#ff8a8a', { align: 'center', font: FM });
}
function miniResult(g, label, score) {
  g.globalAlpha = 0.86; rect(g, 70, 60, 180, 54, OUT); g.globalAlpha = 1;
  rect(g, 70, 60, 180, 2, '#ffd23f'); rect(g, 70, 112, 180, 2, '#ffd23f');
  text(g, label, 160, 68, '#ffffff', { align: 'center', font: FM });
  text(g, `점수 ${Math.round(score)} / 100`, 160, 88, '#ffd23f', { align: 'center' });
  text(g, stars(score), 160, 100, '#ffd23f', { align: 'center' });
}
const MINIS = {};

// ---------- 1) 랜드마크 구도 맞추기 ----------
MINIS.frame = o => {
  const city = CityScene.city, cam = SPOT_PHOTO_X - 160 + 6;
  const hour = S.hour, yOff = o.drone ? 34 : 0;
  const amp = (S.gear.gimbal ? 0.5 : 1) * (o.drone ? 1.3 : 1);
  const tgt = { w: 96, h: 66 };
  tgt.x = LM_FAR_X - Math.round(cam * PARALLAX.far) - tgt.w / 2; tgt.y = 36 + yOff;
  const m = { phase: 'intro', t: 0, pt: 0, mx: 0, my: 0, shots: [], freeze: 0, pol: [], judge: null, jt: 0, total: 3, limit: 12, bg: makeCanvas(W, H) };
  const vf = () => {
    const s = m.pt * (o.drone ? 1.25 : 1);
    return { x: tgt.x + (Math.sin(s * 1.3) * 30 + Math.sin(s * 3.1 + 1) * 10) * amp + m.mx, y: tgt.y + (Math.sin(s * 1.7 + 2) * 18 + Math.cos(s * 2.6) * 7) * amp + m.my, w: tgt.w, h: tgt.h };
  };
  m.update = dt => {
    m.t += dt;
    if (m.phase === 'intro') { if (m.t > 2.6 || (m.t > 0.5 && Input.pressed.a)) { m.phase = 'play'; m.t = 0; } return; }
    if (m.phase === 'result') { if (m.t > 1.8 || (m.t > 0.6 && Input.pressed.a)) { m.phase = 'end'; m.done(m.score); } return; }
    if (m.phase !== 'play') return;
    if (m.freeze > 0) { m.freeze -= dt; return; }
    m.pt += dt;
    const sp = 75;
    if (Input.down.left) m.mx -= sp * dt; if (Input.down.right) m.mx += sp * dt;
    if (Input.down.up) m.my -= sp * dt; if (Input.down.down) m.my += sp * dt;
    m.mx = clamp(m.mx, -80, 80); m.my = clamp(m.my, -50, 50);
    if (Input.pressed.a || Input.click) {
      const v = vf();
      const d = Math.hypot(v.x - tgt.x, v.y - tgt.y);
      const sc = clamp(100 - d * 2.1, 0, 100);
      m.shots.push(sc);
      m.judge = d < 5 ? 'PERFECT!' : d < 14 ? 'GOOD!' : d < 28 ? 'OK' : '흔들렸다...';
      m.jt = 1;
      FX.flash = 0.7; Snd.play('shutter'); m.freeze = 0.35;
      const pc = makeCanvas(48, 33);
      pc.g.fillStyle = '#ffffff'; pc.g.fillRect(0, 0, 48, 33);
      pc.g.drawImage(m.bg, Math.round(v.x), Math.round(v.y), v.w, v.h, 2, 2, 44, 27);
      m.pol.push(pc);
      if (d < 5) Snd.play('perfect');
    }
    if (m.jt > 0) m.jt -= dt;
    if (m.shots.length >= m.total || m.pt > m.limit) {
      while (m.shots.length < m.total) m.shots.push(0);
      m.score = avg(m.shots);
      m.phase = 'result'; m.t = 0; Snd.play(m.score > 60 ? 'good' : 'bad');
    }
  };
  m.draw = g => {
    m.bg.g.clearRect(0, 0, W, H);
    drawCityBackdrop(m.bg.g, city, cam, hour, T, yOff);
    g.drawImage(m.bg, 0, 0);
    if (o.drone) { for (let i = 0; i < 4; i++) { const x = ((i * 113 - T * 90) % 420 + 420) % 420 - 60; g.globalAlpha = 0.5; drawSpr(g, CLOUD_SPR[i % 4], x, 20 + i * 30, false, 2); g.globalAlpha = 1; } }
    if (m.phase === 'intro') {
      miniCard(g, o.drone ? '드론 촬영!' : (isNight() ? '야경 촬영!' : `${city.lmName} 촬영!`), ['방향키로 흔들리는 뷰파인더를 움직여', '노란 점선 구도에 맞추고 스페이스로 찰칵!', '기회는 3번'], m.t);
      return;
    }
    const v = vf();
    // 노란 점선 목표
    if (Math.floor(T * 4) % 2 === 0 || m.phase !== 'play') {
      for (let i = 0; i < tgt.w; i += 4) { hline(g, tgt.x + i, tgt.y, 2, '#ffd23f'); hline(g, tgt.x + i, tgt.y + tgt.h, 2, '#ffd23f'); }
      for (let i = 0; i < tgt.h; i += 4) { vline(g, tgt.x, tgt.y + i, 2, '#ffd23f'); vline(g, tgt.x + tgt.w, tgt.y + i, 2, '#ffd23f'); }
    }
    // 바깥 어둡게
    g.globalAlpha = 0.45;
    rect(g, 0, 0, W, v.y, '#000'); rect(g, 0, v.y + v.h, W, H, '#000'); rect(g, 0, v.y, v.x, v.h, '#000'); rect(g, v.x + v.w, v.y, W, v.h, '#000');
    g.globalAlpha = 1;
    const c = '#ffffff';
    for (const [cx, cy, dx, dy] of [[v.x, v.y, 1, 1], [v.x + v.w, v.y, -1, 1], [v.x, v.y + v.h, 1, -1], [v.x + v.w, v.y + v.h, -1, -1]]) { hline(g, dx > 0 ? cx : cx - 7, cy, 8, c); vline(g, cx, dy > 0 ? cy : cy - 7, 8, c); }
    hline(g, v.x + v.w / 2 - 3, v.y + v.h / 2, 7, c); vline(g, v.x + v.w / 2, v.y + v.h / 2 - 3, 7, c);
    if (Math.floor(T * 2) % 2 === 0) { circ(g, v.x + 7, v.y + 7, 2, '#ff3b3b'); }
    text(g, 'REC', v.x + 12, v.y + 3, '#ffffff', { shadow: OUT });
    text(g, `${Math.min(m.shots.length + 1, m.total)}/${m.total}`, v.x + v.w - 3, v.y + 3, '#ffffff', { align: 'right', shadow: OUT });
    // 타이머
    rect(g, 60, 16, 200, 4, OUT); rect(g, 61, 17, Math.round(198 * Math.max(0, 1 - m.pt / m.limit)), 2, '#ffd23f');
    // 폴라로이드
    m.pol.forEach((p, i) => { rect(g, 5 + i * 52, H - 43 + (i % 2) * 2, 50, 35, OUT); drawSpr(g, p, 6 + i * 52, H - 42 + (i % 2) * 2); });
    if (m.jt > 0) text(g, m.judge, 160, 130, m.judge === 'PERFECT!' ? '#ffd23f' : '#ffffff', { align: 'center', font: FM, outline: OUT });
    if (m.phase === 'result') miniResult(g, '촬영 완료!', m.score);
  };
  return m;
};

// ---------- 2) 먹방 ----------
MINIS.eat = o => {
  const city = CityScene.city, food = o.food;
  const m = { phase: 'intro', t: 0, presses: 0, heat: 0, stun: 0, chew: 0, bits: [], needle: 0, nd: 1, react: null, target: 24, pops: [], dur: 5 };
  const fc = makeCanvas(44, 26);
  m.update = dt => {
    m.t += dt;
    if (m.phase === 'intro') { if (m.t > 2.6 || (m.t > 0.5 && Input.pressed.a)) { m.phase = 'eat'; m.t = 0; } return; }
    for (const b of m.bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 200 * dt; b.l -= dt; }
    m.bits = m.bits.filter(b => b.l > 0);
    for (const p of m.pops) p.t += dt;
    m.pops = m.pops.filter(p => p.t < 0.7);
    if (m.chew > 0) m.chew -= dt;
    if (m.phase === 'eat') {
      m.heat = Math.max(0, m.heat - 28 * dt);
      if (m.stun > 0) m.stun -= dt;
      if ((Input.pressed.a || Input.click) && m.presses < m.target) {
        if (m.stun > 0) { Snd.play('miss'); }
        else {
          m.presses++; m.chew = 0.14; Snd.play('eat');
          for (let i = 0; i < 4; i++) m.bits.push({ x: 160 + rand(-8, 8), y: 118, vx: rand(-40, 40), vy: rand(-90, -40), l: 0.6, c: pick(food.colors) });
          m.pops.push({ t: 0, x: 160 + rand(-50, 50), y: rand(50, 80), s: pick(['냠!', '쩝쩝', '후루룩', '냠냠', '음~!']) });
          if (food.spicy) { m.heat += 10; if (m.heat > 100) { m.stun = 0.9; m.heat = 55; shake(3); Snd.play('bad'); m.pops.push({ t: 0, x: 160, y: 40, s: '으아 매워!!', big: 1 }); } }
        }
      }
      if (m.t > m.dur || m.presses >= m.target) { m.phase = 'react'; m.t = 0; }
    } else if (m.phase === 'react') {
      m.needle += m.nd * dt * 1.5;
      if (m.needle > 1) { m.needle = 1; m.nd = -1; } if (m.needle < 0) { m.needle = 0; m.nd = 1; }
      if (Input.pressed.a || Input.click || m.t > 4) {
        const r = Input.pressed.a || Input.click ? 1 - Math.abs(m.needle - 0.5) * 2 : 0;
        m.react = r > 0.85 ? '존맛탱!!!' : r > 0.6 ? '맛있다~!' : r > 0.3 ? '음, 괜찮네' : '...?';
        m.score = clamp(m.presses / m.target, 0, 1) * 62 + r * 38;
        m.phase = 'result'; m.t = 0; Snd.play(m.score > 60 ? 'good' : 'bad');
        if (r > 0.85) shake(2);
      }
    } else if (m.phase === 'result') {
      if (m.t > 2 || (m.t > 0.7 && Input.pressed.a)) { m.phase = 'end'; m.done(m.score); }
    }
  };
  m.draw = g => {
    // 가게 안
    const wall = mix(city.hotel || '#c9a27a', '#fff4e0', 0.4);
    rect(g, 0, 0, W, H, wall);
    for (let x = 0; x < W; x += 16) vline(g, x, 0, 112, shade(wall, -0.06));
    rect(g, 0, 0, W, 10, shade(city.accent, -0.1));
    for (let i = 0; i < 10; i++) { const x = 16 + i * 32; line(g, x, 10, x + 16, 16, '#3d3d4a'); circ(g, x + 16, 17, 2, Math.floor(T * 2 + i) % 2 ? '#ffe680' : '#ffb84d'); }
    rect(g, 14, 24, 70, 50, '#3a2a1e'); rect(g, 16, 26, 66, 46, '#2a4a3a');
    text(g, 'MENU', 49, 28, '#ffffff', { align: 'center' });
    text(g, food.name, 49, 42, '#ffe680', { align: 'center' });
    text(g, `${won(priceOf(BAL.FOOD))}`, 49, 56, '#ffffff', { align: 'center' });
    rect(g, 236, 22, 66, 48, '#8fd0f0'); rect(g, 236, 22, 66, 2, '#5a3d2a'); rect(g, 236, 68, 66, 2, '#5a3d2a'); vline(g, 268, 22, 48, '#5a3d2a');
    // 주인공 (크게)
    const by = 44, bx = 160 - 20;
    const lean = m.chew > 0 ? 2 : 0;
    drawSpr(g, PlayerSpr.top, bx, by + lean, false, 3);
    // 입
    const mx = bx + 7 * 3, my = by + 8 * 3 + lean;
    if (m.chew > 0) rect(g, mx - 3, my, 6, 5, '#6a1a2a'); else rect(g, mx - 2, my + 1, 5, 2, '#a83a4a');
    if (m.stun > 0) { g.globalAlpha = 0.45; rect(g, bx + 9, by + 15 + lean, 18, 12, '#ff2b2b'); g.globalAlpha = 1; rect(g, bx + 30, by + 14 + lean, 2, 4, '#9fd3ff'); for (let i = 0; i < 3; i++) { const fy = by - 6 - ((T * 40 + i * 6) % 18); px(g, bx + 30 + i * 3, fy, '#ff8a3d'); px(g, bx + 30 + i * 3, fy - 1, '#ffd23f'); } }
    // 테이블
    rect(g, 0, 112, W, 68, '#8a5a3a'); rect(g, 0, 112, W, 3, '#b07a4a'); for (let x = 0; x < W; x += 40) vline(g, x, 115, 65, '#7a4e32');
    // 음식
    fc.g.clearRect(0, 0, 44, 26);
    drawFood(fc.g, food, 22, 24, clamp(m.presses / m.target, 0, 1));
    drawSpr(g, fc, 160 - 66, 62, false, 3);
    for (const b of m.bits) rect(g, b.x, b.y, 2, 2, b.c);
    for (const p of m.pops) { g.globalAlpha = 1 - p.t / 0.7; text(g, p.s, p.x, p.y - p.t * 20, p.big ? '#ff5252' : '#ffffff', { align: 'center', outline: OUT, font: p.big ? FM : FS }); g.globalAlpha = 1; }
    if (m.phase === 'intro') { miniCard(g, `${food.name} 먹방!`, ['스페이스를 연타해서 맛있게 먹자!', food.spicy ? '너무 빨리 먹으면 매워서 멈춘다 (게이지 주의)' : '5초 안에 다 먹으면 완벽!', '마지막엔 리액션 타이밍!'], m.t); return; }
    if (m.phase === 'eat') {
      rect(g, 60, 150, 200, 8, OUT); rect(g, 61, 151, Math.round(198 * m.presses / m.target), 6, '#7cff9a');
      text(g, `먹방 게이지  ${Math.max(0, m.dur - m.t).toFixed(1)}초`, 160, 160, '#ffffff', { align: 'center', outline: OUT });
      if (food.spicy) { rect(g, 290, 40, 10, 70, OUT); const hh = Math.round(66 * clamp(m.heat / 100, 0, 1)); rect(g, 292, 108 - hh, 6, hh, m.heat > 75 ? '#ff3b3b' : '#ff8a3d'); text(g, '맵기', 295, 112, '#ffffff', { align: 'center', outline: OUT }); }
      if (Math.floor(T * 6) % 2 === 0) text(g, '연타!!', 160, 136, '#ffd23f', { align: 'center', font: FM, outline: OUT });
    }
    if (m.phase === 'react') {
      text(g, '리액션 타이밍! 가운데서 스페이스', 160, 132, '#ffffff', { align: 'center', outline: OUT });
      rect(g, 60, 148, 200, 10, OUT); rect(g, 61, 149, 198, 8, '#5a4f7a'); rect(g, 140, 149, 40, 8, '#5ee08a'); rect(g, 154, 149, 12, 8, '#ffd23f');
      const nx = 61 + Math.round(m.needle * 198); rect(g, nx - 1, 145, 3, 16, '#ffffff');
    }
    if (m.phase === 'result') {
      text(g, m.react, 205, 56, '#ffd23f', { align: 'center', font: FM, outline: OUT });
      miniResult(g, '먹방 완료!', m.score);
    }
  };
  return m;
};

// ---------- 3) 리듬 체험 ----------
const ARROW_COL = { left: '#ff5e7a', up: '#5ee08a', down: '#5ab0ff', right: '#ffd23f' };
const ARROW_SPR = (() => {
  const base = ['....X....', '....XX...', 'XXXXXXX..', 'XXXXXXXX.', 'XXXXXXXXX', 'XXXXXXXX.', 'XXXXXXX..', '....XX...', '....X....'];
  const rot = (rows, times) => { let r = rows.map(s => s.split('')); for (let k = 0; k < times; k++) { const n = r.length; r = r[0].map((_, i) => r.map(row => row[i]).reverse()); } return r.map(a => a.join('')); };
  const out = {};
  const mk = (rows, col) => { const big = ['...........'].concat(rows.map(r => '.' + r + '.')).concat(['...........']); const pal = { X: col, '.': null }; const s = sprite(big, pal); const o2 = makeCanvas(s.width, s.height); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) o2.g.drawImage(silhouette(s, OUT), dx, dy); o2.g.drawImage(s, 0, 0); return o2; };
  out.right = mk(base, ARROW_COL.right);
  out.down = mk(rot(base, 1), ARROW_COL.down);
  out.left = mk(rot(base, 2), ARROW_COL.left);
  out.up = mk(rot(base, 3), ARROW_COL.up);
  return out;
})();
MINIS.rhythm = o => {
  const city = o.city, act = city.act;
  const bpm = clamp(city.music.bpm, 92, 128), beat = 60 / bpm;
  const notes = [];
  let tt = 1.2;
  const dirs = ['left', 'up', 'down', 'right'];
  const N = 18;
  for (let i = 0; i < N; i++) { notes.push({ t: tt, d: pick(dirs), s: 0 }); tt += beat * (i % 4 === 3 ? 2 : chance(0.3) ? 0.5 : 1); }
  const m = {
    phase: 'intro', t: 0, time: 0, combo: 0, maxCombo: 0, perf: 0, good: 0, bad: 0, miss: 0, judge: null, jt: 0, pose: 'idle', pt: 0, bursts: [], hitX: 56, laneY: 146, speed: 130,
    music: genTrack('rh_' + city.id, { ...city.music, bpm, drums: true }),
  };
  m.notes = notes;
  const end = notes[notes.length - 1].t + 1.2;
  const hit = (q, d) => {
    m.combo++; m.maxCombo = Math.max(m.maxCombo, m.combo);
    m.pose = d; m.pt = 0.25;
    if (q === 2) { m.perf++; m.judge = 'PERFECT'; Snd.play('perfect'); } else if (q === 1) { m.good++; m.judge = 'GOOD'; Snd.play('hit'); } else { m.bad++; m.judge = 'BAD'; Snd.play('hit'); }
    m.jt = 0.5;
    const cols = ['#ff5ec4', '#ffd23f', '#3fb6ff', '#7cff6b', '#c94ad9', '#ff8a2e'];
    for (let i = 0; i < (q === 2 ? 14 : 7); i++) m.bursts.push({ x: 160 + rand(-30, 30), y: rand(50, 110), vx: rand(-60, 60), vy: rand(-80, 10), l: rand(0.4, 0.9), c: pick(cols) });
  };
  m.update = dt => {
    m.t += dt;
    for (const b of m.bursts) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 120 * dt; b.l -= dt; }
    m.bursts = m.bursts.filter(b => b.l > 0);
    if (m.pt > 0) m.pt -= dt; else m.pose = 'idle';
    if (m.jt > 0) m.jt -= dt;
    if (m.phase === 'intro') { if (m.t > 2.6 || (m.t > 0.5 && Input.pressed.a)) { m.phase = 'play'; m.t = 0; m.time = 0; Music.stop(); Music.play(m.music); } return; }
    if (m.phase === 'result') { if (m.t > 2 || (m.t > 0.7 && Input.pressed.a)) { m.phase = 'end'; m.done(m.score); } return; }
    m.time += dt;
    for (const n of notes) if (n.s === 0 && m.time - n.t > 0.2) { n.s = -1; m.miss++; m.combo = 0; m.judge = 'MISS'; m.jt = 0.5; Snd.play('miss'); if (act.fx === 'surf') shake(2); }
    for (const d of dirs) if (Input.pressed[d]) {
      let target = null;
      for (const n of notes) if (n.s === 0 && Math.abs(m.time - n.t) < 0.22) { target = n; break; }
      if (target && target.d === d) { const e = Math.abs(m.time - target.t); target.s = 1; hit(e < 0.07 ? 2 : e < 0.15 ? 1 : 0, d); }
      else { m.combo = 0; m.judge = 'MISS'; m.jt = 0.4; Snd.play('miss'); if (target) { target.s = -1; m.miss++; } }
    }
    if (m.time > end) {
      m.score = clamp((m.perf + m.good * 0.65 + m.bad * 0.25) / N * 100 + Math.min(8, m.maxCombo * 0.5), 0, 100);
      m.phase = 'result'; m.t = 0; Snd.play(m.score > 60 ? 'good' : 'bad');
    }
  };
  m.draw = g => {
    const fx = act.fx, combo = m.combo;
    drawRhythmBg(g, fx, city, combo, m);
    // 퍼포머
    let px0 = 148, py0 = 70, flip = false;
    if (m.pose === 'left') { px0 -= 6; flip = true; } else if (m.pose === 'right') px0 += 6; else if (m.pose === 'up') py0 -= 10; else if (m.pose === 'down') py0 += 4;
    if (fx === 'surf') py0 += Math.round(Math.sin(T * 3) * 3) + 10;
    if (fx === 'ride') py0 += Math.round(Math.abs(Math.sin(T * 8)) * -2);
    drawRhythmMount(g, fx, act, px0, py0);
    if (fx !== 'ride' || act.mount !== 'jeep') drawSpr(g, PlayerSpr.frames[m.pose === 'idle' ? 0 : (m.pose === 'left' || m.pose === 'up') ? 1 : 2], px0, py0, flip, 2);
    else drawSpr(g, PlayerSpr.top, px0 + 2, py0 + 4, false, 2);
    if (fx === 'ring') { const ox = 210 + (m.pt > 0 && m.judge === 'PERFECT' ? 8 : 0); drawSpr(g, npcSprite({ hair: 'bald', skin: '#c98d62', hc: '#2b1d16', top: city.id === 'mexico' ? '#2f6be8' : '#e8394a', pants: '#2b2b33', dress: false }, 0), ox, 74, true, 2); if (city.id === 'mexico') { rect(g, ox + 4, 76, 12, 8, '#ffd23f'); rect(g, ox + 6, 80, 3, 2, OUT); } }
    if (fx === 'snow') for (let i = 0; i < 4; i++) drawSpr(g, AnimalSpr.penguin[Math.floor(T * 4 + i) % 2], 40 + i * 26 + (i > 1 ? 120 : 0), 92, false, 2);
    for (const b of m.bursts) rect(g, b.x, b.y, 2, 2, b.c);
    if (m.phase === 'intro') { miniCard(g, act.name, [act.verb, '화살표가 왼쪽 원에 닿을 때', '같은 방향키를 눌러라!'], m.t); return; }
    // 레인
    g.globalAlpha = 0.8; rect(g, 0, m.laneY - 6, W, 34, OUT); g.globalAlpha = 1;
    hline(g, 0, m.laneY - 6, W, '#5a4f9a'); hline(g, 0, m.laneY + 27, W, '#5a4f9a');
    const hx = m.hitX;
    circ(g, hx, m.laneY + 10, 14, '#ffffff'); circ(g, hx, m.laneY + 10, 12, m.jt > 0 && m.judge !== 'MISS' ? '#ffd23f' : '#3a3466');
    for (const n of notes) {
      if (n.s !== 0) continue;
      const x = hx + (n.t - m.time) * m.speed;
      if (x > W + 20) continue;
      drawSpr(g, ARROW_SPR[n.d], x - 11, m.laneY - 1, false, 2);
    }
    if (m.jt > 0) text(g, m.judge, hx, m.laneY - 20, m.judge === 'PERFECT' ? '#ffd23f' : m.judge === 'MISS' ? '#ff8a8a' : '#ffffff', { align: 'center', outline: OUT });
    if (combo > 2) text(g, `${combo} COMBO`, 290, 22, '#ffffff', { align: 'right', font: FM, outline: OUT });
    rect(g, 0, H - 4, Math.round(W * clamp(m.time / end, 0, 1)), 2, '#ffd23f');
    if (m.phase === 'result') miniResult(g, `${act.short} 완료!`, m.score);
  };
  return m;
};
function drawRhythmBg(g, fx, city, combo, m) {
  if (fx === 'stage' || fx === 'runway' || fx === 'ring') {
    rect(g, 0, 0, W, H, '#140f2a');
    for (let y = 0; y < 120; y += 6) hline(g, 0, y, W, '#1a1436');
    const n = 3 + Math.min(4, Math.floor(combo / 4));
    for (let i = 0; i < n; i++) {
      const cx = 160 + Math.sin(T * (0.8 + i * 0.3) + i * 2) * 120, col = ['#ff5ec4', '#3fb6ff', '#ffd23f', '#7cff6b', '#c94ad9', '#ff8a2e', '#ffffff'][i];
      g.globalAlpha = 0.16; g.globalCompositeOperation = 'lighter';
      for (let y = 0; y < 130; y++) { const w = 4 + y * 0.35; rect(g, cx - w / 2 + (y * (cx - 160)) / -400, y, w, 1, col); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    if (fx === 'runway') {
      for (let y = 100; y < 140; y++) { const w = 20 + (y - 100) * 4; rect(g, 160 - w / 2, y, w, 1, y % 4 ? '#e8e8f0' : '#c8c8d8'); }
      for (let i = 0; i < 8 + combo; i++) if (chance(0.15)) { const x = chance(0.5) ? rand(10, 90) : rand(230, 310); circ(g, x, rand(90, 130), 2, '#ffffff'); }
    } else if (fx === 'ring') {
      rect(g, 20, 112, 280, 24, '#d8dce8'); rect(g, 20, 136, 280, 6, '#3a5bd9');
      for (let i = 0; i < 3; i++) hline(g, 14, 76 + i * 12, 292, ['#e8394a', '#ffffff', '#3a5bd9'][i]);
      rect(g, 14, 70, 4, 72, '#c9c9d0'); rect(g, 302, 70, 4, 72, '#c9c9d0');
    } else { rect(g, 0, 112, W, 30, '#3a2a4a'); hline(g, 0, 112, W, '#ffd23f'); }
    for (let i = 0; i < 22; i++) { const x = i * 15, j = Math.abs(Math.round(Math.sin(T * 6 + i) * (2 + combo * 0.2))); circ(g, x, 128 - j, 5, '#0a0618'); rect(g, x - 6, 130 - j, 13, 14, '#0a0618'); }
  } else if (fx === 'ride') {
    const mnt = city.act.mount;
    const scroll = T * (mnt === 'scooter' ? 120 : 70);
    drawCityBackdrop(g, city, ((scroll % 320) + 320) % 320, Math.min(S.hour, 18), T, 0);
    rect(g, 0, 140, W, 40, mnt === 'scooter' ? '#6a6258' : city.ground[0]);
    for (let i = 0; i < 12; i++) { const x = ((i * 37 - scroll * 1.5) % 360 + 360) % 360 - 20; hline(g, x, 150 + (i % 3) * 8, 14, shade(city.ground[0], -0.15)); }
  } else if (fx === 'aurora') {
    const sk = skyAt(23, city, 'sun');
    drawSky(g, sk, 23, T, { aurora: 0.4 + Math.min(1.6, combo * 0.12) });
    hills(g, 0, W, 130, 16, '#1a2440', 'aur');
    rect(g, 0, 128, W, 52, '#d8e4f4'); dither(g, 0, 128, W, 4, '#d8e4f4', '#a8b8d0');
  } else if (fx === 'surf') {
    drawSkyBands(g, skyAt(13, city, 'sun'), 0, 110);
    circ(g, 260, 30, 9, '#fff6c8');
    for (let y = 100; y < H; y++) { const c = y < 110 ? '#5ab4e8' : y < 140 ? '#2f86c0' : '#1f6ea8'; rect(g, 0, y, W, 1, c); }
    for (let i = 0; i < 20; i++) { const x = ((i * 47 - T * 60) % 360 + 360) % 360 - 20, y = 104 + (i % 6) * 12 + Math.round(Math.sin(T * 2 + i) * 2); hline(g, x, y, 10, '#ffffff'); hline(g, x + 2, y - 1, 6, '#bfe6ff'); }
    for (let x = 0; x < W; x++) { const y = 118 + Math.round(Math.sin(x * 0.05 + T * 2) * 6); px(g, x, y, '#ffffff'); }
  } else if (fx === 'samba') {
    drawCityBackdrop(g, city, 140, Math.max(19.5, Math.min(S.hour, 23)), T, 0);
    rect(g, 40, 70, 240, 50, '#ff5ec4'); rect(g, 40, 70, 240, 4, '#ffd23f');
    for (let i = 0; i < 12; i++) { const x = 50 + i * 20; line(g, x, 70, x - 4 + Math.round(Math.sin(T * 4 + i) * 3), 50, pick(['#ffd23f', '#3fb6ff', '#7cff6b'])); }
    for (let i = 0; i < 6 + combo; i++) if (chance(0.3)) px(g, rand(0, W), rand(0, 140), pick(['#ff5ec4', '#ffd23f', '#3fb6ff', '#7cff6b']));
  } else if (fx === 'powder') {
    drawCityBackdrop(g, city, 140, Math.min(S.hour, 17), T, 0);
    for (let i = 0; i < 3 + combo; i++) { g.globalAlpha = 0.35; circ(g, (i * 71 + T * 20) % W, 60 + (i * 37) % 70, 6 + (i % 3) * 3, ['#ff5ec4', '#ffd23f', '#3fb6ff', '#7cff6b', '#c94ad9'][i % 5]); g.globalAlpha = 1; }
  } else if (fx === 'snow') {
    drawCityBackdrop(g, city, 140, S.hour, T, 0);
  } else drawCityBackdrop(g, city, 140, S.hour, T, 0);
}
function drawRhythmMount(g, fx, act, x, y) {
  if (fx === 'surf') { rect(g, x - 8, y + 37, 42, 4, '#ffd23f'); rect(g, x - 6, y + 38, 38, 1, '#e8394a'); }
  if (fx !== 'ride') return;
  if (act.mount === 'camel') drawSpr(g, AnimalSpr.camel[0], x - 10, y + 22, false, 2);
  else if (act.mount === 'jeep') { g.save(); g.translate(x - 14, y + 44); g.scale(2, 2); drawVehicle(g, { kind: 'jeep', color: '#c9a64a', dir: 1 }, 0, 0, T); g.restore(); }
  else if (act.mount === 'scooter') { rect(g, x - 2, y + 30, 30, 6, '#7fd0c0'); rect(g, x + 22, y + 18, 4, 14, '#555'); circ(g, x + 2, y + 38, 4, '#1e1e26'); circ(g, x + 24, y + 38, 4, '#1e1e26'); }
}
