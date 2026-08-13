/* 蓝云屿网站彩蛋：
 * 1) Konami 秘籍：↑ ↑ ↓ ↓ ← → ← → B A  → 全屏烟花 + 「谢谢你们！」
 * 2) Logo 连点：1.5 秒内连点导航栏 logo 5 次 → 同上
 * 纯前端、无外部依赖；触发后不影响正常浏览。
 */
(function () {
  if (window.__lyyEgg) return;
  window.__lyyEgg = true;

  const COLORS = [
    '#ff4d4d', '#4dff88', '#4da6ff', '#ffeb3b',
    '#ff66cc', '#00f2ff', '#b388ff', '#76ff03'
  ];

  let container = null, running = false;

  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'egg-fireworks';
    Object.assign(container.style, {
      position: 'fixed', inset: '0',
      width: '100vw', height: '100vh',
      zIndex: '100001', pointerEvents: 'none',
      overflow: 'hidden'
    });
    document.body.appendChild(container);
  }

  function removeContainer() {
    if (container) { container.remove(); container = null; }
  }

  function makeParticle(x, y, color) {
    const p = document.createElement('div');
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    const size = 4 + Math.random() * 5;
    Object.assign(p.style, {
      position: 'absolute',
      left: x + 'px', top: y + 'px',
      width: size + 'px', height: size + 'px',
      borderRadius: '50%',
      backgroundColor: color,
      boxShadow: '0 0 8px ' + color + ', 0 0 16px ' + color,
      opacity: '1',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity .05s linear'
    });
    container.appendChild(p);

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let life = 1;
    let px = x, py = y;

    function step() {
      if (!container) { p.remove(); return; }
      px += vx; py += vy;
      vy += 0.18; // 重力
      vx *= 0.98; // 空气阻力
      life -= 0.014;
      if (life <= 0) { p.remove(); return; }
      p.style.left = px + 'px';
      p.style.top = py + 'px';
      p.style.opacity = life;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function launchRocket() {
    if (!container) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const startX = 80 + Math.random() * (w - 160);
    const targetY = h * (0.15 + Math.random() * 0.35);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const rocket = document.createElement('div');
    Object.assign(rocket.style, {
      position: 'absolute',
      left: startX + 'px', top: h + 'px',
      width: '6px', height: '16px',
      borderRadius: '3px',
      backgroundColor: '#fff',
      boxShadow: '0 0 8px ' + color,
      transform: 'translate(-50%, -50%)'
    });
    container.appendChild(rocket);

    let y = h;
    const speed = 9 + Math.random() * 6;
    function rise() {
      if (!container) { rocket.remove(); return; }
      y -= speed;
      rocket.style.top = y + 'px';
      if (y <= targetY) {
        rocket.remove();
        // 爆炸：生成一堆粒子
        const n = 45 + Math.floor(Math.random() * 30);
        for (let i = 0; i < n; i++) makeParticle(startX, y, color);
      } else {
        requestAnimationFrame(rise);
      }
    }
    requestAnimationFrame(rise);
  }

  function celebrate() {
    console.log('[蓝云屿彩蛋] 烟花触发！');
    ensureContainer();
    if (running) return;
    running = true;

    const bursts = 10;
    for (let i = 0; i < bursts; i++) {
      setTimeout(launchRocket, i * 350);
    }

    // 约 4.5 秒后清理并显示文字
    setTimeout(function () {
      running = false;
      removeContainer();
      showThanks();
    }, 4500);
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
      zIndex: '100002', pointerEvents: 'none',
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
