(function () {
  function $(id) { return document.getElementById(id); }

  var favGrid = $('favorites-grid');
  var favEmpty = $('favorites-empty');
  var gridCols = 4;
  var usePoster = false;
  var gridColumnsExtra = 8;
  var gridColumnsOptions = [2, 3, 4, 8];
  var currentList = [];
  var toolbarRef = { el: null };
  var pageSize = 24;
  var currentPage = 1;
  var pagerRef = { el: null };

  function getCreateClient() {
    if (typeof createClient !== 'undefined') return createClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') return window.supabase.createClient;
    return null;
  }

  function loadSupabaseJs() {
    if (getCreateClient()) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function loadSettings() {
    if (window.DAOP && window.DAOP.siteSettings) return Promise.resolve(window.DAOP.siteSettings);
    if (window.DAOP && window.DAOP.loadConfig) {
      return window.DAOP.loadConfig('site-settings').then(function (s) {
        window.DAOP = window.DAOP || {};
        window.DAOP.siteSettings = s || {};
        if (window.DAOP.applySiteSettings) window.DAOP.applySiteSettings(window.DAOP.siteSettings);
        return window.DAOP.siteSettings;
      });
    }
    return fetch('/data/config/site-settings.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (s) {
        window.DAOP = window.DAOP || {};
        window.DAOP.siteSettings = s || {};
        if (window.DAOP.applySiteSettings) window.DAOP.applySiteSettings(window.DAOP.siteSettings);
        return window.DAOP.siteSettings;
      });
  }

  function initClient() {
    return Promise.all([loadSettings(), loadSupabaseJs()]).then(function (arr) {
      var s = arr[0] || {};
      window.DAOP = window.DAOP || {};
      if (!window.DAOP.supabaseUserUrl) window.DAOP.supabaseUserUrl = s.supabase_user_url || '';
      if (!window.DAOP.supabaseUserAnonKey) window.DAOP.supabaseUserAnonKey = s.supabase_user_anon_key || '';

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

      var url = window.DAOP.supabaseUserUrl;
      var key = window.DAOP.supabaseUserAnonKey;
      var cc = getCreateClient();
      if (!url || !key || !cc) return null;
      if (!window.DAOP._supabaseUser) window.DAOP._supabaseUser = cc(url, key);
      return window.DAOP._supabaseUser;
    });
  }

  function ensureToolbar() {
    if (!favGrid) return null;
    var parent = favGrid.parentElement;
    if (!parent) return null;

    var toolbar = parent.querySelector('.grid-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'grid-toolbar';
      toolbar.setAttribute('aria-label', 'Tùy chọn hiển thị');

      var colPart = '<span class="filter-label">Cột:</span>';
      colPart += '<button type="button" class="grid-cols-btn' + (2 === gridCols ? ' active' : '') + '" data-cols="2">2</button><button type="button" class="grid-cols-btn' + (3 === gridCols ? ' active' : '') + '" data-cols="3">3</button><button type="button" class="grid-cols-btn' + (4 === gridCols ? ' active' : '') + '" data-cols="4">4</button>';
      colPart += '<select class="grid-cols-select" id="fav-cols-extra"><option value="6"' + (gridColumnsExtra === 6 ? ' selected' : '') + '>6</option><option value="8"' + (gridColumnsExtra === 8 ? ' selected' : '') + '>8</option><option value="10"' + (gridColumnsExtra === 10 ? ' selected' : '') + '>10</option><option value="12"' + (gridColumnsExtra === 12 ? ' selected' : '') + '>12</option><option value="14"' + (gridColumnsExtra === 14 ? ' selected' : '') + '>14</option><option value="16"' + (gridColumnsExtra === 16 ? ' selected' : '') + '>16</option></select>';
      colPart += '<button type="button" class="grid-cols-btn' + (gridColumnsExtra === gridCols ? ' active' : '') + '" data-cols="' + gridColumnsExtra + '" id="fav-cols-extra-btn">' + gridColumnsExtra + '</button>';
      colPart += '<label class="grid-poster-toggle"><span class="filter-label">Ảnh:</span><select class="grid-poster-select" name="use_poster"><option value="thumb"' + (!usePoster ? ' selected' : '') + '>Thumb</option><option value="poster"' + (usePoster ? ' selected' : '') + '>Poster</option></select></label>';
      toolbar.innerHTML = colPart;
      parent.insertBefore(toolbar, favGrid);
    }

    toolbarRef.el = toolbar;

    if (toolbar.getAttribute('data-bound') === '1') return toolbar;
    toolbar.setAttribute('data-bound', '1');

    toolbar.querySelectorAll('.grid-cols-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        gridCols = parseInt(btn.getAttribute('data-cols'), 10);
        favGrid.className = 'movies-grid movies-grid--cols-' + gridCols;
        toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
      });
    });

    var exSel = toolbar.querySelector('#fav-cols-extra');
    var exBtn = toolbar.querySelector('#fav-cols-extra-btn');
    if (exSel && exBtn) {
      exSel.addEventListener('change', function () {
        var oldExtra = gridColumnsExtra;
        gridColumnsExtra = parseInt(exSel.value, 10);
        exBtn.textContent = gridColumnsExtra;
        exBtn.setAttribute('data-cols', gridColumnsExtra);
        if (gridCols === oldExtra) gridCols = gridColumnsExtra;
        favGrid.className = 'movies-grid movies-grid--cols-' + gridCols;
        toolbar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === gridCols); });
      });
    }

    var posterSel = toolbar.querySelector('.grid-poster-select');
    if (posterSel) {
      posterSel.addEventListener('change', function () {
        usePoster = this.value === 'poster';
        renderFavorites();
      });
    }

    return toolbar;
  }

  function ensurePager() {
    if (!favGrid) return null;
    var parent = favGrid.parentElement;
    if (!parent) return null;
    var pager = parent.querySelector('.user-pager');
    if (!pager) {
      pager = document.createElement('div');
      pager.className = 'user-pager';
      parent.appendChild(pager);
    }
    pagerRef.el = pager;
    return pager;
  }

  function renderPager(totalItems) {
    var pager = ensurePager();
    if (!pager) return;
    var totalPages = Math.max(1, Math.ceil((totalItems || 0) / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (totalItems <= pageSize) {
      pager.innerHTML = '';
      return;
    }

    var html = '';
    html += '<button type="button" class="login-btn user-pager-btn" data-page="prev"' + (currentPage <= 1 ? ' disabled' : '') + '>Trước</button>';

    var start = Math.max(1, currentPage - 2);
    var end = Math.min(totalPages, currentPage + 2);
    if (start > 1) {
      html += '<button type="button" class="login-btn user-pager-num" data-page="1">1</button>';
      if (start > 2) html += '<span class="user-pager-ellipsis">…</span>';
    }
    for (var p = start; p <= end; p++) {
      html += '<button type="button" class="login-btn user-pager-num' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }
    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="user-pager-ellipsis">…</span>';
      html += '<button type="button" class="login-btn user-pager-num" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button type="button" class="login-btn user-pager-btn" data-page="next"' + (currentPage >= totalPages ? ' disabled' : '') + '>Sau</button>';
    pager.innerHTML = html;

    if (pager.getAttribute('data-bound') === '1') return;
    pager.setAttribute('data-bound', '1');
    pager.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-page]') : null;
      if (!btn) return;
      if (btn.disabled) return;
      var val = btn.getAttribute('data-page');
      var totalPages2 = Math.max(1, Math.ceil((currentList.length || 0) / pageSize));
      if (val === 'prev') currentPage = Math.max(1, currentPage - 1);
      else if (val === 'next') currentPage = Math.min(totalPages2, currentPage + 1);
      else currentPage = Math.max(1, Math.min(totalPages2, parseInt(val, 10) || 1));
      renderFavorites();
    });
  }

  function renderFavorites() {
    if (!favGrid) return;
    favGrid.innerHTML = '';

    favGrid.className = 'movies-grid movies-grid--cols-' + gridCols;

    var us = window.DAOP && window.DAOP.userSync;
    if (!us) return;

    var base = (window.DAOP && window.DAOP.basePath) || '';
    var slugs = Array.from(us.getFavorites ? us.getFavorites() : []);
    currentList = slugs
      .map(function (slug) {
        return window.DAOP && window.DAOP.getMovieBySlug ? window.DAOP.getMovieBySlug(slug) : null;
      })
      .filter(Boolean);

    if (!slugs.length) {
      if (favEmpty) favEmpty.style.display = '';
      var pg = ensurePager();
      if (pg) pg.innerHTML = '';
      return;
    }
    if (favEmpty) favEmpty.style.display = 'none';

    ensureToolbar();

    renderPager(currentList.length);

    var render = window.DAOP && window.DAOP.renderMovieCard;
    if (!render) return;

    var totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    var start = (currentPage - 1) * pageSize;
    var end = Math.min(currentList.length, start + pageSize);
    currentList.slice(start, end).forEach(function (m) {
      favGrid.insertAdjacentHTML('beforeend', render(m, base, { usePoster: usePoster }));
    });
  }

  function init() {
    initClient().then(function (client) {
      if (!client) {
        window.location.href = '/login.html';
        return;
      }

      client.auth.getSession().then(function (res) {
        var user = res && res.data && res.data.session && res.data.session.user;
        if (!user) {
          window.location.href = '/login.html';
          return;
        }
        if (window.DAOP && window.DAOP.updateAuthNav) window.DAOP.updateAuthNav();

        var us = window.DAOP && window.DAOP.userSync;
        if (us && typeof us.sync === 'function') {
          us.sync().then(function () {
            renderFavorites();
          });
        } else {
          renderFavorites();
        }
      }).catch(function () {
        window.location.href = '/login.html';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
