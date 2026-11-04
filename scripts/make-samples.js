#!/usr/bin/env node
// Builds 40 sample classes across every level, client group and several peak poses,
// checks each against every hard rule, and saves 6 cue cards as print-ready HTML and PDF.
// Usage: node scripts/make-samples.js            (needs Google Chrome for the PDFs)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const G = require('../js/generator.js');
const Print = require('../js/print.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'samples');
fs.mkdirSync(out, { recursive: true });
const names = ['levels', 'client-groups', 'class-types', 'equipment', 'exercises', 'peak-poses', 'abbreviations', 'questions'];
const data = {};
for (const n of names) data[n] = JSON.parse(fs.readFileSync(path.join(root, 'data', n + '.json'), 'utf8'));
const ctx = G.prepare(data);

const LEVELS = ['1', '1.5', '2', '2.5'];
const GROUPS = ['older', 'middle', 'younger'];
const PEAKS = [null, 'teaser', 'elephant', 'swan', 'side-plank', 'long-stretch', 'mermaid', 'single-leg-bridge', 'knee-stretches', 'star', 'short-spine', 'push-up', 'going-up-front'];

const rows = [];
const classes = [];
let failures = 0;
for (let i = 0; i < 40; i++) {
  const s = { level: LEVELS[i % 4], group: GROUPS[Math.floor(i / 4) % 3], peakId: PEAKS[i % PEAKS.length] };
  const r = G.buildClass(ctx, s, { seed: 2026 + i * 7 });
  if (!r.ok) { failures++; rows.push({ i: i + 1, s, ok: false, problems: r.errors.join(' ') }); continue; }
  const problems = G.validate(ctx, s, r.class);
  if (problems.length) failures++;
  rows.push({ i: i + 1, s, ok: !problems.length, problems: problems.map(p => p.text).join('; '), cls: r.class });
  classes.push(r.class);
}

// usage counts help order image generation (most used first)
const usage = {};
classes.forEach(c => c.blocks.forEach(b => b.items.forEach(it => { usage[it.id] = (usage[it.id] || 0) + 1; })));

let md = '# Sample classes\n\n40 classes built by `node scripts/make-samples.js` across every level, client group and 12 peak poses. Each one is checked against every hard rule.\n\n';
md += '**Result: ' + (40 - failures) + ' of 40 pass every hard rule.**\n\n';
md += '| # | Level | Clients | Peak asked for | Peak used | Minutes | Exercises | Equipment changes | Spring changes | Equipment | Passes |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const r of rows) {
  const c = r.cls;
  const peakAsked = r.s.peakId ? ctx.peakById[r.s.peakId].name : 'None';
  const peakUsed = c && c.peak && c.peak.exerciseId ? ctx.byId[c.peak.exerciseId].name : 'None';
  const eq = c ? Object.keys(c.stats.minutesByStation).map(k => ctx.stations[k].label + ' ' + c.stats.minutesByStation[k]).join(', ') : '';
  md += '| ' + [r.i, ctx.levels[r.s.level].label, ctx.groups[r.s.group].label, peakAsked, peakUsed,
    c ? c.stats.totalMinutes : '', c ? c.stats.exerciseCount : '', c ? c.stats.equipmentChanges : '', c ? c.stats.springChanges : '', eq, r.ok ? 'Yes' : 'No: ' + r.problems].join(' | ') + ' |\n';
}
fs.writeFileSync(path.join(out, 'SAMPLES.md'), md);
fs.writeFileSync(path.join(out, 'sample-classes.json'), JSON.stringify(classes, null, 1));

// cue cards
const css = fs.readFileSync(path.join(root, 'css', 'print.css'), 'utf8');
const fitSrc = Print.fit.toString();
const picks = [
  { file: 'cue-card-1-level1-older-no-peak', s: { level: '1', group: 'older', peakId: null }, name: 'Level 1, older clients' },
  { file: 'cue-card-2-level1-older-teaser', s: { level: '1', group: 'older', peakId: 'teaser' }, name: 'Level 1, older clients, teaser' },
  { file: 'cue-card-3-level1.5-older-swan', s: { level: '1.5', group: 'older', peakId: 'swan' }, name: 'Level 1.5, older clients, swan' },
  { file: 'cue-card-4-level2-middle-elephant', s: { level: '2', group: 'middle', peakId: 'elephant' }, name: 'Level 2, middle-aged clients, elephant' },
  { file: 'cue-card-5-level2-older-side-plank', s: { level: '2', group: 'older', peakId: 'side-plank' }, name: 'Level 2, older clients, side plank' },
  { file: 'cue-card-6-level2.5-younger-star', s: { level: '2.5', group: 'younger', peakId: 'star' }, name: 'Level 2.5, younger clients, star' }
];
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const haveChrome = fs.existsSync(chrome);
for (const [k, p] of picks.entries()) {
  const r = G.buildClass(ctx, p.s, { seed: 5150 + k });
  if (!r.ok) { console.log('could not build', p.file, r.errors); continue; }
  const problems = G.validate(ctx, p.s, r.class);
  if (problems.length) { console.log('rule problem', p.file, problems); continue; }
  const card = Print.cardHTML(ctx, r.class, { name: p.name, imageBase: '../images/' });
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + p.name + ' cue card</title>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><style>' + css +
    '\n@media screen { body { background: #ddd; margin: 0; padding: 20px; } .card-page { margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,.2); } .tip { font: 15px -apple-system, sans-serif; text-align: center; margin: 0 0 14px; } }\n@media print { .tip { display: none; } }</style></head><body class="has-card">' +
    '<p class="tip">Print this page in landscape (US Letter). It fits one sheet and folds in half.</p><div id="print-root">' + card + '</div>' +
    '<script>var fit = ' + fitSrc + ';\nfunction go(){ fit(document.getElementById("print-root")); }\nif (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();\n</script></body></html>';
  const htmlPath = path.join(out, p.file + '.html');
  fs.writeFileSync(htmlPath, html);
  if (haveChrome) {
    try {
      execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=4000',
        '--print-to-pdf=' + path.join(out, p.file + '.pdf'), 'file://' + htmlPath], { stdio: 'ignore', timeout: 60000 });
    } catch (e) { console.log('PDF failed for', p.file, e.message); }
  }
}
console.log('samples: ' + (40 - failures) + ' of 40 pass. Cue cards: ' + picks.length + (haveChrome ? ' (HTML and PDF)' : ' (HTML only, Chrome not found)'));
if (process.argv.includes('--usage')) {
  fs.writeFileSync(path.join(root, 'scripts', 'images', 'usage.json'), JSON.stringify(usage, null, 1));
  console.log('usage.json updated');
}
process.exit(failures ? 1 : 0);
