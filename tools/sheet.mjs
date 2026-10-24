// node tools/sheet.mjs OUT.ppm [FIRST COUNT] -> contact sheet of level pictures (convert with ffmpeg)
import { writeFileSync } from 'node:fs';
import { levelImage, N } from '../js/levels.js';
const [out, first = '0', count = '30'] = process.argv.slice(2);
const S = 5, cols = 6, f = +first, n = +count, rows = Math.ceil(n / cols), pad = 4;
const W = cols * (N * S + pad) + pad, H = rows * (N * S + pad) + pad;
const buf = Buffer.alloc(W * H * 3, 70);
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
for (let i = 0; i < n; i++) {
  const { pal, px } = levelImage(f + i);
  const ox = pad + (i % cols) * (N * S + pad), oy = pad + Math.floor(i / cols) * (N * S + pad);
  for (let y = 0; y < N * S; y++) for (let x = 0; x < N * S; x++) {
    const v = px[Math.floor(y / S) * N + Math.floor(x / S)];
    const rgb = v ? hex(pal[v]) : [75, 86, 148];
    const o = ((oy + y) * W + ox + x) * 3;
    buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2];
  }
}
writeFileSync(out, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
