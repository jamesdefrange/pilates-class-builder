// Unit tests for every hard rule. Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, ctx, data, LEVELS, GROUPS, RANK, build, items, spread, EQUIP_SETS } = require('./helpers');
const Print = require('../js/print.js');
const FLOW = data['class-types'].classTypes[0];
const blockIndex = id => FLOW.blocks.findIndex(b => b.id === id);
const JAY_OVERUSED = FLOW.overusedByJay.value;

const FLEX = { none: 0, light: 1, deep: 2 };
const SAMPLE = spread(72).map((s, i) => ({ s, cls: build(s, 100 + i) }));

function floorRuns(list) {
  let runs = 0, inRun = false;
  list.forEach(x => { if (x.ex.floor && !inRun) runs++; inRun = !!x.ex.floor; });
  return runs;
}

/* ---------- Data checks ---------- */
test('data: every exercise is complete and points at real blocks, stations and springs', () => {
  const blockIds = data['class-types'].classTypes[0].blocks.map(b => b.id);
  const stations = Object.fromEntries(data.equipment.stations.map(s => [s.id, s]));
  assert.ok(ctx.exercises.length >= 150, 'at least 150 exercises');
  const ids = new Set();
  for (const e of ctx.exercises) {
    assert.ok(!ids.has(e.id), 'unique id ' + e.id); ids.add(e.id);
    assert.ok(e.name && e.image && e.pose, 'name, image, pose for ' + e.id);
    assert.ok(stations[e.equipment], 'station for ' + e.id);
    assert.ok(stations[e.equipment].springs.some(sp => sp.id === e.springs), 'spring ' + e.springs + ' on ' + e.id);
    assert.ok(e.blocks.length && e.blocks.every(b => blockIds.includes(b)), 'blocks for ' + e.id);
    assert.ok([1, 1.5, 2, 2.5].includes(e.minLevel), 'minLevel for ' + e.id);
    assert.ok(e.groups.length && e.groups.every(g => GROUPS.includes(g)), 'groups for ' + e.id);
    assert.ok(e.cues.length >= 2 && e.cues.length <= 4, '2 to 4 cues for ' + e.id);
    assert.ok(e.minutes.min <= e.minutes.typical && e.minutes.typical <= e.minutes.max, 'minutes for ' + e.id);
    assert.ok(['jay', 'research', 'assumption'].includes(e.source), 'source for ' + e.id);
    assert.ok(e.primary.length && e.prepares.length, 'muscles and prepares for ' + e.id);
  }
});

test('data: peak poses reference real exercises and there are at least 15', () => {
  assert.ok(ctx.peaks.length >= 15);
  for (const p of ctx.peaks) {
    assert.ok(p.versions.length >= 2, p.id + ' has gentler versions');
    for (const v of p.versions.concat(p.buildUp)) assert.ok(ctx.byId[v], p.id + ' -> ' + v);
    assert.ok(p.requires.length, p.id + ' requires');
  }
});

test('data: every timing template adds up to the class length and keeps each section in range', () => {
  const flow = FLOW;
  for (const t of flow.timingTemplates) {
    const total = Object.values(t.minutes).reduce((a, b) => a + b, 0);
    assert.equal(total, flow.minutes.value, t.id);
    assert.deepEqual(Object.keys(t.minutes), flow.blocks.map(b => b.id), t.id + ' block order');
    for (const sec of flow.sections) {
      const m = sec.blocks.reduce((a, b) => a + t.minutes[b], 0);
      assert.ok(m >= sec.range.min && m <= sec.range.max, t.id + ' ' + sec.id + ' ' + m);
    }
  }
});

