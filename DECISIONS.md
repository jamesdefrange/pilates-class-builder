# Decisions

Every judgment call made during the overnight build, with the reason. Newest sections are added at the bottom.

## Process

- **Gates treated as passed.** James's global rules ask for a thinking gate and a visual lock before new builds. The brief for this build was fully specified and said to run autonomously without stopping, so the brief itself was treated as the passed gates. The look was designed in code instead of Claude Design. If the look needs changing, that is a follow-up.
- **Images: one at a time (update from James mid-build).** James sent an update overriding "batch up to 12 at a time". Images are generated one job at a time: submit one job, wait for it with jobs_wait, download it, then pause about 20 seconds before the next. On an error, rate limit or timeout: wait 2 minutes and retry that same image once. If it fails again, mark it in images/REVIEW.md, keep the placeholder, wait 5 minutes and continue at a slower pace. No fast retry loops. If credits run low, stop, keep placeholders and write the missing prompts to images/PROMPTS.md.

## Tech

- **Plain HTML, CSS and JavaScript, no build step.** Matches the brief and keeps it free to host.
- **Data bundled into data/data.js.** Browsers block reading JSON files when a page is opened straight from disk. `npm run build-data` (or `node scripts/build-data.js`) copies every JSON file in /data into data/data.js. The JSON files stay the source of truth.
- **Classic scripts, not ES modules.** ES modules also fail when opened from disk in Chrome, so every script attaches to one global (`window.PCB`).
- **Everything Jay saves lives in the browser (localStorage).** No accounts, no server. Downside: saved classes and feedback stay on the device he used. The "Export my feedback" file is the bridge to James.
- **GitHub Pages needs a public repo on the free GitHub plan.** James's account shows no paid plan, so the repo is public. Nothing private is in it: exercise data, images and code only.

## Images

- **Model and quality: GPT Image 2.5, medium, 1k, square.** Costs 0.5 credits per image (preflight checked). Low was 0.25 and high 1.5. Medium gave a clean, correct teaser on the first try, so all images use it.
- **Style locked by James.** James saw the first test image (teaser on the reformer) mid-build and said to follow that same style for every position image. The prompt template in scripts/images/prompts.js is that exact template.
- **Peak pose images reuse the full-version exercise image.** A peak pose is an exercise, so generating it twice would spend credits on a duplicate. Peak images are generated first.
- **Images saved as 480 px grayscale JPEG.** Converting to grayscale guarantees "no color". Each file is about 15 KB, so the whole set stays small for phones.
- **Images run one at a time in a background helper** while the app is built, following James's pacing rules. Progress is tracked in images/status.json so the run can resume.
- **Image checks use contact sheets.** Every 6 images are tiled into one labeled sheet and checked by eye against the prompt (position, equipment, which parts are lifted).
