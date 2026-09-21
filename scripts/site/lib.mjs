/**
 * Briques communes du site vitrine Mova : mise en page, icônes, FAQ, avis, données structurées.
 * Le site est du HTML statique généré (aucune dépendance) pour rester rapide et bien référencé.
 */
export const SITE = (process.env.MOVA_SITE_URL || 'https://hingantmael-gif.github.io').replace(/\/$/, '');
export const API = (process.env.AZIMUT_PROD_API_URL || 'https://azimut-auth-api.onrender.com').replace(/\/$/, '');
export const GOOGLE_VERIFY = '6yGL_C7i88c19mN5yId8YEK4FvQgf6K29fTXr1Cm_Pw';

const ICONS = {
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M6 21l3.5-5.5 3 2V22M9.5 15.5l1-5 3.5 2.5 3 0M10.5 10.5 8 8.5 5 9.5"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  watch: '<circle cx="12" cy="12" r="6"/><polyline points="12 9.5 12 12 13.6 13.4"/><path d="M16.5 16.6 16 21H8l-.5-4.4M7.5 7.4 8 3h8l.5 4.4"/>',
  chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  award: '<circle cx="12" cy="8" r="7"/><polyline points="8.2 13.9 7 23 12 20 17 23 15.8 13.9"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  drop: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".6"/><circle cx="17.5" cy="10.5" r=".6"/><circle cx="8.5" cy="7.5" r=".6"/><circle cx="6.5" cy="12.5" r=".6"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2c0-.6-.2-1-.5-1.4a2 2 0 0 1 1.5-3.4H17a5 5 0 0 0 5-5c0-4.4-4.5-8.2-10-8.2z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l-4 7.5H8l-2.5 4M12 13.5 9 6H7"/>',
  body: '<circle cx="12" cy="4.5" r="2.3"/><path d="M12 7v7M6 9.5l6 1.5 6-1.5M9 22l3-8 3 8"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  wave: '<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-2"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 14.5"/><line x1="9" y1="2" x2="15" y2="2"/>',
};

export function icon(name) {
  return `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.bolt}</svg></span>`;
}
export function rawIcon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Un téléphone avec sa capture d'écran (chargement différé, texte alternatif descriptif). */
export function phone(img, alt, cls = '', eager = false) {
  return `<div class="phone ${cls}"><img src="/site/img/${img}.webp" alt="${esc(alt)}" width="540" height="1170" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}></div>`;
}

export const NAV = [
  ['Fonctionnalités', '/apropos.html#fonctionnalites'],
  ['Captures', '/apropos.html#captures'],
  ['Disciplines', '/apropos.html#disciplines'],
  ['Outils', '/apropos.html#outils'],
  ['Avis', '/avis.html'],
  ['FAQ', '/apropos.html#faq'],
];

const FOOT_SPORTS = [
  ['Course à pied', '/application-course-a-pied.html'],
  ['Vélo', '/application-velo.html'],
  ['Natation', '/application-natation.html'],
  ['Triathlon & Ironman', '/application-triathlon.html'],
  ['Musculation', '/application-musculation.html'],
  ['Callisthénie', '/application-callisthenie.html'],
];
const FOOT_PLANS = [
  ['Plan 5 km', '/plan-entrainement-5km.html'],
  ['Plan 10 km', '/plan-entrainement-10km.html'],
  ['Plan semi-marathon', '/plan-entrainement-semi-marathon.html'],
  ['Plan marathon', '/plan-entrainement-marathon.html'],
  ['Tracker GPS course', '/tracker-gps-course.html'],
  ['Séance rapide', '/seance-rapide.html'],
];
const FOOT_TOOLS = [
  ['Calculateur de VMA', '/calculateur-vma.html'],
  ['Calculateur d’allure', '/calculateur-allure.html'],
  ['Guide : la VMA', '/guide-vma.html'],
  ['Guide : le fractionné', '/guide-fractionne.html'],
  ['Guide : la sortie longue', '/guide-sortie-longue.html'],
  ['Guide : récupération', '/guide-recuperation-sommeil.html'],
];

