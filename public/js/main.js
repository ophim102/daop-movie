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

  /** Get movie by slug from moviesLight */
  window.DAOP.getMovieBySlug = function (slug) {
    const list = window.moviesLight || [];
    return list.find(function (m) {
      return m.slug === slug;
    });
  };

  /** Get movie index by id for batch path */
  window.DAOP.getBatchPath = function (id) {
    const list = window.moviesLight || [];
    const idx = list.findIndex(function (m) {
      return m.id === id;
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
      const movie = batch.find(function (m) {
        return m.id === id;
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

  /** Inject tracking from site-settings */
  window.DAOP.injectTracking = async function () {
    try {
      const settings = await window.DAOP.loadConfig('site-settings');
      if (!settings) return;
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

  /** Run on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.DAOP.injectTracking();
    });
  } else {
    window.DAOP.injectTracking();
  }
})();
