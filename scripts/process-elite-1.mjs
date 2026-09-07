/**
 * Extraction soignée — Élite 1 uniquement (cadre or + ailes violettes).
 * node scripts/process-elite-1.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets/ranks/sources/frames/elite-1.png');
const OUT = join(root, 'assets/ranks/badges/elite-1.png');

function isWhite(r, g, b, t = 232) {
  return r >= t && g >= t && b >= t;
}

function isBlack(r, g, b) {
  return r < 72 && g < 72 && b < 72;
}

function isElitePurple(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return b >= 55 && r >= 45 && b >= r * 0.85 && g >= r * 0.55;
}

function isLightElite(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return b > 130 && g > 90 && r > 80 && b >= g;
}

function isGoldFrame(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b)) return false;
  return r > 100 && g > 70 && b < g * 0.95 && r >= g;
}

function isDiamondBlue(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b) || isElitePurple(r, g, b)) return false;
  return b > 100 && b >= g * 0.95 && g >= r * 0.8;
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
  return (
    isElitePurple(r, g, b) ||
    isLightElite(r, g, b) ||
    isGoldFrame(r, g, b) ||
    isBlack(r, g, b)
  );
}

/** Cadre violet/or — pour la découpe (ignore or voisin d'un autre rang). */
function isCorePixel(r, g, b) {
  return isElitePurple(r, g, b) || isLightElite(r, g, b) || isBlack(r, g, b);
}

function rowStats(data, width, y) {
  let black = 0;
  let white = 0;
  let emblem = 0;
  let diamond = 0;
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackground(r, g, b)) white++;
    else if (isBlack(r, g, b)) black++;
    else if (isDiamondBlue(r, g, b)) diamond++;
    else if (isCorePixel(r, g, b)) emblem++;
  }
  return { black, white, emblem, diamond };
}

function isTextRow(data, width, y) {
  const { black, white, emblem } = rowStats(data, width, y);
  return white / width >= 0.75 && black >= 8 && emblem < 18;
}

function findCropBottom(data, width, height) {
  const searchFrom = Math.floor(height * 0.5);
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
    if (emblem >= 8) maxEmblemY = y;
  }

  return maxEmblemY + 1;
}

function findCropTop(data, width, cropBottom) {
  for (let y = 0; y < cropBottom; y++) {
    let purple = 0;
    let diamond = 0;
    let text = 0;
    let gold = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isElitePurple(r, g, b) || isLightElite(r, g, b)) purple++;
      else if (isDiamondBlue(r, g, b)) diamond++;
      else if (isGoldFrame(r, g, b)) gold++;
      else if (r < 130 && g < 130 && b < 130) text++;
    }
    if (purple >= 22 && diamond === 0 && gold >= 6 && text < 25) {
      return Math.max(0, y - 2);
    }
  }
  return 0;
}

function isLogoPixel(r, g, b, a) {
  if (a < 8) return false;
  if (isBackground(r, g, b)) return false;
  if (isDiamondBlue(r, g, b)) return false;
  return isCorePixel(r, g, b);
}

function stripBottomContaminants(rgba, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    let emblem = 0;
    let diamond = 0;
    let textBlack = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isEmblemPixel(r, g, b)) emblem++;
      else if (isDiamondBlue(r, g, b)) diamond++;
      else if (isBlack(r, g, b)) textBlack++;
    }

    const contaminant = diamond >= 3 || (textBlack >= 5 && emblem < 6);
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

function stripTopContaminants(rgba, width, height) {
  for (let y = 0; y < height; y++) {
    let emblem = 0;
    let diamond = 0;
    let textBlack = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 8) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isEmblemPixel(r, g, b)) emblem++;
      else if (isDiamondBlue(r, g, b)) diamond++;
      else if (isBlack(r, g, b)) textBlack++;
    }

    const contaminant =
      diamond >= 3 ||
      (textBlack >= 5 && emblem < 6) ||
      (emblem > 0 && emblem < 12);
    if (contaminant) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        rgba[i + 3] = 0;
      }
      continue;
    }
    if (emblem >= 12) break;
  }
}

function stripTopTextRows(rgba, width, height) {
  const limit = Math.min(height, Math.floor(height * 0.35));
  for (let y = 0; y < limit; y++) {
    let textBlack = 0;
    let purple = 0;
    let diamond = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 8) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (isBlack(r, g, b) || (r < 130 && g < 130 && b < 130)) textBlack++;
      else if (isDiamondBlue(r, g, b)) diamond++;
      else if (isElitePurple(r, g, b) || isLightElite(r, g, b)) purple++;
    }
    if (purple >= 15) break;
    if (textBlack >= 6 || diamond >= 8 || (textBlack >= 3 && purple < 8)) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        rgba[i + 3] = 0;
      }
    }
  }
}

function stripCornerForeignGold(rgba, width, height) {
  const yStart = Math.floor(height * 0.45);
  const xEnd = Math.floor(width * 0.4);
  for (let y = yStart; y < height; y++) {
    for (let x = 0; x < xEnd; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 8) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (
        (isGoldFrame(r, g, b) || (r > 90 && g > 60 && b < 80)) &&
        !isElitePurple(r, g, b) &&
        !isLightElite(r, g, b)
      ) {
        rgba[i + 3] = 0;
      }
    }
  }
}

function stripForeignGold(rgba, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i + 3] < 8) continue;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      if (!isGoldFrame(r, g, b)) continue;

      let nearPurple = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const j = (ny * width + nx) * 4;
          if (rgba[j + 3] < 8) continue;
          if (isElitePurple(rgba[j], rgba[j + 1], rgba[j + 2])) {
            nearPurple = true;
            break;
          }
        }
        if (nearPurple) break;
      }
      if (!nearPurple) rgba[i + 3] = 0;
    }
  }
}

function findLogoBounds(data, width, height) {
  const cropBottom = findCropBottom(data, width, height);
  const cropTop = findCropTop(data, width, cropBottom);

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = cropTop; y < cropBottom; y++) {
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

  const pad = 6;
  const top = Math.max(cropTop, Math.max(0, minY - pad));
  return {
    left: Math.max(0, minX - pad),
    top,
    width: Math.min(width - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2),
    height: Math.min(cropBottom - top, maxY - top + 1 + pad),
    cropBottom,
    cropTop,
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
  stripTopContaminants(copy, ci.width, ci.height);
  stripTopTextRows(copy, ci.width, ci.height);
  stripForeignGold(copy, ci.width, ci.height);
  stripCornerForeignGold(copy, ci.width, ci.height);

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
  console.log(`✓ elite-1.png → ${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
