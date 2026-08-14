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
    const r = await api('/api/users?action=me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (r.ok) currentUser = r.data;
  }

  const r = await api('/api/users?action=profile&u=' + encodeURIComponent(username), token ? { headers: { 'Authorization': 'Bearer ' + token } } : {});
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

  bindHeaderButtons();

  // 看自己主页时加载好友请求
  const isMe = currentUser && currentUser.username === pageUser.username;
  if (isMe) loadFriendRequests();
}

function bindHeaderButtons() {
  const followBtn = document.getElementById('followBtn');
  const friendBtn = document.getElementById('friendBtn');
  if (followBtn) followBtn.addEventListener('click', toggleFollow);
  if (friendBtn) friendBtn.addEventListener('click', toggleFriend);
}

function friendBtnHtml(rel) {
  if (rel === 'friend') return { text: '已是好友', cls: 'secondary', action: 'remove' };
  if (rel === 'pending_sent') return { text: '已申请', cls: 'secondary', action: 'cancel' };
  if (rel === 'pending_received') return { text: '接受', cls: 'primary', action: 'accept' };
  return { text: '+ 好友', cls: 'primary', action: 'add' };
}

function renderHeader() {
  const isMe = currentUser && currentUser.username === pageUser.username;
  const followBtn = isMe ? '' : `<button class="admin-btn ${pageUser.isFollowing ? 'secondary' : 'primary'}" id="followBtn">${pageUser.isFollowing ? '已关注' : '+ 关注'}</button>`;

  const rel = pageUser.relationship || 'none';
  const fbtn = friendBtnHtml(rel);
  const friendBtn = isMe ? '' : `<button class="admin-btn ${fbtn.cls}" id="friendBtn" data-action="${fbtn.action}" style="margin-left:8px;">${fbtn.text}</button>`;
  const rejectBtn = rel === 'pending_received' && !isMe ? `<button class="admin-btn danger" id="friendRejectBtn" style="margin-left:8px;">拒绝</button>` : '';

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
          <span class="profile-meta">好友 ${pageData.stats.friends}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">${qq}${created}</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px;">${followBtn}${friendBtn}${rejectBtn}</div>
    </div>
    <div class="profile-bio">${escapeHtml(pageUser.bio) || '这个人很懒，什么都没写～'}</div>
  `;
}

async function toggleFollow() {
  if (!currentUser) return alert('请先登录');
  const btn = document.getElementById('followBtn');
  const action = pageUser.isFollowing ? 'unfollow' : 'follow';
  const r = await api('/api/users?action=follow', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ username: pageUser.username, action })
  });
  if (r.ok) {
    pageUser.isFollowing = action === 'follow';
    renderHeader();
    bindHeaderButtons();
  }
}

async function toggleFriend() {
  if (!currentUser) return alert('请先登录');
  const btn = document.getElementById('friendBtn');
  const action = btn.getAttribute('data-action') || 'add';
  const r = await api('/api/users?action=friend', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ username: pageUser.username, action })
  });
  if (r.ok) {
    pageUser.relationship = r.data.relationship || (action === 'add' ? 'pending_sent' : 'none');
    if (pageUser.relationship === 'friend') pageData.stats.friends += 1;
    if (action === 'remove') pageData.stats.friends = Math.max(0, pageData.stats.friends - 1);
    renderHeader();
    bindHeaderButtons();
    const rejectBtn = document.getElementById('friendRejectBtn');
    if (rejectBtn) rejectBtn.addEventListener('click', () => handleFriendAction('reject'));
  } else {
    alert(r.data.msg || '操作失败');
  }
}

async function handleFriendAction(action) {
  if (!currentUser) return alert('请先登录');
  const r = await api('/api/users?action=friend', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ username: pageUser.username, action })
  });
  if (r.ok) {
    pageUser.relationship = r.data.relationship || 'none';
    if (action === 'accept') pageData.stats.friends += 1;
    renderHeader();
    bindHeaderButtons();
  } else {
    alert(r.data.msg || '操作失败');
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
    wrap.innerHTML = '<p style="color:#94a3b8;">加载中…</p>';
    const cr = await api('/api/community?action=comments&u=' + encodeURIComponent(pageUser.username));
    const comments = (cr.ok && cr.data.comments) ? cr.data.comments : [];
    if (!comments.length) { wrap.innerHTML = '<p style="color:#94a3b8;">还没有评论过帖子</p>'; return; }
    wrap.innerHTML = comments.map(c => `
      <div class="forum-item">
        <div class="forum-meta">
          <span class="forum-cat">评论于</span>
          <a class="forum-title" href="forum-post.html?id=${c.postId}">${escapeHtml(c.postTitle)}</a>
          <span class="forum-time">${formatTime(c.createdAt)}</span>
        </div>
        <p class="forum-summary">${escapeHtml(c.content)}</p>
        <div class="forum-stats"><span>❤️ ${c.likes}</span></div>
      </div>
    `).join('');
  }

  if (tab === 'likes') {
    document.getElementById('tabLikes').innerHTML = `<p style="color:#94a3b8;">共获得 ${pageData.stats.receivedLikes} 个赞 ❤️</p>`;
  }
}

async function loadFriendRequests() {
  const box = document.getElementById('friendRequests');
  if (!box) return;
  const r = await api('/api/users?action=friend-requests', { headers: { 'Authorization': 'Bearer ' + token } });
  if (!r.ok) return;
  const received = r.data.received || [];
  const sent = r.data.sent || [];

  if (!received.length && !sent.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  let html = '<h3 style="color:#fff;margin:0 0 14px;font-size:1.1rem;">好友请求</h3>';
  if (received.length) {
    html += '<h4 style="color:#94a3b8;font-size:.85rem;margin:0 0 10px;">收到的申请</h4>' + received.map(req => `
      <div class="forum-item" style="display:flex;align-items:center;gap:12px;">
        <img class="forum-avatar" src="${req.avatar}" alt="" />
        <div style="flex:1;">
          <a href="profile.html?u=${encodeURIComponent(req.from)}" class="forum-author">${escapeHtml(req.from)}</a>
          <p style="color:#94a3b8;font-size:.8rem;margin:4px 0 0;">${escapeHtml(req.bio) || '这个人很懒，什么都没写～'}</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn primary" data-fr-accept="${escapeHtml(req.from)}">接受</button>
          <button class="admin-btn danger" data-fr-reject="${escapeHtml(req.from)}">拒绝</button>
        </div>
      </div>
    `).join('');
  }
  if (sent.length) {
    html += '<h4 style="color:#94a3b8;font-size:.85rem;margin:16px 0 10px;">发出的申请</h4>' + sent.map(req => `
      <div class="forum-item" style="display:flex;align-items:center;gap:12px;">
        <img class="forum-avatar" src="${req.avatar}" alt="" />
        <div style="flex:1;">
          <a href="profile.html?u=${encodeURIComponent(req.to)}" class="forum-author">${escapeHtml(req.to)}</a>
          <p style="color:#94a3b8;font-size:.8rem;margin:4px 0 0;">${escapeHtml(req.bio) || '这个人很懒，什么都没写～'}</p>
        </div>
        <button class="admin-btn danger" data-fr-cancel="${escapeHtml(req.to)}">取消</button>
      </div>
    `).join('');
  }
  box.innerHTML = html;

  box.querySelectorAll('[data-fr-accept]').forEach(b => b.addEventListener('click', () => friendRequestAction(b.dataset.frAccept, 'accept')));
  box.querySelectorAll('[data-fr-reject]').forEach(b => b.addEventListener('click', () => friendRequestAction(b.dataset.frReject, 'reject')));
  box.querySelectorAll('[data-fr-cancel]').forEach(b => b.addEventListener('click', () => friendRequestAction(b.dataset.frCancel, 'cancel')));
}

async function friendRequestAction(username, action) {
  const r = await api('/api/users?action=friend', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ username, action })
  });
  if (r.ok) {
    await loadFriendRequests();
    // 如果当前页面是对方主页，刷新关系按钮
    if (pageUser && pageUser.username === username) {
      pageUser.relationship = r.data.relationship || 'none';
      if (action === 'accept') pageData.stats.friends += 1;
      renderHeader();
      bindHeaderButtons();
    }
  } else {
    alert(r.data.msg || '操作失败');
  }
}

init();
