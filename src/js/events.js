'use strict';
// =====================================================================
//  events.js — 길거리/도시/기내/업로드/아침 랜덤 이벤트
// =====================================================================
const say = (title, text) => UI.say(text, { title });
const ask = (title, text, choices, cancel) => UI.ask({ title, text, choices, cancel });
function seenW(id, w) { const n = (S.flags.seen && S.flags.seen[id]) || 0; return w / (1 + n * 1.5); }
async function runFrom(pool, arg) {
  const list = pool.filter(e => !e.cond || e.cond(arg)).map(e => ({ ...e, w: seenW(e.id, e.w || 1) }));
  if (!list.length) return null;
  const e = weighted(list);
  S.flags.seen[e.id] = (S.flags.seen[e.id] || 0) + 1;
  return e.run(arg);
}
async function npcEvent(npc) {
  npc.ev = false;
  passTime(0.5);
  if (chance(0.3) && CITY_EVENTS[S.city]) await runFrom(CITY_EVENTS[S.city]);
  else await runFrom(STREET);
}
async function maybeStreetEvent(p) { if (chance(p)) await runFrom(STREET); }
async function cityEvent(c) { const pool = CITY_EVENTS[c.id]; if (pool && chance(0.75)) await runFrom(pool); else await runFrom(STREET); }
async function flightEvent(f) { return runFrom(FLIGHT, f); }
async function maybeUploadEvent() { if (chance(0.38)) await runFrom(UPLOAD); }
async function morningEvent() {
  if (S.flags.coin && S.day >= S.flags.coin) { S.flags.coin = 0; await coinScandal(); return; }
  if (chance(0.3)) await runFrom(MORNING);
}
const animalName = a => ({ cat: '길고양이', dog: '멍멍이', pigeon: '비둘기 떼', cow: '소 한 마리', camel: '아기 낙타', kangaroo: '캥거루', penguin: '아기 펭귄', giraffe: '기린' }[a] || '길고양이');

