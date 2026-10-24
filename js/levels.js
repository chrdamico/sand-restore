// Level pictures (40x40, palette indexes, 0 = empty) and sand boxes.
// Everything here is pure so node can test it.
export const N = 40;
export const HAND_COUNT = 30;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

class Img {
  constructor() { this.d = new Uint8Array(N * N); this._over = null; }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < N && y < N) this.d[y * N + x] = c; return this; }
  shape(test, c) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (this._over && !this._over.includes(this.d[y * N + x])) continue;
      if (test(x + 0.5, y + 0.5)) this.d[y * N + x] = c;
    }
    return this;
  }
  within(vals, fn) { this._over = vals; fn(); this._over = null; return this; }
  rect(x0, y0, x1, y1, c) { return this.shape((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, c); }
  ell(cx, cy, rx, ry, c) { return this.shape((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, c); }
  ellR(cx, cy, rx, ry, a, c) {
    const cs = Math.cos(a), sn = Math.sin(a);
    return this.shape((x, y) => {
      const dx = x - cx, dy = y - cy;
      const u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
      return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
    }, c);
  }
  poly(pts, c) { return this.shape((x, y) => inPoly(pts, x, y), c); }
  line(x0, y0, x1, y1, w, c) { return this.shape((x, y) => segDist(x, y, x0, y0, x1, y1) <= w / 2, c); }
  recolor(from, to, fn) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
      if (this.d[y * N + x] === from && fn(x + 0.5, y + 0.5)) this.d[y * N + x] = to;
    return this;
  }
  mirrorX() {
    for (let y = 0; y < N; y++) for (let x = 0; x < N / 2; x++) this.d[y * N + (N - 1 - x)] = this.d[y * N + x];
    return this;
  }
}

// ---------- hand-drawn pictures ----------

function pharaoh() {
  const c = new Img();
  c.ell(20, 13, 12, 11, 1);
  c.poly([[8, 15], [32, 15], [36, 40], [4, 40]], 1);
  c.recolor(1, 2, (x, y) => Math.floor(y / 2) % 2 === 0);
  c.rect(10, 12, 30, 14.5, 1);
  c.ell(20, 24, 8, 10.5, 4);
  c.recolor(4, 5, (x) => x > 25);
  c.poly([[20, 4], [22.5, 10], [17.5, 10]], 6);
  c.ell(20, 11, 1.6, 1.4, 6);
  for (const ex of [15.5, 24.5]) {
    c.ell(ex, 21, 3.8, 2, 3);
    c.ell(ex, 21, 2.7, 1.1, 7);
    c.ell(ex, 21, 1, 1, 3);
  }
  c.line(12, 21.8, 9.5, 23.5, 1, 3);
  c.line(28, 21.8, 30.5, 23.5, 1, 3);
  c.line(11.5, 18, 19.5, 17.4, 1.3, 3);
  c.line(20.5, 17.4, 28.5, 18, 1.3, 3);
  c.poly([[20, 22], [22.4, 27.5], [17.6, 27.5]], 5);
  c.set(18, 27, 3).set(21, 27, 3);
  c.ell(20, 30.5, 3.3, 1.1, 6);
  c.poly([[18, 34], [22, 34], [21, 40], [19, 40]], 2);
  c.rect(18.4, 34, 21.6, 35.2, 1);
  return c;
}

