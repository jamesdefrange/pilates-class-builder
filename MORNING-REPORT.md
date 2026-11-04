# Morning report: Pilates class builder

**Live link (send this to Jay):** https://jamesdefrange.github.io/pilates-class-builder/

Status at 11:45 am. Everything is built, tested and live, including all 255 exercise images.

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

- **All 255 done**, made one at a time as you asked. That includes all 18 peak poses. 254 are good, 1 needs a look (below), 0 failed, no placeholders left.
- **Why it took all morning.** Overnight it averaged 8 to 12 minutes per image. Higgsfield itself is quick; the time went to the Mac pausing (long idle gaps) and tool timeouts. Once keep-awake was on, the last 81 took about 80 minutes.
- **Fixed along the way:** 11 images redone after checking. 10 came out right on the second try; chest expansion on the box never did. The most common mistake was a springboard figure facing the wrong way. 8 were blocked by the content filter and worked on the one allowed retry. Most were lying poses, so later prompts used plainer wording from the start.
- **Needs a look: chest expansion on the box.** After 3 tries the figure still faces the footbar instead of the strap end. The best try is kept. It probably needs a reference photo to get right.
- **Seven kept with small imperfections**, listed in images/REVIEW.md. For example, the clam's top knee is only slightly open. An instructor would still recognize each one.

## Credits

- **134.5 credits used** (896 at the start, 761.5 left, checked at 11:45 am). The math: 255 images at 0.5 each is 127.5. Add 12 redos and 1 duplicate job from a connection glitch, 13 at 0.5, which is 6.5. That makes 134. The last 0.5 is not traced; most likely one content filter block that was not refunded.

## Known issues

- **One image is wrong:** chest expansion on the box faces the footbar. Fix it with a reference photo, or ask Jay if he would rather drop it.
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
