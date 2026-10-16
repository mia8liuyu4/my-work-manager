// 匯入檔案成為筆記：PDF、Word（.docx）、純文字（.txt / .md / .csv）。
// 只擷取文字存進筆記（之後可以搜尋）；原始檔案不會上傳。
// 需要 notes.js 先載入（使用其中的 sectionId、flush、createPage、message）。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const btn = $('importBtn'), input = $('importFile');
  if (!btn || !input) return;
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';
  const MAMMOTH = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
  const MAX = 300000;
  const loaded = {};
  function load(src) {
    return loaded[src] || (loaded[src] = new Promise((ok, bad) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => { delete loaded[src]; bad(Error('讀取元件下載失敗，請確認網路後再試一次。')); };
      document.head.append(s);
    }));
  }

  async function readPdf(file) {
    await load(PDFJS + 'build/pdf.min.js');
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
    let doc;
    try {
      doc = await lib.getDocument({ data: await file.arrayBuffer(), cMapUrl: PDFJS + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS + 'standard_fonts/' }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') throw Error('這個 PDF 有密碼保護，請先解除密碼再匯入。');
      throw e;
    }
    const out = [];
    for (let n = 1; n <= doc.numPages; n++) {
      message(`正在讀取「${file.name}」… 第 ${n} / ${doc.numPages} 頁`);
      const page = await doc.getPage(n);
      const tc = await page.getTextContent();
      let text = '', lastY = null;
      for (const it of tc.items) {
        if (!('str' in it)) continue;
        const y = it.transform ? Math.round(it.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !text.endsWith('\n')) text += '\n';
        text += it.str;
        if (it.hasEOL && !text.endsWith('\n')) text += '\n';
        lastY = y;
      }
      out.push((doc.numPages > 1 ? `── 第 ${n} 頁 ──\n` : '') + text.trim());
      if (out.join('').length > MAX) break;
    }
    return out.join('\n\n');
  }

  async function readDocx(file) {
    await load(MAMMOTH);
    const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }

  function clean(t) {
    // 有些 PDF 會把「一、大、小」存成長得很像的部首字元，轉回一般中文字，搜尋才找得到
    return t.replace(/[\u2E80-\u2FDF]/g, c => c.normalize('NFKC')).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  async function importFile(file) {
    if ((file.type || '').startsWith('image/') && window.noteInsertImage) { await window.noteInsertImage(file); return; }
    if (!sectionId) { message('請先在左邊選擇或新增一個分類，再匯入檔案。'); return; }
    if (!await flush()) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    btn.disabled = true;
    message(`正在讀取「${file.name}」…`);
    try {
      if (file.size > 50 * 1024 * 1024) throw Error('檔案超過 50 MB，請先分成幾個小檔再匯入。');
      let text;
      if (ext === 'pdf' || file.type === 'application/pdf') text = await readPdf(file);
      else if (ext === 'docx') text = await readDocx(file);
      else if (ext === 'doc') throw Error('舊版 Word（.doc）無法直接讀取，請在 Word 另存成 .docx 或 PDF 再匯入。');
      else if (['txt', 'md', 'csv', 'tsv', 'json'].includes(ext) || (file.type || '').startsWith('text/')) text = await file.text();
      else throw Error('目前支援 PDF、Word（.docx）和純文字檔。');
      text = clean(text);
      const pageMarks = (text.match(/── 第 \d+ 頁 ──/g) || []).length;
      if (!text || text.replace(/── 第 \d+ 頁 ──/g, '').trim().length < 5) {
        throw Error('這個檔案讀不到文字。如果是用掃描器掃成圖片的 PDF，需要先用有「文字辨識（OCR）」功能的工具轉換，再匯入。');
      }
      let cut = false;
      if (text.length > MAX) { text = text.slice(0, MAX); cut = true; }
      const title = file.name.replace(/\.[^.]+$/, '').slice(0, 190) || '匯入的檔案';
      const head = `📎 匯入自：${file.name}（${new Date().toLocaleDateString('zh-TW')}${pageMarks ? '，共 ' + pageMarks + ' 頁' : ''}）\n\n`;
      await createPage({ title, content: head + text });
      message(cut ? `已匯入「${title}」。檔案很長，只保留了前 30 萬字。` : `已匯入「${title}」，之後用上方搜尋就能找到裡面的內容。`);
    } catch (e) {
      message('匯入失敗：' + (e.message || e));
    } finally {
      btn.disabled = false;
    }
  }

  btn.onclick = () => { if (!sectionId) { message('請先在左邊選擇或新增一個分類，再匯入檔案。'); return; } input.click(); };
  input.onchange = async () => {
    const files = [...input.files]; input.value = '';
    for (const f of files) await importFile(f);
  };

  // 也可以直接把檔案拖進筆記區
  const zone = $('workspace');
  let depth = 0;
  zone.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { depth++; zone.classList.add('dropping'); } });
  zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('dropping'); });
  zone.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  zone.addEventListener('drop', async e => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault(); depth = 0; zone.classList.remove('dropping');
    for (const f of [...e.dataTransfer.files]) await importFile(f);
  });
})();

// 從網頁、Word 等地方貼上時，自動把一大堆空行收成一行空行
(() => {
  const ta = document.getElementById('content');
  if (!ta) return;
  ta.addEventListener('paste', e => {
    const raw = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!raw) return;
    const t = raw.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    if (t === raw) return;
    e.preventDefault();
    ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
})();
