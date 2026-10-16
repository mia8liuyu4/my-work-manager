// 筆記簡單格式：標題、粗體、核取清單、清單、引言、分隔線、圖片
// 內容用 Markdown 寫法存成文字（例：# 標題、**粗體**、- [ ] 待辦），所以搜尋、下載都照常可用。
// 圖片縮小後存在 Supabase 的 note_images 資料表，筆記裡只放 ![圖片](img:編號)。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ta = $('content'), view = $('preview'), bar = $('fmtBar');
  if (!ta || !view || !bar) return;
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const imgCache = new Map();
  let mode = 'preview';
  try { mode = localStorage.getItem('notes-mode') || 'preview'; } catch {}

  /* ---------- Markdown → HTML（只支援常用的幾種，安全地轉義） ---------- */
  function inline(s) {
    let t = esc(s);
    t = t.replace(/!\[([^\]]*)\]\((img:[\w-]+|https?:\/\/[^\s)]+)\)/g, (m, alt, src) => src.startsWith('img:')
      ? `<img class="nimg" data-img="${src.slice(4)}" alt="${alt}">`
      : `<img class="nimg" src="${src}" alt="${alt}" loading="lazy">`);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    t = t.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    return t;
  }
  function render(text) {
    const lines = text.split('\n'), out = [];
    let list = null;
    const close = () => { if (list) { out.push(list === 'ol' ? '</ol>' : '</ul>'); list = null; } };
    lines.forEach((line, i) => {
      let m;
      if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/))) {
        if (list !== 'checks') { close(); out.push('<ul class="checks">'); list = 'checks'; }
        const on = m[1] !== ' ';
        out.push(`<li class="${on ? 'on' : ''}"><label><input type="checkbox" data-line="${i}" ${on ? 'checked' : ''}><span>${inline(m[2])}</span></label></li>`);
        return;
      }
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); return; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); return; }
      close();
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); return; }
      if (/^\s*(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); return; }
      if ((m = line.match(/^>\s?(.*)$/))) { out.push(`<blockquote>${inline(m[1])}</blockquote>`); return; }
      if (!line.trim()) { out.push('<div class="gap"></div>'); return; }
      out.push(`<p>${inline(line)}</p>`);
    });
    close();
    return out.join('');
  }

  /* ---------- 圖片 ---------- */
  async function loadImages() {
    const need = [...view.querySelectorAll('img[data-img]')].filter(im => !im.src);
    const missing = [...new Set(need.map(im => im.dataset.img).filter(id => !imgCache.has(id)))];
    if (missing.length && window.dailyClient) {
      try {
        const { data, error } = await window.dailyClient.from('note_images').select('id,data').in('id', missing);
        if (error) throw error;
        (data || []).forEach(r => imgCache.set(r.id, r.data));
      } catch (e) { need.forEach(im => { im.alt = /note_images|schema/.test(e.message || '') ? '（圖片需要先執行 update-tables.sql）' : '（圖片讀取失敗）'; im.classList.add('broken'); }); return; }
    }
    need.forEach(im => { const d = imgCache.get(im.dataset.img); if (d) im.src = d; else { im.alt = '（找不到這張圖片）'; im.classList.add('broken'); } });
  }
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(Error('圖片讀不出來')); i.src = url; });
      const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.8);
    } finally { URL.revokeObjectURL(url); }
  }
  async function insertImage(file) {
    if (!window.dailyClient) { msg('沒有連上雲端，無法加入圖片。'); return; }
    if ($('fields').classList.contains('hidden')) { msg('請先打開或新增一篇筆記，再加入圖片。'); return; }
    msg('正在處理圖片…');
    try {
      const data = await shrink(file);
      const { data: rows, error } = await window.dailyClient.from('note_images').insert({ data }).select('id');
      if (error) throw error;
      imgCache.set(rows[0].id, data);
      insertAt(`\n![${(file.name || '圖片').replace(/\.[^.]+$/, '').replace(/[[\]]/g, '').slice(0, 30) || '圖片'}](img:${rows[0].id})\n`);
      msg('圖片已加入。');
    } catch (e) { msg(/note_images|schema/.test(e.message || '') ? '加入圖片前，請先到 Supabase 執行 update-tables.sql（只要一次）。' : '圖片加入失敗：' + e.message); }
  }
  window.noteInsertImage = insertImage;
  function msg(t) { const m = $('message'); if (m) m.textContent = t; }

  /* ---------- 工具列 ---------- */
  function insertAt(text, wrapBefore, wrapAfter) {
    const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
    let ins, caretFrom, caretTo;
    if (wrapBefore !== undefined) { ins = wrapBefore + (sel || text) + wrapAfter; caretFrom = s + wrapBefore.length; caretTo = caretFrom + (sel || text).length; }
    else { ins = text; caretFrom = caretTo = s + text.length; }
    ta.setRangeText(ins, s, e, 'end'); ta.setSelectionRange(caretFrom, caretTo); ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function prefixLines(prefix, toggleRe) {
    const v = ta.value, s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, eIdx = v.indexOf('\n', ta.selectionEnd), e = eIdx < 0 ? v.length : eIdx;
    const block = v.slice(s, e).split('\n');
    const all = block.every(l => toggleRe.test(l));
    const next = block.map((l, i) => all ? l.replace(toggleRe, '') : (typeof prefix === 'function' ? prefix(i) : prefix) + l.replace(/^(\s*([-*•]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+|#{1,3}\s+|>\s?))/, '')).join('\n');
    ta.setRangeText(next, s, e, 'select'); ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const ACTIONS = {
    h: () => prefixLines('## ', /^#{1,3}\s+/),
    b: () => insertAt('粗體文字', '**', '**'),
    hl: () => insertAt('重點', '==', '=='),
    check: () => prefixLines('- [ ] ', /^\s*[-*]\s+\[[ xX]\]\s?/),
    ul: () => prefixLines('- ', /^\s*[-*•]\s+(?!\[)/),
    ol: () => prefixLines(i => `${i + 1}. `, /^\s*\d+[.)]\s+/),
    quote: () => prefixLines('> ', /^>\s?/),
    hr: () => insertAt('\n---\n'),
    img: () => $('imgFile').click()
  };
  bar.addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (!b) return; if (mode !== 'edit') setMode('edit'); ACTIONS[b.dataset.fmt]?.(); });
  $('imgFile').addEventListener('change', async () => { for (const f of [...$('imgFile').files]) await insertImage(f); $('imgFile').value = ''; });
  ta.addEventListener('paste', e => {
    const files = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
    if (files.length) { e.preventDefault(); e.stopImmediatePropagation(); files.reduce((p, f) => p.then(() => insertImage(f)), Promise.resolve()); }
  }, true);
  // 清單裡按 Enter 自動接下一項
  ta.addEventListener('keydown', e => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ACTIONS.b(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const v = ta.value, s = ta.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s);
    const m = line.match(/^(\s*)([-*]\s+\[[ xX]\]\s|[-*•]\s+|(\d+)[.)]\s+)(.*)$/);
    if (!m) return;
    e.preventDefault();
    if (!m[4].trim()) { ta.setRangeText('', ls, s, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const next = m[3] ? `${+m[3] + 1}. ` : m[2].replace(/\[[xX]\]/, '[ ]');
    insertAt('\n' + m[1] + next);
  });

  /* ---------- 預覽／編輯 ---------- */
  function setMode(m) {
    mode = m;
    try { localStorage.setItem('notes-mode', m); } catch {}
    const edit = m === 'edit';
    ta.classList.toggle('hidden', !edit); view.classList.toggle('hidden', edit);
    $('modeEdit').setAttribute('aria-pressed', String(edit)); $('modePreview').setAttribute('aria-pressed', String(!edit));
    if (edit) ta.focus(); else paint(true);
  }
  $('modeEdit').onclick = () => setMode('edit');
  $('modePreview').onclick = () => setMode('preview');
  view.addEventListener('dblclick', e => { if (!e.target.closest('input,a,img')) setMode('edit'); });
  view.addEventListener('change', e => {
    const cb = e.target.closest('input[data-line]'); if (!cb) return;
    const lines = ta.value.split('\n'), i = +cb.dataset.line;
    lines[i] = lines[i].replace(/\[( |x|X)\]/, cb.checked ? '[x]' : '[ ]');
    ta.value = lines.join('\n'); last = ta.value;
    cb.closest('li').classList.toggle('on', cb.checked);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  view.addEventListener('click', e => { const im = e.target.closest('img.nimg'); if (im && im.src) { const w = window.open(); if (w) { w.document.title = im.alt || '圖片'; w.document.body.style.margin = '0'; const big = w.document.createElement('img'); big.src = im.src; big.style.maxWidth = '100%'; w.document.body.append(big); } } });
  let last = null;
  function paint(force) {
    if (!force && ta.value === last) return;
    last = ta.value;
    view.innerHTML = ta.value.trim() ? render(ta.value) : '<p class="muted">（空白筆記，按「編輯」開始寫）</p>';
    loadImages();
  }
  setInterval(() => { if (mode === 'preview' && !document.hidden) paint(false); }, 400);
  setMode(mode);
})();
