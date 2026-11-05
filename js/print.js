/* Cue card: builds the fold-in-half card and shrinks it to fit one sheet.
   Shared by the app (window.PCB.Print) and the sample builder (require in Node). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.PCB = root.PCB || {}; root.PCB.Print = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtMin(m) { return (m % 1 === 0 ? String(m) : String(m).replace('.5', '½')) + ' min'; }

  function springText(ctx, ex) {
    var station = ctx.stations[ex.equipment];
    var sp = station && station.springIndex[ex.springs];
    if (!sp || ex.springs === 'none') return '';
    return sp.colors ? sp.label + ', ' + sp.colors : sp.label;
  }

  function stationLabel(ctx, id) { return ctx.stations[id] ? ctx.stations[id].label : id; }

  /* The section a block belongs to (Warm up, Strength and tone, ...), or null for old classes. */
  function sectionOf(ctx, cls, blockId) {
    var ct = ctx.classTypes[(cls.settings && cls.settings.classType) || 'flow'];
    var list = (ct && ct.sections) || [];
    return list.filter(function (s) { return s.blocks.indexOf(blockId) >= 0; })[0] || null;
  }

  /* Split blocks so the left half is about the first half of class. */
  function splitIndex(cls) {
    var mins = cls.blocks.map(function (b) { return b.items.reduce(function (a, it) { return a + it.minutes; }, 0); });
    var total = mins.reduce(function (a, b) { return a + b; }, 0);
    var best = 1, bestDiff = Infinity, run = 0;
    for (var k = 1; k < cls.blocks.length; k++) {
      run += mins[k - 1];
      var rowsL = 0, rowsR = 0;
      cls.blocks.forEach(function (b, i) { if (i < k) rowsL += b.items.length + 1; else rowsR += b.items.length + 1; });
      rowsL += 2; rowsR += 2; // section headers, roughly two per half
      var diff = Math.abs(run - total / 2) + Math.abs(rowsL - (rowsR + 3)) * 0.4;
      if (diff < bestDiff) { bestDiff = diff; best = k; }
    }
    return best;
  }

  function usedAbbreviations(ctx, cls) {
    var text = [];
    cls.blocks.forEach(function (b) { b.items.forEach(function (it) { var e = ctx.byId[it.id]; if (e) text.push(e.cues.join(' | '), e.reps); }); });
    var all = text.join(' | ');
    var abbr = ctx.data.abbreviations.abbreviations;
    return abbr.filter(function (a) {
      if (a.short === 'x') return /(^|[^A-Za-z])x\d/.test(all);
      var s = a.short.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
      return new RegExp('(^|[^A-Za-z])' + s + '(?![A-Za-z])').test(all);
    });
  }

  function cardHTML(ctx, cls, info) {
    info = info || {};
    var imgBase = info.imageBase || 'images/';
    var level = ctx.levels[cls.settings.level];
    var group = ctx.groups[cls.settings.group];
    var k = splitIndex(cls);
    var minuteAt = 0;
    var blockStart = cls.blocks.map(function (b) { var s = minuteAt; minuteAt += b.minutes; return s; });
    var secs = cls.blocks.map(function (b) { return sectionOf(ctx, cls, b.id); });
    // old classes from before the four sections have blocks that are not in any section
    if (secs.some(function (x) { return !x; })) secs = cls.blocks.map(function () { return null; });

    function sectionHTML(bi, colStart) {
      var sec = secs[bi];
      if (!sec) return '';
      var isNew = bi === 0 || secs[bi - 1] !== sec;
      if (!isNew && !colStart) return '';
      var mins = cls.blocks.reduce(function (a, b, i) { return a + (secs[i] === sec ? b.minutes : 0); }, 0);
      return '<div class="card-sec"><span>' + esc(sec.label) + (isNew ? '' : ', continued') + '</span><span>' + esc(fmtMin(mins)) + '</span></div>';
    }

    function blockHTML(b, bi, colStart) {
      var h = sectionHTML(bi, colStart) + '<div class="card-block"><div class="card-bh"><span>' + (bi + 1) + '. ' + esc(b.label) + '</span><span>' +
        esc(fmtMin(b.minutes)) + ', ' + esc(stationLabel(ctx, b.station)) + '</span></div>';
      b.items.forEach(function (it) {
        var e = ctx.byId[it.id];
        if (!e) return;
        var sp = springText(ctx, e);
        var meta = sp ? 'Springs: ' + sp : '';
        h += '<div class="cx' + (it.isPeak ? ' peak' : '') + '">' +
          '<img src="' + esc(imgBase + e.image) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(imgBase) + 'placeholder.svg\'">' +
          '<div><div class="cx-top"><b>' + esc(e.name) + '</b><span class="cx-time">' + esc(fmtMin(it.minutes)) + ', ' + esc(e.reps) + '</span></div>' +
          (meta ? '<div class="cx-meta">' + esc(meta) + '</div>' : '') +
          '<div class="cx-cues">' + e.cues.map(esc).join('; ') + '</div></div></div>';
      });
      return h + '</div>';
    }

    var peakLine = '';
    if (cls.peak && cls.peak.exerciseId) {
      var pe = ctx.byId[cls.peak.exerciseId];
      peakLine = 'Peak: ' + esc(cls.peak.name) + (pe && pe.name !== cls.peak.name ? ' (' + esc(pe.name) + ')' : '');
    }
    var title = info.name ? esc(info.name) : 'Flow class';
    var left = '<div class="card-head"><div class="card-title">' + title + '</div><div class="card-sub">' +
      esc(level.label) + ', ' + esc(group.label.toLowerCase()) + ' clients, 50 min' + (peakLine ? '. ' + peakLine : '') + '</div></div>';
    cls.blocks.slice(0, k).forEach(function (b, i) { left += blockHTML(b, i, i === 0); });

    var right = '<div class="card-head"><div class="card-title">Second half</div><div class="card-sub">From minute ' +
      blockStart[k] + '. ' + (cls.stats ? cls.stats.equipmentChanges + ' equipment changes, ' + cls.stats.springChanges + ' spring changes' : '') + '</div></div>';
    cls.blocks.slice(k).forEach(function (b, i) { right += blockHTML(b, i + k, i === 0); });

    var abbr = usedAbbreviations(ctx, cls);
    var springKey = ctx.data.abbreviations.springKey.value;
    var advice = group.rules.springAdvice ? group.rules.springAdvice.value : '';
    right += '<div class="card-key"><b>Key.</b> ' + abbr.map(function (a) { return '<b>' + esc(a.short) + '</b> ' + esc(a.long); }).join('; ') +
      '. ' + esc(springKey) + (advice ? ' ' + esc(advice) : '') + '</div>';

    return '<div class="card-page"><div class="card"><div class="card-col">' + left + '</div><div class="card-fold"></div><div class="card-col">' + right + '</div></div></div>';
  }

  /* Shrink type and thumbnails until both halves fit. Runs in a browser. */
  function fit(rootEl) {
    var card = rootEl.querySelector('.card');
    if (!card) return 1;
    var cols = card.querySelectorAll('.card-col');
    var s = 1;
    for (var i = 0; i < 40; i++) {
      card.style.setProperty('--s', s.toFixed(2));
      var over = false;
      for (var c = 0; c < cols.length; c++) if (cols[c].scrollHeight > cols[c].clientHeight + 1) over = true;
      if (!over || s <= 0.55) break;
      s -= 0.025;
    }
    return s;
  }

  function render(ctx, cls, info) {
    var rootEl = document.getElementById('print-root');
    rootEl.innerHTML = cardHTML(ctx, cls, info);
    return fit(rootEl);
  }

  return { sectionOf: sectionOf, cardHTML: cardHTML, fit: fit, render: render, splitIndex: splitIndex, usedAbbreviations: usedAbbreviations, springText: springText, fmtMin: fmtMin, esc: esc };
});
