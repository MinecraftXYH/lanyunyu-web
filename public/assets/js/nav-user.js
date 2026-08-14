// 前台导航栏登录态显示：在 nav-links 里显示"玩家中心"或"用户名 + 退出"
(function () {
  const AUTH_KEY = 'lyy_user_token';

  function getToken() { return localStorage.getItem(AUTH_KEY) || ''; }
  function clearToken() { localStorage.removeItem(AUTH_KEY); }

  // 供 account.js 调用：uname 为 null 表示未登录
  window.__updateNavState = function (uname) {
    const link = document.getElementById('navAccount');
    const extra = document.getElementById('navExtra');
    if (!link) return;
    if (uname) {
      link.textContent = '👤 ' + uname;
      link.href = 'account.html';
      link.classList.add('nav-login');
      if (!extra) return;
      extra.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'nav-logout';
      btn.textContent = '退出';
      btn.addEventListener('click', function () {
        clearToken();
        if (window.__updateNavState) window.__updateNavState(null);
        if (window.location.pathname.indexOf('account.html') >= 0) location.reload();
      });
      extra.appendChild(btn);
    } else {
      link.textContent = '登录 / 注册';
      link.href = 'account.html';
      link.classList.add('nav-login');
      if (extra) extra.innerHTML = '';
    }
  };

  // 页面加载时根据 token 拉取用户名
  (async function init() {
    const token = getToken();
    if (!token) { if (window.__updateNavState) window.__updateNavState(null); return; }
    try {
      const r = await fetch('/api/users?action=me', { headers: { Authorization: 'Bearer ' + token } });
      const j = await r.json();
      if (r.ok && j.username) { if (window.__updateNavState) window.__updateNavState(j.username); }
      else { clearToken(); if (window.__updateNavState) window.__updateNavState(null); }
    } catch {
      if (window.__updateNavState) window.__updateNavState(null);
    }
  })();
})();
