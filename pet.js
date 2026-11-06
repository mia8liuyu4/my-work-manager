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
// 3D 公仔層：只替換貓與狗；原互動、圖片與其他動物仍保留。
(async () => {
  'use strict';
  const body = document.getElementById('petBody');
  const img = document.getElementById('petImg');
  const stage = document.getElementById('petStage');
  if (!body || !img || !stage) return;
  let THREE;
  try { THREE = await import(new URL('vendor/three.module.js', location.href).href); }
  catch (e) { console.warn('[pet3d] 使用原本圖片', e); return; }
  const style = document.createElement('style');
  style.textContent = '#petBody.pet-3d-active{overflow:visible}#petBody.pet-3d-active #petImg{opacity:0!important}#petBody .pet-3d-canvas{position:absolute;inset:0;width:100%!important;height:100%!important;pointer-events:none}';
  document.head.append(style);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'pet-3d-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  body.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  camera.position.set(0, 1.6, 8.4); camera.lookAt(0, 1.38, 0);
  scene.add(new THREE.HemisphereLight(0xfff7eb, 0x998680, 2.7));
  const light = new THREE.DirectionalLight(0xffe9d0, 3.6); light.position.set(-3,5,5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xffffff, 2); rim.position.set(4,3,-3); scene.add(rim);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let root, head, tail, eyes = [], cheeks = [], current = '', active = false, visible = true;
  let aim = 0, exprAt = performance.now(), lastExpr = '', lastTime = 0;
  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness:.78, metalness:0}));
    return materials.get(color);
  }
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  function ball(parent, color, x,y,z, sx,sy,sz) {
    const m = new THREE.Mesh(sphere, material(color)); m.position.set(x,y,z); m.scale.set(sx,sy,sz); parent.add(m); return m;
  }
  function stroke(parent, points, color, radius=.018) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,8,false),material(color)); parent.add(m); return m;
  }
  function ear(parent, x, color, inner) {
    const group = new THREE.Group(); group.position.set(x, .67, .02); group.rotation.z = x < 0 ? .22 : -.22; parent.add(group);
    const shape = new THREE.Shape(); shape.moveTo(-.27,0); shape.quadraticCurveTo(-.25,.4,0,.76); shape.quadraticCurveTo(.12,.8,.27,0); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSize:.075,bevelThickness:.08,bevelSegments:4,steps:1,curveSegments:20});
    const mesh = new THREE.Mesh(geometry,material(color)); group.add(mesh);
    ball(group,inner,0,.30,.27,.12,.24,.035);
  }
  function build(id) {
    if (root) { scene.remove(root); root.traverse(o => { if(o.geometry && o.geometry !== sphere) o.geometry.dispose(); }); }
    root = new THREE.Group(); scene.add(root); eyes=[]; cheeks=[];
    const cat=id==='cat', fur=cat ? 0xe5b98f : 0xc79b72, cream=0xffedda, dark=0x45322d;
    ball(root,fur,0,.84,0,.67,.78,.49);
    ball(root,cream,0,.80,.43,.43,.52,.13);
    for(const x of [-.4,.4]) { ball(root,fur,x,.23,.28,.30,.22,.37); ball(root,cream,x,.25,.53,.21,.14,.15); }
    for(const x of [-.62,.62]) { const arm=ball(root,fur,x,.85,.13,.21,.43,.23); arm.rotation.z=x<0?-.24:.24; }
    tail=new THREE.Group(); tail.position.set(cat?.54:.48,.53,-.3); root.add(tail);
    if(cat) stroke(tail,[[0,0,0],[.48,.12,0],[.63,.55,0],[.48,.78,0]],fur,.13);
    else { const t=ball(tail,fur,.27,.22,0,.15,.40,.15); t.rotation.z=-.8; }
    head=new THREE.Group(); head.position.set(0,1.92,.06); root.add(head);
    ball(head,fur,0,0,0,.88,.75,.64);
    if(cat) { ear(head,-.57,fur,0xe5a6a0); ear(head,.57,fur,0xe5a6a0); }
    else for(const x of [-.76,.76]) { const e=ball(head,0x957052,x,-.04,-.01,.28,.63,.28); e.rotation.z=x<0?-.26:.26; ball(head,0xb78a70,x,-.13,.22,.13,.35,.055); }
    ball(head,cream,0,-.25,.51,cat?.43:.51,.29,.22);
    for(const x of [-.33,.33]) {
      const eye = new THREE.Group(); eye.position.set(x,.06,.586); head.add(eye); eyes.push(eye);
      ball(eye,dark,0,0,0,.095,.135,.055);
      ball(eye,0xffffff,-.026,.048,.049,.026,.033,.014);
      ball(eye,0xffe5c6,.025,-.044,.049,.012,.016,.009);
      const brow=ball(head,fur,x,.26,.555,.14,.045,.045); brow.rotation.z=x<0?.1:-.1;
      cheeks.push(ball(head,0xe9a29a,x*1.55,-.20,.51,.14,.065,.035));
    }
    ball(head,cat?0x986d64:dark,0,-.15,.75,cat?.095:.15,.075,.07);
    stroke(head,[[0,-.20,.735],[0,-.28,.74],[-.12,-.32,.71],[-.19,-.27,.68]],dark,.015);
    stroke(head,[[0,-.28,.74],[.12,-.32,.71],[.19,-.27,.68]],dark,.015);
    if(cat) {
      for(const side of [-1,1]) for(let i=0;i<3;i++) stroke(head,[[side*.43,-.24-i*.065,.59],[side*.68,-.21-i*.09,.58],[side*.89,-.17-i*.12,.46]],0x9e7963,.009);
      for(const x of [-.20,0,.20]) ball(head,0xb58763,x,.48,.46,.045,.16,.028);
    }
    // 公仔頸巾與鈴鐺
    const band=new THREE.Mesh(new THREE.TorusGeometry(.45,.075,12,48),material(0xb98982)); band.rotation.x=Math.PI/2; band.position.set(0,1.43,.03); root.add(band);
    ball(root,0xe9bd72,0,1.37,.51,.105,.11,.08);
    stroke(root,[[-.04,1.35,.588],[.04,1.35,.588]],0x876541,.009);
  }
  function mascot() { return window.dailyTheme?.mascot?.()?.id || (img.getAttribute('src')||'').match(/(?:^|\/)(cat|puppy)-/)?.[1] || 'bunny'; }
  function update() {
    const id=mascot(); active=['cat','puppy'].includes(id);
    body.classList.toggle('pet-3d-active',active); renderer.domElement.hidden=!active;
    if(active && id!==current) { current=id; build(id); }
    resize();
  }
  function resize() {
    const r=body.getBoundingClientRect(); if(!r.width||!r.height) return;
    renderer.setSize(r.width,r.height,false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix();
    // 窄容器也保留耳朵與尾巴的完整範圍。
    camera.position.z=Math.max(8.4,6.6/camera.aspect); camera.lookAt(0,1.48,0);
  }
  const ro=new ResizeObserver(resize); ro.observe(body);
  new MutationObserver(update).observe(img,{attributes:true,attributeFilter:['src']});
  window.addEventListener('daily-mascot',()=>setTimeout(update,0));
  stage.addEventListener('pointermove',e=>{ const r=stage.getBoundingClientRect(); aim=Math.max(-.35,Math.min(.35,((e.clientX-r.left)/r.width-.5)*.7)); });
  stage.addEventListener('pointerleave',()=>{aim=0;});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;body.classList.remove('pet-3d-active');renderer.domElement.hidden=true;});
  renderer.domElement.addEventListener('webglcontextrestored',update);
  if('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(stage);
  function frame(t) {
    requestAnimationFrame(frame);
    if(!active || !visible || document.hidden || t-lastTime<33) return;
    lastTime=t; const expr=stage.dataset.expr || 'rest';
    if(expr!==lastExpr) { lastExpr=expr; exprAt=t; }
    const elapsed=(t-exprAt)/1000, sec=t/1000;
    const happy=['love','pat','laugh','tickle','smile','relief','shy'].includes(expr);
    const asleep=expr==='sleepy';
    root.position.y=reduced?0:Math.sin(sec*2)*.025;
    root.rotation.y += ((reduced?0:aim*.55)-root.rotation.y)*.12;
    head.rotation.y += ((reduced?0:aim)-head.rotation.y)*.12;
    head.rotation.z=reduced?0:(happy?Math.sin(sec*4)*.045:expr==='stress'?Math.sin(sec*10)*.04:asleep?.12:Math.sin(sec*.8)*.022);
    head.rotation.x=asleep?.12:0;
    tail.rotation.z=reduced?0:Math.sin(sec*(happy?10:2.3))*(happy?.30:.09);
    const blink=!reduced && sec%4.7<.14;
    eyes.forEach(eye=> {eye.scale.y=asleep?.13:blink?.08:happy?.68:expr==='poke'?1.2:1;});
    cheeks.forEach(c=>{c.visible=happy;});
    if(!reduced && ['poke','laugh','tickle'].includes(expr) && elapsed<.7) root.position.y+=Math.abs(Math.sin(elapsed*15))*.13*(1-elapsed/.7);
    renderer.render(scene,camera);
  }
  update(); requestAnimationFrame(frame);
})();
