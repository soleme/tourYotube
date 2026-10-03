'use strict';
// =====================================================================
//  actions.js — 스팟 행동, 클립, 업로드, 라이브, 상점, 메뉴, 미션, 엔딩
// =====================================================================
function ic(name) { return iconHTML(name, 2); }

// ---------- 시간 체크 ----------
async function checkTime(h) {
  if (clockAbs() + h > 26) {
    await UI.say('너무 늦었다... 오늘은 숙소로 돌아가서 쉬자.', { title: '새벽 ' + clockStr() });
    return false;
  }
  return true;
}
async function checkHp(cost) {
  if (S.hp - cost < 0) {
    await UI.say('체력이 바닥났다. 숙소에서 쉬거나 에너지드링크를 마시자.', { title: '지쳤다...' });
    return false;
  }
  return true;
}

// ---------- 클립 ----------
function makeClip(kind, label, score, key, extra = {}) {
  const q = clamp(Math.round(score * 0.82 + gearQ(kind) + moodAdj() + 4), 3, 100);
  const nov = key ? novelty(key) : 1.3;
  if (key) S.filmed[key] = (S.filmed[key] || 0) + 1;
  return { id: S.nextId++, city: S.city, kind, label, q, nov, ...extra };
}
async function addClip(clip, quiet = false) {
  // 미션 체크
  const m = S.missions.find(mm => mm.city === clip.city && mm.kind === (clip.kind === 'night' || clip.kind === 'drone' ? 'landmark' : clip.kind));
  if (m) { clip.mission = true; S.missions = S.missions.filter(x => x !== m); UI.toast(`★ 시청자 미션 달성! (${m.short})`, { cls: 'gold' }); Snd.play('fanfare'); gain({ mood: 8 }); }
  if (S.clips.length >= clipCap()) {
    const worst = S.clips.reduce((a, b) => (a.q * a.nov <= b.q * b.nov ? a : b));
    const i = await UI.ask({ title: 'SD카드 가득 참', text: `저장 공간이 부족하다! (${S.clips.length}/${clipCap()})\n가장 별로인 클립 "${worst.label}"(${worst.q}점)을 지우고 저장할까?`, choices: ['지우고 저장', '새 클립 버리기'], cancel: 1 });
    if (i !== 0) return false;
    S.clips = S.clips.filter(c => c !== worst);
  }
  S.clips.push(clip);
  if (!quiet) await UI.say(`"${clip.label}" 클립 저장!\n퀄리티 ${stars(clip.q)} (${clip.q}점) · ${clip.nov >= 1.2 ? '신선한 소재!' : clip.nov >= 0.7 ? '무난한 소재' : '재탕 소재...'}${clip.mission ? ' · ★미션' : ''}`, { title: '촬영 완료' });
  if (S.clips.length === 1 && !S.flags.tipUpload) { S.flags.tipUpload = 1; await UI.say('클립은 숙소에서 편집해서 업로드할 수 있다. 여러 클립을 모아서 올리면 영상이 길어져 퀄리티 보너스!', { title: 'TIP' }); }
  return true;
}
async function eventClip(label, base, tag) {
  const clip = makeClip('event', label, base + rand(-8, 8), null, { tag });
  clip.nov = 1.3;
  return addClip(clip);
}

// ---------- 스팟: 공항 ----------
async function spotAirport() {
  if (S.day > DAY_LIMIT) return;
  await MapScene.open();
}

// ---------- 스팟: 포토존 ----------
async function spotPhoto() {
  const c = cityNow(), night = isNight();
  const key = c.id + (night ? ':night' : ':lm'), dkey = c.id + ':drone';
  const choices = [{ label: night ? `${c.lmName} 야경 촬영` : `${c.lmName} 촬영`, sub: `2시간 · 체력 -8 · ${novTag(key)}` }];
  if (S.gear.drone) choices.push({ label: '드론 촬영', sub: `2시간 · 체력 -10 · ${novTag(dkey)}` });
  choices.push({ label: '그만두기' });
  const i = await UI.ask({ title: '포토존', text: night ? `밤의 ${c.lmName}. 조명이 켜져 있다!` : `${c.lmName}이(가) 한눈에 보이는 명당이다.`, choices, cancel: choices.length - 1 });
  const ch = choices[i];
  if (!ch || ch.label === '그만두기') return;
  const drone = ch.label === '드론 촬영';
  if (!(await checkTime(2)) || !(await checkHp(drone ? 10 : 8))) return;
  if (drone && S.weather === 'rain' && chance(0.5)) { await UI.say('비바람 때문에 드론이 휘청거린다... 오늘은 띄우지 않는 게 좋겠다.', { title: '드론' }); return; }
  const score = await runMini('frame', { drone, night });
  passTime(2); gain({ hp: drone ? -10 : -8 });
  const label = drone ? `${c.name} 드론샷` : night ? `${c.lmName} 야경` : `${c.lmName} 풍경`;
  const clip = makeClip(drone ? 'drone' : night ? 'night' : 'landmark', label, score + (night ? 6 : 0), drone ? dkey : key);
  if (drone && chance(0.07)) {
    await UI.say('촬영을 마치고 복귀하던 드론이... 갈매기와 정면충돌했다!!\n수리비가 들었다.', { title: '드론 사고' });
    gain({ money: -Math.min(S.money, 200000), mood: -10 });
  }
  await addClip(clip);
  await maybeStreetEvent(0.15);
}

