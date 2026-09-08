import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_VERSION,
} from '../src/legal/azimutTerms.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const sections = TERMS_SECTIONS.map((sec) => {
  const blocks = sec.blocks
    .map((b) => {
      if (b.type === 'p') return `<p>${esc(b.text)}</p>`;
      return `<ul>${b.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`;
    })
    .join('\n');
  return `<h2>${esc(sec.title)}</h2>\n${blocks}`;
}).join('\n\n');

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conditions d’utilisation — Azimut</title>
  <meta name="google-site-verification" content="6yGL_C7i88c19mN5yId8YEK4FvQgf6K29fTXr1Cm_Pw" />
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: #f3f8f6;
      color: #0b1a16;
      line-height: 1.65;
    }
    main { max-width: 760px; margin: 0 auto; padding: 40px 20px 72px; }
    h1 { font-size: 1.85rem; margin-bottom: 8px; }
    h2 { font-size: 1.12rem; margin-top: 32px; margin-bottom: 10px; color: #0a6b54; }
    p, li { color: #3a554c; }
    ul { padding-left: 1.25em; }
    li { margin-bottom: 8px; }
    .meta { color: #6a8278; font-size: 0.92rem; margin-bottom: 20px; }
    .intro { margin-bottom: 8px; }
    a { color: #0e8f6f; }
  </style>
</head>
<body>
  <main>
    <h1>Conditions d’utilisation — Azimut</h1>
    <p class="meta">Version ${esc(TERMS_VERSION)} · Dernière mise à jour : ${esc(TERMS_LAST_UPDATED)} · Inclut la confidentialité</p>
    <p class="intro">${esc(TERMS_INTRO)}</p>
${sections}
    <p style="margin-top:36px"><a href="/apropos.html">← Présentation Azimut</a></p>
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'public', 'terms.html'), html, 'utf8');
console.log('Wrote public/terms.html —', TERMS_SECTIONS.length, 'sections');
