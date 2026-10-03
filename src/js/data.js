'use strict';
// =====================================================================
//  data.js — 도시, 장비, 아이템, 텍스트 데이터
// =====================================================================
const CITIES = [
  {
    id: 'seoul', name: '서울', en: 'SEOUL', country: '대한민국', lat: 37.57, lon: 126.98, price: 1.0,
    sky: ['#4f9fe0', '#c6eaff'], ground: ['#b9b3aa', '#a29c92'], groundStyle: 'tile', road: '#4a4a55',
    style: 'modern', bld: ['#d9d2c5', '#b8c4d6', '#e8c4b0', '#a9b8a0', '#c7b3d6', '#9aa8b8'], accent: '#e8394a', hotel: '#c9a27a', actCol: '#8a3ad9',
    landmark: 'namsan', lmName: 'N서울타워', filler: 'blossom', particle: 'petal', animal: 'cat', vehicles: ['car', 'bus', 'taxi', 'car'],
    food: { name: '떡볶이', base: 'bowl', colors: ['#d9381e', '#f5ecd8', '#f2c46a', '#4a9a3a'], bowl: '#2fa36b', spicy: true },
    act: { name: 'K-POP 댄스 커버', short: 'K-POP', fx: 'stage', verb: '홍대 거리에서 칼군무를 춰 본다!' },
    music: { scale: 'majPenta', root: 62, bpm: 124 }, hello: '안녕하세요!',
    npc: { tops: ['#2b2b33', '#f4f4f4', '#e8394a', '#7a8aa8', '#c9b8a0', '#3a5bd9'], hat: 0.15 },
    wx: ['sun', 'sun', 'sun', 'cloud', 'rain'],
  },
  {
    id: 'tokyo', name: '도쿄', en: 'TOKYO', country: '일본', lat: 35.68, lon: 139.69, price: 1.2,
    sky: ['#5aa6e8', '#d2eeff'], ground: ['#c2bdb4', '#aaa59c'], groundStyle: 'tile', road: '#45454f',
    style: 'modern', bld: ['#e2ddd2', '#c9d2dc', '#b0b8c4', '#e8d8c8', '#d8c0c8'], accent: '#d8343a', hotel: '#b8a890', actCol: '#d83a8a',
    landmark: 'tokyo', lmName: '도쿄타워 & 후지산', filler: 'blossom', particle: 'petal', animal: 'cat', vehicles: ['car', 'taxi', 'bus'],
    food: { name: '라멘', base: 'bowl', colors: ['#e8c48a', '#f4e4a0', '#c9785a', '#3a8a3a'], bowl: '#c0392b', bowlStripe: '#ffffff', egg: true },
    act: { name: '시부야 노래방', short: '노래방', fx: 'stage', verb: '노래방에서 일본 애니송을 열창한다!' },
    music: { scale: 'japanese', root: 64, bpm: 116 }, hello: 'Konnichiwa!',
    npc: { tops: ['#2b2b33', '#f4f4f4', '#5a6a8a', '#c94a6a', '#e8e0d0', '#2a5a4a'], hat: 0.15 },
    wx: ['sun', 'sun', 'cloud', 'rain'],
  },
  {
    id: 'bangkok', name: '방콕', en: 'BANGKOK', country: '태국', lat: 13.75, lon: 100.5, price: 0.5,
    sky: ['#4fb0e8', '#e8f4d8'], ground: ['#c9b9a0', '#b0a088'], groundStyle: 'dirt', road: '#55524a',
    style: 'shophouse', bld: ['#e8d0a0', '#d8a8a0', '#a8d0c0', '#e8e0b0', '#c8b8e0'], accent: '#ff8a2e', hotel: '#d8b890', actCol: '#e8394a',
    landmark: 'watArun', lmName: '왓 아룬 사원', filler: 'palm', particle: null, animal: 'dog', vehicles: ['tuktuk', 'tuktuk', 'scooter', 'car'],
    food: { name: '팟타이', base: 'bowl', colors: ['#e8a85a', '#f4d49a', '#e85a3a', '#5aa84a'], bowl: '#f4f4f4' },
    act: { name: '무에타이 체험', short: '무에타이', fx: 'ring', verb: '현지 챔피언에게 무에타이를 배운다!' },
    music: { scale: 'majPenta', root: 60, bpm: 100, lead: 'triangle' }, hello: 'Sawasdee!',
    npc: { tops: ['#ffd23f', '#f48a3a', '#3fb6ff', '#ffffff', '#e85a8a', '#2fa36b'], hat: 0.1 },
    wx: ['sun', 'sun', 'rain', 'cloud'],
  },
  {
    id: 'agra', name: '아그라', en: 'AGRA', country: '인도', lat: 27.18, lon: 78.04, price: 0.4,
    sky: ['#6ab0d8', '#f4e8c8'], ground: ['#d8b88a', '#c4a070'], groundStyle: 'dirt', road: '#8a7058', roadLines: false,
    style: 'desert', bld: ['#e8b89a', '#d89a7a', '#f0d0a8', '#c98a6a', '#e8c8b0'], accent: '#ff7a2e', hotel: '#e8a87a', actCol: '#e83a8a',
    landmark: 'taj', lmName: '타지마할', filler: 'tree', particle: 'powder', animal: 'cow', vehicles: ['tuktuk', 'scooter', 'car', 'tuktuk'],
    food: { name: '버터치킨 커리', base: 'bowl', colors: ['#e8782e', '#f4c47a', '#ffffff', '#3a8a3a'], bowl: '#c9a64a', spicy: true },
    act: { name: '홀리 축제', short: '홀리', fx: 'powder', verb: '형형색색 가루를 뿌리는 홀리 축제에 참가!' },
    music: { scale: 'bhairav', root: 62, bpm: 96 }, hello: 'Namaste!',
    npc: { tops: ['#ff8a2e', '#e8394a', '#ffd23f', '#c94ad9', '#2fa3a3', '#ffffff'], hat: 0.15, dress: 0.4 },
    wx: ['sun', 'sun', 'sun', 'cloud'],
  },
  {
    id: 'cairo', name: '카이로', en: 'CAIRO', country: '이집트', lat: 30.04, lon: 31.24, price: 0.45,
    sky: ['#5ab4e8', '#f4e4c0'], ground: ['#e0c48a', '#c9a96b'], groundStyle: 'sand', road: '#b8975e', roadLines: false,
    style: 'desert', bld: ['#d9b88a', '#c9a070', '#e8cc9a', '#b89060'], accent: '#2f8ac9', hotel: '#d8b080', actCol: '#c98a2e',
    landmark: 'pyramids', lmName: '기자 피라미드', filler: 'palm', particle: 'dust', animal: 'camel', vehicles: ['car', 'taxi', 'bus'],
    food: { name: '코샤리', base: 'bowl', colors: ['#a85a2e', '#e8c48a', '#c9302e', '#8a5a2a'], bowl: '#e8e0d0' },
    act: { name: '낙타 사막 투어', short: '낙타투어', fx: 'ride', mount: 'camel', verb: '낙타를 타고 피라미드 앞 사막을 달린다!' },
    music: { scale: 'hijaz', root: 62, bpm: 104 }, hello: 'Ahlan!',
    npc: { tops: ['#f4f0e0', '#c9b88a', '#3a5a8a', '#8a5a3a', '#2b2b33'], hat: 0.25, dress: 0.35 },
    wx: ['sun', 'sun', 'sun', 'sun'],
  },
  {
    id: 'nairobi', name: '나이로비', en: 'NAIROBI', country: '케냐', lat: -1.29, lon: 36.82, price: 0.6,
    sky: ['#5ab0e8', '#f4e8c0'], ground: ['#c48a5a', '#a87048'], groundStyle: 'dirt', road: '#9c6b44', roadLines: false,
    style: 'savanna', bld: ['#c9a070'], accent: '#e8a12e', hotel: '#b88a5a', actCol: '#5a8a3a',
    landmark: 'savanna', lmName: '킬리만자로 사바나', filler: 'acacia', particle: 'dust', animal: 'dog', vehicles: ['jeep', 'jeep', 'car'],
    food: { name: '냐마 초마', base: 'plate', piece: 'meat', pieces: 4, colors: ['#8a3a1e', '#c9643a', '#5aa84a'] },
    act: { name: '사파리 드라이브', short: '사파리', fx: 'ride', mount: 'jeep', verb: '지프를 타고 사자와 기린을 찾아 나선다!' },
    music: { scale: 'majPenta', root: 65, bpm: 112, busy: 0.6 }, hello: 'Jambo!',
    npc: { tops: ['#e8394a', '#2f6be8', '#ffd23f', '#2fa36b', '#ff8a2e', '#8a2ae8'], hat: 0.1, dress: 0.3, skins: ['#6e4630', '#5a3a28', '#7a4f36', '#9c6644'] },
    wx: ['sun', 'sun', 'cloud'],
  },
  {
    id: 'rome', name: '로마', en: 'ROME', country: '이탈리아', lat: 41.9, lon: 12.5, price: 1.2,
    sky: ['#4fa8e8', '#d8f0ff'], ground: ['#a89c8a', '#8a7e6c'], groundStyle: 'cobble', road: '#6a6258',
    style: 'european', bld: ['#e8b070', '#d8905a', '#f0c890', '#c9785a', '#e8d0a0'], accent: '#2f9e5a', hotel: '#e0a870', actCol: '#2f9e5a',
    landmark: 'colosseum', lmName: '콜로세움', filler: 'pine', particle: null, animal: 'pigeon', vehicles: ['scooter', 'scooter', 'car'],
    food: { name: '젤라토', base: 'cone', colors: ['#f7a8c4', '#a8e0b0', '#fff3d6'] },
    act: { name: '베스파 시내 질주', short: '베스파', fx: 'ride', mount: 'scooter', verb: '로마의 휴일처럼 베스파로 골목을 누빈다!' },
    music: { scale: 'major', root: 60, bpm: 132 }, hello: 'Ciao!',
    npc: { tops: ['#2b2b33', '#f4f4f4', '#3a5a8a', '#c9a46a', '#8a2a3a'], hat: 0.1, dress: 0.2 },
    wx: ['sun', 'sun', 'cloud'],
  },
  {
    id: 'paris', name: '파리', en: 'PARIS', country: '프랑스', lat: 48.86, lon: 2.35, price: 1.4,
    sky: ['#6aa8d8', '#dcecf8'], ground: ['#a8a4a0', '#8c8884'], groundStyle: 'cobble', road: '#5a5a62',
    style: 'european', bld: ['#ece0c8', '#e4d4b8', '#f2e8d4', '#dccaa8'], accent: '#3a5bd9', hotel: '#e8dcc4', actCol: '#2b2b33',
    landmark: 'eiffel', lmName: '에펠탑', filler: 'tree', particle: 'leaf', animal: 'pigeon', vehicles: ['car', 'scooter', 'bus'],
    food: { name: '크루아상', base: 'plate', piece: 'croissant', pieces: 3, colors: ['#e8a84a', '#b87a2a'] },
    act: { name: '패션위크 런웨이', short: '런웨이', fx: 'runway', verb: '어쩌다 패션쇼 모델 대타로 무대에 선다!' },
    music: { scale: 'major', root: 65, bpm: 100, lead: 'triangle' }, hello: 'Bonjour!',
    npc: { tops: ['#2b2b33', '#f4f4f4', '#3a4a6a', '#c94a4a', '#e8d8b8', '#5a5a66'], hat: 0.25, hats: ['#2b2b33', '#c94a4a', '#e8d8b8'], dress: 0.25 },
    wx: ['sun', 'cloud', 'cloud', 'rain'],
  },
  {
    id: 'reykjavik', name: '레이캬비크', en: 'REYKJAVIK', country: '아이슬란드', lat: 64.15, lon: -21.94, price: 1.8,
    sky: ['#7ab0d0', '#e4eef4'], ground: ['#eef4fa', '#d4e0ec'], groundStyle: 'snow', road: '#5a6270',
    style: 'nordic', bld: ['#e8394a', '#ffd23f', '#3a85d0', '#f4f4f4', '#2fa36b', '#ff8a2e'], accent: '#3a85d0', hotel: '#d8dce4', actCol: '#1a2a5a',
    landmark: 'hallgrim', lmName: '할그림스키르캬 교회', filler: 'snow', particle: null, animal: 'cat', vehicles: ['jeep', 'car'], snowy: true, aurora: true,
    food: { name: '아이슬란드 핫도그', base: 'plate', piece: 'dog', pieces: 2, colors: ['#c9502e', '#f2c47a', '#ffd23f'] },
    act: { name: '오로라 헌팅', short: '오로라', fx: 'aurora', verb: '한밤중 들판에서 오로라를 기다린다! (밤에 하면 보너스)' },
    music: { scale: 'dorian', root: 57, bpm: 84, lead: 'triangle', drums: false }, hello: 'Halló!',
    npc: { tops: ['#e8394a', '#3a5bd9', '#2b2b33', '#f4a62e', '#5a8a6a'], hat: 0.55, hats: ['#e8394a', '#2b2b33', '#ffd23f', '#3a5bd9'] },
    wx: ['cloud', 'snow', 'sun', 'snow'],
  },
  {
    id: 'newyork', name: '뉴욕', en: 'NEW YORK', country: '미국', lat: 40.71, lon: -74.0, price: 1.7,
    sky: ['#5aa0e0', '#d0e8f8'], ground: ['#a8a8ae', '#909098'], groundStyle: 'tile', road: '#3e3e46',
    style: 'skyscraper', bld: ['#8a8a9a', '#a8a0a0', '#c9b8a0', '#7a8aa0', '#b0a090', '#9aa4b0'], accent: '#ffd23f', hotel: '#a87a5a', actCol: '#c9302e',
    landmark: 'liberty', lmName: '자유의 여신상', filler: 'tree', particle: null, animal: 'pigeon', vehicles: ['taxi', 'taxi', 'car', 'bus'],
    food: { name: '뉴욕 피자', base: 'slice', colors: ['#ffd96a', '#c9302e', '#e8a84a'] },
    act: { name: '브로드웨이 오디션', short: '브로드웨이', fx: 'stage', verb: '브로드웨이 뮤지컬 오디션에 도전한다!' },
    music: { scale: 'blues', root: 60, bpm: 126, walkBass: true }, hello: 'Hey!',
    npc: { tops: ['#2b2b33', '#f4f4f4', '#3a5bd9', '#e8394a', '#8a8a99', '#ffd23f'], hat: 0.25 },
    wx: ['sun', 'cloud', 'rain', 'sun'],
  },
  {
    id: 'mexico', name: '멕시코시티', en: 'MEXICO CITY', country: '멕시코', lat: 19.43, lon: -99.13, price: 0.6,
    sky: ['#5ab4e8', '#f0eccc'], ground: ['#c9b8a0', '#b0a088'], groundStyle: 'tile', road: '#5a5248',
    style: 'colonial', bld: ['#ff9ec0', '#ffd96a', '#5ad0c0', '#ff8a5a', '#a8d06a', '#c8a8f0'], accent: '#e8394a', hotel: '#f0a0a0', actCol: '#2f6be8',
    landmark: 'teo', lmName: '테오티우아칸 피라미드', filler: 'cactus', particle: 'confetti', animal: 'dog', vehicles: ['car', 'bus', 'scooter'],
    food: { name: '타코', base: 'plate', piece: 'taco', pieces: 3, colors: ['#f2c46a', '#5aa84a', '#c9302e', '#ffffff'], spicy: true },
    act: { name: '루차 리브레', short: '루차', fx: 'ring', verb: '가면을 쓰고 루차 리브레 링에 오른다!' },
    music: { scale: 'major', root: 67, bpm: 138, latin: true }, hello: '¡Hola!',
    npc: { tops: ['#e8394a', '#2fa36b', '#ffd23f', '#ff5ec4', '#f4f4f4', '#3fb6ff'], hat: 0.3, hats: ['#d9b36a', '#2b2b33', '#e8394a'], dress: 0.25 },
    wx: ['sun', 'sun', 'cloud', 'rain'],
  },
  {
    id: 'rio', name: '리우데자네이루', en: 'RIO', country: '브라질', lat: -22.91, lon: -43.17, price: 0.7,
    sky: ['#3fa8e8', '#d8f4ff'], ground: ['#f4f4f0', '#2b2b33'], groundStyle: 'wave', road: '#4a4a52',
    style: 'favela', bld: ['#ff9ec0', '#ffd96a', '#5ad0c0', '#ff8a5a', '#a8d06a', '#f4f4f4', '#3fb6ff'], accent: '#2fa36b', hotel: '#f0d070', actCol: '#ffd23f',
    landmark: 'cristo', lmName: '예수상 & 빵산', filler: 'palm', particle: 'confetti', animal: 'dog', vehicles: ['car', 'bus', 'scooter'],
    food: { name: '슈하스코', base: 'skewer', colors: ['#8a3a1e', '#c9643a', '#e85a3a'] },
    act: { name: '삼바 카니발', short: '삼바', fx: 'samba', verb: '삼바 퍼레이드 한가운데서 춤을 춘다!' },
    music: { scale: 'mixo', root: 62, bpm: 140, latin: true, syncBass: true, busy: 0.6 }, hello: 'Olá!',
    npc: { tops: ['#ffd23f', '#2fa36b', '#3fb6ff', '#ff8a2e', '#ffffff', '#e85a8a'], hat: 0.15, dress: 0.3 },
    wx: ['sun', 'sun', 'cloud', 'rain'],
  },
  {
    id: 'sydney', name: '시드니', en: 'SYDNEY', country: '호주', lat: -33.87, lon: 151.21, price: 1.4,
    sky: ['#3fa0e8', '#d8f0ff'], ground: ['#c49a6c', '#a87e52'], groundStyle: 'wood', road: '#4a4a52',
    style: 'modern', bld: ['#e8e4dc', '#c8d8e4', '#f0d8b8', '#b8c8d0'], accent: '#ff8a2e', hotel: '#e8d8c0', actCol: '#2f8ac9',
    landmark: 'opera', lmName: '오페라하우스', filler: 'palm', particle: null, animal: 'kangaroo', vehicles: ['car', 'bus'],
    food: { name: '미트파이', base: 'plate', piece: 'pie', pieces: 2, colors: ['#d9a05a', '#b87a3a', '#e8394a'] },
    act: { name: '본다이 서핑', short: '서핑', fx: 'surf', verb: '본다이 비치에서 파도를 탄다!' },
    music: { scale: 'majPenta', root: 64, bpm: 120 }, hello: "G'day!",
    npc: { tops: ['#3fb6ff', '#ffd23f', '#f4f4f4', '#2fa36b', '#ff8a2e'], hat: 0.25 },
    wx: ['sun', 'sun', 'sun', 'cloud'],
  },
  {
    id: 'antarctica', name: '남극 세종기지', en: 'ANTARCTICA', country: '남극', lat: -62.22, lon: -58.78, price: 2.0, secret: true,
    sky: ['#8ab8e0', '#f0f6fc'], ground: ['#f4f8fc', '#d4e4f0'], groundStyle: 'snow', road: '#dce8f4', roadLines: false,
    style: 'antarctic', bld: ['#e8572e'], accent: '#e8572e', hotel: '#e8572e', actCol: '#3a5bd9',
    landmark: 'sejong', lmName: '세종과학기지', filler: 'snow', particle: null, animal: 'penguin', vehicles: [], snowy: true, aurora: true,
    food: { name: '남극 컵라면', base: 'cup', colors: ['#e8c48a'] },
    act: { name: '펭귄 행진 따라하기', short: '펭귄', fx: 'snow', verb: '황제펭귄 무리와 함께 뒤뚱뒤뚱 행진!' },
    music: { scale: 'lydian', root: 69, bpm: 80, lead: 'triangle', drums: false }, hello: '...펭?',
    npc: { tops: ['#e8572e', '#e8a12e', '#e8394a'], hat: 0.9, hats: ['#2b2b33', '#e8394a'] },
    wx: ['snow', 'snow', 'sun', 'cloud'],
  },
];
const CITY = {};
for (const c of CITIES) CITY[c.id] = c;

