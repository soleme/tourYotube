'use strict';
// =====================================================================
//  sprites.js — 캐릭터, 동물, 아이콘, 음식, 탈것
// =====================================================================
const OUT = '#1b1530';

// ---------- 주인공 (오른쪽을 봄) ----------
const PLAYER_PAL = {
  K: OUT, R: '#e8394a', r: '#a3203a', H: '#4a2f22', S: '#f6cfa6', s: '#dba57e', E: OUT,
  Y: '#ffd23f', y: '#d99a1e', B: '#3a5bd9', b: '#29409e', P: '#2fa36b', p: '#1d7048', O: '#6b3f2a', W: '#ffffff', M: '#e87a7a',
};
const PLAYER_TOP = [
  '....KKKKK...',
  '...KRRRRRK..',
  '..KRRRWRRRK.',
  '..KRRRRRRRrK',
  '.KHHrrrrrrrrK',
  '.KHHSSSSSKK.',
  '.KHSSSSSESK.',
  '.KHSSSSSESK.',
  '..KSSSMSSSK.',
  '...KKSSSKK..',
  '.KPKYYYYYK..',
  'KPPKYYYYYSK.',
  'KPpKYYyYYKK.',
  'KPpKyyyyyK..',
];
const PLAYER_LEGS = [
  ['..KKBBBBBK..', '..KBBBKBBK..', '..KBK..KBK..', '..KOK..KOK..', '..KKK..KKK..'],
  ['..KKBBBBBK..', '..KBBBKBBK..', '.KBK....KBK.', '.KOK....KOK.', '.KKK....KKK.'],
  ['..KKBBBBBK..', '...KBBBBK...', '...KBKKBK...', '...KOKKOK...', '...KKKKKK...'],
];
const PlayerSpr = {
  frames: PLAYER_LEGS.map((legs, i) => sprite(PLAYER_TOP.concat(legs), PLAYER_PAL, 'player' + i)),
  top: sprite(PLAYER_TOP, PLAYER_PAL, 'playerTop'),
};
// 셀카봉 + 폰 그리기 (x,y = 스프라이트 좌상단)
function drawSelfieStick(g, x, y, flip, rec, t) {
  const hx = flip ? x + 2 : x + 9, hy = y + 11;
  const ex = flip ? hx - 7 : hx + 7, ey = hy - 9;
  line(g, hx, hy, ex, ey, '#3d3d4a');
  rect(g, ex - 1, ey - 3, 3, 4, '#2a2a35');
  px(g, ex, ey - 2, rec && Math.floor(t * 3) % 2 === 0 ? '#ff3b3b' : '#7ad1ff');
}
function drawPlayer(g, x, y, o = {}) {
  const f = o.frame || 0;
  const s = PlayerSpr.frames[f];
  const bob = o.bob ? 1 : 0;
  // 그림자
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(x + 1), Math.round(y + 18), 11, 2);
  drawSpr(g, s, x, y - bob, o.flip);
  if (o.stick !== false) drawSelfieStick(g, Math.round(x), Math.round(y - bob), o.flip, o.rec, o.t || 0);
}