function heart() {
  const c = new Img();
  c.shape((x, y) => {
    const nx = (x - 20) / 15, ny = (23 - y) / 15;
    return (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0;
  }, 1);
  c.recolor(1, 3, (x, y) => (x - 20) * 0.7 + (y - 20) > 11);
  c.ellR(12.5, 12.5, 4.2, 2.4, -0.7, 2);
  c.ell(17.5, 9.5, 1.2, 1.2, 2);
  return c;
}

function cat() {
  const c = new Img();
  c.poly([[6, 3], [17, 13], [6, 20]], 1);
  c.poly([[34, 3], [23, 13], [34, 20]], 1);
  c.poly([[9, 8], [14, 13], [9, 16]], 4);
  c.poly([[31, 8], [26, 13], [31, 16]], 4);
  c.ell(20, 23, 15.5, 13, 1);
  c.line(20, 10, 20, 16, 1.8, 6);
  c.line(15, 11.5, 16.5, 16, 1.5, 6);
  c.line(25, 11.5, 23.5, 16, 1.5, 6);
  c.line(6, 22, 9.5, 23.5, 1.4, 6);
  c.line(34, 22, 30.5, 23.5, 1.4, 6);
  c.ell(16, 29, 5.2, 4.2, 2);
  c.ell(24, 29, 5.2, 4.2, 2);
  for (const ex of [13.5, 26.5]) {
    c.ell(ex, 21, 3.2, 3.6, 5);
    c.ell(ex, 21, 1, 3, 3);
  }
  c.poly([[17.8, 26], [22.2, 26], [20, 28.6]], 4);
  c.line(20, 28.6, 20, 30.4, 0.9, 3);
  c.line(20, 30.4, 17.2, 32, 0.9, 3);
  c.line(20, 30.4, 22.8, 32, 0.9, 3);
  c.line(2, 27, 11, 28.5, 0.8, 3);
  c.line(2, 31, 11, 30.5, 0.8, 3);
  c.line(38, 27, 29, 28.5, 0.8, 3);
  c.line(38, 31, 29, 30.5, 0.8, 3);
  return c;
}

function fish() {
  const c = new Img();
  c.poly([[28, 20], [38, 9], [38, 31]], 2);
  c.poly([[13, 13], [22, 4], [26, 13]], 1);
  c.poly([[15, 27], [20, 33], [25, 27]], 1);
  c.ell(18, 20, 14.5, 9.5, 2);
  c.within([2], () => c.ell(17, 25.5, 11.5, 4.5, 3));
  c.recolor(2, 5, (x) => (x > 12 && x < 15) || (x > 19 && x < 22) || (x > 26 && x < 28));
  c.ell(10.5, 17.5, 2.7, 2.7, 3);
  c.ell(10, 17.5, 1.3, 1.3, 4);
  c.line(4.6, 22.5, 8.5, 23.2, 1, 4);
  c.ell(5, 9, 2.2, 2.2, 1);
  c.ell(2.5, 4.5, 1.3, 1.3, 1);
  c.ell(9, 4.5, 1.3, 1.3, 1);
  return c;
}

function rocket() {
  const c = new Img();
  c.poly([[13, 22], [6, 33], [13, 31]], 2);
  c.poly([[27, 22], [34, 33], [27, 31]], 2);
  c.rect(13, 12, 27, 31, 1);
  c.ell(20, 12, 7, 9.5, 1);
  c.recolor(1, 7, (x) => x >= 25);
  c.recolor(1, 2, (x, y) => y < 8.5);
  c.recolor(7, 2, (x, y) => y < 8.5);
  c.rect(13, 25, 27, 27, 2);
  c.ell(20, 17, 4.2, 4.2, 4);
  c.ell(20, 17, 3, 3, 3);
  c.ell(19, 16, 1, 1, 1);
  c.poly([[16, 31], [24, 31], [22, 34], [18, 34]], 7);
  c.poly([[17, 34], [23, 34], [20, 40]], 5);
  c.poly([[18.6, 34], [21.4, 34], [20, 38]], 6);
  for (const [x, y] of [[5, 5], [34, 6], [4, 18], [36, 20], [30, 2], [8, 38], [34, 38]]) c.set(x, y, 6);
  return c;
}

function flower() {
  const c = new Img();
  c.rect(19, 22, 21, 40, 5);
  c.poly([[19, 35], [9, 29], [12, 36]], 6);
  c.poly([[21, 31], [31, 25], [28, 32]], 6);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    c.ellR(20 + Math.cos(a) * 8.5, 15 + Math.sin(a) * 8.5, 5.4, 3.4, a, k % 2 ? 2 : 1);
  }
  c.ell(20, 15, 5.4, 5.4, 3);
  c.ell(20, 15, 3, 3, 4);
  return c;
}

