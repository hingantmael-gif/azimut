/**
 * Déploie Azimut sur GitHub Pages.
 * - /azimut/              → application Expo (évite la page blanche)
 * - /azimut/telecharger.html → page Installer (PWA + QR), comme BTP Pro
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', shell: true });

sh('node scripts/generate-install-qr.mjs');
sh('npx expo export --platform web');

const dist = path.join(root, 'dist');
for (const f of [
  'manifest.webmanifest',
  'sw.js',
  'icon.png',
  'favicon.png',
  'telecharger.html',
  'qr-install.png',
  'get.html',
]) {
  const src = path.join(root, 'public', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, f));
}

// 404 → app (SPA)
if (fs.existsSync(path.join(dist, 'index.html'))) {
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azimut-pages-'));
fs.cpSync(dist, tmp, { recursive: true });

sh('git init', tmp);
sh('git checkout -b gh-pages', tmp);
sh('git add -A', tmp);
sh(
  'git -c user.email=noreply@github.com -c user.name="Azimut Deploy" commit -m "deploy: app index + telecharger PWA (fix page blanche)"',
  tmp,
);
sh('git remote add origin https://github.com/hingantmael-gif/azimut.git', tmp);
sh('git push -f origin gh-pages', tmp);

console.log('\nOK — App      : https://hingantmael-gif.github.io/azimut/');
console.log('     Installer : https://hingantmael-gif.github.io/azimut/telecharger.html');
