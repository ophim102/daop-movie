/**
 * Common: load config, global helpers
 */
(function () {
  window.DAOP = window.DAOP || {};
  const BASE = window.DAOP.basePath || '';

  /** Load JSON config from data/config/ */
  window.DAOP.loadConfig = async function (name) {
    const url = `${BASE}/data/config/${name}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  };

  /** Get movie by slug from moviesLight (so khớp chính xác, rồi không phân biệt hoa thường) */
  window.DAOP.getMovieBySlug = function (slug) {
    if (!slug) return undefined;
    const list = window.moviesLight || [];
    const s = String(slug).trim();
    let m = list.find(function (x) { return (x.slug || '') === s; });
    if (!m) m = list.find(function (x) { return (x.slug || '').toLowerCase() === s.toLowerCase(); });
    return m;
  };

  /** Get movie index by id for batch path (id so sánh dạng string để tránh lệch kiểu) */
  window.DAOP.getBatchPath = function (id) {
    if (id == null) return null;
    const list = window.moviesLight || [];
    const idStr = String(id);
    const idx = list.findIndex(function (m) {
      return String(m.id) === idStr;
    });
    if (idx < 0) return null;
    const start = Math.floor(idx / 100) * 100;
    const end = Math.min(start + 100, list.length);
    return `${BASE}/data/batches/batch_${start}_${end}.js`;
  };

  /** Load full movie by id (load batch then find) */
  window.DAOP.loadMovieDetail = function (id, callback) {
    const path = window.DAOP.getBatchPath(id);
    if (!path) {
      callback(null);
      return;
    }
    const script = document.createElement('script');
    script.src = path;
    script.onload = function () {
      const batch = window.moviesBatch || [];
      const idStr = String(id);
      const movie = batch.find(function (m) {
        return String(m.id) === idStr;
      });
      callback(movie || null);
    };
    script.onerror = function () {
      callback(null);
    };
    document.head.appendChild(script);
  };

  /** Render movie card HTML (title + origin_name) */
  window.DAOP.renderMovieCard = function (m, baseUrl) {
    baseUrl = baseUrl || BASE;
    const href = baseUrl + '/phim/' + (m.slug || m.id) + '.html';
    const thumb = (m.thumb || m.poster || '').replace(/^\/\//, 'https://');
    const title = (m.title || '').replace(/</g, '&lt;');
    const origin = (m.origin_name || '').replace(/</g, '&lt;');
    return (
      '<div class="movie-card">' +
      '<a href="' + href + '">' +
      '<div class="thumb-wrap"><img loading="lazy" src="' + thumb + '" alt="' + title + '"></div>' +
      '<div class="movie-info">' +
      '<h3 class="title">' + title + '</h3>' +
      (origin ? '<p class="origin-title">' + origin + '</p>' : '') +
      '<p class="meta">' + (m.year || '') + (m.episode_current ? ' • ' + m.episode_current + ' tập' : '') + '</p>' +
      '</div></a></div>'
    );
  };

  /** Render slider carousel từ homepage_slider (array) vào el */
  window.DAOP.renderSlider = function (el, slides) {
    if (!el || !Array.isArray(slides) || slides.length === 0) return;
    var base = BASE || '';
    var html = '<div class="slider-viewport"><div class="slider-track">';
    slides.forEach(function (s, i) {
      var href = (s.link_url || '#').replace(/"/g, '&quot;');
      var img = (s.image_url || '').replace(/"/g, '&quot;');
      var title = (s.title || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      html += '<div class="slider-slide" data-index="' + i + '"><a href="' + href + '"><img src="' + img + '" alt="' + title + '"></a></div>';
    });
    html += '</div></div><button type="button" class="slider-btn slider-prev" aria-label="Trước">‹</button><button type="button" class="slider-btn slider-next" aria-label="Sau">›</button><div class="slider-dots"></div>';
    el.innerHTML = html;
    var track = el.querySelector('.slider-track');
    var dotContainer = el.querySelector('.slider-dots');
    var len = slides.length;
    for (var d = 0; d < len; d++) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot' + (d === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Slide ' + (d + 1));
      dot.dataset.index = String(d);
      dotContainer.appendChild(dot);
    }
    var idx = 0;
    function goTo(i) {
      idx = (i + len) % len;
      if (track) track.style.transform = 'translateX(-' + idx * 100 + '%)';
      el.querySelectorAll('.slider-dot').forEach(function (dot, j) {
        dot.classList.toggle('active', j === idx);
      });
    }
    el.querySelector('.slider-prev')?.addEventListener('click', function () { goTo(idx - 1); });
    el.querySelector('.slider-next')?.addEventListener('click', function () { goTo(idx + 1); });
    dotContainer.querySelectorAll('.slider-dot').forEach(function (dot) {
      dot.addEventListener('click', function () { goTo(parseInt(dot.dataset.index, 10)); });
    });
    var t = setInterval(function () { goTo(idx + 1); }, 5000);
    el._sliderInterval = t;
  };

  /** Áp dụng site-settings lên trang: theme, logo, favicon, footer, TMDB, slider */
  window.DAOP.applySiteSettings = function (settings) {
    if (!settings) return;
    var root = document.documentElement;
    if (settings.theme_primary) root.style.setProperty('--accent', settings.theme_primary);
    if (settings.theme_accent) root.style.setProperty('--accent-hover', settings.theme_accent);
    if (settings.theme_bg) root.style.setProperty('--bg', settings.theme_bg);
    if (settings.theme_card) root.style.setProperty('--card', settings.theme_card);
    var logo = document.querySelector('.site-logo');
    if (logo && settings.logo_url) {
      logo.innerHTML = '<img src="' + (settings.logo_url || '').replace(/"/g, '&quot;') + '" alt="' + (settings.site_name || '').replace(/"/g, '&quot;') + '">';
      if (!logo.getAttribute('href')) logo.setAttribute('href', BASE || '/');
    } else if (logo && settings.site_name && !logo.querySelector('img')) {
      logo.textContent = settings.site_name;
    }
    if (settings.favicon_url) {
      var link = document.querySelector('link[rel="icon"]') || document.createElement('link');
      link.rel = 'icon';
      link.href = settings.favicon_url;
      if (!link.parentNode) document.head.appendChild(link);
    }
    var footer = document.querySelector('.site-footer');
    if (footer && settings.footer_content) {
      footer.innerHTML = settings.footer_content;
    } else if (footer && settings.tmdb_attribution === 'false') {
      var tmdbEl = footer.querySelector('.footer-tmdb');
      if (tmdbEl) tmdbEl.style.display = 'none';
    }
    var sliderWrap = document.getElementById('slider-wrap');
    if (sliderWrap) {
      try {
        var raw = settings.homepage_slider;
        var arr = typeof raw === 'string' ? (raw ? JSON.parse(raw) : []) : (Array.isArray(raw) ? raw : []);
        if (Array.isArray(arr) && arr.length > 0) {
          arr.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
          window.DAOP.renderSlider(sliderWrap, arr);
          var bannerWrap = document.getElementById('banner-wrap');
          if (bannerWrap) bannerWrap.style.display = 'none';
        }
      } catch (e) {}
    }
    for (var i = 1; i <= 10; i++) {
      var menuBgUrl = settings['menu_bg_' + i];
      if (menuBgUrl) root.style.setProperty('--menu-bg-' + i, 'url(' + menuBgUrl + ')');
    }
  };

  /** Inject tracking from site-settings */
  window.DAOP.injectTracking = async function () {
    try {
      const settings = await window.DAOP.loadConfig('site-settings');
      if (!settings) return;
      window.DAOP.applySiteSettings(settings);
      if (settings.google_analytics_id) {
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + settings.google_analytics_id;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        function gtag() {
          dataLayer.push(arguments);
        }
        gtag('js', new Date());
        gtag('config', settings.google_analytics_id);
      }
      if (settings.simple_analytics_script) {
        const s = document.createElement('script');
        s.innerHTML = settings.simple_analytics_script;
        document.head.appendChild(s);
      }
    } catch (e) {}
  };

  /** Mobile: nút 3 gạch ẩn/hiện menu; mỗi mục dùng ảnh nền riêng (CSS: menu-1.png … menu-10.png) */
  function initMobileNav() {
    var header = document.querySelector('.site-header');
    var nav = header && header.querySelector('.site-nav');
    if (!header || !nav) return;
    if (header.querySelector('.nav-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Mở menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>';
    btn.addEventListener('click', function () {
      var open = header.classList.toggle('menu-open');
      btn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.insertBefore(btn, header.firstChild);
    document.addEventListener('click', function (e) {
      if (!header.classList.contains('menu-open')) return;
      if (header.contains(e.target)) return;
      header.classList.remove('menu-open');
      btn.setAttribute('aria-label', 'Mở menu');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /** Run on DOM ready */
  function onReady() {
    window.DAOP.injectTracking();
    initMobileNav();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
