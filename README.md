# Sand Restore

A relaxing sand puzzle for podcast busywork, inspired by the "Color Balls" ad game. A picture made of sand sits on top. Below it is a grid of coloured blocks of different shapes (a little sliding puzzle).

- Drag a block (or tap it: tap sends it up, tap again sends it back down) to the glowing top row, the "dock", directly under the picture.
- Only blocks in the dock grab sand, automatically, and only the bottom-row grains right above their cells, and only grains of the block's own colour.
- Grabbed grains leave a gap; everything above falls, and piles slide like sand. New colours reach the bottom, so you swap blocks to catch them.
- A full block disappears (freeing space). Clear all the sand to finish. No timer, no fail state; restart button if you jam the grid.

30 hand-made pictures (coarse 16x16 sand for the first 12 and the mandalas, 24x24 later), then endless generated ones. Progress is saved in localStorage.

Play: https://chrdamico.github.io/sand-restore/

Files (static, no build):
- `index.html`, `style.css`, `js/game.js` (UI, drag, drawing)
- `js/sim.js` (pure simulation: sand physics, grabbing, block movement BFS, and a greedy bot that proves a level is finishable)
- `js/levels.js` (pictures, downsampling to sand, block generator; a layout is only kept if the bot can finish it with two different sand seeds)

- `npm test`: block capacity equals sand per colour, layout is valid, bot finishes levels 1-60, grab and gravity rules
- `npm run serve`: local server on :8080
- `node tools/sheet.mjs out/sheet.ppm 0 30`: contact sheet of the level pictures (`out/` is git-ignored)
