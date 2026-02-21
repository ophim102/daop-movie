/**
 * Player: mở overlay, chọn nguồn, cảnh báo (warning), lưu tiến trình
 */
(function () {
  window.DAOP = window.DAOP || {};
  var overlay = null;
  var defaultWarning = 'Cảnh báo: Phim chứa hình ảnh đường lưỡi bò phi pháp xâm phạm chủ quyền biển đảo Việt Nam.';

  window.DAOP.openPlayer = function (opts) {
    var link = opts.link;
    var movie = opts.movie || {};
    var showWarning = movie.warning_enabled !== false && (window.DAOP?.siteSettings?.player_warning_enabled !== false);
    var warningText = movie.warning_text || window.DAOP?.siteSettings?.player_warning_text || defaultWarning;

    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'player-overlay';
    var safeLink = (link || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    var isDirectStream = link && (/\.m3u8($|\?)/i.test(link) || /\/stream\//i.test(link) || /\/hls\//i.test(link));
    var playerHtml = !link
      ? '<p>Chưa có link phát.</p>'
      : isDirectStream
        ? '<video id="daop-video" controls src="' + safeLink + '"></video>'
        : '<iframe id="daop-embed" src="' + safeLink + '" allowfullscreen allow="autoplay; fullscreen"></iframe>';
    overlay.innerHTML =
      '<button type="button" class="close-player" aria-label="Đóng">Đóng</button>' +
      playerHtml +
      (showWarning ? '<p class="player-warning">' + (warningText || defaultWarning).replace(/</g, '&lt;') + '</p>' : '');
    document.body.appendChild(overlay);

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
  };
})();