function owl() {
  const c = new Img();
  c.rect(2, 36.5, 38, 39.6, 7);
  c.ell(33, 34, 3.4, 1.6, 6);
  c.poly([[9, 8], [15, 12], [9, 17]], 1);
  c.poly([[31, 8], [25, 12], [31, 17]], 1);
  c.ell(20, 22, 12.5, 15, 1);
  c.ell(20, 27, 8, 10, 2);
  c.within([2], () => c.recolor(2, 3, (x, y) => y > 19 && (Math.floor(x / 2) + Math.floor(y / 3)) % 2 === 0));
  c.ell(7.8, 25, 3.2, 9.5, 7);
  c.ell(32.2, 25, 3.2, 9.5, 7);
  c.ell(14.5, 16, 5.2, 5.2, 3);
  c.ell(25.5, 16, 5.2, 5.2, 3);
  c.ell(14.5, 16, 3.2, 3.2, 5);
  c.ell(25.5, 16, 3.2, 3.2, 5);
  c.ell(14.5, 16, 1.5, 1.5, 4);
  c.ell(25.5, 16, 1.5, 1.5, 4);
  c.poly([[18.3, 19], [21.7, 19], [20, 23.4]], 5);
  c.rect(15, 35, 18.4, 36.8, 5);
  c.rect(21.6, 35, 25, 36.8, 5);
  return c;
}

function cherries() {
  const c = new Img();
  c.line(12, 23, 19.5, 5.5, 1.5, 3);
  c.line(28, 25, 21, 5.5, 1.5, 3);
  c.ellR(27.5, 6.5, 8, 3.6, -0.25, 4);
  c.line(20.5, 6, 33, 5.4, 0.8, 3);
  c.ell(12, 30, 7.5, 7.5, 1);
  c.ell(28, 32, 7.5, 7.5, 1);
  c.recolor(1, 5, (x, y) => (x - 12) * 0.8 + (y - 30) > 6.2 && x < 20);
  c.recolor(1, 5, (x, y) => (x - 28) * 0.8 + (y - 32) > 6.2 && x > 20);
  c.ellR(9.5, 27, 2.3, 1.4, -0.7, 2);
  c.ellR(25.5, 29, 2.3, 1.4, -0.7, 2);
  return c;
}

function house() {
  const c = new Img();
  c.rect(25.5, 6, 31, 16, 7);
  c.rect(0, 34, 40, 40, 6);
  c.rect(7, 18, 33, 34, 1);
  c.poly([[2.5, 19.5], [20, 4.5], [37.5, 19.5]], 2);
  c.poly([[16.5, 34], [23.5, 34], [27, 40], [13, 40]], 1);
  c.rect(17, 25, 23, 34, 3);
  c.ell(20, 25, 3, 2.5, 3);
  c.set(21, 30, 5);
  for (const wx of [9.5, 24.5]) {
    c.rect(wx - 0.5, 21.5, wx + 6.5, 29, 5);
    c.rect(wx, 22, wx + 6, 28.5, 4);
    c.rect(wx + 2.5, 22, wx + 3.5, 28.5, 5);
    c.rect(wx, 24.8, wx + 6, 25.8, 5);
  }
  c.ell(20, 13.5, 3, 3, 5);
  c.ell(20, 13.5, 2.1, 2.1, 4);
  return c;
}

function penguin() {
  const c = new Img();
  c.ell(20, 38, 19, 3.2, 4);
  c.poly([[10, 20], [4.5, 33], [11.5, 30]], 1);
  c.poly([[30, 20], [35.5, 33], [28.5, 30]], 1);
  c.ell(20, 21, 11.5, 16.5, 1);
  c.ell(20, 25, 7.8, 12, 2);
  c.within([1, 2], () => c.ell(20, 19.2, 10.6, 2.2, 6));
  c.ell(14.5, 36.5, 4.2, 1.9, 3);
  c.ell(25.5, 36.5, 4.2, 1.9, 3);
  c.ell(16.3, 13, 2.4, 2.8, 2);
  c.ell(23.7, 13, 2.4, 2.8, 2);
  c.ell(16.6, 13.4, 1.1, 1.3, 1);
  c.ell(23.4, 13.4, 1.1, 1.3, 1);
  c.poly([[17.2, 16], [22.8, 16], [20, 20.5]], 3);
  return c;
}

function iceCream() {
  const c = new Img();
  c.poly([[10, 20], [30, 20], [20, 39.5]], 1);
  c.recolor(1, 2, (x, y) => (Math.floor(x + y) % 5 === 0) || (Math.floor(x - y + 80) % 5 === 0));
  c.ell(20, 19.5, 11, 5.5, 5);
  c.ell(11.5, 22, 2, 3, 5);
  c.ell(28.5, 22.5, 2, 2.6, 5);
  c.ell(20, 12.5, 9, 7, 3);
  c.ell(20, 6.5, 6, 5, 4);
  c.ell(20, 2.5, 2.4, 2.4, 6);
  for (const [x, y] of [[15, 12], [22, 10], [26, 14], [18, 16], [20, 5], [22, 7]]) c.set(x, y, 2);
  return c;
}

