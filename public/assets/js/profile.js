// 个人主页
const AUTH_KEY = 'lyy_user_token';
let token = localStorage.getItem(AUTH_KEY) || '';
let currentUser = null;
let pageUser = null;
let pageData = null;

async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let j = {};
  try { j = await res.json(); } catch (e) {}
  return { ok: res.ok, data: j };
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

async function init() {
  const params = new URLSearchParams(location.search);
  const username = params.get('u');
  if (!username) return location.href = 'index.html';

  if (token) {
    const r = await api('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (r.ok) currentUser = r.data;
  }

  const r = await api('/api/profile?u=' + encodeURIComponent(username), token ? { headers: { 'Authorization': 'Bearer ' + token } } : {});
  if (!r.ok || !r.data.user) {
    document.getElementById('profileCard').innerHTML = '<p style="color:#94a3b8;">' + (r.data.msg || '用户不存在') + '</p>';
    return;
  }
  pageData = r.data;
  pageUser = r.data.user;
  renderHeader();
  document.getElementById('profileTabs').style.display = 'flex';
  renderTab('posts');

  document.querySelectorAll('.profile-tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      renderTab(t.getAttribute('data-tab'));
    });
  });

  document.getElementById('followBtn') && document.getElementById('followBtn').addEventListener('click', toggleFollow);
}

function renderHeader() {
  const isMe = currentUser && currentUser.username === pageUser.username;
  const followBtn = isMe ? '' : `<button class="admin-btn ${pageUser.isFollowing ? 'secondary' : 'primary'}" id="followBtn">${pageUser.isFollowing ? '已关注' : '+ 关注'}</button>`;
  const qq = pageUser.qq ? `<span class="profile-meta">QQ: ${pageUser.qq}</span>` : '';
  const created = pageUser.createdAt ? `<span class="profile-meta">加入于 ${formatTime(pageUser.createdAt).split(' ')[0]}</span>` : '';

  document.getElementById('profileCard').innerHTML = `
    <div class="profile-header">
      <img class="profile-avatar" src="${pageUser.avatar}" alt="头像" />
      <div>
        <h2 style="color:#fff;margin:0 0 6px;">${escapeHtml(pageUser.username)} ${isMe ? '<span style="font-size:.7rem;color:#94a3b8;font-weight:400;">（你自己）</span>' : ''}</h2>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
          <span class="profile-meta">帖子 ${pageData.stats.posts}</span>
          <span class="profile-meta">评论 ${pageData.stats.comments}</span>
          <span class="profile-meta">获赞 ${pageData.stats.receivedLikes}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">${qq}${created}</div>
      </div>
      ${followBtn}
    </div>
    <div class="profile-bio">${escapeHtml(pageUser.bio) || '这个人很懒，什么都没写～'}</div>
  `;
}

async function toggleFollow() {
  if (!currentUser) return alert('请先登录');
  const btn = document.getElementById('followBtn');
  const action = pageUser.isFollowing ? 'unfollow' : 'follow';
  const r = await api('/api/follow', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ username: pageUser.username, action })
  });
  if (r.ok) {
    pageUser.isFollowing = action === 'follow';
    renderHeader();
    document.getElementById('followBtn').addEventListener('click', toggleFollow);
  }
}

async function renderTab(tab) {
  ['posts','comments','likes'].forEach(t => document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).style.display = t === tab ? 'block' : 'none');

  if (tab === 'posts') {
    const wrap = document.getElementById('tabPosts');
    if (!pageData.posts.length) { wrap.innerHTML = '<p style="color:#94a3b8;">还没有发布过帖子</p>'; return; }
    wrap.innerHTML = pageData.posts.map(p => `
      <div class="forum-item">
        <div class="forum-meta">
          <span class="forum-cat">${p.category}</span>
          <span class="forum-time">${formatTime(p.createdAt)}</span>
        </div>
        <a class="forum-title" href="forum-post.html?id=${p.id}">${escapeHtml(p.title)}</a>
        <p class="forum-summary">${escapeHtml(p.summary)}…</p>
        <div class="forum-stats"><span>👁 ${p.views}</span><span>❤️ ${p.likes}</span><span>💬 ${p.comments}</span></div>
      </div>
    `).join('');
  }

  if (tab === 'comments') {
    const wrap = document.getElementById('tabComments');
    const r = await api('/api/posts');
    const postMap = {};
    if (r.ok && r.data.posts) r.data.posts.forEach(p => postMap[p.id] = p.title);

    const cr = await api('/api/posts/comments?u=' + encodeURIComponent(pageUser.username));
    const comments = (cr.ok && cr.data.comments) ? cr.data.comments : [];
    // 上面的接口不存在，用客户端拉帖子详情过滤太麻烦；先留空
    wrap.innerHTML = '<p style="color:#94a3b8;">「我的评论」功能即将上线</p>';
  }

  if (tab === 'likes') {
    document.getElementById('tabLikes').innerHTML = `<p style="color:#94a3b8;">共获得 ${pageData.stats.receivedLikes} 个赞 ❤️</p>`;
  }
}

init();
