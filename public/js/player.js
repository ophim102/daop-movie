/**
 * Player: mở overlay, pre-roll (nếu có), chọn nguồn, cảnh báo (warning), lưu tiến trình
 */
(function () {
  window.DAOP = window.DAOP || {};
  var overlay = null;
  var defaultWarning = 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.';

  function showMainContent(opts) {
    var link = opts.link;
    var movie = opts.movie || {};
    var showWarning = movie.warning_enabled !== false && (window.DAOP?.siteSettings?.player_warning_enabled !== false);
    var warningText = movie.warning_text || window.DAOP?.siteSettings?.player_warning_text || defaultWarning;
    var playerSettings = window.DAOP?.playerSettings || {};
    var available = playerSettings.available_players && typeof playerSettings.available_players === 'object' ? playerSettings.available_players : {};
    var defaultPlayer = playerSettings.default_player || 'plyr';
    var keys = Object.keys(available);
    var showPlayerSelect = keys.length > 1;
    var safeLink = (link || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    var isDirectStream = link && (/\.m3u8($|\?)/i.test(link) || /\/stream\//i.test(link) || /\/hls\//i.test(link));
    var playerHtml = !link
      ? '<p>Chưa có link phát.</p>'
      : isDirectStream
        ? '<video id="daop-video" controls src="' + safeLink + '"></video>'
        : '<iframe id="daop-embed" src="' + safeLink + '" allowfullscreen allow="autoplay; fullscreen"></iframe>';
    var playerSelectHtml = showPlayerSelect
      ? '<div class="player-select-wrap" style="margin-bottom:8px;"><label for="daop-player-select">Player: </label><select id="daop-player-select"><option value="">' + (available[defaultPlayer] || defaultPlayer) + '</option>' +
        keys.filter(function(k){ return k !== defaultPlayer; }).map(function(k){ return '<option value="' + k + '">' + (available[k] || k) + '</option>'; }).join('') +
        '</select></div>'
      : '';
    overlay.innerHTML =
      '<button type="button" class="close-player" aria-label="Đóng">Đóng</button>' +
      playerSelectHtml +
      playerHtml +
      (showWarning ? '<p class="player-warning">' + (warningText || defaultWarning).replace(/</g, '&lt;') + '</p>' : '');
    var video = document.getElementById('daop-video');
    if (video) {
      video.addEventListener('timeupdate', function () {
        if (window.DAOP && window.DAOP.userSync && opts.slug && opts.episode) {
          window.DAOP.userSync.updateWatchProgress(opts.slug, opts.episode, Math.floor(video.currentTime));
        }
      });
    }
    overlay.querySelector('.close-player').addEventListener('click', function () {
      if (overlay) overlay.remove();
      overlay = null;
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.remove();
        overlay = null;
      }
    });
  }

  window.DAOP.openPlayer = function (opts) {
    var prerollList = window.DAOP?.prerollList || [];
    var preroll = prerollList.length > 0 ? prerollList[0] : null;

    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'player-overlay';

    if (preroll && preroll.video_url) {
      var skipAfter = Math.max(0, parseInt(preroll.skip_after, 10) || 0);
      var safePrerollUrl = (preroll.video_url || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      overlay.innerHTML =
        '<button type="button" class="close-player" aria-label="Đóng">Đóng</button>' +
        '<div class="preroll-wrap">' +
        '<p class="preroll-label">Quảng cáo</p>' +
        '<video id="daop-preroll-video" controls src="' + safePrerollUrl + '" poster="' + (preroll.image_url || '').replace(/"/g, '&quot;') + '"></video>' +
        '<div class="preroll-skip-wrap">' +
        '<button type="button" id="daop-preroll-skip" class="preroll-skip-btn" disabled>Bỏ qua sau <span id="daop-preroll-countdown">' + skipAfter + '</span>s</button>' +
        '</div></div>';
      document.body.appendChild(overlay);

      var prVideo = document.getElementById('daop-preroll-video');
      var skipBtn = document.getElementById('daop-preroll-skip');
      var countEl = document.getElementById('daop-preroll-countdown');
      var countdown = skipAfter;
      var countdownInterval = null;
      var done = function () {
        if (countdownInterval) clearInterval(countdownInterval);
        if (prVideo) {
          prVideo.pause();
          prVideo.removeEventListener('ended', onEnded);
        }
        showMainContent(opts);
      };
      var onEnded = function () { done(); };
      if (prVideo) {
        prVideo.addEventListener('ended', onEnded);
        prVideo.play().catch(function(){});
      }
      if (skipAfter > 0 && skipBtn && countEl) {
        countdownInterval = setInterval(function () {
          countdown--;
          if (countEl) countEl.textContent = countdown;
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            skipBtn.disabled = false;
            skipBtn.textContent = 'Bỏ qua';
          }
        }, 1000);
      } else if (skipBtn) {
        skipBtn.disabled = false;
        skipBtn.textContent = 'Bỏ qua';
      }
      if (skipBtn) skipBtn.addEventListener('click', done);
      overlay.querySelector('.close-player').addEventListener('click', function () {
        if (countdownInterval) clearInterval(countdownInterval);
        if (overlay) overlay.remove();
        overlay = null;
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          if (countdownInterval) clearInterval(countdownInterval);
          overlay.remove();
          overlay = null;
        }
      });
      return;
    }

    document.body.appendChild(overlay);
    showMainContent(opts);
  };
})();