// ---------- 스팟: 맛집 ----------
async function spotFood() {
  const c = cityNow(), cost = priceOf(BAL.FOOD), key = c.id + ':food';
  const i = await UI.ask({
    title: c.food.name, text: `소문난 ${c.food.name} 맛집이다. 냄새가 미쳤다...`,
    choices: [
      { label: '먹방 촬영', sub: `1시간 · ${won(cost)} · 체력 +12 · ${novTag(key)}`, disabled: S.money < cost },
      { label: '그냥 사 먹기', sub: `30분 · ${won(cost)} · 체력 +15`, disabled: S.money < cost },
      { label: '그만두기' }],
    cancel: 2,
  });
  if (i === 1) { passTime(0.5); gain({ money: -cost, hp: 15, mood: 4 }); await maybeSick(c); return; }
  if (i !== 0) return;
  if (!(await checkTime(1))) return;
  const score = await runMini('eat', { food: c.food });
  passTime(1); gain({ money: -cost, hp: 12, mood: 5 });
  await addClip(makeClip('food', `${c.food.name} 먹방`, score, key));
  await maybeSick(c);
  await maybeStreetEvent(0.12);
}
async function maybeSick(c) {
  const p = c.food.spicy ? 0.1 : (c.price < 0.7 ? 0.07 : 0.03);
  if (!S.status.sick && chance(p)) {
    S.status.sick = 2;
    shake(2); Snd.play('bad');
    await UI.say('으... 배가 살살 아프다. 배탈이 났다! (2일간 퀄리티↓, 비상약으로 치료 가능)', { title: '배탈' });
  }
}

// ---------- 스팟: 체험 ----------
async function spotAct() {
  const c = cityNow(), cost = priceOf(BAL.ACT), key = c.id + ':act';
  const i = await UI.ask({
    title: c.act.name, text: c.act.verb,
    choices: [{ label: '도전! (촬영)', sub: `3시간 · ${won(cost)} · 체력 -20 · ${novTag(key)}`, disabled: S.money < cost }, { label: '그만두기' }],
    cancel: 1,
  });
  if (i !== 0) return;
  if (!(await checkTime(3)) || !(await checkHp(20))) return;
  let bonus = 0;
  if (c.act.fx === 'aurora') {
    if (!isNight()) { await UI.say('낮에는 오로라가 보이지 않는다... 그래도 설원 풍경이라도 찍어 보자. (밤에 오면 보너스!)', { title: '오로라' }); bonus = -18; }
    else if (S.weather === 'cloud' || S.weather === 'snow') { await UI.say('구름이 꼈다... 오로라가 희미하다.', { title: '오로라' }); bonus = -6; }
    else { await UI.say('오늘 밤 하늘이 맑다! 오로라 지수 최고!', { title: '오로라' }); bonus = 12; }
  }
  const score = await runMini('rhythm', { city: c });
  passTime(3); gain({ money: -cost, hp: -20, mood: 6 });
  await addClip(makeClip('act', c.act.name, score + bonus, key));
  await maybeStreetEvent(0.15);
}

// ---------- 스팟: 상점 ----------
async function spotShop() {
  await UI.panel({
    title: '상점', cols: 1,
    build(b, close, m) {
      const wrap = h('div', { class: 'shop' });
      wrap.appendChild(h('div', { class: 'money-line' }, `${ic('coin')} 보유금 <b>${won(S.money)}</b>`));
      wrap.appendChild(h('div', { class: 'sec' }, '촬영 장비'));
      for (const gItem of GEAR) {
        const owned = S.gear[gItem.id] || (gItem.id === 'cam1' && S.gear.cam2);
        const locked = gItem.need && !S.gear[gItem.need];
        const sub = owned ? '보유 중' : locked ? '미러리스 카메라 먼저 필요' : `${won(gItem.price)} · ${gItem.desc}`;
        wrap.appendChild(UI.btn(esc(gItem.name), async () => {
          if (S.money < gItem.price) { Snd.play('cancel'); UI.toast('돈이 부족해요'); return; }
          S.money -= gItem.price; S.gear[gItem.id] = 1; Snd.play('coin');
          UI.toast(`${gItem.name} 구입!`, { cls: 'gold' });
          m.lastFocus = [...b.querySelectorAll('button.btn')].indexOf(document.activeElement);
          m.refresh();
        }, { sub: esc(sub), disabled: owned || locked || S.money < gItem.price, cls: owned ? 'owned' : '' }));
      }
      wrap.appendChild(h('div', { class: 'sec' }, '소모품'));
      for (const it of ITEMS) {
        wrap.appendChild(UI.btn(`${esc(it.name)} <span class="cnt">보유 ${S.items[it.id] || 0}</span>`, () => {
          if (S.money < it.price) { Snd.play('cancel'); UI.toast('돈이 부족해요'); return; }
          S.money -= it.price; S.items[it.id] = (S.items[it.id] || 0) + 1; Snd.play('coin');
          m.lastFocus = [...b.querySelectorAll('button.btn')].indexOf(document.activeElement);
          m.refresh();
        }, { sub: `${won(it.price)} · ${esc(it.desc)}`, disabled: S.money < it.price }));
      }
      wrap.appendChild(UI.btn('나가기', () => close(null), { cls: 'ghost' }));
      b.appendChild(wrap);
    },
  });
}

