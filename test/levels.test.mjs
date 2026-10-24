import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, COLS } from '../js/levels.js';
import { Sim, solve } from '../js/sim.js';

test('every level: sand matches blocks, blocks fit and start below the dock, bot can finish it', () => {
  for (let i = 0; i < 60; i++) {
    const lv = buildLevel(i);
    assert.equal(lv.W * lv.H, lv.px.length);
    assert.equal(lv.W % COLS, 0);
    const cap = new Array(lv.pal.length).fill(0);
    for (const b of lv.blocks) cap[b.color] += b.cap;
    for (let k = 1; k < lv.pal.length; k++) assert.equal(cap[k], lv.counts[k], `level ${i} colour ${k}`);
    const occ = new Set();
    for (const b of lv.blocks) for (const [dr, dc] of b.cells) {
      assert.ok(b.r + dr >= 1 && b.r + dr < lv.rows && b.c + dc >= 0 && b.c + dc < COLS, `level ${i} bounds`);
      const key = (b.r + dr) * COLS + b.c + dc;
      assert.ok(!occ.has(key), `level ${i} overlap`);
      occ.add(key);
    }
    assert.ok(solve(lv, 3) >= 0, `level ${i} unsolved with another sand seed`);
  }
});

test('only blocks in the dock grab, and only matching bottom sand', () => {
  const sim = new Sim(buildLevel(0), 1);
  sim.settle();
  assert.equal(sim.left, sim.total, 'nothing is grabbed with every block below the dock');
  const wrong = sim.blocks.find((b) => sim.score(b, 0, 0) === 0);
  wrong.r = 0; wrong.c = 0;
  const right = sim.blocks.find((b) => b !== wrong && sim.score(b, 0, 4) > 0 && b.cells.every(([dr, dc]) => dc < 4));
  right.r = 0; right.c = 4;
  sim.settle(60);
  assert.equal(wrong.taken, 0, 'wrong colour grabs nothing');
  assert.ok(right.taken > 0, 'matching colour grabs');
});

test('sand falls into gaps', () => {
  const lv = buildLevel(0);
  const sim = new Sim(lv, 1);
  const x = 3, yb = sim.H - 1;
  const above = sim.g[(yb - 1) * sim.W + x];
  sim.g[yb * sim.W + x] = 0;
  sim.settle();
  assert.ok(sim.g[yb * sim.W + x], 'bottom refilled');
  assert.equal(sim.g[0 * sim.W + x], 0, 'column shifted down, top is empty');
  assert.ok(above);
});

test('levels are deterministic', () => {
  assert.deepEqual(buildLevel(12).blocks, buildLevel(12).blocks);
});
