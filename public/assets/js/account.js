// 前台玩家账号：登录 / 注册 / 改密码 / 登出 / 同步导航
const AUTH_KEY = 'lyy_user_token';
let token = localStorage.getItem(AUTH_KEY) || '';
let me = null;

function setErr(id, msg) { document.getElementById(id).textContent = msg || ''; }

async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let j = {};
  try { j = await res.json(); } catch (e) {}
  return { ok: res.ok, status: res.status, data: j };
}

async function refreshMe() {
  if (!token) { me = null; return; }
  const r = await api('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
  if (r.ok) { me = r.data; }
  else { token = ''; localStorage.removeItem(AUTH_KEY); me = null; }
}

// 同步导航栏入口（与 nav-user.js 共用）
function syncNav() {
  if (window.__updateNavState) window.__updateNavState(me && me.username ? me.username : null);
}

function showProfile() {
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('profileWrap').style.display = 'block';
  document.getElementById('profName').textContent = me.username;
  document.getElementById('profQq').textContent = me.qq ? ('已绑定 QQ：' + me.qq) : '未绑定 QQ（注册时可填）';
  document.getElementById('accTitle').textContent = '个人中心';
}

function showAuth() {
  document.getElementById('authWrap').style.display = 'block';
  document.getElementById('profileWrap').style.display = 'none';
  document.getElementById('accTitle').textContent = '登录 / 注册';
}

// 标签切换
document.querySelectorAll('.auth-tab').forEach(function (t) {
  t.addEventListener('click', function () {
    document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.getAttribute('data-tab');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('regForm').style.display = tab === 'register' ? 'block' : 'none';
    setErr('loginErr', ''); setErr('regErr', '');
  });
});

// 登录
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  setErr('loginErr', '');
  const r = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ username: document.getElementById('loginUser').value.trim(), pwd: document.getElementById('loginPwd').value })
  });
  if (r.ok) {
    token = r.data.token;
    localStorage.setItem(AUTH_KEY, token);
    me = { username: r.data.username, qq: r.data.qq };
    syncNav(); showProfile();
  } else {
    setErr('loginErr', r.data.msg || '登录失败');
  }
});

// 注册
document.getElementById('regForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  setErr('regErr', '');
  const r = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({
      username: document.getElementById('regUser').value.trim(),
      pwd: document.getElementById('regPwd').value,
      qq: document.getElementById('regQq').value.trim()
    })
  });
  if (r.ok) {
    // 注册成功自动登录
    const lr = await api('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: document.getElementById('regUser').value.trim(), pwd: document.getElementById('regPwd').value })
    });
    if (lr.ok) {
      token = lr.data.token;
      localStorage.setItem(AUTH_KEY, token);
      me = { username: lr.data.username, qq: lr.data.qq };
      syncNav(); showProfile();
    } else {
      // 注册成功但自动登录失败，切到登录页
      document.querySelector('.auth-tab[data-tab="login"]').click();
      setErr('loginErr', '注册成功，请登录');
    }
  } else {
    setErr('regErr', r.data.msg || '注册失败');
  }
});

// 改密码
document.getElementById('pwdForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  setErr('pwdMsg', '');
  const r = await api('/api/change-pwd', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ oldPwd: document.getElementById('oldPwd').value, newPwd: document.getElementById('newPwd').value })
  });
  if (r.ok) {
    setErr('pwdMsg', '✅ 密码已更新，请重新登录');
    document.getElementById('oldPwd').value = '';
    document.getElementById('newPwd').value = '';
    setTimeout(async function () {
      await api('/api/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
      token = ''; localStorage.removeItem(AUTH_KEY); me = null;
      syncNav(); showAuth();
    }, 1200);
  } else {
    setErr('pwdMsg', r.data.msg || '修改失败');
  }
});

// 登出
document.getElementById('logoutBtn').addEventListener('click', async function () {
  await api('/api/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
  token = ''; localStorage.removeItem(AUTH_KEY); me = null;
  syncNav(); showAuth();
});

// 初始化
(async function () {
  await refreshMe();
  syncNav();
  if (me && me.username) showProfile(); else showAuth();
})();
