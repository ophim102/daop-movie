/**
 * Tìm kiếm với FlexSearch (index title + origin_name)
 */
(function () {
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var index = null;

  function buildIndex() {
    var list = window.moviesLight || [];
    if (!list.length) return null;
    if (typeof FlexSearch !== 'undefined' && FlexSearch.Index) {
      try {
        var idx = new FlexSearch.Index({ tokenize: 'forward', charset: 'latin:extra' });
        list.forEach(function (m, i) {
          var text = (m.title || '') + ' ' + (m.origin_name || '') + ' ' + (m.slug || '');
          idx.add(i, text);
        });
        return { index: idx, list: list, useFlexSearch: true };
      } catch (e) {
        console.warn('FlexSearch index build failed:', e);
      }
    }
    return { index: null, list: list, useFlexSearch: false };
  }

  function searchFallback(list, q) {
    q = q.toLowerCase();
    return list.filter(function (m) {
      var title = (m.title || '').toLowerCase();
      var origin = (m.origin_name || '').toLowerCase();
      var slug = (m.slug || '').toLowerCase();
      return title.indexOf(q) >= 0 || origin.indexOf(q) >= 0 || slug.indexOf(q) >= 0;
    }).slice(0, 50);
  }

  function doSearch(q) {
    q = (q || '').trim();
    if (!q.length) {
      if (resultsEl) resultsEl.innerHTML = '';
      return;
    }
    if (!index) index = buildIndex();
    if (!index) return;
    var list;
    if (index.useFlexSearch && index.index) {
      try {
        var ids = index.index.search(q, 50);
        if (!Array.isArray(ids)) ids = [];
        list = ids.map(function (i) { return index.list[i]; }).filter(Boolean);
      } catch (e) {
        list = searchFallback(index.list, q);
      }
    } else {
      list = searchFallback(index.list, q);
    }
    renderResults(list);
  }

  function renderResults(list) {
    if (!resultsEl) return;
    if (!list.length) {
      resultsEl.innerHTML = '<p>Không tìm thấy kết quả.</p>';
      return;
    }
    var render = (window.DAOP && window.DAOP.renderMovieCard);
    if (!render) {
      resultsEl.innerHTML = '<p>Lỗi: không thể hiển thị kết quả.</p>';
      return;
    }
    resultsEl.innerHTML = '<div class="movies-grid">' + list.map(function (m) {
      return render(m);
    }).join('') + '</div>';
  }

  function init() {
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        doSearch(this.value);
      });
      searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') doSearch(this.value);
      });
    }
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    if (q && searchInput) {
      searchInput.value = q;
      doSearch(q);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
