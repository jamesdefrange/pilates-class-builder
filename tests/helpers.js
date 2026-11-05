const path = require('path');
const fs = require('fs');
const G = require('../js/generator.js');

const root = path.join(__dirname, '..');
const names = ['levels', 'client-groups', 'class-types', 'equipment', 'exercises', 'peak-poses', 'abbreviations'];

function loadData() {
  const data = {};
  for (const n of names) data[n] = JSON.parse(fs.readFileSync(path.join(root, 'data', n + '.json'), 'utf8'));
  return data;
}

const data = loadData();
const ctx = G.prepare(data);
const LEVELS = ['1', '1.5', '2', '2.5'];
const GROUPS = ['older', 'middle', 'younger'];
const RANK = { '1': 1, '1.5': 1.5, '2': 2, '2.5': 2.5 };

function build(settings, seed, opts) {
  const r = G.buildClass(ctx, settings, Object.assign({ seed: seed || 1 }, opts || {}));
  if (!r.ok) throw new Error('Build failed for ' + JSON.stringify(settings) + ': ' + r.errors.join(' '));
  return r.class;
}

function items(cls) {
  const out = [];
  cls.blocks.forEach((b, bi) => b.items.forEach((it, ii) => out.push({ ex: ctx.byId[it.id], it, b, bi, ii })));
  return out;
}

/* A spread of settings used by many tests: every level, every group, several peaks and equipment sets. */
const EQUIP_SETS = [
  null,
  { reformer: true, mat: false, chair: false, bosu: false, springboard: false, box: false, props: false },
  { reformer: true, mat: true, chair: true, bosu: false, springboard: false, box: true, props: true },
  { reformer: false, mat: true, chair: true, bosu: true, springboard: true, box: false, props: true },
  { reformer: true, mat: false, chair: false, bosu: false, springboard: true, box: true, props: false }
];
const PEAKS = [null, 'teaser', 'elephant', 'swan', 'long-stretch', 'side-plank', 'mermaid', 'single-leg-bridge', 'knee-stretches', 'short-spine', 'star', 'going-up-front'];

/* Without a reformer, bridging and prone work all happen on the floor, so older clients (one floor
   visit) and Level 1 (no chair) often cannot be built. At Level 1, plank is only on the mat or the long
   box (Jay), so a reformer-only room cannot be Level 1 either. Those pairings are tested separately (they
   must fail with a clear message) and moved here to Level 1.5 middle-aged. */
function spread(n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = {
      level: LEVELS[i % 4],
      group: GROUPS[Math.floor(i / 4) % 3],
      peakId: PEAKS[i % PEAKS.length],
      equipment: EQUIP_SETS[Math.floor(i / 3) % EQUIP_SETS.length] || undefined
    };
    if (s.equipment && !s.equipment.reformer && s.level === '1') s.level = '1.5';
    if (s.equipment && s.level === '1' && !s.equipment.mat && !s.equipment.box) s.level = '1.5';
    if (s.equipment && !s.equipment.reformer && s.group === 'older') s.group = 'middle';
    list.push(s);
  }
  return list;
}

module.exports = { G, ctx, data, LEVELS, GROUPS, RANK, build, items, spread, EQUIP_SETS, PEAKS };
