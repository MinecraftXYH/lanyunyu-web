// 前台导航栏登录态显示：未登录显示"登录/注册"；登录后显示头像+用户名，点击下拉个人中心/退出
(function () {
  const AUTH_KEY = 'lyy_user_token';

  function getToken() { return localStorage.getItem(AUTH_KEY) || ''; }
  function clearToken() { localStorage.removeItem(AUTH_KEY); }

  const DEFAULT_AVATAR = 'assets/images/default-avatar.jpeg';

  function buildAvatarHTML(user) {
    const name = user.username || '玩家';
    const avatar = user.avatar || DEFAULT_AVATAR;
    return `<img class="nav-avatar" src="${avatar}" alt="${name} 头像" onerror="this.src='${DEFAULT_AVATAR}'" /><span class="nav-username">${name}</span>`;
  }

  // 供外部调用：user 为 null 表示未登录
  window.__updateNavState = function (user) {
    const link = document.getElementById('navAccount');
    const extra = document.getElementById('navExtra');
    if (!link) return;
    if (user && user.username) {
      link.href = 'account.html';
      link.className = 'nav-user';
      link.innerHTML = buildAvatarHTML(user);
      if (extra) extra.innerHTML = '';

      // 点击头像展开下拉菜单
      link.onclick = (e) => {
        e.preventDefault();
        let menu = document.getElementById('navUserMenu');
        if (menu) {
          menu.remove();
          return;
        }
        const rect = link.getBoundingClientRect();
        menu = document.createElement('div');
        menu.id = 'navUserMenu';
        menu.className = 'nav-user-menu';
        menu.innerHTML = `
          <a href="account.html">个人中心</a>
          <button id="navLogoutBtn">退出登录</button>
        `;
        document.body.appendChild(menu);
        const menuRect = menu.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';

        menu.querySelector('#navLogoutBtn').addEventListener('click', () => {
          clearToken();
          if (window.__updateNavState) window.__updateNavState(null);
          if (window.location.pathname.indexOf('account.html') >= 0) location.reload();
        });

        // 点击外部关闭
        const close = (ev) => {
          if (!menu.contains(ev.target) && ev.target !== link && !link.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('click', close);
          }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
      };
    } else {
      link.textContent = '登录 / 注册';
      link.href = 'account.html';
      link.className = 'nav-login';
      link.onclick = null;
      if (extra) extra.innerHTML = '';
      const menu = document.getElementById('navUserMenu');
      if (menu) menu.remove();
    }
  };

  // 页面加载时根据 token 拉取用户资料
  (async function init() {
    const token = getToken();
    if (!token) { if (window.__updateNavState) window.__updateNavState(null); return; }
    try {
      const r = await fetch('/api/users?action=me', { headers: { Authorization: 'Bearer ' + token } });
      const j = await r.json();
      if (r.ok && j.username) { if (window.__updateNavState) window.__updateNavState(j); }
      else { clearToken(); if (window.__updateNavState) window.__updateNavState(null); }
    } catch {
      if (window.__updateNavState) window.__updateNavState(null);
    }
  })();
})();
