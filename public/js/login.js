(function () {
  var form = document.getElementById('login-form');
  var emailEl = document.getElementById('login-email');
  var passEl = document.getElementById('login-password');
  var statusEl = document.getElementById('login-status');
  var btnLogin = document.getElementById('btn-login');
  var btnSignup = document.getElementById('btn-signup');
  var btnLogout = document.getElementById('btn-logout');

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.style.color = isError ? '#f85149' : '#8b949e';
  }

  function getCreateClient() {
    if (typeof createClient !== 'undefined') return createClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') return window.supabase.createClient;
    return null;
  }

  function loadSupabaseJs() {
    if (getCreateClient()) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
  }

  function loadSettings() {
    if (window.DAOP && window.DAOP.siteSettings) {
      return Promise.resolve(window.DAOP.siteSettings);
    }
    if (window.DAOP && window.DAOP.loadConfig) {
      return window.DAOP.loadConfig('site-settings').then(function (s) {
        window.DAOP = window.DAOP || {};
        window.DAOP.siteSettings = s || {};
        if (window.DAOP.applySiteSettings) window.DAOP.applySiteSettings(window.DAOP.siteSettings);
        return window.DAOP.siteSettings;
      });
    }
    return fetch('/data/config/site-settings.json')
      .then(function (r) { return r.json(); })
      .catch(function () { return {}; })
      .then(function (s) {
        window.DAOP = window.DAOP || {};
        window.DAOP.siteSettings = s || {};
        if (window.DAOP.applySiteSettings) window.DAOP.applySiteSettings(window.DAOP.siteSettings);
        return window.DAOP.siteSettings;
      });
  }

  function initClient() {
    return Promise.all([loadSettings(), loadSupabaseJs()]).then(function (arr) {
      var s = arr[0] || {};
      window.DAOP = window.DAOP || {};
      if (!window.DAOP.supabaseUserUrl) window.DAOP.supabaseUserUrl = s.supabase_user_url || '';
      if (!window.DAOP.supabaseUserAnonKey) window.DAOP.supabaseUserAnonKey = s.supabase_user_anon_key || '';

      var url = window.DAOP.supabaseUserUrl;
      var key = window.DAOP.supabaseUserAnonKey;
      if (!url || !key) {
        setStatus('Thiếu cấu hình Supabase User (URL / Anon Key) trong Site Settings.', true);
        return null;
      }
      var cc = getCreateClient();
      if (!cc) {
        setStatus('Không load được Supabase JS client.', true);
        return null;
      }
      if (!window.DAOP._supabaseUser) {
        window.DAOP._supabaseUser = cc(url, key);
      }
      return window.DAOP._supabaseUser;
    });
  }

  function refreshUi(client) {
    if (!client) return;
    client.auth.getSession().then(function (res) {
      var user = res && res.data && res.data.session && res.data.session.user;
      if (user) {
        setStatus('Đã đăng nhập: ' + (user.email || user.id));
        if (btnLogout) btnLogout.style.display = '';
      } else {
        setStatus('Chưa đăng nhập');
        if (btnLogout) btnLogout.style.display = 'none';
      }
    });
  }

  function bind(client) {
    if (!client) return;

    refreshUi(client);
    client.auth.onAuthStateChange(function () {
      refreshUi(client);
      if (window.DAOP && window.DAOP.userSync) {
        window.DAOP.userSync.sync();
      }
    });

    function getCreds() {
      return {
        email: (emailEl && emailEl.value || '').trim(),
        password: passEl && passEl.value || '',
      };
    }

    if (btnLogin) {
      btnLogin.addEventListener('click', function () {
        var c = getCreds();
        if (!c.email || !c.password) {
          setStatus('Nhập email và mật khẩu.', true);
          return;
        }
        setStatus('Đang đăng nhập...');
        client.auth.signInWithPassword(c).then(function (r) {
          if (r.error) {
            setStatus(r.error.message || 'Đăng nhập thất bại', true);
            return;
          }
          setStatus('Đăng nhập thành công.');
          if (window.DAOP && window.DAOP.userSync) window.DAOP.userSync.sync();
        });
      });
    }

    if (btnSignup) {
      btnSignup.addEventListener('click', function () {
        var c = getCreds();
        if (!c.email || !c.password) {
          setStatus('Nhập email và mật khẩu.', true);
          return;
        }
        setStatus('Đang tạo tài khoản...');
        client.auth.signUp(c).then(function (r) {
          if (r.error) {
            setStatus(r.error.message || 'Đăng ký thất bại', true);
            return;
          }
          setStatus('Đăng ký thành công. Kiểm tra email để xác nhận (nếu Supabase bật xác thực).');
        });
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        setStatus('Đang đăng xuất...');
        client.auth.signOut().then(function () {
          setStatus('Đã đăng xuất.');
        });
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (btnLogin) btnLogin.click();
      });
    }
  }

  function init() {
    initClient().then(function (client) {
      bind(client);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
