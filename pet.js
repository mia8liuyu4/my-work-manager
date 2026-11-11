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
  function preload() {}
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
    if (body.classList.contains('plush-pet') && (cls.startsWith('blush') || cls === 'tear' || cls === 'shy-mark')) return null;
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

  const FULL_POSES = [
    ['idle','放空','靜靜陪著你。'],['smile','微笑','看到你真開心！'],['laugh','大笑','哈哈哈，今天也要笑一笑！'],['shy','害羞','被你稱讚，好害羞～'],['cry','哭泣','給我一個抱抱，好嗎？'],['surprised','驚訝','哇！發生什麼事了？'],
    ['angry','生氣','哼！先深呼吸一下。'],['sleep','睡覺','晚安，做個好夢。'],['blink','眨眼','送你一個俏皮的眨眼！'],['wave','揮手','嗨嗨，我在這裡！'],['jump','跳跳','開心到跳起來！'],['dance','跳舞','一起搖擺一下吧！'],
    ['eat','吃點心','補充一點能量～'],['stretch','伸懶腰','伸個懶腰，重新出發！'],['celebrate','慶祝','太棒了！值得慶祝！'],['curious','好奇','讓我看看，是什麼呢？'],['pet','被摸摸','好舒服，還想再被摸摸～'],['chase-star','追星星','一起追一顆小星星！']
  ];

  Object.assign(FACES,{surprised:'😮',angry:'😠',sleep:'😴',blink:'😉',wave:'👋',jump:'✨',dance:'🎵',eat:'🍪',stretch:'🌤️',celebrate:'🎉',curious:'🤔',pet:'🥰','chase-star':'⭐'});
  // ---- 播放表情 ----
  function play(expr, opts = {}) {
    clearTimeout(back);
    if (!opts.keepFx) clearFx();
    lastAct = Date.now();
    if(window.dailyPet)window.dailyPet.lastAction=lastAct;
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
  window.dailyPet = { play, poses: FULL_POSES.map(([id,label])=>({id,label})) };
  window.addEventListener('daily-pet-pose',e=>{const entry=FULL_POSES.find(p=>p[0]===e.detail?.pose);if(!entry)return;bump();play(entry[0],{text:entry[2],hold:e.detail?.hold||4500});});

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
// 立體公仔圖片整合：兔兔使用提供的 18 張姿勢，其餘動物共用六種完整表情。
(()=>{
  const body=document.getElementById('petBody'),stage=document.getElementById('petStage'),img=document.getElementById('petImg');if(!body||!stage||!img)return;
  const root=new URL('mascots/plush/',document.currentScript?.src||location.href).href;
  const style=document.createElement('style');style.textContent=`
  #petBody.plush-pet{width:220px;height:205px;margin-left:-110px;bottom:8px}
  #petBody.plush-pet #petImg{opacity:0!important;animation:none!important}
  .plush-art{position:absolute;left:50%;bottom:0;width:205px;height:205px;margin-left:-102.5px;border-radius:30px;background-color:#fbf5eb;background-repeat:no-repeat;pointer-events:none;transform-origin:50% 88%;animation:plush-idle 3.2s ease-in-out infinite;box-shadow:0 8px 20px #98775e0a}
  .plush-art.bunny{background-size:600% 300%}
  .plush-art.atlas{background-size:600% 400%}
  #petStage[data-expr=jump] .plush-art,#petStage[data-expr=chase-star] .plush-art,#petStage[data-expr=poke] .plush-art,#petStage[data-expr=love] .plush-art{animation:plush-jump .7s ease 2}
  #petStage[data-expr=dance] .plush-art,#petStage[data-expr=celebrate] .plush-art,#petStage[data-expr=laugh] .plush-art,#petStage[data-expr=tickle] .plush-art{animation:plush-dance .75s ease 3}
  #petStage[data-expr=wave] .plush-art,#petStage[data-expr=pet] .plush-art,#petStage[data-expr=pat] .plush-art,#petStage[data-expr=shy] .plush-art{animation:plush-pat .8s ease 2}
  #petStage[data-expr=cry] .plush-art{animation:plush-sob 1s ease-in-out 3}
  #petStage[data-expr=stress] .plush-art{animation:plush-sob .35s ease-in-out 6}
  #petBody.plush-pet:focus-visible{outline:3px solid #ba8b79;outline-offset:4px;border-radius:30px}
  @keyframes plush-idle{50%{transform:translateY(-3px)}}
  @keyframes plush-jump{40%{transform:translateY(-24px) rotate(-4deg)}75%{transform:scale(1.025,.98)}}
  @keyframes plush-dance{25%{transform:rotate(-7deg) translateY(-5px)}75%{transform:rotate(7deg) translateY(-5px)}}
  @keyframes plush-pat{50%{transform:scale(1.025,.975) rotate(2deg)}}
  @keyframes plush-sob{50%{transform:translateY(2px) rotate(-1.5deg)}}
  @media(max-width:600px){#petBody.plush-pet{height:190px}.plush-art{width:190px;height:190px;margin-left:-95px}}
  @media(prefers-reduced-motion:reduce){#petBody.plush-pet .plush-art{animation:none!important}}
  `;document.head.append(style);
  const art=document.createElement('span');art.className='plush-art';art.setAttribute('aria-hidden','true');body.append(art);
  const row={cat:0,puppy:1,tiger:2,elephant:3};
  const expressions={rest:0,idle:0,smile:0,relief:0,joke:0,pat:2,love:2,shy:2,laugh:1,tickle:1,cry:3,stress:4,poke:4,sleepy:5};
  const bunny={rest:'idle',idle:'idle',smile:'smile',relief:'celebrate',joke:'curious',pat:'pet',love:'shy',shy:'shy',laugh:'laugh',tickle:'dance',cry:'cry',stress:'angry',poke:'surprised',sleepy:'sleep'};
  const bunnyCells={idle:0,smile:1,laugh:2,shy:3,cry:4,surprised:5,angry:6,sleep:7,blink:8,wave:9,jump:10,dance:11,eat:12,stretch:13,celebrate:14,curious:15,pet:16,'chase-star':17};
  const ready=new Map();let version=0,lastKey='',disposed=false;
  function load(url){if(!ready.has(url))ready.set(url,new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=()=>{ready.delete(url);reject(Error('圖片載入失敗'))};i.src=url;}));return ready.get(url);}
  function id(){return window.dailyTheme?.mascot?.()?.id||document.documentElement.dataset.mascot||'bunny';}
  async function update(){
    const animal=id(),expr=stage.dataset.expr||'rest',key=animal+':'+expr;if(key===lastKey)return;lastKey=key;const ticket=++version;
    const isBunny=animal==='bunny',url=root+(isBunny?'bunny-corrected-atlas.png':animal+'-18.png');
    if(!isBunny && row[animal]===undefined){body.classList.remove('plush-pet');art.hidden=true;return;}
    try{
      await load(url);if(ticket!==version||disposed)return;
      art.className='plush-art bunny';art.style.backgroundImage='url("'+url+'")';
      const displayExpr=expr==='rest'?(window.dailyWeather?.restPose||'idle'):expr;
      const cell=bunnyCells[displayExpr]??bunnyCells[bunny[displayExpr]||'idle'];
      art.style.backgroundPosition=`${cell%6*20}% ${Math.floor(cell/6)*50}%`;
      art.dataset.pose=Object.keys(bunnyCells).find(k=>bunnyCells[k]===cell);
      art.dataset.animal=animal;
      body.classList.add('plush-pet');art.hidden=false;
    }catch{if(ticket===version){body.classList.remove('plush-pet');art.hidden=true;lastKey='';}}
  }
  new MutationObserver(update).observe(stage,{attributes:true,attributeFilter:['data-expr']});
  window.addEventListener('daily-mascot',update);
  window.addEventListener('daily-weather',()=>{lastKey='';update();});update();
  // Use supplied bunny blink frame without replacing an active emotion or racing a newer action.
  const blink=setInterval(async()=>{
    if(document.hidden||stage.dataset.expr!=='rest'||window.dailyWeather?.restPose==='sleep')return;
    const ticket=version,animal=id(),url=root+(animal==='bunny'?'bunny-corrected-atlas.png':animal+'-18.png');try{await load(url);if(ticket!==version)return;art.style.backgroundImage='url("'+url+'")';art.style.backgroundPosition='40% 50%';setTimeout(()=>{if(ticket===version){lastKey='';update();}},170);}catch{}
  },5200);
  window.addEventListener('pagehide',e=>{if(!e.persisted){disposed=true;clearInterval(blink);}});
  window.addEventListener('pageshow',()=>{disposed=false;lastKey='';update();});
})();

