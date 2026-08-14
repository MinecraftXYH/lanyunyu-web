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
  const r = await api('/api/community?action=posts&id=' + postId, currentUser ? { headers: { 'Authorization': 'Bearer ' + token } } : {});
  const card = document.getElementById('postCard');
  if (!r.ok || !r.data.post) {
    card.innerHTML = '<p style="color:#94a3b8;">帖子不存在或已删除</p>';
    document.getElementById('commentsWrap').innerHTML = '';
    return;
  }
  const p = r.data.post;
  const own = currentUser && currentUser.username === p.author;

  const imagesHtml = (p.images && p.images.length)
    ? `<div class="post-images">${p.images.map(src => `<img src="${src}" alt="配图" onclick="window.open('${src}','_blank')" />`).join('')}</div>`
    : '';

  card.innerHTML = `
    <div class="forum-meta" style="margin-bottom:14px;">
      <img class="forum-avatar" src="${p.avatar}" alt="" />
      <a href="profile.html?u=${encodeURIComponent(p.author)}" class="forum-author">${p.author}</a>
      <span class="forum-cat">${p.category}</span>
      <span class="forum-time">${formatTime(p.createdAt)}</span>
    </div>
    <h2 style="color:#fff;margin:0 0 14px;">${escapeHtml(p.title)}</h2>
    <div class="forum-body">${escapeHtml(p.content).replace(/\n/g, '<br>')}</div>
    ${imagesHtml}
    <div class="forum-stats" style="margin-top:18px;">
      <span>👁 ${p.views}</span>
      <button class="like-btn ${p.liked ? 'liked' : ''}" id="postLike">${p.liked ? '❤️' : '🤍'} ${p.likes}</button>
      <span>💬 <span id="postCommentCount">${p.comments}</span></span>
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
    <div class="comment-item" data-cid="${c.id}">
      <div class="forum-meta">
        <img class="forum-avatar small" src="${c.avatar}" alt="" />
        <a href="profile.html?u=${encodeURIComponent(c.author)}" class="forum-author">${c.author}</a>
        <span class="forum-time">${formatTime(c.createdAt)}</span>
      </div>
      <p class="comment-body">${escapeHtml(c.content).replace(/\n/g, '<br>')}</p>
      <button class="like-btn small ${c.liked ? 'liked' : ''}" data-cid="${c.id}">${c.liked ? '❤️' : '🤍'} ${c.likes}</button>
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
    const c = r.data.comment;
    const wrap = document.getElementById('commentsWrap');
    // 局部追加评论，不再整页重载（避免浏览量重复 +1）
    if (wrap.querySelector('p')) wrap.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.setAttribute('data-cid', c.id);
    div.innerHTML = `
      <div class="forum-meta">
        <img class="forum-avatar small" src="${c.avatar || 'assets/images/default-avatar.jpeg'}" alt="" />
        <a href="profile.html?u=${encodeURIComponent(c.author)}" class="forum-author">${c.author}</a>
        <span class="forum-time">刚刚</span>
      </div>
      <p class="comment-body">${escapeHtml(c.content).replace(/\n/g, '<br>')}</p>
      <button class="like-btn small" data-cid="${c.id}">🤍 0</button>
    `;
    wrap.appendChild(div);
    div.querySelector('.like-btn').addEventListener('click', () => toggleLike('comment', c.id));
    const cnt = document.getElementById('postCommentCount');
    if (cnt) cnt.textContent = (parseInt(cnt.textContent, 10) || 0) + 1;
  } else {
    document.getElementById('commentErr').textContent = r.data.msg || '评论失败';
  }
}

async function toggleLike(type, targetId) {
  if (!currentUser) return alert('请先登录');
  const btn = type === 'post' ? document.getElementById('postLike') : document.querySelector(`.comment-item[data-cid="${targetId}"] .like-btn`);
  if (btn) { btn.disabled = true; }
  const r = await api('/api/community?action=likes', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ type, targetId })
  });
  if (btn) { btn.disabled = false; }
  if (r.ok) {
    const liked = r.data.liked;
    const count = r.data.count;
    if (btn) {
      btn.classList.toggle('liked', liked);
      btn.textContent = (liked ? '❤️ ' : '🤍 ') + count;
    }
  } else {
    alert(r.data.msg || '操作失败');
  }
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