// ---------- NPC ----------
const NPC_BASE = {
  head: {
    short: ['...KKKK...', '..KHHHHK..', '.KHHHHHHK.', '.KHHSSSSK.', '.KHSSSESK.', '.KSSSSSSK.', '..KKSSKK..'],
    long: ['...KKKK...', '..KHHHHK..', '.KHHHHHHK.', '.KHHSSSSK.', 'KHHSSSESK.', 'KHHSSSSSK.', 'KHHKSSKK..'],
    hat: ['..KKKKKK..', '.KAAAAAAK.', 'KAAAAAAAAK', '.KHHSSSSK.', '.KHSSSESK.', '.KSSSSSSK.', '..KKSSKK..'],
    cap: ['...KKKK...', '..KAAAAK..', '.KAAAAAAAK', '.KHHSSSSK.', '.KHSSSESK.', '.KSSSSSSK.', '..KKSSKK..'],
    bald: ['...KKKK...', '..KSSSSK..', '.KSSSSSSK.', '.KHSSSSSK.', '.KSSSSESK.', '.KSSSSSSK.', '..KKSSKK..'],
  },
  body: ['.KTTTTTTK.', 'KTTTTTTTTK', 'KSKTTTTKSK', '.KTTTTTTK.'],
  dress: ['.KTTTTTTK.', 'KTTTTTTTTK', 'KSKTTTTKSK', 'KTTTTTTTTK', 'KTTTTTTTTK'],
  legs: [
    ['.KPPPPPPK.', '.KPPKKPPK.', '.KPK..KPK.', '.KZK..KZK.', '.KKK..KKK.'],
    ['..KPPPPK..', '..KPPPPK..', '..KPKKPK..', '..KZKKZK..', '..KKKKKK..'],
  ],
  dlegs: [
    ['..KSK.KSK.', '..KZK.KZK.', '..KKK.KKK.'],
    ['...KSKSK..', '...KZKZK..', '...KKKKK..'],
  ],
};
const SKINS = ['#f6cfa6', '#e8b48a', '#c98d62', '#9c6644', '#6e4630', '#f2d4b8'];
const HAIRS = ['#2b1d16', '#4a2f22', '#7a4b2a', '#d9a65a', '#1a1a1a', '#b0b0b8', '#a8432e'];
const PANTS = ['#2f3b66', '#3a3a44', '#5c4a3a', '#2b5a8c', '#6b6b78', '#4a3550'];
function npcSprite(look, frame) {
  const key = 'npc' + JSON.stringify(look) + frame;
  if (sprCache.has(key)) return sprCache.get(key);
  const head = NPC_BASE.head[look.hair] || NPC_BASE.head.short;
  const rows = look.dress
    ? head.concat(NPC_BASE.dress, NPC_BASE.dlegs[frame])
    : head.concat(NPC_BASE.body, NPC_BASE.legs[frame]);
  const pal = { K: OUT, H: look.hc, S: look.skin, E: OUT, T: look.top, P: look.pants, Z: '#2a2230', A: look.hat || '#c0392b' };
  return sprite(rows, pal, key);
}
function randomLook(city, r = Math.random) {
  const p = a => a[Math.floor(r() * a.length)];
  const hairs = ['short', 'short', 'long', 'long', 'bald'];
  let hair = p(hairs);
  const hatP = city.npc.hat || 0.15;
  let hat = null;
  if (r() < hatP) { hair = r() < 0.5 ? 'hat' : 'cap'; hat = p(city.npc.hats || ['#c0392b', '#2c3e50', '#f1c40f', '#ecf0f1']); }
  return {
    hair, hat, skin: p(city.npc.skins || SKINS), hc: p(HAIRS), top: p(city.npc.tops), pants: p(PANTS),
    dress: r() < (city.npc.dress || 0.15),
  };
}

