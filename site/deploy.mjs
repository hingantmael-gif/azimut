/**
 * Publie le SITE VITRINE Mova, séparément de l'application.
 *
 *   node site/deploy.mjs
 *
 * - génère le site dans dist-site/ (site/build.mjs) ;
 * - le pousse seul, avec son propre historique, sur le dépôt hingantmael-gif/mova-site (créé si besoin) ;
 * - active GitHub Pages sur ce dépôt.
 * Résultat : https://hingantmael-gif.github.io/mova-site/  (aucun fichier partagé avec l'application).
 *
 * Domaine propre : MOVA_SITE_URL=https://mova.fr node site/deploy.mjs (+ CNAME chez le registrar),
 * et MOVA_APP_URL pour l'adresse de l'application.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.MOVA_SITE_URL || 'https://hingantmael-gif.github.io/mova-site').replace(/\/$/, '');
const REPO = process.env.MOVA_SITE_REPO || 'hingantmael-gif/mova-site';
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', shell: true });
const quiet = (cmd) => execSync(cmd, { cwd: root, stdio: 'pipe', shell: true }).toString();

sh('node site/build.mjs');
const dist = path.join(root, 'dist-site');
const host = new URL(SITE).hostname;
if (!/github\.io$/.test(host)) fs.writeFileSync(path.join(dist, 'CNAME'), `${host}\n`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mova-site-'));
fs.cpSync(dist, tmp, { recursive: true });
sh('git init', tmp);
sh('git checkout -b main', tmp);
sh('git add -A', tmp);
sh('git -c user.email=noreply@github.com -c user.name="Mova Site Deploy" commit -m "deploy: site vitrine Mova"', tmp);

try {
  quiet(`gh repo view ${REPO}`);
} catch {
  sh(`gh repo create ${REPO} --public --description "Mova — site vitrine (indépendant de l'application)"`);
}
sh(`git remote add origin https://github.com/${REPO}.git`, tmp);
sh('git push -f origin main', tmp);

// GitHub Pages : déjà actif ? sinon on l'active sur la branche main.
try {
  quiet(`gh api repos/${REPO}/pages`);
} catch {
  try {
    sh(`gh api repos/${REPO}/pages -X POST -f "source[branch]=main" -f "source[path]=/"`);
  } catch {
    console.log('⚠ Active GitHub Pages à la main : Settings → Pages → Branch main / root.');
  }
}

console.log(`\nOK — Site vitrine : ${SITE}/`);
