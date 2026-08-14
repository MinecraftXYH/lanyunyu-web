// 蓝云屿后台脚本：登录 -> 读取配置 -> 编辑 -> 保存到服务器
let EDIT = {};
let TOKEN = localStorage.getItem('lyy_token') || '';
const AUTH_KEY = 'lyy_token';

// 顶层对象字段定义（label + 路径）
const TOP_SCHEMA = {
  server: [
    { k: 'name', label: '服务器名' },
    { k: 'slogan', label: '口号' },
    { k: 'ip', label: '服务器 IP' },
    { k: 'version', label: '游戏版本' },
    { k: 'platformNote', label: '平台说明（如：基岩/Java 互通，主要 Java）' },
    { k: 'motd', label: 'MOTD 简介' },
    { k: 'owner', label: '腐竹 / 服主名' }
  ],
  hero: [
    { k: 'announce', label: '首页公告条' },
    { k: 'titlePrefix', label: '标题前缀（如：欢迎来到）' },
    { k: 'titleAccent', label: '标题高亮词（如：蓝云屿）' },
    { k: 'desc', label: '首页描述' },
    { k: 'tagsCsv', label: '标签（逗号分隔）' }
  ],
  community: [
    { k: 'title', label: '板块标题' },
    { k: 'subtitle', label: '板块副标题' },
    { k: 'qqName', label: 'QQ 群名称' },
    { k: 'qqDesc', label: 'QQ 群描述' },
    { k: 'qqBtn', label: 'QQ 按钮文字' }
  ],
  contact: [
    { k: 'title', label: '板块标题' },
    { k: 'subtitle', label: '板块副标题' }
  ]
};

const REPEAT_SCHEMA = {
  features: [
    { k: 'icon', label: '图标（emoji）' },
    { k: 'title', label: '标题' },
    { k: 'desc', label: '描述' }
  ],
  steps: [
    { k: 'title', label: '标题' },
    { k: 'desc', label: '描述' }
  ],
  downloads: [
    { k: 'name', label: '名称' },
    { k: 'version', label: '版本' },
    { k: 'desc', label: '描述' },
    { k: 'url', label: '下载链接' },
    { k: 'size', label: '大小' }
  ],
  announcements: [
    { k: 'date', label: '日期' },
    { k: 'title', label: '标题' },
    { k: 'content', label: '内容' }
  ],
  players: [
    { k: 'name', label: '昵称' },
    { k: 'role', label: '身份' },
    { k: 'note', label: '备注' }
  ]
};

function authHeaders(extra = {}) {
  return Object.assign({ 'Content-Type': 'application/json' }, extra, TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {});
}
function getByPath(o, p) { return p.reduce((a, k) => (a == null ? a : a[k]), o); }
function setByPath(o, p, v) {
  let c = o;
  for (let i = 0; i < p.length - 1; i++) {
    if (c[p[i]] == null || typeof c[p[i]] !== 'object') c[p[i]] = {};
    c = c[p[i]];
  }
  const last = p[p.length - 1];
  if (typeof v === 'string') {
    if (last === 'online') c[last] = (v === 'true' || v === '1' || v === '开');
    else if (['players', 'maxPlayers', 'online'].includes(last) && v !== '' && !isNaN(v)) c[last] = Number(v);
    else c[last] = v;
  } else c[last] = v;
}

function field(path, label, value, isTextarea) {
  const v = value == null ? '' : String(value);
  const common = `data-bind="${path.join('|')}" placeholder="${label}"`;
  return `<div class="admin-field"><label>${label}</label>${isTextarea
    ? `<textarea ${common}>${escAttr(v)}</textarea>`
    : `<input type="text" ${common} value="${escAttr(v)}" />`}</div>`;
}
function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

// 把 CSV 转数组 / 数组转 CSV，用于 contact.subjects、contact.guide、hero.tags
function ensureArray(v, label) {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
  console.warn(`[admin] 字段 ${label} 不是数组，已重置为空数组`, v);
  return [];
}
function prepareCsv(obj) {
  if (obj.hero && typeof obj.hero === 'object') {
    obj.hero.tags = ensureArray(obj.hero.tags, 'hero.tags');
    if (obj.hero.tagsCsv == null) obj.hero.tagsCsv = obj.hero.tags.join(',');
  }
  if (obj.contact && typeof obj.contact === 'object') {
    obj.contact.subjects = ensureArray(obj.contact.subjects, 'contact.subjects');
    obj.contact.guide = ensureArray(obj.contact.guide, 'contact.guide');
    if (obj.contact.subjectsCsv == null) obj.contact.subjectsCsv = obj.contact.subjects.join(',');
    if (obj.contact.guideCsv == null) obj.contact.guideCsv = obj.contact.guide.join('\n');
  }
}
function restoreCsv(obj) {
  if (obj.hero && obj.hero.tagsCsv != null) obj.hero.tags = obj.hero.tagsCsv.split(',').map(s => s.trim()).filter(Boolean);
  if (obj.contact) {
    if (obj.contact.subjectsCsv != null) obj.contact.subjects = obj.contact.subjectsCsv.split(',').map(s => s.trim()).filter(Boolean);
    if (obj.contact.guideCsv != null) obj.contact.guide = obj.contact.guideCsv.split('\n').map(s => s.trim()).filter(Boolean);
  }
}
function ensureObject(v, label) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  console.warn(`[admin] 字段 ${label} 不是对象，已重置`, v);
  return {};
}

