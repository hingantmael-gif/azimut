/**
 * Déploie UNIQUEMENT la page d’installation (pas l’app Expo web).
 * L’app produit = APK Android natif. Le site public = cette page seule.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'install-site');
const iconSrc = path.join(root, 'assets', 'icon.png');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'azimut-install-site-'));

fs.copyFileSync(path.join(site, 'index.html'), path.join(tmp, 'index.html'));
fs.copyFileSync(iconSrc, path.join(tmp, 'icon.png'));
// Compat anciens liens
fs.copyFileSync(path.join(tmp, 'index.html'), path.join(tmp, 'get.html'));
fs.writeFileSync(
  path.join(tmp, '404.html'),
  '<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><title>Azimut</title>',
);

const sh = (cmd) => execSync(cmd, { cwd: tmp, stdio: 'inherit', shell: true });

sh('git init');
sh('git checkout -b gh-pages');
sh('git add -A');
sh('git -c user.email=noreply@github.com -c user.name="Azimut Deploy" commit -m "deploy: page install isolee (APK natif)"');
sh('git remote add origin https://github.com/hingantmael-gif/azimut.git');
sh('git push -f origin gh-pages');

console.log('\nOK — page install seule : https://hingantmael-gif.github.io/azimut/');
console.log('APK : https://github.com/hingantmael-gif/azimut/releases/latest/download/azimut.apk');
