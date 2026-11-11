// 首頁小卡：今天的天氣、倒數日、今天的小確幸
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('todayGrid')) return;
  const R = () => window.dailyRecords;
  const pet = (text, expr = 'smile') => window.dailyPet && window.dailyPet.play(expr, { text });
  const today = () => R().key(new Date());
  const pick = l => l[Math.floor(Math.random() * l.length)];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // 天氣由 pet-weather.js 統一供應，首頁與舒壓區共用。

  /* ---------------- 倒數日 ---------------- */
  const TYPES = { deadline: ['📌', '截止日'], trip: ['✈️', '出國旅行'], birthday: ['🎂', '生日'], anniversary: ['💝', '紀念日'], other: ['⭐', '其他'] };
  let cds = [], showAll = false;
  const dateOf = k => new Date(k + 'T00:00:00');
  function nextDate(rec) {
    const t = dateOf(today());
    if (!rec.data?.yearly) return dateOf(rec.day);
    const base = dateOf(rec.day);
    let n = new Date(t.getFullYear(), base.getMonth(), base.getDate());
    if (n < t) n = new Date(t.getFullYear() + 1, base.getMonth(), base.getDate());
    return n;
  }
  const diff = rec => Math.round((nextDate(rec) - dateOf(today())) / 864e5);
  function renderCd() {
    const list = $('cdList'); list.replaceChildren();
    const sorted = cds.map(r => ({ r, n: diff(r) })).filter(x => x.n >= -30).sort((a, b) => (a.n < 0) - (b.n < 0) || (a.n >= 0 ? a.n - b.n : b.n - a.n));
    if (!sorted.length) { list.append(el('li', 'mini-empty', '還沒有倒數日。按「＋ 新增」加上截止日、旅行或生日吧！')); }
    (showAll ? sorted : sorted.slice(0, 4)).forEach(({ r, n }) => {
      const [ic, typeName] = TYPES[r.data?.type] || TYPES.other;
      const li = el('li', 'cd-item' + (n === 0 ? ' is-today' : n < 0 ? ' is-past' : n <= 7 ? ' is-soon' : ''));
      const left = el('span', 'cd-ic', ic);
      const mid = el('span', 'cd-text');
      const nd = nextDate(r);
      mid.append(el('strong', '', r.title), el('small', '', `${typeName} · ${nd.getMonth() + 1}/${nd.getDate()}${r.data?.yearly ? ' · 每年' : ''}`));
      const num = el('span', 'cd-num');
      if (n === 0) num.append(el('b', '', '就是今天'), el('small', '', '🎉'));
      else if (n > 0) num.append(el('small', '', '還有'), el('b', '', String(n)), el('small', '', '天'));
      else num.append(el('small', '', '已過'), el('b', '', String(-n)), el('small', '', '天'));
      const del = el('button', 'cd-del', '✕'); del.type = 'button'; del.setAttribute('aria-label', '刪除「' + r.title + '」');
      del.onclick = async () => { if (!confirm('刪除倒數日「' + r.title + '」？')) return; try { await R().remove(r.id); cds = cds.filter(x => x.id !== r.id); renderCd(); } catch (e) { $('cdMsg').textContent = R().friendly(e); } };
      li.append(left, mid, num, del); list.append(li);
    });
    decorateWeek();
    $('cdMore').hidden = sorted.length <= 4;
    $('cdMore').textContent = showAll ? '收起' : `顯示全部（${sorted.length}）`;
  }
  // 在行事曆的週曆上，把倒數日標出來
  function decorateWeek() {
    const week = $('week'); if (!week) return;
    const map = {};
    cds.forEach(r => { const k = R().key(nextDate(r)); (map[k] = map[k] || []).push(r); });
    week.querySelectorAll('button').forEach(b => {
      b.querySelector('.cd-mark')?.remove();
      const k = (b.getAttribute('aria-label') || '').slice(0, 10), hits = map[k];
      if (!hits) return;
      const m = el('span', 'cd-mark', (TYPES[hits[0].data?.type] || TYPES.other)[0] + (hits.length > 1 ? hits.length : ''));
      m.title = hits.map(h => h.title).join('、');
      b.append(m);
    });
  }
  if ($('week')) new MutationObserver(() => { if (cds.length && !$('week').querySelector('.cd-mark')) decorateWeek(); }).observe($('week'), { childList: true });
  async function loadCd() { try { cds = await R().list('countdown'); $('cdMsg').textContent = ''; renderCd(); } catch (e) { $('cdMsg').textContent = R().friendly(e); } }
  $('cdMore').onclick = () => { showAll = !showAll; renderCd(); };
  $('cdAdd').onclick = () => { $('cdForm').hidden = !$('cdForm').hidden; if (!$('cdForm').hidden) { $('cdDate').value = $('cdDate').value || today(); $('cdTitle').focus(); } };
  $('cdCancel').onclick = () => { $('cdForm').hidden = true; };
  $('cdType').onchange = () => { $('cdYearly').checked = ['birthday', 'anniversary'].includes($('cdType').value); };
  $('cdForm').onsubmit = async e => {
    e.preventDefault();
    const title = $('cdTitle').value.trim(), day = $('cdDate').value;
    if (!title || !day) return;
    const btn = $('cdForm').querySelector('[type=submit]'); btn.disabled = true;
    try {
      const rec = await R().add({ kind: 'countdown', title: title.slice(0, 60), day, data: { type: $('cdType').value, yearly: $('cdYearly').checked } });
      cds.push(rec); renderCd(); $('cdForm').reset(); $('cdForm').hidden = true;
      const n = diff(rec); pet(n > 0 ? `「${title}」還有 ${n} 天，我幫你記住了！` : n === 0 ? `「${title}」就是今天！` : '記下來了！');
    } catch (err) { $('cdMsg').textContent = R().friendly(err); } finally { btn.disabled = false; }
  };

  /* ---------------- 今天的小確幸 ---------------- */
  let joys = [];
  function renderJoy() {
    const list = $('joyList'); list.replaceChildren();
    joys.forEach((j, i) => {
      const li = el('li', 'joy-item');
      li.append(el('span', 'joy-n', ['①', '②', '③'][i] || '✿'), el('span', 'joy-t', j.title));
      const del = el('button', 'cd-del', '✕'); del.type = 'button'; del.setAttribute('aria-label', '刪除這件小確幸');
      del.onclick = async () => { try { await R().remove(j.id); joys = joys.filter(x => x.id !== j.id); renderJoy(); } catch (e) { $('joyMsg').textContent = R().friendly(e); } };
      li.append(del); list.append(li);
    });
    const full = joys.length >= 3;
    $('joyInput').disabled = full; $('joyForm').querySelector('button').disabled = full;
    $('joyInput').placeholder = full ? '今天已經記滿三件好事了 ✨' : ['今天有什麼好事？例如：咖啡很好喝', '還有呢？再想一件小事', '最後一件，今天就圓滿了'][joys.length];
    if (!joys.length) list.append(el('li', 'mini-empty', '再小的事都算：天氣很好、午餐好吃、被同事稱讚…'));
  }
  async function loadJoy() { try { joys = await R().list('joy', today(), today()); $('joyMsg').textContent = ''; renderJoy(); } catch (e) { $('joyMsg').textContent = R().friendly(e); } }
  $('joyForm').onsubmit = async e => {
    e.preventDefault();
    const t = $('joyInput').value.trim(); if (!t || joys.length >= 3) return;
    $('joyInput').disabled = true;
    try {
      const rec = await R().add({ kind: 'joy', day: today(), title: t.slice(0, 80) });
      joys.push(rec); $('joyInput').value = ''; renderJoy();
      pet(joys.length === 3 ? '三件好事都記下來了，今天真的很棒！' : pick(['好棒的小確幸！', '記下來了，這件事好溫暖～', '謝謝你分享，我也好開心！']), 'love');
    } catch (err) { $('joyMsg').textContent = R().friendly(err); } finally { if (joys.length < 3) $('joyInput').disabled = false; }
  };

  /* ---------------- 隨手記帳（三餐、飲料、其他花費） ---------------- */
  const SLOTS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心飲料', other: '其他花費' };
  let spends = [], monthTotal = 0, slot = (() => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner'; })();
  const money = n => 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
  function paintSlot() {
    document.querySelectorAll('[data-slot]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.slot === slot)));
    $('spendTitle').placeholder = slot === 'other' ? '買了什麼？例如：文具、計程車' : slot === 'snack' ? '例如：珍奶、咖啡' : '吃了什麼？例如：巷口便當';
  }
  function suggestions() {
    const dl = $('spendNames'); if (!dl) return; dl.replaceChildren();
    const names = new Set(spends.map(x => x.title));
    try { const d = JSON.parse(localStorage.getItem('restaurant-picker-v2') || '{}'); [...(d.company || []), ...(d.home || [])].forEach(x => names.add(x.name)); } catch {}
    names.forEach(n => { const o = document.createElement('option'); o.value = n; dl.append(o); });
  }
  function renderSpend() {
    const list = $('spendList'); list.replaceChildren();
    spends.forEach(x => {
      const li = el('li', 'spend-item');
      li.append(el('span', 'spend-slot s-' + (x.data?.slot || 'lunch'), (SLOTS[x.data?.slot] || '午餐').slice(0, 2)), el('span', 'spend-t', x.title), el('b', '', money(+x.amount || 0)));
      const del = el('button', 'cd-del', '✕'); del.type = 'button'; del.setAttribute('aria-label', '刪除這筆');
      del.onclick = async () => { try { await R().remove(x.id); spends = spends.filter(y => y.id !== x.id); monthTotal -= +x.amount || 0; renderSpend(); } catch (e) { $('spendMsg').textContent = R().friendly(e); } };
      li.append(del); list.append(li);
    });
    if (!spends.length) list.append(el('li', 'mini-empty', '吃完、買完隨手記一筆，月底就知道錢花去哪了。'));
    const t = spends.reduce((a, x) => a + (+x.amount || 0), 0);
    $('spendToday').textContent = money(t);
    $('spendMonth').textContent = money(monthTotal);
  }
  async function loadSpend() {
    const now = new Date(), first = R().key(new Date(now.getFullYear(), now.getMonth(), 1));
    try {
      const rows = await R().list('meal', first, today());
      spends = rows.filter(x => x.day === today());
      monthTotal = rows.reduce((a, x) => a + (+x.amount || 0), 0);
      $('spendMsg').textContent = ''; renderSpend(); suggestions();
    } catch (e) { $('spendMsg').textContent = R().friendly(e); }
  }
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { slot = b.dataset.slot; paintSlot(); $('spendTitle').focus(); });
  if ($('spendForm')) $('spendForm').onsubmit = async e => {
    e.preventDefault();
    const title = $('spendTitle').value.trim() || SLOTS[slot], amount = Number($('spendAmount').value);
    if (!(amount >= 0) || $('spendAmount').value === '') { $('spendAmount').focus(); return; }
    const btn = $('spendForm').querySelector('[type=submit]'); btn.disabled = true;
    try {
      const rec = await R().add({ kind: 'meal', title: title.slice(0, 60), amount, day: today(), data: { slot } });
      spends.push(rec); monthTotal += amount; $('spendTitle').value = ''; $('spendAmount').value = ''; renderSpend(); suggestions();
      pet(slot === 'other' ? `記下了：${title} ${money(amount)}` : pick([`${SLOTS[slot]}吃${title}，記下來囉！`, '好好吃飯最重要～記好了！', `記下了，今天花了 ${money(spends.reduce((a, x) => a + (+x.amount || 0), 0))}`]));
    } catch (err) { $('spendMsg').textContent = R().friendly(err); } finally { btn.disabled = false; }
  };
  if ($('spendForm')) paintSlot();

  window.whenDailyReady(() => { loadCd(); loadJoy(); if ($('spendForm')) loadSpend(); });
})();
