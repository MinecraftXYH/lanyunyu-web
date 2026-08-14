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
  document.getElementById('profAvatar').src = me.avatar || 'assets/images/default-avatar.jpeg';
  document.getElementById('profBio').value = me.bio || '';
  document.getElementById('bioLen').textContent = (me.bio || '').length;
  if (me.createdAt) {
    const d = new Date(me.createdAt);
    document.getElementById('profCreated').textContent = '加入于 ' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
}

function showAuth() {
  document.getElementById('authWrap').style.display = 'block';
  document.getElementById('profileWrap').style.display = 'none';
}

function setMode(mode) {
  const isLogin = mode === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('regForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authModeTitle').textContent = isLogin ? '登录' : '注册';
  setErr('loginErr', ''); setErr('regErr', '');
}

document.getElementById('toRegister').addEventListener('click', function (e) {
  e.preventDefault(); setMode('register');
});
document.getElementById('toLogin').addEventListener('click', function (e) {
  e.preventDefault(); setMode('login');
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
    me = r.data;
    syncNav();
    location.href = 'index.html';
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
      me = lr.data;
      syncNav();
      location.href = 'index.html';
    } else {
      // 注册成功但自动登录失败，切到登录页
      setMode('login');
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

// 签名长度提示
document.getElementById('profBio').addEventListener('input', function () {
  document.getElementById('bioLen').textContent = this.value.length;
});

// 保存签名
document.getElementById('saveBioBtn').addEventListener('click', async function () {
  const bio = document.getElementById('profBio').value.trim();
  setErr('bioMsg', '');
  const r = await api('/api/update-profile', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ bio })
  });
  if (r.ok) {
    me.bio = bio;
    setErr('bioMsg', '✅ 签名已保存');
  } else {
    setErr('bioMsg', r.data.msg || '保存失败');
  }
});

// 上传头像
document.getElementById('profAvatar').addEventListener('click', function () {
  document.getElementById('avatarInput').click();
});
document.getElementById('avatarInput').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setErr('bioMsg', '仅支持 jpg/png/webp');
  if (file.size > 1024 * 1024) return setErr('bioMsg', '图片超过 1MB，请先压缩');

  const reader = new FileReader();
  reader.onload = async function () {
    setErr('bioMsg', '上传中…');
    const up = await api('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ dataUrl: reader.result, name: file.name })
    });
    if (!up.ok) { setErr('bioMsg', up.data.msg || '头像上传失败'); return; }

    const r = await api('/api/update-profile', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ avatar: up.data.url })
    });
    if (r.ok) {
      me.avatar = up.data.url;
      document.getElementById('profAvatar').src = up.data.url + '?t=' + Date.now();
      syncNav();
      setErr('bioMsg', '✅ 头像已更新');
    } else {
      setErr('bioMsg', r.data.msg || '头像保存失败');
    }
  };
  reader.readAsDataURL(file);
});

// 我的主页
document.getElementById('myProfileBtn').addEventListener('click', function () {
  if (me && me.username) location.href = 'profile.html?u=' + encodeURIComponent(me.username);
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
