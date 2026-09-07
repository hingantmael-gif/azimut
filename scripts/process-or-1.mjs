/**
 * Extraction soignée — Or 1 uniquement (couronne, cristaux, lauriers).
 * node scripts/process-or-1.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets/ranks/sources/frames/or-1.png');
const OUT = join(root, 'assets/ranks/badges/or-1.png');

function isWhite(r, g, b, t = 232) {
  return r >= t && g >= t && b >= t;
}

function isBlack(r, g, b) {
  return r < 72 && g < 72 && b < 72;
}

function isGold(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r > 100 && g > 70 && b < g * 0.95 && r >= g;
}

function isDarkGold(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r >= 70 && r <= 150 && g >= 45 && g <= 115 && b >= 25 && b <= 85 && r > g && g > b;
}

function isRedGem(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r > 120 && r > g * 1.35 && r > b * 1.35 && g < 110;
}

function isSilver(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b) || isGold(r, g, b) || isDarkGold(r, g, b) || isRedGem(r, g, b)) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 45 && r > 85 && g > 80 && b > 75;
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
  return isGold(r, g, b) || isDarkGold(r, g, b) || isRedGem(r, g, b) || isBlack(r, g, b);
}

function rowStats(data, width, y) {
  let black = 0;
  let white = 0;
  let emblem = 0;
  let silver = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackground(r, g, b)) white++;
    else if (isBlack(r, g, b)) black++;
    else if (isSilver(r, g, b)) silver++;
    else if (isEmblemPixel(r, g, b)) emblem++;
  }
  return { black, white, emblem, silver };
}

function isTextRow(data, width, y) {
  const { black, white, emblem } = rowStats(data, width, y);
  return white / width >= 0.75 && black >= 8 && emblem < 18;
}

function findCropBottom(data, width, height) {
  const searchFrom = Math.floor(height * 0.52);
  let textTop = height;
  for (let y = searchFrom; y < height; y++) {
    if (isTextRow(data, width, y)) textTop = Math.min(textTop, y);
  }
  if (textTop === height) {
    for (let y = 0; y < height; y++) {
      if (isTextRow(data, width, y)) textTop = Math.min(textTop, y);
    }
  }

  const scanLimit = textTop < height ? textTop : height;
  let maxEmblemY = 0;
  for (let y = 0; y < scanLimit; y++) {
    const { emblem } = rowStats(data, width, y);
    if (emblem >= 4) maxEmblemY = y;
  }

  return Math.min(height, maxEmblemY + 1);
}

function findBottomEmblemY(rgba, width, height) {
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] > 20 && isEmblemPixel(rgba[i], rgba[i + 1], rgba[i + 2])) {
        maxY = y;
      }
    }
  }
  return maxY;
}

/** Reconstruit la pointe basse (gemme + bouclier) quand la capture coupe le bas. */
function extendBottomMirror(rgba, width, height, mirrorRows = 16) {
  const maxY = findBottomEmblemY(rgba, width, height);
  if (maxY < 4) return { data: rgba, width, height };

  const newH = height + mirrorRows;
  const out = Buffer.alloc(width * newH * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const oi = si;
      out[oi] = rgba[si];
      out[oi + 1] = rgba[si + 1];
      out[oi + 2] = rgba[si + 2];
      out[oi + 3] = rgba[si + 3];
    }
  }

  const xCenterStart = Math.floor(width * 0.22);
  const xCenterEnd = Math.ceil(width * 0.78);

  for (let dy = 1; dy <= mirrorRows; dy++) {
    const srcY = maxY - dy;
    if (srcY < 0) continue;
    const destY = maxY + dy;
    for (let x = xCenterStart; x < xCenterEnd; x++) {
      const si = (srcY * width + x) * 4;
      if (rgba[si + 3] < 20) continue;
      const r = rgba[si];
      const g = rgba[si + 1];
      const b = rgba[si + 2];
      if (!isEmblemPixel(r, g, b)) continue;
      const oi = (destY * width + x) * 4;
      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = rgba[si + 3];
    }
  }

  const sideMirror = Math.min(10, mirrorRows);
  const sideBands = [
    { start: 0, end: Math.floor(width * 0.3) },
    { start: Math.ceil(width * 0.7), end: width },
  ];
  for (const band of sideBands) {
    for (let dy = 1; dy <= sideMirror; dy++) {
      const srcY = maxY - dy;
      if (srcY < 0) continue;
      const destY = maxY + dy;
      for (let x = band.start; x < band.end; x++) {
        const si = (srcY * width + x) * 4;
        if (rgba[si + 3] < 20) continue;
        const r = rgba[si];
        const g = rgba[si + 1];
        const b = rgba[si + 2];
        if (!isGold(r, g, b) && !isDarkGold(r, g, b)) continue;
        const oi = (destY * width + x) * 4;
        if (out[oi + 3] < rgba[si + 3]) {
          out[oi] = r;
          out[oi + 1] = g;
          out[oi + 2] = b;
          out[oi + 3] = rgba[si + 3];
        }
      }
    }
  }

  return { data: out, width, height: newH };
}

function isLogoPixel(r, g, b, a) {
  if (a < 8) return false;
  if (isBackground(r, g, b)) return false;
  if (isSilver(r, g, b)) return false;
  return isEmblemPixel(r, g, b);
}

function stripBottomContaminants(rgba, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    let emblem = 0;
    let redGem = 0;
    let silver = 0;
    let textBlack = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isRedGem(r, g, b)) redGem++;
      else if (isEmblemPixel(r, g, b)) emblem++;
      else if (isSilver(r, g, b)) silver++;
      else if (isBlack(r, g, b)) textBlack++;
    }

    if (redGem >= 2) break;

    const contaminant = silver >= 3 || (textBlack >= 5 && emblem < 6);
    if (contaminant) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        rgba[i + 3] = 0;
      }
      continue;
    }
    if (emblem >= 6) break;
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
  const top = Math.max(0, minY - pad);
  return {
    left: Math.max(0, minX - pad),
    top,
    width: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
    height: Math.min(cropBottom - top, maxY - minY + 1 + pad * 2),
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

  const extended = extendBottomMirror(copy, ci.width, ci.height, 18);
  stripBottomContaminants(extended.data, extended.width, extended.height);

  let pipeline = sharp(extended.data, {
    raw: { width: extended.width, height: extended.height, channels: 4 },
  }).png();

  const trimmed = await pipeline.toBuffer();
  const pad = 12;
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
  console.log(`✓ or-1.png → ${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
