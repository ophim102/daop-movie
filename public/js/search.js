/**
 * Tìm kiếm với FlexSearch (index title + origin_name)
 */
(function () {
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var index = null;
  var gridCols = 4;
  var usePoster = false;
  var gridColumnsOptions = [2, 3, 4, 6, 8];
  var currentList = [];
  var gridElRef = { el: null };

  function loadSettings() {
    return fetch(((window.DAOP && window.DAOP.basePath) || '') + '/data/config/site-settings.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (s) {
        var colType = (s.category_grid_column_type || 'A').toUpperCase();
        gridColumnsOptions = colType === 'B' ? [3, 4, 6, 8] : [2, 3, 4, 6, 8];
        gridCols = parseInt(s.default_grid_cols, 10) || 4;
        if (gridColumnsOptions.indexOf(gridCols) < 0) gridCols = gridColumnsOptions.indexOf(4) >= 0 ? 4 : gridColumnsOptions[0];
        usePoster = (s.category_use_poster || '').toLowerCase() === 'poster' || s.default_use_poster === 'true';
      });
  }

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
    currentList = list;
    if (!list.length) {
      resultsEl.innerHTML = '<p>Không tìm thấy kết quả.</p>';
      gridElRef.el = null;
      return;
    }
    var render = (window.DAOP && window.DAOP.renderMovieCard);
    if (!render) {
      resultsEl.innerHTML = '<p>Lỗi: không thể hiển thị kết quả.</p>';
      return;
    }
    var baseUrl = (window.DAOP && window.DAOP.basePath) || '';
    var grid = document.createElement('div');
    grid.className = 'movies-grid movies-grid--cols-' + gridCols;
    grid.innerHTML = list.map(function (m) { return render(m, baseUrl, { usePoster: usePoster }); }).join('');
    gridElRef.el = grid;
    var toolbar = resultsEl.querySelector('.grid-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'grid-toolbar';
      toolbar.setAttribute('aria-label', 'Tùy chọn hiển thị');
      var colPart = '<span class="filter-label">Cột:</span>';
      gridColumnsOptions.forEach(function (n) {
        colPart += '<button type="button" class="grid-cols-btn' + (n === gridCols ? ' active' : '') + '" data-cols="' + n + '">' + n + '</button>';
      });
      toolbar.innerHTML = colPart + '<label class="grid-poster-toggle"><input type="checkbox" name="use_poster" ' + (usePoster ? 'checked' : '') + '> Poster</label>';
      toolbar.querySelectorAll('.grid-cols-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          gridCols = parseInt(btn.getAttribute('data-cols'), 10);
          if (gridElRef.el) gridElRef.el.className = 'movies-grid movies-grid--cols-' + gridCols;
          toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
        });
      });
      toolbar.querySelector('input[name="use_poster"]').addEventListener('change', function () {
        usePoster = this.checked;
        if (gridElRef.el && currentList.length) {
          gridElRef.el.innerHTML = currentList.map(function (m) { return render(m, baseUrl, { usePoster: usePoster }); }).join('');
        }
      });
      resultsEl.innerHTML = '';
      resultsEl.appendChild(toolbar);
    } else {
      toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
      toolbar.querySelector('input[name="use_poster"]').checked = usePoster;
      var oldGrid = resultsEl.querySelector('.movies-grid');
      if (oldGrid) resultsEl.removeChild(oldGrid);
    }
    resultsEl.appendChild(grid);
  }

  function init() {
    loadSettings().then(function () {
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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
