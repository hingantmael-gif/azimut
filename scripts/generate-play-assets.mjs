/**
 * Génère les fichiers graphiques pour la fiche Google Play (Play Console → Présence sur le Store → Fiche principale) :
 *   store-assets/android/icon-512.png              icône haute résolution (512×512, obligatoire)
 *   store-assets/android/feature-graphic-1024x500.png   image vedette (1024×500, obligatoire)
 *   store-assets/android/screenshots/*.png          8 captures réelles de l'app (2 à 8 exigées)
 *
 *   node scripts/generate-play-assets.mjs
 *
 * Rien n'est publié : ce sont des fichiers prêts à téléverser à la main dans Play Console (voir docs/PLAY_STORE.md).
 * Réutilise le glyphe de marque déjà nettoyé par scripts/generate-brand-icons.mjs (même identité visuelle).
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'store-assets', 'android');
const screenshotsDir = path.join(outDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const INK = { r: 7, g: 17, b: 31, alpha: 1 };
const markPath = path.join(root, 'assets', 'azimut-mark.png');

/** Glyphe blanc pur, alpha = luminosité de la source (identique à generate-brand-icons.mjs). */
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
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png().toBuffer();
}

let cachedGlyph;
async function glyphPng(size) {
  cachedGlyph ??= await cleanGlyphBuffer();
  return sharp(cachedGlyph).resize(Math.round(size), Math.round(size), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

function bgSvg(w, h) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0B2530"/><stop offset="0.55" stop-color="#07111F"/><stop offset="1" stop-color="#050B16"/>
      </linearGradient>
      <radialGradient id="g1" cx="0.14" cy="0.18" r="0.65"><stop offset="0" stop-color="#3DFF9A" stop-opacity="0.38"/><stop offset="1" stop-color="#3DFF9A" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="0.92" cy="0.85" r="0.6"><stop offset="0" stop-color="#22D3EE" stop-opacity="0.32"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#b)"/>
    <rect width="${w}" height="${h}" fill="url(#g1)"/>
    <rect width="${w}" height="${h}" fill="url(#g2)"/>
  </svg>`);
}

async function main() {
  // 1) Icône haute résolution — opaque (Play strip parfois l'alpha), fond identité de marque.
  const iconSrc = path.join(root, 'assets', 'icon.png');
  await sharp(iconSrc).resize(512, 512).flatten({ background: '#07111F' }).png().toFile(path.join(outDir, 'icon-512.png'));

  // 2) Image vedette (« feature graphic ») 1024×500 : glyphe + nom + accroche, sans texte trop fin (lisible en vignette).
  const w = 1024;
  const h = 500;
  const glyph = await glyphPng(220);
  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="330" y="230" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#F3F7FB">Mova</text>
    <text x="330" y="286" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#3DFF9A">Ton coach personnel multi-sport</text>
    <text x="330" y="330" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#A9B9C9">Course · Vélo · Natation · Triathlon · Musculation</text>
  </svg>`);
  await sharp(bgSvg(w, h))
    .composite([
      { input: glyph, left: 66, top: Math.round((h - 220) / 2) },
      { input: textSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(outDir, 'feature-graphic-1024x500.png'));

  // 3) Captures d'écran réelles — converties depuis le site vitrine (mêmes fichiers, format PNG demandé par Play).
  const shots = [
    'coach-adapte', // séance allégée après une mauvaise nuit
    'coach-explique', // pourquoi ? readiness + raison
    'accueil',
    'plan-entrainement',
    'jauge-allure',
    'seance-rapide-intensite',
    'theme-aurore',
    'progres',
  ];
  const srcDir = path.join(root, 'site', 'src', 'img');
  let n = 0;
  for (const name of shots) {
    const src = path.join(srcDir, `${name}.webp`);
    if (!fs.existsSync(src)) {
      console.warn('  (absent, ignoré) ' + name);
      continue;
    }
    n += 1;
    await sharp(src)
      .png()
      .toFile(path.join(screenshotsDir, `${String(n).padStart(2, '0')}-${name}.png`));
  }

  console.log(`OK — store-assets/android/ : icon-512.png, feature-graphic-1024x500.png, ${n} captures dans screenshots/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
