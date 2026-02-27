/**
 * Trang chi tiết phim: load batch, render poster, meta, episodes, similar, Twikoo
 */
(function () {
  function esc(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSlug() {
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      var slug = decodeURIComponent(hash.slice(1));
      if (slug) {
        var clean = '/phim/' + slug + '.html';
        if (window.history && window.history.replaceState) window.history.replaceState(null, '', clean);
        return slug;
      }
    }
    var path = window.location.pathname;
    var m = path.match(/\/phim\/([^/]+)(\.html)?$/);
    if (!m) return null;
    var raw = decodeURIComponent(m[1]);
    return raw.replace(/\.html$/i, '') || null;
  }

  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      el.scrollIntoView();
    }
  }

  function setupColumnPicker(container, gridId, storageKey) {
    if (!container) return;
    var grid = document.getElementById(gridId);
    if (!grid) return;

    function setCols(cols) {
      var all = ['2', '3', '4', '6', '8'];
      all.forEach(function (n) {
        grid.classList.remove('movies-grid--cols-' + n);
      });
      if (cols) grid.classList.add('movies-grid--cols-' + cols);
      container.querySelectorAll('[data-cols]').forEach(function (btn) {
        var active = btn.getAttribute('data-cols') === String(cols);
        btn.classList.toggle('md-col-btn--active', !!active);
      });
      try { localStorage.setItem(storageKey, String(cols)); } catch (e) {}
    }

    var initial = '4';
    try {
      var saved = localStorage.getItem(storageKey);
      if (saved) initial = saved;
    } catch (e) {}
    setCols(initial);

    container.querySelectorAll('[data-cols]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cols = btn.getAttribute('data-cols') || '';
        setCols(cols);
      });
    });
  }

  function setupActions(movie) {
    var btnInfo = document.getElementById('btn-toggle-info');
    var infoEl = document.getElementById('movie-info');
    var btnComments = document.getElementById('btn-scroll-comments');
    var btnRecommend = document.getElementById('btn-scroll-recommend');
    var btnShare = document.getElementById('btn-share');

    if (btnInfo && infoEl) {
      btnInfo.addEventListener('click', function () {
        infoEl.classList.toggle('md-info--open');
        btnInfo.classList.toggle('md-action-btn--active');
      });
    }
    if (btnComments) {
      btnComments.addEventListener('click', function () { scrollToId('movie-comments'); });
    }
    if (btnRecommend) {
      btnRecommend.addEventListener('click', function () { scrollToId('movie-recommend'); });
    }
    if (btnShare) {
      btnShare.addEventListener('click', function () {
        var url = window.location.href;
        var title = (movie && movie.title) ? movie.title : document.title;
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            btnShare.textContent = 'Đã copy link';
            setTimeout(function () { btnShare.textContent = 'Chia sẻ'; }, 1500);
          }).catch(function () {});
        }
      });
    }
  }

  function init() {
    var slug = getSlug();
    if (!slug) {
      document.getElementById('movie-detail') && (document.getElementById('movie-detail').innerHTML = '<p>Không tìm thấy phim.</p>');
      return;
    }
    var light = window.DAOP.getMovieBySlug(slug);
    if (!light) {
      var base = (window.DAOP && window.DAOP.basePath) || '';
      var msg = '<div class="movie-not-found"><p><strong>Không tìm thấy phim</strong> với đường dẫn này.</p>' +
        '<p>Phim có thể chưa có trong dữ liệu (do giới hạn build hoặc chưa cập nhật).</p>' +
        '<p><a href="' + base + '/tim-kiem.html">Tìm kiếm phim</a> · <a href="' + base + '/">Trang chủ</a></p></div>';
      document.getElementById('movie-detail') && (document.getElementById('movie-detail').innerHTML = msg);
      return;
    }
    document.title = (light.title || slug) + ' | ' + (window.DAOP?.siteName || 'DAOP Phim');
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', (light.description || light.title || '').slice(0, 160));

    window.DAOP.loadMovieDetail(light.id, function (movie) {
      if (!movie) {
        renderFromLight(light);
        return;
      }
      renderFull(movie);
    });
  }

  function renderFromLight(light) {
    var posterUrl = (light.poster || '').replace(/^\/\//, 'https://') || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="220" height="330"%3E%3Crect fill="%2321262d" width="220" height="330"/%3E%3C/svg%3E';
    var base = (window.DAOP && window.DAOP.basePath) || '';
    var slug = light.slug || '';
    var watchHref = base + '/xem-phim/index.html#' + encodeURIComponent(slug);
    var backdrop = (light.thumb || light.poster || '').replace(/^\/\//, 'https://');
    var title = esc(light.title || '');
    var origin = esc(light.origin_name || '');
    var year = esc(light.year || '');
    var metaLine = year + (light.episode_current ? ' • ' + esc(light.episode_current) + ' tập' : '');
    var html = '' +
      '<div class="md-page">' +
      '  <div class="md-hero">' +
      '    <div class="md-hero-bg" style="background-image:url(' + esc(backdrop || posterUrl) + ')"></div>' +
      '    <div class="md-hero-inner">' +
      '      <div class="md-thumb"><img src="' + esc(posterUrl) + '" alt=""></div>' +
      '      <div class="md-title">' + title + '</div>' +
      (origin ? '      <div class="md-origin">' + origin + '</div>' : '') +
      (metaLine.trim() ? '      <div class="md-meta">' + esc(metaLine) + '</div>' : '') +
      '      <a class="md-watch" href="' + esc(watchHref) + '">Xem ngay</a>' +
      '      <div class="md-actions">' +
      '        <button type="button" class="md-action-btn" id="btn-share">Chia sẻ</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    var el = document.getElementById('movie-detail');
    if (el) el.innerHTML = html;
  }

  function renderFull(movie) {
    var poster = (movie.poster || '').replace(/^\/\//, 'https://') || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="220" height="330"%3E%3Crect fill="%2321262d" width="220" height="330"/%3E%3C/svg%3E';
    var backdrop = (movie.thumb || movie.poster || '').replace(/^\/\//, 'https://');
    var title = (movie.title || '').replace(/</g, '&lt;');
    var origin = (movie.origin_name || '').replace(/</g, '&lt;');
    var genreStr = (movie.genre || []).map(function (g) { return g.name; }).join(', ');
    var countryStr = (movie.country || []).map(function (c) { return c.name; }).join(', ');
    var desc = (movie.description || movie.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
    var actorNames = (movie.cast || []).slice(0, 10);
    var namesMap = (window.actorsData && window.actorsData.names) || (window.actorsIndex && window.actorsIndex.names) || {};
    var castStr = actorNames.map(function (name) {
      var slug = null;
      for (var s in namesMap) if (namesMap[s] === name) { slug = s; break; }
      var safe = (name || '').replace(/</g, '&lt;');
      var base = (window.DAOP && window.DAOP.basePath) || '';
      return slug ? '<a href="' + base + '/dien-vien/' + slug + '.html">' + safe + '</a>' : safe;
    }).join(', ');
    var directorStr = (movie.director || []).join(', ');
    var showtimes = movie.status === 'theater' && movie.showtimes ? '<p class="meta-line">Lịch chiếu: ' + (movie.showtimes || '').replace(/</g, '&lt;') + '</p>' : '';

    var base = (window.DAOP && window.DAOP.basePath) || '';
    var watchHref = base + '/xem-phim/index.html#' + encodeURIComponent(movie.slug || '');
    var watchLabel = 'Xem ngay';
    try {
      var us0 = window.DAOP && window.DAOP.userSync;
      if (us0 && typeof us0.getWatchHistory === 'function') {
        var hist0 = us0.getWatchHistory().find(function (x) { return x && x.slug === movie.slug; });
        if (hist0 && hist0.episode) {
          watchHref = base + '/xem-phim/index.html#' + encodeURIComponent(movie.slug || '') + '?ep=' + encodeURIComponent(String(hist0.episode));
          watchLabel = 'Tiếp tục xem';
        }
      }
    } catch (e) {}

    var infoHtml = '' +
      (genreStr ? '<div class="md-info-line"><span class="md-info-key">Thể loại</span><span class="md-info-val">' + esc(genreStr) + '</span></div>' : '') +
      (countryStr ? '<div class="md-info-line"><span class="md-info-key">Quốc gia</span><span class="md-info-val">' + esc(countryStr) + '</span></div>' : '') +
      (directorStr ? '<div class="md-info-line"><span class="md-info-key">Đạo diễn</span><span class="md-info-val">' + esc(directorStr) + '</span></div>' : '') +
      (castStr ? '<div class="md-info-line"><span class="md-info-key">Diễn viên</span><span class="md-info-val">' + castStr + '</span></div>' : '') +
      (movie.year ? '<div class="md-info-line"><span class="md-info-key">Năm</span><span class="md-info-val">' + esc(movie.year) + '</span></div>' : '') +
      (movie.quality ? '<div class="md-info-line"><span class="md-info-key">Chất lượng</span><span class="md-info-val">' + esc(movie.quality) + '</span></div>' : '') +
      (movie.episode_current ? '<div class="md-info-line"><span class="md-info-key">Tập</span><span class="md-info-val">' + esc(movie.episode_current) + '</span></div>' : '') +
      (showtimes ? '<div class="md-info-line"><span class="md-info-key">Lịch chiếu</span><span class="md-info-val">' + esc(movie.showtimes || '') + '</span></div>' : '');

    var html = '' +
      '<div class="md-page">' +
      '  <div class="md-hero">' +
      '    <div class="md-hero-bg" style="background-image:url(' + esc(backdrop || poster) + ')"></div>' +
      '    <div class="md-hero-inner">' +
      '      <div class="md-thumb"><img src="' + esc(poster) + '" alt=""></div>' +
      '      <div class="md-title">' + title + '</div>' +
      (origin ? '      <div class="md-origin">' + origin + '</div>' : '') +
      '      <div class="md-meta">' + esc((movie.year || '') + (movie.episode_current ? ' • ' + movie.episode_current + ' tập' : '') + (movie.quality ? ' • ' + movie.quality : '')) + '</div>' +
      '      <a class="md-watch" href="' + esc(watchHref) + '">' + esc(watchLabel) + '</a>' +
      '      <div class="md-actions">' +
      '        <button type="button" class="md-action-btn btn-favorite" data-slug="' + esc(movie.slug || '') + '">Yêu thích</button>' +
      '        <button type="button" class="md-action-btn" id="btn-share">Chia sẻ</button>' +
      '        <button type="button" class="md-action-btn" id="btn-scroll-comments">Bình luận</button>' +
      '        <button type="button" class="md-action-btn" id="btn-scroll-recommend">Đề xuất</button>' +
      '        <button type="button" class="md-action-btn" id="btn-toggle-info" aria-controls="movie-info" aria-expanded="false">Thông tin</button>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="md-content">' +
      '    <section id="movie-info" class="md-info">' +
      '      <div class="md-desc">' + desc + '</div>' +
      (infoHtml ? '      <div class="md-info-grid">' + infoHtml + '</div>' : '') +
      '    </section>' +
      '    <section id="movie-comments" class="md-section">' +
      '      <h3 class="md-section-title">Bình luận</h3>' +
      '      <div id="twikoo-comments"></div>' +
      '    </section>' +
      '    <section id="movie-recommend" class="md-section">' +
      '      <div class="md-section-head">' +
      '        <h3 class="md-section-title">Đề xuất</h3>' +
      '        <div class="md-col-picker" id="md-col-picker">' +
      '          <button type="button" class="md-col-btn" data-cols="2">2</button>' +
      '          <button type="button" class="md-col-btn" data-cols="3">3</button>' +
      '          <button type="button" class="md-col-btn" data-cols="4">4</button>' +
      '          <button type="button" class="md-col-btn" data-cols="6">6</button>' +
      '          <button type="button" class="md-col-btn" data-cols="8">8</button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="movies-grid" id="similar-grid"></div>' +
      '    </section>' +
      '  </div>' +
      '</div>';

    var el = document.getElementById('movie-detail');
    if (el) el.innerHTML = html;

    var similar = getSimilar(movie);
    var grid = document.getElementById('similar-grid');
    if (grid && similar.length) grid.innerHTML = similar.map(function (m) { return window.DAOP.renderMovieCard(m); }).join('');

    setupColumnPicker(document.getElementById('md-col-picker'), 'similar-grid', 'md_similar_cols');
    setupActions(movie);
    updateFavoriteButton(movie.slug);

    if (window.twikoo) {
      twikoo.init({
        envId: window.DAOP?.twikooEnvId || '',
        el: '#twikoo-comments',
        path: window.location.pathname,
      });
    }
  }

  function getSimilar(movie, limit) {
    limit = limit || 8;
    var list = window.moviesLight || [];
    var genres = (movie.genre || []).map(function (g) { return g.slug || g.id; });
    var same = list.filter(function (m) {
      if (m.id === movie.id) return false;
      return (m.genre || []).some(function (g) { return genres.indexOf(g.slug || g.id) !== -1; });
    });
    return same.slice(0, limit);
  }

  function updateFavoriteButton(slug) {
    var us = window.DAOP && window.DAOP.userSync;
    var btn = document.querySelector('.btn-favorite');
    if (!btn || !us) return;
    var isFav = us.getFavorites().has(slug);
    btn.textContent = isFav ? 'Bỏ yêu thích' : 'Yêu thích';
    btn.onclick = function () {
      us.toggleFavorite(slug);
      updateFavoriteButton(slug);
    };
  }
  function updateContinueButton(movie) {
    var us = window.DAOP && window.DAOP.userSync;
    var wrap = document.querySelector('.btn-continue-wrap');
    if (!wrap || !us) return;
    var hist = us.getWatchHistory().find(function (x) { return x.slug === movie.slug; });
    if (!hist) return;
    var base = (window.DAOP && window.DAOP.basePath) || '';
    var href = base + '/xem-phim/index.html#' + encodeURIComponent(movie.slug || '') + '?ep=' + encodeURIComponent(String(hist.episode || ''));
    wrap.innerHTML = '<a class="btn-continue" href="' + href.replace(/"/g, '&quot;') + '">Tiếp tục xem (Tập ' + (hist.episode || '').replace(/</g, '&lt;') + ')</a>';
  }
  function attachEpisodeButtons(movie) {
    document.querySelectorAll('.episode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ep = btn.getAttribute('data-episode');
        var link = btn.getAttribute('data-link');
        if (window.DAOP && window.DAOP.openPlayer) {
          window.DAOP.openPlayer({ slug: movie.slug, episode: ep, link: link, movie: movie });
        } else if (link) {
          window.open(link, '_blank');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
