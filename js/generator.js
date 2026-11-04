/* Pilates Class Builder: class generator.
   Works in the browser (window.PCBGenerator) and in Node (require) for tests.
   Every rule comes from the data files. This file only applies them. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PCBGenerator = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FLEX_ORDER = { none: 0, light: 1, deep: 2 };
  var EXEMPT_LOWER = ['footwork', 'stretch', 'winddown'];

  function val(rule) {
    return rule && typeof rule === 'object' && Object.prototype.hasOwnProperty.call(rule, 'value') ? rule.value : rule;
  }
  function makeRand(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function round05(x) { return Math.round(x * 2) / 2; }
  function sum(arr) { var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i]; return s; }
  function levelLabel(rank) { return 'Level ' + rank; }

  /* ---------- context ---------- */
  function prepare(data) {
    var ctx = { data: data };
    ctx.exercises = data.exercises.exercises;
    ctx.byId = {};
    ctx.exercises.forEach(function (e) { ctx.byId[e.id] = e; });
    ctx.levels = {};
    data.levels.levels.forEach(function (l) { ctx.levels[l.id] = l; });
    ctx.levelList = data.levels.levels;
    ctx.groups = {};
    data['client-groups'].groups.forEach(function (g) { ctx.groups[g.id] = g; });
    ctx.groupList = data['client-groups'].groups;
    ctx.classTypes = {};
    data['class-types'].classTypes.forEach(function (c) { ctx.classTypes[c.id] = c; });
    ctx.stations = {};
    data.equipment.stations.forEach(function (s) {
      ctx.stations[s.id] = s;
      s.springIndex = {};
      s.springs.forEach(function (sp) { s.springIndex[sp.id] = sp; });
    });
    ctx.flow = data.equipment.flowRules;
    ctx.checkboxes = data.equipment.checkboxes;
    ctx.peaks = data['peak-poses'].peaks;
    ctx.peakById = {};
    ctx.peaks.forEach(function (p) { ctx.peakById[p.id] = p; });
    return ctx;
  }

  function defaultEquipment(ctx) {
    var eq = {};
    ctx.checkboxes.forEach(function (c) { eq[c.id] = !!c.default; });
    return eq;
  }

  function templateFor(ctx, classTypeId, groupId) {
    var ct = ctx.classTypes[classTypeId];
    var wanted = val(ctx.groups[groupId].rules.timingTemplate);
    var t = ct.timingTemplates.filter(function (x) { return x.id === wanted; })[0] || ct.timingTemplates[0];
    return t;
  }

  function normalize(ctx, s) {
    s = s || {};
    var classType = ctx.classTypes[s.classType || 'flow'];
    var level = ctx.levels[String(s.level || '1')];
    var group = ctx.groups[s.group || val(ctx.data['client-groups'].defaultGroup)];
    var timing = s.timing || templateFor(ctx, classType.id, group.id).minutes;
    var equipment = Object.assign(defaultEquipment(ctx), s.equipment || {});
    return {
      classType: classType.id,
      level: level.id,
      group: group.id,
      peakId: s.peakId || null,
      equipment: equipment,
      shares: s.shares || null,
      allowLower: s.allowLower !== false,
      timing: timing,
      timingName: s.timingName || '',
      feedback: s.feedback || [],
      customPeaks: s.customPeaks || []
    };
  }

  function rulesFor(ctx, st) {
    var L = ctx.levels[st.level].rules;
    var G = ctx.groups[st.group].rules;
    var W = ctx.classTypes[st.classType].scoring;
    return {
      levelRank: ctx.levels[st.level].rank,
      maxLifted: val(L.maxBodyPartsLifted),
      allowUni: val(L.allowUnilateral),
      maxChair: val(L.maxChairMinutes),
      allowInv: !!(val(L.allowInversions) && val(G.allowInversions)),
      maxFlex: FLEX_ORDER[val(G.maxSpinalFlexion)],
      maxFloor: val(G.maxFloorVisits),
      pace: val(G.paceFactor),
      bias: val(G.challengeBias),
      levelGap: (W.levelGap || {})[st.group] || 0.8,
      boxMin: val(ctx.flow.boxMinMinutes),
      minSegment: val(ctx.flow.minSegmentMinutes),
      W: W
    };
  }

  function stationAvailable(st, stationId) {
    var e = st.equipment;
    switch (stationId) {
      case 'reformer': return !!e.reformer;
      case 'box': return !!(e.box && e.reformer);
      case 'chair': return !!e.chair;
      case 'mat': return !!e.mat;
      case 'bosu': return !!e.bosu;
      case 'springboard': return !!e.springboard;
      case 'standing': return true;
      default: return false;
    }
  }

  function levelRankOf(ctx, id) { return ctx.levels[String(id)] ? ctx.levels[String(id)].rank : Number(id); }

  /* Feedback that is a hard rule. Returns a plain reason or null. */
  function feedbackBlock(ctx, st, ex) {
    var rank = ctx.levels[st.level].rank;
    for (var i = 0; i < st.feedback.length; i++) {
      var f = st.feedback[i];
      if (f.exerciseId !== ex.id) continue;
      if (f.reason === 'unsafe') return 'Jay marked it unsafe';
      if (f.reason === 'wrong-level' && rank <= levelRankOf(ctx, f.level)) return 'Jay marked it the wrong level';
      if (f.reason === 'too-hard' && f.group === st.group && rank <= levelRankOf(ctx, f.level)) return 'Jay marked it too hard for these clients';
    }
    return null;
  }

  /* Every hard rule for a single exercise. Returns null if allowed, else a plain reason. */
  function hardCheck(ctx, st, R, ex) {
    if (ex.minLevel > R.levelRank) return 'It is a ' + levelLabel(ex.minLevel) + ' exercise';
    if (ex.groups.indexOf(st.group) < 0) return 'It is not suited to ' + ctx.groups[st.group].label.toLowerCase() + ' clients';
    if (ex.bodyPartsLifted > R.maxLifted) return 'It lifts more of the body than ' + levelLabel(R.levelRank) + ' allows';
    if (ex.unilateral && !R.allowUni) return 'Single leg or single arm work is not used at ' + levelLabel(R.levelRank);
    if (ex.equipment === 'chair' && R.maxChair === 0) return 'There is no chair at ' + levelLabel(R.levelRank);
    if (ex.inversion && !R.allowInv) return 'It goes upside down';
    if (FLEX_ORDER[ex.spinalFlexion] > R.maxFlex) return 'It is a deep loaded curl';
    if (!stationAvailable(st, ex.equipment)) return 'It needs the ' + (ex.equipment === 'box' ? 'reformer and long box' : ex.equipment);
    if (ex.props.length && !st.equipment.props) return 'It needs small props';
    var fb = feedbackBlock(ctx, st, ex);
    if (fb) return fb;
    return null;
  }

  function softFeedback(st) {
    var soft = { dislike: {}, overused: {} };
    st.feedback.forEach(function (f) {
      if (f.reason === 'dislike') soft.dislike[f.exerciseId] = (soft.dislike[f.exerciseId] || 0) + 1;
      if (f.reason === 'overused') soft.overused[f.exerciseId] = (soft.overused[f.exerciseId] || 0) + 1;
    });
    return soft;
  }

  function findPeak(ctx, st) {
    if (!st.peakId) return null;
    var p = ctx.peakById[st.peakId];
    if (!p) p = st.customPeaks.filter(function (c) { return c.id === st.peakId; })[0];
    return p || null;
  }

  /* Pick the first allowed version of the peak. Explains in plain words when it had to step down. */
  function resolvePeak(ctx, st, R, peak, skip) {
    if (!peak) return { peak: null, exercise: null, message: '' };
    skip = skip || 0;
    var first = ctx.byId[peak.versions[0]];
    var firstReason = first ? hardCheck(ctx, st, R, first) : 'It is missing from the library';
    if (!firstReason && skip > 0) firstReason = 'It does not fit with this equipment and the long box and chair limits';
    var allowedSeen = 0;
    for (var i = 0; i < peak.versions.length; i++) {
      var ex = ctx.byId[peak.versions[i]];
      if (!ex) continue;
      if (!hardCheck(ctx, st, R, ex) && allowedSeen++ >= skip) {
        var msg = '';
        if (i > 0) {
          msg = peak.name + ' is not a fit here (' + firstReason.charAt(0).toLowerCase() + firstReason.slice(1) +
            '). The class builds to ' + ex.name + ' instead, the closest safe version for ' + levelLabel(R.levelRank) + ', ' +
            ctx.groups[st.group].label.toLowerCase() + ' clients.';
        }
        return { peak: peak, exercise: ex, message: msg, stepDown: i > 0 };
      }
    }
    return { peak: peak, exercise: null, message: 'No version of ' + peak.name + ' fits ' + levelLabel(R.levelRank) + ' with this equipment, so this class has no peak pose.' };
  }

  /* ---------- environment ---------- */
  function makeEnv(ctx, settings, opts) {
    opts = opts || {};
    var st = normalize(ctx, settings);
    var R = rulesFor(ctx, st);
    var ct = ctx.classTypes[st.classType];
    var env = {
      ctx: ctx, st: st, R: R, W: R.W, ct: ct,
      rand: makeRand(opts.seed || (Date.now() % 2147483647)),
      soft: softFeedback(st),
      recent: new Set(opts.recent || []),
      messages: [],
      errors: []
    };
    env.blocks = ct.blocks.map(function (b) {
      return { id: b.id, label: b.label, minutes: Number(st.timing[b.id]) };
    });
    env.total = val(ct.minutes);
    var t = sum(env.blocks.map(function (b) { return b.minutes; }));
    if (Math.abs(t - env.total) > 1e-9) {
      env.errors.push('The block timings add up to ' + t + ' minutes. They need to add up to ' + env.total + '.');
    }
    env.peakBlockIndex = ct.blocks.map(function (b) { return b.id; }).indexOf(val(ct.peakBlock));
    var pr = resolvePeak(ctx, st, R, findPeak(ctx, st), opts.peakSkip || 0);
    env.peakExhausted = !!(pr.peak && !pr.exercise && (opts.peakSkip || 0) > 0);
    env.peak = pr.exercise ? pr.peak : null;
    env.peakEx = pr.exercise;
    env.peakRequested = pr.peak;
    if (pr.message) env.messages.push(pr.message);

    // candidates per block and station
    env.stationIds = Object.keys(ctx.stations).filter(function (s) { return stationAvailable(st, s); });
    var eligible = ctx.exercises.filter(function (e) { return !hardCheck(ctx, st, R, e); });
    env.eligible = eligible;
    env.eligibleSet = new Set(eligible.map(function (e) { return e.id; }));
    env.cand = env.blocks.map(function (b) {
      var strict = !st.allowLower && EXEMPT_LOWER.indexOf(b.id) < 0;
      var make = function (useStrict) {
        var byStation = {};
        env.stationIds.forEach(function (s) {
          byStation[s] = eligible.filter(function (e) {
            if (e.equipment !== s || (env.peakEx && e.id === env.peakEx.id)) return false;
            if (useStrict && e.minLevel < R.levelRank) return false;
            if (e.blocks.indexOf(b.id) >= 0) return true;
            // the peak block may also use anything on the peak's equipment that prepares the peak
            return isPeakPrep(env, b.id, e);
          });
        });
        return byStation;
      };
      var c = make(strict);
      if (strict) {
        var any = env.stationIds.some(function (s) { return capacity(c[s]) >= b.minutes * 0.999; });
        if (!any) {
          c = make(false);
          env.messages.push('There were not enough ' + levelLabel(R.levelRank) + ' exercises for ' + b.label.toLowerCase() + ', so a few easier ones are included.');
        }
      }
      return c;
    });

    // blocks that need floor time on a station: the mat, or not enough off-the-floor options to fill the minutes
    env.floorOnly = env.cand.map(function (byStation, bi) {
      var out = {};
      env.stationIds.forEach(function (sid) {
        var list = byStation[sid];
        var peakHere = bi === env.peakBlockIndex && env.peakEx && env.peakEx.equipment === sid;
        if (sid === 'mat' || (peakHere && env.peakEx.floor)) { out[sid] = true; return; }
        var off = capacity(list.filter(function (e) { return !e.floor; })) + (peakHere ? env.peakEx.minutes.max : 0);
        out[sid] = list.length > 0 && off < env.blocks[bi].minutes * 0.999;
      });
      return out;
    });

    // locked blocks from the previous class
    env.locked = {};
    var locked = opts.locked || {};
    Object.keys(locked).forEach(function (bid) {
      var bi = env.blocks.map(function (b) { return b.id; }).indexOf(bid);
      var lb = locked[bid];
      if (bi < 0 || !lb) return;
      var problem = null;
      if (Math.abs(sum(lb.items.map(function (i) { return i.minutes; })) - env.blocks[bi].minutes) > 1e-9) problem = 'its minutes changed';
      lb.items.forEach(function (it) {
        var ex = ctx.byId[it.id];
        if (!ex) { problem = 'an exercise is missing'; return; }
        var r = hardCheck(ctx, st, R, ex);
        if (r) problem = ex.name + ': ' + r.toLowerCase();
        if (it.isPeak && (!env.peakEx || env.peakEx.id !== it.id)) problem = 'the peak pose changed';
      });
      if (bi === env.peakBlockIndex && env.peakEx && !lb.items.some(function (it) { return it.id === env.peakEx.id; })) problem = 'the peak pose changed';
      if (problem) env.messages.push('The ' + env.blocks[bi].label.toLowerCase() + ' block was unlocked because ' + problem + '.');
      else env.locked[bi] = lb;
    });
    return env;
  }

  function isPeakPrep(env, blockId, e) {
    if (!env.peak || !env.peakEx || blockId !== val(env.ct.peakBlock) || e.equipment !== env.peakEx.equipment) return false;
    // only borrow working exercises, not warm-ups, bridges or stretches
    var working = ['abs', 'lower', 'upper', 'side', 'prone', 'full'];
    if (!e.blocks.some(function (b) { return working.indexOf(b) >= 0; })) return false;
    var req = env.peak.requires || [];
    return e.prepares.some(function (t) { return req.indexOf(t) >= 0; });
  }

  function capacity(list) { return sum(list.map(function (e) { return e.minutes.max; })); }

  function shareKey(stationId) { return stationId === 'box' ? 'reformer' : stationId; }

  function shareTargets(env) {
    var st = env.st, R = env.R;
    var base = st.shares || val(env.ctx.flow.defaultShares);
    var usable = {};
    ['reformer', 'chair', 'mat', 'bosu', 'springboard'].forEach(function (k) {
      if (!stationAvailable(st, k)) return;
      if (k === 'chair' && R.maxChair === 0) return;
      usable[k] = Number(base[k] || 0);
    });
    var tot = sum(Object.keys(usable).map(function (k) { return usable[k]; }));
    if (tot <= 0) return null;
    Object.keys(usable).forEach(function (k) { usable[k] = usable[k] / tot; });
    return usable;
  }

  /* ---------- equipment plans ---------- */
  function feasibleStations(env) {
    return env.blocks.map(function (b, bi) {
      if (env.locked[bi]) return [env.locked[bi].station];
      return env.stationIds.filter(function (s) {
        var list = env.cand[bi][s];
        if (bi === env.peakBlockIndex && env.peakEx) {
          if (s !== env.peakEx.equipment) return false;
          return env.peakEx.minutes.max + capacity(list) >= b.minutes * 0.999;
        }
        return list.length > 0 && capacity(list) >= b.minutes * 0.999;
      });
    });
  }

  function planScore(env, plan, targets, why) {
    var W = env.W, R = env.R, blocks = env.blocks;
    var s = 0;
    // segments
    var segs = [];
    plan.forEach(function (st, i) {
      if (i > 0 && plan[i - 1] === st) segs[segs.length - 1].minutes += blocks[i].minutes;
      else segs.push({ station: st, minutes: blocks[i].minutes, start: i });
    });
    // equipment changes, ignoring standing in between
    var nonStanding = segs.filter(function (g) { return g.station !== 'standing'; });
    for (var i = 1; i < segs.length; i++) {
      var a = segs[i - 1].station, b = segs[i].station;
      if (a === 'standing' || b === 'standing') s += W.standingHop;
    }
    for (var j = 1; j < nonStanding.length; j++) {
      var x = nonStanding[j - 1].station, y = nonStanding[j].station;
      if (x === y) continue;
      // putting the box on or taking it off is a setup change on the same machine
      var boxSwap = (x === 'box' && y === 'reformer') || (x === 'reformer' && y === 'box');
      s += (boxSwap ? (W.boxSetupChange || W.equipmentChange) : W.equipmentChange) * R.pace;
    }
    // short hops
    var merged = [];
    nonStanding.forEach(function (g) {
      if (merged.length && merged[merged.length - 1].station === g.station) merged[merged.length - 1].minutes += g.minutes;
      else merged.push({ station: g.station, minutes: g.minutes });
    });
    merged.forEach(function (g) {
      if (g.minutes < R.minSegment) s += W.shortHopPerMinute * (R.minSegment - g.minutes);
    });
    // box minimum (hard) and chair cap (hard), mat floor visits (hard for older)
    var boxOk = merged.every(function (g) { return g.station !== 'box' || g.minutes >= R.boxMin; });
    if (!boxOk) { if (why) why.box = (why.box || 0) + 1; return Infinity; }
    var chairMin = sum(segs.filter(function (g) { return g.station === 'chair'; }).map(function (g) { return g.minutes; }));
    if (R.maxChair !== null && R.maxChair !== undefined && chairMin > R.maxChair) { if (why) why.chair = (why.chair || 0) + 1; return Infinity; }
    // blocks that can only be done on the floor; standing up in between means getting down again
    var floorRunsCount = 0, inFloor = false;
    plan.forEach(function (st, i) {
      var isFloor = st === 'mat' || !!(env.floorOnly && env.floorOnly[i][st]);
      if (env.locked[i]) isFloor = env.locked[i].items.every(function (it) { var e = env.ctx.byId[it.id]; return e && e.floor; });
      if (isFloor && !inFloor) floorRunsCount++;
      inFloor = isFloor;
    });
    if (floorRunsCount > R.maxFloor) { if (why) why.floor = (why.floor || 0) + 1; return Infinity; }
    // shares
    if (targets) {
      var mins = {};
      segs.forEach(function (g) { var k = shareKey(g.station); mins[k] = (mins[k] || 0) + g.minutes; });
      var dev = 0;
      var tol = W.shareTolerance || 0;
      Object.keys(targets).forEach(function (k) { dev += Math.max(0, Math.abs((mins[k] || 0) / env.total - targets[k]) - tol); });
      s += W.shareDeviation * dev;
    }
    return s;
  }

  function enumeratePlans(env) {
    var feas = feasibleStations(env);
    var empty = [];
    feas.forEach(function (f, i) { if (!f.length) empty.push(env.blocks[i].label); });
    if (empty.length) return { plans: [], empty: empty };
    var maxSeg = env.W.maxSegments || 5;
    var plans = [];
    var cur = [];
    var nodes = 0;
    var LIMIT = 400000;
    var R = env.R, blocks = env.blocks;
    function rec(i, segs, boxRun) {
      if (nodes++ > LIMIT) return;
      if (i === blocks.length) {
        if (boxRun > 0 && boxRun < R.boxMin) return;
        plans.push(cur.slice());
        return;
      }
      var opts = feas[i];
      for (var k = 0; k < opts.length; k++) {
        var s = opts[k];
        var switching = i > 0 && cur[i - 1] !== s;
        var ns = i === 0 ? 1 : segs + (switching ? 1 : 0);
        if (ns > maxSeg) continue;
        // leaving the box too early
        if (switching && cur[i - 1] === 'box' && s !== 'standing' && boxRun < R.boxMin) continue;
        var nb = s === 'box' ? boxRun + blocks[i].minutes : (s === 'standing' ? boxRun : 0);
        cur.push(s);
        rec(i + 1, ns, nb);
        cur.pop();
      }
    }
    rec(0, 0, 0);
    return { plans: plans, empty: [] };
  }

  /* ---------- filling blocks ---------- */
  function springWeight(env, ex) {
    var station = env.ctx.stations[ex.equipment];
    var sp = station && station.springIndex[ex.springs];
    return sp ? sp.weight : 0;
  }

  function timeFor(env, ex) {
    return clamp(round05(ex.minutes.typical * env.R.pace), ex.minutes.min, ex.minutes.max);
  }

  function pickScore(env, ex, last, chosen, bi, state) {
    var W = env.W, R = env.R;
    var s = env.rand() * W.variety;
    if (last && last.equipment === ex.equipment && last.springs !== ex.springs) {
      var drop = springWeight(env, ex) < springWeight(env, last);
      s -= W.springChange * (drop ? W.springDropFactor : 1);
    }
    s -= W.familyRepeat * (state.family[ex.family] || 0);
    if (chosen.some(function (c) { return c.family === ex.family; })) s -= W.familyRepeat;
    var prev = chosen.slice(-2);
    if (last && prev.indexOf(last) < 0) prev.push(last);
    prev.forEach(function (p) {
      ex.primary.forEach(function (m) { if (p.primary.indexOf(m) >= 0) s -= W.muscleRepeat; });
    });
    if (env.peak && bi < env.peakBlockIndex) {
      var req = env.peak.requires || [];
      if (req.length) {
        var ov = ex.prepares.filter(function (t) { return req.indexOf(t) >= 0; }).length / req.length;
        var progress = (bi + 1) / env.peakBlockIndex;
        s += W.peakPrep * ov * (0.5 + progress);
      }
      var bu = (env.peak.buildUp || []).indexOf(ex.id);
      if (bu >= 0) s += W.buildUp * (bu >= state.buildUpIndex ? 1 : 0.3);
    }
    s -= (R.levelRank - ex.minLevel) * R.levelGap;
    s += R.bias * ((ex.intensity || 1) - 1.5) * W.challenge;
    s -= W.dislike * (env.soft.dislike[ex.id] || 0);
    s -= W.overused * (env.soft.overused[ex.id] || 0);
    if (env.recent.has(ex.id)) s -= W.recent;
    if (ex.usesStraps && state.straps >= W.strapLimit) s -= W.strapOver;
    return s;
  }

  function choose(env, scored) {
    scored.sort(function (a, b) { return b.s - a.s; });
    var top = scored.slice(0, 3);
    var base = top[0].s;
    var weights = top.map(function (t) { return Math.exp((t.s - base) / 1.2); });
    var r = env.rand() * sum(weights);
    for (var i = 0; i < top.length; i++) { r -= weights[i]; if (r <= 0) return top[i].e; }
    return top[0].e;
  }

  function allocate(env, items, M) {
    var mins = items.map(function (e) { return timeFor(env, e); });
    var guard = 0;
    var total = sum(mins);
    while (Math.abs(total - M) > 1e-9 && guard++ < 400) {
      var best = -1, bestRatio;
      for (var i = 0; i < items.length; i++) {
        var e = items[i], r = mins[i] / e.minutes.typical;
        if (total < M && mins[i] + 0.5 <= e.minutes.max + 1e-9) {
          if (best < 0 || r < bestRatio) { best = i; bestRatio = r; }
        } else if (total > M && mins[i] - 0.5 >= e.minutes.min - 1e-9) {
          if (best < 0 || r > bestRatio) { best = i; bestRatio = r; }
        }
      }
      if (best < 0) return null;
      mins[best] += total < M ? 0.5 : -0.5;
      total = sum(mins);
    }
    return Math.abs(total - M) < 1e-9 ? mins : null;
  }

  function orderBlock(env, items, prevItem, peakEx) {
    var prevFloor = !!(prevItem && prevItem.floor);
    var peak = peakEx && items.indexOf(peakEx) >= 0 ? peakEx : null;
    var rest = items.filter(function (e) { return e !== peak; });
    var prevSpring = prevItem ? prevItem.springs : null;
    var prevStation = prevItem ? prevItem.equipment : null;
    rest.sort(function (a, b) {
      // keep floor work together: next to the peak if there is one, else next to the previous block
      var fa = peak ? (a.floor === peak.floor ? 1 : 0) : (a.floor === prevFloor ? 0 : 1);
      var fb = peak ? (b.floor === peak.floor ? 1 : 0) : (b.floor === prevFloor ? 0 : 1);
      if (fa !== fb) return fa - fb;
      var ma = a.equipment === prevStation && a.springs === prevSpring ? 0 : 1;
      var mb = b.equipment === prevStation && b.springs === prevSpring ? 0 : 1;
      if (ma !== mb) return ma - mb;
      var wa = springWeight(env, a), wb = springWeight(env, b);
      if (wa !== wb) return wb - wa;
      return a.springs < b.springs ? -1 : a.springs > b.springs ? 1 : 0;
    });
    if (peak) rest.push(peak);
    return rest;
  }

  function floorRuns(items) {
    var runs = 0, inRun = false;
    items.forEach(function (e) {
      if (e.floor && !inRun) runs++;
      inRun = !!e.floor;
    });
    return runs;
  }

  function fillPlan(env, plan) {
    var ctx = env.ctx, R = env.R;
    var floorPlan = plan.map(function (st, i) { return st === 'mat' || !!env.floorOnly[i][st]; });
    var planRuns = 0;
    floorPlan.forEach(function (f, i) { if (f && !(i > 0 && floorPlan[i - 1])) planRuns++; });
    var used = new Set();
    var state = { family: {}, straps: 0, buildUpIndex: 0, floorRuns: 0 };
    Object.keys(env.locked).forEach(function (bi) {
      env.locked[bi].items.forEach(function (it) { used.add(it.id); });
    });
    var out = [];
    var prevItem = null;
    var all = [];
    for (var bi = 0; bi < env.blocks.length; bi++) {
      var b = env.blocks[bi];
      var station = plan[bi];
      var items;
      if (env.locked[bi]) {
        items = env.locked[bi].items.map(function (it) { return ctx.byId[it.id]; });
        var mins = env.locked[bi].items.map(function (it) { return it.minutes; });
        out.push({ id: b.id, label: b.label, minutes: b.minutes, station: station, locked: true, items: items.map(function (e, k) { return { id: e.id, minutes: mins[k], isPeak: !!env.locked[bi].items[k].isPeak }; }) });
      } else {
        var peakHere = bi === env.peakBlockIndex && env.peakEx ? env.peakEx : null;
        var pool = env.cand[bi][station].filter(function (e) { return !used.has(e.id); });
        var chosen = [];
        var last = prevItem;
        var reserved = peakHere ? timeFor(env, peakHere) : 0;
        var filled = reserved;
        var lastFloor = !!(prevItem && prevItem.floor);
        var tries = 0;
        var result = null;
        while (tries++ < 12) {
          while (filled < b.minutes - 0.25) {
            var blockHasFloor = chosen.some(function (c) { return c.floor; }) || (peakHere && peakHere.floor);
            var opts = pool.filter(function (e) {
              if (chosen.indexOf(e) >= 0) return false;
              if (e.floor && !blockHasFloor && !lastFloor && state.floorRuns >= R.maxFloor) return false;
              // save the floor visits for the blocks that need them
              if (e.floor && !floorPlan[bi] && planRuns >= R.maxFloor && !(lastFloor && bi > 0 && floorPlan[bi - 1])) return false;
              return true;
            });
            if (!opts.length) break;
            var scored = opts.map(function (e) { return { e: e, s: pickScore(env, e, last, chosen, bi, state) }; });
            var pick = choose(env, scored);
            chosen.push(pick);
            filled += timeFor(env, pick);
            last = pick;
          }
          var list = chosen.slice();
          if (peakHere) list.push(peakHere);
          var ordered = orderBlock(env, list, prevItem, peakHere);
          var alloc = allocate(env, ordered, b.minutes);
          if (alloc) { result = { ordered: ordered, alloc: alloc }; break; }
          // adjust: too long means drop one, too short means add one more
          var tot = sum(ordered.map(function (e) { return e.minutes.min; }));
          if (tot > b.minutes && chosen.length) {
            chosen.pop();
            filled = reserved + sum(chosen.map(function (e) { return timeFor(env, e); }));
          } else {
            filled = b.minutes - 0.3; // forces one more pick
            var before = chosen.length;
            var opts2 = pool.filter(function (e) { return chosen.indexOf(e) < 0; });
            if (!opts2.length) break;
            var pick2 = choose(env, opts2.map(function (e) { return { e: e, s: pickScore(env, e, last, chosen, bi, state) }; }));
            chosen.push(pick2);
            filled = reserved + sum(chosen.map(function (e) { return timeFor(env, e); }));
            if (chosen.length === before) break;
          }
        }
        if (!result) return null;
        items = result.ordered;
        out.push({ id: b.id, label: b.label, minutes: b.minutes, station: station, locked: false,
          items: items.map(function (e, k) { return { id: e.id, minutes: result.alloc[k], isPeak: !!(peakHere && e === peakHere) }; }) });
      }
      // update state
      items.forEach(function (e) {
        used.add(e.id);
        state.family[e.family] = (state.family[e.family] || 0) + 1;
        if (e.usesStraps) state.straps++;
        if (env.peak) {
          var idx = (env.peak.buildUp || []).indexOf(e.id);
          if (idx >= state.buildUpIndex) state.buildUpIndex = idx;
        }
        all.push(e);
      });
      state.floorRuns = floorRuns(all);
      prevItem = items[items.length - 1] || prevItem;
    }
    return out;
  }

  /* ---------- stats, scoring, validation ---------- */
  function flatItems(ctx, cls) {
    var list = [];
    cls.blocks.forEach(function (b, bi) {
      b.items.forEach(function (it, ii) { list.push({ ex: ctx.byId[it.id], item: it, block: b, bi: bi, ii: ii }); });
    });
    return list;
  }

  function stats(ctx, cls) {
    var flat = flatItems(ctx, cls).filter(function (f) { return f.ex; });
    var total = sum(flat.map(function (f) { return f.item.minutes; }));
    var equipmentChanges = 0, springChanges = 0;
    var last = null;
    flat.forEach(function (f) {
      if (f.ex.equipment === 'standing') return;
      if (last) {
        if (last.equipment !== f.ex.equipment) equipmentChanges++;
        else if (last.springs !== f.ex.springs) springChanges++;
      }
      last = f.ex;
    });
    var minutesBy = {};
    flat.forEach(function (f) { minutesBy[f.ex.equipment] = (minutesBy[f.ex.equipment] || 0) + f.item.minutes; });
    return { totalMinutes: total, equipmentChanges: equipmentChanges, springChanges: springChanges, minutesByStation: minutesBy, exerciseCount: flat.length };
  }

  function classScore(env, cls) {
    var ctx = env.ctx, W = env.W;
    var flat = flatItems(ctx, cls);
    var plan = cls.blocks.map(function (b) { return b.station; });
    var s = planScore(env, plan, shareTargets(env));
    var last = null;
    flat.forEach(function (f) {
      var e = f.ex;
      if (e.equipment !== 'standing') {
        if (last && last.equipment === e.equipment && last.springs !== e.springs) {
          s += W.springChange * (springWeight(env, e) < springWeight(env, last) ? W.springDropFactor : 1);
        }
        last = e;
      }
      s += W.dislike * (env.soft.dislike[e.id] || 0) + W.overused * (env.soft.overused[e.id] || 0);
      if (env.recent.has(e.id)) s += W.recent;
    });
    var fam = {};
    flat.forEach(function (f) { fam[f.ex.family] = (fam[f.ex.family] || 0) + 1; });
    Object.keys(fam).forEach(function (k) { if (fam[k] > 1) s += W.familyRepeat * (fam[k] - 1) * 0.5; });
    var straps = flat.filter(function (f) { return f.ex.usesStraps; }).length;
    if (straps > W.strapLimit) s += W.strapOver * (straps - W.strapLimit);
    if (env.peak && env.peak.requires && env.peak.requires.length) {
      var covered = {};
      flat.forEach(function (f) {
        if (f.bi < env.peakBlockIndex) f.ex.prepares.forEach(function (t) { covered[t] = true; });
      });
      var cov = env.peak.requires.filter(function (t) { return covered[t]; }).length / env.peak.requires.length;
      s -= W.peakCoverage * cov;
    }
    return s;
  }

  /* Checks every hard rule. Returns a list of plain problems (empty when the class is valid). */
  function validate(ctx, settings, cls) {
    var st = normalize(ctx, settings);
    var R = rulesFor(ctx, st);
    var ct = ctx.classTypes[st.classType];
    var problems = [];
    var add = function (rule, text) { problems.push({ rule: rule, text: text }); };
    // block order and timings
    var ids = ct.blocks.map(function (b) { return b.id; });
    if (cls.blocks.length !== ids.length) add('block-order', 'Wrong number of blocks');
    cls.blocks.forEach(function (b, i) {
      if (b.id !== ids[i]) add('block-order', 'Block ' + (i + 1) + ' should be ' + ids[i] + ' but is ' + b.id);
      var want = Number(st.timing[b.id]);
      var got = sum(b.items.map(function (it) { return it.minutes; }));
      if (Math.abs(got - want) > 1e-9) add('block-timing', b.id + ' has ' + got + ' minutes, needs ' + want);
      if (!b.items.length) add('block-timing', b.id + ' is empty');
    });
    var total = sum(cls.blocks.map(function (b) { return sum(b.items.map(function (it) { return it.minutes; })); }));
    if (Math.abs(total - val(ct.minutes)) > 1e-9) add('total-minutes', 'Class is ' + total + ' minutes, needs ' + val(ct.minutes));
    var flat = flatItems(ctx, cls);
    var seen = {};
    var chairMinutes = 0;
    var peakDef = cls.peak && cls.peak.id ? (ctx.peakById[cls.peak.id] || (st.customPeaks || []).filter(function (c) { return c.id === cls.peak.id; })[0]) : null;
    var peakReq = peakDef && peakDef.requires ? peakDef.requires : [];
    flat.forEach(function (f) {
      var e = f.ex;
      if (!e) { add('unknown', 'Unknown exercise ' + f.item.id); return; }
      if (seen[e.id]) add('repeat', e.name + ' is used twice');
      seen[e.id] = true;
      if (e.minLevel > R.levelRank) add('level-ceiling', e.name + ' is above the class level');
      if (e.groups.indexOf(st.group) < 0) add('client-group', e.name + ' is not for this client group');
      if (e.inversion && !R.allowInv) add('client-group', e.name + ' is an inversion');
      if (FLEX_ORDER[e.spinalFlexion] > R.maxFlex) add('client-group', e.name + ' is a deep loaded curl');
      if (e.bodyPartsLifted > R.maxLifted) add('body-contact', e.name + ' lifts too much for the level');
      if (e.unilateral && !R.allowUni) add('unilateral', e.name + ' is unilateral');
      if (!stationAvailable(st, e.equipment)) add('equipment', e.name + ' needs unticked equipment');
      if (e.props.length && !st.equipment.props) add('equipment', e.name + ' needs props');
      if (e.equipment === 'chair') chairMinutes += f.item.minutes;
      if (feedbackBlock(ctx, st, e)) add('feedback', e.name + ': ' + feedbackBlock(ctx, st, e));
      var isPeakSlot = f.item.isPeak && f.block.id === val(ct.peakBlock);
      var prepOk = f.block.id === val(ct.peakBlock) && peakReq.length && e.prepares.some(function (t) { return peakReq.indexOf(t) >= 0; });
      if (!isPeakSlot && !prepOk && e.blocks.indexOf(f.block.id) < 0) add('block-fit', e.name + ' does not belong in ' + f.block.id);
      if (e.equipment !== f.block.station) add('block-station', e.name + ' is not on the block equipment');
      if (f.item.minutes < e.minutes.min - 1e-9 || f.item.minutes > e.minutes.max + 1e-9) add('exercise-time', e.name + ' time out of range');
    });
    if (R.maxChair !== null && R.maxChair !== undefined && chairMinutes > R.maxChair + 1e-9) add('chair-limit', 'Chair time ' + chairMinutes + ' is over the level limit ' + R.maxChair);
    // box minimum, ignoring standing items in between
    var run = 0;
    var nonStanding = flat.filter(function (f) { return f.ex && f.ex.equipment !== 'standing'; });
    nonStanding.forEach(function (f, i) {
      if (f.ex.equipment === 'box') run += f.item.minutes;
      var next = nonStanding[i + 1];
      if (f.ex.equipment === 'box' && (!next || next.ex.equipment !== 'box')) {
        if (run < R.boxMin - 1e-9) add('box-minimum', 'Long box used for ' + run + ' minutes, needs ' + R.boxMin);
        run = 0;
      }
    });
    // floor visits
    var runs = floorRuns(flat.filter(function (f) { return f.ex; }).map(function (f) { return f.ex; }));
    if (runs > R.maxFloor) add('floor-visits', 'Down to the floor ' + runs + ' times, limit ' + R.maxFloor);
    // peak placement
    var peakItems = flat.filter(function (f) { return f.item.isPeak; });
    if (cls.peak && cls.peak.exerciseId) {
      if (peakItems.length !== 1) add('peak', 'Peak pose missing');
      else {
        var p = peakItems[0];
        if (p.block.id !== val(ct.peakBlock)) add('peak', 'Peak is not in full body integration');
        if (p.ii !== p.block.items.length - 1) add('peak', 'Peak is not at the end of its block');
        if (p.item.id !== cls.peak.exerciseId) add('peak', 'Peak exercise mismatch');
      }
    }
    return problems;
  }

  function layoutMessage(env, why) {
    var top = Object.keys(why).sort(function (a, b) { return why[b] - why[a]; })[0];
    var lvl = levelLabel(env.R.levelRank);
    if (top === 'floor') {
      var n = env.R.maxFloor;
      return 'With this equipment, ' + env.ctx.groups[env.st.group].label.toLowerCase() + ' clients would have to get down to the floor more than ' +
        (n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times') + '. Tick the Reformer, or choose a different client group.';
    }
    if (top === 'chair') return lvl + ' allows only ' + env.R.maxChair + ' minutes of chair. Tick the Reformer or the Mat as well.';
    if (top === 'box') return 'The long box needs at least ' + env.R.boxMin + ' minutes in a row once it goes on. Untick the long box or tick more equipment.';
    return 'No equipment layout fits the rules. Try ticking more equipment.';
  }

  /* ---------- public: build ---------- */
  function buildClass(ctx, settings, opts) {
    opts = opts || {};
    var first = null;
    for (var skip = 0; skip < 12; skip++) {
      var r = buildOnce(ctx, settings, Object.assign({}, opts, { peakSkip: skip }));
      if (!first) first = r;
      if (r.ok || !r.peakTried || r.peakExhausted) break;
    }
    return r.ok ? r : first;
  }

  function buildOnce(ctx, settings, opts) {
    var env = makeEnv(ctx, settings, opts);
    if (env.peakExhausted) return { ok: false, peakExhausted: true, errors: [], messages: [] };
    if (env.errors.length) return { ok: false, errors: env.errors, messages: env.messages };
    var res = enumeratePlans(env);
    if (!res.plans.length) {
      var why = res.empty.length
        ? 'Nothing fits the ' + res.empty.map(function (x) { return x.toLowerCase(); }).join(', ') + ' block with this equipment at ' + levelLabel(env.R.levelRank) + ' for ' + ctx.groups[env.st.group].label.toLowerCase() + ' clients. Try ticking more equipment, like the Reformer.'
        : 'No way to lay out the equipment that keeps the long box at least ' + env.R.boxMin + ' minutes and follows the level limits. Try ticking more equipment.';
      return { ok: false, errors: [why], messages: env.messages, peakTried: !!env.peakEx };
    }
    var targets = shareTargets(env);
    var why = {};
    var scored = res.plans.map(function (p) { return { p: p, s: planScore(env, p, targets, why) + env.rand() * (env.W.planNoise || 0) }; }).filter(function (x) { return isFinite(x.s); });
    if (!scored.length) return { ok: false, errors: [layoutMessage(env, why)], messages: env.messages, peakTried: !!env.peakEx };
    scored.sort(function (a, b) { return a.s - b.s; });
    // sample a handful of good plans for variety
    var pool = scored.slice(0, 40);
    var picks = [];
    var best = pool[0].s;
    var tries = 0;
    while (picks.length < Math.min(8, pool.length) && tries++ < 200) {
      var weights = pool.map(function (x) { return Math.exp(-(x.s - best) / 2.5); });
      var r = env.rand() * sum(weights);
      for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { if (picks.indexOf(pool[i]) < 0) picks.push(pool[i]); break; } }
    }
    if (picks.indexOf(pool[0]) < 0) picks.push(pool[0]);
    var candidates = [];
    var debug = { fillFailed: 0, invalid: [] };
    picks.forEach(function (pk) {
      for (var k = 0; k < 3; k++) {
        var blocks = fillPlan(env, pk.p);
        if (!blocks) { debug.fillFailed++; continue; }
        var cls = {
          version: 1,
          settings: env.st,
          createdAt: new Date().toISOString(),
          peak: env.peakRequested ? { id: env.peakRequested.id, name: env.peakRequested.name, exerciseId: env.peakEx ? env.peakEx.id : null, stepDown: env.peakEx && env.peakRequested.versions[0] !== env.peakEx.id } : null,
          blocks: blocks,
          messages: env.messages.slice()
        };
        var problems = validate(ctx, env.st, cls);
        if (problems.length) { debug.invalid.push(problems.map(function (p) { return p.text; }).join('; ')); continue; }
        candidates.push({ cls: cls, s: classScore(env, cls) });
      }
    });
    if (!candidates.length) {
      for (var q = 0; q < scored.length && q < 60 && !candidates.length; q++) {
        var blocks2 = fillPlan(env, scored[q].p);
        if (!blocks2) { debug.fillFailed++; continue; }
        var cls2 = {
          version: 1, settings: env.st, createdAt: new Date().toISOString(),
          peak: env.peakRequested ? { id: env.peakRequested.id, name: env.peakRequested.name, exerciseId: env.peakEx ? env.peakEx.id : null, stepDown: env.peakEx && env.peakRequested.versions[0] !== env.peakEx.id } : null,
          blocks: blocks2, messages: env.messages.slice()
        };
        if (validate(ctx, env.st, cls2).length) continue;
        candidates.push({ cls: cls2, s: classScore(env, cls2) });
      }
    }
    if (!candidates.length) {
      return { ok: false, errors: ['Could not build a class that follows every rule with these choices. Try ticking more equipment or allowing easier exercises.'], messages: env.messages, peakTried: !!env.peakEx, debug: debug };
    }
    candidates.sort(function (a, b) { return a.s - b.s; });
    var top = candidates.slice(0, 3);
    var w = top.map(function (c) { return Math.exp(-(c.s - top[0].s) / 1.5); });
    var rr = env.rand() * sum(w);
    var chosen = top[0];
    for (var j = 0; j < top.length; j++) { rr -= w[j]; if (rr <= 0) { chosen = top[j]; break; } }
    chosen.cls.stats = stats(ctx, chosen.cls);
    chosen.cls.score = Math.round(chosen.s * 100) / 100;
    return { ok: true, class: chosen.cls, messages: env.messages };
  }

  /* ---------- public: swap ---------- */
  function swapOptions(ctx, settings, cls, blockIndex, itemIndex, count, opts) {
    opts = opts || {};
    count = count || 3;
    var env = makeEnv(ctx, settings, { seed: opts.seed || 7, recent: opts.recent || [] });
    var block = cls.blocks[blockIndex];
    var item = block.items[itemIndex];
    var current = ctx.byId[item.id];
    var used = new Set();
    cls.blocks.forEach(function (b) { b.items.forEach(function (it) { used.add(it.id); }); });
    var pool;
    if (item.isPeak && env.peakRequested) {
      pool = env.peakRequested.versions.map(function (id) { return ctx.byId[id]; })
        .filter(function (e) { return e && e.id !== current.id && e.equipment === block.station && !hardCheck(ctx, env.st, env.R, e); });
    } else {
      pool = env.eligible.filter(function (e) {
        return e.equipment === block.station && e.blocks.indexOf(block.id) >= 0 && !used.has(e.id);
      });
    }
    var prevItem = null;
    var flat = flatItems(ctx, cls);
    var pos = flat.findIndex(function (f) { return f.bi === blockIndex && f.ii === itemIndex; });
    if (pos > 0) prevItem = flat[pos - 1].ex;
    var state = { family: {}, straps: 0, buildUpIndex: 0 };
    flat.forEach(function (f, i) { if (i !== pos) { state.family[f.ex.family] = (state.family[f.ex.family] || 0) + 1; if (f.ex.usesStraps) state.straps++; } });
    var results = [];
    pool.forEach(function (e) {
      var trial = JSON.parse(JSON.stringify(cls));
      var tb = trial.blocks[blockIndex];
      tb.items[itemIndex].id = e.id;
      var exs = tb.items.map(function (it) { return ctx.byId[it.id]; });
      var mins = tb.items.map(function (it) { return it.minutes; });
      if (mins[itemIndex] < e.minutes.min || mins[itemIndex] > e.minutes.max) {
        var a = allocate(env, exs, block.minutes);
        if (!a) return;
        tb.items.forEach(function (it, k) { it.minutes = a[k]; });
      }
      if (item.isPeak) trial.peak.exerciseId = e.id;
      if (validate(ctx, settings, trial).length) return;
      var s = pickScore(env, e, prevItem, [], blockIndex, state) - env.rand() * env.W.variety;
      results.push({ exercise: e, block: tb, score: s });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, count).map(function (r) { return { id: r.exercise.id, block: r.block }; });
  }

  function applySwap(ctx, cls, blockIndex, newBlock) {
    var copy = JSON.parse(JSON.stringify(cls));
    copy.blocks[blockIndex] = Object.assign({}, copy.blocks[blockIndex], { items: newBlock.items });
    var peakItem = newBlock.items.filter(function (it) { return it.isPeak; })[0];
    if (peakItem && copy.peak) copy.peak.exerciseId = peakItem.id;
    copy.stats = stats(ctx, copy);
    return copy;
  }

  return {
    prepare: prepare,
    normalize: normalize,
    rulesFor: rulesFor,
    hardCheck: hardCheck,
    resolvePeak: resolvePeak,
    buildClass: buildClass,
    validate: validate,
    stats: stats,
    swapOptions: swapOptions,
    applySwap: applySwap,
    templateFor: templateFor,
    defaultEquipment: defaultEquipment,
    stationAvailable: stationAvailable,
    _internal: { makeEnv: makeEnv, enumeratePlans: enumeratePlans, planScore: planScore, allocate: allocate, floorRuns: floorRuns }
  };
});
