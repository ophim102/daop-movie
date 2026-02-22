/**
 * Trang chi tiết phim: load batch, render poster, meta, episodes, similar, Twikoo
 */
(function () {
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
    var html = '<div class="movie-detail-header">' +
      '<div class="movie-detail-poster"><img src="' + posterUrl + '" alt=""></div>' +
      '<div class="movie-detail-info">' +
      '<h1>' + (light.title || '').replace(/</g, '&lt;') + '</h1>' +
      (light.origin_name ? '<p class="origin-name">' + (light.origin_name || '').replace(/</g, '&lt;') + '</p>' : '') +
      '<p class="meta-line">' + (light.year || '') + ' • ' + (light.episode_current || '') + ' tập</p>' +
      '</div></div>';
    var el = document.getElementById('movie-detail');
    if (el) el.innerHTML = html;
  }

  function renderFull(movie) {
    var poster = (movie.poster || '').replace(/^\/\//, 'https://') || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="220" height="330"%3E%3Crect fill="%2321262d" width="220" height="330"/%3E%3C/svg%3E';
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

    var html = '<div class="movie-detail-header">' +
      '<div class="movie-detail-poster"><img src="' + poster + '" alt=""></div>' +
      '<div class="movie-detail-info">' +
      '<h1>' + title + '</h1>' +
      (origin ? '<p class="origin-name">' + origin + '</p>' : '') +
      '<p class="meta-line">' + (movie.year || '') + ' • ' + (movie.episode_current || '') + ' tập' + (movie.quality ? ' • ' + movie.quality : '') + '</p>' +
      (genreStr ? '<p class="meta-line">Thể loại: ' + genreStr + '</p>' : '') +
      (countryStr ? '<p class="meta-line">Quốc gia: ' + countryStr + '</p>' : '') +
      (directorStr ? '<p class="meta-line">Đạo diễn: ' + directorStr + '</p>' : '') +
      (castStr ? '<p class="meta-line">Diễn viên: ' + castStr + '</p>' : '') +
      showtimes +
      '<div class="action-buttons">' +
      '<button type="button" class="btn-favorite" data-slug="' + (movie.slug || '').replace(/"/g, '&quot;') + '">Yêu thích</button> ' +
      '<span class="btn-continue-wrap"></span>' +
      '</div>' +
      '<div class="description">' + desc + '</div>' +
      '</div></div>';

    var episodesHtml = '';
    var playerVisible = window.DAOP?.siteSettings?.player_visible !== 'false';
    var servers = window.DAOP?.serverSources || [];
    if (playerVisible && movie.episodes && movie.episodes.length) {
      episodesHtml = '<h3>Danh sách tập</h3><div class="episodes-grid">';
      movie.episodes.forEach(function (ep) {
        var serverName = ep.server_name || ep.name || ep.slug || '';
        (ep.server_data || []).forEach(function (srv) {
          var epName = (typeof srv === 'object' && (srv.name || srv.slug)) ? (srv.name || srv.slug) : (srv && (srv.name || srv.slug)) || serverName || '';
          var epSlug = (typeof srv === 'object' && srv.slug) ? srv.slug : (typeof srv === 'object' && srv.name) ? srv.name : (srv && (srv.slug || srv.name)) || epName;
          var srvSlug = (typeof srv === 'object' && srv.slug) ? srv.slug : (servers[0] && servers[0].slug) || 'default';
          var link = (typeof srv === 'object' && (srv.link_embed || srv.link_m3u8 || srv.link)) ? (srv.link_embed || srv.link_m3u8 || srv.link) : (srv && (srv.link_embed || srv.link_m3u8 || srv.link)) || '';
          episodesHtml += '<button type="button" class="episode-btn" data-episode="' + (epSlug || '').replace(/"/g, '&quot;') + '" data-server="' + srvSlug + '" data-link="' + (link || '').replace(/"/g, '&quot;') + '">Tập ' + (epName || '').replace(/</g, '&lt;') + '</button>';
        });
        if (!(ep.server_data && ep.server_data.length)) {
          episodesHtml += '<button type="button" class="episode-btn" data-episode="' + (ep.slug || serverName || '').replace(/"/g, '&quot;') + '">' + (serverName || 'Xem').replace(/</g, '&lt;') + '</button>';
        }
      });
      episodesHtml += '</div>';
    }
    if (!playerVisible && movie.episodes && movie.episodes.length) {
      episodesHtml = '<p class="player-hidden-msg">Phát phim tạm thời không hiển thị (do cài đặt).</p>';
    }
    html += '<div class="episodes-wrap">' + episodesHtml + '</div>';

    var similar = getSimilar(movie);
    if (similar.length) {
      html += '<div class="similar-section"><h3>Phim tương tự</h3><div class="movies-grid" id="similar-grid"></div></div>';
    }
    html += '<div id="twikoo-comments"></div>';

    var el = document.getElementById('movie-detail');
    if (el) el.innerHTML = html;

    if (similar.length) {
      var grid = document.getElementById('similar-grid');
      if (grid) grid.innerHTML = similar.map(function (m) { return window.DAOP.renderMovieCard(m); }).join('');
    }
    updateFavoriteButton(movie.slug);
    updateContinueButton(movie);
    attachEpisodeButtons(movie);
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
    if (window.DAOP?.siteSettings?.player_visible === 'false') return;
    var us = window.DAOP && window.DAOP.userSync;
    var wrap = document.querySelector('.btn-continue-wrap');
    if (!wrap || !us) return;
    var hist = us.getWatchHistory().find(function (x) { return x.slug === movie.slug; });
    if (!hist) return;
    wrap.innerHTML = '<a href="#" class="btn-continue" data-episode="' + (hist.episode || '').replace(/"/g, '&quot;') + '">Tiếp tục xem (Tập ' + (hist.episode || '').replace(/</g, '&lt;') + ')</a>';
    wrap.querySelector('.btn-continue').addEventListener('click', function (e) {
      e.preventDefault();
      if (window.DAOP && window.DAOP.openPlayer) window.DAOP.openPlayer({ slug: movie.slug, episode: hist.episode, link: '', movie: movie });
    });
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
