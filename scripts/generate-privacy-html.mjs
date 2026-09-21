/**
 * Génère public/privacy.html — page statique et directement explorable (sans JavaScript), à partir du même contenu
 * que l'écran in-app Réglages → Confidentialité (src/legal/legalDocs.ts, LEGAL_DOCS.privacy).
 *
 * Sert de « Privacy Policy URL » pour Google Play Console, l'App Store et les intégrations tierces (RevenueCat,
 * Google OAuth…) : ces formulaires exigent une page HTML classique, joignable sans compte ni installation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL_DOCS, LEGAL_UPDATED, LEGAL_VERSION } from '../src/legal/legalDocs.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const doc = LEGAL_DOCS.privacy;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderBlock(b) {
  switch (b.type) {
    case 'p':
      return `<p>${esc(b.text)}</p>`;
    case 'ul':
      return `<ul>${b.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`;
    case 'steps':
      return `<ol class="steps">${b.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ol>`;
    case 'callout':
      return `<div class="callout ${esc(b.tone)}">${b.title ? `<b>${esc(b.title)}</b>` : ''}<p>${esc(b.text)}</p></div>`;
    case 'cards':
      return `<div class="cards">${b.items
        .map(
          (c) =>
            `<div class="card"><b>${esc(c.title)}</b><table>${c.lines
              .map((l) => `<tr><td>${esc(l.label)}</td><td>${esc(l.value)}</td></tr>`)
              .join('')}</table></div>`,
        )
        .join('')}</div>`;
    case 'link':
      return `<p><a href="/terms.html">${esc(b.label)} →</a></p>`;
    default:
      return '';
  }
}

const sections = doc.sections
  .map((sec) => {
    const blocks = sec.blocks.map(renderBlock).join('\n');
    return `<section id="${esc(sec.id)}"><h2>${esc(sec.title)}</h2>${sec.summary ? `<p class="summary">${esc(sec.summary)}</p>` : ''}${blocks}</section>`;
  })
  .join('\n');

const toc = doc.sections.map((sec) => `<a href="#${esc(sec.id)}">${esc(sec.title)}</a>`).join('');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(doc.title)} — Mova</title>
<meta name="description" content="${esc(doc.intro ?? doc.subtitle)}" />
<meta name="google-site-verification" content="6yGL_C7i88c19mN5yId8YEK4FvQgf6K29fTXr1Cm_Pw" />
<link rel="canonical" href="/privacy.html" />
<style>
  :root { --jade: #0b8262; --ink: #0b1a16; --muted: #4a655c; --bg: #f3f8f6; --card: #ffffff; --line: #dbe9e3; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); line-height: 1.65; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }
  h1 { font-size: 1.9rem; margin-bottom: 6px; }
  h2 { font-size: 1.15rem; margin: 34px 0 10px; color: var(--jade); scroll-margin-top: 16px; }
  p, li, td { color: var(--muted); }
  p.summary { font-weight: 700; color: var(--ink); }
  ul, ol.steps { padding-left: 1.3em; }
  li { margin-bottom: 8px; }
  .meta { color: #6a8278; font-size: 0.92rem; margin-bottom: 18px; }
  .intro { color: var(--ink); font-size: 1.02rem; }
  a { color: var(--jade); }
  .key { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; margin: 18px 0 28px; }
  .key li { color: var(--ink); }
  .toc { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 18px 0 8px; font-size: 0.86rem; }
  .toc a { text-decoration: none; }
  .callout { border-radius: 14px; padding: 14px 16px; margin: 12px 0; border: 1px solid var(--line); background: var(--card); }
  .callout.warn { border-color: #f5c76b; background: #fff8ea; }
  .callout.danger { border-color: #f2a6a6; background: #fff1f1; }
  .callout.ok { border-color: #a7ddc4; background: #eefaf4; }
  .callout.info { border-color: #a9c9e8; background: #eef4fb; }
  .callout b { display: block; margin-bottom: 4px; color: var(--ink); }
  .cards { display: grid; gap: 12px; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
  .card b { display: block; margin-bottom: 8px; color: var(--ink); }
  .card table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  .card td { padding: 3px 0; vertical-align: top; }
  .card td:first-child { width: 40%; color: var(--ink); font-weight: 600; }
  footer { margin-top: 40px; font-size: 0.85rem; }
</style>
</head>
<body>
<main>
  <h1>${esc(doc.title)}</h1>
  <p class="meta">Version ${esc(LEGAL_VERSION)} · Dernière mise à jour : ${esc(LEGAL_UPDATED)}</p>
  ${doc.intro ? `<p class="intro">${esc(doc.intro)}</p>` : ''}
  ${doc.keyPoints?.length ? `<ul class="key">${doc.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
  <nav class="toc">${toc}</nav>
  ${sections}
  <footer><a href="/terms.html">Conditions d’utilisation</a> · <a href="/apropos.html">Présentation Mova</a></footer>
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'public', 'privacy.html'), html, 'utf8');
console.log('Wrote public/privacy.html —', doc.sections.length, 'sections');
