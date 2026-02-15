/**
 * Trang diễn viên: lấy slug từ URL, hiển thị danh sách phim từ actorsData
 */
(function () {
  function getSlug() {
    var path = window.location.pathname;
    var m = path.match(/\/dien-vien\/([^/]+)(\.html)?$/);
    var slug = m ? decodeURIComponent(m[1]) : null;
    if (slug === 'index' || !slug) return null;
    return slug;
  }

  function init() {
    var slug = getSlug();
    var actorsData = window.actorsData || { map: {}, names: {} };
    if (!slug) {
      var names = actorsData.names || {};
      var listHtml = Object.keys(names).length
        ? '<p>Chọn diễn viên: ' + Object.keys(names).map(function(s){ return '<a href="/dien-vien/' + s + '.html">' + (names[s] || s) + '</a>'; }).join(' | ') + '</p>'
        : '<p>Chưa có dữ liệu diễn viên.</p>';
      document.title = 'Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
      var titleEl = document.getElementById('actor-name');
      if (titleEl) titleEl.textContent = 'Diễn viên';
      var grid = document.getElementById('movies-grid');
      if (grid) grid.innerHTML = listHtml;
      return;
    }
    var ids = actorsData.map[slug] || [];
    var name = actorsData.names[slug] || slug;
    document.title = name + ' | Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
    var titleEl = document.getElementById('actor-name');
    if (titleEl) titleEl.textContent = name;
    var list = (window.moviesLight || []).filter(function (m) { return ids.indexOf(m.id) !== -1; });
    var grid = document.getElementById('movies-grid');
    if (grid) {
      grid.innerHTML = list.length ? list.map(function (m) { return window.DAOP.renderMovieCard(m); }).join('') : '<p>Chưa có phim nào.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