// ---------- 스팟: 숙소 ----------
async function spotHotel() {
  const c = cityNow();
  for (; ;) {
    const cost = priceOf(BAL.HOTEL), alba = Math.max(30000, priceOf(BAL.ALBA));
    const broke = S.money < cost;
    const choices = [
      broke ? { label: '로비 소파에서 쪽잠', sub: '무료 · 체력 일부만 회복 · 텐션 -10', k: 'couch' } : { label: '잠자기', sub: `${won(cost)} · 다음 날 아침까지`, k: 'sleep' },
      { label: '편집 & 업로드', sub: S.clips.length ? `클립 ${S.clips.length}개 · 2시간 · 체력 -8` : '찍어 둔 클립이 없다', disabled: !S.clips.length, k: 'upload' },
      { label: '라이브 방송', sub: S.subs < 100 ? '구독자 100명부터' : '2시간 · 체력 -12 · 후원 수익', disabled: S.subs < 100, k: 'live' },
      { label: '단기 알바', sub: `4시간 · 체력 -25 · +${won(alba)}`, k: 'alba' },
      { label: '나가기', k: 'out' },
    ];
    const i = await UI.ask({ title: `${c.name} 게스트하우스`, text: `지금은 ${S.day}일차 ${clockStr()}. 무엇을 할까?`, choices, cancel: 4 });
    const k = choices[i] && choices[i].k;
    if (!k || k === 'out') return;
    if (k === 'sleep' || k === 'couch') { await sleep(k === 'couch' ? 0 : cost); return; }
    if (k === 'upload') { await uploadFlow(); continue; }
    if (k === 'live') { if (await checkTime(2) && await checkHp(12)) await liveFlow(); continue; }
    if (k === 'alba') {
      if (!(await checkTime(4)) || !(await checkHp(25))) continue;
      const jobs = ['주방 설거지', '게스트하우스 청소', '관광객 짐 나르기', '전단지 돌리기', '카페 서빙'];
      const job = pick(jobs);
      await wipe(() => { passTime(4); });
      gain({ money: alba, hp: -25, mood: -6 });
      await UI.say(`${job} 알바를 했다. 허리가 뻐근하다...\n${won(alba)}을 벌었다.`, { title: '알바 끝' });
      if (chance(0.25)) await eventClip(`${c.name} 알바 브이로그`, 52, 'alba');
      continue;
    }
  }
}
async function sleep(cost) {
  await wipe(() => {
    if (cost) S.money -= cost;
    const before = S.day;
    if (S.hour >= 5) S.day++;
    S.hour = 8;
    if (S.day !== before) onNewDay();
    S.hp = cost ? (S.status.sick ? 70 : 100) : Math.max(S.hp, 55);
    S.mood = clamp(S.mood + (cost ? 6 : -10), 0, 100);
    CityScene.px = SPOTS[1].x; CityScene.cam = clamp(CityScene.px + 6 - 160, 0, WORLD_W - W); CityScene.hourVis = S.hour;
    CityScene.spawnEventNpcs();
  });
  Snd.play('ding');
  save();
  if (S.day > DAY_LIMIT) return;
  const left = DAY_LIMIT - S.day + 1;
  UI.toast(`${S.day}일차 아침 · 남은 기간 ${left}일`);
  const wx = { sun: '맑음', cloud: '흐림', rain: '비', snow: '눈' }[S.weather];
  if (left === 10 || left === 3) await UI.say(`여행이 ${left}일 남았다! 마지막까지 달려 보자.`, { title: 'D-' + left });
  if (S.weather === 'rain' && !S.items.umbrella) await UI.say(`오늘 ${cityNow().name} 날씨: ${wx}. 우산이 없으면 장비가 걱정된다...`, { title: '일기예보' });
  await morningEvent();
}

