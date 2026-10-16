// 生活紀錄的共用工具：倒數日、午餐記帳、小確幸、心情都存在 personal_records 這張表。
(() => {
  'use strict';
  const TABLE = 'personal_records';
  const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const cli = () => window.dailyClient;
  function check(r) { if (r.error) throw r.error; return r.data; }
  function missing(e) { return /personal_records|schema cache|relation .* does not exist/i.test((e && e.message) || ''); }
  const HINT = '這個功能需要先建立資料表：請到 Supabase 的 SQL Editor 執行 records.sql（只要一次）。';
  window.dailyRecords = {
    key, missing, HINT,
    friendly(e) { return missing(e) ? HINT : ((e && e.message) || '連線失敗，請稍後再試'); },
    async list(kinds, from, to) {
      let q = cli().from(TABLE).select('*').in('kind', [].concat(kinds));
      if (from) q = q.gte('day', from);
      if (to) q = q.lte('day', to);
      return check(await q.order('day', { ascending: true }).order('created_at', { ascending: true }));
    },
    async add(rec) { return check(await cli().from(TABLE).insert(rec).select())[0]; },
    async remove(id) { check(await cli().from(TABLE).delete().eq('id', id)); },
    async setMood(day, mood) {
      check(await cli().from(TABLE).delete().eq('kind', 'mood').eq('day', day));
      check(await cli().from(TABLE).insert({ kind: 'mood', day, title: mood }));
    }
  };
  // 等登入完成、而且整頁都載入後才執行
  window.whenDailyReady = fn => {
    const go = () => setTimeout(fn, 0);
    const afterDom = () => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go, { once: true }) : go());
    if (document.documentElement.hasAttribute('data-locked')) window.addEventListener('daily-unlocked', afterDom, { once: true });
    else afterDom();
  };
})();
