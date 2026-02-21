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

  function init() {
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
    var ids = map[slug] || [];
    var name = names[slug] || slug;
    document.title = name + ' | Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
    var titleEl = document.getElementById('actor-name');
    if (titleEl) titleEl.textContent = name;
    var list = (window.moviesLight || []).filter(function (m) { return ids.indexOf(m.id) !== -1; });
    var grid = document.getElementById('movies-grid');
    if (grid) {
      grid.innerHTML = list.length ? list.map(function (m) { return window.DAOP.renderMovieCard(m); }).join('') : '<p>Chưa có phim nào.</p>';
    }
  }

  function run() {
    var slug = getSlug();
    var url = getShardUrl(slug);
    var script = document.createElement('script');
    script.src = url;
    script.onload = init;
    script.onerror = function () {
      var grid = document.getElementById('movies-grid');
      if (grid) grid.innerHTML = '<p>Không tải được dữ liệu diễn viên.</p>';
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