// ---------- 업로드 ----------
function videoTitle(clips, style) {
  const c = CITY[clips[clips.length - 1].city];
  const kinds = clips.map(x => x.kind);
  const food = clips.find(x => x.kind === 'food'), act = clips.find(x => x.kind === 'act');
  const lm = clips.find(x => x.kind === 'landmark' || x.kind === 'night' || x.kind === 'drone');
  const ep = S.videos.length + 1;
  if (style === 'honest') {
    const parts = [];
    if (lm) parts.push(lm.kind === 'night' ? `${c.lmName} 야경` : c.lmName);
    if (food) parts.push(`${CITY[food.city].food.name} 먹방`);
    if (act) parts.push(CITY[act.city].act.short);
    const ev = clips.find(x => x.kind === 'event');
    if (ev && parts.length < 3) parts.push(ev.label);
    return `[세계일주 EP.${ep}] ${c.name} ${parts.slice(0, 3).join(' + ') || '브이로그'}`;
  }
  if (style === 'bait') {
    const t = [
      `충격!! ${c.name}에서 '이것' 하다가 쫓겨날 뻔 (실화)`,
      food ? `${CITY[food.city].food.name} 먹다가 응급실 갈 뻔한 썰ㄷㄷ` : `${c.name} 현지인도 모르는 숨겨진 비밀`,
      `여행 유튜버가 ${c.name}에서 오열한 이유...`,
      `${c.name} 가지 마세요. 진짜로요.`,
      act ? `${CITY[act.city].act.short} 하다가 인생 망할 뻔 했습니다` : `제 인생을 바꾼 ${c.name}의 하루`,
    ];
    return t[(ep + clips.length) % t.length];
  }
  const t = [
    `${c.name}의 오후, 바람이 불었다`,
    food ? `${CITY[food.city].food.name} 한 그릇에 담긴 위로 | ${c.name}` : `천천히 걸어도 괜찮아 | ${c.name} 브이로그`,
    `지금 이 순간, ${c.name}`,
    `오늘도 낯선 곳에서 잘 지내고 있어요 | ${c.name}`,
  ];
  return t[(ep + clips.length) % t.length];
}
async function uploadFlow() {
  if (!S.clips.length) return;
  if (!(await checkTime(2))) return;
  const clips = S.clips.slice();
  const styleId = await UI.panel({
    title: '영상 편집', cls: 'wide',
    build(b, close) {
      const rows = clips.map(c => `<div class="clip"><span class="tag k-${c.kind}">${{ landmark: '풍경', night: '야경', drone: '드론', food: '먹방', act: '체험', event: '이벤트', flight: '기내' }[c.kind] || '클립'}</span><span class="cl">${esc(c.label)}</span><span class="cq">${stars(c.q)}</span>${c.mission ? '<span class="ms">★미션</span>' : ''}${c.nov >= 1.2 ? '<span class="nw">NEW</span>' : c.nov < 0.7 ? '<span class="old">재탕</span>' : ''}</div>`).join('');
      const est = Math.round(avg(clips.map(c => c.q)) + Math.min(12, (clips.length - 1) * 3));
      b.innerHTML = `<div class="clips">${rows}</div><div class="est">예상 퀄리티 <b>${Math.min(100, est)}</b> · 클립 ${clips.length}개${clips.length > 1 ? ` (길이 보너스 +${Math.min(12, (clips.length - 1) * 3)})` : ''}</div><div class="sec">제목 스타일을 골라 업로드</div>`;
      for (const st of TITLE_STYLES) b.appendChild(UI.btn(`${esc(st.name)} <span class="hint">${esc(st.desc)}</span>`, () => close(st.id), { sub: `“${esc(videoTitle(clips, st.id))}”` }));
      b.appendChild(UI.btn('나중에 올리기', () => close(null), { cls: 'ghost' }));
    },
  });
  if (!styleId) return;
  const style = TITLE_STYLES.find(s => s.id === styleId);
  const title = videoTitle(clips, styleId);
  // 렌더링
  await UI.panel({
    title: '렌더링 중', closable: false,
    build(b, close) {
      b.innerHTML = `<div class="render"><div class="bar"><i></i></div><div class="tip">${LOADING_TIPS[0]}</div></div>`;
      const bar = b.querySelector('i'), tip = b.querySelector('.tip');
      let p = 0;
      const iv = setInterval(() => {
        p += REDUCED ? 34 : rand(5, 12);
        bar.style.width = Math.min(100, p) + '%';
        if (Math.random() < 0.3) tip.textContent = pick(LOADING_TIPS);
        Snd.play('tick');
        if (p >= 100) { clearInterval(iv); setTimeout(() => close(true), 250); }
      }, 90);
    },
  });
  passTime(2); S.hp = clamp(S.hp - 8, 0, 100);
  const subs0 = S.subs;
  const v = computeVideo({ subs: S.subs, clips, style, laptop: !!S.gear.laptop, buff: S.buff, monetized: S.monetized, viralBonus: S.viralBonus || 0 });
  S.viralBonus = 0;
  if (S.flags.sponsorAd) { v.views = Math.floor(v.views * 0.9); S.flags.sponsorAd = 0; }
  addSubs(v.subs);
  S.totalViews += v.views; S.revenue += v.revenue; S.money += v.revenue;
  S.clips = S.clips.filter(c => !clips.includes(c));
  const vid = { ep: S.videos.length + 1, title, views: v.views, subs: v.subs, q: v.q, day: S.day, city: S.city, viral: v.viral > 0, style: styleId };
  S.videos.push(vid);
  if (!S.best || vid.views > S.best.views) S.best = vid;
  if (v.viral) S.mood = clamp(S.mood + 25, 0, 100);
  if (v.backlash) S.mood = clamp(S.mood - 20, 0, 100);
  const comments = makeComments(clips, style, v);
  await showResult(vid, v, clips, comments, subs0);
  // 댓글 미션
  if (chance(0.45) && S.missions.length < 3) {
    const m = newMission();
    if (m) { S.missions.push(m); await UI.say(`인기 댓글: "${m.text}"\n시청자 미션이 추가되었다! (지도에 ★ 표시)`, { title: '★ 시청자 미션' }); }
  }
  if (v.backlash) await UI.say('댓글창이 불타고 있다... "제목 낚시 그만하세요" 논란으로 구독자가 빠져나갔다.', { title: '논란 발생' });
  save();
  await maybeUploadEvent();
}
function makeComments(clips, style, v) {
  const c = CITY[clips[0].city], out = [];
  const fill = s => s.replace('{city}', c.name).replace('{food}', c.food.name).replace('{lm}', c.lmName).replace('{act}', c.act.short);
  const add = list => { const opts = list.map(fill).filter(t => !out.some(o => o.t === t)); if (opts.length) out.push({ n: pick(NICKS), t: pick(opts) }); };
  if (S.subs < 300) out.push({ n: '엄마', t: pick(COMMENTS.small) });
  if (v.viral) add(COMMENTS.viral);
  if (style.id === 'bait') add(COMMENTS.bait);
  if (style.id === 'mood') add(COMMENTS.mood);
  if (v.q >= 80) add(COMMENTS.high); else if (v.q < 40) add(COMMENTS.low);
  for (const k of ['food', 'landmark', 'drone', 'act', 'event']) if (clips.some(x => x.kind === k || (k === 'landmark' && x.kind === 'night'))) add(COMMENTS[k]);
  for (let i = 0; i < 8 && out.length < 5; i++) add(COMMENTS.any);
  return shuffle(out).slice(0, 5);
}
function thumbCanvas(vid, clips) {
  const c = makeCanvas(W, H), g = c.g, city = CITY[vid.city];
  const L = cityLayers(city.id), sk = skyAt(clips.some(x => x.kind === 'night') ? 21 : 13, city, 'sun');
  drawSkyBands(g, sk, 0, 150);
  g.drawImage(L.far.c, -42, 0); g.drawImage(L.mid.c, -84, 0); g.drawImage(L.front.c, -140, 0);
  tintLayer(g, sk);
  drawSpr(g, PlayerSpr.top, 200, 70, true, 6);
  const big = vid.title.length > 16 ? vid.title.slice(0, 14) + '…' : vid.title;
  text(g, big, 8, 140, vid.style === 'bait' ? '#ffd23f' : '#ffffff', { font: FB, outline: OUT });
  if (vid.style === 'bait') { for (let a = 0; a < 6.3; a += 0.1) px(g, 228 + Math.cos(a) * 40, 100 + Math.sin(a) * 34, '#ff3b3b'); line(g, 120, 60, 180, 90, '#ff3b3b'); line(g, 121, 60, 181, 90, '#ff3b3b'); }
  rect(g, W - 40, H - 16, 36, 12, OUT); text(g, `${Math.max(1, Math.round(clips.length * 4.5))}:${String(randi(10, 59))}`, W - 22, H - 15, '#ffffff', { align: 'center' });
  return c;
}
async function showResult(vid, v, clips, comments, subs0) {
  const th = thumbCanvas(vid, clips);
  await UI.panel({
    title: v.viral ? '떡상!! 알고리즘의 선택' : '업로드 완료', cls: 'wide result' + (v.viral ? ' viral' : ''), closable: false,
    build(b, close) {
      b.innerHTML = `<div class="vid"><img class="thumb" alt="썸네일" src="${th.toDataURL()}"><div class="meta"><div class="vt">${esc(vid.title)}</div><div class="vc">${esc(S.channel)} · EP.${vid.ep} · 방금 전</div></div></div>
        <div class="stats"><div><span>조회수</span><b data-k="views">0</b></div><div><span>좋아요</span><b data-k="likes">0</b></div><div><span>구독자</span><b data-k="subs" class="${v.subs < 0 ? 'neg' : ''}">0</b></div><div><span>광고 수익</span><b data-k="rev">${S.monetized || v.revenue ? '₩0' : '수익창출 전'}</b></div></div>
        ${v.viral ? `<div class="viral-banner">🔥 조회수 ${v.viral.toFixed(1)}배 폭발! 알고리즘이 추천해 줬다!</div>` : ''}
        <div class="comments"></div>`;
      const done = UI.btn('확인', () => close(true));
      done.style.visibility = 'hidden';
      b.appendChild(done);
      const els = {}; b.querySelectorAll('[data-k]').forEach(e => els[e.dataset.k] = e);
      const target = { views: v.views, likes: v.likes, subs: v.subs, rev: v.revenue };
      if (v.viral) { Snd.play('viral'); shake(4); }
      let k = 0;
      const steps = REDUCED ? 1 : 40;
      const iv = setInterval(() => {
        k++;
        const t = k / steps, e = 1 - Math.pow(1 - t, 3);
        els.views.textContent = fmt(target.views * e);
        els.likes.textContent = fmt(target.likes * e);
        els.subs.textContent = (target.subs >= 0 ? '+' : '') + fmt(target.subs * e);
        if (S.monetized || target.rev) els.rev.textContent = won(target.rev * e);
        if (k % 3 === 0) Snd.play('tick');
        if (k >= steps) {
          clearInterval(iv);
          Snd.play(v.subs >= 0 ? 'coin' : 'bad');
          const box = b.querySelector('.comments');
          comments.forEach((cm, i) => setTimeout(() => { box.appendChild(h('div', { class: 'cm' }, `<b>@${esc(cm.n)}</b> ${esc(cm.t)}`)); Snd.play('blip'); if (i === comments.length - 1) { done.style.visibility = 'visible'; UI.focus([done], 0); } }, (REDUCED ? 0 : 260) * (i + 1)));
          if (!comments.length) { done.style.visibility = 'visible'; UI.focus([done], 0); }
        }
      }, 40);
    },
  });
}

