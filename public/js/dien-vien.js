/**
 * Trang diễn viên: load shard theo ký tự đầu (actors-index.js hoặc actors-{a..z|other}.js), rồi hiển thị.
 */
(function () {
  function getSlug() {
    var path = window.location.pathname;
    var m = path.match(/\/dien-vien\/([^/]+)(\.html)?$/);
    if (!m) m = path.match(/.+\/dien-vien\/([^/]+)(\.html)?$/);
    var slug = m ? decodeURIComponent(m[1]) : null;
    if (slug === 'index' || !slug) return null;
    return slug;
  }

  function getShardUrl(slug) {
    var base = (window.DAOP && window.DAOP.basePath) || '';
    if (!slug) return base + '/data/actors-index.js';
    var c = (slug[0] || '').toLowerCase();
    var key = (c >= 'a' && c <= 'z') ? c : 'other';
    return base + '/data/actors-' + key + '.js';
  }

  function init(retryCount) {
    retryCount = retryCount || 0;
    var slug = getSlug();
    var names = {};
    var map = {};
    if (!slug) {
      var idx = window.actorsIndex;
      if (idx && idx.names) names = idx.names;
    } else {
      var data = window.actorsData;
      if (data) {
        names = data.names || {};
        map = data.map || {};
      }
    }
    if (!slug) {
      var listHtml = Object.keys(names).length
        ? '<p>Chọn diễn viên: ' + Object.keys(names).map(function(s){ return '<a href="' + s + '.html">' + (names[s] || s).replace(/</g, '&lt;') + '</a>'; }).join(' | ') + '</p>'
        : '<p>Chưa có dữ liệu diễn viên.</p>';
      document.title = 'Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
      var titleEl = document.getElementById('actor-name');
      if (titleEl) titleEl.textContent = 'Diễn viên';
      var grid = document.getElementById('movies-grid');
      if (grid) grid.innerHTML = listHtml;
      return;
    }
    var ids = (map[slug] || []).map(function (x) { return String(x); });
    var list = (data && data.movies && data.movies[slug]) ? data.movies[slug] : [];
    if (list.length === 0 && ids.length > 0) {
      var moviesLight = window.moviesLight;
      if (moviesLight && moviesLight.length > 0) {
        var idsSet = {};
        for (var i = 0; i < ids.length; i++) idsSet[ids[i]] = true;
        list = moviesLight.filter(function (m) { return idsSet[String(m.id)]; });
      } else if (retryCount < 2) {
        var base = (window.DAOP && window.DAOP.basePath) || '';
        var s = document.createElement('script');
        s.src = base + '/data/movies-light.js';
        s.onload = function () { init(retryCount + 1); };
        s.onerror = function () { renderActorMovies(slug, names, ids, []); };
        document.head.appendChild(s);
        return;
      }
    }
    renderActorMovies(slug, names, ids, list);
  }

  function renderActorMovies(slug, names, ids, list) {
    var name = names[slug] || slug;
    document.title = name + ' | Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
    var titleEl = document.getElementById('actor-name');
    if (titleEl) titleEl.textContent = name;
    var grid = document.getElementById('movies-grid');
    if (grid) {
      grid.innerHTML = list.length ? list.map(function (m) { return window.DAOP && window.DAOP.renderMovieCard ? window.DAOP.renderMovieCard(m) : ''; }).join('') : '<p>Chưa có phim nào.</p>';
    }
  }

  function run() {
    var slug = getSlug();
    var base = (window.DAOP && window.DAOP.basePath) || '';
    var url = getShardUrl(slug);
    var script = document.createElement('script');
    script.src = url;
    script.onload = init;
    script.onerror = function () {
      var fallback = base + '/data/actors.js';
      if (fallback === url) {
        var grid = document.getElementById('movies-grid');
        if (grid) grid.innerHTML = '<p>Không tải được dữ liệu diễn viên.</p>';
        return;
      }
      var s2 = document.createElement('script');
      s2.src = fallback;
      s2.onload = function () {
        if (!slug && window.actorsData && window.actorsData.names) {
          window.actorsIndex = { names: window.actorsData.names };
        }
        init();
      };
      s2.onerror = function () {
        var grid = document.getElementById('movies-grid');
        if (grid) grid.innerHTML = '<p>Không tải được dữ liệu diễn viên.</p>';
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
