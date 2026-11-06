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
    if (body.classList.contains('soft-pet') && (cls.startsWith('blush') || cls === 'tear' || cls === 'shy-mark')) return null;
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
// 暖色公仔插畫：五官位於同一個 SVG 頭部群組，不另疊表情圖片。
(()=>{
  const body=document.getElementById('petBody'),stage=document.getElementById('petStage'),img=document.getElementById('petImg');
  if(!body||!stage||!img)return;
  const css=document.createElement('style');css.textContent=`
  #petBody.soft-pet{width:220px;height:205px;margin-left:-110px;bottom:9px;isolation:isolate}
  #petBody.soft-pet #petImg{opacity:0!important;animation:none!important}
  .soft-pet-art{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;filter:drop-shadow(0 8px 5px #98775e18)}
  .sp-character{transform-origin:160px 299px;animation:sp-breathe 3.6s ease-in-out infinite}
  .sp-head{transform-origin:160px 188px;animation:sp-look 6s ease-in-out infinite}
  .sp-ear-l{transform-origin:129px 124px;animation:sp-ear 4s ease-in-out infinite}
  .sp-ear-r{transform-origin:192px 124px;animation:sp-ear 4s ease-in-out infinite reverse}
  .sp-eye{transform-box:fill-box;transform-origin:center;animation:sp-blink 5s infinite}
  .sp-cheek{opacity:.6;transition:opacity .3s}.sp-closed,.sp-open-mouth,.sp-tear{display:none}
  .sp-star{transform-box:fill-box;transform-origin:center;animation:sp-float 4s ease-in-out infinite}.sp-star.b{animation-delay:-2s}
  #petStage[data-expr=sleepy] .sp-eye,#petStage[data-expr=cry] .sp-eye,#petStage[data-expr=laugh] .sp-eye,#petStage[data-expr=tickle] .sp-eye{display:none}
  #petStage[data-expr=sleepy] .sp-closed,#petStage[data-expr=cry] .sp-closed,#petStage[data-expr=laugh] .sp-closed,#petStage[data-expr=tickle] .sp-closed{display:inline}
  #petStage[data-expr=cry] .sp-tear{display:inline;animation:sp-tear 1.6s ease-in infinite}
  #petStage[data-expr=love] .sp-cheek,#petStage[data-expr=shy] .sp-cheek,#petStage[data-expr=pat] .sp-cheek{opacity:1}
  #petStage[data-expr=poke] .sp-open-mouth{display:inline}#petStage[data-expr=poke] .sp-smile{display:none}
  #petStage[data-expr=sleepy] .sp-head{animation:none;transform:rotate(6deg)}
  #petStage[data-expr=love] .sp-character,#petStage[data-expr=poke] .sp-character{animation:sp-hop .7s ease-in-out 2}
  #petStage[data-expr=laugh] .sp-character,#petStage[data-expr=tickle] .sp-character{animation:sp-dance .65s ease-in-out 3}
  #petStage[data-expr=pat] .sp-head,#petStage[data-expr=shy] .sp-head{animation:sp-nuzzle 1s ease-in-out 2}
  #petStage[data-expr=stress] .sp-character{animation:sp-nuzzle .2s ease-in-out 10}
  #petBody.soft-pet:focus-visible{outline:3px solid #bd807a;outline-offset:5px;border-radius:32px}
  @keyframes sp-breathe{50%{transform:translateY(-2px) scale(1.012,1.008)}}
  @keyframes sp-look{25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}
  @keyframes sp-ear{50%{transform:rotate(-5deg)}}
  @keyframes sp-blink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.08)}}
  @keyframes sp-float{50%{transform:translateY(-7px) rotate(12deg)}}
  @keyframes sp-hop{40%{transform:translateY(-25px) rotate(-4deg)}70%{transform:scale(1.04,.96)}}
  @keyframes sp-dance{25%{transform:rotate(-7deg) translateY(-6px)}75%{transform:rotate(7deg) translateY(-6px)}}
  @keyframes sp-nuzzle{25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
  @keyframes sp-tear{0%{opacity:0;transform:translateY(0)}40%{opacity:.8}100%{opacity:0;transform:translateY(15px)}}
  @media(prefers-reduced-motion:reduce){#petBody.soft-pet *{animation:none!important;transition:none!important}}
  @media(max-width:600px){#petBody.soft-pet{width:205px;height:190px;margin-left:-102.5px}}
  `;document.head.append(css);
  const art=document.createElementNS('http://www.w3.org/2000/svg','svg');art.setAttribute('viewBox','0 0 320 330');art.setAttribute('aria-hidden','true');art.classList.add('soft-pet-art');
  let last='';
  function update(){
    const id=window.dailyTheme?.mascot?.()?.id||document.documentElement.dataset.mascot||'bunny';if(id===last)return;last=id;
    const cat=id==='cat',dog=id==='puppy',tiger=id==='tiger',elephant=id==='elephant',bunny=!cat&&!dog&&!tiger&&!elephant;
    const fur=elephant?['#eee1d9','#c5b4b2']:tiger?['#fbe0ad','#d9ac72']:cat?['#f7e2c8','#d7b48f']:dog?['#eed9ba','#c39b77']:['#fffbf1','#e7d2b6'];
    let ears='';
    if(bunny)ears=`<g class="sp-ear-l"><path d="M133 130C92 119 89 20 111 19C139 15 151 99 143 128" fill="url(#sp-fur)" stroke="#bc9e7a" stroke-opacity=".16"/><path d="M123 113C107 95 103 43 113 39C124 36 136 94 133 113" fill="url(#sp-pink)"/></g><g class="sp-ear-r"><path d="M177 128C168 92 184 12 207 20C233 28 211 117 187 132" fill="url(#sp-fur)" stroke="#bc9e7a" stroke-opacity=".16"/><path d="M186 112C183 89 199 38 205 40C216 44 202 98 194 115" fill="url(#sp-pink)"/></g>`;
    else if(cat)ears=`<path d="M91 143Q72 58 98 70L139 109M182 108L224 70Q249 60 231 145" fill="url(#sp-fur)" stroke="#c5a788" stroke-width="2"/><path d="M96 122L95 86L120 111M202 112L225 86L224 125" fill="url(#sp-pink)"/>`;
    else if(dog)ears=`<ellipse cx="84" cy="159" rx="29" ry="62" transform="rotate(13 84 159)" fill="#b18a68"/><ellipse cx="236" cy="159" rx="29" ry="62" transform="rotate(-13 236 159)" fill="#b18a68"/><ellipse cx="80" cy="164" rx="13" ry="38" fill="#cda58b"/><ellipse cx="240" cy="164" rx="13" ry="38" fill="#cda58b"/>`;
    else ears=`<ellipse cx="${elephant?81:101}" cy="${elephant?157:114}" rx="${elephant?43:25}" ry="${elephant?60:28}" fill="url(#sp-fur)"/><ellipse cx="${elephant?239:219}" cy="${elephant?157:114}" rx="${elephant?43:25}" ry="${elephant?60:28}" fill="url(#sp-fur)"/><ellipse cx="${elephant?77:101}" cy="${elephant?157:114}" rx="${elephant?26:14}" ry="${elephant?42:16}" fill="url(#sp-pink)"/><ellipse cx="${elephant?243:219}" cy="${elephant?157:114}" rx="${elephant?26:14}" ry="${elephant?42:16}" fill="url(#sp-pink)"/>`;
    art.innerHTML=`<defs><radialGradient id="sp-fur" cx="30%" cy="20%" r="85%"><stop stop-color="${fur[0]}"/><stop offset=".65" stop-color="${fur[0]}"/><stop offset="1" stop-color="${fur[1]}"/></radialGradient><radialGradient id="sp-pink"><stop stop-color="#f6d3cb"/><stop offset="1" stop-color="#e4b2aa"/></radialGradient><radialGradient id="sp-blush"><stop stop-color="#e9a49b" stop-opacity=".9"/><stop offset="1" stop-color="#e9a49b" stop-opacity="0"/></radialGradient><radialGradient id="sp-eye"><stop stop-color="#816353"/><stop offset="1" stop-color="#493b33"/></radialGradient><radialGradient id="sp-shadow"><stop stop-color="#98775e" stop-opacity=".18"/><stop offset="1" stop-color="#98775e" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="160" cy="308" rx="91" ry="13" fill="url(#sp-shadow)"/>
    <g fill="#dfbf76"><path class="sp-star" d="M47 105L50 115L61 118L50 122L47 133L43 122L33 118L43 115Z"/><path class="sp-star b" d="M272 195L275 203L283 206L275 209L272 217L269 209L261 206L269 203Z"/></g><circle cx="265" cy="88" r="3" fill="#decbae"/><circle cx="49" cy="247" r="3" fill="#decbae"/>
    <g class="sp-character">
    ${cat?'<path d="M211 279C273 286 266 224 249 236" fill="none" stroke="'+fur[1]+'" stroke-width="19" stroke-linecap="round"/>':''}
    <ellipse cx="160" cy="248" rx="59" ry="57" fill="url(#sp-fur)"/><ellipse cx="160" cy="253" rx="35" ry="39" fill="#fff7e9"/>
    <ellipse cx="116" cy="295" rx="33" ry="15" fill="url(#sp-fur)"/><ellipse cx="204" cy="295" rx="33" ry="15" fill="url(#sp-fur)"/>
    <ellipse cx="109" cy="248" rx="16" ry="28" transform="rotate(-20 109 248)" fill="url(#sp-fur)"/><ellipse cx="211" cy="248" rx="16" ry="28" transform="rotate(20 211 248)" fill="url(#sp-fur)"/>
    <g class="sp-head">${ears}
    <path d="M160 101C108 100 78 124 78 168C75 213 111 233 160 233C209 233 245 213 242 168C242 124 212 100 160 101Z" fill="url(#sp-fur)" stroke="#b99978" stroke-opacity=".13"/>
    <ellipse cx="135" cy="126" rx="29" ry="11" fill="#fffdf7" opacity=".22"/>
    ${dog?'<ellipse cx="160" cy="190" rx="43" ry="26" fill="#fff2de"/>':''}
    ${tiger?'<g fill="#a77c55"><path d="M153 102L160 130L167 102Z"/><path d="M130 108L141 127L145 105Z"/><path d="M177 105L180 127L192 108Z"/><path d="M80 158L105 167L80 171Z"/><path d="M240 158L215 167L240 171Z"/></g>':''}
    <g class="sp-eye"><ellipse cx="130" cy="165" rx="7" ry="9" fill="url(#sp-eye)"/><circle cx="128" cy="162" r="2.1" fill="#fff8ec"/></g>
    <g class="sp-eye"><ellipse cx="190" cy="165" rx="7" ry="9" fill="url(#sp-eye)"/><circle cx="188" cy="162" r="2.1" fill="#fff8ec"/></g>
    <g class="sp-closed" fill="none" stroke="#826451" stroke-width="3" stroke-linecap="round"><path d="M121 168Q130 160 139 168M181 168Q190 160 199 168"/></g>
    <g class="sp-cheek"><ellipse cx="109" cy="187" rx="23" ry="13" fill="url(#sp-blush)"/><ellipse cx="211" cy="187" rx="23" ry="13" fill="url(#sp-blush)"/></g>
    ${elephant?'<path d="M158 184Q147 205 155 230Q165 244 178 227" fill="none" stroke="'+fur[1]+'" stroke-width="18" stroke-linecap="round"/><path d="M158 202L165 202M158 210L166 210" stroke="#aa9691" stroke-width="2"/>':`<path d="M153 183Q160 178 167 183Q166 190 160 191Q154 190 153 183" fill="${dog?'#725a4a':'#d39b94'}"/><path class="sp-smile" d="M160 191L160 197Q153 206 145 199M160 197Q167 206 175 199" fill="none" stroke="#9e7b66" stroke-width="2" stroke-linecap="round"/><ellipse class="sp-open-mouth" cx="160" cy="203" rx="6" ry="8" fill="#a77d72"/>`}
    ${cat?'<path d="M99 182L76 178M100 191L74 193M221 182L244 178M220 191L246 193" stroke="#b49679" stroke-width="1.5" stroke-linecap="round"/>':''}
    <g class="sp-tear" fill="#a7d3df"><path d="M123 176Q113 190 123 191Q132 190 123 176"/><path d="M197 176Q187 190 197 191Q207 190 197 176"/></g>
    </g>
    <path d="M133 227Q160 237 187 227L183 239Q159 247 137 239Z" fill="#d6aaa0"/><path d="M176 237L187 260L171 255L164 241" fill="#e4bbb0"/>
    <circle cx="160" cy="240" r="5" fill="#e5c583"/><path d="M159 242L162 242" stroke="#b69659" stroke-width="1"/>
    </g>`;
    body.classList.add('soft-pet');if(!art.isConnected)body.append(art);
  }
  window.addEventListener('daily-mascot',update);update();
})();
