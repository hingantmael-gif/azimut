/**
 * Génère les icônes app (natif + PWA) à partir du glyphe seul (assets/azimut-mark.png).
 * Le glyphe source contient des barres noires parasites : on ne garde que la partie claire
 * (le vortex blanc) puis on le pose sur un fond nuit avec une lueur jade.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const markPath = path.join(root, 'assets/azimut-mark.png');
const INK = { r: 7, g: 17, b: 31, alpha: 1 };

/** Glyphe blanc pur, alpha = luminosité de la source (les barres noires disparaissent). */
async function cleanGlyphBuffer() {
  const { data, info } = await sharp(markPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  const smooth = (x) => {
    const t = Math.min(1, Math.max(0, (x - 70) / (190 - 70)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round((data[i + 3] * smooth(luma)) / 1);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer();
}

let cachedGlyph;
async function glyphPng(size) {
  cachedGlyph ??= await cleanGlyphBuffer();
  return sharp(cachedGlyph).resize(Math.round(size), Math.round(size), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

/** Fond nuit + lueur jade / cyan (identité Mova). */
function backgroundSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B2530"/><stop offset="0.6" stop-color="#07111F"/><stop offset="1" stop-color="#050B16"/>
      </linearGradient>
      <radialGradient id="g1" cx="0.3" cy="0.25" r="0.6"><stop offset="0" stop-color="#3DFF9A" stop-opacity="0.32"/><stop offset="1" stop-color="#3DFF9A" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="0.85" cy="0.9" r="0.6"><stop offset="0" stop-color="#22D3EE" stop-opacity="0.28"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#b)"/>
    <rect width="${size}" height="${size}" fill="url(#g1)"/>
    <rect width="${size}" height="${size}" fill="url(#g2)"/>
  </svg>`);
}

async function iconOnInk(size, glyphScale = 0.62) {
  const g = await glyphPng(size * glyphScale);
  return sharp(backgroundSvg(size)).composite([{ input: g, gravity: 'center' }]).png().toBuffer();
}

async function main() {
  const assets = path.join(root, 'assets');
  const pub = path.join(root, 'public');

  // Natif (Expo)
  await sharp(await iconOnInk(1024)).toFile(path.join(assets, 'icon.png'));
  await sharp(await iconOnInk(1024)).toFile(path.join(assets, 'splash-icon.png'));
  await sharp(await iconOnInk(512, 0.58)).toFile(path.join(assets, 'favicon.png'));
  await sharp(await glyphPng(432)).toFile(path.join(assets, 'android-icon-foreground.png'));
  await sharp({ create: { width: 432, height: 432, channels: 4, background: INK } })
    .png()
    .toFile(path.join(assets, 'android-icon-background.png'));
  await sharp(await glyphPng(432)).greyscale().toFile(path.join(assets, 'android-icon-monochrome.png'));

  // PWA (web) : « any », « maskable » (marge de sécurité 20 %) et icône iPhone (opaque, 180 px)
  await sharp(await iconOnInk(1024)).resize(512, 512).toFile(path.join(pub, 'icon.png'));
  await sharp(await iconOnInk(512)).toFile(path.join(pub, 'icon-512.png'));
  await sharp(await iconOnInk(192)).toFile(path.join(pub, 'icon-192.png'));
  await sharp(await iconOnInk(512, 0.46)).toFile(path.join(pub, 'icon-maskable-512.png'));
  await sharp(await iconOnInk(180, 0.62)).toFile(path.join(pub, 'apple-touch-icon.png'));
  await sharp(await iconOnInk(128, 0.62)).toFile(path.join(pub, 'favicon.png'));

  console.log('Icônes régénérées (natif + PWA, sans barres parasites).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
