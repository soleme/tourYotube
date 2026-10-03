'use strict';
// =====================================================================
//  balance.js — 조회수/구독자 공식 (DOM 없음, node 시뮬레이션 가능)
// =====================================================================
const BAL = {
  START_MONEY: 3000000,
  START_SUBS: 37,
  DAY_LIMIT: 80,
  RPM: 3.5,                 // 조회수 1회당 원
  MONETIZE_AT: 1000,
  HOTEL: 55000, FOOD: 14000, ACT: 45000, ALBA: 70000,
  FLIGHT_BASE: 80000, FLIGHT_PER_KM: 55,
};
function novFor(count) { return count <= 0 ? 1.25 : count === 1 ? 0.75 : count === 2 ? 0.5 : 0.35; }
function computeVideo(o) {
  const R = o.rnd || Math.random;
  const clips = o.clips, n = clips.length;
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const q = Math.min(110, mean(clips.map(c => c.q)) + Math.min(12, (n - 1) * 3));
  const nov = mean(clips.map(c => c.nov));
  const qf = Math.pow(Math.max(5, q) / 60, 1.7);
  const mission = clips.some(c => c.mission) ? 1.5 : 1;
  const evt = clips.some(c => c.kind === 'event') ? 1 : 0;
  const base = 900 + Math.pow(Math.max(0, o.subs), 0.9) * 1.45;
  const rookie = 1 + 2.5 * Math.exp(-Math.max(0, o.subs) / 4000);   // 신인 알고리즘 버프
  let views = base * qf * nov * o.style.views * mission * (o.laptop ? 1.15 : 1) * (o.buff || 1) * rookie * (0.7 + R() * 0.65);
  const vc = 0.03 + Math.max(0, q - 60) * 0.0025 + evt * 0.04 + (o.style.viral || 0) + (o.viralBonus || 0);
  let viral = 0;
  if (R() < vc) { viral = 4 + R() * 10; views *= viral; }
  views = Math.floor(views);
  const conv = (0.016 + q * 0.0004) * o.style.conv;
  let subs = Math.floor(views * conv * (0.8 + R() * 0.4));
  let backlash = false;
  if (o.style.risk && R() < o.style.risk) { backlash = true; subs = -Math.floor(o.subs * (0.01 + R() * 0.03)) - 5; }
  const likes = Math.floor(views * (0.025 + q * 0.0005));
  const revenue = o.monetized ? Math.floor(views * BAL.RPM) : 0;
  return { q: Math.round(q), nov, views, subs, likes, revenue, viral, backlash };
}
if (typeof module !== 'undefined') module.exports = { BAL, computeVideo, novFor };
