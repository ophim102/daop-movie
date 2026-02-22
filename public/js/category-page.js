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
    var moviesLight = window.moviesLight || [];
    var baseSet = this.baseFilter();
    if (typeof baseSet === 'array') baseSet = new Set(baseSet);
    if (!(baseSet instanceof Set)) baseSet = new Set(Array.isArray(baseSet) ? baseSet : []);

    document.title = this.title + ' | ' + (window.DAOP?.siteName || 'DAOP Phim');
    var titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = this.title;

    this.buildFilterUI(baseSet, filtersData);
    this.applyFilters(baseSet, filtersData);
    this.renderPage();
    this.attachEvents(baseSet, filtersData);
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
    var rowOrder = fo.rowOrder && fo.rowOrder.length ? fo.rowOrder : ROW_IDS;
    var genres = sortByOrder(allGenres, genreOrder);
    var countries = sortByOrder(allCountries, countryOrder);
    var genreName = function (s) { return genreNames[s] || s; };
    var countryName = function (s) { return countryNames[s] || s; };
    var genreChecks = genres.map(function (g) {
      return '<label><input type="checkbox" name="genre" value="' + g + '"> ' + genreName(g).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var countryChecks = countries.map(function (c) {
      return '<label><input type="checkbox" name="country" value="' + c + '"> ' + countryName(c).replace(/</g, '&lt;') + '</label>';
    }).join('');
    var yearHtml = '<div class="filter-item"><label class="filter-label">Năm phát hành:</label><select id="filter-year"><option value="">Tất cả</option>' + years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('') + '</select></div>';
    var genreHtml = '<div class="filter-row-wrap"><span class="filter-label">Thể loại:</span><div class="filter-scroll" id="filter-scroll-genre"><div class="checkboxes filter-two-rows">' + genreChecks + '</div></div></div>';
    var countryHtml = '<div class="filter-row-wrap"><span class="filter-label">Quốc gia:</span><div class="filter-scroll" id="filter-scroll-country"><div class="checkboxes filter-two-rows">' + countryChecks + '</div></div></div>';
    var videoTypeHtml = '<div class="filter-row-wrap"><span class="filter-label">Loại video:</span><div class="filter-scroll" id="filter-scroll-videoType"><div class="checkboxes filter-two-rows"><label><input type="checkbox" name="videoType" value="tvshows"> TV Shows</label><label><input type="checkbox" name="videoType" value="hoathinh"> Hoạt hình</label><label><input type="checkbox" name="videoType" value="4k"> 4K</label><label><input type="checkbox" name="videoType" value="exclusive"> Độc quyền</label></div></div></div>';
    var langHtml = '<div class="filter-row-wrap"><span class="filter-label">Kiểu ngôn ngữ:</span><div class="filter-scroll" id="filter-scroll-lang"><div class="checkboxes filter-two-rows"><label><input type="checkbox" name="lang" value="vietsub"> Vietsub</label><label><input type="checkbox" name="lang" value="thuyetminh"> Thuyết minh</label><label><input type="checkbox" name="lang" value="longtieng"> Lồng tiếng</label><label><input type="checkbox" name="lang" value="khac"> Khác</label></div></div></div>';
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
    var html = slice.map(function (id) {
      var m = list.find(function (x) { return x.id === id; });
      return m ? window.DAOP.renderMovieCard(m) : '';
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
        }
        if (t.id === 'pagination-goto-btn') {
          var inp = document.getElementById('pagination-goto');
          if (inp) {
            var num = parseInt(inp.value, 10);
            var total = Math.ceil(self.filteredIds.length / self.itemsPerPage) || 1;
            if (num >= 1 && num <= total) {
              self.currentPage = num;
              self.renderPage();
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
            }
          }
        }
      });
    }
  };

  window.CategoryPage = CategoryPage;
})();