function saturn() {
  const c = new Img();
  const rot = -0.35, cs = Math.cos(rot), sn = Math.sin(rot);
  const ring = (x, y) => {
    const dx = x - 20, dy = y - 20;
    const u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
    return { e: Math.sqrt((u / 19) ** 2 + (v / 5.8) ** 2), v };
  };
  const paintRing = (frontOnly) => {
    c.shape((x, y) => { const r = ring(x, y); return r.e >= 0.7 && r.e <= 1 && (!frontOnly || r.v > 0); }, 4);
    c.shape((x, y) => { const r = ring(x, y); return r.e >= 0.82 && r.e <= 0.88 && (!frontOnly || r.v > 0); }, 5);
  };
  paintRing(false);
  c.ell(20, 20, 11, 11, 1);
  c.recolor(1, 2, (x, y) => y > 13.5 && y < 16.5);
  c.recolor(1, 3, (x, y) => y > 23.5 && y < 25.5);
  c.recolor(1, 3, (x, y) => Math.hypot(x - 16, y - 16) > 12.5);
  paintRing(true);
  for (const [x, y] of [[4, 5], [34, 4], [6, 34], [36, 33], [30, 36], [10, 10], [37, 14]]) c.set(x, y, 6);
  return c;
}

function butterfly() {
  const c = new Img();
  c.ellR(11, 13, 10.5, 8, -0.55, 1);
  c.ellR(13, 28, 7, 6.5, 0.3, 2);
  c.ellR(11.5, 13.5, 7, 5, -0.55, 3);
  c.ell(14, 28, 3.4, 3, 3);
  c.ell(6.5, 9.5, 1.8, 1.8, 5);
  c.ell(16, 28, 1.2, 1.2, 2);
  c.mirrorX();
  c.ell(20, 20, 1.9, 11.5, 4);
  c.ell(20, 8, 2.4, 2.4, 4);
  c.line(19.5, 6.5, 14, 1, 0.9, 4);
  c.line(20.5, 6.5, 26, 1, 0.9, 4);
  return c;
}

// ---------- procedural pictures ----------

