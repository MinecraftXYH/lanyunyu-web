// 蓝云屿 · 玩家中心 前端逻辑
const AUTH_KEY = 'lyy_user_token';

function getToken() { return localStorage.getItem(AUTH_KEY) || ''; }
function setToken(t) { localStorage.setItem(AUTH_KEY, t); }
function clearToken() { localStorage.removeItem(AUTH_KEY); }

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = {};
  try { j = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data: j };
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').style.display = isLogin ? '' : 'none';
  document.getElementById('regForm').style.display = isLogin ? 'none' : '';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabReg').classList.toggle('active', !isLogin);
}

function showAuth() {
  document.getElementById('authPanel').style.display = '';
  document.getElementById('userPanel').style.display = 'none';
  if (window.__updateNavState) window.__updateNavState(null);
}

function showUser(user) {
  document.getElementById('authPanel').style.display = 'none';
  document.getElementById('userPanel').style.display = '';
  document.getElementById('userName').textContent = user.username;
  document.getElementById('userAvatar').textContent = (user.username || '玩').charAt(0);
  document.getElementById('profileQq').value = user.qq || '';
  const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '';
  document.getElementById('userCreated').textContent = created ? '加入于 ' + created : '';
  if (window.__updateNavState) window.__updateNavState(user.username);
}

async function loadMe() {
  const token = getToken();
  if (!token) { showAuth(); return; }
  const r = await api('GET', '/api/me');
  if (r.ok) showUser(r.data);
  else { clearToken(); showAuth(); }
}

// ---------- 事件绑定 ----------
document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
document.getElementById('tabReg').addEventListener('click', () => switchTab('reg'));

document.getElementById('loginBtn').addEventListener('click', async () => {
  const err = document.getElementById('loginErr');
  err.textContent = '';
  const r = await api('POST', '/api/auth', {
    username: document.getElementById('loginUser').value,
    password: document.getElementById('loginPwd').value
  });
  if (r.ok) {
    setToken(r.data.token);
    showToast('登录成功');
    loadMe();
  } else {
    err.textContent = r.data.msg || '登录失败';
  }
});

document.getElementById('regBtn').addEventListener('click', async () => {
  const err = document.getElementById('regErr');
  err.textContent = '';
  const r = await api('POST', '/api/register', {
    username: document.getElementById('regUser').value,
    password: document.getElementById('regPwd').value,
    qq: document.getElementById('regQq').value
  });
  if (r.ok) {
    // 注册成功后自动登录
    const loginR = await api('POST', '/api/auth', {
      username: document.getElementById('regUser').value,
      password: document.getElementById('regPwd').value
    });
    if (loginR.ok) { setToken(loginR.data.token); showToast('注册成功'); loadMe(); }
    else { switchTab('login'); err.textContent = '注册成功，请手动登录'; }
  } else {
    err.textContent = r.data.msg || '注册失败';
  }
});

document.getElementById('profileBtn').addEventListener('click', async () => {
  const err = document.getElementById('profileErr');
  const okMsg = document.getElementById('profileOk');
  err.textContent = ''; okMsg.textContent = '';
  const newPwd = document.getElementById('profileNew').value;
  const oldPwd = document.getElementById('profileOld').value;
  if (newPwd && !oldPwd) { err.textContent = '修改密码需先填写原密码'; return; }
  const r = await api('PUT', '/api/me', {
    password: oldPwd,
    newPassword: newPwd,
    qq: document.getElementById('profileQq').value
  });
  if (r.ok) { okMsg.textContent = '已保存 ✓'; showToast('资料已更新'); }
  else { err.textContent = r.data.msg || '保存失败'; }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken(); showAuth(); showToast('已退出');
});

loadMe();
