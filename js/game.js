import { levelImage, buildLevel, HAND_COUNT, COLS } from './levels.js';
import { Sim } from './sim.js';

const $ = (s) => document.querySelector(s);
const KEY = 'sandrestore.v2';
const GAP = 2;
const AIR = [63, 72, 133];
const STEP = 1 / 30;

let save = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || { done: [] }; } catch { return { done: [] }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ } };

const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const shade = (h, f) => '#' + hexRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');

const imgCv = $('#img'), imgCtx = imgCv.getContext('2d');
const fx = $('#fx'), fxCtx = fx.getContext('2d');
const tray = $('#tray');
const off = document.createElement('canvas');
const offCtx = off.getContext('2d');

let cur = null;
let last = 0, raf = 0, acc = 0, cell = 40, drag = null;

// ---------- menu ----------
function nextUnplayed() { let i = 0; while (save.done.includes(i)) i++; return i; }

function thumb(i) {
  const { pal, px } = levelImage(i);
  const n = Math.sqrt(px.length);
  const c = document.createElement('canvas'); c.width = c.height = n;
  const d = c.getContext('2d').createImageData(n, n);
  for (let k = 0; k < n * n; k++) {
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
  const sim = new Sim(lv, i + 1);
  cur = { i, lv, sim, rgb: lv.pal.map((h) => (h ? hexRgb(h) : AIR)), parts: [], won: false, shown: new Map(), data: null };
  off.width = off.height = lv.W;
  cur.data = offCtx.createImageData(lv.W, lv.H);
  $('#menu').hidden = true; $('#play').hidden = false; $('#done').hidden = true;
  imgCv.classList.remove('won');
  $('#title').innerHTML = `Level ${i + 1}<small>${lv.name}</small>`;
  $('#hint').hidden = save.done.length >= 2;
  buildTray();
  layout();
  acc = 0; last = performance.now();
  raf = requestAnimationFrame(frame);
}

function buildTray() {
  tray.textContent = '';
  const { lv, sim } = cur;
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < COLS; c++) {
    const g = document.createElement('div');
    g.className = 'gc' + (r === 0 ? ' dock' : '');
    g.style.cssText = `left:calc(var(--cell)*${c});top:calc(var(--cell)*${r})`;
    tray.append(g);
  }
  for (const b of sim.blocks) {
    const hex = lv.pal[b.color];
    const el = document.createElement('div');
    el.className = 'blk';
    b.sands = [];
    const has = (dr, dc) => b.cells.some(([r, c]) => r === dr && c === dc);
    b.cells.forEach(([dr, dc], k) => {
      const t = !has(dr - 1, dc), rt = !has(dr, dc + 1), bt = !has(dr + 1, dc), l = !has(dr, dc - 1);
      const cl = document.createElement('div');
      cl.className = 'cl';
      cl.style.cssText = `left:calc(var(--cell)*${dc});top:calc(var(--cell)*${dr})`;
      const inner = document.createElement('div');
      inner.className = 'b';
      inner.style.cssText = `top:${t ? GAP : 0}px;right:${rt ? GAP : 0}px;bottom:${bt ? GAP : 0}px;left:${l ? GAP : 0}px;` +
        `border:3px solid ${shade(hex, 1.2)};border-width:${t ? 3 : 0}px ${rt ? 3 : 0}px ${bt ? 3 : 0}px ${l ? 3 : 0}px;` +
        `border-radius:${t && l ? 9 : 0}px ${t && rt ? 9 : 0}px ${bt && rt ? 9 : 0}px ${bt && l ? 9 : 0}px`;
      const sand = document.createElement('div');
      sand.className = 's';
      sand.style.backgroundColor = hex;
      inner.append(sand);
      if (k === 0) { const p = document.createElement('span'); p.className = 'p'; inner.append(p); b.label = p; }
      cl.append(inner);
      el.append(cl);
      b.sands.push([sand, dr]);
    });
    b.hrows = Math.max(...b.cells.map((x) => x[0])) + 1;
    b.el = el;
    el.addEventListener('pointerdown', (e) => dragStart(b, e));
    el.addEventListener('pointermove', dragMove);
    el.addEventListener('pointerup', dragEnd);
    el.addEventListener('pointercancel', dragEnd);
    tray.append(el);
    place(b);
    showSand(b);
  }
}

function place(b) {
  b.el.style.transform = `translate(calc(var(--cell)*${b.c}),calc(var(--cell)*${b.r}))`;
}

function showSand(b) {
  const f = b.taken / b.cap;
  for (const [el, dr] of b.sands) el.style.height = 100 * Math.max(0, Math.min(1, f * b.hrows - (b.hrows - 1 - dr))) + '%';
  b.label.textContent = Math.floor(f * 100) + '%';
  b.shown = b.taken;
}

// ---------- moving blocks ----------
function dragStart(b, e) {
  if (!cur || cur.won || b.done) return;
  e.preventDefault();
  b.el.setPointerCapture(e.pointerId);
  const tr = tray.getBoundingClientRect();
  drag = {
    b, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false,
    gx: (e.clientX - tr.left) / cell - b.c, gy: (e.clientY - tr.top) / cell - b.r,
    dist: cur.sim.reach(b),
  };
  $('#hint').hidden = true;
}

function dragMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { b } = drag;
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
  if (!drag.moved) { drag.moved = true; b.el.classList.add('drag'); }
  const tr = tray.getBoundingClientRect();
  const fc = (e.clientX - tr.left) / cell - drag.gx, fr = (e.clientY - tr.top) / cell - drag.gy;
  const { rows } = cur.lv;
  let best = -1, bd = Infinity;
  for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
    if (drag.dist[r * COLS + c] < 0) continue;
    const d = (r - fr) ** 2 + (c - fc) ** 2;
    if (d < bd) { bd = d; best = r * COLS + c; }
  }
  if (best >= 0 && (b.r !== Math.floor(best / COLS) || b.c !== best % COLS)) {
    b.r = Math.floor(best / COLS); b.c = best % COLS;
    place(b);
  }
}

function dragEnd(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const { b, moved } = drag;
  drag = null;
  b.el.classList.remove('drag');
  if (!moved) tap(b);
}

// tap: send the block to the dock (nearest column), or back down if it is already there
function tap(b) {
  const { sim } = cur, dist = sim.reach(b);
  let best = null;
  const docked = b.r === 0;
  for (let r = 0; r < sim.rows; r++) for (let c = 0; c < COLS; c++) {
    const d = dist[r * COLS + c];
    if (d < 0 || (docked ? r === 0 : r !== 0)) continue;
    const k = docked ? -r * 100 + Math.abs(c - b.c) : Math.abs(c - b.c) * 100 + d;
    if (!best || k < best.k) best = { r, c, k };
  }
  if (!best) { b.el.classList.remove('shake'); void b.el.offsetWidth; b.el.classList.add('shake'); return; }
  b.r = best.r; b.c = best.c;
  place(b);
}

// ---------- layout ----------
function layout() {
  if (!cur) return;
  const { lv } = cur;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W = Math.min(window.innerWidth, 560) - 24;
  const top = $('#stage').getBoundingClientRect().top;
  const sab = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0;
  const avail = window.innerHeight - top - 22 - sab;
  cell = Math.max(26, Math.floor(Math.min(W / COLS, avail / (COLS + lv.rows))));
  const side = cell * COLS;
  const k = Math.max(1, Math.round((side * dpr) / lv.W));
  imgCv.width = imgCv.height = lv.W * k;
  imgCv.style.width = imgCv.style.height = side + 'px';
  tray.style.setProperty('--cell', cell + 'px');
  tray.style.width = side + 'px';
  tray.style.height = lv.rows * cell + 'px';
  for (const b of cur.sim.blocks) b.label.style.fontSize = Math.max(10, Math.min(14, cell * 0.25)) + 'px';
  fx.width = window.innerWidth * dpr; fx.height = window.innerHeight * dpr;
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cur.sim.dirty = true;
}

// ---------- loop ----------
function drawPicture() {
  const { sim, rgb, data, lv } = cur;
  for (let p = 0; p < sim.g.length; p++) {
    const v = sim.g[p];
    const c = rgb[v];
    const f = v ? 0.9 + (0.2 * sim.sh[p]) / 255 : 1;
    data.data[p * 4] = Math.min(255, c[0] * f);
    data.data[p * 4 + 1] = Math.min(255, c[1] * f);
    data.data[p * 4 + 2] = Math.min(255, c[2] * f);
    data.data[p * 4 + 3] = 255;
  }
  offCtx.putImageData(data, 0, 0);
  imgCtx.imageSmoothingEnabled = false;
  imgCtx.drawImage(off, 0, 0, imgCv.width, imgCv.height);
  $('#bar i').style.width = (100 * (sim.total - sim.left)) / sim.total + '%';
  sim.dirty = false;
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
  const { sim } = cur;
  acc = Math.min(acc + (now - last) / 1000, 0.2);
  last = now;
  while (acc >= STEP) { acc -= STEP; if (!cur.won) sim.step(); }

  const ir = imgCv.getBoundingClientRect(), tr = tray.getBoundingClientRect();
  const gpx = ir.width / sim.W;
  for (const ev of sim.events.splice(0)) {
    if (cur.parts.length > 500) continue;
    cur.parts.push({
      x0: ir.left + (ev.x + 0.5) * gpx, y0: ir.bottom - gpx * 0.5,
      x1: tr.left + (ev.cell + 0.5) * cell, y1: tr.top + cell * 0.55, t: 0, color: cur.lv.pal[ev.color],
    });
  }
  for (const b of sim.blocks) {
    if (b.shown !== b.taken) showSand(b);
    if (b.done && !b.gone) {
      b.gone = true;
      if (drag && drag.b === b) drag = null;
      setTimeout(() => { b.el.classList.add('gone'); setTimeout(() => b.el.remove(), 350); }, 250);
    }
  }
  fxCtx.clearRect(0, 0, fx.width, fx.height);
  for (let k = cur.parts.length - 1; k >= 0; k--) {
    const p = cur.parts[k];
    p.t += (now - (p.last || now)) / 1000 / 0.2; p.last = now;
    if (p.t >= 1) { cur.parts.splice(k, 1); continue; }
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(p.x0 + (p.x1 - p.x0) * p.t - 2, p.y0 + (p.y1 - p.y0) * p.t * p.t - 2, 4, 4);
  }
  if (sim.dirty) drawPicture();
  if (!cur.won && sim.left === 0) win();
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
