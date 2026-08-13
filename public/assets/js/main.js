// 蓝云屿前端脚本：从 /api/config 读取内容并渲染
let DATA = {};

async function loadData() {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    DATA = await res.json();
  } catch (e) {
    DATA = {};
  }
  renderAll();
}

function el(id) { return document.getElementById(id); }
function setText(id, v) { const n = el(id); if (n && v != null) n.textContent = v; }
function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

function renderHero() {
  const s = DATA.server || {};
  const h = DATA.hero || {};
  setText('heroAnnounce', h.announce);
  const t = el('heroTitle');
  if (t) t.innerHTML = `<span class="title-prefix">${esc(h.titlePrefix || '欢迎来到')}</span><br><span class="accent">${esc(h.titleAccent || s.name)}</span>`;
  setText('heroDesc', h.desc);
  const tg = el('heroTags');
  if (tg && h.tags) tg.innerHTML = h.tags.map(x => `<span>${esc(x)}</span>`).join('');
  setText('stVer', s.version);
  setText('stOwner', s.owner);
}

function renderFeatures() {
  const fg = el('featureGrid');
  if (fg && DATA.features) {
    fg.innerHTML = DATA.features.map(f => `
      <div class="glass" style="padding:26px;">
        <div style="font-size:2rem;">${f.icon || '🧱'}</div>
        <h3 style="margin:12px 0 8px;">${esc(f.title)}</h3>
        <p style="color:var(--muted); margin:0;">${esc(f.desc)}</p>
      </div>`).join('');
  }
}

function renderSteps() {
  const sl = el('stepList');
  if (sl && DATA.steps) {
    sl.innerHTML = DATA.steps.map((st, i) => `
      <div class="step">
        <div class="badge">${i + 1}</div>
        <div><h4 style="margin:4px 0;">${esc(st.title)}</h4><p style="color:var(--muted); margin:0;">${esc(st.desc)}</p></div>
      </div>`).join('');
  }
}

function renderCommunity() {
  const s = DATA.server || {};
  const c = DATA.community || {};
  setText('commTitle', c.title);
  setText('commSubtitle', c.subtitle);
  setText('qqName', c.qqName);
  setText('qqServerName', c.serverName || s.name);
  setText('qqDesc', c.qqDesc);
  setText('qqNum', s.qqGroup);
  const btn = el('qqBtn');
  if (btn) {
    const link = (s.qqGroupLink || '').trim();
    const hasWebLink = /^https?:\/\/qm\.qq\.com\/.+/i.test(link) && !link.endsWith('k=');
    const hasProtoLink = /^tencent:\/\//i.test(link);
    if (hasWebLink || hasProtoLink) {
      btn.href = link;
      btn.target = hasWebLink ? '_blank' : '_self';
      btn.onclick = null;
    } else {
      // 没有有效链接时，点击复制群号
      btn.href = '#';
      btn.target = '_self';
      btn.onclick = (e) => {
        e.preventDefault();
        const num = s.qqGroup || '1044431401';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(num).then(() => alert('QQ群号已复制：' + num + '，请打开 QQ 搜索加入。'));
        } else {
          alert('QQ群号：' + num + '，请手动搜索加入。');
        }
      };
    }
  }
  const qr = el('qqQr');
  if (qr && s.qqQr) qr.src = s.qqQr;
  const logo = el('qqLogo');
  if (logo && c.logo) logo.src = c.logo;

  const nl = el('newsList');
  if (nl && DATA.announcements) {
    nl.innerHTML = DATA.announcements.slice(0, 4).map(a => `
      <div style="padding:14px 0; border-bottom:1px solid var(--glass-border);">
        <div style="font-weight:700;">${esc(a.title)}</div>
        <div class="hint" style="color:var(--muted); font-size:.85rem;">${esc(a.date)}</div>
      </div>`).join('');
  }
}

