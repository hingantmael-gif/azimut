/**
 * Extraction soignée — Bronze 3 uniquement.
 * node scripts/process-bronze-3.mjs
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets/ranks/sources/frames/bronze-3.png');
const OUT = join(root, 'assets/ranks/badges/bronze-3.png');

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

/** Tons argent / gris froid (aperçu du rang suivant). */
function isSilver(r, g, b) {
  if (isWhite(r, g, b) || isBlack(r, g, b) || isBronze(r, g, b)) return false;
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

/**
 * Trous blancs enfermés (entre épis / cercle) : non atteints par le flood depuis les bords.
 * On les force en transparent partout — pas de blanc « plein » dans le logo bronze.
 */
function punchEnclosedWhiteHoles(rgba, width, height, threshold = 200) {
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];
    if (a < 8) continue;
    if (r >= threshold && g >= threshold && b >= threshold) {
      rgba[i + 3] = 0;
      continue;
    }
    // Gris clair / blanc cassé (anti-alias, JPEG) dans les interstices
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    if (spread < 28 && min >= 165) {
      rgba[i + 3] = 0;
    }
  }
}

/** Fond noir opaque autour / dans les trous reliés au bord → transparent. */
function floodRemoveBlackBackground(rgba, width, height, threshold = 42) {
  const isBackground = (offset) => {
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3];
    if (a < 8) return true;
    return r <= threshold && g <= threshold && b <= threshold;
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

/**
 * Depuis les zones déjà transparentes (bords + trous blancs percés),
 * étend la transparence vers le noir / gris clair voisin (franges des interstices).
 */
function expandTransparencyIntoGaps(rgba, width, height) {
  const isGapPixel = (offset) => {
    const a = rgba[offset + 3];
    if (a < 8) return false;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    // Noir / quasi-noir
    if (max <= 55) return true;
    // Blanc / gris clair neutre
    if (min >= 150 && spread < 32) return true;
    return false;
  };

  const queue = [];
  for (let idx = 0; idx < width * height; idx++) {
    if (rgba[idx * 4 + 3] < 8) queue.push(idx);
  }

  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % width;
    const y = Math.floor(idx / width);
    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nIdx = ny * width + nx;
      const o = nIdx * 4;
      if (!isGapPixel(o)) continue;
      rgba[o + 3] = 0;
      queue.push(nIdx);
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
    else if (isBronze(r, g, b)) bronze++;
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
  return isBronze(r, g, b) || isBlack(r, g, b);
}

/** Retire argent / texte résiduels collés en bas après découpe. */
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
      if (isBronze(r, g, b)) bronze++;
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
    width: Math.min(width, maxX - minX + 1 + pad * 2),
    height: Math.min(cropBottom, maxY - minY + 1 + pad * 2),
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
  punchEnclosedWhiteHoles(copy, ci.width, ci.height);
  floodRemoveBlackBackground(copy, ci.width, ci.height);
  expandTransparencyIntoGaps(copy, ci.width, ci.height);
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
  console.log(`✓ bronze-3.png → ${meta.width}×${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