test('data: Jay\'s four sections hold the eleven blocks in order', () => {
  assert.deepEqual(FLOW.sections.map(s => s.label), ['Warm up', 'Strength and tone', 'Functional', 'Lengthening']);
  assert.deepEqual(FLOW.sections.flatMap(s => s.blocks), FLOW.blocks.map(b => b.id));
  assert.deepEqual(FLOW.blocks.map(b => b.id), ['footwork', 'bridging', 'abs', 'plank', 'lower', 'upperback', 'upperfront', 'side', 'full', 'prone', 'stretch']);
  assert.deepEqual(FLOW.sections.map(s => [s.minutes.value, s.range.min, s.range.max]), [[15, 15, 15], [18, 15, 20], [12, 10, 15], [5, 5, 5]]);
  FLOW.sections.forEach(s => assert.equal(s.range.source, 'jay'));
  // full body and back extension appear only in Functional
  assert.deepEqual(FLOW.sections.find(s => s.id === 'functional').blocks, ['full', 'prone']);
});

test('data: plank, side body, upper back and upper front have plenty of Level 1 and 1.5 options', () => {
  const thin = ['plank', 'side', 'upperback', 'upperfront'];
  for (const [level, min, stations] of [['1', 6, 2], ['1.5', 12, 4]]) {
    const st = G.normalize(ctx, { level, group: 'older' });
    const R = G.rulesFor(ctx, st);
    for (const b of thin) {
      const list = ctx.exercises.filter(e => e.blocks.includes(b) && !G.hardCheck(ctx, st, R, e));
      assert.ok(list.length >= min, b + ' has ' + list.length + ' options at Level ' + level);
      assert.ok(new Set(list.map(e => e.equipment)).size >= stations, b + ' spans equipment at Level ' + level);
    }
  }
});

test('data: Level 1 plank is only on the mat or the long box (Jay)', () => {
  const st = G.normalize(ctx, { level: '1', group: 'middle' });
  const R = G.rulesFor(ctx, st);
  const l1 = ctx.exercises.filter(e => e.blocks.includes('plank') && !G.hardCheck(ctx, st, R, e));
  assert.ok(l1.length >= 4);
  l1.forEach(e => assert.ok(['mat', 'box'].includes(e.equipment), e.id));
});

test('data: no em dashes or en dashes in any data text', () => {
  const text = JSON.stringify(data);
  assert.ok(!/[\u2013\u2014]/.test(text));
});

/* ---------- Hard rules: builds never break them ---------- */
test('hard rule: level ceiling, no exercise above the class level', () => {
  for (const { s, cls } of SAMPLE) for (const x of items(cls)) assert.ok(x.ex.minLevel <= RANK[s.level], x.ex.id + ' at level ' + s.level);
});

test('hard rule: client group restrictions (suitability, no inversions or deep loaded curls for older, floor visits)', () => {
  for (const { s, cls } of SAMPLE) {
    const list = items(cls);
    for (const x of list) assert.ok(x.ex.groups.includes(s.group), x.ex.id + ' suits ' + s.group);
    if (s.group === 'older') {
      for (const x of list) {
        assert.ok(!x.ex.inversion, x.ex.id + ' is an inversion');
        assert.ok(FLEX[x.ex.spinalFlexion] <= FLEX.light, x.ex.id + ' deep curl');
      }
    }
    const max = ctx.groups[s.group].rules.maxFloorVisits.value;
    assert.ok(floorRuns(list) <= max, 'floor visits for ' + s.group);
  }
});

test('hard rule: selected equipment only, props only when ticked', () => {
  for (const { s, cls } of SAMPLE) {
    const st = G.normalize(ctx, s);
    for (const x of items(cls)) {
      assert.ok(G.stationAvailable(st, x.ex.equipment), x.ex.id + ' on unticked ' + x.ex.equipment);
      if (x.ex.props.length) assert.ok(st.equipment.props, x.ex.id + ' needs props');
      if (x.ex.equipment === 'box') assert.ok(st.equipment.reformer && st.equipment.box);
    }
  }
});