// ---------- 길거리 ----------
const STREET = [
  {
    id: 'fan', w: 3, cond: () => S.subs >= 800, run: async () => {
      const i = await ask('팬 발견!', `"헉... 혹시 ${S.channel} 님 아니세요?! ${cityNow().name}까지 오셨네요! 영상 다 봤어요!!"`, ['같이 사진 찍기', '바빠서 모른 척하기']);
      if (i === 0) { gain({ mood: 12, subs: Math.max(10, Math.floor(S.subs * 0.005)) }); await say('팬 서비스', '팬이 SNS에 인증샷을 올려 줬다! 덕분에 구독자가 조금 늘었다.'); }
      else if (chance(0.35)) { gain({ subs: -(Math.floor(S.subs * 0.01) + 3), mood: -8 }); await say('팬 무시 논란', '"실물은 완전 별로네..." 서운한 팬이 커뮤니티에 글을 올렸다.'); }
      else await say('', '다행히 별일 없이 지나갔다... 왠지 마음이 찜찜하다.');
    },
  },
  {
    id: 'pickpocket', w: 2, run: async () => {
      shake(2);
      const i = await ask('소매치기!', '누군가 가방을 툭 치고 지나갔다... 지갑이 없다!!', ['쫓아간다! (체력 -15)', '포기한다']);
      const loss = Math.min(S.money, Math.max(30000, Math.floor(S.money * 0.08)));
      if (i === 0) {
        gain({ hp: -15 });
        if (chance(0.6)) { await say('추격 성공', '골목 끝까지 쫓아가서 지갑을 되찾았다! 셀카봉에 추격전이 고스란히 찍혔다.'); await eventClip('소매치기 추격전', 76, 'chase'); }
        else { gain({ money: -loss, mood: -12 }); await say('추격 실패', '놓쳤다... 헉헉. 돈도 잃고 체력도 잃었다.'); }
      } else { gain({ money: -loss, mood: -8 }); await say('', '경찰서에 신고만 하고 돌아왔다...'); }
    },
  },
  {
    id: 'busker', w: 2, run: async () => {
      const i = await ask('버스킹', '거리의 악사가 같이 노래하자며 마이크를 건넨다!', ['같이 부른다', '팁만 주고 간다 (₩5,000)']);
      if (i === 0) {
        if (chance(0.5)) { gain({ mood: 12 }); await say('떼창', '관객들이 떼창을 해 줬다! 소름 돋는 순간이 찍혔다.'); await eventClip('길거리 즉석 떼창', 76, 'busk'); }
        else { gain({ mood: -3 }); await say('음이탈', '음이탈이 났다... 그런데 관객들이 빵 터졌다. 이것도 나름 웃긴 장면!'); await eventClip('음이탈 버스킹', 60, 'busk'); }
      } else { gain({ money: -5000, mood: 6 }); await say('', '악사가 엄지를 척 들어 주었다.'); }
    },
  },
  {
    id: 'animal', w: 2, run: async () => {
      const nm = animalName(cityNow().animal);
      const i = await ask('귀여움 주의', `${nm}가 졸졸 따라온다...!`, ['카메라를 켠다', '간식을 사 준다 (₩3,000)']);
      if (i === 0) await eventClip(`${cityNow().name}의 ${nm}`, 70, 'animal');
      else { gain({ money: -3000, mood: 15 }); await say('', '행복해졌다.'); }
    },
  },
  {
    id: 'collab', w: 2, cond: () => S.subs >= 300, run: async () => {
      const nm = pick(['빵빵여행', '지구한바퀴', '여행하는 감자', '배낭맨', 'Wander_K', '세계먹방왕', '혼행일기']);
      const theirs = Math.max(2000, Math.floor(S.subs * rand(0.6, 3)));
      const i = await ask('합방 제안', `구독자 ${kNum(theirs)}명의 여행 유튜버 '${nm}'를 만났다!\n"우리 같이 찍을래요?"`, ['합방한다 (2시간, 체력 -10)', '정중히 거절']);
      if (i !== 0 || !(await checkTime(2))) return;
      passTime(2); S.collabs++;
      gain({ hp: -10, mood: 10, subs: Math.floor(theirs * rand(0.02, 0.06)) });
      await say('합방 성공', `'${nm}' 채널에 출연했다! 그쪽 구독자들이 놀러 왔다.`);
      await eventClip(`${nm}와 합방`, 74, 'collab');
    },
  },
  {
    id: 'local', w: 2, run: async () => {
      const i = await ask('현지인의 추천', '"관광객은 절대 모르는 진짜 맛집 알려줄까?" 현지 할머니가 골목을 가리킨다.', ['따라간다 (1시간, ₩8,000)', '괜찮아요']);
      if (i !== 0 || !(await checkTime(1))) return;
      passTime(1); gain({ money: -8000, hp: 10, mood: 10 });
      await say('숨은 맛집', '간판도 없는 가게였는데... 인생 최고의 한 끼였다!');
      await eventClip(`${cityNow().name} 숨은 맛집`, 78, 'hidden');
    },
  },
  {
    id: 'scam', w: 2, run: async () => {
      const i = await ask('팔찌 강매', '"프렌드! 선물이야!" 손목에 팔찌를 채우더니 돈을 내라고 한다.', ['돈을 준다 (₩20,000)', '단호하게 거절', '카메라를 들이댄다']);
      if (i === 0) { gain({ money: -20000, mood: -6 }); await say('', '비싼 팔찌가 생겼다...'); }
      else if (i === 1) { if (chance(0.6)) { gain({ mood: 3 }); await say('', '팔찌를 돌려주고 쿨하게 자리를 떴다.'); } else { gain({ mood: -10, hp: -5 }); await say('', '한참 실랑이를 벌였다... 지친다.'); } }
      else if (chance(0.55)) { await say('참교육', '카메라를 보자 혼비백산 도망갔다! 통쾌한 장면이 찍혔다.'); await eventClip('강매 퇴치 현장', 77, 'scam'); }
      else { gain({ money: -Math.min(S.money, 30000), mood: -10 }); await say('', '일행이 몰려와 위협했다... 돈을 주고 겨우 빠져나왔다.'); }
    },
  },
  {
    id: 'wallet', w: 1.5, run: async () => {
      const i = await ask('지갑 습득', '길바닥에 두툼한 지갑이 떨어져 있다.', ['경찰서에 맡긴다 (1시간)', '주인을 직접 찾아 준다 (2시간)', '못 본 척한다']);
      if (i === 0) { passTime(1); gain({ mood: 8 }); if (chance(0.4)) { const rw = priceOf(50000); gain({ money: rw }); await say('사례금', `주인에게서 사례금 ${won(rw)}을 받았다! 착한 일은 돌아온다.`); } else await say('', '경찰관이 고맙다며 엄지를 들어 주었다.'); }
      else if (i === 1) { if (!(await checkTime(2))) return; passTime(2); gain({ hp: -8, mood: 15 }); await say('감동', '신분증 주소를 따라가 주인을 찾았다! 주인 할아버지가 눈물을 글썽였다.'); await eventClip('지갑 주인 찾아주기', 80, 'wallet'); }
      else await say('', '...마음이 불편하다.');
    },
  },
  {
    id: 'flashmob', w: 1.5, run: async () => {
      const i = await ask('플래시몹!', '광장에서 갑자기 음악이 터지더니 사람들이 일제히 춤추기 시작했다!', ['같이 춘다!', '촬영만 한다']);
      if (i === 0) {
        const c = cityNow();
        const sc = await runMini('rhythm', { city: { ...c, act: { ...c.act, name: '플래시몹 난입', short: '플래시몹', fx: 'stage', verb: '모르는 춤이지만 일단 따라 춘다!' } } });
        passTime(1); gain({ hp: -10, mood: 10 });
        const clip = makeClip('event', '플래시몹 난입', sc + 10, null, { tag: 'flash' }); clip.nov = 1.3;
        await addClip(clip);
      } else await eventClip('광장 플래시몹', 62, 'flash');
    },
  },
  {
    id: 'weirdfood', w: 1.5, run: async () => {
      const i = await ask('정체불명 꼬치', '노점 아저씨가 정체를 알 수 없는 꼬치를 내민다. "Very good! Very healthy!"', ['눈 딱 감고 먹는다', '정중히 사양']);
      if (i !== 0) return;
      if (chance(0.4)) { S.status.sick = 2; gain({ hp: -15 }); await say('배탈', '...배에서 천둥소리가 난다. 배탈이다! 하지만 리액션은 레전드였다.'); await eventClip('공포의 길거리 꼬치', 80, 'weird'); }
      else { gain({ hp: 8, mood: 8 }); await say('', '어? 생각보다 엄청 맛있다! 아저씨가 뿌듯해한다.'); await eventClip('정체불명 꼬치 도전', 70, 'weird'); }
    },
  },
  {
    id: 'celeb', w: 1, run: async () => {
      const i = await ask('어? 저 사람은...', '선글라스를 쓴 사람... 월드투어 중인 K-POP 아이돌 "J"다!!', ['몰래 촬영한다', '사인만 부탁한다', '모른 척 지나간다']);
      if (i === 0) {
        if (chance(0.5)) { S.viralBonus = 0.15; await say('목격담', '흐릿하게 찍혔지만 팬들이 난리 났다! 다음 영상 떡상 확률 UP!'); await eventClip('월드스타 목격담', 72, 'celeb'); }
        else { gain({ subs: -(Math.floor(S.subs * 0.03) + 5), mood: -15 }); await say('논란', '경호원에게 걸렸다... "사생활 침해 유튜버" 기사까지 났다.'); }
      } else if (i === 1) { gain({ mood: 20 }); await say('성덕', '"영상 잘 보고 있어요!" ...진짜?! 사인을 받았다!!'); }
      else gain({ mood: 2 });
    },
  },
  {
    id: 'nocam', w: 1.2, run: async () => {
      const i = await ask('촬영 금지 구역', '경비원: "No camera here!"\n하필 제일 멋진 장면인데...', ['사과하고 카메라를 끈다', '몰래 찍는다']);
      if (i !== 1) { gain({ mood: 2 }); return; }
      if (chance(0.35)) { const fine = priceOf(100000); gain({ money: -Math.min(S.money, fine), mood: -10 }); await say('벌금', `걸렸다! 벌금 ${won(fine)}...`); }
      else await eventClip('촬영 금지 구역 잠입', 74, 'sneak');
    },
  },
  {
    id: 'kid', w: 1.2, run: async () => {
      const i = await ask('꼬마 유튜버', '꼬마가 셀카봉을 신기하게 쳐다본다. "나도 유튜버 될 거야!"', ['카메라를 쥐여 주고 촬영법 알려주기', '사진만 같이 찍기']);
      if (i === 0) { gain({ mood: 15 }); await eventClip('꼬마 PD의 첫 촬영', 75, 'kid'); } else gain({ mood: 6 });
    },
  },
  {
    id: 'battery', w: 1.2, run: async () => {
      if (S.items.battery > 0) { S.items.battery--; await say('배터리', '카메라 배터리가 다 됐다! ...보조배터리 덕분에 살았다. (보조배터리 1개 사용)'); return; }
      const lost = S.clips.length ? pick(S.clips) : null;
      if (lost && chance(0.5)) { S.clips = S.clips.filter(x => x !== lost); gain({ mood: -12 }); await say('배터리 방전', `배터리가 갑자기 꺼지면서... "${lost.label}" 파일이 깨졌다!! (상점의 보조배터리가 있었다면...)`); }
      else { passTime(1); gain({ mood: -6 }); await say('배터리 방전', '카메라 배터리가 다 됐다. 충전하느라 1시간을 날렸다.'); }
    },
  },
  {
    id: 'shower', w: 1.2, cond: () => S.weather !== 'rain' && S.weather !== 'snow' && cityNow().id !== 'cairo', run: async () => {
      S.weather = 'rain';
      if (S.items.umbrella > 0) { await say('소나기', '갑자기 소나기! ...우산이 있어서 다행이다. 빗속의 거리가 운치 있다.'); await eventClip('빗속의 거리 산책', 68, 'rain'); }
      else if (chance(0.5)) { const repair = Math.min(S.money, 80000); gain({ money: -repair, mood: -10 }); await say('소나기', `갑자기 쏟아진 비에 카메라가 젖었다! 수리비 ${won(repair)}... (상점에서 우산을 사 두자)`); }
      else { gain({ hp: -8, mood: -6 }); await say('소나기', '쫄딱 젖었다... 감기 걸리겠다.'); }
    },
  },
  {
    id: 'fortune', w: 1, run: async () => {
      const i = await ask('점술가', '"당신의 미래가 보여... 단돈 만 원!"', ['점을 본다 (₩10,000)', '지나간다']);
      if (i !== 0) return;
      gain({ money: -10000 });
      if (chance(0.6)) { S.buff = 1.3; S.buffDays = 2; await say('대길', '"곧 큰 행운이 찾아온다!" 왠지 자신감이 넘친다. (2일간 조회수 +30%)'); }
      else { gain({ mood: -8 }); await say('흉', '"...물을 조심하게." 찝찝하다.'); }
    },
  },
  {
    id: 'tvinterview', w: 1, cond: () => S.subs >= 20000, run: async () => {
      await say('현지 방송 인터뷰', '현지 방송국 리포터가 마이크를 들이민다! "한국에서 온 유명 유튜버라면서요?"');
      passTime(1); gain({ subs: Math.floor(S.subs * rand(0.03, 0.06)), mood: 12 });
      await say('', '현지 저녁 뉴스에 나왔다! 해외 구독자가 늘었다.');
    },
  },
  {
    id: 'poop', w: 1.5, cond: () => cityNow().animal === 'pigeon', run: async () => {
      shake(2);
      await say('봉변', '머리 위에 뭔가 철퍼덕... 비둘기 똥이다!!');
      const i = await ask('', '현지인: "그거 행운의 징조야!"', ['긍정적으로 생각한다', '울면서 머리를 감으러 간다']);
      if (i === 0) { S.viralBonus = 0.1; gain({ mood: 5 }); await eventClip('비둘기 똥 맞은 날', 64, 'poop'); }
      else { passTime(1); gain({ mood: -5 }); }
    },
  },
  {
    id: 'koreans', w: 1.5, cond: () => cityNow().id !== 'seoul', run: async () => {
      const i = await ask('한국인 관광객', '"어! 한국분이세요? 사진 좀 찍어 주실래요?"', ['찍어 준다', '여행 꿀팁도 알려준다']);
      gain({ mood: 6 });
      if (i === 1) { await say('', '꿀팁을 알려줬더니 "채널 구독할게요!" 라고 한다.'); gain({ subs: randi(3, 12) }); }
    },
  },
  {
    id: 'lost', w: 1, run: async () => {
      await say('길을 잃었다', '지도 앱이 먹통이다... 골목을 헤매다 1시간이 지났다.');
      passTime(1);
      if (chance(0.5)) { await say('뜻밖의 발견', '헤매다 보니 관광객이 하나도 없는 멋진 전망대를 발견했다!'); await eventClip(`${cityNow().name} 비밀 전망대`, 76, 'view'); }
      else gain({ mood: -6, hp: -5 });
    },
  },
];

