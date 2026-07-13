import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const zlib = require('zlib');

function createMinimalPNG(width, height) {
  function crc32(buf) { let c = 0xFFFFFFFF >>> 0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0); } return (c ^ 0xFFFFFFFF) >>> 0; }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const o = y * (width * 4 + 1) + 1 + x * 4;
      raw[o] = 64; raw[o + 1] = 64; raw[o + 2] = 180; raw[o + 3] = 255;
    }
  }
  const idat = chunk('IDAT', zlib.deflateSync(raw));
  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))]);
}

const exts = ['extension-job-capture', 'extension-qa', 'extension-copilot'];
const sizes = [[16, 16], [48, 48], [128, 128]];
const base = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

for (const ext of exts) {
  const dir = join(base, 'packages', ext, 'icons');
  mkdirSync(dir, { recursive: true });
  for (const [w, h] of sizes) {
    const buf = createMinimalPNG(w, h);
    writeFileSync(join(dir, `icon-${w}.png`), buf);
    console.log(`  ${ext}/icons/icon-${w}.png (${buf.length}B)`);
  }
}
console.log('Icons generated.');