// ---------- 라이브 ----------
async function liveFlow() {
  const viewers = Math.floor(5 + S.subs * rand(0.004, 0.012));
  let donate = Math.floor(viewers * rand(60, 160) * (S.gear.light ? 1.4 : 1) * (S.mood / 70));
  const chats = ['안녕하세요!!', '오 라이브다', '거기 몇 시예요?', '뒤에 뭐예요?', '오늘 뭐 먹었어요?', 'ㅋㅋㅋㅋㅋ', '목소리 좋다', '다음 여행지 어디예요?', '방송 켜주셔서 감사해요', '얼굴 피곤해 보여요ㅠ', '하트 뿅뿅', '1빠', '현지 사람들 친절해요?', '구독했어요!'];
  let big = null;
  if (chance(0.15)) { big = Math.round(Math.max(100000, S.subs * rand(0.5, 2)) / 1000) * 1000; donate += big; }
  await UI.panel({
    title: `LIVE · ${S.channel}`, cls: 'live', closable: false,
    build(b, close) {
      b.innerHTML = `<div class="live-top"><span class="dot">● LIVE</span> 시청자 <b class="vw">0</b>명 · 후원 <b class="dn">₩0</b></div><div class="chat"></div>`;
      const chat = b.querySelector('.chat'), vw = b.querySelector('.vw'), dn = b.querySelector('.dn');
      let k = 0, sum = 0;
      const N = REDUCED ? 6 : 22;
      const iv = setInterval(() => {
        k++;
        vw.textContent = fmt(viewers * Math.min(1, k / 8 + rand(-0.05, 0.05)));
        const isDon = chance(0.25) || (big && k === 15);
        let line;
        if (big && k === 15) { sum += big; line = `<div class="cm sc big"><b>@${esc(pick(NICKS))}</b> ${won(big)} 슈퍼챗!! "여행 계속 해주세요!!!"</div>`; Snd.play('fanfare'); }
        else if (isDon) { const a = Math.round(rand(1, 5)) * 1000; sum += a; line = `<div class="cm sc"><b>@${esc(pick(NICKS))}</b> ${won(a)} 후원 · ${esc(pick(chats))}</div>`; Snd.play('coin'); }
        else { line = `<div class="cm"><b>@${esc(pick(NICKS))}</b> ${esc(pick(chats))}</div>`; Snd.play('blip'); }
        chat.insertAdjacentHTML('beforeend', line);
        chat.scrollTop = chat.scrollHeight;
        dn.textContent = won(Math.min(donate, sum + Math.floor(donate * k / N * 0.5)));
        if (k >= N) { clearInterval(iv); dn.textContent = won(donate); const btn = UI.btn('방송 종료', () => close(true)); b.appendChild(btn); UI.focus([btn], 0); }
      }, REDUCED ? 60 : 230);
    },
  });
  passTime(2);
  S.lives++;
  const ns = Math.floor(viewers * rand(0.05, 0.15));
  gain({ money: donate, subs: ns, hp: -12, mood: 6 });
  await UI.say(`방송 종료! 최고 시청자 ${fmt(viewers)}명.\n후원 ${won(donate)} · 새 구독자 +${fmt(ns)}`, { title: '라이브 결과' });
  if (chance(0.3) && S.missions.length < 3) { const m = newMission(); if (m) { S.missions.push(m); await UI.say(`채팅 요청: "${m.text}"\n시청자 미션 추가!`, { title: '★ 시청자 미션' }); } }
}

