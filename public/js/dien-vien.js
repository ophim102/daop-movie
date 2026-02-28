/**
 * Trang diễn viên: load shard theo ký tự đầu (actors-index.js hoặc actors-{a..z|other}.js), rồi hiển thị.
 */
(function () {
  var PAGE_SIZE_ACTORS = 120;
  var PAGE_SIZE_MOVIES = 24;

  function getSlug() {
    var path = window.location.pathname;
    var m = path.match(/\/dien-vien\/([^/]+)(\.html)?$/);
    if (!m) m = path.match(/.+\/dien-vien\/([^/]+)(\.html)?$/);
    var slug = m ? decodeURIComponent(m[1]) : null;
    if (slug === 'index' || !slug) return null;
    return slug;
  }

  function esc(s) {
    return (s == null) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getQuery() {
    try {
      var p = new URLSearchParams(window.location.search || '');
      return {
        q: (p.get('q') || '').trim(),
        page: Math.max(1, parseInt(p.get('page') || '1', 10) || 1),
      };
    } catch (e) {
      return { q: '', page: 1 };
    }
  }

  function setQuery(next) {
    try {
      var p = new URLSearchParams(window.location.search || '');
      if (next.q != null) {
        var q = String(next.q || '').trim();
        if (q) p.set('q', q);
        else p.delete('q');
      }
      if (next.page != null) {
        var pg = Math.max(1, parseInt(String(next.page), 10) || 1);
        if (pg > 1) p.set('page', String(pg));
        else p.delete('page');
      }
      var base = window.location.pathname + (p.toString() ? ('?' + p.toString()) : '');
      window.history.replaceState({}, '', base);
    } catch (e) {}
  }

  function paginate(arr, page, pageSize) {
    var total = arr.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var p = Math.min(Math.max(1, page), totalPages);
    var start = (p - 1) * pageSize;
    var end = Math.min(start + pageSize, total);
    return { page: p, total: total, totalPages: totalPages, slice: arr.slice(start, end) };
  }

  function renderPagination(container, page, totalPages, onGo) {
    if (!container) return;
    if (totalPages <= 1) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    container.style.display = '';

    var html = '';
    function a(label, targetPage, cls) {
      var c = cls ? (' ' + cls) : '';
      return '<a href="#" data-page="' + targetPage + '" class="pagination-nav' + c + '">' + label + '</a>';
    }
    html += a('«', 1);
    html += a('‹', Math.max(1, page - 1));

    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    if (start > 1) html += '<span>…</span>';
    for (var i = start; i <= end; i++) {
      if (i === page) html += '<span class="current">' + i + '</span>';
      else html += '<a href="#" data-page="' + i + '">' + i + '</a>';
    }
    if (end < totalPages) html += '<span>…</span>';

    html += a('›', Math.min(totalPages, page + 1));
    html += a('»', totalPages);

    html +=
      '<span class="pagination-jump">' +
      '<span>Trang</span>' +
      '<input type="number" min="1" max="' + totalPages + '" value="' + page + '" aria-label="Nhảy trang">' +
      '<button type="button">Đi</button>' +
      '</span>';

    container.innerHTML = html;

    container.querySelectorAll('a[data-page]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var p = parseInt(el.getAttribute('data-page') || '1', 10) || 1;
        onGo(p);
      });
    });
    var jumpInput = container.querySelector('.pagination-jump input');
    var jumpBtn = container.querySelector('.pagination-jump button');
    if (jumpBtn && jumpInput) {
      jumpBtn.addEventListener('click', function () {
        var v = parseInt(jumpInput.value || '1', 10) || 1;
        onGo(v);
      });
      jumpInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var v2 = parseInt(jumpInput.value || '1', 10) || 1;
          onGo(v2);
        }
      });
    }
  }

  function getShardUrl(slug) {
    var base = (window.DAOP && window.DAOP.basePath) || '';
    if (!slug) return base + '/data/actors-index.js';
    var c = (slug[0] || '').toLowerCase();
    var key = (c >= 'a' && c <= 'z') ? c : 'other';
    return base + '/data/actors-' + key + '.js';
  }

  function init(retryCount) {
    retryCount = retryCount || 0;
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
      var q0 = getQuery();
      var actorSlugs = Object.keys(names || {});
      actorSlugs.sort(function (a, b) { return String(names[a] || a).localeCompare(String(names[b] || b)); });

      var q = (q0.q || '').toLowerCase();
      if (q) {
        actorSlugs = actorSlugs.filter(function (s) {
          var n = String(names[s] || s).toLowerCase();
          return n.indexOf(q) >= 0 || String(s).toLowerCase().indexOf(q) >= 0;
        });
      }

      var paged = paginate(actorSlugs, q0.page, PAGE_SIZE_ACTORS);
      setQuery({ page: paged.page });

      var listHtml = actorSlugs.length
        ? '<div class="actors-grid">' + paged.slice.map(function (s) {
            var n2 = names[s] || s;
            var cnt = (map && map[s] && map[s].length) ? map[s].length : null;
            return '<a class="actor-chip" href="' + encodeURIComponent(s) + '.html">' +
              '<span class="actor-chip-name">' + esc(n2) + '</span>' +
              (cnt != null ? '<span class="actor-chip-count">' + cnt + ' phim</span>' : '') +
              '</a>';
          }).join('') + '</div>'
        : '<p>Chưa có dữ liệu diễn viên.</p>';
      document.title = 'Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
      var titleEl = document.getElementById('actor-name');
      if (titleEl) titleEl.textContent = 'Diễn viên';
      var grid = document.getElementById('movies-grid');
      if (grid) grid.innerHTML = listHtml;

      var search = document.getElementById('actor-search');
      if (search) {
        search.value = q0.q || '';
        search.oninput = function () {
          setQuery({ q: search.value, page: 1 });
          init(0);
        };
      }
      var pagTop = document.getElementById('actor-pagination');
      var pagBot = document.getElementById('actor-pagination-bottom');
      renderPagination(pagTop, paged.page, paged.totalPages, function (p) {
        setQuery({ page: p });
        init(0);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      });
      renderPagination(pagBot, paged.page, paged.totalPages, function (p) {
        setQuery({ page: p });
        init(0);
      });
      return;
    }
    var ids = (map[slug] || []).map(function (x) { return String(x); });
    var list = (data && data.movies && data.movies[slug]) ? data.movies[slug] : [];
    if (list.length === 0 && ids.length > 0) {
      var moviesLight = window.moviesLight;
      if (moviesLight && moviesLight.length > 0) {
        var idsSet = {};
        for (var i = 0; i < ids.length; i++) idsSet[ids[i]] = true;
        list = moviesLight.filter(function (m) { return idsSet[String(m.id)]; });
      } else if (retryCount < 2) {
        var base = (window.DAOP && window.DAOP.basePath) || '';
        var s = document.createElement('script');
        s.src = base + '/data/movies-light.js';
        s.onload = function () { init(retryCount + 1); };
        s.onerror = function () { renderActorMovies(slug, names, ids, []); };
        document.head.appendChild(s);
        return;
      }
    }
    renderActorMovies(slug, names, ids, list);
  }

  function renderActorMovies(slug, names, ids, list) {
    var name = names[slug] || slug;
    document.title = name + ' | Diễn viên | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'DAOP Phim');
    var titleEl = document.getElementById('actor-name');
    if (titleEl) titleEl.textContent = name;
    var grid = document.getElementById('movies-grid');
    var q0 = getQuery();
    var q = (q0.q || '').toLowerCase();
    var filtered = list || [];
    if (q) {
      filtered = filtered.filter(function (m) {
        var t = String((m && m.title) || '').toLowerCase();
        var o = String((m && m.origin_name) || '').toLowerCase();
        var s = String((m && m.slug) || '').toLowerCase();
        return t.indexOf(q) >= 0 || o.indexOf(q) >= 0 || s.indexOf(q) >= 0;
      });
    }
    var paged = paginate(filtered, q0.page, PAGE_SIZE_MOVIES);
    setQuery({ page: paged.page });

    if (grid) {
      grid.innerHTML = paged.slice.length
        ? paged.slice.map(function (m) {
            return window.DAOP && window.DAOP.renderMovieCard ? window.DAOP.renderMovieCard(m) : '';
          }).join('')
        : '<p>Chưa có phim nào.</p>';
    }

    var search = document.getElementById('actor-search');
    if (search) {
      search.value = q0.q || '';
      search.oninput = function () {
        setQuery({ q: search.value, page: 1 });
        init(0);
      };
    }
    var pagTop = document.getElementById('actor-pagination');
    var pagBot = document.getElementById('actor-pagination-bottom');
    renderPagination(pagTop, paged.page, paged.totalPages, function (p) {
      setQuery({ page: p });
      init(0);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    });
    renderPagination(pagBot, paged.page, paged.totalPages, function (p) {
      setQuery({ page: p });
      init(0);
    });
  }

  function run() {
    var slug = getSlug();
    var base = (window.DAOP && window.DAOP.basePath) || '';
    var url = getShardUrl(slug);
    var script = document.createElement('script');
    script.src = url;
    script.onload = init;
    script.onerror = function () {
      var fallback = base + '/data/actors.js';
      if (fallback === url) {
        var grid = document.getElementById('movies-grid');
        if (grid) grid.innerHTML = '<p>Không tải được dữ liệu diễn viên.</p>';
        return;
      }
      var s2 = document.createElement('script');
      s2.src = fallback;
      s2.onload = function () {
        if (!slug && window.actorsData && window.actorsData.names) {
          window.actorsIndex = { names: window.actorsData.names };
        }
        init();
      };
      s2.onerror = function () {
        var grid = document.getElementById('movies-grid');
        if (grid) grid.innerHTML = '<p>Không tải được dữ liệu diễn viên.</p>';
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
