'use strict';
// =====================================================================
//  game.js — 상태, 공통 연출, HUD, 타이틀/도시/지도 씬
// =====================================================================
const DAY_LIMIT = BAL.DAY_LIMIT;
const SAVE_KEY = 'tdtv_save_v1';
let S = null;
let scene = null;
let T = 0;

function newState(channel) {
  return {
    v: 1, channel, day: 1, hour: 9, money: BAL.START_MONEY, hp: 100, mood: 70, subs: BAL.START_SUBS,
    totalViews: 0, revenue: 0, city: 'seoul', visited: { seoul: 1 }, filmed: {}, clips: [], gear: {},
    items: { energy: 2 }, status: { sick: 0 }, monetized: false, videos: [], best: null, milestones: {},
    missions: [], flags: { seen: {} }, weather: 'sun', km: 0, flights: 0, buff: 1, viralBonus: 0,
    unlocked: {}, collabs: 0, lives: 0, nextId: 1, tutorial: 0,
  };
}
function save() { try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

const cityNow = () => CITY[S.city];
const clipCap = () => (S.gear.sd ? 8 : 4);
const priceOf = base => Math.max(1000, Math.round(base * cityNow().price / 1000) * 1000);
const clockStr = (hh = S.hour) => `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.round((hh % 1) * 60)).padStart(2, '0')}`;
const clockAbs = () => (S.hour < 5 ? S.hour + 24 : S.hour);
const isNight = (hh = S.hour) => hh >= 19 || hh < 5;
function gearQ(kind) {
  let q = S.gear.cam2 ? 25 : S.gear.cam1 ? 12 : 0;
  if (S.gear.mic && (kind === 'food' || kind === 'act' || kind === 'event')) q += 8;
  if (S.gear.light && kind === 'food') q += 5;
  if (kind === 'drone') q += 15;
  return q;
}
function moodAdj() { return Math.round((S.mood - 50) / 5) + (S.hp < 25 ? -10 : 0) + (S.status.sick ? -8 : 0); }
function novelty(key) { return novFor(S.filmed[key] || 0); }
function novTag(key) { const n = S.filmed[key] || 0; return n === 0 ? 'NEW! 신선한 소재' : n === 1 ? '한 번 찍은 소재' : '재탕 소재 (조회수↓)'; }
function stars(q) { const n = clamp(Math.round(q / 20), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); }

// ---------- 공통 연출 ----------
const FX = { floats: [], shake: 0, flash: 0 };
function floatTxt(str, col, x, y, delay = 0) { FX.floats.push({ str, col, x, y, t: -delay }); }
function drawFloats(g, dt) {
  for (const f of FX.floats) {
    f.t += dt;
    if (f.t < 0) continue;
    const a = f.t < 1.2 ? 1 : Math.max(0, 1 - (f.t - 1.2) / 0.5);
    g.globalAlpha = a;
    text(g, f.str, f.x, f.y - f.t * 14, f.col, { align: 'center', outline: OUT });
    g.globalAlpha = 1;
  }
  FX.floats = FX.floats.filter(f => f.t < 1.7);
}
function shake(n = 3) { FX.shake = Math.max(FX.shake, n); }

function addSubs(n) { S.subs = Math.max(0, Math.floor(S.subs + n)); }
function gain(o, at) {
  const p = at || (scene && scene.anchor ? scene.anchor() : { x: 160, y: 70 });
  let k = 0;
  const f = (s, c) => { floatTxt(s, c, p.x, p.y - k * 12, k * 0.18); k++; };
  if (o.money) { S.money = Math.max(0, S.money + o.money); f((o.money > 0 ? '+' : '-') + won(Math.abs(o.money)), o.money > 0 ? '#ffd23f' : '#ff8a8a'); Snd.play(o.money > 0 ? 'coin' : 'spend'); }
  if (o.subs) { addSubs(o.subs); f(`구독자 ${o.subs > 0 ? '+' : ''}${fmt(o.subs)}`, o.subs > 0 ? '#ff6b7a' : '#a0a0b0'); }
  if (o.hp) { S.hp = clamp(S.hp + o.hp, 0, 100); f(`체력 ${o.hp > 0 ? '+' : ''}${o.hp}`, o.hp > 0 ? '#7cff9a' : '#ff8a8a'); }
  if (o.mood) { S.mood = clamp(S.mood + o.mood, 0, 100); f(`텐션 ${o.mood > 0 ? '+' : ''}${o.mood}`, o.mood > 0 ? '#ffe680' : '#9aa0c0'); }
}
function passTime(h) {
  S.hour += h;
  while (S.hour >= 24) { S.hour -= 24; S.day++; onNewDay(); }
}
function onNewDay() {
  S.weather = pick(cityNow().wx);
  if (S.status.sick > 0) S.status.sick--;
  if (S.buffDays > 0 && --S.buffDays === 0) S.buff = 1;
  if (CityScene.city && scene === CityScene) CityScene.spawnEventNpcs();
}

// ---------- 화면 전환 (도트 다이아몬드 와이프) ----------
const Wipe = { p: 0, dir: 0, onMid: null, onEnd: null };
function wipe(fn) {
  return new Promise(res => {
    Wipe.dir = 1;
    Wipe.onMid = async () => { await fn(); Wipe.dir = -1; Wipe.onEnd = res; };
  });
}
function updateWipe(dt) {
  if (Wipe.dir === 1) { Wipe.p += dt * 2.8; if (Wipe.p >= 1) { Wipe.p = 1; Wipe.dir = 2; const m = Wipe.onMid; Wipe.onMid = null; m && m(); } }
  else if (Wipe.dir === -1) { Wipe.p -= dt * 2.8; if (Wipe.p <= 0) { Wipe.p = 0; Wipe.dir = 0; const e = Wipe.onEnd; Wipe.onEnd = null; e && e(); } }
}
function drawWipe(g) {
  if (Wipe.p <= 0) return;
  const cs = 16, nx = W / cs, ny = Math.ceil(H / cs);
  g.fillStyle = OUT;
  for (let by = 0; by < ny; by++) for (let bx = 0; bx < nx; bx++) {
    const local = clamp(Wipe.p * 2 - (bx + by) / (nx + ny), 0, 1);
    const s = Math.round(local * cs / 2) * 2;
    if (s > 0) g.fillRect(bx * cs + (cs - s) / 2, by * cs + (cs - s) / 2, s, s);
  }
}
function setScene(s, ...args) { if (scene && scene.exit) scene.exit(); scene = s; if (s.enter) s.enter(...args); }

// ---------- HUD ----------
function drawHUD(g) {
  g.globalAlpha = 0.82; rect(g, 0, 0, W, 13, OUT); g.globalAlpha = 1;
  hline(g, 0, 13, W, '#3a3466');
  let x = 3;
  const dd = DAY_LIMIT - S.day;
  text(g, `${S.day}일차`, x, 2, dd <= 5 ? '#ff8a8a' : '#ffffff'); x += textWidth(`${S.day}일차`) + 5;
  icon(g, 'clock', x, 3); x += 9;
  text(g, clockStr(), x, 2, isNight() ? '#b8c4ff' : '#ffffff'); x += textWidth('00:00') + 4;
  icon(g, S.weather === 'rain' ? 'rain' : S.weather === 'snow' ? 'snow' : S.weather === 'cloud' ? 'cloud' : isNight() ? 'moon' : 'sun', x, 3); x += 11;
  const bar = (ic, v, col) => {
    icon(g, ic, x, 3); x += 9;
    rect(g, x, 4, 22, 5, '#2a2550'); rect(g, x, 4, Math.round(22 * v / 100), 5, v < 25 ? '#ff5252' : col); hline(g, x, 4, Math.round(22 * v / 100), shade(v < 25 ? '#ff5252' : col, 0.35));
    x += 26;
  };
  bar(S.status.sick ? 'sick' : 'heart', S.hp, '#ff5e7a');
  bar('smile', S.mood, '#ffd23f');
  icon(g, 'coin', x, 3); x += 9;
  const ms = won(S.money); text(g, ms, x, 2, '#ffe680'); x += textWidth(ms) + 5;
  icon(g, 'play', x, 3); x += 9;
  const ss = kNum(S.subs); text(g, ss, x, 2, '#ffffff'); x += textWidth(ss) + 5;
  icon(g, 'film', x, 3); x += 9;
  text(g, `${S.clips.length}/${clipCap()}`, x, 2, S.clips.length >= clipCap() ? '#ff8a8a' : '#9fe0ff');
  // 메뉴 버튼
  rect(g, W - 13, 1, 12, 11, '#3a3466'); for (let i = 0; i < 3; i++) hline(g, W - 10, 3 + i * 3, 6, '#ffffff');
}

// =====================================================================
//  타이틀
// =====================================================================
const TitleScene = {
  t: 0, menuOpen: false, parade: null, logo: null,
  enter() {
    this.t = 0; this.menuOpen = false;
    Music.play(genTrack('title', { scale: 'major', root: 60, bpm: 128, busy: 0.55 }));
    if (!this.parade) this.build();
  },
  build() {
    const ids = ['eiffel', 'pyramids', 'liberty', 'taj', 'opera', 'namsan', 'colosseum', 'tokyo', 'cristo', 'watArun', 'hallgrim', 'teo'];
    const cw = 150, c = makeCanvas(ids.length * cw, H);
    ids.forEach((id, i) => {
      const tmp = makeCanvas(420, H);
      LM[id](tmp.g, 210, 150, []);
      c.g.drawImage(tmp, 210 - cw / 2, 0, cw, H, i * cw, 0, cw, H);
    });
    this.parade = silhouette(c, '#2a1f4a');
    this.parade2 = silhouette(c, '#4a2f6a');
    const lg = makeCanvas(140, 40);
    text(lg.g, '80일간의', 70, 0, '#ffd23f', { align: 'center', font: FM, outline: OUT });
    text(lg.g, '떡상 여행', 70, 16, '#ffffff', { align: 'center', font: FB, outline: OUT });
    this.logo = lg;
  },
  update(dt) {
    this.t += dt;
    if (!this.menuOpen && !UI.isOpen() && Wipe.dir === 0 && (Input.pressed.a || Input.click)) { this.menuOpen = true; Snd.init(); Snd.play('select'); this.openMenu(); }
  },
  async openMenu() {
    const sv = loadSave();
    const choices = [{ label: '새 여행 시작', sub: '80일 안에 골드 버튼 도전' }];
    if (sv) choices.push({ label: '이어하기', sub: `${sv.channel} · ${sv.day}일차 · 구독자 ${kNum(sv.subs)}` });
    choices.push({ label: '게임 방법' });
    const i = await UI.ask({ text: '', choices, cls: 'menu' });
    const pickL = choices[i] && choices[i].label;
    if (pickL === '새 여행 시작') {
      if (sv) {
        const ok = await UI.ask({ text: '저장된 여행이 사라집니다. 새로 시작할까요?', choices: ['새로 시작', '취소'], cancel: 1 });
        if (ok !== 0) { this.menuOpen = false; return; }
      }
      await newGame();
    } else if (pickL === '이어하기') {
      S = Object.assign(newState(sv.channel), sv);
      await wipe(() => setScene(CityScene, S.city, { x: SPOTS[1].x }));
      UI.toast(`${S.day}일차 · ${cityNow().name}에서 이어서`);
    } else {
      await showHelp();
      this.menuOpen = false;
    }
  },
  draw(g) {
    const sk = skyAt(18.1, CITY.seoul, 'sun');
    drawSkyBands(g, sk, 0, 150);
    circ(g, 230, 112, 22, '#ffb070'); circ(g, 230, 112, 19, '#ff8a5a');
    for (let i = 0; i < 4; i++) hline(g, 205, 104 + i * 5, 50, sk.bot);
    const pw = this.parade.width;
    const o2 = (this.t * 6) % pw, o1 = (this.t * 14) % pw;
    g.globalAlpha = 0.6;
    g.drawImage(this.parade2, -o2, -18); g.drawImage(this.parade2, pw - o2, -18);
    g.globalAlpha = 1;
    g.drawImage(this.parade, -o1, 0); g.drawImage(this.parade, pw - o1, 0);
    rect(g, 0, 150, W, 30, '#2a2340'); rect(g, 0, 150, W, 2, '#4a3f6a');
    for (let x = -((this.t * 60) % 24); x < W; x += 24) rect(g, x, 165, 12, 2, '#ffd23f');
    const fr = Math.floor(this.t * 8) % 3;
    drawPlayer(g, 74, 131, { frame: fr === 2 ? 0 : fr + 1, rec: true, t: this.t, bob: fr === 1 });
    // 비행기 + 배너
    const px0 = ((this.t * 30) % 520) - 100;
    rect(g, px0, 30, 16, 3, '#f4f4f4'); rect(g, px0 + 12, 27, 3, 3, '#e8394a'); rect(g, px0 + 5, 33, 6, 2, '#c9c9d0'); rect(g, px0 + 15, 31, 2, 1, '#9fd3f0');
    line(g, px0 - 1, 31, px0 - 6, 31, '#c9c9d0');
    rect(g, px0 - 62, 27, 56, 9, '#ffffff'); text(g, '구독 & 좋아요', px0 - 34, 27, '#e8394a', { align: 'center' });
    // 로고
    const bob = Math.round(Math.sin(this.t * 2) * 2);
    g.drawImage(this.logo, 0, 0, 140, 16, 160 - 70 * 1.5, 20 + bob, 210, 24);
    g.drawImage(this.logo, 0, 16, 140, 20, 160 - 70 * 3, 40 + bob, 420, 60);
    drawPlayButton(g, 160 + 96, 22 + bob, 1, 'gold');
    text(g, '여행 유튜버 도트 어드벤처', 160, 100 + bob, '#ffe0c8', { align: 'center', outline: OUT });
    if (!this.menuOpen && Math.floor(this.t * 2) % 2 === 0) text(g, '스페이스 또는 화면을 눌러 시작', 160, 120, '#ffffff', { align: 'center', outline: OUT });
  },
};

async function showHelp() {
  await UI.panel({
    title: '게임 방법', build(b, close) {
      b.innerHTML = `<div class="help">
      <p><b>목표</b> 80일 동안 세계를 돌며 여행 영상을 올려 구독자 100만(골드 버튼)을 달성하세요.</p>
      <p><b>조작</b> ←→ 이동 · <kbd>Space</kbd>/<kbd>Z</kbd> 행동·결정 · <kbd>Esc</kbd>/<kbd>X</kbd> 메뉴·취소 · <kbd>M</kbd> 소리 · 화면 터치/클릭으로도 이동할 수 있어요.</p>
      <p><b>촬영</b> 포토존(랜드마크), 맛집(먹방), 체험 부스에서 미니게임을 하면 클립이 생겨요. 처음 찍는 소재일수록 조회수가 잘 나와요.</p>
      <p><b>업로드</b> 숙소에서 클립을 편집해 업로드! 제목 스타일(정직/어그로/감성)에 따라 조회수와 구독 전환이 달라져요.</p>
      <p><b>관리</b> 체력·텐션이 낮으면 퀄리티가 떨어져요. 돈이 없으면 숙소 알바나 라이브 방송으로 벌 수 있어요. 구독자 1,000명부터 광고 수익이 나와요.</p>
      <p><b>팁</b> 머리 위에 <b class="em">!</b> 가 뜬 사람에게 말을 걸면 이벤트가 생겨요. 시청자 미션(★)을 달성하면 보너스!</p></div>`;
      b.appendChild(UI.btn('알겠어요', () => close(true)));
    },
  });
}

async function newGame() {
  const name = await UI.input({ title: '채널 이름', text: '당신의 여행 채널 이름을 지어주세요.', value: '떠돌이TV', max: 12 });
  clearSave();
  S = newState(name || '떠돌이TV');
  await wipe(() => setScene(CityScene, 'seoul', { x: SPOTS[1].x }));
  CityScene.busy = true;
  await UI.say(`퇴사 2주 차. 통장에 남은 퇴직금은 ${won(S.money)}.`, { title: '프롤로그' });
  await UI.say(`구독자 ${S.subs}명(엄마, 이모, 고등학교 친구들...)짜리 여행 채널 『${S.channel}』.`, { title: '프롤로그' });
  await UI.say('오늘부터 80일 동안 세계를 돌며 여행 영상을 찍는다!\n목표는 구독자 100만 명, 골드 버튼!', { title: '프롤로그' });
  await UI.say('←→ 로 걷고, 스페이스(Z)로 말 걸기·촬영, ESC(X)로 메뉴.\n포토존·맛집·체험 부스에서 촬영 → 숙소에서 편집·업로드!', { title: '조작법' });
  await UI.say('일단 서울에서 첫 영상을 찍어 보자. 오른쪽으로 가면 포토존이 있다.', { title: '조작법' });
  CityScene.busy = false;
  save();
}

// =====================================================================
//  도시 씬
// =====================================================================
const LayerCache = {};
function cityLayers(id) {
  if (!LayerCache[id]) { const c = CITY[id]; LayerCache[id] = { far: buildFar(c), mid: buildMid(c), front: buildFront(c) }; }
  return LayerCache[id];
}
const wl = makeCanvas(W, H), el2 = makeCanvas(W, H);

const CityScene = {
  city: null, L: null, px: 40, dir: 1, walkT: 0, cam: 0, npcs: [], animals: [], vehicles: [], parts: [],
  busy: false, target: null, near: null, t: 0, hourVis: 9, banner: 0, stepT: 0,
  enter(id, o = {}) {
    const same = this.city && this.city.id === id && o.resume;
    S.city = id; this.city = CITY[id]; this.L = cityLayers(id);
    this.px = o.x != null ? o.x : 40; this.dir = 1; this.target = null;
    this.cam = clamp(this.px + 6 - 160, 0, WORLD_W - W);
    if (!same) { this.spawn(); this.parts = []; }
    if (o.banner) this.banner = 3;
    Music.play(genTrack(id, this.city.music));
    this.hourVis = S.hour;
  },
  anchor() { return { x: Math.round(this.px - this.cam + 6), y: WALK_Y - 6 }; },
  spawn() {
    const c = this.city;
    this.npcs = [];
    for (let i = 0; i < 8; i++) this.npcs.push({ x: rand(20, WORLD_W - 20), dir: chance(0.5) ? 1 : -1, speed: rand(8, 20), look: randomLook(c), walkT: rand(0, 1), pause: 0, ev: false, y: WALK_Y + randi(-2, 3) });
    this.spawnEventNpcs();
    this.animals = [];
    const ak = c.animal, nA = ak === 'pigeon' ? 5 : ak === 'penguin' ? 4 : 2;
    for (let i = 0; i < nA; i++) this.animals.push({ kind: ak, x: rand(30, WORLD_W - 30), dir: chance(0.5) ? 1 : -1, t: rand(0, 5), walk: false, fly: 0, vy: 0, y: 0, home: 0 });
    this.vehicles = [];
    for (let i = 0; i < (c.vehicles.length ? 3 : 0); i++) this.vehicles.push(this.newVehicle(rand(0, WORLD_W)));
  },
  newVehicle(x) {
    const c = this.city, kind = pick(c.vehicles), dir = chance(0.5) ? 1 : -1;
    const color = kind === 'taxi' ? (c.id === 'newyork' ? '#ffd23f' : '#f4f4f4') : kind === 'bus' ? pick(['#3a5bd9', '#2fa36b', '#e8394a']) : pick(['#e8394a', '#3a5bd9', '#f4f4f4', '#2b2b33', '#ffd23f', '#2fa36b', '#c9c9d0']);
    return { kind, dir, color, x, speed: rand(40, 70) * (kind === 'bus' ? 0.7 : 1), y: dir > 0 ? 177 : 168 };
  },
  spawnEventNpcs() {
    for (const n of this.npcs) n.ev = false;
    const k = randi(1, 2);
    const cand = shuffle(this.npcs.slice());
    let placed = 0;
    for (const n of cand) {
      if (placed >= k) break;
      let x = rand(60, WORLD_W - 40);
      for (let tries = 0; tries < 10 && SPOTS.some(s => Math.abs(s.x - x) < 26); tries++) x = rand(60, WORLD_W - 40);
      n.x = x; n.ev = true; placed++;
    }
  },
  update(dt) {
    this.t += dt;
    if (Math.abs(S.hour - this.hourVis) > 6) this.hourVis = S.hour; else this.hourVis += (S.hour - this.hourVis) * Math.min(1, dt * 1.5);
    if (this.banner > 0) this.banner -= dt;
    const canAct = !UI.isOpen() && !this.busy && Wipe.dir === 0;
    let vx = 0;
    if (canAct) {
      if (Input.down.left) { vx = -1; this.target = null; }
      else if (Input.down.right) { vx = 1; this.target = null; }
      else if (this.target) {
        const d = this.target.x - (this.px + 6);
        if (Math.abs(d) < 2) { const tg = this.target; this.target = null; if (tg.what) this.interact(tg.what); }
        else vx = Math.sign(d);
      }
    } else if (this.busy) this.target = null;
    if (vx) {
      this.px = clamp(this.px + vx * 64 * dt, 6, WORLD_W - 20); this.dir = vx; this.walkT += dt;
      this.stepT -= dt; if (this.stepT <= 0) { this.stepT = 0.28; Snd.play('step'); }
    } else this.walkT = 0;
    this.cam = lerp(this.cam, clamp(this.px + 6 - 160, 0, WORLD_W - W), Math.min(1, dt * 6));
    // 근처 상호작용 대상
    this.near = null;
    const pc = this.px + 6;
    let best = 16;
    for (const sp of SPOTS) { const d = Math.abs(sp.x - pc); if (d < best) { best = d; this.near = { spot: sp }; } }
    for (const n of this.npcs) if (n.ev) { const d = Math.abs(n.x + 5 - pc); if (d < 13 && d < best + 6) { best = d; this.near = { npc: n }; } }
    if (canAct) {
      if ((Input.pressed.a || Input.pressed.up) && this.near) this.interact(this.near);
      else if (Input.pressed.b || Input.pressed.menu) openMenu();
      else if (Input.click) {
        const c = Input.click;
        if (c.y < 14 && c.x > W - 20) openMenu();
        else if (c.y >= 14) {
          const wx = c.x + this.cam;
          let what = null;
          for (const n of this.npcs) if (n.ev && Math.abs(n.x + 5 - wx) < 10 && c.y > 100) what = { npc: n };
          if (!what) for (const sp of SPOTS) if (Math.abs(sp.x - wx) < 24 && c.y > 70) what = { spot: sp };
          const tx = what ? (what.spot ? what.spot.x : what.npc.x + 5) : wx;
          if (what && Math.abs(tx - pc) < 14) this.interact(what);
          else this.target = { x: clamp(tx, 12, WORLD_W - 14), what };
        }
      }
    }
    this.updateNpcs(dt); this.updateAnimals(dt); this.updateVehicles(dt); this.updateParts(dt);
  },
  updateNpcs(dt) {
    for (const n of this.npcs) {
      if (n.ev) { n.walkT = 0; n.dir = (this.px > n.x) ? 1 : -1; continue; }
      if (n.pause > 0) { n.pause -= dt; n.walkT = 0; continue; }
      n.x += n.dir * n.speed * dt; n.walkT += dt;
      if (n.x < 8) { n.x = 8; n.dir = 1; } else if (n.x > WORLD_W - 18) { n.x = WORLD_W - 18; n.dir = -1; }
      if (chance(dt * 0.15)) n.pause = rand(0.8, 3);
      if (chance(dt * 0.05)) n.dir *= -1;
    }
  },
  updateAnimals(dt) {
    for (const a of this.animals) {
      const def = ANIMALS[a.kind];
      a.t += dt;
      if (a.fly) {
        a.fly += dt; a.x += a.dir * 40 * dt; a.y -= 50 * dt;
        if (a.fly > 6) { a.fly = 0; a.y = 0; a.x = rand(30, WORLD_W - 30); }
        continue;
      }
      if (a.kind === 'pigeon' && Math.abs(a.x - (this.px + 6)) < 18 && (Input.down.left || Input.down.right)) { a.fly = 0.01; a.dir = this.px > a.x ? -1 : 1; if (chance(0.5)) Snd.play('whoosh'); continue; }
      if (!a.walk && chance(dt * 0.3)) { a.walk = true; a.dir = chance(0.5) ? 1 : -1; }
      else if (a.walk && chance(dt * 0.4)) a.walk = false;
      if (a.walk) { a.x = clamp(a.x + a.dir * def.speed * dt, 10, WORLD_W - 20); }
    }
  },
  updateVehicles(dt) {
    for (const v of this.vehicles) {
      v.x += v.dir * v.speed * dt;
      if (v.dir > 0 && v.x > WORLD_W + 60) Object.assign(v, this.newVehicle(-60), { dir: 1, y: 177 });
      if (v.dir < 0 && v.x < -80) Object.assign(v, this.newVehicle(WORLD_W + 40), { dir: -1, y: 168 });
    }
  },
  updateParts(dt) {
    const c = this.city, wx = S.weather;
    const spawn = (n, f) => { let k = n * dt * 60; while (k > 0) { if (k >= 1 || chance(k)) this.parts.push(f()); k -= 1; } };
    if (wx === 'rain') spawn(2.2, () => ({ k: 'rain', x: rand(-20, W + 40), y: rand(-20, 0), vx: -40, vy: rand(200, 260), life: 2 }));
    if (wx === 'snow') spawn(0.8, () => ({ k: 'snow', x: rand(-10, W + 10), y: -4, vx: rand(-8, 4), vy: rand(14, 28), life: 9, ph: rand(0, 6) }));
    const p = c.particle;
    if (p === 'petal' && wx !== 'rain') spawn(0.06, () => ({ k: 'petal', x: rand(0, W + 40), y: -4, vx: rand(-20, -8), vy: rand(10, 18), life: 12, ph: rand(0, 6) }));
    if (p === 'leaf') spawn(0.04, () => ({ k: 'leaf', x: rand(0, W + 40), y: -4, vx: rand(-18, -6), vy: rand(12, 20), life: 12, ph: rand(0, 6), col: pick(['#e8a12e', '#c9643a', '#d9b36a']) }));
    if (p === 'dust') spawn(0.12, () => ({ k: 'dust', x: W + 4, y: rand(60, 160), vx: rand(-60, -30), vy: rand(-3, 3), life: 8 }));
    if (p === 'confetti') spawn(0.05, () => ({ k: 'conf', x: rand(0, W), y: -4, vx: rand(-10, 10), vy: rand(15, 30), life: 10, ph: rand(0, 6), col: pick(['#ff5ec4', '#ffd23f', '#3fb6ff', '#7cff6b', '#ff8a2e']) }));
    if (p === 'powder' && chance(dt * 0.15)) { const col = pick(['#ff5ec4', '#ffd23f', '#3fb6ff', '#7cff6b', '#c94ad9']), x = rand(20, W - 20); for (let i = 0; i < 14; i++) this.parts.push({ k: 'puff', x, y: rand(110, 140), vx: rand(-20, 20), vy: rand(-20, 5), life: rand(0.6, 1.4), col }); }
    for (const q of this.parts) { q.x += q.vx * dt + (q.ph != null ? Math.sin(this.t * 2 + q.ph) * 0.3 : 0); q.y += q.vy * dt; q.life -= dt; if (q.k === 'rain' && q.y > 158 + rand(0, 20)) { q.life = 0; this.parts.push({ k: 'splash', x: q.x, y: q.y, vx: 0, vy: 0, life: 0.15 }); } }
    this.parts = this.parts.filter(q => q.life > 0 && q.y < H + 5);
    if (this.parts.length > 500) this.parts.splice(0, this.parts.length - 500);
  },
  draw(g) {
    const c = this.city, sk = skyAt(this.hourVis, c, S.weather);
    drawSky(g, sk, this.hourVis, this.t, { aurora: c.aurora ? (S.weather === 'cloud' ? 0.3 : 1) : 0, weather: S.weather, camX: this.cam });
    // 배경 레이어
    drawLayers(g, this.L, this.cam, sk, this.t, 0, w => this.drawDetails(w));
    // 인물/동물/차
    const e = el2.g;
    e.clearRect(0, 0, W, H);
    this.drawEntities(e);
    tintLayer(e, sk, 0.75);
    g.drawImage(el2, 0, 0);
    if (sk.night > 0.4) for (const v of this.vehicles) { const x = v.x - this.cam + (v.dir > 0 ? 26 : -2); g.globalAlpha = 0.25 * sk.night; g.globalCompositeOperation = 'lighter'; circ(g, x, v.y - 7, 4, '#ffe9a0'); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
    this.drawParts(g);
    // 머리 위 이벤트 ! 표시
    for (const n of this.npcs) if (n.ev) {
      const x = Math.round(n.x - this.cam + 5), y = n.y - 12 + Math.round(Math.sin(this.t * 5) * 1.5);
      rect(g, x - 3, y - 1, 7, 9, OUT); rect(g, x - 2, y, 5, 7, '#ffd23f'); rect(g, x, y + 1, 1, 3, OUT); px(g, x, y + 5, OUT);
    }
    // 상호작용 말풍선
    if (this.near && !UI.isOpen() && !this.busy && Wipe.dir === 0) {
      const label = this.near.spot ? this.near.spot.hint : '말 걸기';
      const ax = this.near.spot ? this.near.spot.x : this.near.npc.x + 5;
      const bx = clamp(Math.round(ax - this.cam), 50, W - 50), by = 114;
      const tw = textWidth(label) + 18;
      rect(g, bx - tw / 2 - 1, by - 1, tw + 2, 14, OUT); rect(g, bx - tw / 2, by, tw, 12, '#fffbe8');
      rect(g, bx - tw / 2 + 2, by + 2, 9, 8, '#e8394a'); text(g, 'A', bx - tw / 2 + 4, by + 1, '#ffffff');
      text(g, label, bx - tw / 2 + 14, by + 1, OUT);
      tri(g, bx - 3, by + 12, 7, 3, '#fffbe8');
    }
    if (this.banner > 0) {
      const a = clamp(this.banner, 0, 1), y = 30;
      g.globalAlpha = a * 0.85; rect(g, 0, y, W, 30, OUT); g.globalAlpha = a;
      text(g, `WELCOME TO ${c.en}`, 160, y + 3, '#ffd23f', { align: 'center', font: FM });
      text(g, `${c.name}, ${c.country}  ·  ${c.hello}`, 160, y + 17, '#ffffff', { align: 'center' });
      g.globalAlpha = 1;
    }
    drawHUD(g);
    text(g, `${c.name} · ${c.country}`, W - 3, 16, '#ffffff', { align: 'right', outline: OUT });
    if (S.missions.length) {
      let y = 28;
      for (const m of S.missions.slice(0, 3)) { const here = m.city === c.id; icon(g, 'star', W - 10, y); text(g, m.short, W - 13, y - 1, here ? '#ffd23f' : '#d8d8e8', { align: 'right', outline: OUT }); y += 11; }
    }
  },
  drawDetails(w) {
    // 맛집 김, 체험 깃발
    const fx = SPOTS[3].x - this.cam;
    for (let i = 0; i < 3; i++) { const y = 118 - ((this.t * 12 + i * 7) % 20); w.globalAlpha = 0.5 * (1 - ((this.t * 12 + i * 7) % 20) / 20); rect(w, fx - 12 + i * 10 + Math.round(Math.sin(this.t * 3 + i) * 2), y, 2, 2, '#ffffff'); }
    w.globalAlpha = 1;
    const ax = SPOTS[4].x - this.cam, wave = Math.floor(this.t * 6) % 2;
    rect(w, ax + 1, SIDEWALK_Y + 1 - 66 + wave, 8, 5, this.city.accent);
  },
  drawEntities(e) {
    const cam = this.cam;
    for (const a of this.animals) {
      const spr = AnimalSpr[a.kind]; if (!spr) continue;
      const def = ANIMALS[a.kind];
      const fr = a.fly ? (Math.floor(a.t * 10) % 2) : (a.walk ? Math.floor(a.t * 6) % spr.length : 0);
      const hop = def.hop && a.walk ? -Math.abs(Math.round(Math.sin(a.t * 8) * 4)) : 0;
      const s = spr[fr % spr.length];
      drawSpr(e, s, a.x - cam, WALK_Y + 18 - s.height + hop + a.y, a.dir < 0);
    }
    const list = this.npcs.map(n => ({ n, y: n.y })).concat([{ p: true, y: WALK_Y }]).sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.p) {
        const fr = this.walkT > 0 ? 1 + Math.floor(this.walkT * 8) % 2 : 0;
        const x = this.px - cam;
        if (S.weather === 'rain' && S.items.umbrella > 0) { line(e, x + 6, WALK_Y - 1, x + 6, WALK_Y - 9, '#5a5a66'); dome(e, x + 6, WALK_Y - 8, 9, '#e8394a'); hline(e, x - 3, WALK_Y - 8, 19, '#a3203a'); }
        drawPlayer(e, x, WALK_Y, { frame: fr, flip: this.dir < 0, rec: S.clips.length > 0, t: this.t, bob: this.walkT > 0 && fr === 1 });
      } else {
        const n = it.n;
        const fr = n.walkT > 0 ? Math.floor(n.walkT * 6) % 2 : 0;
        const s = npcSprite(n.look, fr);
        e.fillStyle = 'rgba(0,0,0,0.22)'; e.fillRect(Math.round(n.x - cam + 1), n.y + 15, 9, 2);
        drawSpr(e, s, n.x - cam, n.y + 2, n.dir < 0);
      }
    }
    for (const v of this.vehicles) drawVehicle(e, v, v.x - cam, v.y, this.t);
  },
  drawParts(g) {
    for (const q of this.parts) {
      if (q.k === 'rain') { g.globalAlpha = 0.6; line(g, q.x, q.y, q.x - 1, q.y + 4, '#b8d4f4'); g.globalAlpha = 1; }
      else if (q.k === 'splash') { px(g, q.x - 1, q.y, '#d8e8ff'); px(g, q.x + 1, q.y - 1, '#d8e8ff'); }
      else if (q.k === 'snow') px(g, q.x, q.y, '#ffffff');
      else if (q.k === 'petal') { px(g, q.x, q.y, '#ffc0d8'); px(g, q.x + 1, q.y, '#ff9ec0'); }
      else if (q.k === 'leaf' || q.k === 'conf') rect(g, q.x, q.y, 2, 1 + (Math.floor(this.t * 6 + q.ph) % 2), q.col);
      else if (q.k === 'dust') { g.globalAlpha = 0.5; px(g, q.x, q.y, '#e8d0a0'); g.globalAlpha = 1; }
      else if (q.k === 'puff') { g.globalAlpha = clamp(q.life, 0, 1) * 0.8; rect(g, q.x, q.y, 2, 2, q.col); g.globalAlpha = 1; }
    }
  },
  async interact(what) {
    if (this.busy) return;
    this.busy = true;
    try {
      if (what.npc) await npcEvent(what.npc);
      else {
        const id = what.spot.id;
        if (id === 'airport') await spotAirport();
        else if (id === 'hotel') await spotHotel();
        else if (id === 'photo') await spotPhoto();
        else if (id === 'food') await spotFood();
        else if (id === 'act') await spotAct();
        else if (id === 'shop') await spotShop();
      }
      await afterAction();
    } catch (err) { console.error(err); }
    finally { this.busy = false; save(); }
  },
};
// 원경→중경→근경 순서로 (레이어 + 밤 조명) 을 겹쳐 그린다. 조명이 앞 건물을 뚫고 보이지 않도록.
function drawLayers(g, L, cam, sk, t, yOff = 0, extra = null) {
  const w = wl.g;
  for (const [k, par] of [['far', PARALLAX.far], ['mid', PARALLAX.mid], ['front', 1]]) {
    w.clearRect(0, 0, W, H);
    w.drawImage(L[k].c, Math.round(-cam * par), yOff);
    if (k === 'front' && extra) extra(w);
    tintLayer(w, sk);
    g.drawImage(wl, 0, 0);
    if (sk.night > 0.05) drawLights(g, yOff ? L[k].L.map(l => ({ ...l, y: l.y + yOff })) : L[k].L, cam * par, sk.night, t);
  }
}
function tintLayer(g, sk, mul = 1) {
  if (sk.ta <= 0.01) return;
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = sk.ta * mul; g.fillStyle = sk.tint; g.fillRect(0, 0, W, H); g.restore();
}