// ---------- 미션 ----------
function newMission() {
  const pool = CITIES.filter(c => (!c.secret || S.unlocked[c.id]) && c.id !== S.city && !S.missions.some(m => m.city === c.id));
  if (!pool.length) return null;
  const c = pick(pool), kind = pick(['food', 'act', 'landmark', 'visit']);
  const map = {
    food: [`${c.name}에서 ${c.food.name} 먹방 해주세요!`, `${c.food.name} 먹방`],
    act: [`${c.name} ${c.act.name} 영상 보고 싶어요!!`, `${c.act.short} 체험`],
    landmark: [`${c.lmName} 꼭 보여주세요!`, `${c.lmName.split(' ')[0]} 촬영`],
    visit: [`다음 여행지는 ${c.name} 어때요?`, `${c.name} 방문`],
  };
  return { city: c.id, kind, text: map[kind][0], short: `${c.name} ${map[kind][1].replace(c.name + ' ', '')}`.slice(0, 18) };
}

// ---------- 메뉴 ----------
async function openMenu() {
  if (CityScene.busy) return;
  CityScene.busy = true;
  Snd.play('select');
  try {
    await UI.panel({
      title: S.channel, icon: ic('play'), cls: 'wide menu-panel',
      build(b, close, m) {
        const gearNames = GEAR.filter(g => S.gear[g.id]).map(g => g.name);
        const status = [];
        if (S.status.sick) status.push(`배탈 (${S.status.sick}일)`);
        if (S.buff > 1) status.push(`조회수 버프 x${S.buff}`);
        b.innerHTML = `<div class="grid2">
          <div class="card"><div class="k">구독자</div><div class="v">${fmt(S.subs)}명</div></div>
          <div class="card"><div class="k">총 조회수</div><div class="v">${fmt(S.totalViews)}</div></div>
          <div class="card"><div class="k">보유금</div><div class="v">${won(S.money)}</div></div>
          <div class="card"><div class="k">여행</div><div class="v">${S.day}/${DAY_LIMIT}일 · ${Object.keys(S.visited).length}개 도시</div></div></div>
          <div class="row">체력 ${S.hp} · 텐션 ${S.mood}${status.length ? ' · ' + status.join(' · ') : ''}${S.monetized ? ' · 수익창출 ON' : ' · 수익창출은 구독자 1,000명부터'}</div>
          <div class="sec">시청자 미션</div><div class="row">${S.missions.length ? S.missions.map(x => '★ ' + esc(x.text)).join('<br>') : '아직 없음 (업로드하면 댓글로 들어와요)'}</div>
          <div class="sec">장비</div><div class="row">${gearNames.length ? esc(gearNames.join(', ')) : '스마트폰 한 대'}</div>
          <div class="sec">최고 인기 영상</div><div class="row">${S.best ? `${esc(S.best.title)} · 조회수 ${fmt(S.best.views)}` : '아직 없음'}</div>
          <div class="sec">아이템</div>`;
        const items = h('div', { class: 'items' });
        const useBtn = (id, label, can, fn) => items.appendChild(UI.btn(`${label} <span class="cnt">x${S.items[id] || 0}</span>`, () => { fn(); m.refresh(); }, { disabled: !(S.items[id] > 0) || !can }));
        useBtn('energy', '에너지드링크 마시기', S.hp < 100, () => { S.items.energy--; S.hp = clamp(S.hp + 30, 0, 100); Snd.play('good'); UI.toast('체력 +30'); });
        useBtn('medicine', '비상약 먹기', S.status.sick > 0, () => { S.items.medicine--; S.status.sick = 0; Snd.play('good'); UI.toast('배탈이 나았다!'); });
        b.appendChild(items);
        const row = h('div', { class: 'items' });
        row.appendChild(UI.btn(Snd.muted ? '소리 켜기' : '소리 끄기', () => { Snd.toggle(); m.refresh(); }, { cls: 'ghost' }));
        row.appendChild(UI.btn('게임 방법', async () => { await showHelp(); }, { cls: 'ghost' }));
        row.appendChild(UI.btn('저장하고 타이틀로', () => close('title'), { cls: 'ghost' }));
        row.appendChild(UI.btn('닫기', () => close(null)));
        b.appendChild(row);
      },
    }).then(async r => {
      if (r === 'title') { save(); await wipe(() => setScene(TitleScene)); }
    });
  } finally { CityScene.busy = false; }
}

