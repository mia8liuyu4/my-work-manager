// 月份回顧：心情月曆、完成的待辦、小確幸、外食花費
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const R = () => window.dailyRecords;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const MOODS = { happy: ['😊', '開心'], calm: ['😌', '平靜'], tired: ['😪', '好累'], sad: ['😢', '難過'], annoyed: ['😤', '煩躁'] };
  const fill = s => (window.DAILY_MSG ? window.DAILY_MSG.fill(s) : s);
  let month = new Date(); month.setDate(1);
  let data = { moods: {}, joys: [], meals: [], tasks: [] }, selected = null;
  const key = d => R().key(d);

  async function load() {
    const y = month.getFullYear(), m = month.getMonth();
    const from = key(new Date(y, m, 1)), to = key(new Date(y, m + 1, 0));
    $('monthLabel').textContent = `${y} 年 ${m + 1} 月`;
    $('reviewMsg').textContent = '讀取中…';
    const client = window.dailyClient;
    const moods = {};
    try { Object.assign(moods, JSON.parse(localStorage.getItem('daily-moods') || '{}')); } catch {}
    try { const { data: u } = await client.auth.getUser(); Object.assign(moods, u.user?.user_metadata?.moods || {}); } catch {}
    let recs = [], msg = '';
    try { recs = await R().list(['mood', 'joy', 'meal'], from, to); } catch (e) { msg = R().friendly(e); }
    recs.filter(r => r.kind === 'mood' && MOODS[r.title]).forEach(r => { moods[r.day] = r.title; });
    let tasks = [];
    try {
      const start = new Date(y, m, 1), end = new Date(y, m + 1, 1);
      const r = await client.from('personal_tasks').select('id,title,completed_at,category').gte('completed_at', start.toISOString()).lt('completed_at', end.toISOString());
      if (r.error) throw r.error; tasks = r.data;
    } catch {}
    data = { moods, joys: recs.filter(r => r.kind === 'joy'), meals: recs.filter(r => r.kind === 'meal'), tasks };
    $('reviewMsg').textContent = msg;
    const tk = key(new Date());
    if (!selected || !selected.startsWith(from.slice(0, 7))) selected = tk.startsWith(from.slice(0, 7)) ? tk : from;
    render();
  }

  const dayOf = iso => key(new Date(iso));
  function perDay(k) {
    return {
      mood: data.moods[k],
      joys: data.joys.filter(j => j.day === k),
      meals: data.meals.filter(x => x.day === k),
      tasks: data.tasks.filter(t => dayOf(t.completed_at) === k)
    };
  }

  function render() {
    const y = month.getFullYear(), m = month.getMonth();
    const grid = $('calGrid'); grid.replaceChildren();
    '一二三四五六日'.split('').forEach(d => grid.append(el('span', 'cal-wd', d)));
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < (first.getDay() + 6) % 7; i++) grid.append(el('span', 'cal-blank'));
    const tk = key(new Date());
    for (let d = 1; d <= days; d++) {
      const k = key(new Date(y, m, d)), info = perDay(k);
      const b = el('button', 'cal-day' + (info.mood ? ' m-' + info.mood : '') + (k === tk ? ' is-today' : '') + (k === selected ? ' is-sel' : '') + (k > tk ? ' is-future' : ''));
      b.type = 'button';
      b.append(el('span', 'cal-n', String(d)), el('span', 'cal-mood', info.mood ? MOODS[info.mood][0] : ''));
      const badges = el('span', 'cal-badges');
      if (info.tasks.length) badges.append(el('i', 'b-task', '✓' + info.tasks.length));
      if (info.joys.length) badges.append(el('i', 'b-joy', '✿' + info.joys.length));
      b.append(badges);
      b.setAttribute('aria-label', `${m + 1}月${d}日` + (info.mood ? '，心情' + MOODS[info.mood][1] : '') + (info.tasks.length ? `，完成 ${info.tasks.length} 件` : '') + (info.joys.length ? `，小確幸 ${info.joys.length} 件` : ''));
      b.setAttribute('aria-pressed', String(k === selected));
      b.onclick = () => { selected = k; render(); };
      grid.append(b);
    }
    detail(); summary(); joyWall();
  }

  function detail() {
    const box = $('dayDetail'); box.replaceChildren();
    if (!selected) return;
    const d = new Date(selected + 'T00:00:00'), info = perDay(selected);
    const head = el('div', 'dd-head');
    head.append(el('strong', '', `${d.getMonth() + 1} 月 ${d.getDate()} 日（${'日一二三四五六'[d.getDay()]}）`), el('span', 'dd-mood', info.mood ? MOODS[info.mood].join(' ') : '沒有記錄心情'));
    box.append(head);
    const sec = (title, items, render, empty) => {
      const s = el('div', 'dd-sec'); s.append(el('h3', '', title));
      if (!items.length) s.append(el('p', 'muted', empty));
      else { const ul = el('ul'); items.forEach(x => ul.append(render(x))); s.append(ul); }
      box.append(s);
    };
    sec('小確幸', info.joys, j => el('li', 'dd-joy', j.title), '這天沒有記小確幸');
    sec('完成的事', info.tasks, t => { const li = el('li'); li.append(el('span', 'tag ' + (t.category === 'work' ? 'work' : 'personal'), t.category === 'work' ? '公' : '私'), document.createTextNode(' ' + t.title)); return li; }, '這天沒有完成的待辦');
    if (info.meals.length) sec('飲食與花費', info.meals, x => el('li', '', `${({ breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心', other: '其他' })[x.data?.slot] || '午餐'}・${x.title}　NT$ ${Math.round(+x.amount || 0).toLocaleString('zh-TW')}`), '');
  }

  function summary() {
    const counts = {}; Object.entries(data.moods).forEach(([k, v]) => { if (k.startsWith(key(month).slice(0, 7))) counts[v] = (counts[v] || 0) + 1; });
    const recorded = Object.values(counts).reduce((a, b) => a + b, 0);
    const bars = $('moodBars'); bars.replaceChildren();
    Object.entries(MOODS).forEach(([id, [e, name]]) => {
      const n = counts[id] || 0, row = el('div', 'mb-row');
      const bar = el('span', 'mb-bar'); const fillEl = el('i', 'm-' + id); fillEl.style.width = (recorded ? n / recorded * 100 : 0) + '%'; bar.append(fillEl);
      row.append(el('span', 'mb-name', `${e} ${name}`), bar, el('b', '', n + ' 天'));
      bars.append(row);
    });
    const spend = data.meals.reduce((s, x) => s + (+x.amount || 0), 0);
    $('sumTasks').textContent = data.tasks.length;
    $('sumJoys').textContent = data.joys.length;
    $('sumDays').textContent = recorded;
    $('sumSpend').textContent = 'NT$ ' + Math.round(spend).toLocaleString('zh-TW');
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    let line;
    if (!recorded && !data.tasks.length && !data.joys.length) line = '這個月還沒有紀錄，從今天的心情開始吧！';
    else {
      const parts = [];
      if (data.tasks.length) parts.push(`完成了 ${data.tasks.length} 件事`);
      if (data.joys.length) parts.push(`記下 ${data.joys.length} 件小確幸`);
      line = (parts.length ? '這個月你' + parts.join('、') + '。' : '') +
        (top ? (top[0] === 'happy' ? '開心的日子最多，真好！' : top[0] === 'calm' ? '大多是平靜的日子，穩穩的很好。' : top[0] === 'tired' ? '好累的日子比較多，辛苦了，記得留時間休息。' : top[0] === 'sad' ? '這個月比較辛苦，{pet}一直陪著你。' : '煩躁的日子有點多，去舒壓小遊戲放鬆一下吧。') : '');
    }
    $('sumLine').textContent = fill(line);
  }

  function joyWall() {
    const wall = $('joyWall'); wall.replaceChildren();
    if (!data.joys.length) { wall.append(el('p', 'muted', '這個月還沒有小確幸。到首頁「今天的小確幸」記下第一件吧！')); $('joyRandom').hidden = true; return; }
    $('joyRandom').hidden = false;
    [...data.joys].reverse().forEach((j, i) => {
      const card = el('div', 'joy-note n' + (i % 4));
      const d = new Date(j.day + 'T00:00:00');
      card.append(el('small', '', `${d.getMonth() + 1}/${d.getDate()}`), el('span', '', j.title));
      wall.append(card);
    });
  }

  $('joyRandom').onclick = () => {
    if (!data.joys.length) return;
    const j = data.joys[Math.floor(Math.random() * data.joys.length)], d = new Date(j.day + 'T00:00:00');
    $('reviewSay').textContent = `${d.getMonth() + 1}/${d.getDate()} 那天：「${j.title}」，想起來還是很開心吧！`;
    const p = $('reviewPet'); p.classList.remove('bob'); void p.offsetWidth; p.classList.add('bob');
  };
  $('reviewPet').onclick = () => $('joyRandom').click();
  $('prevMonth').onclick = () => { month.setMonth(month.getMonth() - 1); selected = null; load(); };
  $('nextMonth').onclick = () => { month.setMonth(month.getMonth() + 1); selected = null; load(); };
  $('thisMonth').onclick = () => { month = new Date(); month.setDate(1); selected = null; load(); };
  window.whenDailyReady(() => { $('reviewSay').textContent = fill('一起來看看這個月吧！點日期可以看那天的紀錄。'); load(); });
})();
