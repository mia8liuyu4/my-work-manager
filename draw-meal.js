// 午餐記帳：抽完籤記一下吃了哪家、花多少，每月統計外食花費。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('mealForm')) return;
  const R = () => window.dailyRecords;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const money = n => 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
  let month = new Date(); month.setDate(1);
  let rows = [];
  const place = () => ($('homeTab')?.getAttribute('aria-selected') === 'true' ? 'home' : 'company');
  const SLOTS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心飲料', other: '其他花費' };
  const slotOf = r => (SLOTS[r.data?.slot] ? r.data.slot : 'lunch');

  function names() {
    const dl = $('mealNames'); dl.replaceChildren();
    try {
      const d = JSON.parse(localStorage.getItem('restaurant-picker-v2') || '{}');
      [...new Set([...(d.company || []), ...(d.home || [])].map(r => r.name))].forEach(n => { const o = document.createElement('option'); o.value = n; dl.append(o); });
    } catch {}
  }

  function range() {
    const y = month.getFullYear(), m = month.getMonth();
    const last = new Date(y, m + 1, 0);
    return [R().key(new Date(y, m, 1)), R().key(last)];
  }

  function render() {
    $('mealMonth').textContent = `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`;
    const total = rows.reduce((s, r) => s + (+r.amount || 0), 0);
    const sum = l => l.reduce((s, r) => s + (+r.amount || 0), 0);
    const now = new Date(), isThis = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();
    const days = isThis ? now.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    $('mealTotal').textContent = money(total);
    $('mealCount').textContent = rows.length + ' 筆';
    $('mealAvg').textContent = rows.length ? money(total / days) : '—';
    const bars = $('slotBars'); bars.replaceChildren();
    Object.entries(SLOTS).forEach(([k, name]) => {
      const l = rows.filter(r => slotOf(r) === k), t = sum(l), row = el('div', 'sb-row');
      const bar = el('span', 'sb-bar'), f = el('i', 's-' + k); f.style.width = (total ? t / total * 100 : 0) + '%'; bar.append(f);
      row.append(el('span', 's-' + k, name), bar, el('b', '', `${money(t)}（${l.length}）`)); bars.append(row);
    });
    const tally = {};
    rows.forEach(r => { const t = tally[r.title] || (tally[r.title] = { n: 0, s: 0 }); t.n++; t.s += +r.amount || 0; });
    const top = Object.entries(tally).sort((a, b) => b[1].n - a[1].n || b[1].s - a[1].s).slice(0, 3);
    $('mealTop').replaceChildren(...(top.length ? top.map(([n, t]) => { const li = el('li'); li.append(el('strong', '', n), el('small', '', ` ${t.n} 次 · ${money(t.s)}`)); return li; }) : [el('li', 'muted', '這個月還沒有紀錄')]));
    const list = $('mealList'); list.replaceChildren();
    [...rows].sort((a, b) => b.day.localeCompare(a.day) || String(b.created_at).localeCompare(String(a.created_at))).forEach(r => {
      const li = el('li', 'meal-row');
      const d = new Date(r.day + 'T00:00:00');
      li.append(el('span', 'meal-day', `${d.getMonth() + 1}/${d.getDate()}`), el('span', 'meal-tag s-' + slotOf(r), SLOTS[slotOf(r)].slice(0, 2)), el('span', 'meal-name', r.title), el('span', 'meal-amt', money(+r.amount || 0)));
      const del = el('button', 'meal-del', '✕'); del.type = 'button'; del.setAttribute('aria-label', '刪除這筆');
      del.onclick = async () => { if (!confirm(`刪除 ${r.title} ${money(+r.amount || 0)}？`)) return; try { await R().remove(r.id); rows = rows.filter(x => x.id !== r.id); render(); } catch (e) { $('mealMsg').textContent = R().friendly(e); } };
      li.append(del); list.append(li);
    });
    if (!rows.length) list.append(el('li', 'muted', '吃完記一筆，月底就能看到外食花了多少。'));
  }

  async function load() {
    const [a, b] = range();
    try { rows = await R().list('meal', a, b); $('mealMsg').textContent = ''; } catch (e) { rows = []; $('mealMsg').textContent = R().friendly(e); }
    render();
  }

  $('mealPrev').onclick = () => { month.setMonth(month.getMonth() - 1); load(); };
  $('mealNext').onclick = () => { month.setMonth(month.getMonth() + 1); load(); };
  $('mealForm').onsubmit = async e => {
    e.preventDefault();
    const title = $('mealName').value.trim(), amount = Number($('mealAmount').value), day = $('mealDay').value;
    if (!title || !day || !(amount >= 0)) return;
    const btn = $('mealForm').querySelector('[type=submit]'); btn.disabled = true;
    try {
      const rec = await R().add({ kind: 'meal', title: title.slice(0, 60), amount, day, data: { place: place(), slot: $('mealSlot').value } });
      $('mealAmount').value = ''; $('mealName').value = '';
      $('mealMsg').textContent = `已記下：${SLOTS[$('mealSlot').value]} ${title} ${money(amount)}`;
      const [a, b] = range();
      if (day >= a && day <= b) { rows.push(rec); render(); }
    } catch (err) { $('mealMsg').textContent = R().friendly(err); } finally { btn.disabled = false; }
  };
  // 抽到餐廳時，自動帶入名稱
  new MutationObserver(() => {
    const t = $('result').textContent;
    if (!t.startsWith('今天就吃這家')) return;
    const name = t.split('\n')[1];
    if (name) { $('mealName').value = name; $('mealCard').classList.remove('flash'); void $('mealCard').offsetWidth; $('mealCard').classList.add('flash'); $('mealHint').hidden = false; }
  }).observe($('result'), { childList: true, characterData: true, subtree: true });
  $('mealDay').value = R().key(new Date());
  { const h = new Date().getHours(); $('mealSlot').value = h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner'; }
  names();
  window.whenDailyReady(load);
})();