// ---------- 도시별 ----------
const CITY_EVENTS = {
  seoul: [
    {
      id: 'mom', w: 2, cond: () => !S.flags.momCall, run: async () => {
        S.flags.momCall = 1;
        const i = await ask('엄마의 전화', '"밥은 먹고 다니니? 유튜브 그거... 돈은 되는 거니?"', ['잘 지낸다고 안심시킨다', '사실 좀 힘들어...']);
        if (i === 0) gain({ mood: 12 });
        else { gain({ money: 200000, mood: 5 }); await say('', '엄마가 ₩200,000을 보내 주셨다... 눈물이 핑 돈다.'); }
      },
    },
    { id: 'cvs', w: 2, run: async () => { const i = await ask('편의점 신상', '편의점에 신상 디저트가 나왔다! 리뷰 각이다.', ['사서 리뷰한다 (₩4,000)', '지나간다']); if (i === 0) { gain({ money: -4000, hp: 5 }); await eventClip('편의점 신상 리뷰', 64, 'cvs'); } } },
  ],
  tokyo: [
    {
      id: 'gacha', w: 2, run: async () => {
        const i = await ask('가챠폰', '골목 가득 가챠폰 머신! 한 번에 ₩5,000.', ['돌린다!', '참는다']);
        if (i !== 0) return;
        gain({ money: -5000 });
        const r = Math.random();
        if (r < 0.3) { gain({ mood: 12 }); await say('대박', '시크릿 레어 피규어가 나왔다!!'); await eventClip('가챠 시크릿 레어 획득', 74, 'gacha'); }
        else if (r < 0.7) { S.items.energy = (S.items.energy || 0) + 1; await say('', '에너지드링크 모양 키링...이 아니라 진짜 에너지드링크다? (에너지드링크 +1)'); }
        else { gain({ mood: -3 }); await say('꽝', '이상한 버섯 키링이 나왔다...'); }
      },
    },
    { id: 'quake', w: 1, run: async () => { shake(4); await say('지진!', '휴대폰에서 경보음이 울리더니 땅이 흔들렸다! 다행히 금방 멈췄다.'); gain({ mood: -5 }); await eventClip('생애 첫 지진 체험', 60, 'quake'); } },
  ],
  bangkok: [
    {
      id: 'tuktuk', w: 2, run: async () => {
        const i = await ask('툭툭 기사', '"One dollar! Anywhere!" 툭툭 기사가 손짓한다.', ['탄다 (₩1,500)', '걸어간다']);
        if (i !== 0) return;
        gain({ money: -1500 });
        if (chance(0.5)) { passTime(2); gain({ mood: -10 }); await say('함정', '...보석 가게 세 군데를 돌고 나서야 풀려났다.'); await eventClip('툭툭 쇼핑 함정', 66, 'tuk'); }
        else { await say('질주', '차 사이를 미친 듯이 누비는 레이싱! 심장이 터질 것 같다.'); await eventClip('방콕 툭툭 질주', 74, 'tuk'); }
      },
    },
    { id: 'massage', w: 1.5, run: async () => { const i = await ask('타이 마사지', '길거리 마사지 30분에 ₩10,000!', ['받는다', '지나간다']); if (i === 0) { passTime(0.5); gain({ money: -10000, hp: 25, mood: 8 }); } } },
  ],
  agra: [
    { id: 'cow', w: 2, run: async () => { const i = await ask('통행 금지', '소 한 마리가 길 한가운데서 낮잠을 자고 있다. 아무도 비키라고 하지 않는다.', ['같이 셀카', '비켜 줄 때까지 기다린다 (1시간)']); if (i === 0) await eventClip('소님과 셀카', 66, 'cow'); else { passTime(1); gain({ mood: 4 }); } } },
    { id: 'holi', w: 1.5, run: async () => { shake(2); await say('색가루 공격!', '아이들이 깔깔거리며 색가루를 던졌다! 온몸이 무지개색이 됐다.'); gain({ mood: 10 }); await eventClip('무지개 인간 탄생', 72, 'holi'); } },
  ],
  cairo: [
    { id: 'camel', w: 2, run: async () => { const i = await ask('낙타 상인', '"Free photo, my friend! 공짜야 공짜!"', ['낙타랑 사진 찍기', '거절']); if (i !== 0) return; const fee = priceOf(50000); gain({ money: -Math.min(S.money, fee), mood: -6 }); await say('역시...', `사진을 찍고 내려오려니 "내려오는 건 유료야!" ${won(fee)}을 냈다.`); await eventClip('공짜 낙타의 진실', 70, 'camel'); } },
    { id: 'sunset', w: 1.5, cond: () => S.hour >= 15 && S.hour < 19, run: async () => { await say('황금빛 피라미드', '피라미드 너머로 해가 진다. 숨이 멎을 것 같다.'); await eventClip('피라미드 선셋', 82, 'sunset'); } },
  ],
  nairobi: [
    { id: 'maasai', w: 2, run: async () => { const i = await ask('점프 대결', '마사이족 청년이 높이뛰기 대결을 신청했다!', ['도전한다! (체력 -10)', '구경만 한다']); if (i !== 0) return; gain({ hp: -10 }); if (chance(0.3)) { gain({ mood: 15, subs: randi(20, 80) }); await say('승리?!', '기적적으로 이겼다!! 마을 사람들이 환호한다.'); await eventClip('마사이 점프 대결 승리', 80, 'jump'); } else { await say('완패', '상대가 내 키만큼 뛰었다... 웃음이 터졌다.'); await eventClip('마사이 점프 대결', 70, 'jump'); } } },
    { id: 'giraffe', w: 1.5, run: async () => { await say('기린 센터', '기린이 긴 목을 쭉 빼서 얼굴을 들이밀었다! 혀가 엄청 길다.'); gain({ mood: 12 }); await eventClip('기린이랑 뽀뽀', 76, 'giraffe'); } },
  ],
  rome: [
    { id: 'gladiator', w: 2, run: async () => { const i = await ask('검투사 아저씨', '검투사 분장을 한 아저씨가 칼을 들고 포즈를 취해 준다.', ['같이 찍는다', '피한다']); if (i !== 0) return; const fee = priceOf(30000); gain({ money: -Math.min(S.money, fee) }); await say('', `찍자마자 "${won(fee)}!" ...로마의 검투사는 무섭다.`); await eventClip('검투사와 한 판', 64, 'glad'); } },
    { id: 'trevi', w: 1.5, run: async () => { const i = await ask('트레비 분수', '뒤돌아서 동전을 던지면 로마에 다시 온다는 전설이 있다.', ['동전 던지기 (₩1,000)', '지나간다']); if (i !== 0) return; gain({ money: -1000, mood: 10 }); S.buff = 1.2; S.buffDays = 2; await say('행운', '동전이 퐁당! 왠지 운이 좋아질 것 같다. (2일간 조회수 +20%)'); } },
  ],
  paris: [
    { id: 'syndrome', w: 1.5, run: async () => { await say('파리 증후군', '생각했던 낭만과 조금 다르다... 지하철 냄새, 줄 서기, 소매치기 경고문.'); const i = await ask('', '그래도...', ['갓 구운 바게트로 기분 전환', '솔직한 후기 영상을 찍는다']); if (i === 0) gain({ mood: 6, money: -3000 }); else await eventClip('파리 솔직 후기', 70, 'honest'); } },
    { id: 'painter', w: 1.5, run: async () => { const i = await ask('몽마르트 화가', '"초상화 그려 줄게요. 30분이면 돼요."', ['그려 달라고 한다 (₩30,000)', '사양한다']); if (i !== 0) return; gain({ money: -30000, mood: 10 }); passTime(0.5); await eventClip('몽마르트 초상화', 72, 'paint'); } },
  ],
  reykjavik: [
    { id: 'lagoon', w: 2, run: async () => { const i = await ask('블루 라군', '하늘색 온천에서 김이 모락모락 피어오른다.', ['몸 담그기 (₩60,000)', '지나간다']); if (i !== 0 || S.money < 60000) return; passTime(2); gain({ money: -60000, hp: 40, mood: 15 }); await eventClip('블루라군 온천', 72, 'lagoon'); } },
    { id: 'forecast', w: 1.5, run: async () => { await say('오로라 예보', '현지 앱 알림: "오늘 밤 오로라 지수 7! 대폭발 예상!"\n밤에 체험 부스에서 오로라 헌팅을 해 보자.'); gain({ mood: 8 }); } },
  ],
  newyork: [
    { id: 'pizzarat', w: 2, run: async () => { await say('피자 쥐!', '지하철 계단에서 쥐 한 마리가 피자 한 조각을 끌고 내려간다!!'); S.viralBonus = 0.2; await eventClip('뉴욕 피자 쥐 목격', 82, 'rat'); } },
    { id: 'billboard', w: 3, cond: () => S.subs >= 500000, run: async () => { FX.flash = 0.5; await say('타임스스퀘어', '...저 전광판에 나오는 거, 내 채널 광고잖아?!'); gain({ mood: 30, subs: Math.floor(S.subs * 0.02) }); await eventClip('타임스스퀘어 전광판 인증', 88, 'board'); } },
    { id: 'lottery', w: 1.5, run: async () => { const i = await ask('브로드웨이 로터리', '뮤지컬 할인 티켓 추첨에 응모할까?', ['응모한다', '지나간다']); if (i !== 0) return; if (chance(0.3)) { gain({ money: -priceOf(30000), mood: 20 }); passTime(3); await say('당첨!', '맨 앞자리에서 뮤지컬을 봤다! 평생 잊지 못할 밤.'); } else await say('', '꽝...'); } },
  ],
  mexico: [
    { id: 'mariachi', w: 2, run: async () => { const i = await ask('마리아치', '마리아치 밴드가 다가와 세레나데를 부르기 시작했다!', ['팁을 준다 (₩10,000)', '같이 노래한다']); if (i === 0) { gain({ money: -10000, mood: 10 }); await eventClip('마리아치 세레나데', 72, 'mariachi'); } else { gain({ mood: 6 }); await eventClip('마리아치 즉석 합창', 66, 'mariachi'); } } },
    { id: 'mask', w: 1.5, run: async () => { await say('선물', '루차도르 꼬마가 자기 가면을 선물해 줬다! "너도 이제 루차도르야!"'); gain({ mood: 15 }); } },
  ],
  rio: [
    { id: 'soccer', w: 2, run: async () => { const i = await ask('골목 축구', '아이들이 같이 공을 차자고 한다!', ['같이 한다 (체력 -10)', '구경만 한다']); if (i !== 0) return; gain({ hp: -10, mood: 10 }); if (chance(0.4)) await say('골!!!', '기적의 오버헤드킥!! 아이들이 "GOOOOL!"을 외친다.'); else await say('', '아이들에게 공 한 번 못 뺏었다...'); await eventClip('리우 골목 축구', 74, 'soccer'); } },
    { id: 'beach', w: 1.5, run: async () => { await say('코파카바나', '물결무늬 보도 너머로 노을이 진다.'); await eventClip('코파카바나 해변 노을', 74, 'beach'); } },
  ],
  sydney: [
    { id: 'boxing', w: 2, run: async () => { shake(2); const i = await ask('캥거루 복싱', '캥거루가 앞발을 들고 복싱 자세를 취한다...?!', ['맞서 싸운다', '도망간다']); if (i === 0) { gain({ hp: -15 }); await say('KO', '...졌다. 캥거루의 원투 펀치는 진짜였다.'); await eventClip('캥거루에게 KO 당함', 82, 'kanga'); } else await eventClip('캥거루에게 쫓기는 영상', 70, 'kanga'); } },
    { id: 'seagull', w: 1.5, run: async () => { await say('강도', '갈매기가 내 감자튀김을 통째로 낚아채 갔다!!'); gain({ mood: -5 }); await eventClip('갈매기 강도 사건', 66, 'gull'); } },
  ],
  antarctica: [
    { id: 'peck', w: 2, run: async () => { await say('호기심 대장', '아기 펭귄이 카메라 렌즈를 콕콕 쪼아 본다!'); gain({ mood: 20 }); await eventClip('펭귄의 카메라 습격', 86, 'peck'); } },
    { id: 'blizzard', w: 1.5, run: async () => { shake(3); await say('블리자드', '눈보라가 몰아쳐 기지 안에 4시간 동안 갇혔다. 대원들과 라면을 끓여 먹었다.'); passTime(4); gain({ mood: 6 }); await eventClip('남극 기지 생활기', 80, 'base'); } },
  ],
};