function landscape(o) {
  const c = new Img();
  const R = rng(o.seed || 1);
  const hills = o.hills.length;
  const base = 1;
  const sunC = base + o.sky.length;
  const hillC = sunC + 1;
  const starC = hillC + hills;
  const pyrC = starC + (o.stars ? 1 : 0);
  const pal = [null, ...o.sky, o.sun, ...o.hills];
  if (o.stars) pal.push(o.stars);
  if (o.pyr) pal.push(o.pyr[0], o.pyr[1]);
  const bandH = (o.horizon || 30) / o.sky.length;
  c.shape((x, y) => y < (o.horizon || 30) + 4, 1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c.d[y * N + x] = base + Math.min(o.sky.length - 1, Math.floor(y / bandH));
  if (o.stars) for (let k = 0; k < 26; k++) c.set(Math.floor(R() * N), Math.floor(R() * 18), starC);
  c.ell(o.sunX, o.sunY, o.sunR, o.sunR, sunC);
  if (o.pyr) {
    for (const [cx, w, h, b] of o.pyramids) {
      c.poly([[cx - w, b], [cx, b - h], [cx, b]], pyrC);
      c.poly([[cx, b], [cx, b - h], [cx + w, b]], pyrC + 1);
    }
  }
  for (let k = 0; k < hills; k++) {
    const y0 = (o.horizon || 30) - 2 + k * 4.5, A = 2.2 + k * 0.5;
    const f1 = 0.14 + R() * 0.12, f2 = 0.31 + R() * 0.2, p1 = R() * 6.3, p2 = R() * 6.3;
    for (let x = 0; x < N; x++) {
      const h = y0 + A * Math.sin(x * f1 + p1) + 1.1 * Math.sin(x * f2 + p2);
      for (let y = Math.max(0, Math.floor(h)); y < N; y++) c.d[y * N + x] = hillC + k;
    }
  }
  return { img: c, pal };
}

function mandala(o) {
  const c = new Img();
  const R = rng(o.seed);
  const k = 6 + Math.floor(R() * 5), n = o.pal.length;
  const m = 1.5 + R() * 2, ph = R() * 6.3, f = 0.3 + R() * 0.25, bw = 2.6 + R() * 1.4;
  const s = (2 * Math.PI) / k;
  c.shape((x, y) => {
    const dx = x - 20, dy = y - 20, r = Math.hypot(dx, dy);
    return r <= 19.6;
  }, 1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - 20, dy = y + 0.5 - 20, r = Math.hypot(dx, dy);
    if (r > 19.6) continue;
    let a = ((Math.atan2(dy, dx) % s) + s) % s;
    a = Math.min(a, s - a);
    const v = r / bw + m * Math.sin(a * k * 0.8 + r * f + ph) * (r / 19);
    let idx = ((Math.floor(v) % n) + n) % n;
    if (r < 2.4) idx = n - 1;
    c.d[y * N + x] = 1 + idx;
  }
  return { img: c, pal: [null, ...o.pal] };
}

function stained(o) {
  const c = new Img();
  const R = rng(o.seed);
  const pts = [];
  const g = 4 + Math.floor(R() * 2);
  const cell = N / g;
  for (let j = 0; j < g; j++) for (let i = 0; i < g; i++)
    pts.push([ (i + 0.15 + R() * 0.7) * cell, (j + 0.15 + R() * 0.7) * cell, 1 + Math.floor(R() * (o.pal.length - 1)) ]);
  const edge = o.pal.length;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x + 0.5, py = y + 0.5, r = Math.hypot(px - 20, py - 20);
    if (r > 19.6) continue;
    let d1 = 1e9, d2 = 1e9, ci = 1;
    for (const [qx, qy, col] of pts) {
      const d = Math.hypot(px - qx, py - qy);
      if (d < d1) { d2 = d1; d1 = d; ci = col; } else if (d < d2) d2 = d;
    }
    c.d[y * N + x] = (d2 - d1 < 1.1 || r > 18.2) ? edge : ci;
  }
  return { img: c, pal: [null, ...o.pal.slice(0, -1), o.pal[o.pal.length - 1]] };
}

function alien(o) {
  const R = rng(o.seed);
  for (let tries = 0; tries < 40; tries++) {
    const c = new Img();
    const half = [];
    for (let j = 0; j < 8; j++) {
      half.push([]);
      for (let i = 0; i < 4; i++) {
        const r = R();
        half[j].push(r < 0.36 ? 0 : r < 0.78 ? 1 : 2);
      }
    }
    half[3][1] = 3; // eyes
    half[4][1] = 3;
    let cells = 0;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const v = half[j][i < 4 ? i : 7 - i];
      if (!v) continue;
      cells++;
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) c.set(4 + i * 4 + xx, 4 + j * 4 + yy, v);
    }
    if (cells >= 28) return { img: c, pal: [null, ...o.pal] };
  }
  const c = new Img();
  c.rect(8, 8, 32, 32, 1);
  return { img: c, pal: [null, ...o.pal] };
}

const SUN = [
  { name: 'Sunset Hills', sky: ['#3d2a6b', '#a63d7a', '#ee6c4d', '#ffb46b'], sun: '#fff1c1', sunX: 24, sunY: 25, sunR: 7, hills: ['#7a3b6e', '#4a2a5c', '#261a3d'], seed: 3 },
  { name: 'Desert Pyramids', sky: ['#4aa3d8', '#8fd0ee', '#cfe9f2', '#f6e3b4'], sun: '#fff7c9', sunX: 31, sunY: 9, sunR: 4.5, hills: ['#e0b15a', '#c98f3c'], horizon: 31, seed: 5,
    pyr: ['#d9a548', '#a66f25'], pyramids: [[12, 10, 14, 31], [27, 8, 10, 31]] },
  { name: 'Night Mountains', sky: ['#0b1030', '#16215a', '#26357f', '#3b4a9a'], sun: '#f4f1d8', sunX: 29, sunY: 9, sunR: 4, hills: ['#4b5d98', '#2b3868', '#161d3f'], stars: '#ffe9a8', seed: 8 },
  { name: 'Autumn Dusk', sky: ['#5b3a6b', '#c0576b', '#f2994a', '#f6c453'], sun: '#fff0b8', sunX: 12, sunY: 24, sunR: 6, hills: ['#a8472a', '#6e2f23', '#3a1b1b'], seed: 12 },
  { name: 'Pyramids at Dawn', sky: ['#5b4b9a', '#c0679f', '#f59e7a', '#ffd89b'], sun: '#fff4d1', sunX: 20, sunY: 26, sunR: 6.5, hills: ['#7d4a56', '#3c2845'], horizon: 31, seed: 14,
    pyr: ['#b9684d', '#7a3f48'], pyramids: [[11, 9, 12, 31], [28, 10, 13, 31]] },
  { name: 'Moonlit Hills', sky: ['#070b24', '#101a4f', '#1f2f78', '#33489a'], sun: '#ffffff', sunX: 14, sunY: 11, sunR: 5, hills: ['#41558f', '#27346a', '#131a3c'], stars: '#ffd98a', seed: 18 },
  { name: 'Starry Hills', sky: ['#1a0f3d', '#3a2178', '#6a3a9a', '#b568a8'], sun: '#ffe9a0', sunX: 30, sunY: 12, sunR: 3.5, hills: ['#5a3e86', '#352360', '#1c1238'], stars: '#fff2c0', seed: 21 },
];

