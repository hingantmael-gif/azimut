/**
 * Génère les icônes app à partir du glyphe seul (assets/azimut-mark.png).
 * Pas de carré noir — uniquement le vortex sur fond ink (#07111F) ou transparent.
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const markPath = path.join(root, 'assets/azimut-mark.png');
const INK = { r: 7, g: 17, b: 31, alpha: 1 };

async function glyphPng(size) {
  return sharp(markPath).resize(Math.round(size), Math.round(size), { fit: 'contain' }).png().toBuffer();
}

async function iconOnInk(size, glyphScale = 0.62) {
  const g = await glyphPng(size * glyphScale);
  return sharp({
    create: { width: size, height: size, channels: 4, background: INK },
  })
    .composite([{ input: g, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  const assets = path.join(root, 'assets');

  await iconOnInk(1024).then((b) => sharp(b).toFile(path.join(assets, 'icon.png')));
  await iconOnInk(1024).then((b) => sharp(b).toFile(path.join(assets, 'splash-icon.png')));
  await iconOnInk(512, 0.58).then((b) => sharp(b).toFile(path.join(assets, 'favicon.png')));

  // Android adaptive : glyphe blanc seul (fond = backgroundColor app.json)
  const fg = await glyphPng(432);
  await sharp(fg).toFile(path.join(assets, 'android-icon-foreground.png'));

  await sharp({
    create: { width: 432, height: 432, channels: 4, background: INK },
  })
    .png()
    .toFile(path.join(assets, 'android-icon-background.png'));

  await sharp(await glyphPng(432))
    .greyscale()
    .toFile(path.join(assets, 'android-icon-monochrome.png'));

  console.log('Icônes régénérées (glyphe seul, sans carré noir).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