// ---------- 기내 ----------
const FLIGHT = [
  { id: 'turb', w: 2, run: async () => { shake(4); const i = await ask('난기류!', '기체가 크게 흔들린다! 옆 사람 팔걸이를 꽉 잡았다.', ['리얼 반응을 찍는다', '눈 감고 기도한다']); if (i === 0) await eventClip('난기류 리얼 반응', 64, 'turb'); else gain({ mood: -5 }); } },
  { id: 'upgrade', w: 1, cond: f => f.kind === 'eco', run: async () => { Snd.play('good'); gain({ hp: 30, mood: 15 }); await say('럭키!', '오버부킹으로 비즈니스석에 무료 업그레이드됐다!!'); await eventClip('공짜 비즈니스 업그레이드', 72, 'upg'); } },
  { id: 'meal', w: 2, cond: f => f.kind !== 'land', run: async () => { const i = await ask('기내식', '"Chicken or beef?"', ['치킨', '비프']); await say('', i === 0 ? '치킨... 생각보다 맛있다!' : '비프가 질기다... 그래도 리뷰 각!'); await addClip(makeClip('flight', '기내식 리뷰', rand(50, 72), 'flight:meal'), true); UI.toast('클립 저장: 기내식 리뷰'); } },
  { id: 'luggage', w: 1, cond: f => f.kind !== 'land', run: async () => { const owned = ITEMS.filter(it => S.items[it.id] > 0); if (owned.length) { const it = pick(owned); S.items[it.id] = 0; await say('수하물 분실', `짐 하나가 다른 나라로 갔다... ${it.name}을(를) 전부 잃어버렸다.`); } else { gain({ money: -Math.min(S.money, 50000) }); await say('수하물 분실', '캐리어가 안 나왔다... 당장 필요한 옷을 새로 샀다.'); } gain({ mood: -10 }); } },
  { id: 'baby', w: 1.5, run: async () => { const i = await ask('우는 아기', '옆자리 아기가 비행 내내 운다...', ['얼굴 개그로 달래 준다', '이어폰을 꽂는다']); if (i === 0) { if (chance(0.6)) { gain({ mood: 8 }); await say('', '아기가 까르르 웃었다! 부모님이 고맙다며 간식을 줬다.'); } else { gain({ hp: -10 }); await say('', '더 크게 운다...'); } } else gain({ hp: -12 }); } },
  { id: 'bigtuber', w: 1, cond: () => S.subs >= 1000, run: async () => { const theirs = Math.max(50000, S.subs * 5); await say('옆자리', `옆자리 승객이... 구독자 ${kNum(theirs)}명의 대형 여행 유튜버다!`); const i = await ask('', '"어? 혹시 유튜버세요? 저도 영상 봤어요!"', ['합방 제안하기', '수줍게 인사만']); if (i === 0) { gain({ subs: Math.floor(theirs * rand(0.005, 0.02)), mood: 15 }); await eventClip('기내 깜짝 합방', 76, 'bigtuber'); } else gain({ mood: 5 }); } },
  { id: 'crew', w: 1, cond: () => S.subs >= 5000, run: async () => { gain({ hp: 10, mood: 10 }); await say('승무원', '"혹시... 구독하고 있어요!" 승무원이 몰래 간식을 더 챙겨 줬다.'); } },
  { id: 'window', w: 1.5, cond: f => f.kind !== 'land', run: async () => { await say('창밖', '창밖으로 구름 바다 위 노을이 펼쳐진다...'); await addClip(makeClip('flight', '구름 위 노을', rand(66, 82), 'flight:window'), true); UI.toast('클립 저장: 구름 위 노을'); } },
  { id: 'bus', w: 2, cond: f => f.kind === 'land', run: async () => { await say('육로 여행', '국경을 넘는 버스에서 현지인들과 과일을 나눠 먹었다.'); gain({ mood: 8 }); await eventClip('국경 넘는 버스 여행', 70, 'bus'); } },
  {
    id: 'divert', w: 0.5, cond: f => f.kind !== 'land' && !f.to.secret, run: async f => {
      const opts = CITIES.filter(c => !c.secret && c.id !== f.to.id && c.id !== MapScene.from.id);
      const d = pick(opts);
      shake(5); Snd.play('bad');
      await say('비상 착륙', `기장: "기체 점검으로 ${d.name}에 비상 착륙합니다."\n...예정에 없던 ${d.name}에 내리게 됐다!`);
      await eventClip('비상 착륙 실화', 78, 'divert');
      return { divert: d };
    },
  },
];