function renderTop(key, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = TOP_SCHEMA[key].map(f => field([key, f.k], f.label, getByPath(EDIT, [key, f.k]), key === 'hero' && f.k === 'desc')).join('');
}

function renderRepeat(key, containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  let arr = EDIT[key];
  if (!Array.isArray(arr)) {
    console.warn(`[admin] 配置字段 ${key} 不是数组，已重置为空数组`, arr);
    arr = EDIT[key] = [];
  }
  c.innerHTML = arr.map((it, i) => `
    <div class="repeat-card" data-idx="${i}">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong>#${i + 1}</strong>
        <button class="admin-btn danger" data-del="${key}" data-i="${i}">删除</button>
      </div>
      <div class="admin-row">
        ${REPEAT_SCHEMA[key].map(f => field([key, i, f.k], f.label, it && it[f.k], f.k === 'desc' || f.k === 'content' || f.k === 'note')).join('')}
      </div>
      ${key === 'announcements' ? announcementImages(i, it) : ''}
    </div>`).join('');
}

// 游戏截图是对象 {title, subtitle, items}，单独渲染
function renderScreenshots() {
  const c = document.getElementById('screenshotsList');
  if (!c) return;
  let sh = ensureObject(EDIT.screenshots, 'screenshots');
  EDIT.screenshots = sh;
  if (!sh.title) sh.title = '游戏截图';
  if (!sh.subtitle) sh.subtitle = '玩家在蓝云屿留下的精彩瞬间';
  let items = sh.items;
  if (!Array.isArray(items)) {
    console.warn('[admin] screenshots.items 不是数组，已重置', items);
    items = sh.items = [];
  }
  c.innerHTML = `
    <div class="repeat-card">
      <div class="admin-row">
        ${field(['screenshots', 'title'], '板块标题', sh.title)}
        ${field(['screenshots', 'subtitle'], '板块副标题', sh.subtitle)}
      </div>
    </div>
    ${items.map((it, i) => `
      <div class="repeat-card" data-idx="${i}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong>#${i + 1}</strong>
          <button class="admin-btn danger" data-del="screenshots" data-i="${i}">删除</button>
        </div>
        <div class="admin-row">
          ${field(['screenshots', 'items', i, 'src'], '图片地址（src）', it && it.src)}
          ${field(['screenshots', 'items', i, 'caption'], '说明文字', it && it.caption)}
        </div>
        ${screenshotUploadRow(i, it)}
      </div>`).join('')}`;
}

// 截图卡片里的「上传图片」区域
function screenshotUploadRow(i, it) {
  const src = (it && it.src) ? it.src : '';
  return `
    <div class="upload-row" style="margin-top:12px; padding-top:12px; border-top:1px dashed #cbd5e1;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <label class="admin-btn" style="background:#e2e8f0; color:#334155; cursor:pointer;">
          📁 选择图片
          <input type="file" accept="image/*" data-upload="screenshots" data-idx="${i}" style="display:none;" />
        </label>
        ${src ? `<img class="upload-preview" src="${escAttr(/^https?:\/\//i.test(src) ? src : '/' + src)}" alt="预览" style="max-width:160px; max-height:100px; border-radius:8px; border:1px solid #e2e8f0;" />` : '<span class="hint" style="color:#94a3b8;">未上传</span>'}
      </div>
      <p class="hint" style="color:#64748b; margin:8px 0 0;">选图后会自动压缩并上传，图片地址自动填入上面的「图片地址」，最后记得点「保存更改」。</p>
    </div>`;
}

