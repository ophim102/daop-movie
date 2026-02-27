(function () {
  function getSlug() {
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      var slug = decodeURIComponent(hash.slice(1));
      if (slug) {
        var clean = '/xem-phim/' + slug + '.html';
        if (window.history && window.history.replaceState) window.history.replaceState(null, '', clean);
        return slug;
      }
    }
    var path = window.location.pathname;
    var m = path.match(/\/xem-phim\/([^/]+)(\.html)?$/);
    if (!m) return null;
    var raw = decodeURIComponent(m[1]);
    return raw.replace(/\.html$/i, '') || null;
  }

  function esc(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isDirectVideoLink(url) {
    if (!url) return false;
    var u = String(url);
    var clean = u.split('#')[0];
    var qIndex = clean.indexOf('?');
    if (qIndex >= 0) clean = clean.slice(0, qIndex);
    if (/\.(m3u8|mp4|webm|mkv|flv|mov|ogg|ogv)$/i.test(clean)) return true;
    if (/\/stream\//i.test(u) || /\/hls\//i.test(u)) return true;
    return false;
  }

  function pickInitialEpisode(movie, serverSources) {
    var params = new URLSearchParams(window.location.search || '');
    var wantEp = params.get('ep') || '';

    var us = window.DAOP && window.DAOP.userSync;
    if (!wantEp && us && typeof us.getWatchHistory === 'function' && movie && movie.slug) {
      try {
        var hist = us.getWatchHistory().find(function (x) { return x && x.slug === movie.slug; });
        if (hist && hist.episode) wantEp = String(hist.episode);
      } catch (e) {}
    }

    var servers = window.DAOP && window.DAOP.serverSources ? window.DAOP.serverSources : (serverSources || []);

    function makeSlug(text) {
      if (!text) return '';
      var s = String(text).toLowerCase();
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s || 'default';
    }

    function matchServerSlug(baseSlug, serverName) {
      var b = baseSlug || '';
      var sn = serverName || '';
      var snSlug = makeSlug(sn);

      function isPrefix(a, b2) {
        if (!a || !b2) return false;
        return String(a).indexOf(String(b2)) === 0;
      }

      var matched = Array.isArray(servers) ? servers.find(function (s) {
        if (!s) return false;
        var sSlug = s.slug || '';
        var sNameSlug = makeSlug(s.name || '');
        return (
          sSlug === b ||
          sNameSlug === b ||
          (sn && sNameSlug === snSlug) ||
          isPrefix(sSlug, b) ||
          isPrefix(b, sSlug) ||
          isPrefix(sNameSlug, b) ||
          isPrefix(b, sNameSlug) ||
          (sn && (isPrefix(sNameSlug, snSlug) || isPrefix(snSlug, sNameSlug)))
        );
      }) : null;

      return (matched && matched.slug) || b || snSlug || 'default';
    }

    var serverData = {};
    (movie.episodes || []).forEach(function (ep) {
      var serverName = ep.server_name || ep.name || ep.slug || '';
      var baseSlug = makeSlug(serverName) || ep.slug || '';
      var srvSlug = matchServerSlug(baseSlug, serverName);
      var list = Array.isArray(ep.server_data) ? ep.server_data : [];
      if (!list.length) return;
      if (!serverData[srvSlug]) serverData[srvSlug] = [];
      list.forEach(function (srv, idx) {
        var code = (srv && (srv.slug || srv.name)) ? (srv.slug || srv.name) : String(idx + 1);
        var name = (srv && (srv.name || srv.slug)) ? (srv.name || srv.slug) : ('Tập ' + code);
        serverData[srvSlug].push({
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

    var srvKeys = Object.keys(serverData);
    if (!srvKeys.length) return null;

    var preferTypes = ['m3u8', 'embed', 'backup', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5'];
    var pick = null;

    srvKeys.some(function (srvSlug) {
      var eps = serverData[srvSlug] || [];
      if (!eps.length) return false;

      var epObj = null;
      if (wantEp) {
        epObj = eps.find(function (e) { return e && (e.code === wantEp || e.name === wantEp); }) || null;
      }
      if (!epObj) epObj = eps[0];
      if (!epObj) return false;

      var linkType = null;
      for (var i = 0; i < preferTypes.length; i++) {
        if (epObj.links && epObj.links[preferTypes[i]]) {
          linkType = preferTypes[i];
          break;
        }
      }
      if (!linkType) linkType = 'm3u8';
      pick = { server: srvSlug, episode: epObj.code, linkType: linkType, link: (epObj.links && epObj.links[linkType]) || '' };
      return true;
    });

    return pick;
  }

  function renderPlayer(container, ctx) {
    if (!container) return;
    var playerSettings = window.DAOP && window.DAOP.playerSettings ? window.DAOP.playerSettings : {};
    var chosenPlayer = (playerSettings.default_player || 'plyr').toLowerCase();

    var safeLink = esc(ctx.link || '');
    var isDirect = isDirectVideoLink(ctx.link);

    var playerHtml = !ctx.link
      ? '<div class="watch-player-empty">Chưa có link phát.</div>'
      : isDirect
        ? '<video id="watch-video" class="video-js" controls playsinline preload="metadata" src="' + safeLink + '"></video>'
        : '<iframe id="watch-embed" src="' + safeLink + '" allowfullscreen allow="autoplay; fullscreen"></iframe>';

    container.innerHTML =
      '<div class="watch-player-card">' +
      '<div class="watch-player-wrap">' +
      playerHtml +
      '<div class="watch-next-overlay" data-role="next-overlay" style="display:none;">' +
      '  <button type="button" class="watch-next-btn" data-role="next-btn">Tập tiếp theo</button>' +
      '  <div class="watch-next-count" data-role="next-count"></div>' +
      '</div>' +
      '</div>' +
      '</div>';

    var video = document.getElementById('watch-video');
    if (!video || !isDirect) return;

    function loadScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    function loadStylesheet(href) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }

    function reportTime() {
      if (window.DAOP && window.DAOP.userSync && ctx.slug && ctx.episode && video.currentTime != null) {
        window.DAOP.userSync.updateWatchProgress(ctx.slug, ctx.episode, Math.floor(video.currentTime));
      }
    }

    video.addEventListener('timeupdate', reportTime);

    if (chosenPlayer === 'plyr') {
      loadStylesheet('https://cdn.plyr.io/3.7.8/plyr.css');
      loadScript('https://cdn.plyr.io/3.7.8/plyr.polyfilled.js').then(function () {
        try {
          var plyrInstance = new window.Plyr(video, { controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'] });
          plyrInstance.on('timeupdate', reportTime);
        } catch (e) {}
      }).catch(function () {});
    } else if (chosenPlayer === 'videojs') {
      loadStylesheet('https://vjs.zencdn.net/8.10.0/video-js.css');
      loadScript('https://vjs.zencdn.net/8.10.0/video.min.js').then(function () {
        try {
          window.videojs(video).ready(function () {
            this.on('timeupdate', reportTime);
          });
        } catch (e) {}
      }).catch(function () {});
    }
  }

  function initEpisodesUI(movie, root, initial) {
    if (!movie || !Array.isArray(movie.episodes) || !movie.episodes.length || !root) return;

    var servers = window.DAOP && window.DAOP.serverSources ? window.DAOP.serverSources : [];
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

    function makeSlug(text) {
      if (!text) return '';
      var s = String(text).toLowerCase();
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return s || 'default';
    }

    function matchServerSlug(baseSlug, serverName) {
      var b = baseSlug || '';
      var sn = serverName || '';
      var snSlug = makeSlug(sn);

      function isPrefix(a, b2) {
        if (!a || !b2) return false;
        return String(a).indexOf(String(b2)) === 0;
      }

      var matched = Array.isArray(servers) ? servers.find(function (s) {
        if (!s) return false;
        var sSlug = s.slug || '';
        var sNameSlug = makeSlug(s.name || '');
        return (
          sSlug === b ||
          sNameSlug === b ||
          (sn && sNameSlug === snSlug) ||
          isPrefix(sSlug, b) ||
          isPrefix(b, sSlug) ||
          isPrefix(sNameSlug, b) ||
          isPrefix(b, sNameSlug) ||
          (sn && (isPrefix(sNameSlug, snSlug) || isPrefix(snSlug, sNameSlug)))
        );
      }) : null;

      return (matched && matched.slug) || b || snSlug || 'default';
    }

    function matchServerLabel(srvSlug, serverName) {
      var matched = Array.isArray(servers) ? servers.find(function (s) { return s && s.slug === srvSlug; }) : null;
      return (matched && matched.name) || serverName || srvSlug;
    }

    var byServer = {};
    movie.episodes.forEach(function (ep) {
      var serverName = ep.server_name || ep.name || ep.slug || '';
      var baseSlug = makeSlug(serverName) || ep.slug || '';
      var srvSlug = matchServerSlug(baseSlug, serverName);
      var srvLabel = matchServerLabel(srvSlug, serverName);
      if (!byServer[srvSlug]) byServer[srvSlug] = { slug: srvSlug, label: srvLabel, episodes: [] };
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

    var serversData = Object.keys(byServer).map(function (k) { return byServer[k]; });
    if (!serversData.length) return;

    var state = {
      server: (initial && initial.server) || serversData[0].slug,
      linkType: (initial && initial.linkType) || 'm3u8',
      episode: (initial && initial.episode) || '',
      groupIdx: 0
    };

    var nextTimer = null;
    var nextRemain = 0;
    var nextTargetEpisode = '';

    function clearNextTimer() {
      if (nextTimer) {
        clearInterval(nextTimer);
        nextTimer = null;
      }
      nextRemain = 0;
      nextTargetEpisode = '';
    }

    function hideNextOverlay() {
      var host = root.querySelector('[data-role="player"]');
      if (!host) return;
      var overlay = host.querySelector('[data-role="next-overlay"]');
      if (overlay) overlay.style.display = 'none';
      clearNextTimer();
    }

    function playEpisode(code) {
      if (!code) return;
      hideNextOverlay();
      state.episode = String(code);
      renderEpisodes();
      updatePlayer();
    }

    function startNextCountdown(nextCode) {
      var host = root.querySelector('[data-role="player"]');
      if (!host) return;
      var overlay = host.querySelector('[data-role="next-overlay"]');
      var btn = host.querySelector('[data-role="next-btn"]');
      var countEl = host.querySelector('[data-role="next-count"]');
      if (!overlay || !btn || !countEl) return;

      clearNextTimer();
      nextTargetEpisode = String(nextCode);
      nextRemain = 5;

      overlay.style.display = '';
      countEl.textContent = 'Tự phát sau ' + nextRemain + 's';
      btn.onclick = function () { playEpisode(nextTargetEpisode); };

      nextTimer = setInterval(function () {
        nextRemain -= 1;
        if (nextRemain <= 0) {
          clearNextTimer();
          playEpisode(nextTargetEpisode);
          return;
        }
        countEl.textContent = 'Tự phát sau ' + nextRemain + 's';
      }, 1000);
    }

    function getServerInfo(slug) {
      return serversData.find(function (s) { return s.slug === slug; }) || serversData[0];
    }

    function getAvailableLinkTypes(info) {
      var keys = ['m3u8', 'embed', 'backup', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5'];
      var types = [];
      keys.forEach(function (k) {
        var hasAny = (info.episodes || []).some(function (e) { return !!(e.links && e.links[k]); });
        if (hasAny) types.push({ id: k, label: linkTypeLabels[k] || k });
      });
      return types.length ? types : [{ id: 'm3u8', label: linkTypeLabels.m3u8 || 'm3u8' }];
    }

    function filterEpisodesByType(info, linkType) {
      return (info.episodes || []).filter(function (e) {
        var links = e.links || {};
        return !!links[linkType];
      });
    }

    function pickLink(info) {
      var epObj = (info.episodes || []).find(function (e) { return e && e.code === state.episode; }) || null;
      if (!epObj) epObj = (info.episodes || [])[0] || null;
      if (!epObj) return '';

      var links = epObj.links || {};
      if (state.linkType && links[state.linkType]) return links[state.linkType];

      var prefer = ['m3u8', 'embed', 'backup', 'vip1', 'vip2', 'vip3', 'vip4', 'vip5'];
      for (var i = 0; i < prefer.length; i++) {
        if (links[prefer[i]]) {
          state.linkType = prefer[i];
          return links[prefer[i]];
        }
      }
      return '';
    }

    function renderTabs() {
      var tabsEl = root.querySelector('[data-role="server-tabs"]');
      if (!tabsEl) return;
      tabsEl.innerHTML = serversData.map(function (s) {
        var active = s.slug === state.server ? ' server-tab--active' : '';
        return '<button type="button" class="server-tab' + active + '" data-server="' + esc(s.slug) + '">' + esc(s.label || s.slug) + '</button>';
      }).join('');
      tabsEl.querySelectorAll('.server-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.server = btn.getAttribute('data-server') || serversData[0].slug;
          state.episode = '';
          state.groupIdx = 0;
          renderAll();
        });
      });
    }

    function renderLinkTypes() {
      var sel = root.querySelector('[data-role="link-type"]');
      if (!sel) return;
      var info = getServerInfo(state.server);
      var types = getAvailableLinkTypes(info);
      if (!types.some(function (t) { return t.id === state.linkType; })) state.linkType = types[0].id;
      sel.innerHTML = types.map(function (t) {
        var selected = t.id === state.linkType ? ' selected' : '';
        return '<option value="' + esc(t.id) + '"' + selected + '>' + esc(t.label) + '</option>';
      }).join('');
      sel.onchange = function () {
        state.linkType = sel.value || 'm3u8';
        renderGroups();
        renderEpisodes();
        updatePlayer();
      };
    }

    function renderGroups() {
      var row = root.querySelector('[data-role="group-row"]');
      var sel = root.querySelector('[data-role="group"]');
      if (!row || !sel) return;

      var info = getServerInfo(state.server);
      var list = filterEpisodesByType(info, state.linkType);
      var GROUP_SIZE = 50;
      var isSingle = (movie && (movie.type === 'single' || movie.type === 'movie')) || false;
      var needGrouping = !isSingle && list.length > GROUP_SIZE;

      if (!needGrouping) {
        row.style.display = 'none';
        state.groupIdx = 0;
        return;
      }

      row.style.display = '';
      var groups = Math.max(1, Math.ceil(list.length / GROUP_SIZE));
      if (state.groupIdx >= groups) state.groupIdx = 0;
      var options = '';
      for (var i = 0; i < groups; i++) {
        var start = i * GROUP_SIZE + 1;
        var end = Math.min((i + 1) * GROUP_SIZE, list.length);
        var label = 'Tập ' + start + ' - Tập ' + end;
        options += '<option value="' + i + '"' + (i === state.groupIdx ? ' selected' : '') + '>' + esc(label) + '</option>';
      }
      sel.innerHTML = options;
      sel.onchange = function () {
        state.groupIdx = parseInt(sel.value || '0', 10) || 0;
        renderEpisodes();
      };
    }

    function renderEpisodes() {
      var listEl = root.querySelector('[data-role="episodes"]');
      if (!listEl) return;
      var info = getServerInfo(state.server);
      var list = filterEpisodesByType(info, state.linkType);
      if (!list.length) list = info.episodes || [];

      var GROUP_SIZE = 50;
      var isSingle = (movie && (movie.type === 'single' || movie.type === 'movie')) || false;
      var needGrouping = !isSingle && list.length > GROUP_SIZE;
      var startIdx = needGrouping ? state.groupIdx * GROUP_SIZE : 0;
      var endIdx = needGrouping ? Math.min(startIdx + GROUP_SIZE, list.length) : list.length;
      var slice = list.slice(startIdx, endIdx);

      if (slice.length) {
        var stillExists = state.episode && slice.some(function (e) { return e && e.code === state.episode; });
        if (!stillExists) state.episode = slice[0].code;
      }
      listEl.innerHTML = slice.map(function (e) {
        var active = e.code === state.episode ? ' episode-btn--active' : '';
        return '<button type="button" class="episode-btn' + active + '" data-episode="' + esc(e.code) + '">' + esc(e.code) + '</button>';
      }).join('');
      listEl.querySelectorAll('.episode-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.episode = btn.getAttribute('data-episode') || '';
          renderEpisodes();
          updatePlayer();
        });
      });
    }

    function updatePlayer() {
      var info = getServerInfo(state.server);
      var link = pickLink(info);
      renderPlayer(root.querySelector('[data-role="player"]'), {
        link: link,
        slug: movie.slug,
        episode: state.episode
      });

      var host = root.querySelector('[data-role="player"]');
      if (!host) return;
      var video = host.querySelector('#watch-video');
      if (!video) return;

      hideNextOverlay();
      video.addEventListener('ended', function () {
        var currentInfo = getServerInfo(state.server);
        var list = filterEpisodesByType(currentInfo, state.linkType);
        if (!list.length) list = currentInfo.episodes || [];
        var idx = list.findIndex(function (e) { return e && e.code === state.episode; });
        if (idx < 0) return;
        var next = list[idx + 1];
        if (!next || !next.code) return;
        startNextCountdown(next.code);
      }, { once: true });
    }

    function renderAll() {
      renderTabs();
      renderLinkTypes();
      renderGroups();
      renderEpisodes();
      updatePlayer();
    }

    renderAll();
  }

  function init() {
    var slug = getSlug();
    var rootEl = document.getElementById('watch-page');
    if (!rootEl) return;

    if (!slug) {
      rootEl.innerHTML = '<p>Không tìm thấy phim.</p>';
      return;
    }

    var light = window.DAOP && window.DAOP.getMovieBySlug ? window.DAOP.getMovieBySlug(slug) : null;
    if (!light) {
      rootEl.innerHTML = '<p>Không tìm thấy phim.</p>';
      return;
    }

    document.title = (light.title || slug) + ' | ' + (window.DAOP && window.DAOP.siteName ? window.DAOP.siteName : 'GoTV');
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', (light.description || light.title || '').slice(0, 160));

    window.DAOP.loadMovieDetail(light.id, function (movie) {
      movie = movie || light;

      var poster = (movie.poster || movie.thumb || '').replace(/^\/\//, 'https://');
      var title = (movie.title || '').replace(/</g, '&lt;');
      var origin = (movie.origin_name || '').replace(/</g, '&lt;');
      var year = esc(movie.year || '');
      var quality = esc(movie.quality || '');
      var epCur = esc(movie.episode_current || '');

      var metaParts = [];
      if (year) metaParts.push(year);
      if (quality) metaParts.push(quality);
      if (epCur) metaParts.push(epCur);

      rootEl.innerHTML =
        '<div class="watch-layout">' +
        '  <div class="watch-main">' +
        '    <div data-role="player"></div>' +
        '    <div class="watch-player-meta" style="margin-top:0.75rem;">' +
        '      <div class="watch-player-meta-title" style="font-weight:800;">' + title + '</div>' +
        (origin ? '      <div class="watch-player-meta-origin" style="color:var(--muted);margin-top:0.25rem;">' + origin + '</div>' : '') +
        (metaParts.length ? '      <div class="watch-player-meta-sub" style="color:var(--muted);margin-top:0.25rem;">' + esc(metaParts.join(' • ')) + '</div>' : '') +
        '      <div class="watch-back-row" style="margin-top:0.65rem;">' +
        '        <a class="watch-back-btn" href="/phim/' + esc(movie.slug || slug) + '.html" aria-label="Về trang chi tiết">' +
        '          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '        </a>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <aside class="watch-sidebar">' +
        '    <div class="watch-episodes-card">' +
        '      <div class="server-tabs" data-role="server-tabs"></div>' +
        '      <div class="watch-episodes-controls watch-episodes-controls--single">' +
        '        <label class="watch-episodes-linktype"><span class="episodes-ui-label">Máy chủ</span><select class="episodes-ui-select" data-role="link-type"></select></label>' +
        '        <div class="episodes-ui-row watch-episodes-group" data-role="group-row" style="display:none;">' +
        '          <select id="watch-episodes-group" class="episodes-ui-select" data-role="group" aria-label="Nhóm tập"></select>' +
        '        </div>' +
        '      </div>' +
        '      <div class="episodes-grid" data-role="episodes"></div>' +
        '    </div>' +
        '  </aside>' +
        '</div>';

      var initial = pickInitialEpisode(movie, window.DAOP && window.DAOP.serverSources);
      initEpisodesUI(movie, rootEl, initial);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