// ---------- 업로드 후 ----------
const UPLOAD = [
  {
    id: 'hate', w: 2, run: async () => {
      const i = await ask('악플', '"이 사람 영상 왜 봄? 노잼ㅋ" 악플이 달렸다.', ['정성스러운 답글을 단다', '무시한다', '저격 영상을 찍는다']);
      if (i === 0) { gain({ mood: 4, subs: randi(5, 30) }); await say('', '"답글 보고 반했어요..." 오히려 팬이 늘었다.'); }
      else if (i === 1) gain({ mood: -5 });
      else if (chance(0.5)) { gain({ subs: Math.floor(S.subs * 0.03) }); await say('사이다', '사이다 대응이라며 화제가 됐다!'); }
      else { gain({ subs: -Math.floor(S.subs * 0.02), mood: -10 }); await say('역풍', '"속 좁다"는 반응이 쏟아졌다...'); }
    },
  },
  {
    id: 'sponsor', w: 2.5, cond: () => S.subs >= 5000, run: async () => {
      const brand = pick(['번쩍 에너지드링크', '여행가방 브랜드 "캐리온"', '번역 앱 "말통"', '여행자보험 "든든"', '보조배터리 "만충"']);
      const amt = Math.round(clamp(S.subs * rand(3, 7), 300000, 30000000) / 10000) * 10000;
      const i = await ask('협찬 제의', `'${brand}'에서 협찬 메일이 왔다!\n광고비 ${won(amt)} · 다음 영상에 광고를 넣어야 한다. (조회수 -10%)`, ['수락한다', '거절한다']);
      if (i === 0) { S.flags.sponsorAd = 1; gain({ money: amt }); await say('계약 완료', '"유료 광고 포함" 표기도 잊지 말자.'); }
    },
  },
  {
    id: 'coin', w: 1, cond: () => S.subs >= 20000 && !S.flags.coinDone, run: async () => {
      S.flags.coinDone = 1;
      const amt = Math.round(Math.max(3000000, S.subs * 10) / 100000) * 100000;
      const i = await ask('수상한 광고', `'떡상코인'이라는 곳에서 광고 제의가 왔다.\n광고비 ${won(amt)}!! ...어딘가 수상하다.`, ['돈은 돈이다. 수락!', '거절한다']);
      if (i === 0) { gain({ money: amt }); if (chance(0.6)) S.flags.coin = S.day + 2; }
      else { gain({ mood: 5 }); await say('', '나중에 뉴스를 보니 거절하길 잘했다...'); }
    },
  },
  { id: 'copyright', w: 1, cond: () => S.monetized, run: async () => { const last = S.videos[S.videos.length - 1]; const lose = Math.min(S.money, Math.floor(last.views * BAL.RPM)); gain({ money: -lose, mood: -10 }); await say('저작권 신고', `배경음악 저작권 신고를 받았다! 방금 영상의 광고 수익 ${won(lose)}이 몰수됐다.`); } },
  {
    id: 'tv', w: 1.5, cond: () => S.subs >= 50000, run: async () => {
      const fee = Math.round(rand(10, 30)) * 100000;
      const i = await ask('방송 섭외', `예능 '여행에 미치다'에서 출연 섭외가 왔다!\n출연료 ${won(fee)} · 하루가 지나간다.`, ['출연한다', '여행에 집중한다']);
      if (i !== 0) return;
      await wipe(() => { S.day++; onNewDay(); });
      gain({ money: fee, subs: Math.floor(S.subs * rand(0.03, 0.06)), mood: 10 });
      await say('방송 출연', '방송 출연 후 채널 검색량이 폭발했다!');
    },
  },
  { id: 'fanart', w: 1.5, cond: () => S.subs >= 2000, run: async () => { gain({ mood: 15 }); await say('팬아트', `구독자가 『${S.channel}』 캐릭터 팬아트를 보내 줬다! 감동...`); } },
  { id: 'reverse', w: 1.2, cond: () => S.videos.length >= 3, run: async () => { const v = pick(S.videos.slice(0, -1)); const extra = Math.floor(v.views * rand(1, 3)); v.views += extra; S.totalViews += extra; const rev = S.monetized ? Math.floor(extra * BAL.RPM) : 0; S.revenue += rev; gain({ subs: Math.floor(extra * 0.02), money: rev }); await say('역주행', `예전 영상 "${v.title}"이(가) 갑자기 역주행 중! 조회수 +${fmt(extra)}`); } },
  {
    id: 'copycat', w: 1, cond: () => S.subs >= 10000, run: async () => {
      const i = await ask('표절 의혹', '내 영상 구성을 그대로 베낀 채널을 발견했다.', ['공개적으로 저격한다', '조용히 신고만 한다']);
      if (i === 0) { if (chance(0.6)) { gain({ subs: Math.floor(S.subs * 0.04), mood: 8 }); await say('승리', '구독자들이 내 편을 들어 줬다!'); } else { gain({ subs: -Math.floor(S.subs * 0.02), mood: -10 }); await say('진흙탕', '진흙탕 싸움이 됐다...'); } }
      else gain({ mood: 2 });
    },
  },
];