const MANDALA = [
  ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#9b5de5'],
  ['#f94144', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'],
  ['#ff9ff3', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd'],
  ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'],
  ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff', '#06d6a0'],
];
const STAINED = [
  ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#1b1b2f'],
  ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#1b1b2f'],
  ['#d00000', '#faa307', '#9ef01a', '#0077b6', '#7209b7', '#10002b'],
  ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#14110f'],
];
const ALIEN = [
  ['#7ee081', '#2e8b57', '#f6f1d1', '#5aff8a'],
  ['#ff7eb6', '#b5179e', '#fff3b0', '#ff7eb6'],
  ['#6cc0ff', '#3a56d4', '#f6f1d1', '#6cc0ff'],
  ['#ffb347', '#d1495b', '#f6f1d1', '#ffb347'],
];
// alien palette: 1 body, 2 accent, 3 eyes (entry 4 unused spare)

const HAND = [
  ['Heart', heart, ['#e8344e', '#ff8da1', '#a3122a']],
  ['Goldfish', fish, ['#2e86de', '#ff9f43', '#f6f1e1', '#1f2a44', '#feca57']],
  ['Sunset Hills', () => landscape(SUN[0])],
  ['Rocket', rocket, ['#f2f2f7', '#e63946', '#3a86ff', '#232946', '#ff9f1c', '#ffd60a', '#9aa5b8']],
  ['The Pharaoh', pharaoh, ['#f2b632', '#2f63d9', '#1d1a2b', '#d9965a', '#a8643a', '#c8372d', '#f6efdc']],
  ['Flower', flower, ['#ff6fa5', '#ffb3d1', '#ffd23f', '#8a4b12', '#3bb273', '#1f7a4d']],
  ['Cat', cat, ['#f08a24', '#f7e6c4', '#2b2233', '#f4a3b5', '#7ed957', '#c4620f']],
  ['Mandala', () => mandala({ pal: MANDALA[0], seed: 101 })],
  ['Cherries', cherries, ['#d62839', '#ff7b8a', '#4f8a3a', '#3aa655', '#8a1020']],
  ['Desert Pyramids', () => landscape(SUN[1])],
  ['Penguin', penguin, ['#232946', '#f1f5f9', '#ff9f1c', '#8ecae6', '#bcd4e6', '#e63946']],
  ['Space Invader', () => alien({ pal: ALIEN[0], seed: 7 })],
  ['Little House', house, ['#f4d8a8', '#c0392b', '#6b4226', '#6ec6ff', '#3d2b1f', '#5cb85c', '#a0522d']],
  ['Night Mountains', () => landscape(SUN[2])],
  ['Owl', owl, ['#8d5a35', '#c08a5a', '#f7ecd2', '#2a1c12', '#ffb703', '#4c8c4a', '#6b3f22']],
  ['Rose Window', () => stained({ pal: STAINED[0], seed: 31 })],
  ['Butterfly', butterfly, ['#ff8c42', '#d1495b', '#ffd166', '#2d1e2f', '#fff3d6']],
  ['Mandala', () => mandala({ pal: MANDALA[1], seed: 202 })],
  ['Ice Cream', iceCream, ['#e0a96d', '#b9803f', '#ff8fb1', '#7fe0c3', '#7b4a2e', '#d62839']],
  ['Saturn', saturn, ['#f4a259', '#f9d29d', '#c27a3e', '#f3e9d2', '#8a6f4d', '#ffe066']],
  ['Autumn Dusk', () => landscape(SUN[3])],
  ['Space Invader', () => alien({ pal: ALIEN[1], seed: 19 })],
  ['Rose Window', () => stained({ pal: STAINED[1], seed: 44 })],
  ['Mandala', () => mandala({ pal: MANDALA[2], seed: 303 })],
  ['Pyramids at Dawn', () => landscape(SUN[4])],
  ['Space Invader', () => alien({ pal: ALIEN[2], seed: 23 })],
  ['Moonlit Hills', () => landscape(SUN[5])],
  ['Rose Window', () => stained({ pal: STAINED[2], seed: 57 })],
  ['Mandala', () => mandala({ pal: MANDALA[3], seed: 404 })],
  ['Starry Hills', () => landscape(SUN[6])],
  ['Space Invader', () => alien({ pal: ALIEN[3], seed: 29 })],
];

const cache = new Map();

// -> { name, pal: [null, '#hex', ...], px: Uint8Array(N*N) }
export function levelImage(i) {
  if (cache.has(i)) return cache.get(i);
  let out;
  if (i < HAND.length) {
    const [name, fn, pal] = HAND[i];
    const r = fn();
    out = r.img ? { name, pal: r.pal, px: r.img.d } : { name, pal: [null, ...pal], px: r.d };
  } else {
    const R = rng(9000 + i);
    const kind = i % 4;
    let r, name;
    if (kind === 0) {
      const base = SUN[Math.floor(R() * SUN.length)];
      r = landscape({ ...base, seed: i * 7 + 1, sunX: 6 + Math.floor(R() * 28), sunY: 8 + Math.floor(R() * 14) });
      name = base.name;
    } else if (kind === 1) {
      r = mandala({ pal: MANDALA[Math.floor(R() * MANDALA.length)], seed: i * 13 + 5 });
      name = 'Mandala';
    } else if (kind === 2) {
      r = stained({ pal: STAINED[Math.floor(R() * STAINED.length)], seed: i * 11 + 3 });
      name = 'Rose Window';
    } else {
      r = alien({ pal: ALIEN[Math.floor(R() * ALIEN.length)], seed: i * 17 + 2 });
      name = 'Space Invader';
    }
    out = { name, pal: r.pal, px: r.img.d };
  }
  cache.set(i, out);
  return out;
}

// ---------- blocks ----------
import { solve } from './sim.js';

export const COLS = 8;
// sand grid is G x G (a multiple of COLS): coarse for early levels and the busy mandalas
const grainFor = (i, name) => (i < 12 || name === 'Mandala' ? 16 : 24);

const BG_CANDIDATES = ['#7d8fd0', '#9fb0e0', '#566399', '#c9d3f0', '#6b7fb8'];
const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));

