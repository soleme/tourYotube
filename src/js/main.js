'use strict';
// =====================================================================
//  main.js — 화면 크기, 터치 패드, 부팅
// =====================================================================
function fitScreen() {
  const scr = document.getElementById('screen');
  const r = scr.getBoundingClientRect();
  const s = r.width / W;
  const fs = s >= 3.4 ? 24 : s >= 2.3 ? 18 : 12;
  scr.style.setProperty('--fs', fs + 'px');
  const below = innerHeight - r.bottom;
  document.body.classList.toggle('portrait-ui', innerHeight > innerWidth * 1.15 && below > 200);
  document.body.style.setProperty('--sb', Math.round(r.bottom + 8) + 'px');
}
addEventListener('resize', fitScreen);
if (window.ResizeObserver) new ResizeObserver(fitScreen).observe(document.getElementById('screen'));

// 터치 패드
document.querySelectorAll('#pad [data-k]').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); b.classList.add('on'); vkey(k, true); };
  const up = e => { e.preventDefault(); b.classList.remove('on'); vkey(k, false); };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
});
const soundBtn = document.getElementById('sound-btn');
function updateSoundBtn() { if (soundBtn) { soundBtn.textContent = Snd.muted ? '소리 꺼짐' : '소리 켜짐'; soundBtn.setAttribute('aria-pressed', String(!Snd.muted)); } }
if (soundBtn) soundBtn.addEventListener('click', () => { Snd.init(); Snd.toggle(); });
const padBtn = document.getElementById('pad-btn');
if (padBtn) padBtn.addEventListener('click', () => { document.body.classList.remove('hide-pad'); document.body.classList.toggle('show-pad'); fitScreen(); try { localStorage.setItem('tdtv_pad', document.body.classList.contains('show-pad') ? '1' : '0'); } catch (e) { } });
let padPref = null;
try { padPref = localStorage.getItem('tdtv_pad'); } catch (e) { }
if (padPref === '1' || (padPref == null && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0))) document.body.classList.add('show-pad');
if (padPref === '0') document.body.classList.add('hide-pad');

async function boot(data) {
  fitScreen();
  updateSoundBtn();
  try { await Promise.race([Promise.all([document.fonts.load(FS), document.fonts.load(FM), document.fonts.load(FB)]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  txtCache.clear();
  WorldMap.build();
  ctx.fillStyle = OUT; ctx.fillRect(0, 0, W, H);
  if (data && data.S) {
    S = data.S;
    setScene(CityScene, S.city, { x: SPOTS[1].x });
  } else setScene(TitleScene);
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  try { window.claude.hot.snapshot(() => (S ? { S: JSON.parse(JSON.stringify(S)) } : {})); } catch (e) { }
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});