export function header() {
  return `<a class="skip" href="#main">Aller au contenu</a>
<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
<header class="top"><div class="wrap bar">
  <a class="brand" href="/apropos.html" aria-label="Mova — accueil du site"><img src="/icon-192.png" alt="" width="34" height="34">Mova</a>
  <nav class="main" aria-label="Navigation principale">
    ${NAV.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}
    <a class="btn primary small" href="/" style="color:#04140f">Ouvrir l’app</a>
  </nav>
  <button class="burger" aria-label="Menu" aria-expanded="false">Menu</button>
</div></header>`;
}

export function footer() {
  const col = (t, items) => `<div><h4>${t}</h4><ul>${items.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>`;
  return `<footer><div class="wrap">
  <div class="fgrid">
    <div><a class="brand" href="/apropos.html"><img src="/icon-192.png" alt="" width="34" height="34">Mova</a>
    <p style="margin-top:12px;font-size:.92rem">L’application de coaching multi-sport : plans d’entraînement personnalisés, tracker GPS, récupération et communauté. Course, vélo, natation, triathlon, musculation, callisthénie.</p></div>
    ${col('Disciplines', FOOT_SPORTS)}
    ${col('Plans & séances', FOOT_PLANS)}
    ${col('Outils & guides', FOOT_TOOLS)}
  </div>
  <div class="fgrid" style="margin-top:26px">
    ${col('Mova', [['Installer l’application', '/telecharger.html'], ['Ouvrir l’app web', '/'], ['Donner mon avis', '/avis.html'], ['Plan du site', '/plan-du-site.html']])}
    ${col('Légal', [['Confidentialité', '/privacy.html'], ['Conditions d’utilisation', '/terms.html']])}
  </div>
  <p class="copy">© ${new Date().getFullYear()} Mova. Les conseils d’entraînement sont donnés à titre indicatif : en cas de doute ou de problème de santé, consulte un professionnel.</p>
</div></footer>`;
}

export function faqBlock(items, title = 'Questions fréquentes') {
  return `<section id="faq" class="alt"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">FAQ</span><h2>${title}</h2></div>
  <div class="faq reveal">${items.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>`;
}

export function faqLd(items) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q.replace(/<[^>]+>/g, ''), acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) };
}

/** Avis : liste chargée depuis l'API (vrais avis uniquement) + formulaire de dépôt. */
export function reviewsBlock({ limit = 6, withForm = true, heading = 'Ils utilisent Mova, ils en parlent' } = {}) {
  const star = (i) => `<button type="button" aria-label="${i} étoile${i > 1 ? 's' : ''}" aria-pressed="false"><svg viewBox="0 0 24 24"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg></button>`;
  return `<section id="avis"><div class="wrap" data-reviews>
  <div class="head center reveal"><span class="eyebrow">Avis</span><h2>${heading}</h2>
  <p>Seuls les avis de vraies personnes sont publiés, avec la note qu’elles ont donnée. Toi aussi, dis-nous ce que tu en penses.</p></div>
  <div class="rating-sum" data-reviews-summary hidden></div>
  <div class="reviews" data-reviews-list><div class="empty">Chargement des avis…</div></div>
  ${withForm ? `<form class="rev reveal" novalidate>
    <h3>Donner mon avis sur Mova</h3>
    <div><span style="font-weight:700;font-size:.9rem">Ta note</span><div class="starpick" role="group" aria-label="Note de 1 à 5 étoiles">${[1, 2, 3, 4, 5].map(star).join('')}</div></div>
    <div class="row2">
      <label>Prénom ou pseudo<input name="name" maxlength="40" autocomplete="given-name" required></label>
      <label>Ville (facultatif)<input name="city" maxlength="40" autocomplete="address-level2"></label>
    </div>
    <label>Ta pratique principale
      <select name="sport"><option value="">— choisir —</option><option value="course">Course à pied</option><option value="velo">Vélo</option><option value="natation">Natation</option><option value="triathlon">Triathlon</option><option value="musculation">Musculation</option><option value="callisthenie">Callisthénie</option><option value="autre">Autre</option></select>
    </label>
    <label>Ton avis<textarea name="text" maxlength="600" placeholder="Ce que tu utilises, ce que tu aimes, ce qui pourrait être mieux…" required></textarea></label>
    <div class="count">0 / 600</div>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn primary" type="submit">Publier mon avis</button>
    <div class="msg" role="status" aria-live="polite"></div>
    <p class="note">Ton avis est public. Ni lien, ni coordonnées personnelles s’il te plaît. Un avis abusif peut être masqué.</p>
  </form>` : ''}
</div></section>
<script>window.addEventListener('load',function(){window.MovaReviews&&window.MovaReviews.init(${JSON.stringify(API)},${limit});});</script>`;
}

