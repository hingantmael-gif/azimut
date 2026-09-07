/**
 * Traite les badges rang :
 * fond noir ou blanc → transparent, trim serré, canvas 256.
 * node scripts/process-rank-badges-flat.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE_DIR = join(root, 'assets/ranks/sources/frames');
const OUT_DIR = join(root, 'assets/ranks/badges');

const RANKS = [
  'bronze-3', 'bronze-2', 'bronze-1',
  'argent-3', 'argent-2', 'argent-1',
  'or-3', 'or-2', 'or-1',
  'platine-3', 'platine-2', 'platine-1',
  'diamant-3', 'diamant-2', 'diamant-1',
  'elite-3', 'elite-2', 'elite-1',
  'champion',
];

function floodRemoveBackground(rgba, width, height) {
  const isBackground = (offset) => {
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3];
    if (a < 8) return true;
    // Blanc / quasi-blanc
    if (r >= 245 && g >= 245 && b >= 245) return true;
    // Noir / quasi-noir (sources actuelles)
    if (r <= 28 && g <= 28 && b <= 28) return true;
    // Gris très sombre
    if (r <= 40 && g <= 40 && b <= 40 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8) {
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
    if (!isBackground(idx * 4)) return;
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

  while (queue.length > 0) {
    const idx = queue.shift();
    rgba[idx * 4 + 3] = 0;
    const x = idx % width;
    const y = Math.floor(idx / width);
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }
}

async function processFrame(inputPath, outPath) {
  const { data, info } = await sharp(inputPath)
    .resize(768, 768, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const copy = Buffer.from(data);
  floodRemoveBackground(copy, info.width, info.height);

  let pipeline = sharp(copy, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();

  try {
    pipeline = pipeline.trim({ threshold: 12 });
  } catch {
    /* ok */
  }

  const trimmed = await pipeline.toBuffer();
  const pad = 8;
  await sharp(trimmed)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const rank of RANKS) {
    const src = join(SOURCE_DIR, `${rank}.png`);
    if (!existsSync(src)) {
      console.error('Source manquante:', src);
      process.exitCode = 1;
      continue;
    }
    const out = join(OUT_DIR, `${rank}.png`);
    await processFrame(src, out);
    const meta = await sharp(out).metadata();
    console.log(`✓ ${rank}.png  ${meta.width}×${meta.height}`);
  }
  console.log('\n19 badges transparents →', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
