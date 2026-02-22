/**
 * Tìm kiếm với FlexSearch (index title + origin_name)
 */
(function () {
  var searchInput = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var index = null;
  var gridCols = 4;
  var usePoster = false;
  var gridColumnsOptions = [2, 3, 4, 8];
  var gridColumnsExtra = 8;
  var currentList = [];
  var gridElRef = { el: null };

  function loadSettings() {
    return fetch(((window.DAOP && window.DAOP.basePath) || '') + '/data/config/site-settings.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (s) {
        var extra = parseInt(s.category_grid_columns_extra || s.grid_columns_extra || '8', 10);
        if ([6, 8, 10, 12, 14, 16].indexOf(extra) < 0) extra = 8;
        gridColumnsExtra = extra;
        gridColumnsOptions = [2, 3, 4, extra];
        var w = window.innerWidth || document.documentElement.clientWidth;
        var xs = parseInt(s.category_grid_cols_xs || s.default_grid_cols_xs || '2', 10);
        var sm = parseInt(s.category_grid_cols_sm || s.default_grid_cols_sm || '3', 10);
        var md = parseInt(s.category_grid_cols_md || s.default_grid_cols_md || '4', 10);
        var lg = parseInt(s.category_grid_cols_lg || s.default_grid_cols_lg || '6', 10);
        gridCols = w >= 1024 ? lg : w >= 768 ? md : w >= 480 ? sm : xs;
        if (gridColumnsOptions.indexOf(gridCols) < 0) gridCols = gridColumnsOptions[0];
        usePoster = (s.category_use_poster || s.default_use_poster || 'thumb') === 'poster';
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
      colPart += '<button type="button" class="grid-cols-btn' + (2 === gridCols ? ' active' : '') + '" data-cols="2">2</button><button type="button" class="grid-cols-btn' + (3 === gridCols ? ' active' : '') + '" data-cols="3">3</button><button type="button" class="grid-cols-btn' + (4 === gridCols ? ' active' : '') + '" data-cols="4">4</button>';
      colPart += '<select class="grid-cols-select" id="search-cols-extra"><option value="6"' + (gridColumnsExtra === 6 ? ' selected' : '') + '>6</option><option value="8"' + (gridColumnsExtra === 8 ? ' selected' : '') + '>8</option><option value="10"' + (gridColumnsExtra === 10 ? ' selected' : '') + '>10</option><option value="12"' + (gridColumnsExtra === 12 ? ' selected' : '') + '>12</option><option value="14"' + (gridColumnsExtra === 14 ? ' selected' : '') + '>14</option><option value="16"' + (gridColumnsExtra === 16 ? ' selected' : '') + '>16</option></select>';
      colPart += '<button type="button" class="grid-cols-btn' + (gridColumnsExtra === gridCols ? ' active' : '') + '" data-cols="' + gridColumnsExtra + '" id="search-cols-extra-btn">' + gridColumnsExtra + '</button>';
      colPart += '<label class="grid-poster-toggle"><span class="filter-label">Ảnh:</span><select class="grid-poster-select" name="use_poster"><option value="thumb"' + (!usePoster ? ' selected' : '') + '>Thumb</option><option value="poster"' + (usePoster ? ' selected' : '') + '>Poster</option></select></label>';
      toolbar.innerHTML = colPart;
      toolbar.querySelectorAll('.grid-cols-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          gridCols = parseInt(btn.getAttribute('data-cols'), 10);
          if (gridElRef.el) gridElRef.el.className = 'movies-grid movies-grid--cols-' + gridCols;
          toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
        });
      });
      var exSel = toolbar.querySelector('#search-cols-extra');
      var exBtn = toolbar.querySelector('#search-cols-extra-btn');
      if (exSel && exBtn) {
        exSel.addEventListener('change', function () {
          var oldExtra = gridColumnsExtra;
          gridColumnsExtra = parseInt(exSel.value, 10);
          exBtn.textContent = gridColumnsExtra;
          exBtn.setAttribute('data-cols', gridColumnsExtra);
          if (gridCols === oldExtra) gridCols = gridColumnsExtra;
          if (gridElRef.el) gridElRef.el.className = 'movies-grid movies-grid--cols-' + gridCols;
          toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
        });
      }
      toolbar.querySelector('.grid-poster-select').addEventListener('change', function () {
        usePoster = this.value === 'poster';
        if (gridElRef.el && currentList.length) {
          gridElRef.el.innerHTML = currentList.map(function (m) { return render(m, baseUrl, { usePoster: usePoster }); }).join('');
        }
      });
      resultsEl.innerHTML = '';
      resultsEl.appendChild(toolbar);
    } else {
      toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
      var posterSel = toolbar.querySelector('.grid-poster-select');
      if (posterSel) posterSel.value = usePoster ? 'poster' : 'thumb';
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
