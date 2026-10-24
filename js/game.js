import { N, buildLevel, levelImage, HAND_COUNT } from './levels.js';

const $ = (s) => document.querySelector(s);
const KEY = 'sandrestore.v1';
const GAP = 4;
const UNFILLED = [223, 227, 243];

let save = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { done: [] }; } catch { return { done: [] }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ } };

const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const shade = (h, f) => '#' + hexRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

const imgCv = $('#img'), imgCtx = imgCv.getContext('2d');
const fx = $('#fx'), fxCtx = fx.getContext('2d');
const tray = $('#tray');
const off = document.createElement('canvas'); off.width = off.height = N;
const offCtx = off.getContext('2d');

let cur = null;
let last = 0, raf = 0;

// ---------- menu ----------
function nextUnplayed() { let i = 0; while (save.done.includes(i)) i++; return i; }

function thumb(i) {
  const { pal, px } = levelImage(i);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const d = c.getContext('2d').createImageData(N, N);
  for (let k = 0; k < N * N; k++) {
    if (!px[k]) continue;
    const [r, g, b] = hexRgb(pal[px[k]]);
    d.data.set([r, g, b, 255], k * 4);
  }
  c.getContext('2d').putImageData(d, 0, 0);
  return c;
}

function showMenu() {
  cancelAnimationFrame(raf); raf = 0; cur = null;
  $('#play').hidden = true; $('#menu').hidden = false; $('#done').hidden = true;
  const n = nextUnplayed();
  $('#cont').textContent = n === 0 ? 'Start' : `Continue · level ${n + 1}`;
  const grid = $('#grid'); grid.textContent = '';
  for (let i = 0; i < HAND_COUNT; i++) {
    const b = document.createElement('button');
    if (save.done.includes(i)) { b.className = 'done'; b.append(thumb(i)); } else b.textContent = i + 1;
    b.onclick = () => start(i);
    grid.append(b);
  }
}

// ---------- play ----------
function start(i) {
  cancelAnimationFrame(raf);
  const lv = buildLevel(i);
  cur = {
    i, lv, filled: new Uint8Array(N * N), left: 0, queues: [], boxes: [], pours: [], parts: [],
    won: false, data: offCtx.createImageData(N, N), dirty: true,
  };
  const R = (() => { let s = i * 7919 + 13; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
  lv.pal.forEach((_, k) => {
    if (!k) return;
    const idx = [];
    lv.px.forEach((v, p) => { if (v === k) idx.push(p); });
    idx.sort((a, b) => (Math.floor(a / N) + R() * 5) - (Math.floor(b / N) + R() * 5));
    cur.queues[k] = idx;
  });
  for (let p = 0; p < N * N; p++) {
    if (lv.px[p]) { cur.left++; paint(p, false); }
  }
  cur.total = cur.left;
  $('#menu').hidden = true; $('#play').hidden = false; $('#done').hidden = true;
  imgCv.classList.remove('won');
  $('#title').innerHTML = `Level ${i + 1}<small>${lv.name}</small>`;
  buildTray();
  layout();
  updateBar();
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function paint(p, filled) {
  const { pal, px } = cur.lv;
  let rgb;
  if (filled) {
    const base = hexRgb(pal[px[p]]);
    const f = 0.9 + 0.2 * hash(p % N, Math.floor(p / N));
    rgb = base.map((v) => Math.min(255, v * f));
  } else rgb = UNFILLED;
  cur.data.data.set([rgb[0], rgb[1], rgb[2], 255], p * 4);
  cur.dirty = true;
}

function buildTray() {
  tray.textContent = '';
  const { lv } = cur;
  cur.boxes = lv.boxes.map((b) => {
    const hex = lv.pal[b.color];
    const el = document.createElement('div');
    el.className = 'box';
    el.style.borderColor = shade(hex, 1.15);
    el.innerHTML = '<div class="sand"></div><span class="pct"></span>';
    const box = { ...b, el, sand: el.firstChild, label: el.lastChild, hex, alive: true, pouring: false, left: b.amount };
    box.sand.style.backgroundColor = hex;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(box); });
    tray.append(el);
    setSand(box);
    return box;
  });
  refreshFree();
}

function setSand(box) {
  const pct = (box.pct * box.left) / box.amount;
  box.sand.style.height = pct + '%';
  box.label.textContent = Math.round(pct) + '%';
}

function isFree(box) {
  if (!box.alive || box.pouring) return false;
  for (const o of cur.boxes) {
    if (!o.alive || o === box) continue;
    if (o.r + o.h <= box.r && o.c < box.c + box.w && o.c + o.w > box.c) return false;
  }
  return true;
}

function refreshFree() {
  for (const b of cur.boxes) {
    if (!b.alive) continue;
    // a box is "blocked" while anything alive sits above it; pouring boxes count as free-looking
    let blocked = false;
    for (const o of cur.boxes) {
      if (!o.alive || o === b) continue;
      if (o.r + o.h <= b.r && o.c < b.c + b.w && o.c + o.w > b.c) { blocked = true; break; }
    }
    b.el.classList.toggle('blocked', blocked && !b.pouring);
  }
}

function tap(box) {
  if (!cur || cur.won) return;
  if (!isFree(box)) {
    if (box.alive && !box.pouring) { box.el.classList.remove('shake'); void box.el.offsetWidth; box.el.classList.add('shake'); }
    return;
  }
  box.pouring = true;
  box.el.classList.add('pouring');
  const dur = 0.45 + box.amount / 260;
  cur.pours.push({ box, rate: box.amount / dur, carry: 0 });
  refreshFree();
}

function layout() {
  if (!cur) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W = Math.min(window.innerWidth, 560) - 24, H = window.innerHeight;
  const side = Math.floor(Math.min(W, H * 0.4));
  const px = N * Math.max(1, Math.round((side * dpr) / N));
  imgCv.width = imgCv.height = px;
  imgCv.style.width = imgCv.style.height = side + 'px';
  cur.dirty = true;
  fx.width = window.innerWidth * dpr; fx.height = window.innerHeight * dpr;
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const top = tray.getBoundingClientRect().top;
  const avail = Math.max(120, H - top - 12 - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0));
  const { cols, rows } = cur.lv;
  const cell = Math.max(34, Math.floor(Math.min(W / cols, avail / rows)));
  tray.style.width = cell * cols + 'px';
  tray.style.height = Math.min(avail, cell * rows) + 'px';
  for (const b of cur.boxes) {
    const s = b.el.style;
    s.left = b.c * cell + GAP / 2 + 'px';
    s.top = b.r * cell + GAP / 2 + 'px';
    s.width = b.w * cell - GAP + 'px';
    s.height = b.h * cell - GAP + 'px';
    b.label.style.fontSize = Math.max(10, Math.min(15, cell * 0.22)) + 'px';
  }
}

