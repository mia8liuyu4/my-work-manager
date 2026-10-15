// 敲木魚：點木魚或按空白鍵敲一下，可以開自動敲，跟著節奏呼吸。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stage = $('muyuStage');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const talk = (t, e) => window.relaxTalk && window.relaxTalk(t, e);
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const today = new Date().toISOString().slice(0, 10);
  let st = { day: today, today: 0, total: 0, word: '功德 +1', bpm: 60 };
  try { const s = JSON.parse(localStorage.getItem('daily-muyu') || '{}'); st = { ...st, ...s }; if (s.day !== today) { st.day = today; st.today = 0; } } catch {}
  const save = () => { try { localStorage.setItem('daily-muyu', JSON.stringify(st)); } catch {} };
  let auto = null, beat = 0, active = false;

  const CALM = ['呼吸放慢一點…', '心靜下來了嗎？', '一下、一下，跟著節奏呼吸。', '不急，慢慢來。', '把注意力放在聲音上就好。', '肩膀放鬆，眉頭鬆開。', '此刻什麼都不用想。'];
  const MILE = { 10: '開始靜下來了～', 33: '三十三下，心慢慢定了。', 50: '五十下，好安靜。', 108: '一百零八下，煩惱都放下了。🙏', 300: '三百下，你好有定力！', 1000: '一千下！今天功德圓滿。' };

  function tok() {
    if (!window.relaxSound || !window.relaxSound()) return;
    const ctx = window.relaxAudio && window.relaxAudio(); if (!ctx) return;
    const t = ctx.currentTime, out = ctx.createGain();
    out.gain.value = 0.9; out.connect(ctx.destination);
    [[520, 0.35, 0.55, 'triangle'], [1180, 0.12, 0.18, 'sine'], [260, 0.25, 0.25, 'sine']].forEach(([f, d, v, type]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f * (0.98 + Math.random() * 0.04), t); o.frequency.exponentialRampToValueAtTime(f * 0.93, t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
      o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.02);
    });
    const len = Math.floor(ctx.sampleRate * 0.012), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2400; ng.gain.value = 0.5;
    n.connect(bp).connect(ng).connect(out); n.start(t);
  }

  function paint() {
    $('muyuToday').textContent = st.today;
    $('muyuTotal').textContent = st.total;
  }

  function knock() {
    st.today++; st.total++; save(); paint();
    tok();
    window.relaxBuzz && window.relaxBuzz(6);
    stage.classList.remove('hit'); void stage.offsetWidth; stage.classList.add('hit');
    const f = document.createElement('span');
    f.className = 'merit'; f.textContent = st.word;
    f.style.left = (46 + Math.random() * 8) + '%';
    stage.append(f); setTimeout(() => f.remove(), 1400);
    if (!reduced) {
      const ring = document.createElement('i'); ring.className = 'ripple'; stage.append(ring); setTimeout(() => ring.remove(), 900);
    }
    if (MILE[st.today]) talk(MILE[st.today], '🙏');
    else if (st.today % 20 === 0) talk(pick(CALM), '😌');
    if (auto) {
      beat++;
      const phase = Math.floor((beat - 1) / 4) % 2;
      $('breathCue').textContent = phase ? '吐氣…' : '吸氣…';
    }
  }

  stage.addEventListener('pointerdown', e => { e.preventDefault(); knock(); });
  stage.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); knock(); } });
  document.addEventListener('keydown', e => {
    if (!active || e.key !== ' ' || e.target.closest('input,textarea,select,button,#muyuStage')) return;
    e.preventDefault(); knock();
  });

  function setAuto(on) {
    clearInterval(auto); auto = null; beat = 0;
    $('autoBtn').setAttribute('aria-pressed', String(on));
    $('autoBtn').lastChild.textContent = on ? '停止自動' : '自動敲';
    $('breathCue').textContent = on ? '吸氣…' : '點木魚，或按空白鍵';
    stage.classList.toggle('auto', on);
    if (on) { auto = setInterval(knock, 60000 / st.bpm); knock(); talk('跟著木魚的聲音，四下吸氣、四下吐氣。', '😌'); }
  }
  $('autoBtn').onclick = () => setAuto(!auto);
  $('bpm').value = String(st.bpm);
  $('bpm').onchange = () => { st.bpm = +$('bpm').value; save(); if (auto) setAuto(true); };
  $('meritWord').value = st.word;
  if (!$('meritWord').value) { $('meritWord').selectedIndex = 0; st.word = $('meritWord').value; }
  $('meritWord').onchange = () => { st.word = $('meritWord').value; save(); };

  window.addEventListener('relax-game', e => {
    active = e.detail === 'muyu';
    if (!active && auto) setAuto(false);
    if (active) talk(st.today ? `今天已經敲了 ${st.today} 下，繼續靜下心來～` : '敲一下木魚，讓心安靜下來。', '😌');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && auto) setAuto(false); });
  paint();
})();
