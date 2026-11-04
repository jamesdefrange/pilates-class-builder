# Morning report: Pilates class builder

**Live link (send this to Jay):** https://jamesdefrange.github.io/pilates-class-builder/

Status at 8:58 am. Everything is built, tested and live. Exercise images are still being made one at a time; missing ones show a clean placeholder until they arrive.

## What got built

- **Setup screen:** class type (Flow on, four coming soon), level, clients (Older by default), a picture grid of 18 peak poses plus Add my own, equipment tick boxes, and More options (equipment percentages, easier exercises toggle, block timings).
- **Generator:** fills the 10 Flow blocks to exactly 50 minutes, follows every level and client rule, keeps equipment and spring changes low, builds toward the peak, and steps down to the closest safe version in plain words when the peak is too much.
- **Review screen:** pictures, springs, time, reps and cues for every exercise. Swap (3 options that pass every rule), Not right (5 choices, saved and followed from then on), Lock per block, Build another.
- **Cue card:** Print and Save as PDF. US Letter landscape, two halves, folds in half, one sheet. It shrinks type before spilling to a second page.
- **Also:** timing templates (save, name, set default, warning unless 50), saved classes (save, rename, open, delete), My feedback with Export, Questions for Jay, and a Rules and data page for you.
- **Data:** 255 exercises and 18 peak poses in editable files, every value tagged jay, research or assumption. See data/README.md.

## What is tested

- **36 automatic checks pass:** every hard rule is checked both ways. Built classes never break it, and the checker catches a deliberate break.
- **40 of 40 sample classes pass** every hard rule across all levels, client groups and 12 peaks (samples/SAMPLES.md).
- **300 random builds, 0 failures.** Average 1.4 equipment changes and 6.2 spring changes per class, reformer about 71 percent.
- **6 sample cue cards** printed to PDF and checked by eye: one landscape sheet each (samples/).
- **Checked in a browser** on laptop and phone sizes, and opened straight from the file on disk.

## Images

- **138 of 255 done at 8:58 am**, including all 18 peak poses and the most used exercises. 0 need review, 0 failed so far.
- **Still running**, one at a time as you asked. Higgsfield has been slow overnight (8 to 12 minutes per image since about 4 am), so the rest will take a while. The live site picks up new images each time they are pushed.
- **Fixed along the way:** 3 images redone after checking (short spine, incline push-ups, openings in straps). 4 were blocked by the content filter and worked on the one allowed retry. The prompt now avoids that.
- **Two kept but worth a glance:** side support on the reformer (hand near the shoulder rests instead of the footbar) and standing foot warm-up (deeper squat than a small plie).

## Credits

- **73 credits used so far** (896 at the start, 823 at 8:58 am). About 0.5 per image. The full set should land around 130 to 140.

## Known issues

- **Images incomplete** until the run finishes. Placeholders cover the gaps.
- **iPhone printing is untested on a real phone.** Desktop Chrome prints one landscape sheet. If an iPhone shows a tall preview, Jay taps Options > Landscape (the Save as PDF steps say so).
- **Saved classes and feedback stay in one browser.** If Jay switches devices, they do not follow him. The feedback export file is the bridge.
- **Level 1 with no reformer usually cannot be built.** The app explains why instead of breaking a rule.
- **Springboard and Bosu rarely come up** unless Jay raises their percentage under More options.
- **12 rules are best guesses** waiting on Jay (spring colors, what "closing pull down" means, the two added blocks, and more).
- **Your two build gates were skipped** because the brief said fully autonomous. The look was designed in code, not locked in Claude Design.

## Top 3 next steps

1. **Text Jay the link and the questions.** QUESTIONS-FOR-JAY.md has a copy-paste message.
2. **Have Jay build and print one class on his own phone or iPad**, and tell you if the card prints on one sheet.
3. **Fold his answers into the data files** (mostly equipment.json and levels.json), then run `npm test` and push.

## Where to look

- DECISIONS.md: every judgment call and why.
- images/REVIEW.md: images that need a human look.
- IDEAS.md: extras left out on purpose.
- DEPLOY.md: how updates go live.
