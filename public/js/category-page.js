/**
 * CategoryPage: trang danh mục với bộ lọc (năm, thể loại, quốc gia, 4K, độc quyền)
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
    this.filters = { year: '', genre: [], country: [], is4k: false, exclusive: false };
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

  CategoryPage.prototype.buildFilterUI = function (baseSet, fd) {
    var container = document.getElementById(this.filterContainerId);
    if (!container) return;
    var years = [],
      genres = [],
      countries = [];
    var list = window.moviesLight || [];
    list.forEach(function (m) {
      if (!baseSet.has(m.id)) return;
      if (m.year && years.indexOf(m.year) === -1) years.push(m.year);
      (m.genre || []).forEach(function (g) {
        var s = g.slug || g.id;
        if (s && genres.indexOf(s) === -1) genres.push(s);
      });
      (m.country || []).forEach(function (c) {
        var s = c.slug || c.id;
        if (s && countries.indexOf(s) === -1) countries.push(s);
      });
    });
    years.sort(function (a, b) { return Number(b) - Number(a); });
    var yearOpts = years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
    var genreChecks = genres.slice(0, 12).map(function (g) {
      var name = (fd.genreMap && fd.genreMap[g]) ? g : g;
      return '<label><input type="checkbox" name="genre" value="' + g + '"> ' + name + '</label>';
    }).join('');
    var countryChecks = countries.slice(0, 10).map(function (c) {
      return '<label><input type="checkbox" name="country" value="' + c + '"> ' + c + '</label>';
    }).join('');
    container.innerHTML =
      '<label>Năm:</label><select id="filter-year"><option value="">Tất cả</option>' + yearOpts + '</select>' +
      '<div class="checkboxes"><span>Thể loại:</span>' + genreChecks + '</div>' +
      '<div class="checkboxes"><span>Quốc gia:</span>' + countryChecks + '</div>' +
      '<label><input type="checkbox" id="filter-4k"> 4K</label>' +
      '<label><input type="checkbox" id="filter-exclusive"> Độc quyền</label>';
  };

  CategoryPage.prototype.applyFilters = function (baseSet, fd) {
    var self = this;
    var ids = Array.from(baseSet);
    var f = this.filters;
    if (f.year) ids = ids.filter(function (id) {
      var m = (window.moviesLight || []).find(function (x) { return x.id === id; });
      return m && String(m.year) === f.year;
    });
    if (f.genre && f.genre.length) {
      ids = ids.filter(function (id) {
        var m = (window.moviesLight || []).find(function (x) { return x.id === id; });
        if (!m || !m.genre) return false;
        return f.genre.some(function (g) {
          return m.genre.some(function (x) { return (x.slug || x.id) === g; });
        });
      });
    }
    if (f.country && f.country.length) {
      ids = ids.filter(function (id) {
        var m = (window.moviesLight || []).find(function (x) { return x.id === id; });
        if (!m || !m.country) return false;
        return f.country.some(function (c) {
          return m.country.some(function (x) { return (x.slug || x.id) === c; });
        });
      });
    }
    if (f.is4k) ids = ids.filter(function (id) { return (fd.quality4kIds || []).indexOf(id) !== -1; });
    if (f.exclusive) ids = ids.filter(function (id) { return (fd.exclusiveIds || []).indexOf(id) !== -1; });
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

    var total = Math.ceil(this.filteredIds.length / perPage);
    var pagEl = document.getElementById(this.paginationId);
    if (pagEl) {
      var pagHtml = '';
      for (var i = 1; i <= total; i++) {
        if (i === this.currentPage) pagHtml += '<span class="current">' + i + '</span>';
        else pagHtml += '<a href="#" data-page="' + i + '">' + i + '</a>';
      }
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
        else if (t.id === 'filter-4k') self.filters.is4k = t.checked;
        else if (t.id === 'filter-exclusive') self.filters.exclusive = t.checked;
        else if (t.name === 'genre') {
          var gens = container.querySelectorAll('input[name="genre"]:checked');
          self.filters.genre = Array.from(gens).map(function (x) { return x.value; });
        } else if (t.name === 'country') {
          var countries = container.querySelectorAll('input[name="country"]:checked');
          self.filters.country = Array.from(countries).map(function (x) { return x.value; });
        }
        self.currentPage = 1;
        self.applyFilters(baseSet, fd);
        self.renderPage();
      });
    }
    document.getElementById(self.paginationId)?.addEventListener('click', function (e) {
      e.preventDefault();
      var p = e.target.getAttribute('data-page');
      if (p) {
        self.currentPage = parseInt(p, 10);
        self.renderPage();
      }
    });
  };

  window.CategoryPage = CategoryPage;
})();
