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
