/**
 * Génère qr-install.png → scan = page Installer Azimut (PWA).
 */
import QRCode from 'qrcode';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'https://hingantmael-gif.github.io/azimut/telecharger.html';
const out = path.join(root, 'public', 'qr-install.png');

await QRCode.toFile(out, url, {
  width: 360,
  margin: 2,
  color: { dark: '#07111F', light: '#FFFFFF' },
  errorCorrectionLevel: 'M',
});

console.log('QR écrit:', out, '→', url);
