'use strict';
// =====================================================================
//  ui.js — DOM 대화창/패널/토스트 (키보드 + 터치)
// =====================================================================
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(tag, attrs = {}, html = '') {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  if (html) el.innerHTML = html;
  return el;
}

const UI = {
  root: document.getElementById('ui'),
  stack: [],
  isOpen() { return this.stack.length > 0; },
  key(k) {
    const top = this.stack[this.stack.length - 1];
    if (top && top.onKey) top.onKey(k);
  },
  push(m) { this.stack.push(m); this.root.appendChild(m.el); m.el.classList.add('in'); },
  pop(m) {
    const i = this.stack.indexOf(m);
    if (i >= 0) this.stack.splice(i, 1);
    if (m.el.parentNode) m.el.remove();
  },
  // 포커스 가능한 버튼 목록 탐색
  navigable(m, k) {
    const btns = [...m.el.querySelectorAll('button.btn:not([disabled])')];
    if (!btns.length) return false;
    let i = btns.indexOf(document.activeElement);
    if (i < 0) i = btns.findIndex(b => b.classList.contains('focus'));
    const cols = m.cols || 1;
    if (k === 'up' || k === 'down' || k === 'left' || k === 'right') {
      let step = k === 'up' ? -cols : k === 'down' ? cols : k === 'left' ? -1 : 1;
      if (cols === 1 && (k === 'left' || k === 'right')) return false;
      i = i < 0 ? 0 : clamp(i + step, 0, btns.length - 1);
      this.focus(btns, i); Snd.play('move'); return true;
    }
    if (k === 'a') { const b = btns[i < 0 ? 0 : i]; if (b) b.click(); return true; }
    return false;
  },
  focus(btns, i) {
    btns.forEach(b => b.classList.remove('focus'));
    const b = btns[i]; if (!b) return;
    b.classList.add('focus');
    try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    b.scrollIntoView({ block: 'nearest' });
  },
  // 하단 대화창 + 선택지
  ask(o) {
    if (typeof o === 'string') o = { text: o };
    return new Promise(res => {
      const choices = (o.choices || ['확인']).map(c => (typeof c === 'string' ? { label: c } : c));
      const el = h('div', { class: 'dlg' + (o.wide ? ' wide' : '') + (o.top ? ' top' : '') });
      const head = o.title ? `<div class="dlg-title">${o.icon ? `<span class="ico">${o.icon}</span>` : ''}${esc(o.title)}</div>` : '';
      el.innerHTML = `${head}<div class="dlg-text"></div><div class="dlg-choices"></div>`;
      const tx = el.querySelector('.dlg-text'), ch = el.querySelector('.dlg-choices');
      const full = o.text || '';
      let shown = 0, typing = !REDUCED && full.length > 0 && o.instant !== true;
      const render = () => { tx.innerHTML = esc(full.slice(0, shown)).replace(/\n/g, '<br>') + (typing ? '<span class="caret">▌</span>' : ''); };
      if (!typing) { shown = full.length; }
      render();
      let timer = null;
      if (typing) {
        timer = setInterval(() => {
          shown = Math.min(full.length, shown + 2);
          if (shown % 4 === 0) Snd.play('type');
          if (shown >= full.length) { typing = false; clearInterval(timer); }
          render();
        }, 22);
      }
      const m = { el, cols: 1 };
      const done = i => {
        if (typing) { typing = false; clearInterval(timer); shown = full.length; render(); return; }
        clearInterval(timer);
        Snd.play(i === o.cancel ? 'cancel' : 'select');
        this.pop(m); res(i);
      };
      choices.forEach((c, i) => {
        const b = h('button', { class: 'btn' + (c.cls ? ' ' + c.cls : ''), type: 'button' }, `<span class="cur">▶</span><span class="lbl">${esc(c.label)}</span>${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}`);
        if (c.disabled) { b.disabled = true; b.classList.add('off'); }
        b.addEventListener('click', e => { e.stopPropagation(); Snd.init(); done(i); });
        ch.appendChild(b);
      });
      tx.addEventListener('click', () => { if (typing) done(-1); });
      m.onKey = k => {
        if (typing && (k === 'a' || k === 'b')) { done(-1); return; }
        if (k === 'b' && o.cancel != null && o.cancel >= 0) { done(o.cancel); return; }
        if (k === 'b' && choices.length === 1 && !choices[0].disabled) { done(0); return; }
        this.navigable(m, k);
      };
      this.push(m);
      const first = [...ch.querySelectorAll('button.btn:not([disabled])')];
      if (first.length) this.focus(first, 0);
    });
  },
  say(text, o = {}) { return this.ask({ ...o, text, choices: [o.ok || '확인'] }); },
  // 가운데 큰 패널. build(body, close) 로 내용 구성. 반환: close 될 때 값
  panel(o) {
    return new Promise(res => {
      const el = h('div', { class: 'panel' + (o.cls ? ' ' + o.cls : '') });
      el.innerHTML = `<div class="panel-in">${o.title ? `<div class="panel-title">${o.icon ? `<span class="ico">${o.icon}</span>` : ''}<span>${esc(o.title)}</span>${o.closable !== false ? '<button class="x" type="button" aria-label="닫기">✕</button>' : ''}</div>` : ''}<div class="panel-body"></div></div>`;
      const body = el.querySelector('.panel-body');
      const m = { el, cols: o.cols || 1 };
      const close = v => { this.pop(m); if (o.onClose) o.onClose(); res(v); };
      const xb = el.querySelector('.x');
      if (xb) xb.addEventListener('click', () => { Snd.play('cancel'); close(null); });
      m.onKey = k => {
        if (o.onKey && o.onKey(k) === true) return;
        if (k === 'b' && o.closable !== false) { Snd.play('cancel'); close(null); return; }
        this.navigable(m, k);
      };
      m.refresh = () => {
        const st = body.scrollTop;
        body.innerHTML = ''; o.build(body, close, m);
        const b = [...body.querySelectorAll('button.btn:not([disabled])')];
        if (b.length) this.focus(b, clamp(m.lastFocus || 0, 0, b.length - 1));
        body.scrollTop = m.lastFocus == null ? 0 : st;
      };
      this.push(m);
      m.refresh();
    });
  },
  btn(label, onClick, o = {}) {
    const b = h('button', { class: 'btn' + (o.cls ? ' ' + o.cls : ''), type: 'button' }, `<span class="cur">▶</span><span class="lbl">${label}</span>${o.sub ? `<span class="sub">${o.sub}</span>` : ''}`);
    if (o.disabled) { b.disabled = true; b.classList.add('off'); }
    b.addEventListener('click', e => { e.stopPropagation(); Snd.init(); onClick(b); });
    return b;
  },
  toast(msg, o = {}) {
    const el = h('div', { class: 'toast' + (o.cls ? ' ' + o.cls : '') }, esc(msg));
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), o.ms || 1800);
    setTimeout(() => el.remove(), (o.ms || 1800) + 400);
  },
  // 이름 입력
  input(o) {
    return new Promise(res => {
      const el = h('div', { class: 'dlg' });
      el.innerHTML = `<div class="dlg-title">${esc(o.title || '')}</div><div class="dlg-text">${esc(o.text || '')}</div><input id="name-input" class="inp" maxlength="${o.max || 12}" value="${esc(o.value || '')}" autocomplete="off" spellcheck="false"><div class="dlg-choices"></div>`;
      const inp = el.querySelector('input');
      const m = { el, cols: 1 };
      const done = () => { const v = inp.value.trim() || o.value || ''; Snd.play('select'); this.pop(m); res(v); };
      el.querySelector('.dlg-choices').appendChild(this.btn('결정', done));
      m.onKey = k => { if (k === 'a') done(); };
      this.push(m);
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  },
};

// 도트 아이콘을 DOM 에 넣기 위한 캔버스
function iconHTML(name, scale = 2) {
  const s = IconSpr[name];
  if (!s) return '';
  return `<img class="pxi" alt="" src="${s.toDataURL()}" style="width:${s.width * scale}px;height:${s.height * scale}px">`;
}
