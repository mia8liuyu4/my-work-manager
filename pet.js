// 小動物互動區：點一下＝戳戳、連點三下＝搔癢、點兩下＝大笑、長按＝抱抱；
// 下方按鈕可以摸頭、給愛心、講笑話、陪你哭、一起推開壓力山、想睡覺。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('petStage');
  if (!stage) return;
  const body = $('petBody'), img = $('petImg'), fx = $('petFx'), say = $('petSay'), face = $('petFace'), count = $('petCount');
  const MSG = () => window.DAILY_MSG;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FACES = { smile: '😊', pat: '🥰', poke: '😳', tickle: '🤭', love: '😍', laugh: '😆', cry: '😢', stress: '😵', relief: '😌', sleepy: '😪', shy: '☺️', joke: '😏', idle: '🙂' };
  const DUR = { smile: 2200, pat: 2400, poke: 1300, tickle: 2200, love: 2800, laugh: 2600, cry: 3600, stress: 2600, relief: 2600, sleepy: 4200, shy: 2400, joke: 4200, idle: 2400 };
  let back = null, lastAct = Date.now(), timers = [];
  // 真的換臉：mascots/expressions.json 列出每隻動物有哪些表情圖（mascots/動物-x-表情.webp）
  const FACE_IMG = { smile: 'smile', pat: 'shy', poke: 'surprised', tickle: 'laugh', love: 'love', laugh: 'laugh', cry: 'cry', stress: 'stress', relief: 'smile', sleepy: 'sleepy', shy: 'shy', joke: 'smile' };
  let exprList = {};
  // 舊貓狗表情資產含有錯位的第二組眼睛：改用原生乾淨姿勢，以動作與氣泡表達情緒。
  const naturalFace = () => ['cat', 'puppy'].includes(mascotId());
  const broken = new Set();               // 載入失敗的表情圖，之後不再嘗試
  const ALIAS = { puppy: ['puppy', 'dog'], cat: ['cat', 'kitten'], bunny: ['bunny', 'rabbit'], tiger: ['tiger'], elephant: ['elephant'] };
  const mascotId = () => window.dailyTheme?.mascot()?.id || 'bunny';
  const baseSrc = () => `mascots/${mascotId()}-${img.dataset.pose || 'heart'}.webp`;
  // 表情清單的名稱容錯：id 或別名、大小寫都可以
  function exprFor() {
    const names = (ALIAS[mascotId()] || [mascotId()]).map(s => s.toLowerCase());
    const key = Object.keys(exprList).find(k => names.includes(k.toLowerCase()));
    return key ? (exprList[key] || []) : [];
  }
  function preload() { exprFor().forEach(e => { const i = new Image(); i.src = `mascots/${mascotId()}-x-${e}.webp`; }); }
  fetch('mascots/expressions.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(j => {
    exprList = j || {}; preload();
    if (!exprFor().length) console.warn('[pet] expressions.json 找不到「' + mascotId() + '」的表情清單，會一直使用預設圖。');
  }).catch(() => {});
  // 表情圖讀不出來時，退回預設姿勢，不要顯示破圖
  img.addEventListener('error', () => {
    const base = baseSrc();
    if (img.src.endsWith(base)) return;
    broken.add(img.getAttribute('src'));
    console.warn('[pet] 表情圖載入失敗：', img.getAttribute('src'));
    img.src = base;
  });
  function setFace(expr) {
    const k = FACE_IMG[expr], has = !naturalFace() && k && exprFor().includes(k);
    let want = has ? `mascots/${mascotId()}-x-${k}.webp` : baseSrc();
    if (broken.has(want)) want = baseSrc();
    if (!img.src.endsWith(want)) img.src = want;
  }

  // ---- 今日互動次數（存在這台裝置） ----
  const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  function bump() {
    const today = localDay(); let c = { day: today, n: 0 };
    try { const s = JSON.parse(localStorage.getItem('daily-pet-count') || 'null'); if (s && s.day === today) c = s; } catch {}
    c.n++;
    try { localStorage.setItem('daily-pet-count', JSON.stringify(c)); } catch {}
    paintCount(c.n);
  }
  function paintCount(n) { const today = localDay();
    if (n == null) { try { const s = JSON.parse(localStorage.getItem('daily-pet-count') || 'null'); n = s && s.day === today ? s.n : 0; } catch { n = 0; } }
    count.textContent = n ? `今天互動了 ${n} 次` : '點我、摸我、長按抱抱我';
  }

  // ---- 特效小工具 ----
  function imgBox() {
    const s = stage.getBoundingClientRect(), r = img.getBoundingClientRect();
    const ratio = Math.min(r.width / (img.naturalWidth || r.width), r.height / (img.naturalHeight || r.height));
    const w = (img.naturalWidth || r.width) * ratio, h = (img.naturalHeight || r.height) * ratio;
    return { x: r.left - s.left + (r.width-w)/2, y: r.top-s.top+r.height-h, w, h };
  }
  function spawn(cls, text, x, y, life = 1800, style = {}) {
    if (naturalFace() && (cls.startsWith('blush') || cls === 'tear' || cls === 'shy-mark')) return null;
    const e = document.createElement('span');
    e.className = 'fx ' + cls;
    if (text) e.textContent = text;
    e.style.left = x + 'px'; e.style.top = y + 'px';
    Object.assign(e.style, style);
    fx.append(e);
    setTimeout(() => e.remove(), life);
    return e;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearFx() { timers.forEach(clearTimeout); timers = []; fx.replaceChildren(); }

  const EFFECT = {
    smile(b) { for (let i = 0; i < 3; i++) later(() => spawn('note', pick(['♪', '♫']), b.x + b.w * rnd(.6, .95), b.y + b.h * .15, 1600), i * 300); },
    pat(b) {
      spawn('blush', '', b.x + b.w * .25, b.y + b.h * .45, 2400); spawn('blush', '', b.x + b.w * .75, b.y + b.h * .45, 2400);
      spawn('hand', '✋', b.x + b.w * .5, b.y - 6, 1600);
      for (let i = 0; i < 3; i++) later(() => spawn('heart-s', '♡', b.x + b.w * rnd(.2, .8), b.y + b.h * .1, 1600), 300 + i * 250);
    },
    poke(b, p) {
      const x = p ? p.x : b.x + b.w * .5, y = p ? p.y : b.y + b.h * .4;
      spawn('impact', '✦', x, y, 700);
      spawn('bang', '!', b.x + b.w * .88, b.y + b.h * .02, 1200);
    },
    tickle(b) {
      for (let i = 0; i < 6; i++) later(() => spawn('giggle', pick(['嘻', '哈', '嘿', '呵']), b.x + b.w * rnd(0, 1), b.y + b.h * rnd(.1, .6), 1300), i * 200);
      spawn('lines l', '≋', b.x - 8, b.y + b.h * .5, 2000); spawn('lines r', '≋', b.x + b.w + 8, b.y + b.h * .5, 2000);
    },
    love(b) {
      spawn('big-heart', '♥', b.x + b.w * .5, b.y + b.h * .45, 2600);
      for (let i = 0; i < 10; i++) later(() => spawn('heart', pick(['♥', '♡', '❤']), b.x + b.w * rnd(.05, .95), b.y + b.h * .7, 2200, { '--dx': rnd(-40, 40) + 'px' }), i * 140);
    },
    laugh(b) {
      ['哈', '哈', '哈'].forEach((t, i) => later(() => spawn('haha', t, b.x + b.w * (.2 + i * .3), b.y - 10, 1500), i * 220));
      for (let i = 0; i < 6; i++) later(() => spawn('spark', pick(['✦', '✧', '★']), b.x + b.w * rnd(-.1, 1.1), b.y + b.h * rnd(0, .7), 1400), i * 150);
    },
    cry(b) {
      spawn('rain-cloud', '☁', b.x + b.w * .5, b.y - 24, 3600);
      for (let i = 0; i < 9; i++) later(() => {
        spawn('tear', '', b.x + b.w * (i % 2 ? .36 : .64), b.y + b.h * .42, 1000);
        spawn('drop', '', b.x + b.w * rnd(.3, .7), b.y - 10, 1100);
      }, i * 330);
    },
    stress(b) {
      const m = spawn('mountain', '', b.x + b.w * .5, b.y, 2700);
      m.innerHTML = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M2 68L42 10L58 32L72 18L118 68Z" fill="#A7B0BC" stroke="#7D8794" stroke-width="3" stroke-linejoin="round"/><path d="M42 10L33 23L41 21L47 26L52 24Z" fill="#fff"/><path d="M72 18L66 27L72 25L78 28Z" fill="#fff"/><text x="60" y="58" text-anchor="middle" font-size="17" font-weight="700" fill="#4B5563">壓力</text></svg>';
      for (let i = 0; i < 4; i++) later(() => spawn('sweat', '', b.x + b.w * (i % 2 ? .1 : .9), b.y + b.h * .3, 1100), 400 + i * 380);
    },
    relief(b) {
      const m = spawn('mountain away', '', b.x + b.w * .5, b.y, 1200);
      m.innerHTML = '<svg viewBox="0 0 120 70" aria-hidden="true"><path d="M2 68L42 10L58 32L72 18L118 68Z" fill="#A7B0BC" stroke="#7D8794" stroke-width="3" stroke-linejoin="round"/></svg>';
      spawn('puff', '💨', b.x + b.w * .15, b.y + b.h * .5, 1400);
      for (let i = 0; i < 5; i++) later(() => spawn('spark', pick(['✦', '✧']), b.x + b.w * rnd(0, 1), b.y + b.h * rnd(0, .5), 1300), 400 + i * 150);
    },
    sleepy(b) { ['z', 'Z', 'Z'].forEach((t, i) => later(() => spawn('zzz', t, b.x + b.w * (.75 + i * .08), b.y + b.h * (.15 - i * .1), 2000), i * 700)); },
    shy(b) {
      spawn('blush big', '', b.x + b.w * .25, b.y + b.h * .45, 2400); spawn('blush big', '', b.x + b.w * .75, b.y + b.h * .45, 2400);
      spawn('shy-mark', '///', b.x + b.w * .85, b.y + b.h * .15, 2200);
    },
    joke(b) { spawn('spark', '💡', b.x + b.w * .85, b.y, 1600); },
    idle(b) { spawn('note', '…', b.x + b.w * .85, b.y + b.h * .05, 1600); }
  };
  const pick = l => l[Math.floor(Math.random() * l.length)];

  // ---- 播放表情 ----
  function play(expr, opts = {}) {
    clearTimeout(back);
    if (!opts.keepFx) clearFx();
    lastAct = Date.now();
    stage.dataset.expr = expr;
    setFace(expr === 'stress' ? 'stress' : expr);
    body.classList.remove('go'); void body.offsetWidth; body.classList.add('go');
    face.textContent = FACES[expr] || '🙂';
    face.classList.remove('pop'); void face.offsetWidth; face.classList.add('pop');
    say.textContent = opts.text || (expr === 'joke' ? MSG().pick(MSG().data.jokes) : MSG().line(expr === 'idle' ? 'idle' : expr));
    if (!reduced || ['love', 'cry', 'stress', 'pat'].includes(expr)) EFFECT[expr]?.(imgBox(), opts.point);
    if (expr === 'stress') { back = setTimeout(() => play('relief'), DUR.stress); return; }
    if (expr === 'joke') { back = setTimeout(() => play('laugh', { text: '哈哈哈，好冷喔！' }), DUR.joke); return; }
    back = setTimeout(rest, opts.hold || DUR[expr] || 2400);
  }
  function rest() { stage.dataset.expr = 'rest'; face.textContent = '🙂'; setFace(null); }
  window.dailyPet = { play };

  // ---- 手勢：點、連點、雙擊、長按 ----
  let taps = [], press = null, longDone = false, single = null;
  body.addEventListener('pointerdown', e => {
    longDone = false;
    press = setTimeout(() => { longDone = true; bump(); play('love', { text: MSG().line('love') }); }, 650);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => body.addEventListener(t, () => clearTimeout(press)));
  body.addEventListener('click', e => {
    if (longDone) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 900); taps.push(now);
    const s = stage.getBoundingClientRect();
    const point = e.clientX ? { x: e.clientX - s.left, y: e.clientY - s.top } : null;
    clearTimeout(single);
    if (taps.length >= 3) { taps = []; bump(); play('tickle'); return; }
    if (taps.length === 2) { single = setTimeout(() => { bump(); play('laugh'); }, 260); return; }
    single = setTimeout(() => { bump(); play('poke', { point }); }, 260);
  });
  // 滑鼠靠近時，小動物會往那邊歪頭
  stage.addEventListener('pointermove', e => {
    if (reduced || e.pointerType !== 'mouse') return;
    const s = stage.getBoundingClientRect();
    const dx = (e.clientX - s.left) / s.width - .5;
    stage.style.setProperty('--lean', (dx * 8).toFixed(1) + 'deg');
  });
  stage.addEventListener('pointerleave', () => stage.style.setProperty('--lean', '0deg'));

  document.querySelectorAll('[data-pet]').forEach(b => b.addEventListener('click', () => { bump(); play(b.dataset.pet); }));

  // ---- 閒置時偶爾自言自語 ----
  setInterval(() => {
    if (document.hidden || Date.now() - lastAct < 20000) return;
    const h = new Date().getHours();
    play(h >= 23 || h < 5 ? 'sleepy' : Math.random() < .5 ? 'idle' : 'smile');
  }, 9000);

  paintCount();
  window.addEventListener('daily-mascot', () => { preload(); play('smile', { text: '換我陪你囉！' }); });
  later(() => play('smile'), 600);
})();