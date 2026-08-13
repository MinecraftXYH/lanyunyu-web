/* 蓝云屿网站彩蛋：
 * 1) Konami 秘籍：↑ ↑ ↓ ↓ ← → ← → B A  → 全屏烟花 + 「谢谢你们！」
 * 2) Logo 连点：1.5 秒内连点导航栏 logo 5 次 → 同上
 * 纯前端、无外部依赖；触发后不影响正常浏览。
 */
(function () {
  if (window.__lyyEgg) return;
  window.__lyyEgg = true;

  // ---------------- 烟花 ----------------
  let canvas, ctx, particles = [], rockets = [], animId = null, running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'egg-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh',
      zIndex: '100001', pointerEvents: 'none'
    });
    document.documentElement.appendChild(canvas); // 挂在 html 上，避免被 body 子 stacking 影响
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function launchRocket() {
    rockets.push({
      x: 60 + Math.random() * (canvas.width / (window.devicePixelRatio || 1) - 120),
      y: canvas.height / (window.devicePixelRatio || 1),
      vy: -(7 + Math.random() * 5),
      targetY: (canvas.height / (window.devicePixelRatio || 1)) * (0.14 + Math.random() * 0.32),
      color: 'hsl(' + Math.floor(Math.random() * 360) + ',95%,68%)'
    });
  }
  function explode(x, y, color) {
    const n = 50 + Math.floor(Math.random() * 40);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.3;
      const sp = 2.5 + Math.random() * 6;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.008 + Math.random() * 0.014,
        color: color,
        size: 1.5 + Math.random() * 3.5
      });
    }
  }
  function loop() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0,
      canvas.width / (window.devicePixelRatio || 1),
      canvas.height / (window.devicePixelRatio || 1));
    ctx.globalCompositeOperation = 'lighter';

    rockets.forEach(function (r, i) {
      r.y += r.vy;
      // 火箭尾迹
      ctx.beginPath();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y - r.vy * 3);
      ctx.stroke();
      // 火箭头（加大 + 发光）
      ctx.shadowBlur = 10;
      ctx.shadowColor = r.color;
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(r.x, r.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (r.y <= r.targetY) {
        explode(r.x, r.y, r.color);
        rockets.splice(i, 1);
      }
    });
    particles.forEach(function (p, i) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.08;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); return; }
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
    if (rockets.length || particles.length) {
      animId = requestAnimationFrame(loop);
    } else {
      running = false;
      if (animId) cancelAnimationFrame(animId);
      if (canvas) { canvas.remove(); canvas = null; ctx = null; }
      showThanks();
    }
  }
  function celebrate() {
    console.log('[蓝云屿彩蛋] 烟花触发！');
    ensureCanvas();
    if (running) return;
    running = true;
    const bursts = 9;
    for (let i = 0; i < bursts; i++) {
      setTimeout(launchRocket, i * 360);
    }
    if (!animId) loop();
  }

  // ---------------- 谢谢你们！ ----------------
  function showThanks() {
    const el = document.createElement('div');
    el.id = 'egg-thanks';
    el.textContent = '谢谢你们！';
    Object.assign(el.style, {
      position: 'fixed', left: '50%', top: '50%',
      transform: 'translate(-50%,-50%) scale(0.6)',
      fontFamily: '"ZCOOL KuaiLe", sans-serif',
      fontSize: 'clamp(2.5rem, 9vw, 5.5rem)',
      fontWeight: '900',
      color: '#fff',
      textShadow: '0 0 30px rgba(59,220,136,.9), 0 0 60px rgba(74,168,255,.7)',
      zIndex: '9999', pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity .6s ease, transform .6s cubic-bezier(.2,1.4,.4,1)'
    });
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) scale(1)';
    });
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,-50%) scale(1.12)';
      setTimeout(function () { el.remove(); }, 700);
    }, 2600);
  }

  // ---------------- Konami 秘籍 ----------------
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kPos = 0;
  window.addEventListener('keydown', function (e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[kPos]) {
      kPos++;
      if (kPos === KONAMI.length) { kPos = 0; celebrate(); }
    } else {
      kPos = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  // ---------------- Logo 连点 ----------------
  function bindLogo() {
    const logo = document.getElementById('siteLogo');
    if (!logo) return;
    let clicks = 0, timer = null;
    logo.addEventListener('click', function (ev) {
      clicks++;
      if (clicks === 1) timer = setTimeout(function () { clicks = 0; }, 1500);
      if (clicks >= 5) {
        ev.preventDefault();
        ev.stopPropagation();
        clearTimeout(timer); clicks = 0;
        celebrate();
      }
    });
  }
  if (document.readyState !== 'loading') bindLogo();
  else document.addEventListener('DOMContentLoaded', bindLogo);
})();