// ---------- 도착 ----------
async function arrivalFlow(to, first, f) {
  CityScene.busy = true;
  await new Promise(r => setTimeout(r, 900));
  if (first) await UI.say(`${to.name}에 도착했다! 현지 시각 ${clockStr()}.\n${to.hello} ${to.lmName}, ${to.food.name}, ${to.act.short}... 찍을 게 산더미다!`, { title: `${to.country} 도착` });
  else UI.toast(`${to.name} 재방문 · ${clockStr()}`);
  if (f.hours >= 10 && f.kind !== 'biz') { await UI.say('장거리 비행으로 시차 적응이 안 된다... 머리가 멍하다.', { title: '시차증' }); gain({ mood: -8 }); }
  const vm = S.missions.find(m => m.city === to.id && m.kind === 'visit');
  if (vm) { S.missions = S.missions.filter(x => x !== vm); Snd.play('fanfare'); gain({ subs: Math.max(30, Math.floor(S.subs * 0.03)), mood: 10 }); await UI.say(`시청자 미션 "${vm.text}" 달성!\n요청한 시청자들이 기뻐한다.`, { title: '★ 미션 달성' }); }
  if (S.weather === 'rain') UI.toast('비가 내리고 있다');
  if (chance(first ? 0.45 : 0.3)) await cityEvent(to);
  save();
}
async function flightBizClip() {
  await UI.say('비즈니스석 풀플랫 시트! 기내식도 코스 요리다. 리뷰 영상 각이다!', { title: '비즈니스석' });
  const clip = makeClip('flight', '비즈니스석 탑승기', rand(62, 85), 'flight:biz');
  await addClip(clip, true);
  UI.toast('클립 저장: 비즈니스석 탑승기');
}

