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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'egg-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '9998', pointerEvents: 'none'
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function launchRocket() {
    rockets.push({
      x: Math.random() * canvas.width,
      y: canvas.height,
      vy: -(6 + Math.random() * 3),
      targetY: canvas.height * (0.18 + Math.random() * 0.32),
      color: 'hsl(' + Math.floor(Math.random() * 360) + ',90%,65%)'
    });
  }
  function explode(x, y, color) {
    const n = 40 + Math.floor(Math.random() * 30);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const sp = 2 + Math.random() * 4;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        color: color
      });
    }
  }
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rockets.forEach(function (r, i) {
      r.y += r.vy;
      ctx.beginPath();
      ctx.fillStyle = r.color;
      ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
      ctx.fill();
      if (r.y <= r.targetY) {
        explode(r.x, r.y, r.color);
        rockets.splice(i, 1);
      }
    });
    particles.forEach(function (p, i) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); return; }
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
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
    ensureCanvas();
    if (running) return;
    running = true;
    const bursts = 7;
    for (let i = 0; i < bursts; i++) {
      setTimeout(launchRocket, i * 420);
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