test('hard rule: exactly 50 minutes', () => {
  for (const { cls } of SAMPLE) {
    const total = items(cls).reduce((a, x) => a + x.it.minutes, 0);
    assert.equal(total, 50);
    assert.equal(cls.stats.totalMinutes, 50);
  }
});

test('hard rule: block order and block timings follow the template', () => {
  const flow = data['class-types'].classTypes[0];
  for (const { s, cls } of SAMPLE) {
    const st = G.normalize(ctx, s);
    assert.deepEqual(cls.blocks.map(b => b.id), flow.blocks.map(b => b.id));
    for (const b of cls.blocks) assert.equal(b.items.reduce((a, it) => a + it.minutes, 0), st.timing[b.id], b.id);
  }
  // a custom template with Strength and tone at its top of 20 minutes
  const custom = { footwork: 6, bridging: 4, abs: 5, plank: 4, lower: 4, upperback: 4, upperfront: 4, side: 4, full: 6, prone: 4, stretch: 5 };
  for (let i = 0; i < 8; i++) {
    const cls = build({ level: LEVELS[i % 4], group: 'older', timing: custom }, 900 + i);
    cls.blocks.forEach(b => assert.equal(b.items.reduce((a, it) => a + it.minutes, 0), custom[b.id]));
  }
});

test('hard rule: body contact and unilateral limits per level', () => {
  for (const { s, cls } of SAMPLE) {
    const rules = ctx.levels[s.level].rules;
    for (const x of items(cls)) {
      assert.ok(x.ex.bodyPartsLifted <= rules.maxBodyPartsLifted.value, x.ex.id + ' lifted at ' + s.level);
      if (!rules.allowUnilateral.value) assert.ok(!x.ex.unilateral, x.ex.id + ' unilateral at ' + s.level);
    }
  }
});

test('hard rule: chair limits (none at Level 1, limited at Level 1.5)', () => {
  for (const { s, cls } of SAMPLE) {
    const cap = ctx.levels[s.level].rules.maxChairMinutes.value;
    const chairMin = items(cls).filter(x => x.ex.equipment === 'chair').reduce((a, x) => a + x.it.minutes, 0);
    if (cap !== null) assert.ok(chairMin <= cap, 'chair ' + chairMin + ' at ' + s.level);
  }
});

test('hard rule: long box stays at least 10 minutes once placed', () => {
  let sawBox = 0;
  for (let i = 0; i < 60; i++) {
    const cls = build({ level: LEVELS[i % 4], group: GROUPS[i % 3], shares: { reformer: 80, chair: 10, mat: 5, springboard: 5, bosu: 0 } }, 300 + i);
    const list = items(cls).filter(x => x.ex.equipment !== 'standing');
    let run = 0;
    list.forEach((x, k) => {
      if (x.ex.equipment === 'box') run += x.it.minutes;
      const next = list[k + 1];
      if (x.ex.equipment === 'box' && (!next || next.ex.equipment !== 'box')) { sawBox++; assert.ok(run >= 10, 'box run ' + run); run = 0; }
    });
  }
  assert.ok(sawBox > 0, 'the box was used at least once in 60 builds');
});

