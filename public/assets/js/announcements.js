// 公告列表（与首页“最新公告”同源：读取 data.json.announcements）
async function api(path, opts) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let j = {};
  try { j = await res.json(); } catch (e) {}
  return { ok: res.ok, data: j };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

async function init() {
  const r = await api('/api/site?action=config');
  const list = document.getElementById('announceList');
  if (!r.ok || !Array.isArray(r.data.announcements)) {
    list.innerHTML = '<p style="color:#94a3b8;">加载失败</p>';
    return;
  }
  const announcements = r.data.announcements;
  if (announcements.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;">暂无公告</p>';
    return;
  }
  list.innerHTML = announcements.map(a => `
    <div class="admin-card" style="margin-bottom:18px;">
      <div style="margin-bottom:10px; color:#94a3b8; font-size:.85rem;">${escapeHtml(a.date || '')}</div>
      <h3 style="color:#fff;margin:0 0 10px;">${escapeHtml(a.title || '')}</h3>
      <p style="color:#cbd5e1;line-height:1.6; white-space:pre-line;">${escapeHtml(a.content || '')}</p>
    </div>
  `).join('');
}

init();