function distKm(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- 장비 ----------
const GEAR = [
  { id: 'cam1', name: '미러리스 카메라', price: 900000, desc: '모든 촬영 퀄리티 +12', need: null },
  { id: 'cam2', name: '시네마 카메라', price: 3200000, desc: '모든 촬영 퀄리티 +25 (미러리스 대체)', need: 'cam1' },
  { id: 'mic', name: '무선 마이크', price: 250000, desc: '먹방·체험 퀄리티 +8' },
  { id: 'gimbal', name: '3축 짐벌', price: 450000, desc: '랜드마크 촬영 시 화면 흔들림 절반' },
  { id: 'sd', name: '대용량 SD카드', price: 180000, desc: '클립 저장 공간 4개 → 8개' },
  { id: 'light', name: '링라이트', price: 220000, desc: '라이브 후원 +40%, 먹방 퀄리티 +5' },
  { id: 'drone', name: '촬영용 드론', price: 1400000, desc: '포토존에서 드론샷 촬영 가능 (퀄리티 +15)' },
  { id: 'laptop', name: '편집용 노트북', price: 1200000, desc: '업로드 영상 조회수 +15%' },
];
const ITEMS = [
  { id: 'energy', name: '에너지드링크', price: 5000, desc: '체력 +30 (메뉴에서 사용)' },
  { id: 'medicine', name: '비상약', price: 20000, desc: '배탈/감기 즉시 회복' },
  { id: 'umbrella', name: '우산', price: 15000, desc: '비 오는 날 장비를 지켜준다 (1회)' },
  { id: 'battery', name: '보조배터리', price: 30000, desc: '배터리 방전 사고 방지 (1회)' },
];

// ---------- 제목/댓글 ----------
const TITLE_STYLES = [
  { id: 'honest', name: '정직한 제목', desc: '무난하게. 신뢰도 유지', views: 1.0, conv: 1.0, viral: 0, risk: 0 },
  { id: 'bait', name: '어그로 제목', desc: '조회수 ↑↑ 구독 전환 ↓ 논란 위험', views: 1.7, conv: 0.55, viral: 0.04, risk: 0.22 },
  { id: 'mood', name: '감성 제목', desc: '조회수 ↓ 구독 전환 ↑↑', views: 0.85, conv: 1.5, viral: 0, risk: 0 },
];
const NICKS = ['여행가고싶다', '떡볶이러버', '퇴사각', '방구석여행자', '냥냥펀치', '월급루팡', '감자도리', '김치찌개장인', '새벽세시', '지구별여행자', '알고리즘의노예',
  '출근싫어', '야식킬러', 'travel_holic', 'Global_Fan', '구독자A', '고3수험생', '비행기덕후', '편집러', '맛집탐험대', '라면한그릇', '여행중독', '부산사나이', '제주감귤', '휴가언제', 'K-여행러'];
const COMMENTS = {
  any: ['와 영상미 미쳤다...', '1등!!', '알고리즘이 저를 여기로 데려왔네요', '편집자님 월급 올려주세요', '목소리 너무 좋아요', '대리만족 제대로 하고 갑니다', '이 채널 왜 이제 알았지?',
    '{city} 가고 싶다ㅠㅠ', '구독 누르고 갑니다!', '다음 영상 언제 올라와요??', '출근길에 보니까 힐링되네요', '이런 게 진짜 여행 유튜브지', '배경음악 정보 알 수 있을까요?', '현지 분위기 그대로 느껴져요'],
  food: ['{food} 먹는 거 보니까 배고프다', '야식 시켰습니다 책임지세요', '먹방 리액션 찐이다 ㅋㅋㅋ', '저거 진짜 맛있어요 저도 먹어봄!!', '{food} 한 입만...', '침 고였다'],
  landmark: ['{lm} 실제로 보면 진짜 크다던데', '구도 미쳤다', '배경화면 했어요', '{lm} 버킷리스트 추가', '날씨 운 좋으시다'],
  drone: ['드론샷 소름...', '드론 실력 무엇?', '이건 영화 오프닝이다'],
  act: ['{act} 하는 거 개웃기네 ㅋㅋㅋㅋ', '몸치 인증 ㅋㅋㅋ', '용기가 대단하세요', '저도 해보고 싶어요!!', '표정 ㅋㅋㅋㅋㅋㅋ'],
  event: ['이런 일이 실제로?? ㅋㅋㅋ', '여행은 역시 돌발상황이지', '이 장면 레전드로 박제', '찍고 있었던 게 신기함'],
  bait: ['제목이랑 내용이 다르잖아요;;', '낚였다...', '어그로 그만 끄세요', '그래서 이것이 뭔데요', '썸네일 사기 ㅋㅋ'],
  low: ['화질 무슨 일이야...', '손떨림 때문에 멀미나요', '음... 분발하세요', '편집 좀 더 신경 써주세요ㅠ'],
  high: ['이게 개인 유튜버 퀄리티라고?', '방송국 다큐인 줄', '넷플릭스 가자', '색감 장인'],
  mood: ['눈물 났어요', '잔잔해서 좋다', '자기 전에 꼭 봅니다', '마음이 편안해지는 영상'],
  viral: ['알고리즘 신이 보우하사', '조회수 실화냐', '떡상 축하드려요!!', '여기가 그 유명한 채널?'],
  small: ['구독자 1호(엄마)예요 사랑해 아들딸~', '친구야 나 왔다 ㅋㅋ', '응원합니다! 꼭 떡상하세요'],
};
const LOADING_TIPS = ['컷 편집 중...', '자막 다는 중...', '썸네일 표정 고르는 중...', 'BGM 저작권 확인 중...', '색보정 하는 중...', '렌더링 중... 노트북이 뜨겁다', '인코딩 중...'];
