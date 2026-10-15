// 舒壓小遊戲：戳泡泡。按住滑過去可以一次戳一排；可以把煩惱寫進泡泡再戳破（煩惱不會被儲存）。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const sheet = $('sheet'), say = $('relaxSay'), face = $('relaxFace');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = () => window.DAILY_MSG;
  const fill = s => (D() ? D().fill(s) : s);
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const today = new Date().toISOString().slice(0, 10);
  let total = 0, round = 0, size = 0, combo = 0, lastPop = 0, down = false, worries = [];
  let sound = true, buzz = true, ctx = null;
  try { const s = JSON.parse(localStorage.getItem('daily-relax') || '{}'); if (s.day === today) total = s.total || 0; if (s.sound === false) sound = false; if (s.buzz === false) buzz = false; } catch {}
  function store() { try { localStorage.setItem('daily-relax', JSON.stringify({ day: today, total, sound, buzz })); } catch {} }

  const CHEERS = {
    10: ['戳得很順手喔！', '啵啵啵～好療癒'],
    30: ['壓力有沒有少一點了？', '{pet}也想一起戳！'],
    60: ['戳泡泡達人！', '手感太好了吧～'],
    100: ['今天戳了 100 顆！壓力通通不見了！', '一百顆！{pet}頒給你舒壓勳章 🏅'],
    200: ['兩百顆！你是泡泡之王！']
  };
  const WORRY_POP = ['啵！「{w}」被戳破了。', '「{w}」飛走囉～', '「{w}」沒什麼大不了的！', '把「{w}」交給{pet}，你先休息。'];
  const DONE = ['整張都戳完了，好舒服～', '全部戳破！心情也清爽了吧？', '一張戳完，再來一張嗎？'];
  const COMBO = ['連擊！', '手速好快！', '停不下來～'];

  window.relaxTalk = (t, e) => talk(t, e);
  function talk(text, emoji) {
    say.textContent = fill(text);
    if (emoji) { face.textContent = emoji; face.classList.remove('pop'); void face.offsetWidth; face.classList.add('pop'); }
    const pet = $('relaxPet');
    pet.classList.remove('bob'); void pet.offsetWidth; pet.classList.add('bob');
  }

  // ---- 聲音：用 WebAudio 合成「啵」的聲音，不需要音效檔 ----
  window.relaxAudio = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch { return null; }
  };
  window.relaxSound = () => sound;
  window.relaxBuzz = ms => { if (buzz && navigator.vibrate) navigator.vibrate(ms); };
  function popSound(big) {
    if (!sound) return;
    try {
      ctx = window.relaxAudio(); if (!ctx) return;
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const noise = ctx.createBufferSource(); noise.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = (big ? 900 : 1500) + Math.random() * 900; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.setValueAtTime(big ? 0.9 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      noise.connect(bp).connect(g).connect(ctx.destination); noise.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime((big ? 380 : 560) + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
      og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(og).connect(ctx.destination); o.start(t); o.stop(t + 0.1);
    } catch {}
  }

  function counters() {
    $('roundCount').textContent = `${round} / ${size}`;
    $('totalCount').textContent = total;
    $('roundBar').style.width = (size ? round / size * 100 : 0) + '%';
  }

  function cols() { const w = sheet.clientWidth || 600; return Math.max(5, Math.min(9, Math.floor(w / 64))); }

  function build() {
    const c = cols(), r = window.innerWidth < 600 ? 7 : 6;
    size = c * r; round = 0; combo = 0;
    sheet.style.setProperty('--cols', c);
    sheet.replaceChildren();
    const slots = [...Array(size).keys()].sort(() => Math.random() - .5);
    const worryAt = new Map(worries.slice(0, size).map((w, i) => [slots[i], w]));
    for (let i = 0; i < size; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bubble';
      b.style.setProperty('--d', (Math.random() * 0.6).toFixed(2) + 's');
      const w = worryAt.get(i);
      if (w) { b.classList.add('worry'); b.dataset.worry = w; const s = document.createElement('span'); s.textContent = w; b.append(s); b.setAttribute('aria-label', '煩惱泡泡：' + w); }
      else b.setAttribute('aria-label', '泡泡');
      sheet.append(b);
    }
    worries = worries.slice(size);
    $('worryCount').textContent = worries.length ? `還有 ${worries.length} 個煩惱排隊中` : '';
    counters();
  }

  function burst(b) {
    if (reduced) return;
    const r = b.getBoundingClientRect(), s = sheet.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('i');
      p.className = 'pop-bit';
      const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 16;
      p.style.left = (r.left - s.left + r.width / 2) + 'px'; p.style.top = (r.top - s.top + r.height / 2) + 'px';
      p.style.setProperty('--x', Math.cos(a) * d + 'px'); p.style.setProperty('--y', Math.sin(a) * d + 'px');
      sheet.append(p); setTimeout(() => p.remove(), 500);
    }
  }

  function pop(b) {
    if (!b || !b.classList.contains('bubble') || b.classList.contains('popped')) return;
    b.classList.add('popped');
    b.setAttribute('aria-label', '已戳破');
    const isWorry = b.classList.contains('worry');
    popSound(isWorry);
    if (buzz && navigator.vibrate) navigator.vibrate(isWorry ? 25 : 8);
    burst(b);
    round++; total++;
    const now = Date.now();
    combo = now - lastPop < 450 ? combo + 1 : 1; lastPop = now;
    store(); counters();
    if (isWorry) talk(pick(WORRY_POP).replace('{w}', b.dataset.worry), '😆');
    else if (CHEERS[total]) talk(pick(CHEERS[total]), '🥳');
    else if (combo === 8 || combo === 20) talk(pick(COMBO) + ` ×${combo}`, '😲');
    if (round === size) {
      talk(pick(DONE), '😊');
      $('newSheet').classList.add('glow');
      if (!reduced) sheet.classList.add('done');
      setTimeout(() => sheet.classList.remove('done'), 900);
    }
  }

  // 按住滑過去可以連續戳
  sheet.addEventListener('pointerdown', e => {
    down = true;
    if (e.target.releasePointerCapture && e.pointerId != null) try { e.target.releasePointerCapture(e.pointerId); } catch {}
    pop(e.target.closest('.bubble'));
  });
  sheet.addEventListener('pointermove', e => { if (down) pop(document.elementFromPoint(e.clientX, e.clientY)?.closest('.bubble')); });
  window.addEventListener('pointerup', () => { down = false; });
  window.addEventListener('pointercancel', () => { down = false; });
  // 鍵盤：Tab 到泡泡按 Enter/空白鍵
  sheet.addEventListener('click', e => { if (e.detail === 0) pop(e.target.closest('.bubble')); });

  $('newSheet').onclick = () => { $('newSheet').classList.remove('glow'); build(); talk('新的一張來囉！', '😊'); };
  $('worryForm').onsubmit = e => {
    e.preventDefault();
    const input = $('worryInput'), text = input.value.trim().slice(0, 12);
    if (!text) { input.focus(); return; }
    input.value = '';
    const free = [...sheet.querySelectorAll('.bubble:not(.popped):not(.worry)')];
    if (free.length) {
      const b = pick(free);
      b.classList.add('worry', 'fresh'); b.dataset.worry = text;
      const s = document.createElement('span'); s.textContent = text; b.append(s);
      b.setAttribute('aria-label', '煩惱泡泡：' + text);
      talk('把「' + text + '」包進泡泡了，去戳破它！', '😤');
    } else {
      worries.push(text);
      $('worryCount').textContent = `還有 ${worries.length} 個煩惱排隊中`;
      talk('這張滿了，換新的一張就會出現。', '🙂');
    }
  };
  function syncToggles() {
    $('soundBtn').setAttribute('aria-pressed', String(sound)); $('soundBtn').lastChild.textContent = sound ? '聲音 開' : '聲音 關';
    $('buzzBtn').setAttribute('aria-pressed', String(buzz)); $('buzzBtn').lastChild.textContent = buzz ? '震動 開' : '震動 關';
  }
  $('soundBtn').onclick = () => { sound = !sound; store(); syncToggles(); };
  $('buzzBtn').onclick = () => { buzz = !buzz; store(); syncToggles(); };
  if (!navigator.vibrate) $('buzzBtn').hidden = true;
  $('relaxPet').onclick = () => talk(pick(['戳我也會啵一聲喔（才不會）', '慢慢戳，不用急～', '想到什麼煩惱，就寫進泡泡裡吧。', '{pet}陪你一起放鬆。']), '🥰');

  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (built && round === 0 && sheet.offsetParent) build(); }, 300); });
  syncToggles();
  const tabs = [...document.querySelectorAll('[data-game]')];
  let built = false;
  function show(game, focus) {
    if (!tabs.some(t => t.dataset.game === game)) game = 'bubble';
    tabs.forEach(t => { const on = t.dataset.game === game; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== game; });
    if (game === 'bubble' && !built) { built = true; build(); }
    window.dispatchEvent(new CustomEvent('relax-game', { detail: game }));
    if (location.hash.slice(1) !== game) history.replaceState(null, '', '#' + game);
  }
  tabs.forEach((t, i) => {
    t.onclick = () => show(t.dataset.game);
    t.onkeydown = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].dataset.game, true); } };
  });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  function start() { show(location.hash.slice(1) || 'bubble'); if (location.hash.slice(1) && location.hash.slice(1) !== 'bubble') return; talk(total ? `今天已經戳了 ${total} 顆，繼續放鬆吧～` : '按住滑過去可以一次戳一排喔！', '😊'); }
  // 等其他遊戲的程式（muyu.js、slap.js）都載入後再開始
  const go = () => setTimeout(start, 0);
  if (document.documentElement.hasAttribute('data-locked')) window.addEventListener('daily-unlocked', () => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true }); else go(); }, { once: true });
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();
