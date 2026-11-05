# Morning report: Pilates class builder

**Live link (send this to Jay):** https://jamesdefrange.github.io/pilates-class-builder/

Updated November 5 at 11:45 am. Jay's real Flow structure is built, tested and live. 321 of 323 exercise pictures are done.

## What changed for Jay's Flow structure (November 5)

- **Four sections, eleven blocks, in Jay's order.** Warm up 15 min (Footwork, Bridge, Abs and supine arms). Strength and tone 18 min (Plank, Lower body, Upper back, Upper front, Side body and rotation). Functional 12 min (Full body, Back extension). Lengthening 5 min (Stretch). 15 + 18 + 12 + 5 = 50. All marked source jay.
- **Timings screen follows Jay's ranges.** Blocks are grouped by section. Warm up 15, Strength and tone 15 to 20, Functional 10 to 15, Lengthening 5. A section outside its range, or a total other than 50, shows a warning. Templates still save as before; old 10 block templates are set aside.
- **Bigger exercise library.** 68 new exercises, 255 to 323, mostly plank, side body and rotation, upper back, upper front and supine arms. Each of those blocks now has at least 6 Level 1 options on 2 or more pieces of equipment, and at least 12 Level 1.5 options on 4 or more. New ones are marked research, not jay.
- **Section headers on the review screen and the cue card.** The fold is unchanged: first half of class on the left, second half on the right. If the fold lands mid section, the right side says "continued".
- **Levels.** Level 1 and 1.5 are the two big buttons, Level 1 is the default. Levels 2 and 2.5 sit under More options. Jay's guidance shows under the picker and drives the rules:
  - **Level 1** never uses coordination or balance work, and changes of position cost nearly four times as much as at Level 1.5 (1.5 against 0.4), about 8 per class in testing.
  - **Level 1.5** leans toward coordination, balance and stability work and allows more transitions (about 14 per class).
- **Jay's four overused supine arms** (lower and lift, triceps press, abduction, arm circles) are weighted down hard. In 300 test builds they came up 0 times, and a fresh supine arms exercise was in the abs block in 256 of 300 classes. A test proves the overused four still appear when nothing else fits.
- **Kept the same:** peak pose logic (the peak still lands in Full body), equipment change rules, client groups.
- **Old saved classes** are labeled "old 10 block layout". They still open and print; swap and lock are off for them.

## What got built (whole app)

- **Setup screen:** class type (Flow on, four coming soon), level, clients (Older by default), a picture grid of 18 peak poses plus Add my own, equipment tick boxes, and More options (higher levels, equipment percentages, easier exercises toggle, block timings).
- **Generator:** fills Jay's 11 Flow blocks in 4 sections to exactly 50 minutes, follows every level and client rule, keeps equipment and spring changes low, builds toward the peak, and steps down to the closest safe version in plain words when the peak is too much.
- **Review screen:** pictures, springs, time, reps and cues for every exercise, under the four section headers. Swap (3 options that pass every rule), Not right (5 choices, saved and followed from then on), Lock per block, Build another.
- **Cue card:** Print and Save as PDF. US Letter landscape, two halves, folds in half, one sheet.
- **Also:** timing templates, saved classes, My feedback with Export, Questions for Jay, and a Rules and data page for you.
- **Data:** 323 exercises and 18 peak poses in editable files, every value tagged jay, research or assumption. See data/README.md.

## What is tested

- **49 automatic checks pass** (up from 36). New ones cover the sections and their ranges, option counts in the thin blocks, the Level 1 and 1.5 skill rules, fewer position changes at Level 1, the overused supine arms, and section headers on the cue card.
- **40 of 40 sample classes pass** every hard rule (samples/SAMPLES.md).
- **300 random builds, 0 failures.** Average 1.57 equipment changes and 6.43 spring changes per class (was 1.4 and 6.2, a little higher because there are more, shorter blocks). Reformer about 63 percent, long box 10, chair 12.
- **6 sample cue cards** rebuilt with the new pictures: one landscape sheet each.
- **Checked in a browser** on laptop and phone sizes.

## Images

- **New run: 67 of 68 made,** one at a time with the same pacing rules.
- **Diamond press has no picture.** The content filter blocked it twice, so the placeholder shows. It is listed in images/REVIEW.md.
- **8 redos.** Most were seated strap work where the figure faced the footbar instead of the straps. Describing a camera view from behind the figure fixed it, and using that wording up front got four more right first time.
- **6 more kept with small imperfections,** so images/REVIEW.md lists 13. For example, on two box exercises the hands are not holding the straps.
- **From the first run:** chest expansion on the box still faces the wrong way after 3 tries.

## Credits

- **This update: 37.5 credits** (761.5 before, 724 after, checked at 11:45 am). The math: 67 pictures plus 8 redos is 75 jobs, at 0.5 each that is 37.5. The 3 jobs the filter blocked were not charged, so it matches exactly.
- **First run: 134.5 credits** (896 to 761.5).

## Known issues

- **Two pictures need help:** chest expansion on the box faces the footbar, and the diamond press has none. Both probably need a reference photo, or Jay may prefer to drop them.
- **Level 1 needs the mat or the long box.** Jay's Level 1 planks are only on the mat or the box, so a reformer-only room cannot build Level 1. The app says "Tick the Mat or Long box."
- **A mat-only room cannot build Level 1 for middle-aged or younger clients.** Plank and full body compete for the same three mat planks. Club Pilates rooms have reformers, so I left it. The app asks for more equipment.
- **iPhone printing is untested on a real phone.** If an iPhone shows a tall preview, Jay taps Options > Landscape.
- **Saved classes and feedback stay in one browser.** The feedback export file is the bridge between devices.
- **Springboard and Bosu rarely come up** unless Jay raises their percentage under More options.
- **14 questions for Jay** (spring colors, how to split minutes inside each section, whether supine arms belong in every class, whether Level 1 is too strict, and more).
- **Your two build gates were skipped** for this update too, because the brief said autonomous.

## Top 3 next steps

1. **Text Jay the link and the questions.** QUESTIONS-FOR-JAY.md has a copy-paste message, now with the four new questions.
2. **Have Jay build one Level 1 and one Level 1.5 class** and say whether the difference between them feels right.
3. **Fold his answers into the data files**, then run `npm test` and push.

## Where to look

- DECISIONS.md: every judgment call and why. The newest section is "Jay's Flow structure (November 5)".
- images/REVIEW.md: pictures that need a human look.
- IDEAS.md: extras left out on purpose.
- DEPLOY.md: how updates go live.
