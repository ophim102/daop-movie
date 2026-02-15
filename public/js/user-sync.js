/**
 * Đồng bộ người dùng: localStorage + Supabase User (favorites, watch history)
 * Delta sync, pending actions khi offline
 */
(function () {
  var STORAGE_KEY = 'daop_user_data';
  var version = 1;

  function getLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, lastSync: null, favorites: [], watchHistory: [], pendingActions: [] };
      var data = JSON.parse(raw);
      data.favorites = data.favorites || [];
      data.watchHistory = data.watchHistory || [];
      data.pendingActions = data.pendingActions || [];
      return data;
    } catch (e) {
      return { version: 1, lastSync: null, favorites: [], watchHistory: [], pendingActions: [] };
    }
  }

  function setLocal(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  window.DAOP = window.DAOP || {};
  window.DAOP.userSync = {
    getFavorites: function () {
      return new Set(getLocal().favorites);
    },
    addFavorite: function (slug) {
      var data = getLocal();
      if (data.favorites.indexOf(slug) === -1) data.favorites.push(slug);
      data.pendingActions.push({ type: 'add_favorite', payload: { movie_slug: slug }, timestamp: Date.now() });
      setLocal(data);
      this.sync();
    },
    removeFavorite: function (slug) {
      var data = getLocal();
      data.favorites = data.favorites.filter(function (s) { return s !== slug; });
      data.pendingActions.push({ type: 'remove_favorite', payload: { movie_slug: slug }, timestamp: Date.now() });
      setLocal(data);
      this.sync();
    },
    toggleFavorite: function (slug) {
      var fav = this.getFavorites();
      if (fav.has(slug)) this.removeFavorite(slug);
      else this.addFavorite(slug);
      return this.getFavorites().has(slug);
    },
    getWatchHistory: function () {
      return getLocal().watchHistory || [];
    },
    updateWatchProgress: function (slug, episode, timestamp) {
      var data = getLocal();
      var list = data.watchHistory || [];
      var idx = list.findIndex(function (x) { return x.slug === slug; });
      var entry = { slug: slug, episode: episode, timestamp: timestamp, lastWatched: new Date().toISOString() };
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
      data.watchHistory = list;
      data.pendingActions.push({ type: 'watch_progress', payload: entry, timestamp: Date.now() });
      setLocal(data);
      this.sync();
    },
    sync: function () {
      var supabaseUrl = window.DAOP && window.DAOP.supabaseUserUrl;
      var supabaseKey = window.DAOP && window.DAOP.supabaseUserAnonKey;
      if (!supabaseUrl || !supabaseKey) return Promise.resolve();
      var client = window.DAOP._supabaseUser;
      if (!client) {
        try {
          if (typeof createClient !== 'undefined') {
            window.DAOP._supabaseUser = createClient(supabaseUrl, supabaseKey);
            client = window.DAOP._supabaseUser;
          }
        } catch (e) { return Promise.resolve(); }
      }
      if (!client) return Promise.resolve();
      var data = getLocal();
      var pending = data.pendingActions || [];
      if (!pending.length) return fetchChanges(client, data);
      return Promise.all(pending.map(function (action) {
        if (action.type === 'add_favorite') {
          return client.from('favorites').upsert({ movie_slug: action.payload.movie_slug }, { onConflict: 'user_uid,movie_slug' });
        }
        if (action.type === 'remove_favorite') {
          return client.from('favorites').delete().eq('movie_slug', action.payload.movie_slug);
        }
        if (action.type === 'watch_progress') {
          return client.from('watch_history').upsert({
            movie_slug: action.payload.slug,
            episode: action.payload.episode,
            timestamp: action.payload.timestamp,
            last_watched: action.payload.lastWatched,
          }, { onConflict: 'user_uid,movie_slug' });
        }
        return Promise.resolve();
      })).then(function () {
        data.pendingActions = [];
        setLocal(data);
        return fetchChanges(client, data);
      }).catch(function () {});
    },
  };

  function fetchChanges(client, data) {
    return client.auth.getSession().then(function (res) {
      var user = res.data?.session?.user;
      if (!user) return;
      return client.from('user_changes').select('*').gt('created_at', data.lastSync || '1970-01-01').then(function (r) {
        var changes = r.data || [];
        changes.forEach(function (c) {
          if (c.change_type === 'favorites' && c.new_value) {
            var fav = data.favorites || [];
            if (fav.indexOf(c.item_key) === -1) fav.push(c.item_key);
            data.favorites = fav;
          }
          if (c.change_type === 'watch_history' && c.new_value) {
            var hist = data.watchHistory || [];
            var idx = hist.findIndex(function (x) { return x.slug === c.item_key; });
            var newVal = typeof c.new_value === 'object' ? c.new_value : JSON.parse(c.new_value || '{}');
            if (idx >= 0) hist[idx] = newVal;
            else hist.push(newVal);
            data.watchHistory = hist;
          }
        });
        data.lastSync = new Date().toISOString();
        setLocal(data);
      });
    }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.DAOP.userSync.sync();
    });
  } else {
    window.DAOP.userSync.sync();
  }
})();
