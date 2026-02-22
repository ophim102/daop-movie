/**
 * CategoryPage: trang danh mục với bộ lọc (năm, thể loại, quốc gia, loại video, ngôn ngữ)
 * baseFilter: function() => Set<id>  (tập id phim gốc, ví dụ typeMap.series)
 */
(function () {
  function CategoryPage(options) {
    this.baseFilter = options.baseFilter || function () { return new Set(); };
    this.title = options.title || 'Danh mục';
    this.itemsPerPage = options.itemsPerPage || 24;
    this.gridId = options.gridId || 'movies-grid';
    this.filterContainerId = options.filterContainerId || 'filter-bar';
    this.paginationId = options.paginationId || 'pagination';
    this.currentPage = 1;
    this.filters = { year: '', genre: [], country: [], videoType: [], lang: [] };
    this.filteredIds = [];
  }

  CategoryPage.prototype.init = function () {
    var self = this;
    var filtersData = window.filtersData || {};
    var baseSet = this.baseFilter();
    if (typeof baseSet === 'array') baseSet = new Set(baseSet);
    if (!(baseSet instanceof Set)) baseSet = new Set(Array.isArray(baseSet) ? baseSet : []);

    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = this.title;

    fetch(((window.DAOP && window.DAOP.basePath) || '') + '/data/config/site-settings.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (settings) {
        self.settings = settings;
        var extra = parseInt(settings.category_grid_columns_extra || settings.grid_columns_extra || '8', 10);
        if ([6, 8, 10, 12, 14, 16].indexOf(extra) < 0) extra = 8;
        self.gridColumnsOptions = [2, 3, 4, extra];
        var w = window.innerWidth || document.documentElement.clientWidth;
        var xs = parseInt(settings.category_grid_cols_xs || settings.default_grid_cols_xs || '2', 10);
        var sm = parseInt(settings.category_grid_cols_sm || settings.default_grid_cols_sm || '3', 10);
        var md = parseInt(settings.category_grid_cols_md || settings.default_grid_cols_md || '4', 10);
        var lg = parseInt(settings.category_grid_cols_lg || settings.default_grid_cols_lg || '6', 10);
        self.gridCols = w >= 1024 ? lg : w >= 768 ? md : w >= 480 ? sm : xs;
        if (self.gridColumnsOptions.indexOf(self.gridCols) < 0) self.gridCols = self.gridColumnsOptions[0];
        self.gridColumnsExtra = extra;
        self.usePoster = (settings.category_use_poster || settings.default_use_poster || 'thumb') === 'poster';
        window.DAOP = window.DAOP || {};
        window.DAOP.siteName = settings.site_name || 'DAOP Phim';
        document.title = self.title + ' | ' + window.DAOP.siteName;
        self.buildFilterUI(baseSet, filtersData);
        self.buildGridToolbar();
        self.applyFilters(baseSet, filtersData);
        self.applyGridClass();
        self.renderPage();
        self.attachEvents(baseSet, filtersData);
      });
  };

  CategoryPage.prototype.buildGridToolbar = function () {
    var self = this;
    var grid = document.getElementById(this.gridId);
    if (!grid) return;
    var filterWrap = document.querySelector('.filter-and-toolbar-wrap');
    var opts = self.gridColumnsOptions || [2, 3, 4, 8];
    var extra = self.gridColumnsExtra || 8;
    var bar = document.createElement('div');
    bar.className = 'grid-toolbar';
    bar.setAttribute('aria-label', 'Tùy chọn hiển thị');
    var colPart = '<span class="filter-label">Cột:</span>';
    colPart += '<button type="button" class="grid-cols-btn' + (2 === self.gridCols ? ' active' : '') + '" data-cols="2">2</button>';
    colPart += '<button type="button" class="grid-cols-btn' + (3 === self.gridCols ? ' active' : '') + '" data-cols="3">3</button>';
    colPart += '<button type="button" class="grid-cols-btn' + (4 === self.gridCols ? ' active' : '') + '" data-cols="4">4</button>';
    colPart += '<select class="grid-cols-select" id="grid-cols-extra" aria-label="Cột thêm"><option value="6"' + (extra === 6 ? ' selected' : '') + '>6</option><option value="8"' + (extra === 8 ? ' selected' : '') + '>8</option><option value="10"' + (extra === 10 ? ' selected' : '') + '>10</option><option value="12"' + (extra === 12 ? ' selected' : '') + '>12</option><option value="14"' + (extra === 14 ? ' selected' : '') + '>14</option><option value="16"' + (extra === 16 ? ' selected' : '') + '>16</option></select>';
    colPart += '<button type="button" class="grid-cols-btn' + (extra === self.gridCols ? ' active' : '') + '" data-cols="' + extra + '" id="grid-cols-extra-btn">' + extra + '</button>';
    colPart += '<label class="grid-poster-toggle"><span class="filter-label">Ảnh:</span><select class="grid-poster-select" name="use_poster"><option value="thumb"' + (!self.usePoster ? ' selected' : '') + '>Thumb</option><option value="poster"' + (self.usePoster ? ' selected' : '') + '>Poster</option></select></label>';
    bar.innerHTML = colPart;
    if (filterWrap) {
      filterWrap.appendChild(bar);
    } else {
      grid.parentNode.insertBefore(bar, grid);
    }
    bar.querySelectorAll('.grid-cols-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.gridCols = parseInt(btn.getAttribute('data-cols'), 10);
        self.applyGridClass();
        bar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === self.gridCols); });
      });
    });
    var extraSelect = bar.querySelector('#grid-cols-extra');
    var extraBtn = bar.querySelector('#grid-cols-extra-btn');
    if (extraSelect && extraBtn) {
      extraSelect.addEventListener('change', function () {
        var oldExtra = self.gridColumnsExtra;
        var n = parseInt(extraSelect.value, 10);
        self.gridColumnsExtra = n;
        extraBtn.textContent = n;
        extraBtn.setAttribute('data-cols', n);
        if (self.gridCols === oldExtra) self.gridCols = n;
        self.applyGridClass();
        bar.querySelectorAll('.grid-cols-btn').forEach(function (b) { b.classList.toggle('active', parseInt(b.getAttribute('data-cols'), 10) === self.gridCols); });
      });
    }
    bar.querySelector('.grid-poster-select').addEventListener('change', function () {
      self.usePoster = this.value === 'poster';
      self.renderPage();
    });
  };

  CategoryPage.prototype.applyGridClass = function () {
    var grid = document.getElementById(this.gridId);
    if (!grid) return;
    [2, 3, 4, 6, 8, 10, 12, 14, 16].forEach(function (n) { grid.classList.remove('movies-grid--cols-' + n); });
    grid.classList.add('movies-grid--cols-' + (this.gridCols || 4));
  };

  var ROW_IDS = ['year', 'genre', 'country', 'videoType', 'lang'];

  function sortByOrder(allKeys, orderArray) {
    if (!orderArray || !orderArray.length) return allKeys.slice().sort();
    var orderSet = {};
    orderArray.forEach(function (k, i) { orderSet[k] = i; });
    return allKeys.slice().sort(function (a, b) {
      var ia = orderSet[a];
      var ib = orderSet[b];
      if (ia !== undefined && ib !== undefined) return ia - ib;
      if (ia !== undefined) return -1;
      if (ib !== undefined) return 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  CategoryPage.prototype.buildFilterUI = function (baseSet, fd) {
    var container = document.getElementById(this.filterContainerId);
    if (!container) return;
    var parent = container.parentNode;
    if (parent && !parent.classList.contains('filter-and-toolbar-wrap')) {
      var wrap = document.createElement('div');
      wrap.className = 'filter-and-toolbar-wrap filter-and-toolbar-wrap--sticky';
      parent.insertBefore(wrap, container);
      wrap.appendChild(container);
    }
    var list = window.moviesLight || [];
    var years = [];
    list.forEach(function (m) {
      if (!baseSet.has(m.id)) return;
      if (m.year && years.indexOf(m.year) === -1) years.push(m.year);
    });
    years.sort(function (a, b) { return Number(b) - Number(a); });
    var genreNames = fd.genreNames || {};
    var genreMap = fd.genreMap || {};
    var countryNames = fd.countryNames || {};
    var countryMap = fd.countryMap || {};
    var allGenres = Object.keys(genreNames).length ? Object.keys(genreNames) : Object.keys(genreMap || {});
    var allCountries = Object.keys(countryNames).length ? Object.keys(countryNames) : Object.keys(countryMap || {});
    var fo = fd.filterOrder || {};
    var genreOrder = fo.genreOrder || [];
    var countryOrder = fo.countryOrder || [];
    var videoTypeOrder = fo.videoTypeOrder || ['tvshows', 'hoathinh', '4k', 'exclusive'];
    var langOrder = fo.langOrder || ['vietsub', 'thuyetminh', 'longtieng', 'khac'];
    var rowOrder = fo.rowOrder && fo.rowOrder.length ? fo.rowOrder : ROW_IDS;
    var genres = sortByOrder(allGenres, genreOrder);
    var countries = sortByOrder(allCountries, countryOrder);
    var genreName = function (s) { return genreNames[s] || s; };
    var countryName = function (s) { return countryNames[s] || s; };
    var videoTypeLabels = { tvshows: 'TV Shows', hoathinh: 'Hoạt hình', '4k': '4K', exclusive: 'Độc quyền' };
    var langLabels = { vietsub: 'Vietsub', thuyetminh: 'Thuyết minh', longtieng: 'Lồng tiếng', khac: 'Khác' };
    var videoTypeIds = sortByOrder(['tvshows', 'hoathinh', '4k', 'exclusive'], videoTypeOrder);
    var langIds = sortByOrder(['vietsub', 'thuyetminh', 'longtieng', 'khac'], langOrder);
    var genreChecks = genres.map(function (g) {
      return '<label><input type="checkbox" name="genre" value="' + g + '"> ' + genreName(g).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var countryChecks = countries.map(function (c) {
      return '<label><input type="checkbox" name="country" value="' + c + '"> ' + countryName(c).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var videoTypeChecks = videoTypeIds.map(function (v) {
      return '<label><input type="checkbox" name="videoType" value="' + v + '"> ' + (videoTypeLabels[v] || v).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var langChecks = langIds.map(function (l) {
      return '<label><input type="checkbox" name="lang" value="' + l + '"> ' + (langLabels[l] || l).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var yearHtml = '<div class="filter-item"><label class="filter-label">Năm phát hành:</label><select id="filter-year"><option value="">Tất cả</option>' + years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('') + '</select></div>';
    var genreHtml = '<div class="filter-row-wrap"><span class="filter-label">Thể loại:</span><div class="filter-scroll" id="filter-scroll-genre"><div class="checkboxes filter-two-rows">' + genreChecks + '</div></div></div>';
    var countryHtml = '<div class="filter-row-wrap"><span class="filter-label">Quốc gia:</span><div class="filter-scroll" id="filter-scroll-country"><div class="checkboxes filter-two-rows">' + countryChecks + '</div></div></div>';
    var videoTypeHtml = '<div class="filter-row-wrap"><span class="filter-label">Loại video:</span><div class="filter-scroll" id="filter-scroll-videoType"><div class="checkboxes filter-two-rows">' + videoTypeChecks + '</div></div></div>';
    var langHtml = '<div class="filter-row-wrap"><span class="filter-label">Kiểu ngôn ngữ:</span><div class="filter-scroll" id="filter-scroll-lang"><div class="checkboxes filter-two-rows">' + langChecks + '</div></div></div>';
    var rowHtml = { year: yearHtml, genre: genreHtml, country: countryHtml, videoType: videoTypeHtml, lang: langHtml };
    var ordered = [];
    var seen = {};
    rowOrder.forEach(function (id) {
      if (rowHtml[id] && !seen[id]) { ordered.push(rowHtml[id]); seen[id] = true; }
    });
    ROW_IDS.forEach(function (id) {
      if (!seen[id] && rowHtml[id]) ordered.push(rowHtml[id]);
    });
    container.innerHTML = ordered.join('');
    var pinBtn = document.createElement('button');
    pinBtn.type = 'button';
    pinBtn.className = 'filter-bar-pin-toggle';
    pinBtn.setAttribute('aria-label', 'Bật/Tắt ghim');
    pinBtn.innerHTML = '✕';
    pinBtn.title = 'Bỏ ghim (khi ghim) / Ghim lại (khi đã bỏ ghim)';
    pinBtn.addEventListener('click', function () {
      var wrap = container.closest('.filter-and-toolbar-wrap');
      var unpinned = wrap ? wrap.classList.toggle('filter-and-toolbar-wrap--unpinned') : container.classList.toggle('filter-bar-unpinned');
      if (!wrap) unpinned = container.classList.contains('filter-bar-unpinned');
      pinBtn.innerHTML = unpinned ? '📌' : '✕';
      pinBtn.setAttribute('aria-label', unpinned ? 'Ghim thanh lọc' : 'Bỏ ghim');
    });
    container.appendChild(pinBtn);
  };

  CategoryPage.prototype.applyFilters = function (baseSet, fd) {
    var self = this;
    var ids = Array.from(baseSet);
    var f = this.filters;
    var list = window.moviesLight || [];
    if (f.year) ids = ids.filter(function (id) {
      var m = list.find(function (x) { return x.id === id; });
      return m && String(m.year) === f.year;
    });
    if (f.genre && f.genre.length) {
      ids = ids.filter(function (id) {
        var m = list.find(function (x) { return x.id === id; });
        if (!m || !m.genre) return false;
        return f.genre.some(function (g) {
          return m.genre.some(function (x) { return (x.slug || x.id) === g; });
        });
      });
    }
    if (f.country && f.country.length) {
      ids = ids.filter(function (id) {
        var m = list.find(function (x) { return x.id === id; });
        if (!m || !m.country) return false;
        return f.country.some(function (c) {
          return m.country.some(function (x) { return (x.slug || x.id) === c; });
        });
      });
    }
    if (f.videoType && f.videoType.length) {
      ids = ids.filter(function (id) {
        var m = list.find(function (x) { return x.id === id; });
        if (!m) return false;
        return f.videoType.some(function (v) {
          if (v === 'tvshows') return (m.type || '') === 'tvshows';
          if (v === 'hoathinh') return (m.type || '') === 'hoathinh';
          if (v === '4k') return m.is_4k === true || (fd.quality4kIds || []).indexOf(id) !== -1;
          if (v === 'exclusive') return m.sub_docquyen === true || (fd.exclusiveIds || []).indexOf(id) !== -1;
          return false;
        });
      });
    }
    if (f.lang && f.lang.length) {
      ids = ids.filter(function (id) {
        var m = list.find(function (x) { return x.id === id; });
        if (!m) return false;
        var lk = (m.lang_key || '').toLowerCase();
        return f.lang.some(function (lang) {
          if (lang === 'vietsub') return lk.indexOf('vietsub') >= 0;
          if (lang === 'thuyetminh') return lk.indexOf('thuyết minh') >= 0 || lk.indexOf('thuyet minh') >= 0;
          if (lang === 'longtieng') return lk.indexOf('lồng tiếng') >= 0 || lk.indexOf('long tieng') >= 0;
          if (lang === 'khac') return !lk || (lk.indexOf('vietsub') < 0 && lk.indexOf('thuyết minh') < 0 && lk.indexOf('thuyet minh') < 0 && lk.indexOf('lồng tiếng') < 0 && lk.indexOf('long tieng') < 0);
          return false;
        });
      });
    }
    this.filteredIds = ids;
  };

  CategoryPage.prototype.renderPage = function () {
    var grid = document.getElementById(this.gridId);
    if (!grid) return;
    var perPage = this.itemsPerPage;
    var start = (this.currentPage - 1) * perPage;
    var slice = this.filteredIds.slice(start, start + perPage);
    var list = window.moviesLight || [];
    var baseUrl = (window.DAOP && window.DAOP.basePath) || '';
    var usePoster = this.usePoster === true;
    var html = slice.map(function (id) {
      var m = list.find(function (x) { return x.id === id; });
      return m && window.DAOP.renderMovieCard ? window.DAOP.renderMovieCard(m, baseUrl, { usePoster: usePoster }) : '';
    }).join('');
    grid.innerHTML = html || '<p>Không có phim nào.</p>';

    var total = Math.ceil(this.filteredIds.length / perPage) || 1;
    var pagEl = document.getElementById(this.paginationId);
    if (pagEl) {
      var cur = this.currentPage;
      var pagHtml = '';
      pagHtml += '<a href="#" class="pagination-nav" data-page="1" aria-label="Về đầu">«</a>';
      pagHtml += '<a href="#" class="pagination-nav" data-page="' + Math.max(1, cur - 1) + '" aria-label="Trước">‹</a>';
      var win = 5;
      var start = Math.max(1, Math.min(cur - 2, total - win + 1));
      var end = Math.min(total, start + win - 1);
      for (var i = start; i <= end; i++) {
        if (i === cur) pagHtml += '<span class="current">' + i + '</span>';
        else pagHtml += '<a href="#" data-page="' + i + '">' + i + '</a>';
      }
      pagHtml += '<a href="#" class="pagination-nav" data-page="' + Math.min(total, cur + 1) + '" aria-label="Sau">›</a>';
      pagHtml += '<a href="#" class="pagination-nav" data-page="' + total + '" aria-label="Về cuối">»</a>';
      pagHtml += '<span class="pagination-jump"><input type="number" min="1" max="' + total + '" value="" placeholder="Trang" id="pagination-goto" aria-label="Trang"><button type="button" id="pagination-goto-btn">Đến</button></span>';
      pagEl.innerHTML = pagHtml;
    }
  };

  CategoryPage.prototype.attachEvents = function (baseSet, fd) {
    var self = this;
    var container = document.getElementById(self.filterContainerId);
    if (container) {
      container.addEventListener('change', function (e) {
        var t = e.target;
        if (t.id === 'filter-year') self.filters.year = t.value;
        else if (t.name === 'genre') {
          var gens = container.querySelectorAll('input[name="genre"]:checked');
          self.filters.genre = Array.from(gens).map(function (x) { return x.value; });
        } else if (t.name === 'country') {
          var countries = container.querySelectorAll('input[name="country"]:checked');
          self.filters.country = Array.from(countries).map(function (x) { return x.value; });
        } else if (t.name === 'videoType') {
          var vt = container.querySelectorAll('input[name="videoType"]:checked');
          self.filters.videoType = Array.from(vt).map(function (x) { return x.value; });
        } else if (t.name === 'lang') {
          var lang = container.querySelectorAll('input[name="lang"]:checked');
          self.filters.lang = Array.from(lang).map(function (x) { return x.value; });
        }
        self.currentPage = 1;
        self.applyFilters(baseSet, fd);
        self.renderPage();
      });
    }
    var pagContainer = document.getElementById(self.paginationId);
    if (pagContainer) {
      pagContainer.addEventListener('click', function (e) {
        e.preventDefault();
        var t = e.target;
        var p = t.getAttribute('data-page');
        if (p) {
          self.currentPage = parseInt(p, 10);
          self.renderPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (t.id === 'pagination-goto-btn') {
          var inp = document.getElementById('pagination-goto');
          if (inp) {
            var num = parseInt(inp.value, 10);
            var total = Math.ceil(self.filteredIds.length / self.itemsPerPage) || 1;
            if (num >= 1 && num <= total) {
              self.currentPage = num;
              self.renderPage();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }
      });
      pagContainer.addEventListener('keydown', function (e) {
        if (e.target.id === 'pagination-goto' && e.key === 'Enter') {
          e.preventDefault();
          var inp = document.getElementById('pagination-goto');
          if (inp) {
            var num = parseInt(inp.value, 10);
            var total = Math.ceil(self.filteredIds.length / self.itemsPerPage) || 1;
            if (num >= 1 && num <= total) {
              self.currentPage = num;
              self.renderPage();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }
      });
    }
  };

  window.CategoryPage = CategoryPage;
})();
