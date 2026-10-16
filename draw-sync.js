// 「今天吃什麼」餐廳清單同步到 Supabase（app_state 資料表，key = restaurants）
(() => {
  'use strict';
  const META = 'restaurant-sync-meta', KEYNAME = 'restaurants';
  const $ = id => document.getElementById(id);
  const R = () => window.__restaurants;
  let meta = { ts: 0, synced: 0, dirty: false, ever: false };
  try { Object.assign(meta, JSON.parse(localStorage.getItem(META) || '{}')); } catch {}
  const keep = () => { try { localStorage.setItem(META, JSON.stringify(meta)); } catch {} };
  const say = (t, ok) => { const el = $('rsSync'); if (el) { el.textContent = t; el.style.color = ok ? '#16A34A' : ''; } };
  let client = null, uid = null, ready = false, timer = null, busy = false;
  const hhmm = () => new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  const count = d => (d.company || []).length + (d.home || []).length;
  function mergeLists(a = [], b = []) {
    const out = [...a], names = new Set(a.map(r => r.name.trim()));
    b.forEach(r => { if (!names.has(r.name.trim())) { out.push(r); names.add(r.name.trim()); } });
    return out;
  }
  async function push() {
    if (!ready || !R()) return;
    if (busy) { clearTimeout(timer); timer = setTimeout(push, 800); return; }
    busy = true; say('同步中…');
    const d = R().get(), ts = meta.ts || Date.now();
    try {
      const { error } = await client.from('app_state').upsert({ user_id: uid, key: KEYNAME, data: { company: d.company, home: d.home, _ts: ts } }, { onConflict: 'user_id,key' });
      if (error) throw error;
      if (meta.ts === ts) meta.dirty = false;
      meta.synced = ts; meta.ever = true; keep();
      say('已同步 · ' + hhmm(), true);
    } catch (e) { fail(e); setTimeout(push, 15000); } finally { busy = false; }
  }
  function fail(e) {
    if (/app_state|schema cache/i.test(e.message || '')) { ready = false; say('尚未建立雲端資料表（請執行 update-tables.sql），目前只存在這台裝置'); }
    else say('暫時無法連線，稍後自動同步');
  }
  async function pull(first) {
    const { data, error } = await client.from('app_state').select('data,updated_at').eq('key', KEYNAME).maybeSingle();
    if (error) throw error;
    const local = R().get();
    if (!data) { if (count(local)) { meta.ts = meta.ts || Date.now(); meta.dirty = true; keep(); await push(); } else say('已同步 · ' + hhmm(), true); return; }
    const cloud = data.data || {}, cts = cloud._ts || 0;
    if (first && !meta.ever && count(local) && count(cloud)) {
      // 第一次在這台裝置同步：兩邊都有清單，合併（同名的餐廳只留一筆）
      R().set({ company: mergeLists(cloud.company, local.company), home: mergeLists(cloud.home, local.home) });
      meta.ts = Date.now(); meta.dirty = true; keep(); await push(); return;
    }
    if (meta.dirty && meta.ts > cts) { await push(); return; }
    if (cts > (meta.synced || 0) || !meta.ever) { R().set(cloud); meta.ts = cts; meta.synced = cts; meta.dirty = false; meta.ever = true; keep(); }
    say('已同步 · ' + hhmm(), true);
  }
  window.addEventListener('restaurants-changed', () => {
    if (window.__rsApplying) return;
    meta.ts = Date.now(); meta.dirty = true; keep();
    if (ready) { say('有變更，準備同步…'); clearTimeout(timer); timer = setTimeout(push, 1000); }
  });
  // set() 不會觸發 restaurants-changed（它直接寫 localStorage），所以不會造成來回同步
  async function start() {
    client = window.dailyClient;
    if (!client || !R()) { say('只存在這台裝置（沒有連上雲端）'); return; }
    try { const { data } = await client.auth.getUser(); uid = data.user.id; } catch { return; }
    say('正在從雲端讀取…');
    try { ready = true; await pull(true); } catch (e) { fail(e); return; }
    setInterval(() => { if (!document.hidden && ready && !busy) pull(false).catch(() => {}); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!ready) return; if (document.hidden) { if (meta.dirty) push(); } else pull(false).catch(() => {}); });
  }
  const go = () => setTimeout(start, 0);
  if (document.documentElement.hasAttribute('data-locked')) window.addEventListener('daily-unlocked', () => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go, { once: true }) : go()), { once: true });
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();
