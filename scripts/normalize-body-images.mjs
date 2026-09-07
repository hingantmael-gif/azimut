/**
 * Normalise les illustrations corps : même hauteur de silhouette sur un canvas fixe.
 * Usage: node scripts/normalize-body-images.mjs [homme|femme|all]
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '../assets/body');

const CANVAS_W = 1024;
const CANVAS_H = 1536;
/** Hauteur cible de la silhouette (identique face/dos) */
const TARGET_FIGURE_H = 1180;
/** Marge haut — tête alignée */
const TOP_MARGIN = 88;

const sets = {
  homme: ['body-male-front.png', 'body-male-back.png'],
  femme: ['body-female-front.png', 'body-female-back.png'],
};

async function findContentBounds(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels > 3 ? data[i + 3] : 255;
      if (a < 16) continue;
      // Blanc pur / quasi blanc = fond
      if (r > 248 && g > 248 && b > 248) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { left: 0, top: 0, width, height };
  }

  const pad = 4;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width, maxX - minX + 1 + pad * 2),
    height: Math.min(height, maxY - minY + 1 + pad * 2),
  };
}

async function normalizeFile(filename) {
  const inputPath = path.join(assetsDir, filename);
  const bounds = await findContentBounds(inputPath);

  const scale = TARGET_FIGURE_H / bounds.height;
  const scaledW = Math.round(bounds.width * scale);
  const scaledH = TARGET_FIGURE_H;
  const left = Math.round((CANVAS_W - scaledW) / 2);

  const figure = await sharp(inputPath)
    .extract(bounds)
    .resize(scaledW, scaledH, { fit: 'fill' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: figure, left, top: TOP_MARGIN }])
    .png()
    .toFile(inputPath);

  console.log(`✓ ${filename} — silhouette ${bounds.height}px → ${scaledH}px, centré`);
}

const arg = process.argv[2] ?? 'homme';
const files =
  arg === 'all'
    ? [...sets.homme, ...sets.femme]
    : arg === 'femme'
      ? sets.femme
      : sets.homme;

for (const file of files) {
  await normalizeFile(file);
}

console.log('Normalisation terminée.');