// ---------- 동물 ----------
const ANIMALS = {
  cat: {
    pal: { K: OUT, C: '#f0a04b', c: '#c9772e', E: '#2f6b2f', W: '#fff4e0', P: '#f48fb1' },
    frames: [[
      '..........K.K.',
      '.........KCKCK',
      'K........KCCCK',
      'KC.......KECEC',
      '.KC.KKKKKKCPCK',
      '..KCCcCCcCCCK.',
      '..KCCCCCCCCK..',
      '..KCK.KCK.KCK.',
      '..KK..KK...KK.',
    ], [
      '..........K.K.',
      '.........KCKCK',
      '.K.......KCCCK',
      'KC.......KECEC',
      'KC..KKKKKKCPCK',
      '.KCCcCCcCCCK..',
      '..KCCCCCCCCK..',
      '...KCKKCK.KCK.',
      '...KK.KK..KK..',
    ]], w: 14, speed: 8,
  },
  dog: {
    pal: { K: OUT, D: '#d9b382', d: '#a87f52', E: OUT, N: '#2a2230', T: '#e86b6b' },
    frames: [[
      '.........KK...',
      '........KdDK..',
      'K......KDDEDKK',
      'KDK....KDDDDDN',
      '.KDKKKKKDDDKK.',
      '..KDDDDDDDDK..',
      '..KDDDDDDDK...',
      '..KDK.KDK.KDK.',
      '..KK..KK..KK..',
    ], [
      '.........KK...',
      '........KdDK..',
      '.K.....KDDEDKK',
      'KDK....KDDDDDN',
      'KDK.KKKKDDDKK.',
      '.KDDDDDDDDDK..',
      '..KDDDDDDDK...',
      '...KDKKDKKDK..',
      '...KK.KK.KK...',
    ]], w: 14, speed: 14,
  },
  pigeon: {
    pal: { K: OUT, G: '#8f96a8', g: '#6c7385', V: '#5fb59a', E: '#ff7043', O: '#e3a35a' },
    frames: [[
      '....KK..',
      '...KGEKO',
      '...KVGK.',
      '.KKgVGK.',
      'KgGGGGK.',
      '.KGGGK..',
      '..O.O...',
    ], [
      '........',
      '....KK..',
      '...KGEKO',
      '.KKKVGK.',
      'KgGgGGK.',
      '.KGGGK..',
      '...OO...',
    ]], w: 8, speed: 6,
  },
  cow: {
    pal: { K: OUT, W: '#f4f1ea', B: '#3a3340', P: '#f2a6a6', H: '#d9c9a0' },
    frames: [[
      '.............H.H',
      '............KKKK',
      'K..KKKKKKKKKKWWK',
      'KWKWWBBWWWWBWWEW',
      '.KWWBBBWWWWWWWPP',
      '..KWWWWWWBBWWKKK',
      '..KWWWWWWBBWWK..',
      '..KWK.KWK.KWKWK.',
      '..KBK.KBK.KBKBK.',
    ]], w: 16, speed: 3,
  },
  camel: {
    pal: { K: OUT, C: '#c9995a', c: '#a8783f', E: OUT },
    frames: [[
      '.......KKK........',
      '......KCCCK.......',
      '.....KCCCCCK...KK.',
      '....KCCCCCCCK.KCCK',
      '...KCCCCCCCCCKKCEC',
      'K.KCCCCCCCCCCCKCKK',
      'KCKCCCCCCCCCCCKCK.',
      '.KCCcCCCCCCcCCCCK.',
      '..KCCCCCCCCCCCKK..',
      '...KCK..KCK..KCK..',
      '...KCK..KCK..KCK..',
      '...KCK..KCK..KCK..',
      '...KKK..KKK..KKK..',
    ]], w: 18, speed: 4,
  },
  kangaroo: {
    pal: { K: OUT, R: '#c97b4a', r: '#a35d33', E: OUT, W: '#f2d2b0' },
    frames: [[
      '.......KK.K.',
      '.......KRKRK',
      '......KRRRRK',
      '......KRERRR',
      '.....KRRRRK.',
      '....KRRWWK..',
      '...KRRWWWRK.',
      'K.KRRRWWRRK.',
      'KRRRRRRRRK..',
      '.KRRRRRRK...',
      '..KRRrRRK...',
      '..KRK.KRRK..',
      '.KRRK..KRRKK',
    ], [
      '.......KK.K.',
      '.......KRKRK',
      '......KRRRRK',
      '......KRERRR',
      '.....KRRRRK.',
      '....KRRWWK..',
      'K..KRRWWWRK.',
      'KRKRRRWWRRK.',
      '.KRRRRRRRK..',
      '..KRRRRRK...',
      '..KRRrRRK...',
      '...KRKKRK...',
      '...KRRKRRK..',
    ]], w: 12, speed: 20, hop: true,
  },
  penguin: {
    pal: { K: OUT, B: '#26263a', W: '#f4f4f8', Y: '#ffb52e', E: '#ffffff' },
    frames: [[
      '..KKKK..',
      '.KBBBBK.',
      '.KBEBBKY',
      'KBBWWBK.',
      'KBWWWWBK',
      'KBWWWWBK',
      'KBWWWWBK',
      '.KWWWWK.',
      '..YK.YK.',
    ], [
      '..KKKK..',
      '.KBBBBK.',
      '.KBEBBKY',
      'KBBWWBK.',
      'KBWWWWBK',
      'KBWWWWBK',
      'KBWWWWBK',
      '.KWWWWK.',
      '.YK..YK.',
    ]], w: 8, speed: 5,
  },
  giraffe: {
    pal: { K: OUT, Y: '#e8b54a', B: '#9c5f2e', E: OUT },
    frames: [[
      '..........KK.',
      '.........KYYK',
      '.........KYEYK',
      '.........KYYK.',
      '.........KYK..',
      '........KYBK..',
      '........KYYK..',
      '........KBYK..',
      '.......KYYK...',
      '.KKKKKKKYBK...',
      'KYBYYBYYYYK...',
      'KYYBYYYBYK....',
      '.KYK..KYK.....',
      '.KYK..KYK.....',
      '.KYK..KYK.....',
      '.KKK..KKK.....',
    ]], w: 14, speed: 4,
  },
  llama: null,
};
const AnimalSpr = {};
for (const k in ANIMALS) if (ANIMALS[k]) AnimalSpr[k] = ANIMALS[k].frames.map((f, i) => sprite(f, ANIMALS[k].pal, 'an_' + k + i));

