// 打老闆：點頭像搧巴掌（或拖鞋、玩具槌）。可以上傳照片當頭像；照片只在你的瀏覽器裡處理，不會上傳。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('slapStage');
  if (!stage) return;
  const head = $('slapHead'), face = $('slapFace'), tool = $('slapTool'), fx = $('slapFx'), redness = $('slapRed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const talk = (t, e) => window.relaxTalk && window.relaxTalk(t, e);
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const today = new Date().toISOString().slice(0, 10);
  const DEFAULT = 'slap-boss.svg';
  // 拖鞋用自己畫的圖（拖鞋的表情符號在較舊的電腦上顯示不出來）
  const SLIPPER = '<svg viewBox="0 0 60 100" width="0.62em" height="1em" aria-hidden="true"><path d="M30 4C46 4 54 18 52 38C50 56 46 64 47 78C48 92 40 98 30 98C20 98 12 92 13 78C14 64 10 56 8 38C6 18 14 4 30 4Z" fill="#F6C95C" stroke="#8A5A1F" stroke-width="3"/><path d="M30 9C42 9 48 20 46 37C44 54 41 63 42 77C43 88 37 93 30 93C23 93 17 88 18 77C19 63 16 54 14 37C12 20 18 9 30 9Z" fill="#FFF4D6"/><path d="M30 24L13 50M30 24L47 50" stroke="#3D7CC9" stroke-width="7" stroke-linecap="round"/><circle cx="30" cy="24" r="4" fill="#2F5F9E"/></svg>';
  const TOOLS = { hand: { emoji: '🖐️', word: '啪！' }, slipper: { emoji: '', word: '啪噠！' }, hammer: { emoji: '🔨', word: '啾～' } };
  let weapon = 'hand', count = 0, combo = 0, last = 0, heat = 0, side = 1;
  try { const s = JSON.parse(localStorage.getItem('daily-slap') || '{}'); if (s.day === today) count = s.count || 0; if (TOOLS[s.weapon]) weapon = s.weapon; } catch {}
  const save = () => { try { localStorage.setItem('daily-slap', JSON.stringify({ day: today, count, weapon })); } catch {} };

  const SORRY = ['對不起我錯了！', '今天準時下班！', '這週不開會了！', '加薪！加薪！', '報告我自己寫！', '再也不半夜傳訊息了！', '你說的都對！', '饒了我吧～', '明天放你假！', '我請大家喝飲料！'];
  const CHEER = { 10: '打得好！氣有沒有消一點？', 30: '三十下了，手會不會痛？', 50: '五十下！今天的怨氣清空中～', 100: '一百下！好了好了，喝口水休息一下 🍵' };

  // ---- 音效 ----
  function hitSound() {
    if (!window.relaxSound || !window.relaxSound()) return;
    const ctx = window.relaxAudio && window.relaxAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const noise = (dur, type, freq, vol) => {
      const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = buf; f.type = type; f.frequency.value = freq; g.gain.value = vol;
      n.connect(f).connect(g).connect(ctx.destination); n.start(t);
    };
    const tone = (f1, f2, dur, vol, type = 'sine') => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    if (weapon === 'hand') { noise(0.11, 'highpass', 900, 1.1); tone(180, 70, 0.1, 0.5); }
    else if (weapon === 'slipper') { noise(0.07, 'bandpass', 2600, 1.3); noise(0.14, 'lowpass', 600, 0.6); }
    else { tone(700, 1500, 0.12, 0.35, 'square'); tone(1500, 600, 0.18, 0.25); noise(0.05, 'lowpass', 400, 0.6); }
  }

  function spawn(cls, text, x, y, life) {
    const e = document.createElement('span');
    e.className = 'sfx ' + cls; if (text) e.textContent = text;
    e.style.left = x + 'px'; e.style.top = y + 'px';
    fx.append(e); setTimeout(() => e.remove(), life);
    return e;
  }

  function hit(e) {
    const s = stage.getBoundingClientRect(), h = head.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : h.left + h.width * (side > 0 ? .3 : .7);
    const y = e && e.clientY ? e.clientY : h.top + h.height * .55;
    side = x < h.left + h.width / 2 ? 1 : -1;            // 打左臉 → 頭往右甩
    const now = Date.now(); combo = now - last < 600 ? combo + 1 : 1; last = now;
    count++; save(); $('slapCount').textContent = count;
    heat = Math.min(1, heat + 0.12); redness.style.opacity = (heat * 0.45).toFixed(2);
    hitSound(); window.relaxBuzz && window.relaxBuzz(weapon === 'hammer' ? 15 : 30);

    // 頭甩開、工具揮過來
    head.style.setProperty('--side', side);
    stage.style.setProperty('--side', side);
    head.classList.remove('hit'); void head.offsetWidth; head.classList.add('hit');
    if (weapon === 'slipper') tool.innerHTML = SLIPPER; else tool.textContent = TOOLS[weapon].emoji;
    tool.classList.remove('swing', 'from-left', 'from-right'); void tool.offsetWidth;
    tool.classList.add('swing', side > 0 ? 'from-left' : 'from-right');

    const px = x - s.left, py = y - s.top;
    if (weapon === 'hand') {
      const mark = document.createElement('i');
      mark.className = 'palm';
      mark.style.left = (x - h.left) + 'px'; mark.style.top = (y - h.top) + 'px';
      mark.style.setProperty('--r', (side > 0 ? -20 : 20) + Math.random() * 16 - 8 + 'deg');
      $('slapMarks').append(mark); setTimeout(() => mark.remove(), 1600);
    }
    spawn('pow', TOOLS[weapon].word, px + side * -30, py - 30, 700);
    if (!reduced) for (let i = 0; i < 4; i++) spawn('star', pick(['✦', '★', '✧']), px + (Math.random() * 70 - 35), py + (Math.random() * 50 - 25), 650);
    if (combo >= 5 && !stage.classList.contains('dizzy')) { stage.classList.add('dizzy'); setTimeout(() => stage.classList.remove('dizzy'), 2200); }

    if (count % 3 === 0 || combo === 1) { $('slapSay').textContent = pick(SORRY); $('slapBubble').classList.remove('show'); void $('slapBubble').offsetWidth; $('slapBubble').classList.add('show'); }
    if (CHEER[count]) talk(CHEER[count], count >= 100 ? '😅' : '💪');
    else if (combo === 10) talk('連續十下！好兇喔～', '😲');
  }
  setInterval(() => { if (heat > 0) { heat = Math.max(0, heat - 0.05); redness.style.opacity = (heat * 0.45).toFixed(2); } }, 600);

  head.addEventListener('pointerdown', e => { e.preventDefault(); hit(e); });
  head.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });

  // ---- 工具 ----
  function setWeapon(w) {
    weapon = w; save();
    document.querySelectorAll('[data-weapon]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.weapon === w)));
  }
  document.querySelectorAll('[data-weapon]').forEach(b => { b.onclick = () => setWeapon(b.dataset.weapon); });
  setWeapon(weapon);

  // ---- 自訂頭像 ----
  function useFace(src, name) {
    face.src = src || DEFAULT;
    stage.classList.toggle('custom', !!src);
    $('nameTag').textContent = name || '老闆';
    $('slapName').value = name || '';
  }
  try { const saved = JSON.parse(localStorage.getItem('daily-slap-face') || 'null'); if (saved) { useFace(saved.img, saved.name); $('slapRemember').checked = true; } } catch {}
  function persist() {
    try {
      if ($('slapRemember').checked && stage.classList.contains('custom')) localStorage.setItem('daily-slap-face', JSON.stringify({ img: face.src, name: $('slapName').value.trim() }));
      else localStorage.removeItem('daily-slap-face');
    } catch { $('slapNote').textContent = '照片太大，沒辦法記住；這次還是可以打。'; }
  }
  $('slapFile').onchange = () => {
    const file = $('slapFile').files[0];
    $('slapFile').value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), size = 360; c.width = c.height = size;
      const g = c.getContext('2d'), z = +$('slapZoom').value || 1;
      const side = Math.min(img.width, img.height) / z;
      const sx = (img.width - side) / 2, sy = Math.max(0, (img.height - side) / 2 - side * 0.08);
      g.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      lastImg = img;
      useFace(c.toDataURL('image/jpeg', 0.85), $('slapName').value.trim());
      persist();
      talk('換好頭像了，盡情搧吧！', '😤');
    };
    img.onerror = () => { URL.revokeObjectURL(url); $('slapNote').textContent = '這張圖讀不出來，換一張試試。'; };
    img.src = url;
  };
  let lastImg = null;
  $('slapZoom').oninput = () => {
    if (!lastImg) return;
    const c = document.createElement('canvas'), size = 360; c.width = c.height = size;
    const g = c.getContext('2d'), z = +$('slapZoom').value;
    const side = Math.min(lastImg.width, lastImg.height) / z;
    g.drawImage(lastImg, (lastImg.width - side) / 2, Math.max(0, (lastImg.height - side) / 2 - side * 0.08), side, side, 0, 0, size, size);
    face.src = c.toDataURL('image/jpeg', 0.85);
  };
  $('slapZoom').onchange = persist;
  $('slapName').oninput = () => { $('nameTag').textContent = $('slapName').value.trim() || '老闆'; };
  $('slapName').onchange = persist;
  $('slapRemember').onchange = persist;
  $('slapReset').onclick = () => { lastImg = null; useFace(null, ''); $('slapRemember').checked = false; persist(); talk('換回預設的老闆了。', '🙂'); };

  window.addEventListener('relax-game', e => {
    if (e.detail === 'slap') talk(count ? `今天已經打了 ${count} 下，還有氣嗎？` : '點老闆的臉就能搧巴掌，打左臉、右臉都可以！', '😤');
  });
  $('slapCount').textContent = count;
})();
