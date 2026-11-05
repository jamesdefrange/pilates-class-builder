# Pilates class builder

A free web app for Jay that builds varied 50 minute Pilates flow classes in his four sections (Warm up, Strength and tone, Functional, Lengthening). Each class leads up to a chosen peak pose, follows the level rules, keeps equipment and spring changes low, and prints as a cue card that folds in half.

No logins, no server, no paid services. Everything Jay saves stays in his browser.

## How to open it

- **The live link** is at the top of MORNING-REPORT.md. Send Jay that link. It works on phone, iPad and laptop.
- **On this Mac:** double-click `index.html`. It opens in your browser and works without internet.

## How Jay uses it

1. Pick the level, the clients and (optionally) a peak pose. Tick the equipment in the room.
2. Press **Build my class**.
3. Look it over. **Swap** any exercise, mark anything **Not right**, **Lock** a block you like and press **Build another** for a fresh version.
4. Press **Print** or **Save as PDF**. The cue card fits one sheet, landscape, and folds in half.

## What is in here

| Folder or file | What it is |
|---|---|
| `index.html`, `css/`, `js/` | The app. Plain HTML, CSS and JavaScript. |
| `data/` | Every rule and every exercise, in editable files. See `data/README.md`. |
| `images/` | One picture per exercise. `images/PROMPTS.md` has every prompt, `images/REVIEW.md` lists any that need a look. |
| `samples/` | 6 printable cue cards (HTML and PDF) and a table of 40 sample classes. |
| `tests/` | Automatic checks for every hard rule. |
| `scripts/` | Small helper scripts (bundle data, make samples, images). |

## For James: common jobs

Each command goes in Terminal, inside this folder.

**After editing anything in /data**, rebuild the bundle the app reads:

```bash
node scripts/build-data.js
```

**Run every rule check:**

```bash
npm test
```

**Make fresh sample classes and cue cards** (needs Google Chrome for the PDFs):

```bash
node scripts/make-samples.js
```

**After changing CSS or JavaScript**, bump the version so phones load the new files:

```bash
scripts/bump-version.sh
```

**Publish changes** to the live site: commit and push to `main`. GitHub Pages updates in a minute or two. See DEPLOY.md.

## Other notes

- DECISIONS.md lists every judgment call made while building.
- QUESTIONS-FOR-JAY.md has short questions only Jay can answer.
- IDEAS.md has extra ideas that were left out to keep things simple.
