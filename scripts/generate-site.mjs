/**
 * Génère le site vitrine Mova (HTML statique) dans public/ : page d'accueil (apropos.html), pages par discipline et
 * objectif, guides, calculateurs, avis, plan du site, sitemap.xml et robots.txt.
 *
 *   node scripts/generate-site.mjs
 *
 * Adresse publique : MOVA_SITE_URL (défaut https://hingantmael-gif.github.io). Appelé par deploy-install-site.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, SITE, crumbs, ctaBanner, esc, faqBlock, faqLd, icon, installBlock, page, phone, rawIcon, reviewsBlock } from './site/lib.mjs';
import { FAQ_HOME, GUIDES, SPORT_PAGES } from './site/content.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (name, html) => fs.writeFileSync(path.join(root, 'public', name), html);
const today = new Date().toISOString().slice(0, 10);
const urls = [];
const reg = (slug, priority = '0.7', freq = 'monthly') => urls.push({ loc: `${SITE}/${slug}`, priority, freq });

const APP_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Mova',
  alternateName: 'Mova — coaching multi-sport',
  url: `${SITE}/apropos.html`,
  applicationCategory: 'HealthApplication',
  applicationSubCategory: 'Application de course à pied, vélo, natation, triathlon, musculation',
  operatingSystem: 'Android, iOS, Web',
  inLanguage: 'fr-FR',
  description: 'Application de coaching multi-sport : plans d’entraînement personnalisés, tracker GPS avec jauge d’allure, séance rapide, récupération et communauté.',
  offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'EUR', name: 'Mova gratuit' }, { '@type': 'Offer', price: '9.99', priceCurrency: 'EUR', name: 'Mova Premium (mensuel)' }],
  screenshot: ['accueil', 'jauge-allure', 'plan-entrainement', 'seance-rapide-intensite', 'theme-aurore'].map((s) => `${SITE}/site/img/${s}.webp`),
  featureList: ['Plans d’entraînement personnalisés', 'Tracker GPS avec jauge d’allure en temps réel', 'Séance rapide : type, durée, intensité', 'Export des séances au format FIT pour montre Garmin', 'Suivi de la récupération et de la charge', 'Prédiction de chrono', 'Classement et badges', 'Personnalisation complète (Premium)'],
};
const ORG_LD = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Mova', url: `${SITE}/apropos.html`, logo: `${SITE}/icon-512.png` };

// ————————————————————— Page d'accueil du site —————————————————————
const FEATURES = [
  ['target', 'Allures calculées sur toi', 'Chrono, VMA, volume ou activités importées : Mova déduit tes zones (footing, seuil, VMA…) et les applique à chaque séance.', '/application-course-a-pied.html'],
  ['calendar', 'Plans personnalisés', '5 km, 10 km, semi, marathon, trail, vélo, natation, triathlon, Ironman, musculation : un calendrier adapté à ton niveau et à tes jours libres.', '/plan-entrainement-10km.html'],
  ['bolt', 'Séance rapide', 'Sport, type de séance, durée, intensité : ta séance prête en 10 secondes, avec contrôle de cohérence.', '/seance-rapide.html'],
  ['pin', 'Tracker GPS et jauge d’allure', 'Un demi-cercle vert et rouge et un point qui suit ton allure en direct. Départ instantané, pause auto, coach vocal.', '/tracker-gps-course.html'],
  ['watch', 'Envoi sur ta montre', 'Séances structurées au format FIT pour Garmin, et formats adaptés aux autres marques.', '/envoyer-seance-montre-garmin.html'],
  ['moon', 'Récupération & sommeil', 'Charge d’entraînement, forme, sommeil, étirements et mobilité guidés avec chronomètre.', '/guide-recuperation-sommeil.html'],
  ['trend', 'Prédiction de course', 'Estime tes chronos sur 5 km, 10 km, semi et marathon d’après tes performances.', '/calculateur-allure.html'],
  ['award', 'Rangs, badges, classement', 'De Bronze à Champion : gagne de l’XP à chaque séance, débloque des badges, défie la communauté.', '/apropos.html#fonctionnalites'],
  ['users', 'Communauté', 'Fil d’actualité, clubs, partage de séances et de programmes, athlètes certifiés.', '/apropos.html#fonctionnalites'],
  ['palette', 'Personnalisation totale', 'Premium : 12 thèmes, 20 fonds animés, couleurs libres, boutons, cartes, polices. Lisible quoi que tu choisisses.', '/apropos.html#personnalisation'],
  ['download', 'Import & export', 'Importe tes sorties GPX / TCX (Strava, Garmin…), compare le prévu et le réalisé.', '/application-course-a-pied.html'],
  ['shield', 'Données sous contrôle', 'Consentements séparés, profil privé par défaut, export de tes données et suppression du compte.', '/privacy.html'],
];

const SHOTS = [
  ['accueil', 'Accueil', 'Ta séance du jour d’un coup d’œil'],
  ['plan-entrainement', 'Plan', 'Le calendrier de ton programme'],
  ['seance-rapide-type', 'Séance rapide', 'Choisis le type de séance'],
  ['seance-rapide-intensite', 'Intensité', 'Tranquille, modérée ou intense'],
  ['jauge-allure', 'Jauge d’allure', 'Reste dans la zone verte'],
  ['tracker-gps', 'Tracker libre', 'Carte, chrono, allure, distance'],
  ['progres', 'Progrès', 'Classement, profil sportif'],
  ['recuperation', 'Récupération', 'État de forme et muscles'],
  ['prediction-course', 'Prédiction', 'Tes chronos estimés'],
  ['communaute', 'Communauté', 'Le fil de tes amis athlètes'],
  ['profil', 'Profil', 'Rang, badges, abonnés'],
  ['personnalisation', 'Personnaliser', 'Thèmes, fonds, couleurs, boutons'],
];

const LANDING_ALT = {
  accueil: 'Écran d’accueil de Mova avec la séance du jour',
  'plan-entrainement': 'Calendrier du plan d’entraînement dans Mova',
  'seance-rapide-type': 'Séance rapide : choix du type de séance de course',
  'seance-rapide-intensite': 'Séance rapide : curseur d’intensité tranquille, modérée, intense',
  'jauge-allure': 'Jauge d’allure en demi-cercle vert et rouge du tracker GPS',
  'tracker-gps': 'Tracker GPS libre avec carte, chrono, allure et distance',
  progres: 'Écran progrès avec classement et profil sportif',
  recuperation: 'Suivi de la récupération et de l’état de forme',
  'prediction-course': 'Prédiction de chrono sur 5 km, 10 km, semi et marathon',
  communaute: 'Fil social de la communauté Mova',
  profil: 'Profil athlète avec rang, badges et abonnés',
  personnalisation: 'Écran de personnalisation de l’application (thèmes, fonds, couleurs)',
};

const DISCIPLINES = [
  ['run', 'Course à pied', '5 km, 10 km, semi, marathon, trail. Fractionné, seuil, sortie longue.', '/application-course-a-pied.html'],
  ['bike', 'Vélo', 'Séances en watts calées sur ta FTP, sorties longues, intervalles.', '/application-velo.html'],
  ['drop', 'Natation', 'Endurance et séries de 100 m avec repos courts.', '/application-natation.html'],
  ['layers', 'Triathlon & Ironman', 'Trois sports dans un seul calendrier, du sprint au 140.6.', '/application-triathlon.html'],
  ['dumbbell', 'Musculation', 'Corps entier, haut, bas ou muscles ciblés, avec ton matériel.', '/application-musculation.html'],
  ['body', 'Callisthénie', 'Pompes, tractions, dips, gainage : tout au poids du corps.', '/application-callisthenie.html'],
];

const USE_CASES = [
  ['Tu débutes la course', 'Tu veux courir 5 km sans t’arrêter : un plan progressif, des séances courtes et des allures faciles.'],
  ['Tu prépares un 10 km ou un semi', 'Sorties longues, seuil et fractionné calés sur ton chrono, avec la jauge d’allure pour rester dans la zone.'],
  ['Tu vises un marathon', 'Périodisation, semaines d’allègement, affûtage et suivi de la charge pour arriver frais.'],
  ['Tu fais du triathlon', 'Natation, vélo et course dans un même calendrier, avec une charge globale maîtrisée.'],
  ['Tu manques de temps', 'Séance rapide : 20, 30 ou 45 minutes, choisis l’intensité, c’est prêt.'],
  ['Tu t’entraînes à la maison', 'Callisthénie et musculation au poids du corps, aux haltères ou aux élastiques, avec repos guidés.'],
];

const landing = `
<section class="hero"><div class="wrap"><div class="grid">
  <div>
    <span class="eyebrow">Coaching multi-sport · Gratuit</span>
    <h1>Ton coach de <em>course à pied, vélo, natation</em> et musculation</h1>
    <p class="lead">Mova génère ton plan d’entraînement personnalisé, règle tes allures sur ton vrai niveau, te guide en direct avec le tracker GPS et suit ta récupération. Une seule application pour tous tes sports.</p>
    <div class="cta-row"><a class="btn primary" href="/">${rawIcon('bolt')} Commencer gratuitement</a><a class="btn ghost" href="#captures">Voir l’application</a></div>
    <div class="pills"><span class="pill">Plans 5 km · 10 km · semi · marathon</span><span class="pill">Triathlon & Ironman</span><span class="pill">Tracker GPS</span><span class="pill">iPhone & Android</span></div>
  </div>
  <div class="hero-shots" aria-hidden="false">
    ${phone('seance-rapide-intensite', LANDING_ALT['seance-rapide-intensite'], 'p1')}
    ${phone('accueil', LANDING_ALT.accueil, 'p2', true)}
    ${phone('jauge-allure', LANDING_ALT['jauge-allure'], 'p3')}
  </div>
</div>
<div class="stats reveal">
  <div class="stat"><b data-count="7">7</b><span>disciplines couvertes</span></div>
  <div class="stat"><b data-count="4">4</b><span>plans : 5 km, 10 km, semi, marathon</span></div>
  <div class="stat"><b data-count="20">20</b><span>fonds animés (Premium)</span></div>
  <div class="stat"><b data-count="12">12</b><span>thèmes de couleurs (Premium)</span></div>
</div></div></section>

<section id="fonctionnalites" class="alt"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Fonctionnalités</span><h2>Tout ce qu’il faut pour progresser, dans une seule application</h2>
  <p>Plan d’entraînement, tracker GPS, séance rapide, récupération, prédiction de chrono, communauté : chaque outil est pensé pour te faire gagner du temps et te garder motivé.</p></div>
  <div class="cards">${FEATURES.map(([i, t, d, h]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p><a class="more" href="${h}">En savoir plus →</a></article>`).join('')}</div>
</div></section>

<section id="captures"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Captures d’écran</span><h2>L’application en images</h2><p>Des vraies captures de Mova : de l’accueil au tracker GPS, du plan d’entraînement à la personnalisation.</p></div>
  <div class="gallery reveal" role="list">${SHOTS.map(([img, t, d]) => `<figure role="listitem">${phone(img, LANDING_ALT[img])}<figcaption><b>${t}</b>${d}</figcaption></figure>`).join('')}</div>
</div></section>

<section class="alt"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Comment ça marche</span><h2>De zéro au premier kilomètre en 3 étapes</h2></div>
  <div class="steps">
    <div class="step reveal"><h3>Dis-nous qui tu es</h3><p>Sport, objectif, niveau, jours disponibles, et si tu les connais : chrono, VMA ou FTP.</p></div>
    <div class="step reveal"><h3>Reçois ton plan</h3><p>Un calendrier de séances détaillées : échauffement, corps de séance, retour au calme, avec les allures de chaque étape.</p></div>
    <div class="step reveal"><h3>Lance-toi, ajuste</h3><p>Démarre le tracker GPS, suis la jauge d’allure, puis compare le prévu et le réalisé. Le plan se met à jour avec toi.</p></div>
  </div>
</div></section>

<section><div class="wrap split">
  <div class="reveal"><span class="eyebrow">Séance rapide</span><h2>Une séance sur mesure, en 4 touches</h2>
  <p style="margin-top:12px">Le sport, le type de séance, la durée, l’intensité. C’est toi qui décides ; Mova calcule le reste avec tes allures.</p>
  <ul class="ticks"><li><b>Course :</b> footing, sortie longue, fractionné, seuil / tempo.</li><li><b>Contrôle de cohérence :</b> une sortie longue en 20 minutes ? Mova te le dit.</li><li><b>Trois intensités :</b> tranquille, modérée, ou dans le rouge.</li><li><b>Étape facultative :</b> complète ta VMA ou ton chrono pour des allures justes.</li></ul>
  <div class="cta-row" style="margin-top:22px"><a class="btn ghost" href="/seance-rapide.html">Découvrir la séance rapide</a></div></div>
  <div class="media reveal">${phone('seance-rapide-type', LANDING_ALT['seance-rapide-type'])}${phone('seance-rapide-intensite', LANDING_ALT['seance-rapide-intensite'])}</div>
</div></section>

<section class="alt"><div class="wrap split rev">
  <div class="reveal"><span class="eyebrow">Tracker GPS</span><h2>Une jauge qui te dit si tu es dans la zone</h2>
  <p style="margin-top:12px">Un demi-cercle en trois parties : vert au centre, rouge de chaque côté. Le point suit ton allure seconde après seconde. Tu n’as plus à regarder ta montre pour savoir si tu accélères trop tôt.</p>
  <ul class="ticks"><li><b>Allure visée en grand :</b> 4:01 /km, lisible d’un coup d’œil.</li><li><b>Étapes claires :</b> « Échauffement 12 minutes à 6:16 ».</li><li><b>Départ instantané</b> et détection automatique de la localisation.</li><li><b>Pause automatique</b> et coach vocal.</li></ul>
  <div class="cta-row" style="margin-top:22px"><a class="btn ghost" href="/tracker-gps-course.html">Voir le tracker GPS</a></div></div>
  <div class="media reveal">${phone('jauge-allure', LANDING_ALT['jauge-allure'])}${phone('tracker-gps', LANDING_ALT['tracker-gps'])}</div>
</div></section>

<section id="disciplines"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Disciplines</span><h2>Une application, tous tes sports</h2><p>Que tu coures, pédales, nages ou soulèves de la fonte, Mova te propose des séances pensées pour ta discipline.</p></div>
  <div class="cards">${DISCIPLINES.map(([i, t, d, h]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p><a class="more" href="${h}">Voir la discipline →</a></article>`).join('')}</div>
</div></section>

<section id="personnalisation" class="alt"><div class="wrap split">
  <div class="media reveal">${phone('theme-aurore', 'Mova personnalisé avec le thème Aurore rose')}${phone('theme-nuit', 'Mova en mode sombre avec le thème Néon et fond en grille')}</div>
  <div class="reveal"><span class="eyebrow">Premium · Personnalisation</span><h2>Fais de Mova ton application</h2>
  <p style="margin-top:12px">Comme sur ta montre, tout se personnalise : le fond d’écran, les couleurs, les boutons, les cartes, la police. Et ça reste lisible : le texte passe automatiquement en noir ou en blanc selon tes couleurs.</p>
  <ul class="ticks"><li><b>12 thèmes</b> prêts à l’emploi : Aurore rose, Océan, Coucher de soleil, Forêt, Néon, Minuit…</li><li><b>20 fonds animés</b> : aurore boréale, vagues, étoiles, pluie fine, rayons, grille, dunes…</li><li><b>Couleurs libres :</b> palette, curseur de teinte ou code hexadécimal.</li><li><b>Boutons :</b> dégradé, uni, contour ou verre ; arrondi, pilule ou carré ; effet au toucher.</li><li>Sans personnalisation, tu gardes l’application standard.</li></ul></div>
</div></section>

<section id="outils"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Outils gratuits</span><h2>Calculateurs et guides pour t’entraîner malin</h2><p>Des outils utilisables tout de suite, sans compte, et des guides pour comprendre ce que tu fais.</p></div>
  <div class="cards four">
    <a class="card reveal" href="/calculateur-vma.html" style="text-decoration:none">${icon('timer')}<h3>Calculateur de VMA</h3><p>Test de Cooper, demi-Cooper ou chrono : obtiens ta VMA et tes zones.</p></a>
    <a class="card reveal" href="/calculateur-allure.html" style="text-decoration:none">${icon('trend')}<h3>Calculateur d’allure</h3><p>Allure, vitesse et prédictions de chrono sur 5 km, 10 km, semi, marathon.</p></a>
    <a class="card reveal" href="/guide-vma.html" style="text-decoration:none">${icon('target')}<h3>Guide : la VMA</h3><p>Définition, tests et utilisation dans tes séances.</p></a>
    <a class="card reveal" href="/guide-fractionne.html" style="text-decoration:none">${icon('bolt')}<h3>Guide : le fractionné</h3><p>30/30, 400 m, 1 000 m, seuil : les séances qui font progresser.</p></a>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Pour qui ?</span><h2>Mova s’adapte à ta situation</h2><p>Quelques exemples de profils pour lesquels l’application est pensée.</p></div>
  <div class="cards">${USE_CASES.map(([t, d]) => `<article class="card reveal"><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
</div></section>

<section><div class="wrap">
  <div class="head center reveal"><span class="eyebrow">Gratuit ou Premium</span><h2>L’essentiel est gratuit</h2></div>
  <div class="tablewrap reveal"><table><thead><tr><th>Fonction</th><th>Gratuit</th><th>Premium</th></tr></thead><tbody>
    <tr><td>Programme personnalisé, tracker GPS, séance rapide</td><td class="y">✓</td><td class="y">✓</td></tr>
    <tr><td>Récupération, prédiction de chrono, classement, badges</td><td class="y">✓</td><td class="y">✓</td></tr>
    <tr><td>Programmes actifs en même temps</td><td>1</td><td class="y">Plusieurs</td></tr>
    <tr><td>Imports d’activités par mois</td><td>5</td><td class="y">Illimité</td></tr>
    <tr><td>Envois vers ta montre par mois</td><td>3</td><td class="y">Illimité</td></tr>
    <tr><td>Clubs rejoints</td><td>1</td><td class="y">Plusieurs</td></tr>
    <tr><td>Personnalisation complète (thèmes, fonds, couleurs, boutons, polices)</td><td>—</td><td class="y">✓</td></tr>
  </tbody></table></div>
  <p class="note" style="margin-top:12px;text-align:center">Premium : 9,99 € par mois ou 59,99 € par an, 7 jours d’essai. Sans engagement, à gérer depuis ton compte.</p>
</div></section>

${reviewsBlock({ limit: 6 })}

${faqBlock(FAQ_HOME)}

${installBlock()}
`;

out(
  'apropos.html',
  page({
    slug: 'apropos.html',
    title: 'Mova — Application de coaching multi-sport : course, vélo, natation, triathlon',
    description: 'Mova génère ton plan d’entraînement personnalisé (5 km, 10 km, semi, marathon, triathlon, musculation), règle tes allures, te guide avec un tracker GPS et suit ta récupération. Gratuit, sur iPhone et Android.',
    keywords: ['application course à pied', 'plan d’entraînement running', 'coach sportif application', 'application triathlon', 'entraînement vélo watts', 'application natation', 'plan marathon', 'plan 10 km', 'calcul VMA', 'tracker GPS running', 'séance de sport rapide', 'musculation callisthénie', 'coaching multi-sport', 'application sport gratuite', 'Mova'],
    body: landing,
    ld: [APP_LD, ORG_LD, faqLd(FAQ_HOME)],
  }),
);
reg('apropos.html', '1.0', 'weekly');

// ————————————————————— Pages discipline / objectif —————————————————————
for (const p of SPORT_PAGES) {
  const bc = crumbs([['Accueil', '/apropos.html'], [p.crumb, `/${p.slug}`]]);
  const body = `${bc.html}
<section class="hero" style="padding-top:34px"><div class="wrap"><div class="grid">
  <div><span class="eyebrow">${p.kicker}</span><h1>${p.h1}</h1><p class="lead">${p.lead}</p>
  <div class="cta-row"><a class="btn primary" href="/">Commencer gratuitement</a><a class="btn ghost" href="/telecharger.html">Installer l’application</a></div></div>
  <div class="hero-shots">${phone(p.img[1], p.alts[1], 'p1')}${phone(p.img[0], p.alts[0], 'p2', true)}${phone(p.img[2], p.alts[2], 'p3')}</div>
</div></div></section>
<section class="alt"><div class="wrap"><div class="head reveal"><h2>Ce que Mova fait pour toi</h2></div>
  <div class="cards">${p.cards.map(([i, t, d]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join('')}</div></div></section>
<section><div class="wrap split"><div class="reveal"><h2>En pratique</h2><ul class="ticks">${p.points.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  <div class="steps" style="grid-template-columns:1fr">${p.steps.map(([t, d]) => `<div class="step reveal"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
${faqBlock(p.faq, 'Questions sur ce sujet')}
<section><div class="wrap"><h3>À découvrir aussi</h3><div class="related">${p.related.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</div></div></section>
${ctaBanner()}`;
  out(p.slug, page({ slug: p.slug, title: p.title, description: p.description, keywords: p.keywords, ogImage: p.img[0], body, ld: [bc.ld, faqLd(p.faq), { ...APP_LD, url: `${SITE}/${p.slug}` }] }));
  reg(p.slug, '0.8');
}

// ————————————————————— Guides —————————————————————
for (const g of GUIDES) {
  const bc = crumbs([['Accueil', '/apropos.html'], ['Guides', '/apropos.html#outils'], [g.crumb, `/${g.slug}`]]);
  const body = `${bc.html}
<article class="wrap" style="padding-top:26px;padding-bottom:30px"><span class="eyebrow">Guide d’entraînement</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">${g.h1}</h1>
<div class="prose" style="margin-top:22px">${g.body}</div>
<h3 style="margin-top:34px">Pour aller plus loin</h3><div class="related">${g.related.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</div>
<p class="note" style="margin-top:26px">Ces informations sont générales et ne remplacent pas l’avis d’un professionnel de santé ou d’un entraîneur.</p></article>
${ctaBanner('Mets-le en pratique avec Mova', 'Génère un plan adapté à ton niveau et suis chaque séance avec le tracker GPS.')}`;
  out(g.slug, page({ slug: g.slug, title: g.title, description: g.description, keywords: g.keywords, body, type: 'article', ld: [bc.ld, { '@context': 'https://schema.org', '@type': 'Article', headline: g.h1.replace(/<[^>]+>/g, ''), description: g.description, inLanguage: 'fr-FR', dateModified: today, author: { '@type': 'Organization', name: 'Mova' }, publisher: { '@type': 'Organization', name: 'Mova', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } }, mainEntityOfPage: `${SITE}/${g.slug}` }] }));
  reg(g.slug, '0.7');
}

// ————————————————————— Calculateurs —————————————————————
const TOOL_JS_VMA = `
(function(){
  var $=function(id){return document.getElementById(id)};
  function fmt(s){s=Math.round(s);var m=Math.floor(s/60);return m+':'+String(s%60).padStart(2,'0');}
  function parseT(v){v=(v||'').trim().replace('h',':').replace("'",':').replace('m',':');var p=v.split(':').map(Number);if(p.some(isNaN)||!p.length)return null;var s=0;for(var i=0;i<p.length;i++)s=s*60+p[i];return s>0?s:null;}
  function calc(){
    var mode=$('mode').value,v=$('val').value.replace(',','.'),vma=null;
    $('hint').textContent=mode==='c12'?'Distance parcourue en 12 minutes, en mètres (ex. 3000)':mode==='c6'?'Distance parcourue en 6 minutes, en mètres (ex. 1600)':'Ton chrono (ex. 24:30 ou 1:44:00)';
    if(mode==='c12'){var d=parseFloat(v);if(d>0)vma=d/200;}
    else if(mode==='c6'){var d6=parseFloat(v);if(d6>0)vma=d6/100;}
    else{var t=parseT(v);var km=mode==='r5'?5:10;if(t){var speed=km/(t/3600);vma=speed/(mode==='r5'?0.93:0.9);}}
    if(!vma||vma<6||vma>30){$('out').hidden=true;return;}
    $('out').hidden=false;$('vma').textContent=vma.toFixed(1).replace('.',',')+' km/h';
    var Z=[['Récupération',0.60,0.65],['Endurance fondamentale (footing)',0.65,0.75],['Allure marathon',0.75,0.80],['Seuil',0.85,0.90],['Allure 10 km',0.88,0.92],['VMA (fractionné)',0.95,1.05]];
    $('zones').innerHTML=Z.map(function(z){var a=vma*z[1],b=vma*z[2];return '<tr><td>'+z[0]+'</td><td>'+Math.round(z[1]*100)+' – '+Math.round(z[2]*100)+' %</td><td>'+a.toFixed(1).replace('.',',')+' – '+b.toFixed(1).replace('.',',')+' km/h</td><td>'+fmt(3600/b)+' – '+fmt(3600/a)+' /km</td></tr>';}).join('');
  }
  ['mode','val'].forEach(function(id){$(id).addEventListener('input',calc);});calc();
})();`;

const vmaBody = (() => {
  const bc = crumbs([['Accueil', '/apropos.html'], ['Outils', '/apropos.html#outils'], ['Calculateur de VMA', '/calculateur-vma.html']]);
  const html = `${bc.html}
<section class="wrap" style="padding-top:26px"><span class="eyebrow">Outil gratuit</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Calculateur de <em style="font-style:normal;color:var(--mint)">VMA</em> et zones d’entraînement</h1>
<p class="lead" style="margin:14px 0 26px;max-width:680px">Calcule ta vitesse maximale aérobie avec le test de Cooper (12 minutes), le demi-Cooper (6 minutes) ou un chrono sur 5 ou 10 km, puis obtiens tes allures d’entraînement.</p>
<div class="tool"><div class="fields">
  <label>Méthode<select id="mode"><option value="c12">Test de Cooper (12 min)</option><option value="c6">Demi-Cooper (6 min)</option><option value="r5">Chrono sur 5 km (estimation)</option><option value="r10">Chrono sur 10 km (estimation)</option></select></label>
  <label>Ta valeur<input id="val" inputmode="decimal" value="3000" autocomplete="off"><span class="note" id="hint"></span></label>
</div>
<div class="result" id="out"><div><span class="note">Ta VMA estimée</span><div class="big-num" id="vma">—</div></div>
<div class="tablewrap"><table><thead><tr><th>Zone</th><th>% VMA</th><th>Vitesse</th><th>Allure</th></tr></thead><tbody id="zones"></tbody></table></div>
<p class="note">Valeurs indicatives : elles varient selon les personnes et les méthodes. Un test bien mené vaut mieux qu’une estimation à partir d’un chrono.</p></div></div>
<div class="prose" style="margin-top:34px"><h2>Comment utiliser sa VMA ?</h2><p>Une fois ta VMA connue, tes séances de fractionné se calculent facilement : 30/30 à 100 % de la VMA, 400 m à 95–100 %, footing à 65–75 %. Lis notre <a href="/guide-vma.html">guide complet de la VMA</a> et celui du <a href="/guide-fractionne.html">fractionné</a>.</p></div></section>
<script>${TOOL_JS_VMA}</script>
${ctaBanner('Laisse Mova calculer toutes tes allures', 'Renseigne ta VMA ou un chrono : les séances de ton plan se recalculent automatiquement.')}`;
  return { html, ld: bc.ld };
})();
out('calculateur-vma.html', page({ slug: 'calculateur-vma.html', title: 'Calculateur de VMA gratuit : test de Cooper et zones d’allure | Mova', description: 'Calcule ta VMA (vitesse maximale aérobie) avec le test de Cooper, le demi-Cooper ou un chrono 5 / 10 km. Obtiens tes zones d’entraînement : footing, seuil, allure 10 km, VMA.', keywords: ['calculateur VMA', 'calcul VMA', 'test de Cooper', 'VMA en km/h', 'zones entraînement course', 'allure footing', 'VMA 5 km'], body: vmaBody.html, ld: [vmaBody.ld, { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Calculateur de VMA Mova', applicationCategory: 'HealthApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: `${SITE}/calculateur-vma.html` }] }));
reg('calculateur-vma.html', '0.8');

const TOOL_JS_PACE = `
(function(){
  var $=function(id){return document.getElementById(id)};
  function fmt(s){s=Math.round(s);var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(r).padStart(2,'0');}
  function pace(s){s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function calc(){
    var d=parseFloat($('dist').value.replace(',','.'));
    var t=(parseInt($('h').value)||0)*3600+(parseInt($('m').value)||0)*60+(parseInt($('s').value)||0);
    if(!(d>0)||!(t>0)){$('out').hidden=true;return;}
    $('out').hidden=false;
    var p=t/d;$('pace').textContent=pace(p)+' /km';$('speed').textContent=(d/(t/3600)).toFixed(2).replace('.',',')+' km/h';
    var R=[['5 km',5],['10 km',10],['Semi-marathon',21.0975],['Marathon',42.195]];
    $('pred').innerHTML=R.map(function(r){var T=t*Math.pow(r[1]/d,1.06);return '<tr><td>'+r[0]+'</td><td>'+fmt(T)+'</td><td>'+pace(T/r[1])+' /km</td></tr>';}).join('');
  }
  $('preset').addEventListener('change',function(){if(this.value)$('dist').value=this.value;calc();});
  ['dist','h','m','s'].forEach(function(id){$(id).addEventListener('input',calc);});calc();
})();`;

const paceBody = (() => {
  const bc = crumbs([['Accueil', '/apropos.html'], ['Outils', '/apropos.html#outils'], ['Calculateur d’allure', '/calculateur-allure.html']]);
  const html = `${bc.html}
<section class="wrap" style="padding-top:26px"><span class="eyebrow">Outil gratuit</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Calculateur d’<em style="font-style:normal;color:var(--mint)">allure</em> et prédiction de chrono</h1>
<p class="lead" style="margin:14px 0 26px;max-width:680px">Entre une distance et un temps : obtiens ton allure au kilomètre, ta vitesse en km/h et une estimation de tes temps sur 5 km, 10 km, semi-marathon et marathon.</p>
<div class="tool"><div class="fields">
  <label>Distance courue<select id="preset"><option value="">Personnalisée</option><option value="5" selected>5 km</option><option value="10">10 km</option><option value="21.0975">Semi-marathon</option><option value="42.195">Marathon</option></select></label>
  <label>Distance (km)<input id="dist" inputmode="decimal" value="5"></label>
  <label>Heures<input id="h" inputmode="numeric" value="0"></label>
  <label>Minutes<input id="m" inputmode="numeric" value="25"></label>
  <label>Secondes<input id="s" inputmode="numeric" value="0"></label>
</div>
<div class="result" id="out"><div class="kpis"><div class="kpi"><b id="pace">—</b><span>Allure</span></div><div class="kpi"><b id="speed">—</b><span>Vitesse</span></div></div>
<div class="tablewrap"><table><thead><tr><th>Distance</th><th>Temps estimé</th><th>Allure</th></tr></thead><tbody id="pred"></tbody></table></div>
<p class="note">Estimation par la formule de Riegel (temps × (distance ÷ distance de référence)^1,06). C’est une projection : l’entraînement spécifique, le parcours et la météo changent le résultat.</p></div></div>
<div class="prose" style="margin-top:34px"><h2>Quelle allure pour quel objectif ?</h2><ul><li><strong>10 km en 50 minutes :</strong> 5:00 /km.</li><li><strong>Semi en 1 h 45 :</strong> 4:58 /km.</li><li><strong>Marathon en 4 heures :</strong> 5:41 /km.</li></ul><p>Pour en savoir plus, consulte nos plans <a href="/plan-entrainement-10km.html">10 km</a>, <a href="/plan-entrainement-semi-marathon.html">semi-marathon</a> et <a href="/plan-entrainement-marathon.html">marathon</a>.</p></div></section>
<script>${TOOL_JS_PACE}</script>
${ctaBanner('Un plan calé sur tes allures', 'Mova transforme ton chrono en plan d’entraînement complet.')}`;
  return { html, ld: bc.ld };
})();
out('calculateur-allure.html', page({ slug: 'calculateur-allure.html', title: 'Calculateur d’allure running : allure, vitesse, prédiction chrono | Mova', description: 'Calcule ton allure au kilomètre, ta vitesse et prédis tes temps sur 5 km, 10 km, semi-marathon et marathon. Convertisseur allure ↔ vitesse gratuit.', keywords: ['calculateur allure', 'calcul allure course à pied', 'convertisseur allure vitesse', 'prédiction chrono', 'temps marathon', 'allure 10 km', 'formule de Riegel'], body: paceBody.html, ld: [paceBody.ld, { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Calculateur d’allure Mova', applicationCategory: 'HealthApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: `${SITE}/calculateur-allure.html` }] }));
reg('calculateur-allure.html', '0.8');

// ————————————————————— Avis —————————————————————
{
  const bc = crumbs([['Accueil', '/apropos.html'], ['Avis', '/avis.html']]);
  const body = `${bc.html}
<section class="wrap" style="padding-top:26px;padding-bottom:0"><span class="eyebrow">Avis des utilisateurs</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Ce que les sportifs disent de <em style="font-style:normal;color:var(--mint)">Mova</em></h1>
<p class="lead" style="margin:14px 0 0;max-width:680px">Des avis de vraies personnes, publiés tels quels avec la note qu’elles ont choisie, de 1 à 5 étoiles. Tu utilises Mova ? Dis-nous ce que tu en penses : c’est ce qui nous aide à l’améliorer.</p></section>
${reviewsBlock({ limit: 50, heading: 'Les avis' })}
${installBlock()}`;
  out('avis.html', page({ slug: 'avis.html', title: 'Avis Mova : ce que pensent les utilisateurs de l’application', description: 'Lis les avis des utilisateurs de Mova, l’application de coaching multi-sport, et donne le tien. Notes de 1 à 5 étoiles, publiées sans filtre.', keywords: ['avis Mova', 'Mova application avis', 'avis application course à pied', 'application running avis', 'test application coaching sportif'], body, ld: [bc.ld] }));
  reg('avis.html', '0.7', 'daily');
}

// ————————————————————— Plan du site —————————————————————
{
  const groups = [
    ['Mova', [['Accueil du site', '/apropos.html'], ['Avis', '/avis.html'], ['Installer l’application', '/telecharger.html'], ['Ouvrir l’application web', '/']]],
    ['Disciplines & plans', SPORT_PAGES.map((p) => [p.crumb, `/${p.slug}`])],
    ['Outils & guides', [['Calculateur de VMA', '/calculateur-vma.html'], ['Calculateur d’allure', '/calculateur-allure.html'], ...GUIDES.map((g) => [g.crumb, `/${g.slug}`])]],
    ['Légal', [['Politique de confidentialité', '/privacy.html'], ['Conditions d’utilisation', '/terms.html']]],
  ];
  const body = `<section class="wrap" style="padding-top:40px"><h1 style="font-size:clamp(2rem,4.6vw,3rem)">Plan du site</h1>
<div class="cards" style="margin-top:26px">${groups.map(([t, l]) => `<div class="card"><h3>${t}</h3><ul class="ticks" style="margin-top:12px">${l.map(([n, h]) => `<li><a href="${h}">${n}</a></li>`).join('')}</ul></div>`).join('')}</div></section>`;
  out('plan-du-site.html', page({ slug: 'plan-du-site.html', title: 'Plan du site Mova', description: 'Toutes les pages du site Mova : disciplines, plans d’entraînement, calculateurs, guides, avis, installation.', body }));
  reg('plan-du-site.html', '0.3', 'monthly');
}

// ————————————————————— sitemap / robots —————————————————————
reg('telecharger.html', '0.6');
reg('privacy.html', '0.3', 'yearly');
reg('terms.html', '0.3', 'yearly');
fs.writeFileSync(
  path.join(root, 'public', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(root, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /settings/\nDisallow: /session/\nDisallow: /user/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Site vitrine : ${urls.length} pages générées (${SITE}) — API avis : ${API}`);
void esc;
