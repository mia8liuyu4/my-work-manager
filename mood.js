// 今天的心情：選心情 → 小動物給鼓勵和一個小互動；依今天完成的待辦給嘉勉。
// 心情紀錄存在自己帳號的資料裡（user_metadata，最多保留 30 天），手機電腦同步；同時在本機留一份備份。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const card = $('moodCard');
  if (!card) return;
  const LOCAL = 'daily-moods';
  const MOODS = {
    happy: { emoji: '😊', label: '開心', pose: 'star' },
    calm: { emoji: '😌', label: '平靜', pose: 'note' },
    tired: { emoji: '😪', label: '好累', pose: 'heart' },
    sad: { emoji: '😢', label: '難過', pose: 'heart' },
    annoyed: { emoji: '😤', label: '煩躁', pose: 'star' }
  };
  const LINES = {
    happy: ['看到你開心，{pet}也跟著轉圈圈！', '好心情要收藏起來，{name}今天一定會很順利 ✨', '今天的你閃閃發亮，{pet}好喜歡！'],
    calm: ['平平靜靜也很好，照自己的步調就好。', '穩穩的一天，{pet}陪你慢慢來。', '心很安定的時候，最適合完成一件小事。'],
    tired: ['辛苦了，{name}。累的時候先照顧自己。', '{pet}幫你按按肩膀，今天做到這裡就很棒了。', '喝口水、伸個懶腰，休息不是偷懶喔。'],
    sad: ['抱抱你。難過的時候，不用急著好起來。', '{pet}在這裡陪你，想哭也沒關係。', '今天辛苦了，對自己溫柔一點。'],
    annoyed: ['煩躁是正常的，先離開一下下也可以。', '{pet}幫你把煩惱咬走！', '深呼吸，事情一件一件來就好。']
  };
  let client = null, user = null, moods = {}, today = key(new Date()), current = null, breathTimer = null;

  function key(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function pet() { return window.dailyTheme?.mascot()?.name || '兔兔'; }
  function nick() { return user?.user_metadata?.nickname || '你'; }
  function fill(s) { return s.replace(/\{pet\}/g, pet()).replace(/\{name\}/g, nick()); }
  function readLocal() { try { return JSON.parse(localStorage.getItem(LOCAL) || '{}') || {}; } catch { return {}; } }
  function prune(obj) {
    const keep = Object.keys(obj).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && MOODS[obj[k]]).sort().slice(-30);
    return Object.fromEntries(keep.map(k => [k, obj[k]]));
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(text) { const p = $('moodText'); p.textContent = text; p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }

  function renderNames() { card.querySelectorAll('.mascot-name').forEach(s => { s.textContent = pet(); }); }

  function renderWeek() {
    const box = $('moodWeek');
    box.replaceChildren();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = key(d), m = MOODS[moods[k]];
      const dot = el('span', 'mood-day' + (k === today ? ' is-today' : ''));
      dot.title = (d.getMonth() + 1) + '/' + d.getDate() + (m ? '：' + m.label : '：未記錄');
      dot.append(el('b', '', m ? m.emoji : '·'), el('small', '', '日一二三四五六'[d.getDay()]));
      box.append(dot);
    }
    box.setAttribute('aria-label', '最近七天的心情：' + [...box.children].map(c => c.title).join('、'));
  }

  function renderButtons() {
    card.querySelectorAll('.mood-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mood === current)));
  }

  function action(label, fn, primary) {
    const b = el('button', 'mood-act' + (primary ? ' primary' : ''), label);
    b.type = 'button'; b.onclick = fn; return b;
  }
  function link(label, href) { const a = el('a', 'mood-act', label); a.href = href; return a; }

  function burst(chars, n) {
    const layer = $('moodFx');
    for (let i = 0; i < n; i++) {
      const s = el('span', 'mood-fx', pick(chars));
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.animationDelay = (Math.random() * 0.4) + 's';
      s.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      layer.append(s);
      setTimeout(() => s.remove(), 2200);
    }
  }

  function breathe(done) {
    clearInterval(breathTimer);
    const box = $('moodAction');
    box.replaceChildren();
    const ring = el('div', 'breath');
    const label = el('span', 'breath-label', '吸氣…');
    ring.append(label);
    box.append(ring);
    let step = 0;
    ring.classList.add('in');
    breathTimer = setInterval(() => {
      step++;
      if (step >= 6) { clearInterval(breathTimer); done(); return; }
      const inhale = step % 2 === 0;
      ring.classList.toggle('in', inhale);
      label.textContent = inhale ? '吸氣…' : '吐氣…';
    }, 4000);
  }

  function actions(mood) {
    const box = $('moodAction');
    clearInterval(breathTimer);
    box.replaceChildren();
    if (mood === 'happy') {
      box.append(link('記下今天的小確幸 ✎', 'notes.html'), action('再撒一次花 🎉', () => burst(['✦', '★', '♡', '✿'], 14)));
    } else if (mood === 'calm') {
      box.append(action('定一個今天的小目標', () => { const t = $('taskTitle'); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => t.focus(), 400); } }, true));
    } else if (mood === 'tired') {
      box.append(action('跟' + pet() + '一起深呼吸 30 秒', () => breathe(() => { say(fill('做得很好！有沒有輕鬆一點？{pet}覺得你已經很努力了。')); actions('tired'); }), true), link('敲木魚靜一靜 🪵', 'relax.html#muyu'));
    } else if (mood === 'sad') {
      box.append(action('抱抱 ♡', () => { burst(['♡', '♥'], 10); say(fill('給你一個大大的擁抱。{pet}會一直在這裡。')); window.dailyPet?.play('love', { text: '抱緊緊～' }); }, true), link('把心情寫下來', 'notes.html'));
    } else if (mood === 'annoyed') {
      const form = el('form', 'worry');
      const input = el('input'); input.type = 'text'; input.maxLength = 60; input.placeholder = '把煩惱打在這裡（不會被儲存）'; input.setAttribute('aria-label', '煩惱');
      const go = el('button', 'mood-act primary', '丟掉！'); go.type = 'submit';
      form.append(input, go);
      form.onsubmit = e => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) { input.focus(); return; }
        const fly = el('span', 'worry-fly', text);
        form.append(fly);
        input.value = '';
        setTimeout(() => fly.remove(), 1200);
        say(fill('丟掉了！{pet}幫你把它丟得遠遠的。還有的話可以再丟。'));
        window.dailyPet?.play('relief', { text: '丟掉囉！' });
      };
      box.append(form, link('去打老闆出氣 👋', 'relax.html#slap'), link('戳泡泡 🫧', 'relax.html#bubble'));
    }
  }

  function care() {
    const recent = Object.entries(moods).filter(([k]) => { const d = new Date(k + 'T12:00:00'); return (Date.now() - d) / 864e5 < 7; });
    const heavy = recent.filter(([, m]) => m === 'sad' || m === 'tired').length;
    const note = $('moodCare');
    if (heavy >= 3 && (current === 'sad' || current === 'tired')) {
      note.textContent = '這幾天好像比較辛苦。如果一直覺得很累或很難過，找信任的人聊聊、或請專業的人幫忙，也是照顧自己的方式。';
      note.hidden = false;
    } else note.hidden = true;
  }

  function show(mood, fresh) {
    current = mood;
    const m = MOODS[mood];
    renderButtons();
    const reply = $('moodReply');
    reply.hidden = !m;
    if (!m) return;
    reply.dataset.mood = mood;
    say(fill(pick(LINES[mood])));
    if (fresh) window.dailyPet?.play(PET_EXPR[mood]);
    actions(mood);
    care();
    if (fresh && mood === 'happy') burst(['✦', '★', '♡', '✿'], 14);
  }

  async function save(mood) {
    moods = prune({ ...moods, [today]: mood });
    try { localStorage.setItem(LOCAL, JSON.stringify(moods)); } catch {}
    renderWeek();
    if (!client || !user) return;
    try {
      const { data, error } = await client.auth.updateUser({ data: { moods } });
      if (error) throw error;
      user = data.user;
    } catch (e) {
      $('moodSub').textContent = '心情先存在這台裝置，連線恢復後再選一次就會同步。';
    }
  }

  async function praise() {
    const box = $('moodPraise');
    if (!client || !user) { box.hidden = true; return; }
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await client.from('personal_tasks').select('id').gte('completed_at', start.toISOString());
      if (error) throw error;
      const n = data.length;
      box.replaceChildren(el('span', 'praise-star', n >= 3 ? '★' : n ? '✦' : '☁'),
        el('span', '', n >= 5 ? `今天完成了 ${n} 件事，太厲害了！${pet()}頒給你一顆大星星。`
          : n >= 3 ? `今天已經完成 ${n} 件事，真的很棒，記得留點時間休息。`
          : n >= 1 ? `今天完成了 ${n} 件事，一步一步來，你做得很好。`
          : '還沒完成待辦也沒關係，先從一件最小的事開始就好。'));
      box.hidden = false;
    } catch { box.hidden = true; }
  }

  const PET_EXPR = { happy: 'laugh', calm: 'smile', tired: 'sleepy', sad: 'cry', annoyed: 'stress' };
  card.querySelectorAll('.mood-btn').forEach(b => {
    b.onclick = () => { if (b.dataset.mood === current) return; show(b.dataset.mood, true); save(b.dataset.mood); };
  });
  const greet = () => {
    const D = window.DAILY_MSG; if (!D) return;
    D.setName(user?.user_metadata?.nickname || '');
    const t = $('greetingTitle'); if (t && user?.user_metadata?.nickname) t.textContent = D.hello() + '，' + user.user_metadata.nickname + '！';
    $('greetLine') && ($('greetLine').textContent = D.greeting());
    $('cheerText') && ($('cheerText').textContent = D.line('cheer'));
  };
  $('greetMore') && ($('greetMore').onclick = () => { $('greetLine').textContent = window.DAILY_MSG.greeting(); });
  $('cheerMore') && ($('cheerMore').onclick = () => { $('cheerText').textContent = window.DAILY_MSG.line('cheer'); });
  window.addEventListener('daily-mascot', () => { renderNames(); if (current) actions(current); });

  async function start() {
    client = window.dailyClient || null;
    try { if (client) { const { data } = await client.auth.getUser(); user = data.user; } } catch {}
    moods = prune({ ...readLocal(), ...(user?.user_metadata?.moods || {}) });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', greet); else greet();
    renderNames();
    renderWeek();
    if (moods[today]) show(moods[today], false); else { $('moodReply').hidden = true; renderButtons(); }
    praise();
    const done = $('completedTasks');
    if (done) { let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(praise, 800); }).observe(done, { childList: true }); }
  }
  if (document.documentElement.hasAttribute('data-locked')) window.addEventListener('daily-unlocked', start, { once: true });
  else start();
})();
