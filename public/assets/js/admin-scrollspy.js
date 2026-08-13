// 后台滚动联动：右侧滑到哪个板块，左侧导航对应项高亮
(function () {
  function init() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.admin-sidebar a'));
    if (!links.length) return;
    var map = {};
    var sections = [];
    links.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#') return;
      var id = href.slice(1);
      var sec = document.getElementById(id);
      if (sec) { map[id] = a; sections.push(sec); }
    });
    if (!sections.length) return;

    var offset = 110; // 顶部导航高度 + 余量

    function onScroll() {
      // 登录框可见（主面板隐藏）时不处理
      var frame = document.getElementById('adminFrame');
      if (frame && frame.style.display === 'none') return;

      var currentId = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].getBoundingClientRect();
        if (rect.top <= offset) currentId = sections[i].id;
      }
      // 滚到接近底部时，强制高亮最后一个板块
      var scrollBottom = window.innerHeight + window.scrollY;
      var docHeight = document.documentElement.scrollHeight;
      if (scrollBottom >= docHeight - 4) {
        currentId = sections[sections.length - 1].id;
      }

      links.forEach(function (a) { a.classList.remove('active'); });
      if (map[currentId]) map[currentId].classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // 登录后主面板显示时，立即同步一次高亮
    var frame = document.getElementById('adminFrame');
    if (frame) {
      var obs = new MutationObserver(function () {
        if (frame.style.display !== 'none') onScroll();
      });
      obs.observe(frame, { attributes: true, attributeFilter: ['style'] });
    }
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
