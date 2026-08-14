// 论坛列表页
const AUTH_KEY = 'lyy_user_token';
let token = localStorage.getItem(AUTH_KEY) || '';
let currentUser = null;

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

async function init() {
  if (token) {
    const r = await api('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (r.ok) currentUser = r.data;
  }

  if (currentUser) {
    document.getElementById('showPostForm').style.display = 'inline-block';
    document.getElementById('loginTip').textContent = '';
  } else {
    document.getElementById('showPostForm').style.display = 'none';
    document.getElementById('loginTip').textContent = '登录后即可发帖';
  }

  await loadPosts();

  document.getElementById('showPostForm').addEventListener('click', () => {
    document.getElementById('postFormWrap').style.display = 'block';
    document.getElementById('showPostForm').style.display = 'none';
  });
  document.getElementById('postCancel').addEventListener('click', () => {
    document.getElementById('postFormWrap').style.display = 'none';
    document.getElementById('showPostForm').style.display = 'inline-block';
  });
  document.getElementById('postSubmit').addEventListener('click', submitPost);
}

async function loadPosts() {
  const r = await api('/api/posts');
  const list = document.getElementById('forumList');
  if (!r.ok || !r.data.posts) {
    list.innerHTML = '<p style="color:#94a3b8;">加载失败</p>';
    return;
  }
  if (r.data.posts.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;">还没有帖子，快来抢沙发吧～</p>';
    return;
  }
  list.innerHTML = r.data.posts.map(p => `
    <div class="forum-item">
      <div class="forum-meta">
        <img class="forum-avatar" src="${p.avatar}" alt="" />
        <span class="forum-author">${p.author}</span>
        <span class="forum-cat">${p.category}</span>
        <span class="forum-time">${formatTime(p.createdAt)}</span>
      </div>
      <a class="forum-title" href="forum-post.html?id=${p.id}">${escapeHtml(p.title)}</a>
      <p class="forum-summary">${escapeHtml(p.summary)}…</p>
      <div class="forum-stats">
        <span>👁 ${p.views}</span>
        <span>❤️ ${p.likes}</span>
        <span>💬 ${p.comments}</span>
      </div>
    </div>
  `).join('');
}

async function submitPost() {
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const category = document.getElementById('postCategory').value;
  document.getElementById('postErr').textContent = '';
  if (!title || !content) return document.getElementById('postErr').textContent = '标题和内容不能为空';

  const r = await api('/api/posts', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ title, content, category })
  });
  if (r.ok) {
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postFormWrap').style.display = 'none';
    document.getElementById('showPostForm').style.display = 'inline-block';
    await loadPosts();
  } else {
    document.getElementById('postErr').textContent = r.data.msg || '发布失败';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

init();
