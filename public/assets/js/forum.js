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
    const r = await api('/api/users?action=me', { headers: { 'Authorization': 'Bearer ' + token } });
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
  document.getElementById('postImages').addEventListener('change', previewImages);
  document.getElementById('postSubmit').addEventListener('click', submitPost);
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function previewImages() {
  const input = document.getElementById('postImages');
  const box = document.getElementById('postImagePreview');
  box.innerHTML = '';
  Array.from(input.files).slice(0, 9).forEach(file => {
    const img = document.createElement('img');
    img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.15);';
    fileToDataUrl(file).then(u => img.src = u);
    box.appendChild(img);
  });
}

async function uploadImages() {
  const input = document.getElementById('postImages');
  const files = Array.from(input.files).slice(0, 9);
  const urls = [];
  for (const file of files) {
    if (file.size > 1024 * 1024) {
      document.getElementById('postErr').textContent = '图片「' + file.name + '」超过 1MB，请压缩后重试';
      throw new Error('too large');
    }
    const dataUrl = await fileToDataUrl(file);
    const r = await api('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ dataUrl, name: file.name })
    });
    if (!r.ok) {
      document.getElementById('postErr').textContent = (r.data && r.data.msg) || '图片上传失败';
      throw new Error('upload failed');
    }
    urls.push(r.data.url);
  }
  return urls;
}

async function loadPosts() {
  const r = await api('/api/community?action=posts');
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
      ${p.cover ? `<a href="forum-post.html?id=${p.id}"><img class="forum-cover" src="${p.cover}" alt="" /></a>` : ''}
      <div class="forum-meta">
        <img class="forum-avatar" src="${p.avatar}" alt="" />
        <a href="profile.html?u=${encodeURIComponent(p.author)}" class="forum-author">${p.author}</a>
        <span class="forum-cat">${p.category}</span>
        <span class="forum-time">${formatTime(p.createdAt)}</span>
      </div>
      <a class="forum-title" href="forum-post.html?id=${p.id}">${escapeHtml(p.title)}</a>
      <p class="forum-summary">${escapeHtml(p.summary)}…</p>
      <div class="forum-stats">
        <span>👁 ${p.views}</span>
        <span>❤️ ${p.likes}</span>
        <span>💬 ${p.comments}</span>
        ${p.imageCount ? `<span>🖼️ ${p.imageCount}</span>` : ''}
      </div>
    </div>
  `).join('');
}

async function submitPost() {
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const category = document.getElementById('postCategory').value;
  const errEl = document.getElementById('postErr');
  errEl.textContent = '';
  if (!title || !content) return errEl.textContent = '标题和内容不能为空';

  const btn = document.getElementById('postSubmit');
  btn.disabled = true;
  btn.textContent = '发布中…';
  try {
    let images = [];
    if (document.getElementById('postImages').files.length) {
      images = await uploadImages();
    }
    const r = await api('/api/community?action=posts', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title, content, category, images })
    });
    if (r.ok) {
      document.getElementById('postTitle').value = '';
      document.getElementById('postContent').value = '';
      document.getElementById('postImages').value = '';
      document.getElementById('postImagePreview').innerHTML = '';
      document.getElementById('postFormWrap').style.display = 'none';
      document.getElementById('showPostForm').style.display = 'inline-block';
      await loadPosts();
    } else {
      errEl.textContent = r.data.msg || '发布失败';
    }
  } catch (e) {
    if (!errEl.textContent) errEl.textContent = '发布失败，请重试';
  } finally {
    btn.disabled = false;
    btn.textContent = '发布';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

init();