// ---------- 아이콘 (7x7) ----------
const ICON_PAL = { K: OUT, R: '#ff4d5e', r: '#b8263a', W: '#ffffff', Y: '#ffd23f', y: '#d99a1e', G: '#5ee08a', B: '#6ab8ff', b: '#3a7bd5', g: '#9aa3b5', P: '#ff9ecb', O: '#ff9f43', D: '#2a2a3a' };
const ICONS = {
  heart: ['.RR.RR.', 'RWRRRRR', 'RRRRRRR', 'RRRRRRr', '.RRRRr.', '..RRr..', '...r...'],
  smile: ['..YYY..', '.YYYYY.', 'YYKYKYY', 'YYYYYYY', 'YKYYYKY', '.YKKKY.', '..YYY..'],
  coin: ['..YYY..', '.YyyyY.', 'YyWYWyY', 'YyYWYyY', 'YyWYWyY', '.YyyyY.', '..YYY..'],
  person: ['..RRR..', '.RRRRR.', '.RRWRR.', '..RRR..', '.RRRRR.', 'RRRRRRR', 'RRRRRRR'],
  play: ['RRRRRRR', 'RRWRRRR', 'RRWWRRR', 'RRWWWRR', 'RRWWRRR', 'RRWRRRR', 'RRRRRRR'],
  film: ['KKKKKKK', 'KWKWKWK', 'KBBBBBK', 'KBbBbBK', 'KBBBBBK', 'KWKWKWK', 'KKKKKKK'],
  clock: ['..WWW..', '.WWKWW.', 'WWWKWWW', 'WWWKKWW', 'WWWWWWW', '.WWWWW.', '..WWW..'],
  sun: ['Y..Y..Y', '.YYYYY.', '.YYYYY.', 'YYYYYYY', '.YYYYY.', '.YYYYY.', 'Y..Y..Y'],
  cloud: ['.......', '..WW...', '.WWWWW.', 'WWWWWWW', 'gWWWWWg', '.ggggg.', '.......'],
  rain: ['..gg...', '.ggggg.', 'gggggg.', '.......', 'B.B.B..', '.B.B.B.', 'B.B.B..'],
  snow: ['W..W..W', '.W.W.W.', '..WWW..', 'WWWWWWW', '..WWW..', '.W.W.W.', 'W..W..W'],
  moon: ['..YYY..', '.YY....', 'YY.....', 'YY.....', 'YY.....', '.YY....', '..YYY..'],
  star: ['...Y...', '...Y...', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'Y.....Y'],
  plane: ['...W...', '..WWW..', 'WWWWWWW', 'WWWWWWW', '...W...', '..WWW..', '.W.W.W.'],
  bolt: ['...YY..', '..YY...', '.YYYYY.', '...YY..', '..YY...', '.YY....', '.Y.....'],
  sick: ['..GGG..', '.GGGGG.', 'GKGGGKG', 'GGGGGGG', 'GGKKKGG', '.GK.KG.', '..GGG..'],
  battery: ['.KKKKK.', 'KGGGGGKK', 'KGGGGGKK', 'KGGGGGK.', '.KKKKK..', '.......', '.......'],
};
const IconSpr = {};
for (const k in ICONS) IconSpr[k] = sprite(ICONS[k], ICON_PAL, 'ic_' + k);
function icon(g, name, x, y, scale = 1) { const s = IconSpr[name]; if (s) drawSpr(g, s, x, y, false, scale); }