function updateBar() {
  $('#bar i').style.width = (100 * (cur.total - cur.left)) / cur.total + '%';
}

function arrive(p) {
  cur.filled[p.idx] = 1;
  paint(p.idx, true);
  cur.left--;
  if (cur.left === 0) win();
}

function win() {
  cur.won = true;
  if (!save.done.includes(cur.i)) { save.done.push(cur.i); persist(); }
  imgCv.classList.add('won');
  const i = cur.i;
  setTimeout(() => {
    if (!cur || cur.i !== i) return;
    $('#donename').textContent = `${cur.lv.name} · level ${i + 1}`;
    $('#done').hidden = false;
  }, 900);
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!cur) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const ir = imgCv.getBoundingClientRect();
  const cell = ir.width / N;

  // emit grains from pouring boxes
  for (let k = cur.pours.length - 1; k >= 0; k--) {
    const po = cur.pours[k], b = po.box;
    po.carry += po.rate * dt;
    let n = Math.floor(po.carry);
    po.carry -= n;
    n = Math.min(n, b.left);
    const br = b.el.getBoundingClientRect();
    const q = cur.queues[b.color];
    for (let g = 0; g < n; g++) {
      const idx = q.pop();
      if (idx === undefined) break;
      const tx = ir.left + ((idx % N) + 0.5) * cell, ty = ir.top + (Math.floor(idx / N) + 0.5) * cell;
      cur.parts.push({
        x0: br.left + br.width * (0.2 + 0.6 * Math.random()), y0: br.top + 4,
        x1: tx, y1: ty, t: 0, life: 0.45 + Math.random() * 0.25, idx, color: b.hex,
      });
    }
    b.left -= n;
    setSand(b);
    if (b.left <= 0) {
      b.alive = false; b.pouring = false;
      b.el.classList.remove('pouring'); b.el.classList.add('gone');
      cur.pours.splice(k, 1);
      refreshFree();
    }
  }

  // move grains
  fxCtx.clearRect(0, 0, fx.width, fx.height);
  for (let k = cur.parts.length - 1; k >= 0; k--) {
    const p = cur.parts[k];
    p.t += dt / p.life;
    if (p.t >= 1) { arrive(p); cur.parts.splice(k, 1); continue; }
    const e = 1 - (1 - p.t) * (1 - p.t);
    const x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e;
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  if (cur.dirty) {
    offCtx.putImageData(cur.data, 0, 0);
    imgCtx.imageSmoothingEnabled = false;
    imgCtx.clearRect(0, 0, imgCv.width, imgCv.height);
    imgCtx.drawImage(off, 0, 0, imgCv.width, imgCv.height);
    cur.dirty = false;
    updateBar();
  }
}

// ---------- wiring ----------
$('#cont').onclick = () => start(nextUnplayed());
$('#back').onclick = showMenu;
$('#tomenu').onclick = showMenu;
$('#retry').onclick = () => cur && start(cur.i);
$('#next').onclick = () => cur && start(cur.i + 1);
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
document.addEventListener('visibilitychange', () => { last = performance.now(); });
showMenu();
