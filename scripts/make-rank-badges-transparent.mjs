/**
 * Make near-black backgrounds transparent on rank badge PNGs (in place).
 * Flood-fills from edges where R,G,B are near-black.
 * node scripts/make-rank-badges-transparent.mjs
 */
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BADGES_DIR = join(__dirname, '..', 'assets/ranks/badges');
const BLACK_THRESH = 36;

function floodRemoveNearBlack(rgba, width, height) {
  const isBg = (offset) => {
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3];
    if (a < 8) return true;
    if (r < BLACK_THRESH && g < BLACK_THRESH && b < BLACK_THRESH) return true;
    // Near-black gray (no hue)
    if (
      r <= 42 &&
      g <= 42 &&
      b <= 42 &&
      Math.abs(r - g) < 10 &&
      Math.abs(g - b) < 10
    ) {
      return true;
    }
    return false;
  };

  const visited = new Uint8Array(width * height);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    if (!isBg(idx * 4)) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  let cleared = 0;
  while (queue.length > 0) {
    const idx = queue.shift();
    const o = idx * 4;
    if (rgba[o + 3] !== 0) {
      rgba[o + 3] = 0;
      cleared++;
    }
    const x = idx % width;
    const y = Math.floor(idx / width);
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
  return cleared;
}

async function processFile(name) {
  const path = join(BADGES_DIR, name);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const copy = Buffer.from(data);
  const cleared = floodRemoveNearBlack(copy, info.width, info.height);

  const buf = await sharp(copy, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  writeFileSync(path, buf);

  const meta = await sharp(path).metadata();
  const sample = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cornerA = sample.data[3];
  console.log(
    `✓ ${name}  ${meta.width}×${meta.height}  cleared=${cleared}  cornerAlpha=${cornerA}`,
  );
}

async function main() {
  const files = readdirSync(BADGES_DIR)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();
  if (files.length === 0) {
    console.error('No PNGs in', BADGES_DIR);
    process.exit(1);
  }
  for (const f of files) {
    await processFile(f);
  }
  console.log(`\n${files.length} badges updated →`, BADGES_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
