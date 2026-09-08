/**
 * Déploie Azimut à la RACINE HTTPS (comme BTP Pro sur Render).
 * Cible : https://hingantmael-gif.github.io/  (repo user pages)
 * + miroir redirect depuis l’ancien /azimut/
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = 'https://hingantmael-gif.github.io';
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', shell: true });

sh('node scripts/generate-install-qr.mjs');
sh('npx expo export --platform web');

const dist = path.join(root, 'dist');
for (const f of [
  'manifest.webmanifest',
  'sw.js',
  'icon.png',
  'icon-192.png',
  'icon-512.png',
  'favicon.png',
  'telecharger.html',
  'qr-install.png',
  'get.html',
  'apropos.html',
  'privacy.html',
  'terms.html',
]) {
  const src = path.join(root, 'public', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dist, f));
}

if (fs.existsSync(path.join(dist, 'index.html'))) {
  // Garde l’app Expo pour /welcome, /body, etc. ; la racine `/` = page publique (Google OAuth)
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, 'app.html'));
}
const aproposSrc = path.join(dist, 'apropos.html');
if (fs.existsSync(aproposSrc)) {
  fs.copyFileSync(aproposSrc, path.join(dist, 'index.html'));
}
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

// --- 1) Site racine (user pages) : https://hingantmael-gif.github.io/
const rootTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azimut-root-'));
fs.cpSync(dist, rootTmp, { recursive: true });
sh('git init', rootTmp);
sh('git checkout -b main', rootTmp);
sh('git add -A', rootTmp);
sh(
  'git -c user.email=noreply@github.com -c user.name="Azimut Deploy" commit -m "deploy: Azimut PWA racine (comme BTP Pro)"',
  rootTmp,
);
try {
  execSync('gh repo view hingantmael-gif/hingantmael-gif.github.io', {
    cwd: root,
    stdio: 'pipe',
    shell: true,
  });
} catch {
  sh(
    'gh repo create hingantmael-gif/hingantmael-gif.github.io --public --description "Azimut — app web PWA (racine)"',
  );
}
sh('git remote add origin https://github.com/hingantmael-gif/hingantmael-gif.github.io.git', rootTmp);
sh('git push -f origin main', rootTmp);

// --- 2) Ancien /azimut/ → redirect vers la racine
const redirectHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=${LIVE}/telecharger.html" />
  <link rel="canonical" href="${LIVE}/telecharger.html" />
  <title>Redirection Azimut…</title>
  <script>location.replace(${JSON.stringify(LIVE + '/telecharger.html')} + location.search + location.hash);</script>
</head>
<body style="background:#07111f;color:#fff;font-family:system-ui;padding:24px;text-align:center">
  <p>Redirection vers Azimut…</p>
  <p><a style="color:#3dff9a" href="${LIVE}/telecharger.html">Ouvrir l’installateur</a></p>
</body>
</html>`;

const legacyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azimut-legacy-'));
fs.writeFileSync(path.join(legacyTmp, 'index.html'), redirectHtml.replace('/telecharger.html', '/'));
fs.writeFileSync(path.join(legacyTmp, 'telecharger.html'), redirectHtml);
fs.writeFileSync(path.join(legacyTmp, '404.html'), redirectHtml.replace('/telecharger.html', '/'));
fs.writeFileSync(path.join(legacyTmp, '.nojekyll'), '');
sh('git init', legacyTmp);
sh('git checkout -b gh-pages', legacyTmp);
sh('git add -A', legacyTmp);
sh(
  'git -c user.email=noreply@github.com -c user.name="Azimut Deploy" commit -m "redirect: /azimut → site racine PWA"',
  legacyTmp,
);
sh('git remote add origin https://github.com/hingantmael-gif/azimut.git', legacyTmp);
sh('git push -f origin gh-pages', legacyTmp);

console.log('\nOK — App      : ' + LIVE + '/');
console.log('     Installer : ' + LIVE + '/telecharger.html');