// 全部姿勢公開選單：五種動物使用同一組18個選項。
(()=>{
  const stage=document.getElementById('petStage'),api=window.dailyPet;if(!stage||!api?.poses||stage.dataset.petMode!=='full')return;
  const panel=document.createElement('section');panel.className='pet-pose-panel';panel.setAttribute('aria-label','全部表情與動作');
  const style=document.createElement('style');style.textContent=`.pet-pose-panel{margin-top:16px;padding:15px;border:1px solid var(--line,#eadccd);border-radius:18px;background:var(--surface,#fffaf2);color:var(--ink,#876d59)}.pet-pose-panel h3{font-size:14px;margin:0 0 10px}.pet-pose-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.pet-pose-panel button{font:inherit;font-size:12px;min-height:40px;border:1px solid var(--line,#eadccd);border-radius:12px;background:var(--surface2,#fff5e8);color:inherit;cursor:pointer;padding:7px 4px}.pet-pose-panel button[aria-pressed=true]{background:#c5947e;color:#fff;border-color:#c5947e}.pet-pose-tools{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}.pet-pose-tools button{padding:8px 12px}.pet-pose-status{min-height:20px;font-size:12px;line-height:1.6;color:var(--muted,#9f8270);margin:8px 0 0}.pet-pose-panel button:focus-visible{outline:3px solid #bc8875;outline-offset:2px}`;document.head.append(style);
  panel.innerHTML='<h3>全部表情與動作 · 18 種</h3><div class="pet-pose-grid"></div><div class="pet-pose-tools"><button type="button" data-pose-tool="cycle">輪播全部</button><button type="button" data-pose-tool="random">隨機一個</button><button type="button" data-pose-tool="rest">回到休息</button></div><p class="pet-pose-status" role="status" aria-live="polite">每一種都可以直接點選。</p>';
  const grid=panel.querySelector('.pet-pose-grid'),status=panel.querySelector('.pet-pose-status'),cycle=panel.querySelector('[data-pose-tool="cycle"]');
  for(const pose of api.poses){const button=document.createElement('button');button.type='button';button.dataset.pose=pose.id;button.textContent=pose.label;button.setAttribute('aria-pressed','false');grid.append(button);}
  const existing=stage.parentElement.querySelector('.pet-actions');if(existing)existing.after(panel);else stage.after(panel);
  let timer=null,index=0;
  function stop(){clearTimeout(timer);timer=null;cycle.textContent='輪播全部';cycle.setAttribute('aria-pressed','false');}
  function choose(pose,cycling=false){if(!cycling)stop();window.dispatchEvent(new CustomEvent('daily-pet-pose',{detail:{pose,hold:cycling?2800:4500}}));}
  function step(){if(document.hidden){stop();return;}const pose=api.poses[index++%api.poses.length];choose(pose.id,true);status.textContent='輪播中：'+pose.label+'（'+((index-1)%18+1)+'/18）';timer=setTimeout(step,2400);}
  panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.pose){choose(b.dataset.pose);return;}if(b.dataset.poseTool==='cycle'){if(timer){stop();status.textContent='輪播已停止。';}else{index=0;cycle.textContent='停止輪播';cycle.setAttribute('aria-pressed','true');step();}}else if(b.dataset.poseTool==='random'){choose(api.poses[Math.floor(Math.random()*api.poses.length)].id);}else{stop();api.play('idle',{text:'我在這裡陪你。',hold:1000});}});
  function paint(){const expr=stage.dataset.expr;panel.querySelectorAll('[data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pose===expr)));if(!timer){const p=api.poses.find(p=>p.id===expr);status.textContent=p?'目前：'+p.label:'每一種都可以直接點選。';}}
  new MutationObserver(paint).observe(stage,{attributes:true,attributeFilter:['data-expr']});
  window.addEventListener('relax-game',e=>{if(e.detail!=='pet')stop();});
  stage.addEventListener('pointerdown',stop);document.addEventListener('click',e=>{if(e.target.closest('[data-pet]'))stop();},true);
  window.addEventListener('daily-mascot',()=>{stop();paint();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);paint();
})();