function pickBg(pal) {
  const rgb = pal.filter(Boolean).map(hexRgb);
  let best = BG_CANDIDATES[0], bd = -1;
  for (const c of BG_CANDIDATES) {
    const a = hexRgb(c);
    const d = Math.min(...rgb.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])));
    if (d > bd) { bd = d; best = c; }
  }
  return best;
}

function orientations(cells) {
  const seen = new Map();
  let cur = cells;
  for (let f = 0; f < 2; f++) {
    for (let k = 0; k < 4; k++) {
      cur = cur.map(([r, c]) => [c, -r]);
      const mr = Math.min(...cur.map((x) => x[0])), mc = Math.min(...cur.map((x) => x[1]));
      const n = cur.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      seen.set(JSON.stringify(n), n);
    }
    cur = cur.map(([r, c]) => [r, -c]);
  }
  return [...seen.values()];
}

const SHAPES = {
  1: orientations([[0, 0]]),
  2: orientations([[0, 0], [0, 1]]),
  3: [...orientations([[0, 0], [0, 1], [0, 2]]), ...orientations([[0, 0], [1, 0], [1, 1]])],
  4: [...orientations([[0, 0], [0, 1], [1, 0], [1, 1]]), ...orientations([[0, 0], [1, 0], [2, 0], [2, 1]]),
    ...orientations([[0, 0], [0, 1], [0, 2], [1, 1]]), ...orientations([[0, 1], [0, 2], [1, 0], [1, 1]])],
};

