# How to edit the data

Every rule the class builder follows lives in these files. Nothing about levels, clients, equipment or exercises is written into the app code.

**After any edit, run this in Terminal from the project folder** so the app picks up the change:

```bash
node scripts/build-data.js
```

Then run the checks to make sure nothing broke:

```bash
npm test
```

## Sources

Every value says where it came from:

- **jay**: Jay said it. Do not change without asking him.
- **research**: common contemporary studio practice.
- **assumption**: a best guess. These are the ones to confirm with Jay (see QUESTIONS-FOR-JAY.md).

Rules are written as `{ "value": ..., "source": "...", "note": "..." }`. In the exercise library, the whole exercise has one `source`, and spring colors take their source from `equipment.json`.

The Rules and data page in the app (footer link) shows all of this in readable tables.

## The files

### levels.json

The four levels (1, 1.5, 2, 2.5). Each has:

- `maxBodyPartsLifted`: 0 at Level 1 (nothing lifts), 1 at Level 1.5, 99 (no limit) at Level 2 and 2.5. The meaning of "lifted" is in `definitions`.
- `allowUnilateral`: single leg or single arm work.
- `maxChairMinutes`: 0 means no chair, `null` means no limit.
- `allowInversions`.
- `avoidSkills`: skill tags the level never uses. Level 1 leaves out coordination and balance (Jay: foundation work, no tricky moves).
- `preferSkills`: skill tags the builder leans toward. Level 1.5 prefers coordination, balance and stability (Jay).
- `transitionFactor`: how hard the builder works to keep clients in one position. High at Level 1, low at Level 1.5.

Each level also has `guidance`, Jay's own words on how the level should feel. It shows on the setup screen.

### client-groups.json

Older, middle-aged, younger. Hard rules (never broken): `allowInversions`, `maxSpinalFlexion` (none, light or deep), `maxFloorVisits` (how many separate times clients get down to the floor). Soft settings: `paceFactor` (more than 1 means slower, so fewer exercises), `challengeBias` (minus 1 prefers easier, plus 1 prefers harder), `springAdvice` (printed on the cue card), `timingTemplate` (which block timings to use by default).

### class-types.json

Class types. Only Flow is switched on; the others show as coming soon. Flow has:

- `sections`: Jay's four sections in order, each with its blocks, usual minutes and allowed `range`: Warm up 15, Strength and tone 15 to 20, Functional 10 to 15, Lengthening 5.
- `blocks`: the 11 blocks in order, each tagged with its section. Never reorder unless Jay asks.
- `timingTemplates`: built-in block minutes. Each must add up to 50 and keep every section inside its range. Jay can make his own in the app (saved in his browser).
- `overusedByJay`: exercises Jay called overused. They are weighted down hard but can still appear.
- `scoring`: weights for the soft rules. Higher means the builder cares more. For example `equipmentChange` and `springChange` set how hard it works to avoid changes, `shareDeviation` how closely it follows the equipment percentages, `variety` how much randomness there is between builds.

### equipment.json

- `stations`: where clients work (reformer, reformer with long box, chair, mat, Bosu, springboard, standing). Each has its spring settings with a label, a weight (for counting spring drops) and the colors.
- `checkboxes`: the equipment tick boxes on the setup screen and whether each is ticked at first.
- `flowRules`: minimum minutes per piece of equipment (no short hops), long box minimum (10), the cost of a spring drop, and the default percentage of class per equipment.

### exercises.json

The exercise library (323 exercises). Fields:

| Field | Meaning |
|---|---|
| `id` | Unique name used everywhere. Do not change once used, or saved classes lose it. |
| `name` | What Jay sees. |
| `equipment` | Station id from equipment.json. |
| `setup` | How to set up. |
| `props` | `weights` and or `circle`. Only used when small props are ticked. |
| `blocks` | Which blocks it can go in. |
| `minLevel` | Lowest level that can use it: 1, 1.5, 2 or 2.5. |
| `groups` | Client groups it suits. |
| `unilateral` | true if one arm or one leg works on its own. |
| `bodyPartsLifted` | See levels.json definitions. |
| `inversion` | true if it goes upside down. |
| `spinalFlexion` | none, light (small curl) or deep (loaded curl). |
| `floor` | true if clients are down on the floor. |
| `position` | supine, prone, seated, kneeling, standing and so on. |
| `usesStraps` | true if it uses the reformer straps (the builder keeps strap work from taking over). |
| `springs` | Spring id from the station in equipment.json. |
| `primary`, `secondary` | Muscle groups. |
| `prepares` | Movement patterns it warms up. Used to build toward a peak pose. |
| `reps` | Reps or time as printed. |
| `minutes` | `min`, `typical`, `max` minutes the builder may give it. |
| `cues` | 2 to 4 short cues using the shorthand. |
| `olderNote` | Extra note shown for older clients. |
| `intensity` | 1 easy, 2 moderate, 3 hard within its level. |
| `family` | Similar exercises share a family, so the builder spreads them out. |
| `tags` | Extra labels: `supine-arms` (counts as supine arms in the abs block), and the skills `coordination`, `balance` and `stability` used by the level rules. |
| `pose` | Plain description of the position, used to make the image. For springboard exercises, say which way the figure faces, for example "back toward the board" or "top of the head near the base of the board, feet pointing away". The image service gets this wrong otherwise. |
| `image` | File name in /images. |
| `source` | jay, research or assumption. |

**To add an exercise**, copy an existing one, give it a new `id` and `image`, and edit the fields. Then rebuild the bundle and run the tests. To make its picture, run `node scripts/images/prompts.js` and generate the image from the prompt it prints (see images/PROMPTS.md).

**To stop using an exercise everywhere**, mark it Unsafe in the app, or remove it from the file.

### peak-poses.json

18 peak poses. Each has:

- `requires`: movement patterns the class warms up first.
- `versions`: from the full pose down to the gentlest stand-in. The builder uses the first one allowed for the level, clients, equipment and Jay's feedback, and says so in plain words when it steps down.
- `buildUp`: exercises that lead toward it, simplest first.

Jay can also add his own peak in the app (Add my own on the setup screen). Those are saved in his browser.

### abbreviations.json

Shorthand used in cues. The cue card key prints only the ones used in that class. TT and HNS came from Jay.

### questions.json

The questions on the Questions for Jay screen.
