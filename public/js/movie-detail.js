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
    var serverOrder = {};
    if (Array.isArray(servers)) {
      servers.forEach(function (s, idx) {
        if (s && s.slug) serverOrder[s.slug] = idx;
      });
    }
    function makeSlug(text) {
      if (!text) return '';
      var s = String(text).toLowerCase();
      if (s.normalize) {
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s || 'default';
    }
    if (playerVisible && movie.episodes && movie.episodes.length) {
      // UI theo flow: chọn server → chọn máy chủ (loại link) → chọn nhóm tập (<=50, trừ phim lẻ) → chọn tập
      episodesHtml =
        '<h3>Danh sách tập</h3>' +
        '<div class="episodes-ui" id="episodes-ui">' +
        '  <div class="episodes-ui-row">' +
        '    <div class="server-tabs" id="episodes-server-tabs" role="tablist" aria-label="Chọn server"></div>' +
        '  </div>' +
        '  <div class="episodes-ui-row">' +
        '    <label class="episodes-ui-label" for="episodes-link-type">Máy chủ</label>' +
        '    <select id="episodes-link-type" class="episodes-ui-select"></select>' +
        '  </div>' +
        '  <div class="episodes-ui-row" id="episodes-group-row">' +
        '    <label class="episodes-ui-label" for="episodes-group">Nhóm tập</label>' +
        '    <select id="episodes-group" class="episodes-ui-select"></select>' +
        '  </div>' +
        '  <div class="episodes-grid" id="episodes-list" aria-label="Danh sách tập"></div>' +
        '</div>';
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
    var refreshEpisodesUI = function () {
      var serversNow = window.DAOP?.serverSources || [];
      var orderNow = {};
      if (Array.isArray(serversNow)) {
        serversNow.forEach(function (s, idx) {
          if (s && s.slug) orderNow[s.slug] = idx;
        });
      }
      initEpisodesUI(movie, serversNow, orderNow);
    };
    refreshEpisodesUI();
    // Nếu config (player-settings) load sau khi render, refresh UI để cập nhật tên "Máy chủ"
    var refreshed = false;
    window.addEventListener('daop:playerSettingsLoaded', function () {
      if (refreshed) return;
      refreshed = true;
      refreshEpisodesUI();
    });
    if (window.twikoo) {
      twikoo.init({
        envId: window.DAOP?.twikooEnvId || '',
        el: '#twikoo-comments',
        path: window.location.pathname,
      });
    }
  }

  function initEpisodesUI(movie, servers, serverOrder) {
    if (!movie || !movie.episodes || !movie.episodes.length) return;
    var root = document.getElementById('episodes-ui');
    if (!root) return;

    function makeSlug(text) {
      if (!text) return '';
      var s = String(text).toLowerCase();
      if (s.normalize) {
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s || 'default';
    }

    function renderSimpleFallback() {
      var wrap = document.querySelector('.episodes-wrap');
      if (!wrap) return;
      var html = '<h3>Danh sách tập</h3><div class="episodes-grid">';
      (movie.episodes || []).forEach(function (ep) {
        var serverName = ep.server_name || ep.name || ep.slug || '';
        var baseSlug = ep.slug || makeSlug(serverName);
        var matched = Array.isArray(servers)
          ? servers.find(function (s) { return s && (s.slug === baseSlug || makeSlug(s.name) === baseSlug); })
          : null;
        var srvSlug = (matched && matched.slug) || baseSlug || 'default';
        var srvLabel = (matched && matched.name) || serverName || srvSlug;
        var list = Array.isArray(ep.server_data) ? ep.server_data : [];
        if (!list.length) return;
        list.forEach(function (srv, idxEp) {
          var epName = (srv && (srv.name || srv.slug)) ? (srv.name || srv.slug) : ('Tập ' + (idxEp + 1));
          var epSlug = (srv && srv.slug) ? srv.slug : (srv && srv.name) ? srv.name : epName;
          var link =
            (srv && (srv.link_embed || srv.link_m3u8 || srv.link_backup || srv.link)) ||
            '';
          html +=
            '<button type="button" class="episode-btn" data-episode="' +
            String(epSlug || '').replace(/"/g, '&quot;') +
            '" data-server="' +
            String(srvSlug || '').replace(/"/g, '&quot;') +
            '" data-link="' +
            String(link || '').replace(/"/g, '&quot;') +
            '">Tập ' +
            String(epName || '').replace(/</g, '&lt;') +
            '</button>';
        });
      });
      html += '</div>';
      wrap.innerHTML = html;
      attachEpisodeButtons(movie);
    }

    var serverSources = Array.isArray(servers) ? servers : [];
    var playerSettings = window.DAOP && window.DAOP.playerSettings ? window.DAOP.playerSettings : {};
    var linkTypeLabels = playerSettings.link_type_labels || {
      m3u8: 'M3U8',
      embed: 'Embed',
      backup: 'Backup',
      vip1: 'VIP 1',
      vip2: 'VIP 2',
      vip3: 'VIP 3',
      vip4: 'VIP 4',
      vip5: 'VIP 5',
    };
    function matchServerSlug(baseSlug, serverName) {
      var matched = serverSources.find(function (s) {
        return s && (s.slug === baseSlug || makeSlug(s.name) === baseSlug || (serverName && makeSlug(s.name) === makeSlug(serverName)));
      });
      return (matched && matched.slug) || baseSlug || 'default';
    }
    function matchServerLabel(srvSlug, serverName) {
      var matched = serverSources.find(function (s) { return s && s.slug === srvSlug; });
      return (matched && matched.name) || serverName || srvSlug;
    }

    // serversData: [{ slug, label, order, episodes: [{ code, name, links: { m3u8, embed, backup, vip1..vip5 } }] }]
    var byServer = {};
    movie.episodes.forEach(function (ep) {
      var serverName = ep.server_name || ep.name || ep.slug || '';
      var baseSlug = ep.slug || makeSlug(serverName);
      var srvSlug = matchServerSlug(baseSlug, serverName);
      var srvLabel = matchServerLabel(srvSlug, serverName);
      if (!byServer[srvSlug]) {
        byServer[srvSlug] = {
          slug: srvSlug,
          label: srvLabel,
          order: typeof serverOrder[srvSlug] === 'number' ? serverOrder[srvSlug] : 9999,
          episodes: []
        };
      }
      var list = Array.isArray(ep.server_data) ? ep.server_data : [];
      if (!list.length) return;
      list.forEach(function (srv, idxEp) {
        var code = (srv && (srv.slug || srv.name)) ? (srv.slug || srv.name) : String(idxEp + 1);
        var name = (srv && (srv.name || srv.slug)) ? (srv.name || srv.slug) : ('Tập ' + code);
        byServer[srvSlug].episodes.push({
          code: String(code),
          name: String(name),
          links: {
            m3u8: (srv && srv.link_m3u8) || '',
            embed: (srv && srv.link_embed) || '',
            backup: (srv && (srv.link_backup || srv.link)) || '',
            vip1: (srv && srv.link_vip1) || '',
            vip2: (srv && srv.link_vip2) || '',
            vip3: (srv && srv.link_vip3) || '',
            vip4: (srv && srv.link_vip4) || '',
            vip5: (srv && srv.link_vip5) || '',
          }
        });
      });
    });

    var serversData = Object.keys(byServer).map(function (k) { return byServer[k]; }).sort(function (a, b) { return a.order - b.order; });
    if (!serversData.length) {
      renderSimpleFallback();
      return;
    }

    var tabsEl = document.getElementById('episodes-server-tabs');
    var linkTypeEl = document.getElementById('episodes-link-type');
    var groupRowEl = document.getElementById('episodes-group-row');
    var groupEl = document.getElementById('episodes-group');
    var listEl = document.getElementById('episodes-list');
    if (!tabsEl || !linkTypeEl || !groupEl || !listEl) return;

    var state = {
      server: serversData[0].slug,
      linkType: 'm3u8',
      groupIdx: 0
    };

    function getServerInfo(slug) {
      return serversData.find(function (s) { return s.slug === slug; }) || serversData[0];
    }

    function getAvailableLinkTypes(info) {
      var keys = ['m3u8', 'embed', 'backup', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5'];
      var types = [];
      keys.forEach(function (k) {
        var hasAny = info.episodes.some(function (e) { return !!(e.links && e.links[k]); });
        if (hasAny) {
          types.push({ id: k, label: linkTypeLabels[k] || k });
        }
      });
      return types.length ? types : [{ id: 'm3u8', label: linkTypeLabels.m3u8 || 'm3u8' }];
    }

    function filterEpisodesByType(info, linkType) {
      return (info.episodes || []).filter(function (e) {
        var links = e.links || {};
        return !!links[linkType];
      });
    }

    function renderTabs() {
      tabsEl.innerHTML = serversData.map(function (s) {
        var active = s.slug === state.server ? ' server-tab--active' : '';
        return '<button type="button" class="server-tab' + active + '" data-server="' + String(s.slug).replace(/"/g, '&quot;') + '" role="tab">' +
          String(s.label || s.slug).replace(/</g, '&lt;') + '</button>';
      }).join('');
      tabsEl.querySelectorAll('.server-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.server = btn.getAttribute('data-server') || serversData[0].slug;
          state.groupIdx = 0;
          renderAll();
        });
      });
    }

    function renderLinkTypes() {
      var info = getServerInfo(state.server);
      var types = getAvailableLinkTypes(info);
      if (!types.some(function (t) { return t.id === state.linkType; })) {
        state.linkType = types[0].id;
      }
      linkTypeEl.innerHTML = types.map(function (t) {
        var selected = t.id === state.linkType ? ' selected' : '';
        return '<option value="' + t.id + '"' + selected + '>' + t.label + '</option>';
      }).join('');
      linkTypeEl.onchange = function () {
        state.linkType = linkTypeEl.value || 'm3u8';
        state.groupIdx = 0;
        renderGroups();
        renderEpisodes();
      };
    }

    function renderGroups() {
      var info = getServerInfo(state.server);
      var list = filterEpisodesByType(info, state.linkType);
      var GROUP_SIZE = 50;
      var isSingle = (movie && (movie.type === 'single' || movie.type === 'movie')) || false;
      var needGrouping = !isSingle && list.length > GROUP_SIZE;

      if (!needGrouping) {
        if (groupRowEl) groupRowEl.style.display = 'none';
        state.groupIdx = 0;
        return;
      }
      if (groupRowEl) groupRowEl.style.display = '';

      var groups = Math.max(1, Math.ceil(list.length / GROUP_SIZE));
      groupEl.innerHTML = '';
      for (var i = 0; i < groups; i++) {
        var start = i * GROUP_SIZE + 1;
        var end = Math.min((i + 1) * GROUP_SIZE, list.length);
        var label = 'Tập ' + start + ' - Tập ' + end;
        groupEl.innerHTML += '<option value="' + i + '">' + label.replace(/</g, '&lt;') + '</option>';
      }
      if (state.groupIdx >= groups) state.groupIdx = 0;
      groupEl.value = String(state.groupIdx);
      groupEl.onchange = function () {
        state.groupIdx = parseInt(groupEl.value || '0', 10) || 0;
        renderEpisodes();
      };
    }

    function renderEpisodes() {
      var info = getServerInfo(state.server);
      var filtered = filterEpisodesByType(info, state.linkType);
      var GROUP_SIZE = 50;
      var isSingle = (movie && (movie.type === 'single' || movie.type === 'movie')) || false;
      var needGrouping = !isSingle && filtered.length > GROUP_SIZE;
      if (!filtered.length) {
        // Nếu không lọc được tập nào cho kiểu link hiện tại, fallback về UI đơn giản để tránh mất danh sách tập.
        renderSimpleFallback();
        return;
      }
      var startIdx = needGrouping ? state.groupIdx * GROUP_SIZE : 0;
      var endIdx = needGrouping ? Math.min(startIdx + GROUP_SIZE, filtered.length) : filtered.length;
      var slice = filtered.slice(startIdx, endIdx);
      listEl.innerHTML = slice.map(function (e) {
        var code = (e && e.code) ? e.code : '';
        var link = '';
        if (e && e.links) {
          if (state.linkType && e.links[state.linkType]) {
            link = e.links[state.linkType];
          } else {
            // fallback: chọn link tốt nhất có thể nếu vì lý do nào đó type không khớp
            link =
              e.links.m3u8 ||
              e.links.embed ||
              e.links.backup ||
              e.links.vip1 ||
              e.links.vip2 ||
              e.links.vip3 ||
              e.links.vip4 ||
              e.links.vip5 ||
              '';
          }
        }
        return '<button type="button" class="episode-btn" data-episode="' + String(code).replace(/"/g, '&quot;') + '" data-server="' + String(info.slug).replace(/"/g, '&quot;') + '" data-link="' + String(link).replace(/"/g, '&quot;') + '">' +
          String(code).replace(/</g, '&lt;') + '</button>';
      }).join('');
      attachEpisodeButtons(movie);
    }

    function renderAll() {
      renderTabs();
      renderLinkTypes();
      renderGroups();
      renderEpisodes();
    }

    // init: chọn loại link/máy chủ ưu tiên m3u8 → embed → backup → vip1..vip5
    var initial = getServerInfo(state.server);
    var initialTypes = getAvailableLinkTypes(initial);
    var prefer = ['m3u8', 'embed', 'backup', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5'];
    for (var p = 0; p < prefer.length; p++) {
      if (initialTypes.some(function (t) { return t.id === prefer[p]; })) {
        state.linkType = prefer[p];
        break;
      }
    }

    renderAll();
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