test('hard rule: exercises Jay flagged wrong level, too hard or unsafe are never used', () => {
  const unsafe = ['fw-heels-par', 'br-articulated-fb', 'ab-chest-lift-fb', 'sd-mermaid', 'fb-quadruped-hold'];
  const feedback = unsafe.map(id => ({ exerciseId: id, reason: 'unsafe', level: '1', group: 'older' }));
  feedback.push({ exerciseId: 'fw-toes-par', reason: 'wrong-level', level: '1.5', group: 'middle' });
  feedback.push({ exerciseId: 'fw-arches-par', reason: 'too-hard', level: '2', group: 'older' });
  for (let i = 0; i < 40; i++) {
    const s = { level: LEVELS[i % 4], group: GROUPS[i % 3], feedback };
    const used = new Set(items(build(s, 500 + i)).map(x => x.ex.id));
    unsafe.forEach(id => assert.ok(!used.has(id), id + ' unsafe was used'));
    if (RANK[s.level] <= 1.5) assert.ok(!used.has('fw-toes-par'), 'wrong level used at ' + s.level);
    if (s.group === 'older' && RANK[s.level] <= 2) assert.ok(!used.has('fw-arches-par'), 'too hard used');
  }
  // the checks themselves
  const st = G.normalize(ctx, { level: '2', group: 'older', feedback });
  const R = G.rulesFor(ctx, st);
  assert.ok(G.hardCheck(ctx, st, R, ctx.byId['fw-heels-par']));
  assert.ok(G.hardCheck(ctx, st, R, ctx.byId['fw-arches-par']));
  assert.equal(G.hardCheck(ctx, G.normalize(ctx, { level: '2', group: 'middle', feedback }), G.rulesFor(ctx, G.normalize(ctx, { level: '2', group: 'middle', feedback })), ctx.byId['fw-toes-par']), null, 'wrong level at 1.5 is fine at 2');
});

