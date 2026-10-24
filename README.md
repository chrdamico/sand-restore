# Sand Restore

A relaxing sand puzzle for podcast busywork, cloned from the "Color Balls" ad game. A faded picture sits on top; below it, boxes of coloured sand. Tap a box with nothing above it, its sand pours into the matching pixels, and the picture comes back. Empty every box to finish the level. No timer, no fail state.

- 30 hand-made levels (pharaoh, cat, rocket, pyramids, mandalas, stained glass, ...), then endless generated ones
- Progress saved in localStorage
- Plain static files, no build: `index.html`, `style.css`, `js/levels.js` (pictures + box generator, pure), `js/game.js` (UI)

Play: https://chrdamico.github.io/sand-restore/

- `npm test`: checks every level's sand adds up to its picture and is solvable
- `npm run serve`: local server on :8080
- `node tools/sheet.mjs out/sheet.ppm 0 30`: contact sheet of the level pictures (`out/` is git-ignored)
