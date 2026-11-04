/* Pilates Class Builder: screens and interactions. */
(function () {
  'use strict';
  var D = window.PCB_DATA;
  var G = window.PCBGenerator;
  var ctx = G.prepare(D);
  var S = window.PCB.Store;
  var icon = window.PCB.icon;
  var Print = window.PCB.Print;
  var esc = Print.esc;
  var fmtMin = Print.fmtMin;
  var app = document.getElementById('app');
  var flow = ctx.classTypes.flow;
  var BLOCK_MIN = flow ? D['class-types'].blockLimits.minMinutes.value : 2;
  var BLOCK_MAX = flow ? D['class-types'].blockLimits.maxMinutes.value : 20;

  var REASONS = [
    { id: 'wrong-level', label: 'Wrong level', hard: true },
    { id: 'too-hard', label: 'Too hard for my clients', hard: true },
    { id: 'dislike', label: "Don't like it", hard: false },
    { id: 'overused', label: 'Overused', hard: false },
    { id: 'unsafe', label: 'Unsafe', hard: true }
  ];
  var SHARE_KEYS = ['reformer', 'chair', 'springboard', 'mat', 'bosu'];
  var EQUIP_ICON = { reformer: 'reformer', mat: 'mat', chair: 'chair', bosu: 'bosu', springboard: 'springboard', box: 'box', props: 'props', standing: 'standing' };

  /* ---------- settings ---------- */
  function defaultSettings() {
    return {
      classType: 'flow',
      level: '1',
      group: D['client-groups'].defaultGroup.value,
      peakId: null,
      equipment: G.defaultEquipment(ctx),
      shares: null,
      allowLower: true,
      timingId: 'auto'
    };
  }
  var state = {
    settings: Object.assign(defaultSettings(), S.getSettings() || {}),
    cls: S.getCurrent(),
    ui: { panel: null, swaps: null, error: null, building: false }
  };
  function saveSettings() { S.setSettings(state.settings); }

  function builtinTemplates() { return flow.timingTemplates.map(function (t) { return { id: t.id, name: t.name, minutes: t.minutes, custom: false, note: t.note }; }); }
  function allTemplates() { return builtinTemplates().concat(S.getTemplates()); }
  function findTemplate(id) { return allTemplates().filter(function (t) { return t.id === id; })[0] || null; }
  function groupTemplateId(groupId) { return ctx.groups[groupId].rules.timingTemplate.value; }
  function resolveTemplate(settings) {
    var id = settings.timingId;
    if (!id || id === 'auto') {
      var def = S.getDefaultTemplate();
      id = def && findTemplate(def) ? def : groupTemplateId(settings.group);
    }
    return findTemplate(id) || builtinTemplates()[0];
  }
  function genSettings(settings) {
    var t = resolveTemplate(settings);
    return {
      classType: settings.classType,
      level: settings.level,
      group: settings.group,
      peakId: settings.peakId,
      equipment: settings.equipment,
      shares: settings.shares,
      allowLower: settings.allowLower,
      timing: t.minutes,
      timingName: t.name,
      feedback: S.getFeedback(),
      customPeaks: S.getCustomPeaks()
    };
  }
  function allPeaks() { return ctx.peaks.concat(S.getCustomPeaks()); }
  function peakById(id) { return allPeaks().filter(function (p) { return p.id === id; })[0] || null; }

  /* ---------- helpers ---------- */
  function img(file, alt, cls) {
    return '<img class="' + (cls || '') + '" src="images/' + esc(file) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">';
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
  }
  function stationLabel(id) { return ctx.stations[id] ? ctx.stations[id].label : id; }
  function levelLabel(id) { return ctx.levels[id].label; }
  function groupLabel(id) { return ctx.groups[id].label; }
  var toastTimer = null;
  function toast(text, undo) {
    var el = document.getElementById('toast');
    el.innerHTML = '<span>' + esc(text) + '</span>' + (undo ? '<button type="button" data-action="toast-undo">Undo</button>' : '');
    el.classList.add('show');
    el._undo = undo || null;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); el._undo = null; }, undo ? 6000 : 3000);
  }
  function modal(html) {
    closeModal();
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
    document.body.appendChild(back);
    var first = back.querySelector('input, button');
    if (first) setTimeout(function () { first.focus(); }, 30);
    return back;
  }
  function closeModal() { var m = document.querySelector('.modal-back'); if (m) m.remove(); }
  function download(name, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- navigation ---------- */
  function currentRoute() { return (location.hash.replace(/^#\/?/, '') || 'setup').split('?')[0]; }
  function renderNav() {
    var r = currentRoute();
    var items = [
      { id: 'setup', label: 'Build', icon: 'sliders' },
      { id: 'class', label: 'My class', icon: 'list' },
      { id: 'saved', label: 'Saved', icon: 'save' },
      { id: 'timings', label: 'Timings', icon: 'timer' }
    ];
    document.getElementById('nav').innerHTML = items.map(function (i) {
      return '<a href="#/' + i.id + '"' + (r === i.id ? ' aria-current="page"' : '') + '>' + icon(i.icon) + '<span>' + i.label + '</span></a>';
    }).join('');
  }
  function render() {
    var r = currentRoute();
    renderNav();
    var screens = { setup: renderSetup, 'class': renderClass, saved: renderSaved, timings: renderTimings, questions: renderQuestions, rules: renderRules, feedback: renderFeedback };
    (screens[r] || renderSetup)();
    document.body.classList.toggle('has-card', !!state.cls && r === 'class');
  }
  function go(route) {
    if (currentRoute() === route) render(); else location.hash = '#/' + route;
    window.scrollTo(0, 0);
  }

  /* ---------- setup screen ---------- */
  function renderSetup() {
    var s = state.settings;
    var lvl = ctx.levels[s.level];
    var grp = ctx.groups[s.group];
    var t = resolveTemplate(s);
    var h = '<div class="narrow"><h1>Build a class</h1><p class="lede">Choose a few things, then press Build my class.</p>';

    // class type
    h += '<section class="section"><div class="section-head"><h2><span class="step-num">1</span>Class type</h2></div><div class="type-grid">';
    D['class-types'].classTypes.forEach(function (c) {
      h += '<button type="button" class="choice type-card" ' + (c.enabled ? 'aria-pressed="' + (s.classType === c.id) + '" data-action="set" data-key="classType" data-value="' + c.id + '"' : 'disabled') + '>' +
        esc(c.label) + (c.enabled ? '<small>50 minutes</small>' : '<span class="soon">Coming soon</span>') + '</button>';
    });
    h += '</div></section>';

    // level
    h += '<section class="section"><div class="section-head"><h2><span class="step-num">2</span>Level</h2></div><div class="choices cols-4">';
    ctx.levelList.forEach(function (l) {
      h += '<button type="button" class="choice" aria-pressed="' + (s.level === l.id) + '" data-action="set" data-key="level" data-value="' + l.id + '">' + esc(l.label) + '</button>';
    });
    h += '</div><p class="choice-note">' + esc(lvl.summary.value) + '</p></section>';

    // clients
    h += '<section class="section"><div class="section-head"><h2><span class="step-num">3</span>Clients</h2></div><div class="choices cols-3">';
    ['younger', 'middle', 'older'].forEach(function (id) {
      var g = ctx.groups[id];
      h += '<button type="button" class="choice" aria-pressed="' + (s.group === id) + '" data-action="set" data-key="group" data-value="' + id + '">' + esc(g.label) + '</button>';
    });
    h += '</div><p class="choice-note">' + esc(grp.summary.value) + '</p></section>';

    // peak pose
    h += '<section class="section"><div class="section-head"><h2><span class="step-num">4</span>Peak pose</h2><p class="hint">Optional. The class builds up to it.</p></div><div class="peak-grid">';
    h += '<button type="button" class="peak-card" aria-pressed="' + (!s.peakId) + '" data-action="set" data-key="peakId" data-value=""><span class="noimg">' + icon('minus') + '</span><span class="name">No peak pose<small>Just a balanced class</small></span></button>';
    allPeaks().forEach(function (p) {
      h += '<div style="position:relative;display:flex"><button type="button" style="flex:1" class="peak-card" aria-pressed="' + (s.peakId === p.id) + '" data-action="set" data-key="peakId" data-value="' + esc(p.id) + '">' +
        img(p.image, '') + '<span class="name">' + esc(p.name) + (p.custom ? '<small>Added by you</small>' : '') + '</span></button>' +
        (p.custom ? '<button type="button" class="btn btn-small btn-quiet remove-link" data-action="remove-peak" data-id="' + esc(p.id) + '" aria-label="Remove ' + esc(p.name) + '">' + icon('trash') + '</button>' : '') + '</div>';
    });
    h += '<button type="button" class="peak-card" data-action="add-peak"><span class="noimg">' + icon('plus') + '</span><span class="name">Add my own<small>Pick any exercise</small></span></button>';
    h += '</div>';
    if (s.peakId) {
      var p = peakById(s.peakId);
      if (p) {
        var st = G.normalize(ctx, genSettings(s));
        var R = G.rulesFor(ctx, st);
        var res = G.resolvePeak(ctx, st, R, p);
        h += '<div class="peak-info"><strong>' + esc(p.name) + '.</strong> ' + esc(p.requiresText || '') +
          (res.exercise && res.exercise.id !== p.versions[0] ? ' For ' + esc(lvl.label) + ', ' + esc(grp.label.toLowerCase()) + ' clients, the class builds to <strong>' + esc(res.exercise.name) + '</strong>, the closest safe version.' : '') +
          (!res.exercise ? ' No version fits this level and equipment yet. Try another level or tick more equipment.' : '') + '</div>';
      }
    }
    h += '</section>';

    // equipment
    var eqNotes = [];
    if (s.level === '1' && s.equipment.chair) eqNotes.push('There is no chair at Level 1, so the chair will not be used.');
    if (s.equipment.box && !s.equipment.reformer) eqNotes.push('The long box sits on the reformer, so tick the Reformer to use it.');
    h += '<section class="section"><div class="section-head"><h2><span class="step-num">5</span>Equipment</h2><p class="hint">Tick what is in the room.</p></div><div class="tiles">';
    ctx.checkboxes.forEach(function (c) {
      var on = !!s.equipment[c.id];
      h += '<button type="button" class="tile" aria-pressed="' + on + '" data-action="toggle-equip" data-id="' + c.id + '">' + icon(EQUIP_ICON[c.id]) +
        '<span>' + esc(c.id === 'props' ? 'Small props' : c.label) + '</span><span class="check">' + icon('check') + '</span></button>';
    });
    h += '</div>' + (eqNotes.length ? '<p class="choice-note">' + esc(eqNotes.join(' ')) + '</p>' : '') + '<p class="hint">Small props means light weights and a magic circle.</p>';

    // more options
    var shares = s.shares || D.equipment.flowRules.defaultShares.value;
    h += '<details class="more"' + (state.ui.moreOpen ? ' open' : '') + ' data-more><summary>' + icon('chevron') + 'More options</summary>';
    h += '<div class="option-block"><h3>Time on each piece of equipment</h3><p class="hint">Targets, not promises. The builder gets close while keeping equipment changes low.</p>';
    SHARE_KEYS.forEach(function (k) {
      if (!s.equipment[k]) return;
      var v = Number(shares[k] || 0);
      h += '<div class="stepper-row"><span>' + esc(stationLabel(k)) + (k === 'reformer' ? ' <small class="hint">(includes long box)</small>' : '') + '</span><span class="stepper">' +
        '<button type="button" data-action="share" data-id="' + k + '" data-step="-5" aria-label="Less ' + esc(stationLabel(k)) + '"' + (v <= 0 ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
        '<output>' + v + '%</output>' +
        '<button type="button" data-action="share" data-id="' + k + '" data-step="5" aria-label="More ' + esc(stationLabel(k)) + '"' + (v >= 100 ? ' disabled' : '') + '>' + icon('plus') + '</button></span></div>';
    });
    h += (s.shares ? '<button type="button" class="btn btn-small btn-quiet" data-action="reset-shares">' + icon('refresh') + 'Back to the usual mix</button>' : '') + '</div>';
    h += '<div class="option-block"><label class="toggle"><input type="checkbox" data-action="toggle-lower"' + (s.allowLower ? ' checked' : '') + '><span>Allow easier exercises from lower levels</span></label>' +
      '<p class="hint">When off, blocks use exercises at this level, except footwork, stretch and wind-down.</p></div>';
    h += '<div class="option-block"><h3>Block timings</h3><div class="field"><select class="select" data-action="timing-select" aria-label="Block timings">' +
      '<option value="auto"' + (s.timingId === 'auto' ? ' selected' : '') + '>Match the clients (' + esc(resolveTemplate(Object.assign({}, s, { timingId: 'auto' })).name) + ')</option>' +
      allTemplates().map(function (tp) { return '<option value="' + esc(tp.id) + '"' + (s.timingId === tp.id ? ' selected' : '') + '>' + esc(tp.name) + '</option>'; }).join('') +
      '</select></div><p class="hint">Using: ' + esc(t.name) + '. Footwork ' + t.minutes.footwork + ' min, wind-down ' + t.minutes.winddown + ' min.</p>' +
      '<a class="btn btn-small" href="#/timings">' + icon('timer') + 'Edit timings</a></div>';
    h += '</details></section>';

    // build
    h += '<div class="build-bar">' + (state.ui.error ? '<div class="notice error" role="alert">' + icon('warn') + '<div>' + esc(state.ui.error) + '</div></div>' : '') +
      '<button type="button" class="btn btn-primary btn-big" data-action="build"' + (state.ui.building ? ' disabled' : '') + '>' + icon('star') + (state.ui.building ? 'Building...' : 'Build my class') + '</button></div>';
    h += '</div>';
    app.innerHTML = h;
  }

  function doBuild(opts) {
    opts = opts || {};
    var settings = opts.settings || state.settings;
    var recent = [];
    S.getRecent().forEach(function (list) { recent = recent.concat(list); });
    var gs = genSettings(settings);
    var r = G.buildClass(ctx, gs, { seed: Math.floor(Math.random() * 2147483646) + 1, recent: recent, locked: opts.locked || {} });
    if (!r.ok) return r;
    var cls = r.class;
    cls.ui = { settings: JSON.parse(JSON.stringify(settings)), name: null, savedId: null };
    cls.blocks.forEach(function (b) { if (b.locked) b.locked = true; });
    state.cls = cls;
    state.ui.panel = null;
    S.setCurrent(cls);
    S.pushRecent(cls.blocks.reduce(function (a, b) { return a.concat(b.items.map(function (it) { return it.id; })); }, []));
    return r;
  }

  /* ---------- review screen ---------- */
  function classSettings() { return state.cls && state.cls.ui ? state.cls.ui.settings : state.settings; }

  function renderClass() {
    var cls = state.cls;
    if (!cls) {
      app.innerHTML = '<div class="narrow"><div class="empty">' + icon('list') + '<h1>No class yet</h1><p>Build one and it will show up here.</p><a class="btn btn-primary" href="#/setup">' + icon('sliders') + 'Build a class</a></div></div>';
      return;
    }
    var st = cls.settings;
    var group = ctx.groups[st.group];
    var stats = cls.stats || G.stats(ctx, cls);
    var exCount = cls.blocks.reduce(function (a, b) { return a + b.items.length; }, 0);
    var h = '<div class="review-head"><div><h1>' + esc(cls.ui && cls.ui.name ? cls.ui.name : 'Your class') + '</h1><div class="chips">' +
      '<span class="chip strong">' + icon('clock') + stats.totalMinutes + ' minutes</span>' +
      '<span class="chip">' + esc(levelLabel(st.level)) + ', ' + esc(group.label.toLowerCase()) + ' clients</span>' +
      '<span class="chip">' + icon('list') + exCount + ' exercises</span>' +
      '<span class="chip">' + icon('reformer') + stats.equipmentChanges + ' equipment ' + (stats.equipmentChanges === 1 ? 'change' : 'changes') + '</span>' +
      '<span class="chip">' + icon('spring') + stats.springChanges + ' spring ' + (stats.springChanges === 1 ? 'change' : 'changes') + '</span>' +
      (cls.peak && cls.peak.exerciseId ? '<span class="chip">' + icon('star') + 'Peak: ' + esc(cls.peak.name) + '</span>' : '') +
      '</div></div></div>';
    (cls.messages || []).forEach(function (m) { h += '<div class="notice peak">' + icon('info') + '<div>' + esc(m) + '</div></div>'; });
    h += '<div class="action-bar">' +
      '<button type="button" class="btn btn-primary" data-action="rebuild">' + icon('refresh') + 'Build another</button>' +
      '<button type="button" class="btn" data-action="print">' + icon('print') + 'Print</button>' +
      '<button type="button" class="btn" data-action="pdf">' + icon('pdf') + 'Save as PDF</button>' +
      '<button type="button" class="btn" data-action="save-class">' + icon('save') + 'Save class</button></div>';
    var locked = cls.blocks.filter(function (b) { return b.locked; }).length;
    if (locked) h += '<div class="notice ok">' + icon('lock') + '<div>' + locked + ' locked ' + (locked === 1 ? 'block stays' : 'blocks stay') + ' the same when you press Build another.</div></div>';

    cls.blocks.forEach(function (b, bi) {
      h += '<section class="block' + (b.locked ? ' is-locked' : '') + '"><div class="block-head"><span class="block-num">' + (bi + 1) + '</span><div class="block-title"><h2>' + esc(b.label) + '</h2><div class="meta">' +
        esc(fmtMin(b.minutes)) + ', ' + esc(stationLabel(b.station)) + '</div></div>' +
        '<button type="button" class="btn btn-small lock-btn" aria-pressed="' + !!b.locked + '" data-action="lock" data-bi="' + bi + '">' + icon(b.locked ? 'lock' : 'unlock') + (b.locked ? 'Locked' : 'Lock') + '</button></div>';
      b.items.forEach(function (it, ii) {
        var e = ctx.byId[it.id];
        if (!e) return;
        var sp = Print.springText(ctx, e);
        h += '<div class="ex' + (it.isPeak ? ' is-peak' : '') + '">' + img(e.image, e.name, 'ex-img') + '<div>' +
          (it.isPeak ? '<span class="peak-badge">' + icon('star') + 'Peak pose</span>' : '') +
          '<div class="ex-name">' + esc(e.name) + '</div><div class="ex-facts">' +
          '<span>' + icon('clock') + esc(fmtMin(it.minutes)) + ', ' + esc(e.reps) + '</span>' +
          '<span>' + icon(EQUIP_ICON[e.equipment] || 'info') + esc(stationLabel(e.equipment)) + '</span>' +
          (sp ? '<span>' + icon('spring') + esc(sp) + '</span>' : '') +
          (e.props.length ? '<span>' + icon('props') + esc(e.props.map(function (p) { return p === 'weights' ? 'Light weights' : 'Magic circle'; }).join(', ')) + '</span>' : '') +
          '</div><ul class="ex-cues">' + e.cues.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
          (st.group === 'older' && e.olderNote ? '<p class="ex-note">Older clients: ' + esc(e.olderNote) + '</p>' : '') +
          '<div class="ex-actions"><button type="button" class="btn btn-small" data-action="open-swap" data-bi="' + bi + '" data-ii="' + ii + '">' + icon('swap') + 'Swap</button>' +
          '<button type="button" class="btn btn-small btn-quiet" data-action="open-flag" data-bi="' + bi + '" data-ii="' + ii + '">' + icon('flag') + 'Not right</button></div></div>';
        var pnl = state.ui.panel;
        if (pnl && pnl.bi === bi && pnl.ii === ii) h += panelHTML(pnl, e, it);
        h += '</div>';
      });
      h += '</section>';
    });
    h += '<div class="btn-row" style="margin-top:20px"><a class="btn" href="#/setup">' + icon('back') + 'Change settings</a>' +
      '<button type="button" class="btn btn-quiet" data-action="export-feedback">' + icon('download') + 'Export my feedback</button></div>';
    app.innerHTML = h;
  }

  function panelHTML(pnl, e, it) {
    if (pnl.kind === 'swap') {
      var opts = state.ui.swaps || [];
      if (!opts.length) return '<div class="panel"><h3>No other exercise fits here without breaking a rule.</h3><button type="button" class="btn btn-small" data-action="close-panel">Close</button></div>';
      return '<div class="panel"><h3>' + (it.isPeak ? 'Other versions of the peak' : 'Pick a swap. Each one follows every rule.') + '</h3><div class="swap-list">' +
        opts.map(function (o, k) {
          var x = ctx.byId[o.id];
          var sp = Print.springText(ctx, x);
          return '<button type="button" class="swap-opt" data-action="use-swap" data-k="' + k + '">' + img(x.image, '') + '<span><b>' + esc(x.name) + '</b><small>' + esc([x.reps, sp].filter(Boolean).join(', ')) + '</small></span></button>';
        }).join('') + '</div><div class="btn-row" style="margin-top:10px"><button type="button" class="btn btn-small btn-quiet" data-action="close-panel">Cancel</button></div></div>';
    }
    if (pnl.kind === 'flag') {
      return '<div class="panel"><h3>What is not right about ' + esc(e.name) + '?</h3><div class="reason-grid">' +
        REASONS.map(function (r) { return '<button type="button" class="btn btn-small" data-action="flag" data-reason="' + r.id + '">' + esc(r.label) + '</button>'; }).join('') +
        '</div><p class="hint">Saved on this device. The builder follows it from now on.</p><div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn-small btn-quiet" data-action="close-panel">Cancel</button></div></div>';
    }
    return '';
  }

  function openSwap(bi, ii) {
    var cls = state.cls;
    var opts = G.swapOptions(ctx, genSettings(classSettings()), cls, bi, ii, 3, { seed: Math.floor(Math.random() * 100000) + 1 });
    state.ui.swaps = opts;
    state.ui.panel = { kind: 'swap', bi: bi, ii: ii };
    renderClass();
  }

  /* ---------- printing ---------- */
  function prepareCard() {
    if (!state.cls) return;
    Print.render(ctx, state.cls, { name: state.cls.ui && state.cls.ui.name });
  }
  window.addEventListener('beforeprint', prepareCard);
  function pdfHelp() {
    var ua = navigator.userAgent;
    var iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var mac = /Macintosh/.test(ua) && !iOS;
    var safari = /Safari/.test(ua) && !/Chrome|CriOS|Edg/.test(ua);
    var steps;
    if (iOS) steps = ['Tap <b>Open the print screen</b> below.', 'If the preview looks tall and thin, tap <b>Options</b> and choose <b>Landscape</b>.', 'Spread two fingers apart on the preview to open it as a PDF.', 'Tap the <b>Share</b> button, then <b>Save to Files</b>.'];
    else if (mac && safari) steps = ['Click <b>Open the print screen</b> below.', 'At the bottom left, open the <b>PDF</b> menu.', 'Choose <b>Save as PDF</b>.'];
    else steps = ['Click <b>Open the print screen</b> below.', 'Set <b>Destination</b> (or Printer) to <b>Save as PDF</b>.', 'Make sure the layout is <b>Landscape</b>, then click <b>Save</b>.'];
    modal('<h2>Save as PDF</h2><ol>' + steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
      '<div class="btn-row" style="margin-top:16px"><button type="button" class="btn btn-primary" data-action="print-now">' + icon('print') + 'Open the print screen</button>' +
      '<button type="button" class="btn btn-quiet" data-action="close-modal">Not now</button></div>');
  }

  /* ---------- saved classes ---------- */
  function renderSaved() {
    var list = S.getSaved();
    var h = '<div class="narrow"><h1>Saved classes</h1><p class="lede">Classes you saved on this device.</p>';
    if (!list.length) h += '<div class="empty">' + icon('save') + '<p>Nothing saved yet. Build a class and press Save class.</p><a class="btn btn-primary" href="#/setup">Build a class</a></div>';
    h += '<div class="list">';
    list.forEach(function (s) {
      var c = s.cls;
      var bits = [levelLabel(c.settings.level), groupLabel(c.settings.group).toLowerCase() + ' clients'];
      if (c.peak && c.peak.name) bits.push('peak: ' + c.peak.name);
      h += '<div class="row-card"><div class="grow"><h3>' + esc(s.name) + '</h3><div class="meta">' + esc(bits.join(', ')) + '. Saved ' + esc(fmtDate(s.savedAt)) + '.</div></div>' +
        '<button type="button" class="btn btn-primary btn-small" data-action="open-saved" data-id="' + esc(s.id) + '">Open</button>' +
        '<button type="button" class="btn btn-small" data-action="rename-saved" data-id="' + esc(s.id) + '">' + icon('pencil') + 'Rename</button>' +
        '<button type="button" class="btn btn-small btn-quiet btn-danger" data-action="delete-saved" data-id="' + esc(s.id) + '">' + icon('trash') + 'Delete</button></div>';
    });
    h += '</div></div>';
    app.innerHTML = h;
  }

  /* ---------- timings ---------- */
  var timingWork = null; // { id, name, custom, minutes }
  function renderTimings() {
    if (!timingWork) {
      var t = resolveTemplate(state.settings);
      timingWork = { id: t.id, name: t.name, custom: t.custom, minutes: Object.assign({}, t.minutes) };
    }
    var total = flow.blocks.reduce(function (a, b) { return a + Number(timingWork.minutes[b.id] || 0); }, 0);
    var target = flow.minutes.value;
    var saved = findTemplate(timingWork.id);
    var changed = !saved || flow.blocks.some(function (b) { return saved.minutes[b.id] !== timingWork.minutes[b.id]; });
    var def = S.getDefaultTemplate();
    var h = '<div class="narrow"><h1>Block timings</h1><p class="lede">Minutes for each of the ' + flow.blocks.length + ' blocks. They must add up to ' + target + '.</p>';
    h += '<section class="section"><div class="field"><label for="tpl">Timing template</label><select id="tpl" class="select" data-action="tpl-pick">' +
      allTemplates().map(function (tp) { return '<option value="' + esc(tp.id) + '"' + (tp.id === timingWork.id ? ' selected' : '') + '>' + esc(tp.name) + (tp.id === def ? ' (my default)' : '') + '</option>'; }).join('') +
      '</select></div>';
    flow.blocks.forEach(function (b) {
      var v = Number(timingWork.minutes[b.id]);
      h += '<div class="stepper-row"><span><b>' + esc(b.label) + '</b></span><span class="stepper">' +
        '<button type="button" data-action="tmin" data-id="' + b.id + '" data-step="-1" aria-label="One minute less for ' + esc(b.label) + '"' + (v <= BLOCK_MIN ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
        '<output>' + v + ' min</output>' +
        '<button type="button" data-action="tmin" data-id="' + b.id + '" data-step="1" aria-label="One minute more for ' + esc(b.label) + '"' + (v >= BLOCK_MAX ? ' disabled' : '') + '>' + icon('plus') + '</button></span></div>';
    });
    var diff = total - target;
    h += '<div class="total-bar ' + (diff === 0 ? 'good' : 'bad') + '" role="status">' + icon(diff === 0 ? 'check' : 'warn') + '<span>' +
      (diff === 0 ? total + ' of ' + target + ' minutes. Ready to use.' : total + ' minutes. ' + (diff > 0 ? 'Take ' + diff + ' ' + (diff === 1 ? 'minute' : 'minutes') + ' off somewhere.' : 'Add ' + (-diff) + ' ' + (diff === -1 ? 'minute' : 'minutes') + ' somewhere.')) + '</span></div>';
    var ok = diff === 0;
    h += '<div class="btn-row">';
    h += '<button type="button" class="btn btn-primary" data-action="tpl-use"' + (ok ? '' : ' disabled') + '>' + icon('check') + 'Use for my classes</button>';
    if (timingWork.custom && changed) h += '<button type="button" class="btn" data-action="tpl-update"' + (ok ? '' : ' disabled') + '>' + icon('save') + 'Save changes</button>';
    h += '<button type="button" class="btn" data-action="tpl-saveas"' + (ok ? '' : ' disabled') + '>' + icon('plus') + 'Save as new</button>';
    if (!changed && def !== timingWork.id) h += '<button type="button" class="btn btn-quiet" data-action="tpl-default">' + icon('star') + 'Make my default</button>';
    if (timingWork.custom) h += '<button type="button" class="btn btn-quiet btn-danger" data-action="tpl-delete">' + icon('trash') + 'Delete</button>';
    h += '</div>';
    if (changed && !timingWork.custom) h += '<p class="hint">You changed a built-in template. Save it as new to keep it.</p>';
    if (def) h += '<p class="hint">Your default is ' + esc((findTemplate(def) || {}).name || '') + '. <button type="button" class="btn btn-small btn-quiet" data-action="tpl-clear-default">Go back to matching the clients</button></p>';
    h += '</section></div>';
    app.innerHTML = h;
  }

  /* ---------- questions for Jay ---------- */
  function renderQuestions() {
    var h = '<div class="narrow"><h1>Questions for Jay</h1><p class="lede">Only Jay can answer these. Each answer changes one setting in the data files.</p><ol class="q-list">';
    D.questions.questions.forEach(function (q) { h += '<li>' + esc(q.q) + '<span class="why">' + esc(q.why) + '</span></li>'; });
    h += '</ol></div>';
    app.innerHTML = h;
  }

  /* ---------- my feedback ---------- */
  function reasonLabel(id) { var r = REASONS.filter(function (x) { return x.id === id; })[0]; return r ? r.label : id; }
  function renderFeedback() {
    var list = S.getFeedback().slice().reverse();
    var h = '<div class="narrow"><h1>My feedback</h1><p class="lede">Everything you marked Not right. The builder follows these on this device.</p>';
    h += '<div class="btn-row" style="margin-bottom:16px"><button type="button" class="btn btn-primary" data-action="export-feedback"' + (list.length ? '' : ' disabled') + '>' + icon('download') + 'Export my feedback</button></div>';
    if (!list.length) h += '<div class="empty">' + icon('flag') + '<p>Nothing marked yet.</p></div>';
    h += '<div class="list">';
    list.forEach(function (f) {
      var e = ctx.byId[f.exerciseId];
      h += '<div class="row-card">' + (e ? img(e.image, '', 'ex-img" style="width:64px;height:64px') : '') + '<div class="grow"><h3>' + esc(e ? e.name : f.exerciseId) + '</h3><div class="meta">' +
        esc(reasonLabel(f.reason)) + '. ' + esc(levelLabel(f.level)) + ', ' + esc(groupLabel(f.group).toLowerCase()) + ' clients. ' + esc(fmtDate(f.date)) + '</div></div>' +
        '<button type="button" class="btn btn-small btn-quiet" data-action="unflag" data-id="' + esc(f.id) + '">' + icon('trash') + 'Remove</button></div>';
    });
    h += '</div></div>';
    app.innerHTML = h;
  }
  function exportFeedback() {
    var list = S.getFeedback();
    if (!list.length) { toast('Nothing to export yet.'); return; }
    var lines = ['Pilates class builder: feedback from Jay', 'Exported ' + fmtDate(new Date().toISOString()) + '. ' + list.length + ' notes.', ''];
    list.forEach(function (f, i) {
      var e = ctx.byId[f.exerciseId];
      lines.push((i + 1) + '. ' + (e ? e.name : f.exerciseId));
      lines.push('   Reason: ' + reasonLabel(f.reason));
      lines.push('   Class: ' + levelLabel(f.level) + ', ' + groupLabel(f.group).toLowerCase() + ' clients');
      lines.push('   Date: ' + fmtDate(f.date));
      lines.push('');
    });
    lines.push('Copy for James (exact data):');
    lines.push(JSON.stringify(list.map(function (f) { return { exerciseId: f.exerciseId, reason: f.reason, level: f.level, group: f.group, date: f.date }; })));
    download('pilates-feedback-' + new Date().toISOString().slice(0, 10) + '.txt', lines.join('\n'));
  }

  /* ---------- rules page (for James) ---------- */
  function src(v) { var s = (v && v.source) || v || 'assumption'; return '<span class="src src-' + esc(s) + '">' + esc(s) + '</span>'; }
  function table(headers, rows) {
    return '<div class="table-wrap"><table class="rules-table"><thead><tr>' + headers.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function renderRules() {
    var filter = state.ui.rulesFilter || 'all';
    var h = '<div class="rules"><h1>Rules and data</h1><p class="lede">Every rule the builder follows, straight from the data files. Tags show where each one came from: ' +
      src('jay') + ' Jay said it, ' + src('research') + ' common studio practice, ' + src('assumption') + ' a best guess to check. Edit the files in /data and run the bundle script (see data/README.md).</p>';

    h += '<h2>Levels <small class="hint">levels.json</small></h2>';
    var lrows = [];
    ctx.levelList.forEach(function (l) {
      lrows.push(['<b>' + esc(l.label) + '</b>', 'Summary', esc(l.summary.value), src(l.summary)]);
      Object.keys(l.rules).forEach(function (k) { var r = l.rules[k]; lrows.push(['', esc(k), esc(String(r.value)) + (r.note ? ': ' + esc(r.note) : ''), src(r)]); });
    });
    h += table(['Level', 'Rule', 'Value', 'Source'], lrows);
    var defs = D.levels.definitions;
    h += table(['Term', 'Meaning', 'Source'], Object.keys(defs).map(function (k) { return [esc(k), esc(defs[k].text), src(defs[k])]; }));

    h += '<h2>Client groups <small class="hint">client-groups.json</small></h2>';
    var grows = [];
    ctx.groupList.forEach(function (g) {
      grows.push(['<b>' + esc(g.label) + '</b>', 'Summary', esc(g.summary.value), '', src(g.summary)]);
      Object.keys(g.rules).forEach(function (k) { var r = g.rules[k]; grows.push(['', esc(k), esc(String(r.value)) + (r.note ? ': ' + esc(r.note) : ''), r.hard ? 'Hard' : 'Soft', src(r)]); });
    });
    h += table(['Group', 'Rule', 'Value', 'Type', 'Source'], grows);

    h += '<h2>Flow blocks and timings <small class="hint">class-types.json</small></h2>';
    h += table(['#', 'Block', 'Standard minutes', 'Purpose', 'Source'], flow.blocks.map(function (b, i) { return [String(i + 1), '<b>' + esc(b.label) + '</b>', String(b.minutes), esc(b.purpose) + (b.note ? ' ' + esc(b.note) : ''), src(b)]; }));
    h += table(['Template'].concat(flow.blocks.map(function (b) { return b.label; })).concat(['Source']), flow.timingTemplates.map(function (t) { return ['<b>' + esc(t.name) + '</b>'].concat(flow.blocks.map(function (b) { return String(t.minutes[b.id]); })).concat([src(t)]); }));
    var sc = flow.scoring;
    h += '<p class="hint">Soft rule weights (all ' + src('assumption') + '): ' + esc(Object.keys(sc).filter(function (k) { return typeof sc[k] === 'number'; }).map(function (k) { return k + ' ' + sc[k]; }).join(', ')) + '.</p>';

    h += '<h2>Equipment and springs <small class="hint">equipment.json</small></h2>';
    var erows = [];
    D.equipment.stations.forEach(function (s) {
      s.springs.forEach(function (sp, i) { erows.push([i === 0 ? '<b>' + esc(s.label) + '</b>' : '', esc(sp.label), esc(sp.colors), src(sp.colorSource)]); });
    });
    h += table(['Equipment', 'Spring setting', 'Colors or setup', 'Source'], erows);
    var fr = D.equipment.flowRules;
    h += table(['Flow rule', 'Value', 'Note', 'Source'], Object.keys(fr).map(function (k) { var r = fr[k]; return [esc(k), esc(typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value)), esc(r.note || ''), src(r)]; }));

    h += '<h2>Peak poses <small class="hint">peak-poses.json</small></h2>';
    h += table(['Peak', 'Needs', 'Versions, full to gentlest', 'Builds up with', 'Source'], ctx.peaks.map(function (p) {
      return ['<b>' + esc(p.name) + '</b>', esc(p.requires.join(', ')), esc(p.versions.map(function (v) { return ctx.byId[v].name + ' (L' + ctx.byId[v].minLevel + ')'; }).join(', ')), esc(p.buildUp.map(function (v) { return ctx.byId[v].name; }).join(', ')), src(p)];
    }));

    h += '<h2>Exercises <small class="hint">exercises.json, ' + ctx.exercises.length + ' exercises</small></h2><div class="rules-filter"><span>Show:</span>' +
      ['all', 'jay', 'research', 'assumption'].map(function (f) { return '<button type="button" class="btn btn-small' + (filter === f ? ' btn-primary' : '') + '" data-action="rules-filter" data-f="' + f + '">' + (f === 'all' ? 'All' : f) + '</button>'; }).join('') + '</div>';
    var exs = ctx.exercises.filter(function (e) { return filter === 'all' || e.source === filter; });
    h += table(['Exercise', 'Equipment', 'Blocks', 'Min level', 'Groups', 'Unilateral', 'Lifted', 'Springs', 'Muscles', 'Prepares', 'Reps', 'Cues', 'Source'], exs.map(function (e) {
      return ['<b>' + esc(e.name) + '</b>', esc(stationLabel(e.equipment)), esc(e.blocks.join(', ')), String(e.minLevel), esc(e.groups.join(', ')), e.unilateral ? 'Yes' : 'No', String(e.bodyPartsLifted),
        esc(Print.springText(ctx, e) || 'None'), esc(e.primary.join(', ')), esc(e.prepares.join(', ')), esc(e.reps), esc(e.cues.join('; ')), src(e)];
    }));

    h += '<h2>Shorthand <small class="hint">abbreviations.json</small></h2>';
    h += table(['Short', 'Meaning', 'Source'], D.abbreviations.abbreviations.map(function (a) { return ['<b>' + esc(a.short) + '</b>', esc(a.long), src(a)]; }));
    h += '</div>';
    app.innerHTML = h;
  }

  /* ---------- custom peak modal ---------- */
  function addPeakModal() {
    var picked = null;
    var back = modal('<h2>Add my own peak pose</h2><div class="field"><label for="pk-name">Name</label><input id="pk-name" type="text" placeholder="For example, Snake"></div>' +
      '<div class="field"><label for="pk-q">Pick the exercise</label><input id="pk-q" type="search" placeholder="Type to search"></div><div class="pick-list" id="pk-list"></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" id="pk-add" disabled>' + icon('plus') + 'Add peak</button><button type="button" class="btn btn-quiet" data-action="close-modal">Cancel</button></div>');
    var listEl = back.querySelector('#pk-list');
    var q = back.querySelector('#pk-q');
    var nameEl = back.querySelector('#pk-name');
    var addBtn = back.querySelector('#pk-add');
    function draw() {
      var term = q.value.trim().toLowerCase();
      var list = ctx.exercises.filter(function (e) { return !term || e.name.toLowerCase().indexOf(term) >= 0; }).slice(0, 60);
      listEl.innerHTML = list.map(function (e) {
        return '<button type="button" class="pick-item" data-id="' + e.id + '" aria-pressed="' + (picked === e.id) + '">' + img(e.image, '') + '<span><b>' + esc(e.name) + '</b><br><small class="hint">' + esc(stationLabel(e.equipment)) + ', Level ' + e.minLevel + '</small></span></button>';
      }).join('');
    }
    function check() { addBtn.disabled = !(picked && nameEl.value.trim()); }
    listEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('.pick-item');
      if (!b) return;
      picked = b.getAttribute('data-id');
      if (!nameEl.value.trim()) nameEl.value = ctx.byId[picked].name;
      draw(); check();
    });
    q.addEventListener('input', draw);
    nameEl.addEventListener('input', check);
    addBtn.addEventListener('click', function () {
      var e = ctx.byId[picked];
      var gentler = ctx.exercises.filter(function (x) { return x.family === e.family && x.id !== e.id && x.minLevel <= e.minLevel; })
        .sort(function (a, b) { return b.minLevel - a.minLevel; }).map(function (x) { return x.id; });
      var p = { id: S.uid('peak'), name: nameEl.value.trim(), custom: true, image: e.image, versions: [e.id].concat(gentler),
        requires: e.prepares.slice(0, 5), buildUp: [], requiresText: 'Builds up the same patterns as ' + e.name + '.', source: 'jay' };
      S.addCustomPeak(p);
      state.settings.peakId = p.id;
      saveSettings();
      closeModal();
      render();
      toast('Added ' + p.name + '.');
    });
    draw();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-action]');
    if (!t) return;
    var a = t.getAttribute('data-action');
    var s = state.settings;
    switch (a) {
      case 'set': {
        var key = t.getAttribute('data-key');
        var v = t.getAttribute('data-value');
        s[key] = v === '' ? null : v;
        state.ui.error = null;
        saveSettings();
        var y = window.scrollY;
        renderSetup();
        window.scrollTo(0, y);
        break;
      }
      case 'toggle-equip': {
        var id = t.getAttribute('data-id');
        s.equipment = Object.assign({}, s.equipment);
        s.equipment[id] = !s.equipment[id];
        state.ui.error = null;
        saveSettings();
        var y2 = window.scrollY; renderSetup(); window.scrollTo(0, y2);
        break;
      }
      case 'share': {
        var k = t.getAttribute('data-id');
        var cur = Object.assign({}, s.shares || D.equipment.flowRules.defaultShares.value);
        cur[k] = Math.max(0, Math.min(100, Number(cur[k] || 0) + Number(t.getAttribute('data-step'))));
        s.shares = cur;
        saveSettings();
        var y3 = window.scrollY; renderSetup(); window.scrollTo(0, y3);
        break;
      }
      case 'reset-shares': s.shares = null; saveSettings(); renderSetup(); break;
      case 'build': {
        state.ui.building = true;
        state.ui.error = null;
        renderSetup();
        setTimeout(function () {
          var r = doBuild();
          state.ui.building = false;
          if (!r.ok) { state.ui.error = r.errors.join(' '); renderSetup(); return; }
          go('class');
        }, 30);
        break;
      }
      case 'rebuild': {
        var locked = {};
        state.cls.blocks.forEach(function (b) { if (b.locked) locked[b.id] = b; });
        var prevName = state.cls.ui && state.cls.ui.name;
        var r = doBuild({ settings: classSettings(), locked: locked });
        if (!r.ok) { toast(r.errors.join(' ')); return; }
        if (prevName) state.cls.ui.name = null;
        renderClass();
        window.scrollTo(0, 0);
        toast('Here is a new class.');
        break;
      }
      case 'lock': {
        var bi = Number(t.getAttribute('data-bi'));
        state.cls.blocks[bi].locked = !state.cls.blocks[bi].locked;
        S.setCurrent(state.cls);
        var y4 = window.scrollY; renderClass(); window.scrollTo(0, y4);
        break;
      }
      case 'open-swap': {
        var y5 = window.scrollY;
        openSwap(Number(t.getAttribute('data-bi')), Number(t.getAttribute('data-ii')));
        window.scrollTo(0, y5);
        break;
      }
      case 'open-flag': {
        state.ui.panel = { kind: 'flag', bi: Number(t.getAttribute('data-bi')), ii: Number(t.getAttribute('data-ii')) };
        var y6 = window.scrollY; renderClass(); window.scrollTo(0, y6);
        break;
      }
      case 'close-panel': { state.ui.panel = null; var y7 = window.scrollY; renderClass(); window.scrollTo(0, y7); break; }
      case 'use-swap': {
        var p = state.ui.panel;
        var opt = state.ui.swaps[Number(t.getAttribute('data-k'))];
        state.cls = G.applySwap(ctx, state.cls, p.bi, opt.block);
        S.setCurrent(state.cls);
        state.ui.panel = null;
        var y8 = window.scrollY; renderClass(); window.scrollTo(0, y8);
        toast('Swapped in ' + ctx.byId[opt.id].name + '.');
        break;
      }
      case 'flag': {
        var pn = state.ui.panel;
        var item = state.cls.blocks[pn.bi].items[pn.ii];
        var reason = t.getAttribute('data-reason');
        var cs = state.cls.settings;
        var f = S.addFeedback({ exerciseId: item.id, reason: reason, level: cs.level, group: cs.group });
        var hard = REASONS.filter(function (r) { return r.id === reason; })[0].hard;
        var y9 = window.scrollY;
        if (hard) openSwap(pn.bi, pn.ii); else { state.ui.panel = null; renderClass(); }
        window.scrollTo(0, y9);
        toast(hard ? 'Saved. Pick a swap for it below.' : 'Saved. The builder will remember.', function () { S.removeFeedback(f.id); toast('Removed.'); });
        break;
      }
      case 'toast-undo': {
        var el = document.getElementById('toast');
        if (el._undo) el._undo();
        el.classList.remove('show');
        break;
      }
      case 'print': prepareCard(); window.print(); break;
      case 'pdf': prepareCard(); pdfHelp(); break;
      case 'print-now': closeModal(); prepareCard(); setTimeout(function () { window.print(); }, 50); break;
      case 'close-modal': closeModal(); break;
      case 'save-class': {
        var cset = state.cls.settings;
        var pk = state.cls.peak && state.cls.peak.name ? ', ' + state.cls.peak.name : '';
        var suggestion = levelLabel(cset.level) + ' ' + groupLabel(cset.group).toLowerCase() + pk + ', ' + fmtDate(new Date().toISOString());
        var back = modal('<h2>Save class</h2><div class="field"><label for="sv-name">Name</label><input id="sv-name" type="text" value="' + esc(state.cls.ui && state.cls.ui.name || suggestion) + '"></div>' +
          '<div class="btn-row"><button type="button" class="btn btn-primary" id="sv-ok">' + icon('save') + 'Save</button><button type="button" class="btn btn-quiet" data-action="close-modal">Cancel</button></div>');
        var inp = back.querySelector('#sv-name');
        var ok = function () {
          var name = inp.value.trim() || suggestion;
          state.cls.ui = state.cls.ui || {};
          state.cls.ui.name = name;
          var saved = S.saveClass(name, state.cls);
          state.cls.ui.savedId = saved.id;
          S.setCurrent(state.cls);
          closeModal(); renderClass(); toast('Saved as ' + name + '.');
        };
        back.querySelector('#sv-ok').addEventListener('click', ok);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
        break;
      }
      case 'open-saved': {
        var item2 = S.getSaved().filter(function (x) { return x.id === t.getAttribute('data-id'); })[0];
        if (item2) { state.cls = item2.cls; state.cls.ui = Object.assign({}, state.cls.ui, { name: item2.name, savedId: item2.id }); S.setCurrent(state.cls); go('class'); }
        break;
      }
      case 'rename-saved': {
        var sid = t.getAttribute('data-id');
        var cur2 = S.getSaved().filter(function (x) { return x.id === sid; })[0];
        var back2 = modal('<h2>Rename</h2><div class="field"><label for="rn">Name</label><input id="rn" type="text" value="' + esc(cur2.name) + '"></div><div class="btn-row"><button type="button" class="btn btn-primary" id="rn-ok">Save name</button><button type="button" class="btn btn-quiet" data-action="close-modal">Cancel</button></div>');
        var rn = back2.querySelector('#rn');
        var doRename = function () { if (rn.value.trim()) S.renameSaved(sid, rn.value.trim()); closeModal(); renderSaved(); };
        back2.querySelector('#rn-ok').addEventListener('click', doRename);
        rn.addEventListener('keydown', function (e) { if (e.key === 'Enter') doRename(); });
        break;
      }
      case 'delete-saved': {
        var did = t.getAttribute('data-id');
        var cur3 = S.getSaved().filter(function (x) { return x.id === did; })[0];
        var back3 = modal('<h2>Delete this class?</h2><p>' + esc(cur3.name) + ' will be removed from this device.</p><div class="btn-row"><button type="button" class="btn btn-primary" id="del-ok" style="background:var(--danger);border-color:var(--danger)">' + icon('trash') + 'Delete</button><button type="button" class="btn btn-quiet" data-action="close-modal">Keep it</button></div>');
        back3.querySelector('#del-ok').addEventListener('click', function () { S.deleteSaved(did); closeModal(); renderSaved(); toast('Deleted.'); });
        break;
      }
      case 'add-peak': addPeakModal(); break;
      case 'remove-peak': {
        var rid = t.getAttribute('data-id');
        S.deleteCustomPeak(rid);
        if (s.peakId === rid) s.peakId = null;
        saveSettings(); renderSetup();
        break;
      }
      case 'tmin': {
        var bid = t.getAttribute('data-id');
        timingWork.minutes[bid] = Math.max(BLOCK_MIN, Math.min(BLOCK_MAX, Number(timingWork.minutes[bid]) + Number(t.getAttribute('data-step'))));
        var y10 = window.scrollY; renderTimings(); window.scrollTo(0, y10);
        break;
      }
      case 'tpl-use': {
        var savedT = findTemplate(timingWork.id);
        var same = savedT && flow.blocks.every(function (b) { return savedT.minutes[b.id] === timingWork.minutes[b.id]; });
        if (!same) {
          var nt = S.saveTemplate('My timings ' + fmtDate(new Date().toISOString()), Object.assign({}, timingWork.minutes));
          timingWork = { id: nt.id, name: nt.name, custom: true, minutes: Object.assign({}, nt.minutes) };
        }
        s.timingId = timingWork.id; saveSettings();
        toast('Your next class will use ' + timingWork.name + '.');
        renderTimings();
        break;
      }
      case 'tpl-update': S.updateTemplate(timingWork.id, Object.assign({}, timingWork.minutes)); toast('Saved.'); renderTimings(); break;
      case 'tpl-saveas': {
        var back4 = modal('<h2>Save timings</h2><div class="field"><label for="tn">Name</label><input id="tn" type="text" placeholder="For example, Long warm-up"></div><div class="btn-row"><button type="button" class="btn btn-primary" id="tn-ok">' + icon('save') + 'Save</button><button type="button" class="btn btn-quiet" data-action="close-modal">Cancel</button></div>');
        var tn = back4.querySelector('#tn');
        var doSave = function () {
          var nt2 = S.saveTemplate(tn.value.trim() || 'My timings', Object.assign({}, timingWork.minutes));
          timingWork = { id: nt2.id, name: nt2.name, custom: true, minutes: Object.assign({}, nt2.minutes) };
          closeModal(); renderTimings(); toast('Saved ' + nt2.name + '.');
        };
        back4.querySelector('#tn-ok').addEventListener('click', doSave);
        tn.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSave(); });
        break;
      }
      case 'tpl-default': S.setDefaultTemplate(timingWork.id); s.timingId = 'auto'; saveSettings(); toast(timingWork.name + ' is now your default.'); renderTimings(); break;
      case 'tpl-clear-default': S.setDefaultTemplate(null); renderTimings(); break;
      case 'tpl-delete': {
        S.deleteTemplate(timingWork.id);
        if (s.timingId === timingWork.id) { s.timingId = 'auto'; saveSettings(); }
        timingWork = null; renderTimings(); toast('Deleted.');
        break;
      }
      case 'export-feedback': exportFeedback(); break;
      case 'unflag': S.removeFeedback(t.getAttribute('data-id')); renderFeedback(); toast('Removed.'); break;
      case 'rules-filter': state.ui.rulesFilter = t.getAttribute('data-f'); renderRules(); break;
    }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    var a = t.getAttribute('data-action');
    if (a === 'toggle-lower') { state.settings.allowLower = t.checked; saveSettings(); }
    if (a === 'timing-select') { state.settings.timingId = t.value; saveSettings(); state.ui.moreOpen = true; renderSetup(); }
    if (a === 'tpl-pick') {
      var tp = findTemplate(t.value);
      timingWork = { id: tp.id, name: tp.name, custom: tp.custom, minutes: Object.assign({}, tp.minutes) };
      renderTimings();
    }
  });
  document.addEventListener('toggle', function (ev) {
    if (ev.target.matches && ev.target.matches('details[data-more]')) state.ui.moreOpen = ev.target.open;
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeModal(); });

  window.addEventListener('hashchange', function () { state.ui.panel = null; if (currentRoute() !== 'timings') timingWork = null; render(); window.scrollTo(0, 0); });
  render();
})();
