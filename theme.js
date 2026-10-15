// 風格切換：在 <head> 最前面載入，避免頁面先閃一下舊配色。
// 選擇的風格存在這台裝置的瀏覽器（localStorage），每台裝置可以各自不同。
(function () {
  'use strict';
  var KEY = 'daily-theme';
  var THEMES = [
    { id: 'cute', name: '療癒可愛', desc: '奶油米白、蜜桃粉與小兔子', colors: ['#FCF8F2', '#EF8D86', '#8FBF9F', '#F2C46D'] },
    { id: 'forest', name: '森林手帳', desc: '沙色紙張與森林綠', colors: ['#F5F3E7', '#007E6E', '#73AF6F', '#D7C097'] },
    { id: 'minimal-warm', name: '精簡暖白', desc: '留白多、保留一點珊瑚色', colors: ['#FFFFFF', '#D9776E', '#EAE3DA', '#3B2F28'] },
    { id: 'minimal', name: '精簡白', desc: '黑白灰，沒有插圖', colors: ['#FFFFFF', '#18181B', '#E4E4E7', '#71717A'] },
    { id: 'minimal-dark', name: '精簡深色', desc: '深色背景，晚上不刺眼', colors: ['#0F0F11', '#ECECEE', '#2C2C31', '#9B9BA4'] }
  ];
  var BG = { cute: '#FCF8F2', forest: '#F5F3E7', 'minimal-warm': '#FAF8F5', minimal: '#F6F6F7', 'minimal-dark': '#0F0F11' };

  function valid(id) { return THEMES.some(function (t) { return t.id === id; }); }
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  var current = read();
  if (!valid(current)) current = 'cute';
  document.documentElement.setAttribute('data-theme', current);

  function syncMeta() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', BG[current]);
  }

  function apply(id) {
    if (!valid(id)) return;
    current = id;
    document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(KEY, id); } catch (e) {}
    syncMeta();
    document.querySelectorAll('.theme-option').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.id === id));
    });
  }

  function build(slot) {
    var wrap = document.createElement('div');
    wrap.className = 'theme-switch';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7.2" r="1.2"/><circle cx="15" cy="7.6" r="1.2"/></svg><span>風格</span>';
    var pop = document.createElement('div');
    pop.className = 'theme-pop';
    pop.setAttribute('role', 'radiogroup');
    pop.setAttribute('aria-label', '選擇網站風格');
    pop.hidden = true;
    var title = document.createElement('p');
    title.className = 'theme-pop-title';
    title.textContent = '選擇風格';
    pop.append(title);
    THEMES.forEach(function (t) {
      var o = document.createElement('button');
      o.type = 'button';
      o.className = 'theme-option';
      o.dataset.id = t.id;
      o.setAttribute('role', 'radio');
      o.setAttribute('aria-checked', String(t.id === current));
      var sw = document.createElement('span');
      sw.className = 'theme-swatch';
      t.colors.forEach(function (c) { var i = document.createElement('i'); i.style.background = c; sw.append(i); });
      var text = document.createElement('span');
      text.className = 'theme-text';
      var n = document.createElement('strong'); n.textContent = t.name;
      var d = document.createElement('small'); d.textContent = t.desc;
      text.append(n, d);
      o.append(sw, text);
      o.onclick = function () { apply(t.id); };
      pop.append(o);
    });
    var note = document.createElement('p');
    note.className = 'theme-pop-note';
    note.textContent = '只改外觀，不影響資料。每台裝置可以選不同風格。';
    pop.append(note);
    function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.onclick = function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      btn.setAttribute('aria-expanded', String(!pop.hidden));
      if (!pop.hidden) (pop.querySelector('[aria-checked="true"]') || pop.querySelector('.theme-option')).focus();
    };
    pop.onclick = function (e) { e.stopPropagation(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); } });
    wrap.append(btn, pop);
    slot.replaceWith(wrap);
  }

  window.dailyTheme = { themes: THEMES, get: function () { return current; }, set: apply };
  function init() { syncMeta(); document.querySelectorAll('[data-theme-switch]').forEach(build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
