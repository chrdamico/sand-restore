// Pure game simulation (no DOM): sand picture on top, blocks on a grid below.
// Only blocks with a cell in board row 0 (the dock, touching the picture) grab sand,
// and only the bottom-row grain above each of their cells, if it has the block's colour.
// Grains above a gap fall straight down, or slide diagonally off a pile, like sand.

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return (h ^ (h >>> 16)) >>> 0; };

export class Sim {
  constructor(lv, seed = 1) {
    this.lv = lv;
    this.W = lv.W; this.H = lv.H; this.cols = lv.cols; this.rows = lv.rows;
    this.pxc = lv.W / lv.cols;
    this.g = Uint8Array.from(lv.px);
    this.sh = new Uint8Array(this.W * this.H);
    this.left = 0;
    for (let p = 0; p < this.g.length; p++) {
      this.sh[p] = hash(p % this.W, (p / this.W) | 0) & 255;
      if (this.g[p]) this.left++;
    }
    this.total = this.left;
    this.blocks = lv.blocks.map((b) => ({ ...b, taken: 0, done: false }));
    this.tick = 0;
    this.dirty = true;
    this.events = [];
    this.s = (seed * 2654435761) >>> 0 || 1;
  }

  rnd() { let s = this.s; s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; this.s = s; return s / 4294967296; }

  gravity() {
    const { W, H, g, sh } = this;
    let moved = 0;
    const flip = this.tick & 1;
    for (let y = H - 2; y >= 0; y--) {
      for (let k = 0; k < W; k++) {
        const x = flip ? W - 1 - k : k;
        const p = y * W + x;
        const v = g[p];
        if (!v) continue;
        const d = p + W;
        let to = -1;
        if (!g[d]) to = d;
        else {
          const first = this.rnd() < 0.5 ? -1 : 1;
          for (let t = 0; t < 2; t++) {
            const s = t ? -first : first, nx = x + s;
            if (nx < 0 || nx >= W) continue;
            if (!g[d + s] && !g[p + s]) { to = d + s; break; }
          }
        }
        if (to >= 0) { g[to] = v; g[p] = 0; sh[to] = sh[p]; moved++; }
      }
    }
    return moved;
  }

  grab() {
    const { W, H, g, pxc } = this;
    let n = 0;
    for (const b of this.blocks) {
      if (b.done) continue;
      for (const [dr, dc] of b.cells) {
        if (b.r + dr !== 0) continue;
        const x0 = (b.c + dc) * pxc;
        for (let x = x0; x < x0 + pxc && b.taken < b.cap; x++) {
          const p = (H - 1) * W + x;
          if (g[p] === b.color) { g[p] = 0; b.taken++; this.left--; n++; this.events.push({ x, y: H - 1, color: b.color, id: b.id, cell: b.c + dc }); }
        }
      }
      if (b.taken >= b.cap) b.done = true;
    }
    return n;
  }

  // one 30 Hz tick; returns activity (grains moved + grabbed)
  step() {
    this.tick++;
    const m = this.gravity();
    const n = this.tick % 2 ? this.grab() : 0;
    if (m || n) this.dirty = true;
    return m + n;
  }

  occ(skip) {
    const o = new Int16Array(this.rows * this.cols).fill(-1);
    for (const b of this.blocks) {
      if (b.done || b === skip) continue;
      for (const [dr, dc] of b.cells) o[(b.r + dr) * this.cols + b.c + dc] = b.id;
    }
    return o;
  }

  fits(b, r, c, o) {
    for (const [dr, dc] of b.cells) {
      const y = r + dr, x = c + dc;
      if (y < 0 || x < 0 || y >= this.rows || x >= this.cols || o[y * this.cols + x] !== -1) return false;
    }
    return true;
  }

  // BFS over one-cell moves; returns Int16Array of step counts per (r*cols+c), -1 = unreachable
  reach(b) {
    const { rows, cols } = this;
    const o = this.occ(b);
    const dist = new Int16Array(rows * cols).fill(-1);
    const q = [b.r * cols + b.c];
    dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const r = (q[h] / cols) | 0, c = q[h] % cols;
      for (const [a, d] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + a, nc = c + d;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || dist[nr * cols + nc] >= 0) continue;
        if (!this.fits(b, nr, nc, o)) continue;
        dist[nr * cols + nc] = dist[q[h]] + 1;
        q.push(nr * cols + nc);
      }
    }
    return dist;
  }

  // how many pixel columns under b's dock cells show b's colour right now if it sat at (r,c)
  score(b, r, c) {
    let s = 0;
    for (const [dr, dc] of b.cells) {
      if (r + dr !== 0) continue;
      const x0 = (c + dc) * this.pxc;
      for (let x = x0; x < x0 + this.pxc; x++) if (this.g[(this.H - 1) * this.W + x] === b.color) s++;
    }
    return s;
  }

  settle(limit = 900) {
    let quiet = 0;
    for (let i = 0; i < limit && quiet < 4; i++) quiet = this.step() ? 0 : quiet + 1;
  }
}

// Greedy bot used to prove a level can be finished. Returns the number of moves, or -1.
export function solve(lv, seed = 1) {
  const sim = new Sim(lv, seed);
  const { cols, rows } = sim;
  let moves = 0;
  for (let it = 0; it < 400; it++) {
    if (sim.left === 0) return moves;
    let best = null;
    for (const b of sim.blocks) {
      if (b.done) continue;
      const dist = sim.reach(b);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const d = dist[r * cols + c];
        if (d < 0) continue;
        const s = sim.score(b, r, c);
        if (s > 0 && (!best || s > best.s || (s === best.s && d < best.d))) best = { b, r, c, s, d };
      }
    }
    if (best) {
      best.b.r = best.r; best.b.c = best.c; moves++;
      sim.settle();
      continue;
    }
    // nothing useful: push idle dock blocks as deep as they go
    let parked = false;
    for (const b of sim.blocks) {
      if (b.done || b.r !== 0) continue;
      const dist = sim.reach(b);
      let to = null;
      for (let r = rows - 1; r > 0 && !to; r--) for (let c = 0; c < cols; c++) if (dist[r * cols + c] >= 0) { to = [r, c]; break; }
      if (to) { b.r = to[0]; b.c = to[1]; parked = true; moves++; }
    }
    if (!parked) return -1;
  }
  return sim.left === 0 ? moves : -1;
}
