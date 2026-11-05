#!/usr/bin/env node
// Builds the image prompt for every exercise, writes images/PROMPTS.md and keeps
// images/status.json in sync (one entry per image, in generation order).
// Order: peak pose images first, then the most used exercises, then the rest.
// Usage counts come from scripts/images/usage.json when it exists (made by make-samples.js).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const ex = JSON.parse(fs.readFileSync(path.join(root, 'data/exercises.json'), 'utf8')).exercises;
const peaks = JSON.parse(fs.readFileSync(path.join(root, 'data/peak-poses.json'), 'utf8')).peaks;
const statusFile = path.join(root, 'images/status.json');
const usageFile = path.join(__dirname, 'usage.json');

const EQUIP = {
  reformer: 'The equipment is a Pilates reformer: a long low rectangular frame on the floor with a padded sliding carriage, two shoulder rests, a headrest, a padded footbar across the foot end, springs under the carriage, and two straps on ropes at the head end.',
  box: 'The equipment is a Pilates reformer (a long low frame with a padded sliding carriage, shoulder rests, footbar at the foot end and two straps on ropes at the head end) with a padded rectangular box placed on top of the carriage.',
  chair: 'The equipment is a Pilates Wunda chair: a padded box-shaped seat about knee height with a spring-loaded pedal bar across the front near the floor.',
  mat: 'The equipment is a thin exercise mat on the floor.',
  bosu: 'The equipment is a Bosu balance trainer: a half ball dome on a flat round base, sitting on the floor.',
  springboard: 'The equipment is a Pilates springboard: a tall flat wooden board mounted on a wall with hooks at different heights and coiled springs attached to handles or a bar, with an exercise mat on the floor in front.',
  standing: 'No equipment, the figure stands on a plain floor.'
};
const STYLE = 'Black and white 3D render of a smooth, faceless, sculpted figure like an elegant artist\'s mannequin, athletic and gender-neutral, with simple smooth limbs, no hair, no clothing details and no anatomical detail, like a store display mannequin.';
const FINISH = 'The equipment is rendered in the same smooth grayscale style. Clean pure white background, three-quarter side view, soft studio lighting, the whole body and all equipment fully in frame with a little space around, square format. The body position must be clearly identifiable from the image alone. No text, no logos, no face, no color, grayscale only.';

// Plainer wording for lying poses. Three lying poses were blocked by the image
// service's content filter and passed once reworded this way, so pending prompts
// use it from the start. Finished images keep the prompt they were made from.
const SOFTEN = [
  [/lying on the back/g, 'reclining face up'],
  [/lying back over/g, 'reclining back over'],
  [/lying face down/g, 'resting face down'],
  [/lying on one side/g, 'resting on one side'],
  [/hips and belly/g, 'hips and middle'],
  [/hands lightly behind the thighs/g, 'hands lightly holding the backs of the knees'],
  [/legs straight up and opened wide/g, 'legs reaching up toward the ceiling and opening out to the sides']
];
function soften(text) {
  return SOFTEN.reduce((t, [re, to]) => t.replace(re, to), text);
}

// Camera behind the figure. When the figure faces the straps (or the springboard, or away
// from the viewer), the default front three-quarter view kept turning it to face the camera
// and the footbar instead. Describing a camera behind and to one side fixed every one of those
// on the first or second try (November 5), so pending prompts get it by default.
const STRAP_END = 'The strap end is the head end of the reformer, the end with the two tall strap posts and pulleys.';
const CAMERA_BEHIND = {
  straps: STRAP_END + ' The camera looks from behind and to one side of the figure, so the figure\'s back is toward the camera, the footbar is in the near foreground behind the figure, and the strap posts are farther away in front of the figure.',
  board: 'The camera looks from behind and to one side of the figure, so the figure\'s back is toward the camera and the wall-mounted board is farther away in front of the figure.',
  away: 'The camera looks from behind and to one side of the figure, so the figure\'s back is toward the camera.'
};
function cameraFor(e) {
  const pose = e.pose;
  if ((e.equipment === 'reformer' || e.equipment === 'box') && /facing the (strap end|back straps|head end)/i.test(pose)) return CAMERA_BEHIND.straps;
  if (e.equipment === 'springboard' && /facing (the board|a (wall-mounted )?(pilates )?springboard)/i.test(pose)) return CAMERA_BEHIND.board;
  if (/(facing away from|back to|back toward) the (viewer|camera)/i.test(pose)) return CAMERA_BEHIND.away;
  return '';
}

function promptFor(e, extra) {
  return [STYLE, 'The figure is ' + soften(e.pose) + '.', cameraFor(e), EQUIP[e.equipment], extra || '', FINISH].filter(Boolean).join(' ');
}

let usage = {};
if (fs.existsSync(usageFile)) usage = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
const peakIds = peaks.map(p => p.versions[0]);
const rest = ex.filter(e => !peakIds.includes(e.id));
rest.sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0) || a.minLevel - b.minLevel);
const order = peakIds.map(id => ex.find(e => e.id === id)).concat(rest);

let status = {};
if (fs.existsSync(statusFile)) status = JSON.parse(fs.readFileSync(statusFile, 'utf8')).images.reduce((m, s) => (m[s.id] = s, m), {});
const images = order.map((e, i) => {
  const old = status[e.id] || {};
  return {
    order: i + 1,
    id: e.id,
    file: e.image,
    name: e.name,
    isPeak: peakIds.includes(e.id),
    status: old.status || 'pending',
    tries: old.tries || 0,
    note: old.note || '',
    // finished images keep the exact prompt they were made from
    prompt: old.customPrompt ? old.customPrompt : (old.status && old.status !== 'pending' && old.prompt ? old.prompt : promptFor(e)),
    customPrompt: old.customPrompt || ''
  };
});
fs.writeFileSync(statusFile, JSON.stringify({ about: 'Image generation status. status: pending, done, review (kept but needs a human look) or failed (placeholder shown). Edit customPrompt to override a prompt.', images }, null, 2) + '\n');

let md = '# Image prompts\n\nEvery exercise image is generated from these prompts with Higgsfield (GPT Image 2.5, medium quality, square). Peak pose images come first, then the most used exercises. The peak pose library reuses the image of each peak\'s full version.\n\nLocked style for every image: black and white 3D render of a smooth, faceless, sculpted figure on the real equipment, white background, three-quarter side view, soft studio lighting, whole body in frame, square, no text, no logos, no color.\n\n';
for (const im of images) {
  md += '## ' + im.order + '. ' + im.name + '\n\nFile: `images/' + im.file + '`' + (im.isPeak ? ' (peak pose)' : '') + '\n\n```\n' + im.prompt + '\n```\n\n';
}
fs.writeFileSync(path.join(root, 'images/PROMPTS.md'), md);
const counts = images.reduce((m, s) => (m[s.status] = (m[s.status] || 0) + 1, m), {});
console.log(images.length + ' images in queue', counts);
if (process.argv[2] === '--next') {
  const n = Number(process.argv[3] || 1);
  const next = images.filter(s => s.status === 'pending').slice(0, n);
  console.log(JSON.stringify(next.map(s => ({ id: s.id, file: s.file, prompt: s.prompt })), null, 2));
}