// 公告卡片里的「添加图片」区域（多图，最多 9 张）
function announcementImages(i, it) {
  const imgs = (it && Array.isArray(it.images)) ? it.images : [];
  return `
    <div class="upload-row" style="margin-top:12px; padding-top:12px; border-top:1px dashed #cbd5e1;">
      <label class="admin-btn" style="background:#e2e8f0; color:#334155; cursor:pointer;">
        📁 添加图片
        <input type="file" accept="image/*" data-upload="annimg" data-idx="${i}" style="display:none;" />
      </label>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        ${imgs.map((src, j) => `
          <div style="position:relative;">
            <img src="${escAttr(/^https?:\/\//i.test(src) ? src : '/' + src)}" alt="图${j + 1}" style="width:120px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0;" />
            <button class="admin-btn danger" data-delimg="${i},${j}" style="position:absolute; top:-8px; right:-8px; padding:2px 7px; font-size:.7rem; line-height:1;">×</button>
          </div>`).join('')}
      </div>
      <p class="hint" style="color:#64748b; margin:8px 0 0;">选图后自动压缩上传，最多 9 张。最后记得点「保存更改」。</p>
    </div>`;
}

// 客户端压缩：限制最大宽度，转 JPEG，避免超过 GitHub 1MB 单文件限制
function resizeImageFile(file, maxW = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解析失败'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const key = input.dataset.upload;
  const i = Number(input.dataset.idx);
  try {
    toast('图片处理中…');
    const dataUrl = await resizeImageFile(file);
    toast('上传中…');
    const res = await fetch('/api/upload', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ name: file.name, dataUrl }) });
    const j = await res.json();
    if (j.ok) {
      if (key === 'screenshots') {
        setByPath(EDIT, [key, 'items', i, 'src'], j.url);
        renderScreenshots();
      } else if (key === 'annimg') {
        if (!EDIT.announcements[i] || typeof EDIT.announcements[i] !== 'object') EDIT.announcements[i] = {};
        if (!Array.isArray(EDIT.announcements[i].images)) EDIT.announcements[i].images = [];
        if (EDIT.announcements[i].images.length >= 9) {
          toast('最多 9 张图片');
        } else {
          EDIT.announcements[i].images.push(j.url);
          toast('✅ 已添加图片，记得点「保存更改」');
        }
        renderRepeat('announcements', 'announcementsList');
        populateBinds();
      } else {
        setByPath(EDIT, [key, i, 'src'], j.url);
        renderRepeat(key, key + 'List');
      }
    } else {
      toast('❌ 上传失败：' + (j.msg || ''));
    }
  } catch (e) {
    toast('❌ 上传失败：' + e.message);
    console.error('[admin] upload error', e);
  } finally {
    input.value = '';
  }
}

function renderAllForms() {
  prepareCsv(EDIT);
  const safeRender = (fn, ...args) => {
    try { fn(...args); }
    catch (e) { console.error('[admin] 渲染失败', fn.name, args, e); toast('渲染失败：' + e.message); }
  };
  safeRender(renderTop, 'server', 'serverFields');
  safeRender(renderTop, 'hero', 'heroFields');
  safeRender(renderTop, 'community', 'communityFields');
  safeRender(renderTop, 'contact', 'contactFields');
  for (const k in REPEAT_SCHEMA) safeRender(renderRepeat, k, k + 'List');
  safeRender(renderScreenshots);
  populateBinds();
}

// 填充所有带 data-bind 的输入框（包括硬编码的多层字段，如 server|status|online）
function populateBinds() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const p = el.dataset.bind.split('|');
    let v = getByPath(EDIT, p);
    if (v == null) v = '';
    else if (typeof v === 'boolean') v = v ? 'true' : 'false';
    else v = String(v);
    if (el.tagName === 'TEXTAREA') el.value = v;
    else el.value = v;
  });
}

// ---------- 事件 ----------
function bindGlobal() {
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('pwdInput').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem(AUTH_KEY); location.reload(); });
  document.getElementById('saveBtn').addEventListener('click', doSave);
  document.getElementById('resetBtn').addEventListener('click', () => { loadConfig(true); toast('已重置为服务器当前值'); });
  document.getElementById('refreshMsg').addEventListener('click', loadContacts);

  document.addEventListener('input', e => {
    const inp = e.target;
    if (inp.dataset.bind) {
      const p = inp.dataset.bind.split('|');
      setByPath(EDIT, p, inp.value);
    }
  });

  document.addEventListener('change', e => {
    const inp = e.target;
    if (inp.dataset && inp.dataset.upload) {
      handleUpload(inp);
    }
  });