// ---------- 음식 (절차적) ----------
// kind: bowl | plate | cone | slice | dog | pie | cup | skewer | croissant | taco
function drawFood(g, f, cx, by, eaten = 0) {
  const left = 1 - eaten;
  const c = f.colors;
  switch (f.base) {
    case 'bowl': {
      // 국물/음식
      const fh = Math.round(6 * left);
      if (fh > 0) {
        rect(g, cx - 10, by - 9 - fh + 1, 21, fh, c[0]);
        for (let i = 0; i < 9 * left; i++) { const x = cx - 8 + ((i * 7) % 17), y = by - 9 - Math.floor(fh * 0.6) + (i % 3); rect(g, x, y, 3, 2, c[1 + (i % (c.length - 1))]); }
        if (f.egg && left > 0.5) { rect(g, cx + 2, by - 13, 5, 4, '#ffffff'); rect(g, cx + 3, by - 12, 3, 2, '#ffb52e'); }
      }
      rect(g, cx - 11, by - 9, 23, 2, '#ffffff');
      for (let i = 0; i < 7; i++) { const w = 23 - i * 2; rect(g, cx - Math.floor(w / 2), by - 8 + i, w, 1, i < 2 ? (f.bowl || '#e8e0d0') : shade(f.bowl || '#e8e0d0', -0.12)); }
      if (f.bowlStripe) hline(g, cx - 9, by - 6, 19, f.bowlStripe);
      break;
    }
    case 'plate': {
      rect(g, cx - 13, by - 3, 27, 2, '#f4f4f4'); rect(g, cx - 11, by - 1, 23, 1, '#c9c9d0');
      const n = Math.ceil(f.pieces * left);
      for (let i = 0; i < n; i++) {
        const x = cx - 10 + i * Math.floor(20 / f.pieces);
        if (f.piece === 'taco') { rect(g, x, by - 8, 7, 5, c[0]); rect(g, x + 1, by - 9, 5, 2, c[1]); px(g, x + 2, by - 10, c[2]); px(g, x + 4, by - 10, c[3] || c[2]); }
        else if (f.piece === 'meat') { rect(g, x, by - 8, 6, 5, c[0]); rect(g, x + 1, by - 7, 4, 1, c[1]); px(g, x + 2, by - 5, c[2]); }
        else if (f.piece === 'croissant') { rect(g, x, by - 7, 8, 4, c[0]); rect(g, x + 2, by - 8, 4, 1, c[0]); vline(g, x + 3, by - 7, 4, c[1]); vline(g, x + 5, by - 7, 4, c[1]); }
        else if (f.piece === 'dog') { rect(g, x, by - 7, 9, 4, c[0]); rect(g, x - 1, by - 8, 11, 2, c[1]); hline(g, x + 1, by - 9, 7, c[2]); }
        else if (f.piece === 'pie') { rect(g, x, by - 8, 9, 5, c[0]); hline(g, x, by - 8, 9, c[1]); px(g, x + 4, by - 9, c[2]); }
        else { rect(g, x, by - 7, 6, 4, c[i % c.length]); }
      }
      break;
    }
    case 'slice': {
      const n = Math.ceil(3 * left);
      rect(g, cx - 13, by - 3, 27, 2, '#f4f4f4');
      for (let i = 0; i < n; i++) {
        const x = cx - 11 + i * 8;
        for (let j = 0; j < 8; j++) rect(g, x + Math.floor(j / 2), by - 4 - j, 7 - j, 1, j === 0 ? c[2] : c[0]);
        px(g, x + 2, by - 6, c[1]); px(g, x + 4, by - 8, c[1]);
      }
      break;
    }
    case 'cone': {
      tri(g, cx - 4, by - 10, 9, 10, '#d9a05a');
      const h = Math.round(10 * left);
      for (let i = 0; i < h; i++) { const w = i < 2 ? 7 : 11; rect(g, cx - Math.floor(w / 2), by - 11 - i, w, 1, c[i < 5 ? 0 : 1]); }
      if (h > 6) circ(g, cx, by - 11 - h, 2, c[2] || c[0]);
      break;
    }
    case 'cup': {
      rect(g, cx - 7, by - 14, 15, 14, '#f4f4f4'); rect(g, cx - 7, by - 10, 15, 4, '#e8394a');
      text(g, '라면', cx, by - 10, '#ffffff', { align: 'center', font: FS });
      if (left > 0.1) { rect(g, cx - 6, by - 15, 13, 2, c[0]); for (let i = 0; i < 3; i++) { const y = by - 18 - i * 3 + Math.round(Math.sin(performance.now() / 200 + i) * 1); px(g, cx - 3 + i * 3, y, '#ffffff'); } }
      break;
    }
    case 'skewer': {
      rect(g, cx - 13, by - 3, 27, 2, '#f4f4f4');
      const n = Math.ceil(3 * left);
      for (let i = 0; i < n; i++) { const x = cx - 12 + i * 9; hline(g, x - 1, by - 7, 9, '#d9c9a0'); for (let j = 0; j < 3; j++) rect(g, x + j * 2 + (j > 0 ? 1 : 0), by - 9, 2, 4, c[j % c.length]); }
      break;
    }
  }
}