// ---------- 아침 ----------
const MORNING = [
  { id: 'mission', w: 3, cond: () => S.missions.length < 3, run: async () => { const m = newMission(); if (!m) return; S.missions.push(m); await say('★ 시청자 미션', `메일함: "${m.text}"\n미션이 추가되었다!`); } },
  { id: 'smallsponsor', w: 1.5, cond: () => S.subs >= 3000, run: async () => { const amt = Math.round(clamp(S.subs * 15, 100000, 3000000) / 10000) * 10000; gain({ money: amt }); await say('메일함', `소소한 PPL 문의! 제품을 잠깐 보여 주는 조건으로 ${won(amt)}을 받았다.`); } },
  { id: 'homesick', w: 1, run: async () => { const i = await ask('향수병', '아침에 눈을 떴는데 김치찌개가 너무 먹고 싶다...', ['가족과 영상 통화', '참는다']); if (i === 0) gain({ mood: 10 }); else gain({ mood: -8 }); } },
  { id: 'goodsleep', w: 1, run: async () => { gain({ hp: 10, mood: 10 }); await say('개운한 아침', '오랜만에 꿀잠을 잤다! 컨디션 최고!'); } },
];
async function coinScandal() {
  shake(5); Snd.play('bad');
  const loss = Math.floor(S.subs * 0.08);
  gain({ subs: -loss, mood: -25 });
  await say('코인 사기 논란', `'떡상코인'이 먹튀했다는 뉴스가 떴다!\n광고했던 유튜버로 이름이 오르내린다... 구독자 -${fmt(loss)}`);
  const i = await ask('', '어떻게 대처할까?', ['진심 어린 사과 영상 + 광고비 기부', '조용히 넘어간다']);
  if (i === 0) { const give = Math.min(S.money, Math.max(1000000, Math.floor(S.money * 0.3))); gain({ money: -give, subs: Math.floor(loss * 0.6), mood: 10 }); await say('', '진정성 있는 사과에 구독자들이 일부 돌아왔다.'); }
}
