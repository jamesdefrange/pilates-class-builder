/* Everything Jay saves stays in this browser (localStorage). */
(function () {
  var PREFIX = 'pcb.';
  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var Store = {
    uid: uid,
    getSettings: function () { return read('settings', null); },
    setSettings: function (s) { write('settings', s); },

    getCurrent: function () { return read('current', null); },
    setCurrent: function (c) { write('current', c); },

    getRecent: function () { return read('recent', []); },
    pushRecent: function (ids) {
      var r = read('recent', []);
      r.unshift(ids);
      write('recent', r.slice(0, 2));
    },

    getFeedback: function () { return read('feedback', []); },
    addFeedback: function (f) {
      var list = read('feedback', []);
      f.id = uid('fb');
      f.date = new Date().toISOString();
      list.push(f);
      write('feedback', list);
      return f;
    },
    removeFeedback: function (id) { write('feedback', read('feedback', []).filter(function (f) { return f.id !== id; })); },

    getSaved: function () { return read('saved', []); },
    saveClass: function (name, cls) {
      var list = read('saved', []);
      var item = { id: uid('class'), name: name, savedAt: new Date().toISOString(), cls: cls };
      list.unshift(item);
      write('saved', list);
      return item;
    },
    renameSaved: function (id, name) {
      var list = read('saved', []);
      list.forEach(function (s) { if (s.id === id) s.name = name; });
      write('saved', list);
    },
    deleteSaved: function (id) { write('saved', read('saved', []).filter(function (s) { return s.id !== id; })); },

    getTemplates: function () { return read('templates', []); },
    saveTemplate: function (name, minutes) {
      var list = read('templates', []);
      var t = { id: uid('tpl'), name: name, minutes: minutes, custom: true };
      list.push(t);
      write('templates', list);
      return t;
    },
    updateTemplate: function (id, minutes) {
      var list = read('templates', []);
      list.forEach(function (t) { if (t.id === id) t.minutes = minutes; });
      write('templates', list);
    },
    deleteTemplate: function (id) {
      write('templates', read('templates', []).filter(function (t) { return t.id !== id; }));
      if (read('defaultTemplate', null) === id) write('defaultTemplate', null);
    },
    getDefaultTemplate: function () { return read('defaultTemplate', null); },
    setDefaultTemplate: function (id) { write('defaultTemplate', id); },

    getCustomPeaks: function () { return read('customPeaks', []); },
    addCustomPeak: function (p) { var list = read('customPeaks', []); list.push(p); write('customPeaks', list); },
    deleteCustomPeak: function (id) { write('customPeaks', read('customPeaks', []).filter(function (p) { return p.id !== id; })); }
  };
  window.PCB = window.PCB || {};
  window.PCB.Store = Store;
})();
