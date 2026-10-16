// 登入守門：登入一次後，只要沒有按「登出」，換頁、關掉再打開都不用重新登入。
// 換頁時先用這台裝置記住的登入狀態直接進入（不等網路），再在背景確認帳號仍然有效。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const REMEMBER = 'daily-remember';
  const remember = () => { try { return localStorage.getItem(REMEMBER) !== '0'; } catch { return true; } };
  // 登入資訊放在 localStorage（保持登入）或 sessionStorage（關閉分頁就登出），讀取時兩邊都找
  const store = {
    getItem: k => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
    setItem: (k, v) => { try { (remember() ? localStorage : sessionStorage).setItem(k, v); (remember() ? sessionStorage : localStorage).removeItem(k); } catch {} },
    removeItem: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} }
  };
  let client, user;
  const gate = document.createElement('section');
  gate.id = 'privacyGate';
  gate.className = 'checking';
  gate.innerHTML = `<div class="gate-card"><img src="app-icon.png" class="gate-icon" alt="兔兔網站圖示"><h1>歡迎回到我的日常</h1><p>登入自己的帳號，再開始今天的小日常。</p><p id="gateMessage" role="status" aria-live="polite">正在檢查登入狀態…</p>
    <form id="gateLogin"><label>Email<input id="gateEmail" type="email" autocomplete="username" required></label><label>密碼<input id="gatePassword" type="password" autocomplete="current-password" required></label>
    <label class="gate-remember"><input id="gateRemember" type="checkbox" checked> 在這台裝置保持登入 <small>（公用電腦請取消勾選）</small></label>
    <button id="gateSubmit" type="submit" disabled>登入</button></form>
    <form id="gateNickname" hidden><label>希望怎麼稱呼你？<input id="gateName" maxlength="20" required autocomplete="nickname" placeholder="輸入暱稱"></label><button id="gateNameSave" type="submit">儲存暱稱並進入</button><p>暱稱會存入自己的帳號，只用於頁面稱呼。</p></form>
    <p>私人使用：不開放網頁自行註冊。帳號請在自己的 Supabase 管理後台建立。</p></div>`;
  document.body.prepend(gate);
  $('gateRemember').checked = remember();
  // 只有真的需要登入時才顯示登入畫面；正常換頁時看不到它
  const showGate = () => gate.classList.remove('checking');
  const slow = setTimeout(showGate, 1500);
  const msg = s => { $('gateMessage').textContent = s; };

  let unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true; clearTimeout(slow);
    gate.hidden = true;
    document.documentElement.removeAttribute('data-locked');
    const lock = document.createElement('button');
    lock.id = 'siteLock'; lock.type = 'button'; lock.textContent = '登出';
    lock.title = '登出後，這台裝置需要重新登入';
    lock.onclick = async () => {
      if (!confirm('確定要登出嗎？登出後這台裝置需要重新登入。')) return;
      const { error } = await client.auth.signOut();
      if (error) { alert('登出失敗：' + error.message); return; }
      location.reload();
    };
    document.body.append(lock);
    const name = user.user_metadata?.nickname || '';
    const title = $('greetingTitle'), button = $('nicknameButton');
    if (title) title.textContent = '嗨，' + name + '！';
    if (button) {
      button.textContent = '暱稱：' + name;
      button.onclick = () => { document.documentElement.setAttribute('data-locked', ''); gate.hidden = false; showGate(); $('gateLogin').hidden = true; $('gateNickname').hidden = false; $('gateName').value = name; msg('修改你的暱稱'); };
    }
    window.dispatchEvent(new Event('daily-unlocked'));
  }
  function relock(text) {
    unlocked = false;
    document.documentElement.setAttribute('data-locked', '');
    gate.hidden = false; showGate();
    $('gateLogin').hidden = false; $('gateNickname').hidden = true;
    $('siteLock')?.remove(); $('gateSubmit').disabled = false;
    msg(text);
  }
  function profile() {
    const name = user.user_metadata?.nickname;
    $('gateLogin').hidden = true;
    if (!name?.trim()) { showGate(); $('gateNickname').hidden = false; msg('首次登入，先設定一個暱稱。'); $('gateName').focus(); }
    else unlock();
  }

  $('gateLogin').onsubmit = async e => {
    e.preventDefault();
    $('gateSubmit').disabled = true; msg('登入中…');
    try { localStorage.setItem(REMEMBER, $('gateRemember').checked ? '1' : '0'); } catch {}
    try {
      const { error } = await client.auth.signInWithPassword({ email: $('gateEmail').value.trim(), password: $('gatePassword').value });
      if (error) throw error;
      $('gatePassword').value = '';
      location.reload();
    } catch (err) { msg('登入失敗：' + err.message); } finally { $('gateSubmit').disabled = false; }
  };
  $('gateNickname').onsubmit = async e => {
    e.preventDefault();
    const name = $('gateName').value.trim();
    if (!name) { msg('請輸入暱稱'); return; }
    $('gateNameSave').disabled = true;
    try { const { data, error } = await client.auth.updateUser({ data: { nickname: name } }); if (error) throw error; user = data.user; location.reload(); }
    catch (err) { msg('無法儲存暱稱：' + err.message); } finally { $('gateNameSave').disabled = false; }
  };

  (async () => {
    try {
      const c = window.NOTES_CONFIG;
      if (!window.supabase || !c || !/^https:\/\//.test(c.url) || !c.key || c.key.includes('填入')) throw Error('請確認網路，以及自己的 supabase-config.js 設定。');
      client = window.dailyClient = window.supabase.createClient(c.url, c.key, { auth: { storage: store, persistSession: true, autoRefreshToken: true } });
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      if (session) {
        user = session.user; profile();
        // 背景確認帳號仍然有效（例如密碼被改、帳號被停用）
        client.auth.getUser().then(({ data, error: e2 }) => {
          if (e2 && /invalid|expired|not found|jwt|session/i.test(e2.message || '') && !/fetch|network/i.test(e2.message || '')) { client.auth.signOut().finally(() => relock('登入已過期，請重新登入')); return; }
          if (data?.user) user = data.user;
        }).catch(() => {});
      } else { showGate(); msg('請登入後使用'); $('gateSubmit').disabled = false; $('gateEmail').focus(); }
      client.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') relock('已登出，請重新登入'); });
    } catch (err) { showGate(); msg(err.message); }
  })();
})();
