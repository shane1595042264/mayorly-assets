# Mayorly assets

The art library for **Mayorly**, a zero-friction desk for people who want to max out their output: a pet in the corner of the screen, a desk timer, ledgers a mute clerk files into, coins earned at the desk and spent on the couch. The app is [mayorly-app](https://github.com/shane1595042264/mayorly-app).

Since 2026-11-23 there is no town to walk around ([decision](https://github.com/shane1595042264/mayorly-design/blob/main/docs/04-decisions.md)). Art goes only where it replaces something already on screen and says something at a glance: the pet's states, the coin in motion, icons for Mayorly's own things. Every sprite drawn for the town has a place in the app; the table below says where.

Every sprite here is **hand-drawn**. No AI-generated art, ever.

---

## Where art goes

**One folder: [`art/`](art/)**

**One filename: `<slot-id>@1x.png`**

So the pet at rest is exactly this path, no other:

```
art/pet.tomato.rest@1x.png
```

The name is not decoration. The tooling matches the filename against `slots/<slot-id>.json` to find the spec it should be checked against. A file named `chest.png` validates against nothing and is ignored.

## What format

**PNG. Only PNG.** JPG is rejected on sight, because it cannot hold a real alpha channel and it destroys hard pixel edges.

**You should never have to think about format.** `tf scaffold` creates an **indexed PNG with the palette built in**, Aseprite opens it already in Indexed mode with Resurrect 64 loaded, you draw, you save. That is the whole thing, on any machine, with no Load Palette step.

| rule | what it means when you are drawing |
|---|---|
| **Indexed or RGBA** | The scaffold is indexed with the palette baked in; keep it that way. RGBA also passes. RGB *without* alpha is rejected, which is what a visible Background layer produces. |
| **Binary alpha** | Every pixel is either fully solid or fully see-through. **Turn anti-aliasing off.** Soft edges look blurry once the game scales the sprite up 3&times;. |
| **No Background layer** | In Aseprite, a visible Background layer makes the export drop its alpha channel entirely. See [ASEPRITE.md](ASEPRITE.md). This is the single most common first failure. |
| **Exact canvas** | Not "about 16 wide". Exactly the size the slot says. `tf scaffold` makes the canvas for you so you cannot get this wrong. |
| **Colour cap** | Between 8 and 24 colours depending on the slot. This is a feature, not a restriction, and it is most of what makes pixel art look professional. |
| **Transparent means empty** | Erase properly. Do not paint white behind a sprite. |
| **No `#FF00FF` magenta** | That exact pink is reserved as the "art is missing" marker. |
| **No colour profile** | Do not tick "embed colour profile" on export. It shifts your colours between your editor and the game. |

You do not have to memorise any of this. `tf watch` tells you the moment you break one, **and how to fix it**:

```
FAIL  prop1x1.chest.wooden.closed
      x PNG-32 (colour type 6, RGBA)   RGB
        Your sprite has a visible Background layer. In Aseprite: Layer menu >
        Background > Convert to Layer. Aseprite drops the alpha channel
        whenever a Background layer is visible.
```

Aseprite specifics, including the three settings to get right once: **[ASEPRITE.md](ASEPRITE.md)**.

---

## What to draw

<!-- STATUS:START -->
**16 of 35 drawn. 16 of today's still to draw.**

| | slot | canvas | frames | max colours | when | where it shows in the app | state |
|---|---|---|---|---|---|---|---|
| &#9745; | `icon.coin` | **16&times;16** | 1 | 12 | app | every coin: the counter, the flights, the market prices | 6/12 colours |
| &#9745; | `icon.ledger.closed` | **16&times;16** | 1 | 12 | app | the spines on the shelf in the Shelf tab, the Ledgers tab on the phone | 4/12 colours |
| &#9745; | `icon.ledger.locked` | **16&times;16** | 1 | 12 | app | the spine of a hand-written ledger on the shelf, and its lock on the Shelf tab's cards | 5/12 colours |
| &#9745; | `icon.ledger.open` | **16&times;16** | 1 | 12 | app | the Ledgers tab on the phone while it is open | 4/12 colours |
| &#9745; | `icon.tomato` | **16&times;16** | 1 | 12 | app | the pet, the tray and menu bar, the app icon, a tomato beside every count, the pomodoro mode in the Plus menu, the Desk tab on the phone | 5/12 colours |
| &#9745; | `pet.tomato.gaming` | **24&times;24** | 1 | 16 | app | the pet in gaming mode | 9/16 colours |
| &#9745; | `prop1x1.mailtray` | **16&times;16** | 1 | 20 | app | Capture in the Plus menu, and on the desk in the shelf scene while the tray holds entries | 4/20 colours |
| &#9745; | `prop2x2.desk.idle` | **32&times;32** | 1 | 24 | app | the desk in the shelf scene, and the empty Flow | 8/24 colours |
| &#9745; | `prop2x4.bookshelf` | **32&times;64** | 1 | 24 | app | the Shelf tab: your ledgers stand on it as spines, up to the nine it holds | 5/24 colours |
| &#9745; | `prop4x3.ledger.open` | **64&times;48** | 1 | 24 | app | the Shelf tab: the ledger you point at or pick, out of the shelf and open beside it, with its name and numbers written on the pages | 5/24 colours |
| &#9745; | `tile.floor.wood` | **16&times;16** | 1 | 16 | app | the floor of the shelf scene | 4/16 colours |
| &#9745; | `tile.terrain.dirt_path` | **16&times;16** | 1 | 16 | app | the path through the Leisure tab's band | 2/16 colours |
| &#9745; | `tile.terrain.grass_a` | **16&times;16** | 1 | 16 | app | the band along the top of the Leisure tab | 1/16 colours |
| &#9745; | `tile.wall.plaster` | **16&times;16** | 1 | 16 | app | the wall of the shelf scene | 3/16 colours |
| &#9745; | `ui9.panel.parchment` | **24&times;24** | 1 | 8 | app | the frame of the clerk's question card | 4/8 colours |
| &#9745; | `ui9.panel.wood` | **24&times;24** | 1 | 8 | app | the frames of the Keymap and What's New screens | 3/8 colours |
| &#9744; | `char.clerk.stand` | **16&times;32** | 1 | 24 | later | beside the shelf in the Shelf tab | not started |
| &#9744; | `font.digits` | **72&times;8** | 1 | 4 | later | the timer, the pet's number, the coin count | not started |
| &#9744; | `prop2x2.desk.working` | **32&times;32** | 1 | 24 | later | the desk in the shelf scene while a block runs: the lamp lit | not started |
| &#9744; | `glyph.barbell` | **16&times;16** | 1 | 12 | **today** | everywhere EXE shows its glyph | not started |
| &#9744; | `glyph.briefcase` | **16&times;16** | 1 | 12 | **today** | everywhere CAR shows its glyph | not started |
| &#9744; | `glyph.briefcase_metal` | **16&times;16** | 1 | 12 | **today** | everywhere PRO shows its glyph | not started |
| &#9744; | `icon.clerk` | **16&times;16** | 1 | 12 | **today** | in place of the stock AI sparkle (Capture, Ask, Calendar, Flow, What's New), and at 3x on the clerk's question card | not started |
| &#9744; | `icon.coin.spin` | **16&times;64** | 4 stacked | 12 | **today** | every coin in flight, in and out | not started |
| &#9744; | `icon.couch` | **16&times;16** | 1 | 12 | **today** | the Couch tile in the Plus menu, the Leisure tab, the phone's Couch tab | not started |
| &#9744; | `icon.letter` | **16&times;16** | 1 | 12 | **today** | Capture's prompt, and an unfiled entry in the tray | not started |
| &#9744; | `icon.market` | **16&times;16** | 1 | 12 | **today** | the Market tab | not started |
| &#9744; | `icon.stamp` | **16&times;16** | 1 | 12 | **today** | Clear in the Plus menu: the stamp on a finished entry | not started |
| &#9744; | `pet.tomato.couch` | **24&times;24** | 1 | 16 | **today** | the pet while a couch item runs | not started |
| &#9744; | `pet.tomato.held` | **24&times;24** | 1 | 16 | **today** | the pet while you drag it | not started |
| &#9744; | `pet.tomato.hold` | **24&times;24** | 1 | 16 | **today** | the pet while the desk is on hold | not started |
| &#9744; | `pet.tomato.hop` | **24&times;24** | 1 | 16 | **today** | the pet's hop when the pointer reaches it | not started |
| &#9744; | `pet.tomato.idle` | **24&times;24** | 1 | 16 | **today** | the pet while the desk is idle | not started |
| &#9744; | `pet.tomato.rest` | **24&times;24** | 1 | 16 | **today** | the pet during a rest | not started |
| &#9744; | `pet.tomato.work` | **24&times;48** | 2 stacked | 16 | **today** | the pet while a focus block runs | canvas ready, icon.tomato placed |
<!-- STATUS:END -->

## The app is not waiting for you

Every slot the app shows falls back to what it showed before (the plain tomato, the stock icon) until its PNG exists, so you never draw ahead of the code or code ahead of the drawing. In the app, `npm run art` copies what is in `art/` across, and `npm run art -- --watch` keeps doing it on every save while `localhost:5199/?art` shows each sprite where it lives, at its real scale. The issues, the tracker, `tf done`, placeholders, the manifest and the Release publishing were for outside artists and a game that fetched its art; drawing alone, skip them.

---

## The art desk

```bash
npm run desk       # or tf desk: http://127.0.0.1:4780, opened in your browser
```

Every slot on one page, live: what you are drawing now, what is up next in the order to draw it, what can wait, what is done. Pick one and you see your drawing beside its sketch at a whole scale, the brief, where it shows in the app, and every check the validator makes, red for what blocks and amber for advice. Each save in Aseprite lands on the page within a moment, re-checked.

**Start working** makes the canvas (the right size, indexed, the palette built in; a pet state's already has your tomato on it, where it sits, in every frame) and opens it in Aseprite with the sketch as a second tab, ready to draw. **Open in Aseprite** does the same for one you have started. **Mark done** appears once it passes. Keys: j and k (or the arrows) to move, Enter to open, d to mark done.

With the app checked out beside this repo, the desk also runs the app's `npm run art -- --watch`, so every passing save is in the app straight away (`--no-app` turns that off). It replaces `tf scaffold` and `tf watch` while you draw alone; they still work.

## The four commands

```bash
tf scaffold        # next slot: correctly sized empty PNG, opened for you
tf watch           # leave running beside your editor; every save is checked
tf done            # validates, closes the issue, ticks the tracker
tf brief           # what it is, the brief, and the sketch, for what you are on
tf sketch          # the same, plus the sketch as a PNG opened beside your canvas
tf next            # the ranked queue
tf help            # everything else
```

`tf` works from any directory once `npm run setup` has run. Every command also exists as `npm run <name>` if you prefer.

No slot name needed. **`scaffold` is the front door:** it first asks *"did you finish X?"* about anything you drew that passes but is not closed yet. Say **y** and it marks it done and opens the next canvas. Say **n** and it does nothing, so you cannot accidentally move on from unfinished work. Pass a slot id to either command if you want to jump around.

The loop: `tf scaffold <slot>` &rarr; draw &rarr; `watch` says PASS &rarr; look at it in the app's `?art` bench &rarr; next. Commit at the end.

```
11:32:47  ....  icon.coin   empty canvas, waiting for you
11:32:48  PASS  icon.coin   2/12 colours
11:33:02  FAIL  icon.coin
          x Canvas is exactly 16x16      20x16
          x Colours within the cap of 12   320 used
```

### One-time setup, on every machine you draw on

Works the same on macOS, Windows and Linux.

1. Install [Node 18+](https://nodejs.org), [GitHub CLI](https://cli.github.com) (`gh auth login`), and [Aseprite](https://www.aseprite.org).
2. Clone this repo, then:

```bash
npm run setup
```

That enables the git hooks (validate art on commit, refresh the README table), and **installs the master palette into Aseprite's presets folder** for whichever OS you are on. In Aseprite, open the palette Presets popup and press its refresh button (or F5) and Resurrect 64 appears. No restart.

Nothing else to install. There are no dependencies.

**If you commit from GitHub Desktop:** go to Options &rarr; Git &rarr; Hooks and turn on *Load Git hook environment variables from shell* (Desktop 3.5.5 or newer). Without it, Desktop's bundled Git cannot find `node`, the hook fails, and Desktop offers to bypass it. Committing from a terminal has no such problem.

### Shipping

```bash
fuck add the coin       # git add -A && git commit -m "add the coin", no quotes needed
git push                # or: fuck -p add the coin
tf done
```

The pre-commit hook validates the art and refreshes this README for you. To publish a build the game can fetch:

```bash
git tag assets-v1 && git push --tags
```

---

## The sketches are the developer talking

Every un-started slot carries an ASCII sketch. It is a picture of the brief, drawn by the person writing the code, so you know the shape, the proportions and where the anchor is before you spend an hour. It is not art and it is never committed: `tf sketch` renders it into `sketches/<slot>.sketch.png`, which is gitignored, and you redraw it your way in `art/`.

```
# outline   - shadow   o mid   + light   = accent   . transparent
```

## What to draw it in

<!-- TOOLS:START -->
### Buy Aseprite. $19.99.

It is the standard for pixel art, it runs natively on Apple Silicon, and it is the only editor whose PNG writer we verified line by line against its source. [aseprite.org](https://www.aseprite.org/)

The trial cannot save, so it only shows you the interface. It is also source-available, and compiling it yourself is permitted for your own use.

Read **[ASEPRITE.md](ASEPRITE.md)** before your first sprite. Three settings, once, and you will never see a format error.

### Free alternative: Pixelorama

[Pixelorama](https://orama-interactive.itch.io/pixelorama) is free, MIT licensed, actively developed, and has tilemap layers and autotiling. **It passes our validator.** Its exports always carry an `sRGB` marker chunk and never an `iCCP` profile, and we only reject `iCCP`, so this is a non-issue. Worth installing alongside Aseprite regardless.

### Do not bother

| | why |
|---|---|
| **Pyxel Edit** | Great tiling reputation, but the last release was 0.4.95 in **January 2022** and it runs on Adobe AIR. |
| **Procreate** | Requires a colour profile on every canvas, chosen at creation, with no "none" option and no way to change it later. |
| **Photoshop, Krita** | Painting applications. Anti-aliasing is the default on nearly every tool, which is the one thing our standard forbids. |
| **Pixelmash** | Its entire premise is downsampling high-resolution art, which generates blended edge pixels by design. |
| **LibreSprite** | The Aseprite fork. Latest stable is v1.1 from **2023**; v1.2 is a prerelease development build. |

### The pro move on colour mode

Draw in **Indexed** colour mode, then switch to **Sprite &rarr; Color Mode &rarr; RGB** just before exporting.

Indexed mode stores one palette slot per pixel, so a half-transparent pixel is *structurally impossible*. It makes the anti-aliasing rule enforce itself while you work. But an Indexed sprite exports as a palette PNG, which we reject, so the conversion before export is not optional.

If that feels like one step too many to remember, just work in RGB. It is the safe default and `tf watch` will catch you.

### The palette

**[Resurrect 64](https://lospec.com/palette-list/resurrect-64)** by **Kerrie Lake**. 64 colours, and the whole game is drawn from it.

The files are in [`palette/`](palette/) so you do not have to go and find them:

| file | for |
|---|---|
| `resurrect-64.gpl` | **Aseprite**, GIMP. This is the one you want. |
| `resurrect-64.ase` | Photoshop |
| `resurrect-64.pal` | JASC, most other editors |
| `resurrect-64.hex` | plain text, and what the validator reads |
| `resurrect-64.png` | the swatches as an image |

**Load it in Aseprite:** the palette panel menu (the small icon above the swatches) &rarr; **Load Palette** &rarr; pick `palette/resurrect-64.gpl`. Then only pick colours from that row and you cannot go wrong.

**How this fits the colour caps.** 64 is the *master* set for the whole game. The per-slot cap of 8 to 24 is how many of those 64 a *single sprite* may use. So a coin might use 6, a character 20, and they still look like the same game because every one of those colours came from the same 64.

This is the single biggest lever you have as a beginner. A limited palette chosen by someone with a good eye does more for how professional your art looks than years of drawing practice, and Kerrie Lake has already done that part for you.

**The validator warns, it does not block.** Straying off palette is a judgement call, so an off-palette colour is reported rather than rejected:

```
PASS  icon.coin   2/12 colours   1 advisory
      ! On the master palette   2 off-palette: #0cc8b4 #ff7803
```

**Licence:** Lospec publishes no formal licence for it. Asked directly on the palette page whether it could be used in a commercial game, Kerrie Lake replied "Absolutely!". That is the author's own word rather than a licence document, so credit her in the game credits.

### Learning to actually draw this

You are not missing talent, you are missing about four specific techniques.

| | |
|---|---|
| **[Pixel Logic](https://knowledgebook.itch.io/pixel-logic-a-guide-to-pixel-art)** | 242 pages, "$2.99 or more" on itch. The same book is $10 on the author's Gumroad. Start here. |
| **[Slynyrd's Pixelblog](https://www.slynyrd.com/pixelblog-archive)** | Free, and the best writing on pixel art anywhere. Start with the palette posts. |
| **[Miniboss tutorials](https://blog.studiominiboss.com/pixelart)** | Free, plus a $5 bundle. Short and practical. |

**The single highest-leverage thing: palette discipline.** Most of what reads as "professional" is colour choice, not draughtsmanship, which is exactly why every slot here has a colour cap of 8 to 24. Treat the cap as the design tool, not the restriction.

The four techniques worth learning first, in order:

1. **Hue shifting.** Shadows shift toward blue or purple and get darker; highlights shift toward yellow and get lighter. Never just add black. This one change does more than everything else combined.
2. **Readable silhouette.** Fill the sprite solid black. If you cannot tell what it is, no amount of interior detail will save it.
3. **No jaggies.** Keep pixel runs in a consistent progression along a curve, 4-3-2-1 rather than 3-1-4-2. Broken runs read as noise.
4. **One light direction.** Upper left, every asset, no exceptions.

### One licence warning, and it is serious

**Mana Seed** asset packs are excellent and widely recommended for exactly this genre. Their [licence](https://selieltheshaper.weebly.com/user-license.html) states the artist does not consent to their work being used *"in any machine learning datasets, nor used in a project alongside 'AI' generated imagery, **writing, code, or anything else**."*

This project is built with an AI coding assistant. As written, that clause plausibly bars the purchase outright, and it is not limited to AI art. **Do not buy Mana Seed for this project without reading that licence yourself.**

Kenney (CC0), Sprout Lands premium, and LimeZu carry no such clause.
<!-- TOOLS:END -->

---

## For developers

The game **never browses this repo**. It reads `manifest.json` from a Release, and a missing key means the art is not done yet.

```js
const man = await fetch(MANIFEST).then(r => r.json())
const chest = man.assets['prop1x1.chest.wooden.closed']
if (!chest || chest.placeholder) usePlaceholder()
else load(chest.url, chest.w, chest.h)
```

Fetch **one manifest and one archive** per build, from a GitHub Release. Do not fetch individual sprites from `raw.githubusercontent.com`: unauthenticated reads are capped at 60 per hour per IP, CI runners share egress addresses, and no rate-limit headers are returned, so there is no warning before it fails.

## For other artists, later

The [workshop](https://github.com/juntaoli-dev/mayorly-workshop) is a web app that lets someone **without** repo access claim a slot, drop a PNG, and have a pull request opened for them. It is built and working, and deliberately **switched off**, because for a solo artist who already has write access it is pure overhead.

Turn it on when someone else wants to draw.

## Why the validator parses PNG bytes instead of using a canvas

A canvas cannot do this job. Its 2D pipeline premultiplies alpha, so reading pixels back returns `0,0,0` for every transparent pixel regardless of what the file holds. A canvas-based check for stale colour under transparency **can never fail**, which is worse than having no check. Colour type and embedded colour profiles are likewise invisible to it.

So [`lib/validate.mjs`](lib/validate.mjs) walks the PNG chunks, inflates the image data, and un-filters the scanlines itself. No dependencies, and the same file runs in your browser, in Node, and in CI.

## Layout

```
classes.json        the nine art classes and their exact specs
slots/              one JSON per slot: what is needed, and why
art/                YOUR ART GOES HERE, as <slot-id>@1x.png
placeholders/       generated magenta stand-ins, gitignored
manifest.json       generated. what the game reads.
lib/validate.mjs    the validator. browser, node and CI all use this one file.
lib/png.mjs         a tiny PNG encoder, for scaffolds and placeholders
scripts/            next, scaffold, watch, sheet, check, manifest
```

Node 18 or newer. No dependencies anywhere.