export function installBlock() {
  return `<section id="installer"><div class="wrap"><div class="install reveal">
  <div><span class="eyebrow">Gratuit · sans store</span><h2>Installe Mova en 10 secondes</h2>
  <p style="margin:12px 0 22px">Ouvre le site sur ton téléphone puis ajoute Mova à ton écran d’accueil : elle s’ouvre en plein écran comme une vraie application, sur iPhone comme sur Android.</p>
  <ul class="ticks"><li><b>Android :</b> menu du navigateur ⋮ → « Installer l’application ».</li><li><b>iPhone / iPad :</b> Safari → Partager → « Sur l’écran d’accueil ».</li><li><b>Ordinateur :</b> icône « Installer » dans la barre d’adresse (Chrome, Edge).</li></ul>
  <div class="cta-row" style="margin-top:22px"><a class="btn primary" href="/telecharger.html">${rawIcon('download')} Guide d’installation</a><a class="btn ghost" href="/">Ouvrir l’app web</a></div></div>
  <div><div class="qr"><img src="/qr-install.png" alt="QR code pour installer l’application Mova" width="190" height="190" loading="lazy"></div><p style="text-align:center;margin-top:12px;font-size:.88rem">Scanne avec ton téléphone</p></div>
</div></div></section>`;
}

export function ctaBanner(title = 'Prêt à démarrer ?', text = 'Crée ton compte gratuit et génère ton premier plan en quelques minutes.') {
  return `<section><div class="wrap"><div class="install reveal" style="grid-template-columns:1fr;text-align:center"><div>
  <h2>${title}</h2><p style="margin:12px auto 22px;max-width:560px">${text}</p>
  <div class="cta-row" style="justify-content:center"><a class="btn primary" href="/">Commencer gratuitement</a><a class="btn ghost" href="/telecharger.html">Installer sur mon écran d’accueil</a></div></div></div></div></section>`;
}

export function page({ slug, title, description, keywords = [], ogImage = 'accueil', body, ld = [], noindex = false, type = 'website' }) {
  const url = `${SITE}/${slug}`;
  const img = `${SITE}/site/img/${ogImage}.webp`;
  const all = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Mova', url: `${SITE}/apropos.html`, inLanguage: 'fr-FR' },
    ...ld,
  ];
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : ''}
<meta name="google-site-verification" content="${GOOGLE_VERIFY}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
<meta name="theme-color" content="#07111f">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Mova">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="/site/site.css">
${all.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
${header()}
<main id="main">
${body}
</main>
${footer()}
<script src="/site/site.js" defer></script>
</body>
</html>
`;
}

export function crumbs(items) {
  const html = `<div class="wrap"><nav class="crumbs" aria-label="Fil d’Ariane">${items.map(([l, h], i) => (i === items.length - 1 ? `<span>${l}</span>` : `<a href="${h}">${l}</a>`)).join(' › ')}</nav></div>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([l, h], i) => ({ '@type': 'ListItem', position: i + 1, name: l, item: `${SITE}${h}` })) };
  return { html, ld };
}