document.addEventListener('click', e => {
  if (e.target.dataset.del) {
    const k = e.target.dataset.del, i = Number(e.target.dataset.i);
    if (k === 'screenshots') {
      if (EDIT.screenshots && Array.isArray(EDIT.screenshots.items)) EDIT.screenshots.items.splice(i, 1);
      renderScreenshots();
    } else {
      if (Array.isArray(EDIT[k])) EDIT[k].splice(i, 1);
      renderRepeat(k, k + 'List');
    }
  }
  if (e.target.dataset.delimg) {
    const [ai, aj] = e.target.dataset.delimg.split(',').map(Number);
    if (EDIT.announcements && EDIT.announcements[ai] && Array.isArray(EDIT.announcements[ai].images)) {
      EDIT.announcements[ai].images.splice(aj, 1);
      renderRepeat('announcements', 'announcementsList');
      populateBinds();
    }
  }
  if (e.target.dataset.add) {
    const k = e.target.dataset.add;
    if (k === 'screenshots') {
      if (!EDIT.screenshots || typeof EDIT.screenshots !== 'object' || Array.isArray(EDIT.screenshots)) EDIT.screenshots = {};
      if (!Array.isArray(EDIT.screenshots.items)) EDIT.screenshots.items = [];
      EDIT.screenshots.items.push({ src: '', caption: '' });
      renderScreenshots();
    } else {
      const blank = {};
      REPEAT_SCHEMA[k].forEach(f => blank[f.k] = '');
      if (Array.isArray(EDIT[k])) EDIT[k].push(blank);
      renderRepeat(k, k + 'List');
    }
  }
});

  // 侧边栏高亮
  document.querySelectorAll('.admin-sidebar a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.admin-sidebar a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
    });
  });
}

async function doLogin() {
  const user = document.getElementById('userInput').value;
  const pwd = document.getElementById('pwdInput').value;
  const res = await fetch('/api/site?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, pwd }) });
  const j = await res.json();
  if (j.ok) {
    TOKEN = j.token; localStorage.setItem(AUTH_KEY, TOKEN);
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminFrame').style.display = 'flex';
    loadConfig();
    loadContacts();
    checkHealth();
  } else {
    document.getElementById('loginErr').style.display = 'block';
  }
}

async function checkHealth() {
  try {
    const res = await fetch('/api/site?action=health', { headers: authHeaders() });
    const h = await res.json();
    if (!h.githubConfigured) {
      toast('⚠️ 未配置 GITHUB_TOKEN，保存功能不可用');
    } else if (!h.githubReadable) {
      toast('⚠️ GITHUB_TOKEN 无法访问仓库：' + (h.githubMsg || '请检查权限'));
    }
  } catch (e) { /* ignore */ }
}

async function loadConfig(silent) {
  try {
    const res = await fetch('/api/site?action=config', { headers: authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('服务器返回 ' + res.status + '：' + text.slice(0, 120));
    }
    const data = await res.json();
    if (!data || typeof data !== 'object') throw new Error('返回数据不是对象');
    EDIT = data;
    renderAllForms();
  } catch (e) {
    toast('读取配置失败：' + e.message);
    console.error('[admin] loadConfig error', e);
  }
}

async function doSave() {
  restoreCsv(EDIT);
  const np = document.getElementById('newPwd').value;
  if (np) {
    // 密码修改通过环境变量/重启生效，这里提示
    toast('提示：修改密码需重启服务并设置环境变量 LYY_ADMIN_PWD');
  }
  try {
    const res = await fetch('/api/site?action=config', { method: 'POST', headers: authHeaders(), body: JSON.stringify(EDIT) });
    const j = await res.json();
    if (j.ok) toast('✅ 已保存到服务器'); else toast(j.msg || '保存失败');
  } catch (e) { toast('保存失败：网络错误'); }
}

async function loadContacts() {
  const c = document.getElementById('contactsList');
  try {
    const res = await fetch('/api/site?action=contacts', { headers: authHeaders() });
    if (res.status === 401) { c.innerHTML = '<p class="hint" style="color:#94a3b8;">未登录</p>'; return; }
    const list = await res.json();
    if (!list.length) { c.innerHTML = '<p class="hint" style="color:#94a3b8;">暂无留言</p>'; return; }
    c.innerHTML = list.map(m => `
      <div class="contact-item">
        <div class="meta">${esc(m.time)} · ${esc(m.name)} · ${esc(m.subject)} · <span style="color:#2563eb;">${esc(m.email)}</span></div>
        <div>${esc(m.content)}</div>
        <button class="admin-btn danger" data-delmsg="${m.id}" style="margin-top:8px;">删除</button>
      </div>`).join('');
    c.querySelectorAll('[data-delmsg]').forEach(b => b.addEventListener('click', async () => {
      await fetch('/api/site?action=contacts&id=' + b.dataset.delmsg, { method: 'DELETE', headers: authHeaders() });
      loadContacts();
    }));
  } catch (e) { c.innerHTML = '<p class="hint" style="color:#94a3b8;">加载失败</p>'; }
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// ---------- 启动 ----------
if (TOKEN) {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('adminFrame').style.display = 'flex';
  loadConfig();
  loadContacts();
}
bindGlobal();
