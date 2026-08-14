// 公告列表
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
  const r = await api('/api/announcements');
  const list = document.getElementById('announceList');
  if (!r.ok || !r.data.announcements) {
    list.innerHTML = '<p style="color:#94a3b8;">加载失败</p>';
    return;
  }
  if (r.data.announcements.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;">暂无公告</p>';
    return;
  }
  list.innerHTML = r.data.announcements.map(a => `
    <div class="admin-card" style="margin-bottom:18px;">
      <div class="forum-meta" style="margin-bottom:10px;">
        <img class="forum-avatar" src="${a.avatar}" alt="" />
        <span class="forum-author">${a.author}</span>
        ${a.pinned ? '<span class="forum-cat" style="background:rgba(74,168,255,.2);color:#4aa8ff;">置顶</span>' : ''}
        <span class="forum-time">${formatTime(a.createdAt)}</span>
      </div>
      <h3 style="color:#fff;margin:0 0 10px;">${escapeHtml(a.title)}</h3>
      <p style="color:#cbd5e1;line-height:1.6;">${escapeHtml(a.summary)}…</p>
    </div>
  `).join('');
}

init();