function split(n, maxSize, R) {
  const out = [];
  while (n > 0) {
    const s = Math.min(n, 1 + Math.floor(R() * maxSize));
    out.push(s); n -= s;
  }
  return out;
}

function attemptLevel(i, img, attempt) {
  const R = rng(5000 + i * 31 + attempt * 7919);
  const { pal, px, counts } = img;
  const colors = [];
  for (let k = 1; k < pal.length; k++) if (counts[k] > 0) colors.push(k);
  const total = px.length;
  const target = Math.min(26, 12 + Math.floor(i * 0.3));
  const maxSize = i < 4 ? 2 : i < 10 ? 3 : 4;
  const blocks = [];
  for (const k of colors) {
    const cells = Math.max(1, Math.round((target * counts[k]) / total));
    const sizes = split(cells, maxSize, R);
    const caps = sizes.map((s) => Math.max(1, Math.floor((counts[k] * s) / cells)));
    let diff = counts[k] - caps.reduce((a, b) => a + b, 0);
    for (let j = 0; diff > 0; j = (j + 1) % caps.length) { caps[j]++; diff--; }
    sizes.forEach((s, j) => {
      const shapes = SHAPES[s];
      blocks.push({ color: k, cap: caps[j], cells: shapes[Math.floor(R() * shapes.length)] });
    });
  }
  for (let a = blocks.length - 1; a > 0; a--) { const b = Math.floor(R() * (a + 1)); [blocks[a], blocks[b]] = [blocks[b], blocks[a]]; }
  blocks.forEach((b, id) => { b.id = id; });
  const area = blocks.reduce((s, b) => s + b.cells.length, 0);
  const rows = Math.max(5, Math.ceil(area / (COLS * 0.5)) + 1 + Math.floor(attempt / 10));
  const grid = new Array(rows * COLS).fill(false);
  const order = [...blocks].sort((a, b) => b.cells.length - a.cells.length);
  for (const b of order) {
    let placed = false;
    for (let t = 0; t < 300 && !placed; t++) {
      const r = 1 + Math.floor(R() * (rows - 1)), c = Math.floor(R() * COLS);
      if (b.cells.every(([dr, dc]) => r + dr < rows && c + dc < COLS && !grid[(r + dr) * COLS + c + dc])) {
        for (const [dr, dc] of b.cells) grid[(r + dr) * COLS + c + dc] = true;
        b.r = r; b.c = c; placed = true;
      }
    }
    if (!placed) return null;
  }
  const lv = { name: img.name, pal, px, counts, W: Math.sqrt(px.length), H: Math.sqrt(px.length), cols: COLS, rows, blocks };
  return solve(lv, 1) >= 0 && solve(lv, 2) >= 0 ? lv : null;
}

const levels = new Map();

// -> { name, pal, px (every pixel is a grain; empty picture pixels become the background colour),
//      W, H, cols, rows, blocks: [{id, color, cap, cells: [[dr, dc]], r, c}] }
export function buildLevel(i) {
  if (levels.has(i)) return levels.get(i);
  const base = levelImage(i);
  const pal = [...base.pal, pickBg(base.pal)];
  const bg = pal.length - 1;
  const G = grainFor(i, base.name);
  const px = new Uint8Array(G * G);
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const tally = new Map();
    const x0 = Math.floor((x * N) / G), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * N) / G));
    const y0 = Math.floor((y * N) / G), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * N) / G));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const v = base.px[yy * N + xx] || bg; tally.set(v, (tally.get(v) || 0) + 1); }
    let best = bg, bc = -1;
    for (const [v, c] of tally) if (c > bc) { bc = c; best = v; }
    px[y * G + x] = best;
  }
  const counts = new Array(pal.length).fill(0);
  for (const v of px) counts[v]++;
  const img = { name: base.name, pal, px, counts };
  let lv = null;
  for (let a = 0; a < 80 && !lv; a++) lv = attemptLevel(i, img, a);
  if (!lv) throw new Error(`no solvable layout for level ${i}`);
  lv.moves = solve(lv, 1);
  levels.set(i, lv);
  return lv;
}
