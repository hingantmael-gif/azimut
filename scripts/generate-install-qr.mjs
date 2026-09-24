/**
 * Génère qr-install.png → scan = page Installer Mova (PWA racine, comme BTP Pro).
 */
import QRCode from 'qrcode';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.env.MOVA_SITE_URL || 'https://hingantmael-gif.github.io').replace(/\/$/, '');
// L'écran d'installation est DANS l'application (/install) : le QR y mène directement.
const url = `${site}/install`;
const out = path.join(root, 'public', 'qr-install.png');

await QRCode.toFile(out, url, {
  width: 720,
  margin: 2,
  color: { dark: '#07111F', light: '#FFFFFF' },
  errorCorrectionLevel: 'Q',
});

console.log('QR écrit:', out, '→', url);
