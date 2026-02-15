/**
 * Tìm kiếm với FlexSearch (index title + origin_name)
 */
(function () {
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var index = null;

  function buildIndex() {
    if (typeof FlexSearch === 'undefined') {
      console.warn('FlexSearch not loaded');
      return;
    }
    var list = window.moviesLight || [];
    if (!list.length) return null;
    var idx = new FlexSearch.Index({ tokenize: 'forward', charset: 'latin:extra' });
    list.forEach(function (m, i) {
      var text = (m.title || '') + ' ' + (m.origin_name || '') + ' ' + (m.slug || '');
      idx.add(i, text);
    });
    return { index: idx, list: list };
  }

  function doSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q.length) {
      if (resultsEl) resultsEl.innerHTML = '';
      return;
    }
    if (!index) index = buildIndex();
    if (!index) return;
    var ids = index.index.search(q, { limit: 50 });
    var list = ids.map(function (i) { return index.list[i]; }).filter(Boolean);
    renderResults(list);
  }

  function renderResults(list) {
    if (!resultsEl) return;
    if (!list.length) {
      resultsEl.innerHTML = '<p>Không tìm thấy kết quả.</p>';
      return;
    }
    resultsEl.innerHTML = '<div class="movies-grid">' + list.map(function (m) {
      return window.DAOP.renderMovieCard(m);
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
