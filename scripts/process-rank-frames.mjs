/**
 * Extrait le symbole seul depuis les 19 captures individuelles :
 * - retire le texte (bande basse + éventuellement haute)
 * - fond blanc → transparent
 * node scripts/process-rank-frames.mjs
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

/** Captures avec badge/texte du rang précédent visible en haut */
const CROP_OVERRIDES = {
  'elite-1': { top: 0.2, bottom: 0.26, side: 0.06 },
  champion: { top: 0.24, bottom: 0.22, side: 0.05 },
};

function logoCropBox(width, height, rankId) {
  const c = CROP_OVERRIDES[rankId] ?? { top: 0.04, bottom: 0.26, side: 0.06 };
  const side = Math.round(width * c.side);
  const top = Math.round(height * c.top);
  const bottom = Math.round(height * c.bottom);
  const w = Math.max(1, width - side * 2);
  const h = Math.max(1, height - top - bottom);
  return { left: side, top, width: w, height: h };
}

function floodRemoveWhiteBackground(rgba, width, height, threshold = 235) {
  const isBackground = (offset) => {
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    return r >= threshold && g >= threshold && b >= threshold;
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

/** Retire les pixels de texte noir résiduels (libellé rang). */
function removeDarkTextPixels(rgba, width, height) {
  for (let y = Math.floor(height * 0.55); y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (r < 80 && g < 80 && b < 80) {
        rgba[i + 3] = 0;
      }
    }
  }
}

async function processFrame(inputPath, outPath, rankId) {
  const meta = await sharp(inputPath).metadata();
  const box = logoCropBox(meta.width ?? 128, meta.height ?? 135, rankId);

  const cropped = await sharp(inputPath).extract(box).png().toBuffer();

  const { data, info } = await sharp(cropped)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const copy = Buffer.from(data);
  floodRemoveWhiteBackground(copy, info.width, info.height);
  removeDarkTextPixels(copy, info.width, info.height);

  let pipeline = sharp(copy, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();

  try {
    pipeline = pipeline.trim({ threshold: 2 });
  } catch {
    /* ok */
  }

  const trimmed = await pipeline.toBuffer();
  const pad = 4;
  await sharp(trimmed)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
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
    await processFrame(src, out, rank);
    const meta = await sharp(out).metadata();
    console.log(`✓ ${rank}.png  ${meta.width}×${meta.height}`);
  }
  console.log('\n19 badges transparents →', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
