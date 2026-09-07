/**
 * Extraction soignée — Argent 2 uniquement (gemmes bleues).
 * node scripts/process-argent-2.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets/ranks/sources/frames/argent-2.png');
const OUT = join(root, 'assets/ranks/badges/argent-2.png');

function isWhite(r, g, b, t = 232) {
  return r >= t && g >= t && b >= t;
}

function isBlack(r, g, b) {
  return r < 72 && g < 72 && b < 72;
}

function isSilver(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 55 && r > 75 && g > 72 && b > 68;
}

function isStone(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (b >= g && g >= r * 0.85 && r >= 45 && b <= 130) return true;
  return spread < 40 && r >= 48 && r <= 125 && g >= 48 && b >= 48;
}

function isBlueGem(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return b > 110 && b > r * 1.12 && b > g * 1.02;
}

function isBronze(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r > 95 && r >= g * 0.95 && b < g * 0.95;
}

function isBackground(r, g, b, threshold = 228) {
  if (isWhite(r, g, b, threshold)) return true;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return spread < 28 && min >= 188 && max >= 200;
}

function floodRemoveBackground(rgba, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  const tryPush = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const o = idx * 4;
    if (!isBackground(rgba[o], rgba[o + 1], rgba[o + 2])) return;
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
      if (isBackground(r, g, b, 225)) {
        rgba[i + 3] = 0;
        continue;
      }
      if (spread < 18 && max >= 215) {
        rgba[i + 3] = 0;
      }
    }
  }
}

function isEmblemPixel(r, g, b) {
  return isSilver(r, g, b) || isStone(r, g, b) || isBlueGem(r, g, b) || isBlack(r, g, b);
}

function rowStats(data, width, y) {
  let black = 0;
  let white = 0;
  let emblem = 0;
  let bronze = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackground(r, g, b)) white++;
    else if (isBlack(r, g, b)) black++;
    else if (isBronze(r, g, b)) bronze++;
    else if (isEmblemPixel(r, g, b)) emblem++;
  }
  return { black, white, emblem, bronze };
}

function isTextRow(data, width, y) {
  const { black, white, emblem } = rowStats(data, width, y);
  return white / width >= 0.75 && black >= 8 && emblem < 18;
}

function findCropBottom(data, width, height) {
  const textTop = (() => {
    for (let y = 0; y < height; y++) {
      if (isTextRow(data, width, y)) return y;
    }
    return height;
  })();

  const scanLimit = textTop < height ? textTop : height;
  let maxEmblemY = 0;
  for (let y = 0; y < scanLimit; y++) {
    const { emblem } = rowStats(data, width, y);
    if (emblem >= 8) maxEmblemY = y;
  }

  return maxEmblemY + 1;
}

function isLogoPixel(r, g, b, a) {
  if (a < 8) return false;
  if (isBackground(r, g, b)) return false;
  if (isBronze(r, g, b)) return false;
  return isEmblemPixel(r, g, b);
}

function stripBottomContaminants(rgba, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    let emblem = 0;
    let bronze = 0;
    let textBlack = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isEmblemPixel(r, g, b)) emblem++;
      else if (isBronze(r, g, b)) bronze++;
      else if (isBlack(r, g, b)) textBlack++;
    }

    const contaminant = bronze >= 3 || (textBlack >= 5 && emblem < 6);
    if (contaminant) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        rgba[i + 3] = 0;
      }
      continue;
    }
    if (emblem >= 8) break;
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
  floodRemoveBackground(copy, ci.width, ci.height);
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
  console.log(`✓ argent-2.png → ${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