// =====================================================================
//  세계지도 씬
// =====================================================================
const MapScene = {
  sel: null, t: 0, fly: null, resolve: null, from: null, busy: false,
  open() { return new Promise(res => { this.resolve = res; wipe(() => setScene(MapScene)); }); },
  enter() {
    this.from = cityNow(); this.t = 0; this.fly = null; this.busy = false;
    const others = this.list().filter(c => c.id !== this.from.id);
    const m = S.missions.find(mm => mm.city !== this.from.id && this.list().some(c => c.id === mm.city));
    this.sel = m ? CITY[m.city] : others.sort((a, b) => distKm(this.from, a) - distKm(this.from, b))[0];
    Music.play(genTrack('worldmap', { scale: 'majPenta', root: 62, bpm: 108, busy: 0.4, lead: 'triangle' }));
  },
  anchor() { return { x: 160, y: 80 }; },
  list() { return CITIES.filter(c => !c.secret || S.unlocked[c.id]); },
  pos(c) { const [x, y] = proj(c.lon, c.lat); return { x: Math.round(x), y: Math.round(y) }; },
  update(dt) {
    this.t += dt;
    if (this.fly) { this.updateFly(dt); return; }
    if (UI.isOpen() || Wipe.dir !== 0 || this.busy) return;
    const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const k in dirs) if (Input.pressed[k]) { this.moveSel(dirs[k]); Snd.play('move'); }
    if (Input.click) {
      const c = Input.click;
      let best = null, bd = 14;
      for (const ct of this.list()) { const p = this.pos(ct); const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = ct; } }
      if (c.y > H - 14 && c.x > W - 70) { this.cancel(); return; }
      if (best) { if (best === this.sel) this.confirm(); else { this.sel = best; Snd.play('move'); } }
    }
    if (Input.pressed.a) this.confirm();
    else if (Input.pressed.b) this.cancel();
  },
  moveSel([dx, dy]) {
    const p0 = this.pos(this.sel);
    let best = null, bs = 1e9;
    for (const c of this.list()) {
      if (c === this.sel) continue;
      const p = this.pos(c), vx = p.x - p0.x, vy = p.y - p0.y, d = Math.hypot(vx, vy);
      const cos = (vx * dx + vy * dy) / (d || 1);
      if (cos < 0.35) continue;
      const score = d * (2 - cos);
      if (score < bs) { bs = score; best = c; }
    }
    if (best) this.sel = best;
  },
  async cancel() {
    this.busy = true;
    Snd.play('cancel');
    await wipe(() => setScene(CityScene, S.city, { x: SPOTS[0].x + 4, resume: true }));
    const r = this.resolve; this.resolve = null; r && r();
  },
  flightInfo(to) {
    const km = distKm(this.from, to);
    let base = Math.round((BAL.FLIGHT_BASE + km * BAL.FLIGHT_PER_KM) / 1000) * 1000;
    if (to.secret) base = 2500000;
    const hours = Math.max(1, Math.round(1.5 + km / 750));
    return { km, base, hours };
  },
  async confirm() {
    const to = this.sel;
    if (to.id === this.from.id) { Snd.play('cancel'); UI.toast('지금 있는 도시예요'); return; }
    this.busy = true;
    const fi = this.flightInfo(to);
    const free = to.secret && S.flags.antarcticaFree;
    const opts = [
      { label: '이코노미', sub: `${free ? '방송국 지원 (무료)' : won(fi.base)} · ${fi.hours}시간 · 체력 -${fi.hours > 8 ? 25 : 12}`, kind: 'eco', cost: free ? 0 : fi.base },
      { label: '비즈니스', sub: `${won(fi.base * 3)} · 체력 회복 + 탑승기 클립`, kind: 'biz', cost: fi.base * 3 },
    ];
    if (fi.km < 2600 && !to.secret) opts.push({ label: '버스·기차·배', sub: `${won(Math.round(fi.base * 0.35 / 1000) * 1000)} · ${Math.max(6, fi.hours * 3)}시간 · 체력 -20`, kind: 'land', cost: Math.round(fi.base * 0.35 / 1000) * 1000 });
    opts.forEach(o => { o.disabled = S.money < o.cost; if (o.disabled) o.sub += ' (돈 부족)'; });
    opts.push({ label: '취소' });
    const mission = S.missions.find(m => m.city === to.id);
    const first = !S.visited[to.id];
    const i = await UI.ask({
      title: `${to.name} (${to.country})`, text: `${fmt(fi.km)}km 떨어져 있다. 어떻게 갈까?${first ? '\n첫 방문! 모든 소재가 신선하다.' : ''}${mission ? `\n★ 시청자 미션: ${mission.text}` : ''}`,
      choices: opts, cancel: opts.length - 1,
    });
    const o = opts[i];
    if (!o || !o.kind) { this.busy = false; return; }
    if (S.money < o.cost) { this.busy = false; return; }
    gain({ money: -o.cost }, { x: 160, y: 120 });
    if (to.secret && free) S.flags.antarcticaFree = false;
    const hours = o.kind === 'land' ? Math.max(6, fi.hours * 3) : fi.hours;
    const p0 = this.pos(this.from), p1 = this.pos(to);
    let x1 = p1.x;
    if (Math.abs(x1 - p0.x) > W / 2) x1 -= Math.sign(x1 - p0.x) * W;
    this.fly = { p0, p1: { x: x1, y: p1.y }, k: 0, dur: clamp(1.4 + fi.km / 5000, 1.6, 4.2), to, kind: o.kind, hours, km: fi.km, evDone: false, paused: false };
    Snd.play('plane');
  },
  async updateFly(dt) {
    const f = this.fly;
    if (f.paused) return;
    f.k = Math.min(1, f.k + dt / f.dur);
    if (!f.evDone && f.k >= 0.5) {
      f.evDone = true; f.paused = true;
      if (f.kind === 'biz') await flightBizClip();
      if (f.kind === 'land' ? chance(0.5) : chance(0.42)) {
        const res = await flightEvent(f);
        if (res && res.divert) { f.to = res.divert; const p1 = this.pos(f.to); let x1 = p1.x; if (Math.abs(x1 - f.p0.x) > W / 2) x1 -= Math.sign(x1 - f.p0.x) * W; f.p1 = { x: x1, y: p1.y }; }
      }
      f.paused = false;
    }
    if (f.k >= 1 && !f.arrived) { f.arrived = true; await this.arrive(); }
  },
  async arrive() {
    const f = this.fly, to = f.to;
    S.flights++; S.km += Math.round(f.km);
    passTime(f.hours);
    if (f.kind === 'biz') gain({ hp: 30, mood: 10 });
    else gain({ hp: f.kind === 'land' ? -20 : f.hours > 8 ? -25 : -12 });
    const first = !S.visited[to.id];
    S.visited[to.id] = (S.visited[to.id] || 0) + 1;
    S.city = to.id; S.weather = pick(to.wx);
    await wipe(() => setScene(CityScene, to.id, { x: SPOTS[0].x + 4, banner: true }));
    await arrivalFlow(to, first, f);
    const r = this.resolve; this.resolve = null; r && r();
  },
  draw(g) {
    g.drawImage(WorldMap.canvas, 0, 0);
    // 반짝이는 바다
    for (let i = 0; i < 12; i++) { const r = seeded(i * 77 + Math.floor(this.t * 1.5)); px(g, r() * W, MAP_Y0 + r() * MAP_H, '#7cc0f0'); }
    const list = this.list();
    const f = this.fly;
    // 경로
    if (!f && this.sel && this.sel !== this.from) {
      const a = this.pos(this.from), b = this.pos(this.sel);
      let bx = b.x; if (Math.abs(bx - a.x) > W / 2) bx -= Math.sign(bx - a.x) * W;
      const lift = Math.min(40, Math.hypot(bx - a.x, b.y - a.y) * 0.25);
      for (let k = 0; k <= 1; k += 0.02) {
        if (Math.floor(k * 50 - this.t * 8) % 3 !== 0) continue;
        const p = bez(a, { x: bx, y: b.y }, lift, k);
        wrapPx(g, p.x, p.y, '#ffffff');
      }
    }
    for (const c of list) {
      const p = this.pos(c);
      const visited = S.visited[c.id], here = c.id === S.city && !f;
      if (here) {
        drawSpr(g, PlayerSpr.top, p.x - 6, p.y - 15 + Math.round(Math.sin(this.t * 4)), false);
      } else {
        rect(g, p.x - 2, p.y - 6, 5, 5, OUT); rect(g, p.x - 1, p.y - 5, 3, 3, visited ? '#ffd23f' : '#ff5e5e'); vline(g, p.x, p.y - 1, 2, OUT);
        if (c.secret) px(g, p.x, p.y - 4, '#ffffff');
      }
      if (S.missions.some(m => m.city === c.id)) icon(g, 'star', p.x - 3, p.y - 15 + Math.round(Math.sin(this.t * 5 + p.x)));
    }
    // 선택 표시
    if (this.sel && !f) {
      const p = this.pos(this.sel), s = 6 + Math.round(Math.sin(this.t * 6));
      const col = '#ffffff';
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { hline(g, p.x + dx * s - (dx > 0 ? 2 : 0), p.y - 3 + dy * s, 3, col); vline(g, p.x + dx * s, p.y - 3 + dy * s - (dy > 0 ? 2 : 0), 3, col); }
      const label = this.sel.name;
      const lw = textWidth(label) + 6, lx = clamp(p.x - lw / 2, 2, W - lw - 2), ly = p.y + 8 > H - 40 ? p.y - 28 : p.y + 8;
      rect(g, lx - 1, ly - 1, lw + 2, 13, OUT); rect(g, lx, ly, lw, 11, '#fffbe8'); text(g, label, lx + 3, ly + 1, OUT);
    }
    // 비행기
    if (f) {
      const lift = Math.min(40, Math.hypot(f.p1.x - f.p0.x, f.p1.y - f.p0.y) * 0.25);
      for (let k = 0; k < f.k; k += 0.025) { const p = bez(f.p0, f.p1, lift, k); wrapPx(g, p.x, p.y, '#ffffff'); }
      const p = bez(f.p0, f.p1, lift, f.k), pn = bez(f.p0, f.p1, lift, Math.min(1, f.k + 0.01));
      const right = pn.x >= p.x;
      const pxx = ((Math.round(p.x) % W) + W) % W;
      const plane = f.kind === 'land' ? 'land' : 'air';
      for (const ox of [0, -W, W]) {
        const x = pxx + ox;
        if (x < -20 || x > W + 20) continue;
        if (plane === 'air') {
          g.save(); if (!right) { g.translate(x * 2, 0); g.scale(-1, 1); }
          rect(g, x - 6, p.y - 1, 12, 3, '#ffffff'); rect(g, x + 4, p.y - 1, 3, 2, '#9fd3f0'); rect(g, x - 2, p.y - 5, 4, 4, '#e8e8f0'); rect(g, x - 2, p.y + 2, 4, 3, '#e8e8f0'); rect(g, x - 7, p.y - 4, 3, 3, '#e8394a');
          hline(g, x - 6, p.y + 1, 12, '#a8b0c0');
          g.restore();
        } else { rect(g, x - 5, p.y - 3, 10, 5, '#ffd23f'); rect(g, x - 4, p.y - 2, 8, 2, '#9fd3f0'); px(g, x - 3, p.y + 2, OUT); px(g, x + 3, p.y + 2, OUT); }
      }
    }
    drawHUD(g);
    // 하단 정보창
    if (!f && this.sel) {
      const to = this.sel, fi = this.flightInfo(to), here = to.id === this.from.id;
      rect(g, 0, H - 26, W, 26, OUT); hline(g, 0, H - 26, W, '#5a4f9a');
      text(g, `${to.name} · ${to.country}`, 4, H - 24, '#ffd23f', { font: FM });
      const info = here ? '현재 위치' : `${fmt(fi.km)}km · ${fi.hours}시간 · ${won(fi.base)}~${S.visited[to.id] ? '' : ' · 첫 방문!'}`;
      text(g, info, 4, H - 11, '#ffffff');
      const m = S.missions.find(mm => mm.city === to.id);
      if (m) text(g, `★ ${m.short}`, W - 4, H - 24, '#ffd23f', { align: 'right' });
      text(g, 'A 출발  B 돌아가기', W - 4, H - 11, '#a8a0d8', { align: 'right' });
    } else if (f) {
      rect(g, 0, H - 14, W, 14, OUT);
      text(g, `${this.from.name} → ${f.to.name}  ${f.kind === 'land' ? '이동 중...' : '비행 중...'} ${Math.round(f.k * 100)}%`, 160, H - 12, '#ffffff', { align: 'center' });
    }
    text(g, 'WORLD MAP', 4, 16, '#ffffff', { outline: OUT });
  },
};
function bez(a, b, lift, k) {
  const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift;
  const u = 1 - k;
  return { x: u * u * a.x + 2 * u * k * cx + k * k * b.x, y: u * u * a.y + 2 * u * k * cy + k * k * b.y };
}
function wrapPx(g, x, y, c) { const xx = ((Math.round(x) % W) + W) % W; px(g, xx, y, c); }

// =====================================================================
//  메인 루프
// =====================================================================
let lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000 || 0);
  lastT = now; T += dt;
  updateWipe(dt);
  try {
    if (scene && scene.update) scene.update(dt);
    ctx.save();
    if (FX.shake > 0) { if (!REDUCED) ctx.translate(Math.round(rand(-FX.shake, FX.shake)), Math.round(rand(-FX.shake, FX.shake))); FX.shake = Math.max(0, FX.shake - dt * 18); }
    if (scene && scene.draw) scene.draw(ctx);
    ctx.restore();
    drawFloats(ctx, dt);
    if (FX.flash > 0) { ctx.globalAlpha = Math.min(1, FX.flash); rect(ctx, 0, 0, W, H, '#ffffff'); ctx.globalAlpha = 1; FX.flash -= dt * 3; }
    drawWipe(ctx);
  } catch (e) { console.error(e); }
  endFrameInput();
  requestAnimationFrame(frame);
}