// ---------- 행동 후 처리 ----------
async function afterAction() {
  if (!S) return;
  if (S.hp <= 0) await evCollapse();
  await checkMilestones();
  if (S && S.day > DAY_LIMIT) await ending();
}
async function evCollapse() {
  shake(5); Snd.play('bad');
  const bill = Math.min(S.money, priceOf(150000));
  await UI.say(`눈앞이 핑 돈다... 무리하다가 쓰러지고 말았다!\n병원 신세를 졌다. (진료비 ${won(bill)})`, { title: '쓰러짐' });
  await wipe(() => { S.money -= bill; S.day++; S.hour = 10; onNewDay(); S.hp = 60; S.mood = clamp(S.mood - 15, 0, 100); CityScene.px = SPOTS[1].x; });
}
const MILESTONES = [
  { n: 1000, run: async () => { S.monetized = true; Snd.play('fanfare'); await UI.say('구독자 1,000명 달성! 유튜브 파트너 프로그램 승인!\n이제부터 조회수만큼 광고 수익이 들어온다!', { title: '수익 창출 승인' }); } },
  { n: 10000, run: async () => { Snd.play('fanfare'); await UI.say('구독자 1만 명! 팬들이 생기고 협찬 문의 메일이 오기 시작했다.', { title: '1만 구독자' }); } },
  { n: 100000, run: async () => { await buttonCeremony('silver'); S.unlocked.antarctica = 1; S.flags.antarcticaFree = true; await UI.say('방송국에서 연락이 왔다!\n"남극 세종과학기지 특집, 함께 하실래요? 항공권은 저희가!"\n세계지도에 남극이 열렸다!', { title: '특급 섭외' }); } },
  { n: 500000, run: async () => { Snd.play('fanfare'); gain({ money: 5000000 }); await UI.say('구독자 50만! 대기업 광고 섭외가 들어왔다. 광고비 ₩5,000,000!', { title: '대형 광고' }); } },
  { n: 1000000, run: async () => { await buttonCeremony('gold'); const i = await UI.ask({ title: '골드 버튼!', text: '목표 달성! 이대로 은퇴해서 레전드로 남을까, 남은 날까지 계속 여행할까?', choices: ['계속 여행한다 (다이아 버튼 도전)', '여기서 엔딩 보기'] }); if (i === 1) await ending(); } },
  { n: 10000000, run: async () => { await buttonCeremony('diamond'); } },
];
async function checkMilestones() {
  for (const m of MILESTONES) { if (!S) return; if (S.subs >= m.n && !S.milestones[m.n]) { S.milestones[m.n] = 1; await m.run(); } }
}
async function buttonCeremony(metal) {
  const name = { silver: '실버 버튼', gold: '골드 버튼', diamond: '다이아 버튼' }[metal], n = { silver: '10만', gold: '100만', diamond: '1000만' }[metal];
  const c = makeCanvas(120, 80);
  rect(c.g, 0, 0, 120, 80, '#1b1530');
  for (let i = 0; i < 40; i++) px(c.g, rand(0, 120), rand(0, 80), pick(['#ffd23f', '#ffffff', '#ff5ec4']));
  drawPlayButton(c.g, 60, 40, 2, metal);
  Snd.play('fanfare'); FX.flash = 0.6;
  await UI.panel({
    title: `${name} 도착!`, closable: false, cls: 'ceremony',
    build(b, close) {
      b.innerHTML = `<img class="trophy" alt="${name}" src="${c.toDataURL()}"><p>구독자 ${n}명 달성을 축하합니다!<br>『${esc(S.channel)}』 앞으로 온 소포를 뜯었다... 반짝반짝 ${name}!</p>`;
      const btn = UI.btn('언박싱 영상도 찍자!', () => close(true)); b.appendChild(btn);
    },
  });
  await eventClip(`${name} 언박싱`, 88, 'unbox');
}

// ---------- 엔딩 ----------
function rankFor(subs) {
  if (subs >= 1e7) return { t: '전설의 다이아 버튼', d: '세계 여행 유튜브의 역사가 되었다.', metal: 'diamond' };
  if (subs >= 1e6) return { t: '골드 버튼 크리에이터', d: '80일 만에 100만 유튜버! 꿈을 이뤘다.', metal: 'gold' };
  if (subs >= 1e5) return { t: '실버 버튼 여행러', d: '10만 구독자와 함께한 멋진 여행이었다.', metal: 'silver' };
  if (subs >= 1e4) return { t: '떠오르는 유망주', d: '다음 시즌이 기대되는 채널.', metal: null };
  if (subs >= 1e3) return { t: '수익창출 성공', d: '첫걸음은 뗐다. 여행은 계속된다.', metal: null };
  return { t: '추억은 남았다', d: '구독자는 적어도, 세상은 넓었다.', metal: null };
}
async function ending() {
  if (S.flags.ended) return;
  S.flags.ended = 1;
  clearSave();
  const r = rankFor(S.subs);
  let c = null;
  if (r.metal) { c = makeCanvas(120, 80); rect(c.g, 0, 0, 120, 80, '#1b1530'); drawPlayButton(c.g, 60, 40, 2, r.metal); }
  Snd.play('fanfare');
  await UI.panel({
    title: '여행 종료', closable: false, cls: 'wide ending',
    build(b, close) {
      const cities = Object.keys(S.visited).length;
      b.innerHTML = `${c ? `<img class="trophy" alt="" src="${c.toDataURL()}">` : ''}
        <div class="rank">${esc(r.t)}</div><p class="rd">${esc(r.d)}</p>
        <div class="grid2">
          <div class="card"><div class="k">최종 구독자</div><div class="v">${fmt(S.subs)}명</div></div>
          <div class="card"><div class="k">총 조회수</div><div class="v">${fmt(S.totalViews)}</div></div>
          <div class="card"><div class="k">업로드 영상</div><div class="v">${S.videos.length}편</div></div>
          <div class="card"><div class="k">방문 도시</div><div class="v">${cities} / ${CITIES.length}</div></div>
          <div class="card"><div class="k">비행 거리</div><div class="v">${fmt(S.km)}km</div></div>
          <div class="card"><div class="k">광고 수익</div><div class="v">${won(S.revenue)}</div></div></div>
        <div class="sec">최고 인기 영상</div><div class="row">${S.best ? `${esc(S.best.title)} · 조회수 ${fmt(S.best.views)}` : '없음'}</div>`;
      b.appendChild(UI.btn('처음부터 다시 여행하기', () => close(true)));
    },
  });
  S = null;
  await wipe(() => setScene(TitleScene));
}