test('hard rule: no exercise repeats within a class', () => {
  for (const { cls } of SAMPLE) {
    const ids = items(cls).map(x => x.ex.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('every sample class passes the full validator', () => {
  for (const { s, cls } of SAMPLE) assert.deepEqual(G.validate(ctx, s, cls), [], JSON.stringify(s));
});

/* ---------- The validator catches deliberate breaks ---------- */
function oneClass() { return JSON.parse(JSON.stringify(build({ level: '1', group: 'older' }, 77))); }
const S1 = { level: '1', group: 'older' };
const rulesHit = (cls, s) => G.validate(ctx, s || S1, cls).map(p => p.rule);

test('validator catches: above-level exercise', () => {
  const cls = oneClass();
  cls.blocks[0].items[0].id = 'fw-chest-press';
  assert.ok(rulesHit(cls).includes('level-ceiling'));
});
test('validator catches: wrong total and wrong block minutes', () => {
  const cls = oneClass();
  cls.blocks[0].items[0].minutes += 0.5;
  const hit = rulesHit(cls);
  assert.ok(hit.includes('total-minutes') && hit.includes('block-timing'));
});
test('validator catches: blocks out of order', () => {
  const cls = oneClass();
  [cls.blocks[0], cls.blocks[1]] = [cls.blocks[1], cls.blocks[0]];
  assert.ok(rulesHit(cls).includes('block-order'));
});
test('validator catches: unilateral and lifted work at Level 1', () => {
  const cls = oneClass();
  cls.blocks[1].items[0].id = 'br-sl-tt';
  const hit = rulesHit(cls);
  assert.ok(hit.includes('unilateral') && hit.includes('body-contact'));
});
test('validator catches: inversion for older clients', () => {
  const cls = JSON.parse(JSON.stringify(build({ level: '2', group: 'older' }, 78)));
  const fb = cls.blocks.find(b => b.id === 'full');
  fb.items[0].id = 'ab-short-spine';
  fb.station = 'reformer';
  assert.ok(rulesHit(cls, { level: '2', group: 'older' }).includes('client-group'));
});
test('validator catches: unticked equipment', () => {
  const cls = oneClass();
  assert.ok(rulesHit(cls, Object.assign({}, S1, { equipment: { reformer: false, mat: true, chair: true, bosu: true, springboard: true, box: true, props: true } })).includes('equipment'));
});
test('validator catches: long box under 10 minutes', () => {
  const cls = oneClass();
  const prone = cls.blocks.find(b => b.id === 'prone');
  prone.station = 'box';
  prone.items = [{ id: 'bx-pulling-straps', minutes: 2 }, { id: 'bx-pulling-straps-t', minutes: 2 }].slice(0, prone.items.length);
  const want = prone.items.reduce((a, it) => a + it.minutes, 0);
  assert.ok(want <= 4);
  assert.ok(rulesHit(cls).includes('box-minimum'));
});
test('validator catches: flagged unsafe exercise', () => {
  const cls = oneClass();
  const id = cls.blocks[0].items[0].id;
  assert.ok(rulesHit(cls, Object.assign({}, S1, { feedback: [{ exerciseId: id, reason: 'unsafe', level: '1', group: 'older' }] })).includes('feedback'));
});
test('validator catches: repeated exercise', () => {
  const cls = oneClass();
  cls.blocks[0].items[1].id = cls.blocks[0].items[0].id;
  assert.ok(rulesHit(cls).includes('repeat'));
});
test('validator catches: chair at Level 1', () => {
  const cls = oneClass();
  cls.blocks[0].station = 'chair';
  cls.blocks[0].items[0].id = 'ch-fw-toes';
  assert.ok(rulesHit(cls).includes('level-ceiling'));
  assert.ok(rulesHit(cls).includes('chair-limit'));
});
test('validator catches: too many floor visits for older clients', () => {
  const cls = oneClass();
  const ab = cls.blocks[blockIndex('abs')], st = cls.blocks[blockIndex('stretch')];
  ab.station = 'mat'; ab.items = [{ id: 'mt-chest-lift', minutes: ab.minutes }];
  st.station = 'mat'; st.items = [{ id: 'mt-hamstring-stretch', minutes: st.minutes }];
  const mid = cls.blocks[blockIndex('upperback')];
  mid.station = 'reformer'; mid.items = [{ id: 'ub-seated-rows', minutes: mid.minutes }];
  assert.ok(rulesHit(cls).includes('floor-visits'));
});
test('validator catches: a section outside Jay\'s range', () => {
  const cls = oneClass();
  // move a minute from Functional into Strength and tone beyond its 20 minute top
  const s2 = { level: '1', group: 'older', timing: { footwork: 6, bridging: 4, abs: 5, plank: 3, lower: 4, upperback: 4, upperfront: 4, side: 3, full: 7, prone: 5, stretch: 5 } };
  const lower = cls.blocks[blockIndex('lower')];
  lower.items[0].minutes += 5;
  lower.minutes += 5;
  assert.ok(rulesHit(cls, s2).includes('section-timing'));
});
test('validator catches: coordination or balance work at Level 1', () => {
  const cls = oneClass();
  const fw = cls.blocks[blockIndex('footwork')];
  fw.items[0].id = 'fb-footwork-arms';
  assert.ok(rulesHit(cls).includes('level-skill'));
});

/* ---------- Peak pose ---------- */
test('peak pose: lands last in full body integration, and steps down to a safe version in plain words', () => {
  for (const peakId of ctx.peaks.map(p => p.id)) {
    for (const [level, group] of [['1', 'older'], ['1.5', 'middle'], ['2.5', 'younger']]) {
      const r = G.buildClass(ctx, { level, group, peakId }, { seed: 11 });
      assert.ok(r.ok, peakId + ' ' + level + ' ' + group + ': ' + (r.errors || []).join(' '));
      const cls = r.class;
      if (!cls.peak.exerciseId) continue;
      const full = cls.blocks.find(b => b.id === 'full');
      const last = full.items[full.items.length - 1];
      assert.ok(last.isPeak && last.id === cls.peak.exerciseId, peakId + ' is last in full body');
      const peak = ctx.peakById[peakId];
      const first = ctx.byId[peak.versions[0]];
      if (cls.peak.exerciseId !== first.id) {
        assert.ok(r.messages.some(m => m.includes('closest safe version')), 'message for ' + peakId);
        assert.ok(!r.messages.some(m => /[\u2013\u2014]/.test(m)));
      }
    }
  }
});

test('peak pose: teaser for Level 1 older clients becomes a gentle version', () => {
  const r = G.buildClass(ctx, { level: '1', group: 'older', peakId: 'teaser' }, { seed: 3 });
  assert.ok(r.ok);
  const ex = ctx.byId[r.class.peak.exerciseId];
  assert.ok(ex.minLevel <= 1 && ex.spinalFlexion !== 'deep');
  assert.match(r.messages.join(' '), /Teaser is not a fit here/);
});

test('peak pose: earlier blocks prepare the muscles and patterns the peak needs', () => {
  for (const peakId of ['teaser', 'swan', 'elephant', 'side-plank', 'single-leg-bridge']) {
    for (let i = 0; i < 4; i++) {
      const r = G.buildClass(ctx, { level: LEVELS[i], group: GROUPS[i % 3], peakId }, { seed: 40 + i });
      const req = ctx.peakById[peakId].requires;
      const covered = new Set();
      items(r.class).filter(x => x.bi < blockIndex('full')).forEach(x => x.ex.prepares.forEach(t => covered.add(t)));
      const share = req.filter(t => covered.has(t)).length / req.length;
      assert.ok(share >= 0.5, peakId + ' prep coverage ' + share);
    }
  }
});

/* ---------- Swap, lock, variety ---------- */
test('swap: offers up to 3 alternatives that each pass every rule', () => {
  const s = { level: '1.5', group: 'older', peakId: 'teaser' };
  const cls = build(s, 21);
  cls.blocks.forEach((b, bi) => {
    const opts = G.swapOptions(ctx, s, cls, bi, 0, 3);
    assert.ok(opts.length <= 3);
    for (const o of opts) {
      const next = G.applySwap(ctx, cls, bi, o.block);
      assert.deepEqual(G.validate(ctx, s, next), [], 'swap in ' + b.id);
      assert.notEqual(o.id, b.items[0].id);
    }
  });
  const full = cls.blocks.findIndex(b => b.id === 'full');
  const pi = cls.blocks[full].items.findIndex(it => it.isPeak);
  const peakOpts = G.swapOptions(ctx, s, cls, full, pi, 3);
  peakOpts.forEach(o => assert.ok(ctx.peakById.teaser.versions.includes(o.id), 'peak swaps stay in the teaser family'));
});

test('lock: rebuilding keeps locked blocks exactly', () => {
  const s = { level: '2', group: 'middle', peakId: 'elephant' };
  const cls = build(s, 31);
  const a = blockIndex('abs'), p = blockIndex('prone');
  const locked = { abs: cls.blocks[a], prone: cls.blocks[p] };
  for (let i = 0; i < 6; i++) {
    const next = G.buildClass(ctx, s, { seed: 60 + i, locked }).class;
    assert.deepEqual(next.blocks[a].items, cls.blocks[a].items);
    assert.deepEqual(next.blocks[p].items, cls.blocks[p].items);
    assert.deepEqual(G.validate(ctx, s, next), []);
  }
});

test('variety: Build another gives a clearly different class', () => {
  const s = { level: '1', group: 'older' };
  const a = build(s, 1);
  const idsA = items(a).map(x => x.ex.id);
  const b = build(s, 2, { recent: idsA });
  const idsB = new Set(items(b).map(x => x.ex.id));
  const overlap = idsA.filter(id => idsB.has(id)).length / idsA.length;
  assert.ok(overlap < 0.6, 'overlap ' + overlap.toFixed(2));
});

test('timing: a template that does not total 50 gives a friendly message', () => {
  const r = G.buildClass(ctx, { level: '1', group: 'older', timing: { footwork: 10, bridging: 4, abs: 5, plank: 3, lower: 4, upperback: 4, upperfront: 4, side: 3, full: 7, prone: 5, stretch: 5 } }, { seed: 1 });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /add up to 54 minutes/);
});

test('timing: a section outside Jay\'s range gives a friendly message', () => {
  const r = G.buildClass(ctx, { level: '1', group: 'older', timing: { footwork: 6, bridging: 4, abs: 5, plank: 3, lower: 4, upperback: 4, upperfront: 4, side: 3, full: 4, prone: 4, stretch: 9 } }, { seed: 1 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.includes('Functional has 8 minutes. It needs 10 to 15 minutes.'), r.errors.join(' '));
  assert.ok(r.errors.includes('Lengthening has 9 minutes. It needs 5 minutes.'));
});

test('timing: timings saved for the old 10 block layout fall back to the clients\' template', () => {
  const old = { footwork: 6, bridging: 4, abs: 5, lower: 6, upper: 6, side: 4, full: 7, prone: 4, stretch: 4, winddown: 4 };
  const cls = build({ level: '1', group: 'older', timing: old }, 5);
  assert.deepEqual(G.validate(ctx, { level: '1', group: 'older' }, cls), []);
  assert.equal(G.timingFits(ctx, 'flow', old), false);
});

/* ---------- Jay's Flow structure ---------- */
test('levels: Level 1 never uses coordination or balance work; Level 1.5 leans into it', () => {
  let l1 = 0, l15 = 0;
  for (let i = 0; i < 16; i++) {
    const a = items(build({ level: '1', group: GROUPS[i % 3] }, 1200 + i));
    a.forEach(x => assert.ok(!(x.ex.tags || []).some(t => t === 'coordination' || t === 'balance'), x.ex.id + ' at Level 1'));
    l1 += a.filter(x => (x.ex.tags || []).length && !(x.ex.tags.length === 1 && x.ex.tags[0] === 'supine-arms')).length;
    const b = items(build({ level: '1.5', group: GROUPS[i % 3] }, 1200 + i));
    l15 += b.filter(x => (x.ex.tags || []).some(t => ['coordination', 'balance', 'stability'].includes(t))).length;
  }
  assert.ok(l15 > l1 * 1.5, 'skill work at 1.5 (' + l15 + ') vs 1 (' + l1 + ')');
});

test('levels: Level 1 keeps clients in fewer positions than Level 1.5', () => {
  const changes = level => {
    let n = 0;
    for (let i = 0; i < 16; i++) {
      let prev = null;
      items(build({ level, group: GROUPS[i % 3] }, 1300 + i)).forEach(x => { if (prev && prev !== x.ex.position) n++; prev = x.ex.position; });
    }
    return n / 16;
  };
  const a = changes('1'), b = changes('1.5');
  assert.ok(a < b, 'Level 1 ' + a + ' vs Level 1.5 ' + b);
});

test('plank: Level 1 plank is on the mat or the long box, and a reformer-only room says what to tick', () => {
  for (const { s, cls } of SAMPLE) {
    if (s.level !== '1') continue;
    assert.ok(['mat', 'box'].includes(cls.blocks[blockIndex('plank')].station), JSON.stringify(s));
  }
  const r = G.buildClass(ctx, { level: '1', group: 'older', equipment: EQUIP_SETS[1] }, { seed: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0], 'Nothing fits the plank block with this equipment at Level 1 for older clients. Tick the Mat or Long box.');
});

test('supine arms: the abs block usually includes one, and Jay\'s overused four are weighted down hard', () => {
  let withSupine = 0, two = 0, overused = 0, n = 0;
  for (const { cls } of SAMPLE) {
    n++;
    const abs = cls.blocks[blockIndex('abs')].items.map(it => ctx.byId[it.id]);
    const sup = abs.filter(e => (e.tags || []).includes('supine-arms')).length;
    if (sup) withSupine++;
    if (sup > 1) two++;
    items(cls).forEach(x => { if (JAY_OVERUSED.includes(x.ex.id)) overused++; });
  }
  assert.ok(withSupine / n >= 0.7, 'supine arms in ' + withSupine + ' of ' + n);
  assert.ok(two / n <= 0.1, 'two supine arms exercises in ' + two + ' of ' + n + ' abs blocks (soft rule: usually one)');
  assert.ok(overused <= 2, 'overused supine arms used ' + overused + ' times in ' + n + ' classes');
});

test('supine arms: Jay\'s overused four are still possible when nothing fresher fits', () => {
  const st = G.normalize(ctx, { level: '1', group: 'older' });
  const R = G.rulesFor(ctx, st);
  JAY_OVERUSED.forEach(id => assert.equal(G.hardCheck(ctx, st, R, ctx.byId[id]), null, id + ' is allowed'));
  // flag every other abs option on the reformer as unsafe: the overused ones fill the block
  const feedback = ctx.exercises.filter(e => e.blocks.includes('abs') && !JAY_OVERUSED.includes(e.id)).map(e => ({ exerciseId: e.id, reason: 'unsafe', level: '1', group: 'older' }));
  const cls = build({ level: '1', group: 'older', feedback, equipment: { reformer: true, mat: true, box: true, chair: false, bosu: false, springboard: false, props: false } }, 9);
  const abs = cls.blocks[blockIndex('abs')].items.map(it => it.id);
  assert.ok(abs.every(id => JAY_OVERUSED.includes(id)), abs.join(', '));
});

test('cue card: shows the four section headers in order and keeps the first half of class on the left', () => {
  for (const [i, s] of [{ level: '1', group: 'older', peakId: 'teaser' }, { level: '1.5', group: 'middle' }, { level: '2', group: 'younger', peakId: 'elephant' }].entries()) {
    const cls = build(s, 1400 + i);
    const html = Print.cardHTML(ctx, cls, {});
    const heads = (html.match(/<div class="card-sec"><span>([^<]+)<\/span>/g) || []).map(h => h.replace(/.*<span>/, '').replace(/<\/span>/, '').replace(', continued', ''));
    assert.deepEqual([...new Set(heads)], ['Warm up', 'Strength and tone', 'Functional', 'Lengthening']);
    const k = Print.splitIndex(cls);
    const left = cls.blocks.slice(0, k).reduce((a, b) => a + b.minutes, 0);
    assert.ok(left >= 18 && left <= 32, 'left half covers ' + left + ' minutes');
    const [l, r] = html.split('card-fold');
    assert.ok(l.includes('1. Footwork') && r.includes('11. Stretch'), 'first half left, second half right');
  }
});

test('equipment percentages: asking for more springboard time gets it', () => {
  let withBoard = 0;
  for (let i = 0; i < 12; i++) {
    const cls = build({ level: '1', group: 'middle', shares: { reformer: 50, springboard: 40, chair: 0, mat: 10, bosu: 0 } }, 700 + i);
    if ((cls.stats.minutesByStation.springboard || 0) >= 8) withBoard++;
  }
  assert.ok(withBoard >= 9, 'springboard used in ' + withBoard + ' of 12');
});

test('equipment: older clients with no reformer either stay to one floor trip or explain the floor limit', () => {
  const eq = { reformer: false, mat: true, chair: true, bosu: true, springboard: true, box: false, props: true };
  const r = G.buildClass(ctx, { level: '1.5', group: 'older', peakId: 'elephant', equipment: eq }, { seed: 7 });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /floor more than once/);
  const ok = G.buildClass(ctx, { level: '1', group: 'older', equipment: eq }, { seed: 1 });
  if (ok.ok) assert.deepEqual(G.validate(ctx, { level: '1', group: 'older', equipment: eq }, ok.class), []);
  else assert.match(ok.errors[0], /floor more than once/);
});

test('equipment: impossible setups explain themselves', () => {
  const r = G.buildClass(ctx, { level: '1', group: 'older', equipment: { reformer: false, mat: false, chair: true, bosu: false, springboard: false, box: false, props: false } }, { seed: 1 });
  assert.equal(r.ok, false);
  assert.ok(r.errors[0].length > 20);
});
