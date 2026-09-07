/**
 * Découpe la planche de rangs en 19 PNG transparents (logo seul, sans texte ni fond).
 * node scripts/split-rank-badges.mjs
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SOURCE = join(root, 'assets/ranks/ranks-sheet-source.png');
const OUT_DIR = join(root, 'assets/ranks/badges');

/** Lignes haut → bas */
const ROW_TIERS = ['bronze', 'argent', 'or', 'platine', 'diamant', 'elite', 'champion'];
const COL_DIVISIONS = [3, 2, 1];

/** Supprime le blanc connecté aux bords (fond) — conserve le logo. */
function floodRemoveWhiteBackground(rgba, width, height, threshold = 238) {
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

async function processExtractedBuffer(buffer, pad = 8) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const copy = Buffer.from(data);
  floodRemoveWhiteBackground(copy, info.width, info.height);

  let pipeline = sharp(copy, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();

  try {
    pipeline = pipeline.trim({ threshold: 1 });
  } catch {
    /* trim peut échouer si image vide */
  }

  if (pad > 0) {
    const trimmed = await pipeline.toBuffer();
    const meta = await sharp(trimmed).metadata();
    pipeline = sharp(trimmed).extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    void meta;
  }

  return pipeline.png();
}

async function extractRegion(img, meta, left, top, width, height, outPath) {
  const l = Math.max(0, Math.floor(left));
  const t = Math.max(0, Math.floor(top));
  const w = Math.min(Math.ceil(width), meta.width - l);
  const h = Math.min(Math.ceil(height), meta.height - t);
  if (w <= 0 || h <= 0) {
    throw new Error(`Invalid extract ${outPath}: ${l},${t},${w},${h}`);
  }

  const cropped = await img.clone().extract({ left: l, top: t, width: w, height: h }).png().toBuffer();
  const processed = await processExtractedBuffer(cropped);
  await processed.toFile(outPath);
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error('Source manquante:', SOURCE);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const img = sharp(SOURCE);
  const meta = await img.metadata();
  const W = meta.width ?? 682;
  const H = meta.height ?? 1024;

  const colW = W / 3;
  const rowH = H / 7;

  /** Logo seul : ~62 % haut de cellule (texte sous le logo exclu) */
  const logoH = rowH * 0.62;
  const logoTopPad = rowH * 0.015;
  const logoSidePad = colW * 0.02;

  for (let row = 0; row < 6; row++) {
    const tier = ROW_TIERS[row];
    for (let col = 0; col < 3; col++) {
      const division = COL_DIVISIONS[col];
      const name = `${tier}-${division}.png`;
      await extractRegion(
        img,
        { width: W, height: H },
        col * colW + logoSidePad,
        row * rowH + logoTopPad,
        colW - logoSidePad * 2,
        logoH,
        join(OUT_DIR, name),
      );
      console.log('✓', name);
    }
  }

  /** Champion — badge centré, sans libellé */
  await extractRegion(
    img,
    { width: W, height: H },
    W * 0.1,
    6 * rowH + logoTopPad,
    W * 0.8,
    rowH * 0.6,
    join(OUT_DIR, 'champion.png'),
  );
  console.log('✓ champion.png');

  console.log('\n19 badges PNG transparents →', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
