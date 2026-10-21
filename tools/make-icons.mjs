// Renders the app icons (flag stripes on cream) to PNG without dependencies.
// Run: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const CREAM = hex('#fff8ec'), BLUE = hex('#2f56b0'), YELLOW = hex('#ffd23f'), RED = hex('#e8505b'), WHITE = hex('#ffffff');

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// Colour at unit coordinates (0..1). `pad` shrinks the artwork for the maskable safe zone.
function shade(x, y, { maskable }) {
  const bgRound = maskable ? 0 : 0.22;
  if (!inRoundRect(x, y, 0, 0, 1, 1, bgRound)) return null;
  const s = maskable ? 0.27 : 0.2;   // flag inset
  const x0 = s, x1 = 1 - s, y0 = s + 0.04, y1 = 1 - s - 0.04;
  if (inRoundRect(x, y, x0, y0, x1, y1, 0.09)) {
    // little smile on the yellow stripe
    const sx = (x - 0.5) / (x1 - x0), sy = (y - 0.5) / (y1 - y0);
    const ring = Math.hypot(sx, sy + 0.08);
    if (Math.abs(sx) < 0.13 && sy > 0 && ring > 0.17 && ring < 0.23) return WHITE;
    if (Math.hypot(sx + 0.07, sy + 0.12) < 0.045 || Math.hypot(sx - 0.07, sy + 0.12) < 0.045) return WHITE;
    const t = (x - x0) / (x1 - x0);
    return t < 1 / 3 ? BLUE : t < 2 / 3 ? YELLOW : RED;
  }
  return CREAM;
}

function render(size, opts) {
  const SS = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, opts);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0;
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return png(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const dir = new URL('../icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('icon-192.png', dir), render(192, { maskable: false }));
writeFileSync(new URL('icon-512.png', dir), render(512, { maskable: false }));
writeFileSync(new URL('icon-maskable-512.png', dir), render(512, { maskable: true }));
console.log('Icons written to icons/');