function renderScreenshots() {
  const sh = DATA.screenshots || {};
  setText('shotTitle', sh.title);
  setText('shotSubtitle', sh.subtitle);
  const g = el('shotsGrid');
  if (g && sh.items) {
    g.innerHTML = sh.items.map(it => `
      <div class="shot">
        ${it.src ? `<img src="${esc(it.src)}" alt="${esc(it.caption)}" />` : `<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--muted);">待上传截图</div>`}
        ${it.caption ? `<div class="cap">${esc(it.caption)}</div>` : ''}
      </div>`).join('');
  }
}

function renderContact() {
  const c = DATA.contact || {};
  setText('contactTitle', c.title);
  setText('contactSubtitle', c.subtitle);
  const sel = el('cSubject');
  if (sel && c.subjects) sel.innerHTML = c.subjects.map(x => `<option>${esc(x)}</option>`).join('');
  const guide = el('contactGuide');
  if (guide && c.guide) guide.innerHTML = c.guide.map(x => `<li>${esc(x)}</li>`).join('');
}

function renderAbout() {
  const s = DATA.server || {};
  setText('aboutSlogan', s.slogan);
  const ai = el('aboutInfo');
  if (ai) {
    ai.innerHTML = `
      <div class="glass status-card"><div class="num" style="font-size:1.3rem;">${esc(s.ip)}</div><div class="lbl">服务器 IP</div></div>
      <div class="glass status-card"><div class="num" style="font-size:1.3rem;">${esc(s.version)}</div><div class="lbl">游戏版本</div></div>
      <div class="glass status-card"><div class="num" style="font-size:1rem;">${esc(s.platformNote || 'Java 版')}</div><div class="lbl">平台</div></div>
      <div class="glass status-card"><div class="num" style="font-size:1.3rem;">${esc(s.qqGroup || '—')}</div><div class="lbl">QQ 群</div></div>`;
  }
  const af = el('aboutFeatures');
  if (af && DATA.features) {
    af.innerHTML = DATA.features.map(f => `
      <div class="glass" style="padding:22px;"><div style="font-size:1.8rem;">${f.icon || '🧱'}</div><h3 style="margin:8px 0;">${esc(f.title)}</h3><p style="color:var(--muted); margin:0;">${esc(f.desc)}</p></div>`).join('');
  }
  const ap = el('aboutPlayers');
  if (ap && DATA.players) {
    ap.innerHTML = DATA.players.map(p => `
      <div class="glass" style="padding:16px; display:flex; gap:12px; align-items:center;">
        <img class="avatar" src="assets/images/player-avatar.jpeg" alt="${esc(p.name)}" style="width:44px;height:44px;border-radius:10px;flex:none;object-fit:cover;border:1px solid var(--glass-border);" />
        <div><div style="font-weight:700;">${esc(p.name)}</div><div class="role" style="color:var(--accent);font-size:.85rem;">${esc(p.role||'')}</div><div class="hint" style="color:var(--muted);">${esc(p.note||'')}</div></div>
      </div>`).join('');
  }
}

function renderDownload() {
  const s = DATA.server || {};
  setText('dlVer', s.version);
  const dl = el('dlList');
  if (dl && DATA.downloads) {
    dl.innerHTML = DATA.downloads.map(d => {
      const isReal = d.url && d.url !== '#';
      const isExternal = isReal && /^https?:\/\//.test(d.url);
      const isVideo = isReal && /\.mp4($|\?)/i.test(d.url);
      const target = isExternal ? 'target="_blank"' : '';
      const playBtn = isVideo ? `<button class="btn btn-primary" onclick="document.getElementById('tutorialVideo').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('tutorialVideo').play()">▶ 在线播放</button>` : '';
      return `
      <div class="glass dl-item ${isReal ? '' : 'disabled'}">
        <div class="meta"><h3>${esc(d.name)} <span class="tag">${esc(d.version||'')}</span></h3><p style="color:var(--muted); margin:0;">${esc(d.desc)}</p><div class="tag" style="color:var(--muted); font-size:.85rem;">大小：${esc(d.size||'—')}</div></div>
        <div class="dl-actions">
          ${playBtn}
          <a class="btn ${isVideo ? 'btn-glass' : 'btn-primary'}" href="${esc(d.url||'#')}" ${target} ${isVideo ? 'download' : ''}>${isVideo ? '⬇ 下载' : '下载'}</a>
        </div>
      </div>`;
    }).join('');
  }
}

function renderTutorial() {
  const wrap = el('tutorialPlayer');
  if (!wrap) return;
  const t = DATA.tutorial || {};
  const url = (t.url || '').trim();
  if (!url) {
    wrap.innerHTML = `<div style="aspect-ratio:16/9;display:grid;place-items:center;color:var(--muted);background:rgba(0,0,0,.25);border-radius:12px;">📹 教程视频即将上线，敬请期待</div>`;
    return;
  }
  // B站：提取 BV 号做内嵌播放
  const bili = url.match(/BV[0-9A-Za-z]+/i);
  if (/bilibili\.com/i.test(url) && bili) {
    const bvid = bili[0];
    wrap.innerHTML = `<iframe src="https://player.bilibili.com/player.html?bvid=${esc(bvid)}&page=1&high_quality=1&danmaku=0" scrolling="no" frameborder="0" allowfullscreen="true" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;"></iframe>`;
    return;
  }
  // 通用 mp4 直链
  if (/\.mp4($|\?)/i.test(url)) {
    wrap.innerHTML = `<video controls style="width:100%;border-radius:12px;" preload="metadata"><source src="${esc(url)}" type="video/mp4" />你的浏览器不支持 HTML5 视频播放，请升级浏览器后在线观看。</video>`;
    return;
  }
  // 其他（网盘等）：跳转按钮
  wrap.innerHTML = `<div style="aspect-ratio:16/9;display:grid;place-items:center;background:rgba(0,0,0,.25);border-radius:12px;"><a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener">▶ 去外部观看教程</a></div>`;
}