// ---------- 탈것 ----------
function drawVehicle(g, v, x, y, t) {
  const flip = v.dir < 0;
  const W2 = v.kind === 'bus' ? 40 : v.kind === 'scooter' ? 12 : v.kind === 'tuktuk' ? 20 : 26;
  g.save();
  if (flip) { g.translate(Math.round(x) * 2 + W2, 0); g.scale(-1, 1); }
  x = Math.round(x); y = Math.round(y);
  const wheel = (wx) => { rect(g, wx - 2, y - 3, 5, 4, '#1e1e26'); px(g, wx, y - 2, '#8a8a99'); };
  const col = v.color;
  if (v.kind === 'bus') {
    rect(g, x, y - 20, 40, 17, col); rect(g, x, y - 20, 40, 2, shade(col, 0.25)); rect(g, x, y - 6, 40, 3, shade(col, -0.25));
    for (let i = 0; i < 5; i++) rect(g, x + 3 + i * 7, y - 16, 5, 5, '#a8d8f0');
    rect(g, x + 36, y - 16, 4, 8, '#a8d8f0');
    wheel(x + 8); wheel(x + 32);
  } else if (v.kind === 'tuktuk') {
    rect(g, x + 2, y - 15, 15, 2, '#2b6cb0'); rect(g, x + 3, y - 13, 2, 8, '#2b2b35'); rect(g, x + 14, y - 13, 2, 8, '#2b2b35');
    rect(g, x + 2, y - 7, 17, 4, col); rect(g, x + 16, y - 12, 4, 6, col);
    wheel(x + 5); wheel(x + 16);
  } else if (v.kind === 'scooter') {
    rect(g, x + 2, y - 7, 9, 3, col); rect(g, x + 9, y - 12, 2, 6, '#555'); rect(g, x + 4, y - 15, 5, 8, '#3a5bd9'); rect(g, x + 4, y - 18, 4, 3, '#f6cfa6'); rect(g, x + 3, y - 19, 6, 2, '#ffffff');
    wheel(x + 2); wheel(x + 10);
  } else if (v.kind === 'jeep') {
    rect(g, x, y - 12, 26, 9, col); rect(g, x + 4, y - 18, 16, 6, '#3a3a2a'); rect(g, x + 6, y - 16, 5, 3, '#a8d8f0'); rect(g, x + 13, y - 16, 5, 3, '#a8d8f0');
    rect(g, x + 22, y - 10, 4, 2, '#ffe9a8'); wheel(x + 6); wheel(x + 20);
  } else {
    // car / taxi
    rect(g, x + 5, y - 14, 15, 5, shade(col, -0.1)); rect(g, x + 7, y - 13, 5, 3, '#a8d8f0'); rect(g, x + 13, y - 13, 5, 3, '#a8d8f0');
    rect(g, x, y - 9, 26, 6, col); rect(g, x, y - 9, 26, 1, shade(col, 0.3)); rect(g, x + 23, y - 8, 3, 2, '#ffe9a8'); rect(g, x, y - 8, 2, 2, '#ff5252');
    if (v.kind === 'taxi') { rect(g, x + 10, y - 16, 6, 2, '#1b1530'); }
    wheel(x + 6); wheel(x + 20);
  }
  g.restore();
}

// ---------- 큰 타이틀용: 플레이 버튼(실버/골드) ----------
function drawPlayButton(g, cx, cy, s, metal) {
  const col = metal === 'gold' ? ['#ffe27a', '#e8b52e', '#a8781a'] : metal === 'diamond' ? ['#e8fbff', '#9fe3f5', '#5ab0d0'] : ['#f2f4f8', '#c3c8d4', '#868c9c'];
  const w = 26 * s, h = 20 * s;
  rect(g, cx - w / 2 - s, cy - h / 2 - s, w + 2 * s, h + 2 * s, OUT);
  rect(g, cx - w / 2, cy - h / 2, w, h, col[1]);
  rect(g, cx - w / 2, cy - h / 2, w, 2 * s, col[0]);
  rect(g, cx - w / 2, cy + h / 2 - 2 * s, w, 2 * s, col[2]);
  const tw = 8 * s, th = 10 * s;
  for (let i = 0; i < th; i++) { const ww = Math.round(tw * (1 - Math.abs(i - th / 2) / (th / 2))); rect(g, cx - tw / 2 + s, cy - th / 2 + i, ww, 1, '#ff3b4e'); }
}
