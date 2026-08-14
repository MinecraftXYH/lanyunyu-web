// 帖子详情页
const AUTH_KEY = 'lyy_user_token';
let token = localStorage.getItem(AUTH_KEY) || '';
let currentUser = null;
let postId = null;

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
  postId = params.get('id');
  if (!postId) return location.href = 'forum.html';

  if (token) {
    const r = await api('/api/users?action=me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (r.ok) currentUser = r.data;
  }

  if (currentUser) {
    document.getElementById('commentFormWrap').style.display = 'block';
    document.getElementById('commentLoginTip').textContent = '';
  } else {
    document.getElementById('commentLoginTip').textContent = '登录后即可评论';
  }

  await loadPost();
  document.getElementById('commentSubmit').addEventListener('click', submitComment);
}

async function loadPost() {
  const r = await api('/api/community?action=posts&id=' + postId);
  const card = document.getElementById('postCard');
  if (!r.ok || !r.data.post) {
    card.innerHTML = '<p style="color:#94a3b8;">帖子不存在或已删除</p>';
    document.getElementById('commentsWrap').innerHTML = '';
    return;
  }
  const p = r.data.post;
  const own = currentUser && currentUser.username === p.author;
  card.innerHTML = `
    <div class="forum-meta" style="margin-bottom:14px;">
      <img class="forum-avatar" src="${p.avatar}" alt="" />
      <a href="profile.html?u=${encodeURIComponent(p.author)}" class="forum-author">${p.author}</a>
      <span class="forum-cat">${p.category}</span>
      <span class="forum-time">${formatTime(p.createdAt)}</span>
    </div>
    <h2 style="color:#fff;margin:0 0 14px;">${escapeHtml(p.title)}</h2>
    <div class="forum-body">${escapeHtml(p.content).replace(/\n/g, '<br>')}</div>
    <div class="forum-stats" style="margin-top:18px;">
      <span>👁 ${p.views}</span>
      <button class="like-btn" id="postLike">❤️ ${p.likes}</button>
      <span>💬 ${p.comments}</span>
      ${own ? `<button class="admin-btn danger" id="delPost" style="margin-left:auto;">删除</button>` : ''}
    </div>
  `;
  document.getElementById('postLike').addEventListener('click', () => toggleLike('post', p.id));
  if (own) document.getElementById('delPost').addEventListener('click', deletePost);

  renderComments(r.data.comments || []);
}

function renderComments(comments) {
  const wrap = document.getElementById('commentsWrap');
  if (comments.length === 0) {
    wrap.innerHTML = '<p style="color:#94a3b8;">暂无评论</p>';
    return;
  }
  wrap.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="forum-meta">
        <img class="forum-avatar small" src="${c.avatar}" alt="" />
        <a href="profile.html?u=${encodeURIComponent(c.author)}" class="forum-author">${c.author}</a>
        <span class="forum-time">${formatTime(c.createdAt)}</span>
      </div>
      <p class="comment-body">${escapeHtml(c.content).replace(/\n/g, '<br>')}</p>
      <button class="like-btn small" data-cid="${c.id}">❤️ ${c.likes}</button>
    </div>
  `).join('');
  wrap.querySelectorAll('.like-btn.small').forEach(btn => {
    btn.addEventListener('click', () => toggleLike('comment', btn.getAttribute('data-cid')));
  });
}

async function submitComment() {
  const content = document.getElementById('commentContent').value.trim();
  document.getElementById('commentErr').textContent = '';
  if (!content) return document.getElementById('commentErr').textContent = '请输入评论内容';
  const r = await api('/api/community?action=comments', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ postId, content })
  });
  if (r.ok) {
    document.getElementById('commentContent').value = '';
    await loadPost();
  } else {
    document.getElementById('commentErr').textContent = r.data.msg || '评论失败';
  }
}

async function toggleLike(type, targetId) {
  if (!currentUser) return alert('请先登录');
  const r = await api('/api/community?action=likes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ type, targetId })
  });
  if (r.ok) await loadPost();
}

async function deletePost() {
  if (!confirm('确定删除这条帖子？')) return;
  const r = await api('/api/community?action=posts&id=' + postId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (r.ok) location.href = 'forum.html';
  else alert(r.data.msg || '删除失败');
}

init();