function renderAll() {
  renderHero();
  renderFeatures();
  renderSteps();
  renderCommunity();
  renderScreenshots();
  renderContact();
  renderAbout();
  renderDownload();
  renderTutorial();
  refreshStatus();
}

// 实时状态（mcsrvstat.us 公共接口，失败回退 data.json）
async function refreshStatus() {
  const s = DATA.server || {};
  const setLine = (on, players, max, ver) => {
    const dot = el('stDot'), txt = el('stText');
    if (dot) dot.style.background = on ? 'var(--accent)' : 'var(--danger)';
    if (txt) txt.textContent = on ? '服务器运行中' : '服务器未运行';
    setText('stPlayers', players);
    setText('stMax', max);
    if (ver) setText('stVer', ver);
  };
  if (s.status) setLine(s.status.online, s.status.players, s.status.maxPlayers, s.version);
  if (!s.ip) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://api.mcsrvstat.us/2/${encodeURIComponent(s.ip)}`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = await res.json();
    if (j && typeof j.online === 'boolean') {
      setLine(j.online, j.players ? (j.players.online ?? '—') : '—', j.players ? (j.players.max ?? '—') : '—', j.version ? (Array.isArray(j.version) ? j.version[0] : j.version) : s.version);
    }
  } catch (e) { /* 回退手动值 */ }
}

// 复制 IP
function bindCopy() {
  const b = el('copyIp');
  if (!b) return;
  b.addEventListener('click', () => {
    const ip = (DATA.server && DATA.server.ip) || '';
    if (ip && navigator.clipboard) {
      navigator.clipboard.writeText(ip).then(() => {
        b.textContent = '✅ 已复制：' + ip;
        setTimeout(() => b.textContent = '📋 复制 IP 地址', 1800);
      });
    }
  });
}

// 联系表单
function bindContact() {
  const btn = el('cSubmit');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const name = el('cName').value.trim();
    const email = el('cEmail').value.trim();
    const subject = el('cSubject').value;
    const content = el('cContent').value.trim();
    const hint = el('cHint');
    if (!name || !email || !content) {
      hint.style.display = 'block'; hint.style.color = 'var(--danger)';
      hint.textContent = '请填写昵称、邮箱和内容后再提交。';
      return;
    }
    btn.textContent = '发送中…'; btn.disabled = true;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, content })
      });
      const j = await res.json();
      hint.style.display = 'block';
      if (j.ok) {
        hint.style.color = 'var(--accent)';
        hint.textContent = '✅ 提交成功！我们会尽快通过邮箱回复你。';
        el('cName').value = ''; el('cEmail').value = ''; el('cContent').value = '';
      } else {
        hint.style.color = 'var(--danger)';
        hint.textContent = j.msg || '提交失败，请稍后再试。';
      }
    } catch (e) {
      hint.style.display = 'block'; hint.style.color = 'var(--danger)';
      hint.textContent = '网络错误，请稍后再试。';
    } finally {
      btn.textContent = '发送邮件 ➤'; btn.disabled = false;
    }
  });
}

// 移动端菜单 + 平滑滚动 + 当前锚点高亮
window.addEventListener('DOMContentLoaded', () => {
  const t = el('navToggle'), l = el('navLinks');
  if (t && l) t.addEventListener('click', () => l.classList.toggle('open'));

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const navH = document.querySelector('.navbar')?.offsetHeight || 76;
        const dest = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        smoothScrollTo(dest, 650);
        if (l) l.classList.remove('open');
      }
    });
  });

  function smoothScrollTo(targetY, duration = 650) {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + diff * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const sections = ['community', 'contact', 'screenshots'];
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  function updateActive() {
    let current = '';
    sections.forEach(id => {
      const sec = document.getElementById(id);
      if (sec && window.scrollY >= sec.offsetTop - 120) current = id;
    });
    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
});

bindCopy();
bindContact();
loadData();
