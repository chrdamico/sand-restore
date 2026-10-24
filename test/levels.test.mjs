import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, N } from '../js/levels.js';

test('every level: sand matches picture, boxes fit, solvable by tapping free boxes', () => {
  for (let i = 0; i < 80; i++) {
    const lv = buildLevel(i);
    const sand = new Array(lv.pal.length).fill(0);
    for (const b of lv.boxes) { sand[b.color] += b.amount; assert.ok(b.pct >= 1 && b.pct <= 100, `level ${i} pct`); }
    for (let k = 1; k < lv.pal.length; k++) assert.equal(sand[k], lv.counts[k], `level ${i} colour ${k}`);
    assert.equal(lv.px.length, N * N);
    const occ = Array.from({ length: lv.rows }, () => new Array(lv.cols).fill(-1));
    for (const b of lv.boxes) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      assert.equal(occ[b.r + y][b.c + x], -1, `level ${i} overlap`);
      occ[b.r + y][b.c + x] = b.id;
    }
    const alive = new Set(lv.boxes.map((b) => b.id));
    const free = (b) => { for (let y = 0; y < b.r; y++) for (let x = b.c; x < b.c + b.w; x++) if (alive.has(occ[y][x])) return false; return true; };
    while (alive.size) {
      const f = lv.boxes.find((b) => alive.has(b.id) && free(b));
      assert.ok(f, `level ${i} stuck`);
      alive.delete(f.id);
    }
  }
});

test('levels are deterministic', () => {
  assert.deepEqual(buildLevel(12).boxes, buildLevel(12).boxes);
});
