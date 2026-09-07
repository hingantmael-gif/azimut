/**
 * Extraction soignée — Bronze 1 uniquement (ailes + médaillon).
 * node scripts/process-bronze-1.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets/ranks/sources/frames/bronze-1.png');
const OUT = join(root, 'assets/ranks/badges/bronze-1.png');

function isWhite(r, g, b, t = 232) {
  return r >= t && g >= t && b >= t;
}

function isBlack(r, g, b) {
  return r < 72 && g < 72 && b < 72;
}

function isBronze(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r > 90 && r >= g * 0.9;
}

/** Bois / brun foncé du centre du médaillon. */
function isDarkWood(r, g, b) {
  if (isWhite(r, g, b)) return false;
  return r >= 45 && r <= 120 && g >= 25 && g <= 95 && b >= 15 && b <= 75 && r > g && g >= b;
}

/** Tons argent / gris froid (aperçu du rang suivant). */
function isSilver(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b) || isBronze(r, g, b) || isDarkWood(r, g, b)) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 40 && r > 85 && g > 80 && b > 80;
}

function floodRemoveWhiteBackground(rgba, width, height, threshold = 232) {
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

function removeWhiteFringe(rgba, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] === 0) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      const max = Math.max(r, g, b);
      if (isWhite(r, g, b, 228)) {
        rgba[i + 3] = 0;
        continue;
      }
      if (spread < 18 && max >= 215) {
        rgba[i + 3] = 0;
      }
    }
  }
}

function rowStats(data, width, y) {
  let black = 0;
  let white = 0;
  let bronze = 0;
  let silver = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isWhite(r, g, b)) white++;
    else if (isBlack(r, g, b)) black++;
    else if (isBronze(r, g, b) || isDarkWood(r, g, b)) bronze++;
    else if (isSilver(r, g, b)) silver++;
  }
  return { black, white, bronze, silver };
}

function isTextRow(data, width, y) {
  const { black, white, bronze } = rowStats(data, width, y);
  return white / width >= 0.85 && black >= 8 && bronze < 18;
}

function findCropBottom(data, width, height) {
  const textTop = (() => {
    for (let y = 0; y < height; y++) {
      if (isTextRow(data, width, y)) return y;
    }
    return height;
  })();

  const scanLimit = textTop < height ? textTop : height;
  let maxBronzeY = 0;
  for (let y = 0; y < scanLimit; y++) {
    const { bronze } = rowStats(data, width, y);
    if (bronze >= 8) maxBronzeY = y;
  }

  return maxBronzeY + 1;
}

function isLogoPixel(r, g, b, a) {
  if (a < 8) return false;
  if (isWhite(r, g, b)) return false;
  if (isSilver(r, g, b)) return false;
  return isBronze(r, g, b) || isBlack(r, g, b) || isDarkWood(r, g, b);
}

function stripBottomContaminants(rgba, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    let bronze = 0;
    let silver = 0;
    let textBlack = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isBronze(r, g, b) || isDarkWood(r, g, b)) bronze++;
      else if (isSilver(r, g, b)) silver++;
      else if (isBlack(r, g, b)) textBlack++;
    }

    const contaminant = silver >= 3 || (textBlack >= 5 && bronze < 6);
    if (contaminant) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        rgba[i + 3] = 0;
      }
      continue;
    }
    if (bronze >= 8) break;
  }
}

function findLogoBounds(data, width, height) {
  const cropBottom = findCropBottom(data, width, height);

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < cropBottom; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = 2;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
    height: Math.min(cropBottom - Math.max(0, minY - pad), maxY - minY + 1 + pad * 2),
    cropBottom,
  };
}

async function main() {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bounds = findLogoBounds(data, info.width, info.height);
  console.log('Bounds:', bounds, `(source ${info.width}×${info.height})`);

  const cropped = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .png()
    .toBuffer();

  const { data: px, info: ci } = await sharp(cropped)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const copy = Buffer.from(px);
  floodRemoveWhiteBackground(copy, ci.width, ci.height);
  removeWhiteFringe(copy, ci.width, ci.height);
  stripBottomContaminants(copy, ci.width, ci.height);

  let pipeline = sharp(copy, {
    raw: { width: ci.width, height: ci.height, channels: 4 },
  }).png();

  try {
    pipeline = pipeline.trim({ threshold: 1 });
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
    .png()
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`✓ bronze-1.png → ${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
