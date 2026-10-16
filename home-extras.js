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

  /* ---------------- 天氣（Open-Meteo，免金鑰）：直接畫在小動物互動區 ---------------- */
  const WX = {
    0: ['☀️', '晴朗', 'clear'], 1: ['🌤️', '大致晴朗', 'clear'], 2: ['⛅', '局部多雲', 'partly'], 3: ['☁️', '陰天', 'cloudy'], 45: ['🌫️', '有霧', 'fog'], 48: ['🌫️', '有霧', 'fog'],
    51: ['🌦️', '毛毛雨', 'rain'], 53: ['🌦️', '毛毛雨', 'rain'], 55: ['🌦️', '毛毛雨', 'rain'], 56: ['🌧️', '凍毛雨', 'rain'], 57: ['🌧️', '凍毛雨', 'rain'],
    61: ['🌧️', '小雨', 'rain'], 63: ['🌧️', '中雨', 'rain'], 65: ['🌧️', '大雨', 'rain'], 66: ['🌧️', '凍雨', 'rain'], 67: ['🌧️', '凍雨', 'rain'],
    71: ['🌨️', '小雪', 'snow'], 73: ['🌨️', '中雪', 'snow'], 75: ['🌨️', '大雪', 'snow'], 77: ['🌨️', '雪粒', 'snow'],
    80: ['🌦️', '短暫陣雨', 'rain'], 81: ['🌧️', '陣雨', 'rain'], 82: ['⛈️', '強陣雨', 'storm'], 85: ['🌨️', '陣雪', 'snow'], 86: ['🌨️', '陣雪', 'snow'],
    95: ['⛈️', '雷雨', 'storm'], 96: ['⛈️', '雷雨夾冰雹', 'storm'], 99: ['⛈️', '雷雨夾冰雹', 'storm']
  };
  const HOME = { lat: 22.6273, lon: 120.3014, name: '高雄' };
  const stage = $('petStage');
  let wxText = '', sweatTimer = null;
  function place() { try { return JSON.parse(localStorage.getItem('daily-wx-place')) || HOME; } catch { return HOME; } }
  function scene(kind, temp, rain, night) {
    if (!stage) return;
    let layer = stage.querySelector('.wx-layer');
    if (!layer) { layer = el('div', 'wx-layer'); layer.setAttribute('aria-hidden', 'true'); stage.prepend(layer); }
    layer.replaceChildren();
    const hot = !night && temp >= 30 && (kind === 'clear' || kind === 'partly');
    const cold = temp <= 15;
    stage.dataset.wx = kind; stage.dataset.night = String(night); stage.dataset.hot = String(hot); stage.dataset.cold = String(cold);
    if (kind === 'clear' || kind === 'partly') layer.append(el('span', night ? 'wx-moon' : 'wx-sun'));
    if (kind !== 'clear') for (let i = 0; i < (kind === 'partly' ? 2 : 3); i++) layer.append(el('span', 'wx-cloud c' + i));
    if (kind === 'rain' || kind === 'storm') layer.append(el('span', 'wx-rainfall'));
    if (kind === 'storm') layer.append(el('span', 'wx-flash'));
    if (kind === 'snow') layer.append(el('span', 'wx-snowfall'));
    if (kind === 'fog') layer.append(el('span', 'wx-fog'));
    if (night) for (let i = 0; i < 5; i++) { const st = el('span', 'wx-star', '✦'); st.style.left = (8 + i * 19) + '%'; st.style.top = (10 + (i % 2) * 12) + '%'; layer.append(st); }
    // 下雨撐傘；還沒下但可能會下，就把傘放在旁邊
    const body = $('petBody');
    body.querySelector('.wx-umbrella')?.remove(); stage.querySelector('.wx-closed')?.remove();
    if (kind === 'rain' || kind === 'storm') {
      const u = el('span', 'wx-umbrella'); u.setAttribute('aria-hidden', 'true');
      u.innerHTML = '<svg viewBox="0 0 200 150"><path d="M100 18C52 18 14 52 10 92C22 82 36 82 46 92C56 82 72 82 82 92C88 84 112 84 118 92C128 82 144 82 154 92C164 82 178 82 190 92C186 52 148 18 100 18Z" fill="#F4A3A0" stroke="#B5655F" stroke-width="5" stroke-linejoin="round"/><path d="M100 18C82 40 76 66 82 92M100 18C118 40 124 66 118 92" fill="none" stroke="#B5655F" stroke-width="4"/><path d="M100 10V18" stroke="#B5655F" stroke-width="6" stroke-linecap="round"/><path d="M100 92V140Q100 148 92 148Q84 148 84 140" fill="none" stroke="#8A5A3C" stroke-width="7" stroke-linecap="round"/></svg>';
      body.append(u);
    } else if (rain >= 50) {
      const u = el('span', 'wx-closed'); u.setAttribute('aria-hidden', 'true');
      u.innerHTML = '<svg viewBox="0 0 40 140"><path d="M20 4L32 96Q20 104 8 96Z" fill="#F4A3A0" stroke="#B5655F" stroke-width="3" stroke-linejoin="round"/><path d="M20 96V124Q20 134 12 134" fill="none" stroke="#8A5A3C" stroke-width="5" stroke-linecap="round"/></svg>';
      stage.append(u);
    }
    clearInterval(sweatTimer);
    if (hot || cold) sweatTimer = setInterval(() => {
      if (document.hidden || stage.dataset.expr !== 'rest') return;
      const s = stage.getBoundingClientRect(), r = $('petImg').getBoundingClientRect(), fx = $('petFx');
      const e = el('span', 'fx ' + (hot ? 'sweat' : 'breath'), hot ? '' : '❄');
      e.style.left = (r.left - s.left + r.width * (Math.random() < .5 ? .2 : .8)) + 'px';
      e.style.top = (r.top - s.top + r.height * .25) + 'px';
      fx.append(e); setTimeout(() => e.remove(), 1200);
    }, 2600);
  }
  async function weather(force) {
    const p = place();
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem('daily-wx') || 'null'); } catch {}
    let d;
    if (!force && cache && cache.lat === p.lat && cache.lon === p.lon && Date.now() - cache.t < 30 * 60 * 1000) d = cache.d;
    else {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon +
        '&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,is_day' +
        '&hourly=precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&timezone=Asia%2FTaipei&forecast_days=2';
      const r = await fetch(url);
      if (!r.ok) throw Error('天氣資料暫時讀不到');
      d = await r.json();
      try { localStorage.setItem('daily-wx', JSON.stringify({ t: Date.now(), lat: p.lat, lon: p.lon, d })); } catch {}
    }
    const c = d.current, day = d.daily;
    const [icon, desc, kind] = WX[c.weather_code] || ['🌡️', '—', 'cloudy'];
    const rain = day.precipitation_probability_max[0] ?? 0, hi = Math.round(day.temperature_2m_max[0]), lo = Math.round(day.temperature_2m_min[0]);
    const temp = Math.round(c.temperature_2m), h = new Date().getHours();
    const night = c.is_day === 0 || h >= 18 || h < 6;
    let when = '';
    const todayStr = today();
    d.hourly.time.forEach((t, i) => { if (!when && t.startsWith(todayStr) && +t.slice(11, 13) >= h && d.hourly.precipitation_probability[i] >= 50) when = t.slice(11, 16); });
    scene(kind, temp, rain, night);
    $('wxChip').textContent = `${icon} ${temp}°` + (rain >= 30 ? ` · ☂${rain}%` : '');
    $('wxChip').title = `${p.name}：${desc}，今天 ${lo}°–${hi}°，降雨機率 ${rain}%（資料來源 Open-Meteo）`;
    $('wxChip').setAttribute('aria-label', `天氣：${p.name}${desc}，${temp} 度，降雨機率 ${rain}%，點一下看詳細`);
    const pn = p.name === HOME.name ? '高雄' : '這裡';
    let say;
    if (kind === 'rain' || kind === 'storm') say = `${pn}正在下${kind === 'storm' ? '雷雨' : '雨'}，我撐好傘了！出門記得帶傘喔 ☂️`;
    else if (rain >= 50) say = `降雨機率 ${rain}%${when ? '，大約 ' + when + ' 後可能下雨' : ''}，傘我先幫你放旁邊了，記得帶出門 ☂️`;
    else if (temp >= 30 && !night) say = `今天好熱（${temp}°），曬得我都流汗了，記得多喝水、防曬！`;
    else if (temp <= 15) say = `好冷（${temp}°）…記得多穿一件外套！`;
    else if (night && (kind === 'clear' || kind === 'partly')) say = `今晚${desc}，${temp}°，早點休息喔～`;
    else if (kind === 'clear') say = `今天${desc}，${lo}°–${hi}°，是出門走走的好天氣！`;
    else say = `今天${desc}，${lo}°–${hi}°，降雨機率 ${rain}%。`;
    wxText = say + `（今天 ${lo}°–${hi}°、體感 ${Math.round(c.apparent_temperature)}°、濕度 ${c.relative_humidity_2m}%）`;
    if (!window.__wxSaid) { window.__wxSaid = true; setTimeout(() => pet(say, 'smile'), 900); }
  }
  function loadWeather(force) { weather(force).catch(e => { if ($('wxChip')) $('wxChip').textContent = '🌡️ 天氣讀取失敗'; }); }
  if ($('wxChip')) $('wxChip').onclick = () => { if (wxText) pet(wxText, 'smile'); };
  if ($('wxLocate')) {
    $('wxLocate').onclick = () => {
      if (place().name !== HOME.name) { try { localStorage.removeItem('daily-wx-place'); } catch {} $('wxLocate').textContent = '📍'; $('wxLocate').title = '改看目前位置的天氣'; window.__wxSaid = false; loadWeather(true); return; }
      if (!navigator.geolocation) { pet('這個瀏覽器不支援定位，先看高雄的天氣喔。'); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        try { localStorage.setItem('daily-wx-place', JSON.stringify({ lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), name: '目前位置' })); } catch {}
        $('wxLocate').textContent = '↩'; $('wxLocate').title = '改回高雄'; window.__wxSaid = false; loadWeather(true);
      }, () => pet('沒有拿到定位權限，先看高雄的天氣喔。'), { timeout: 10000, maximumAge: 600000 });
    };
    if (place().name !== HOME.name) { $('wxLocate').textContent = '↩'; $('wxLocate').title = '改回高雄'; }
  }

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

  loadWeather(false);
  setInterval(() => { if (!document.hidden) loadWeather(false); }, 30 * 60 * 1000);
  window.whenDailyReady(() => { loadCd(); loadJoy(); if ($('spendForm')) loadSpend(); });
})();
