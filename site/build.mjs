/**
 * Génère le site vitrine Mova (HTML statique) dans public/ : page d'accueil (apropos.html), pages par discipline et
 * objectif, fonctionnalités, tarifs, personnalisation, outils, guides, glossaire, nouveautés, avis, plan du site,
 * sitemap.xml et robots.txt. Ressources (CSS / JS / images) minifiées et hachées dans public/site/a/.
 *
 *   node scripts/generate-site.mjs
 *
 * Adresse publique : MOVA_SITE_URL (défaut https://hingantmael-gif.github.io). Appelé par deploy-install-site.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, HOME, OUT, SITE, asset, buildAssets, crumbs, ctaBanner, faqBlock, faqLd, icon, installBlock, page, phone, rawIcon, reviewsBlock, squeeze } from './lib.mjs';
import { FAQ_HOME, GUIDES, SPORT_PAGES } from './content.mjs';
import { BACKGROUNDS, GLOSSARY, MORE_GUIDES, NEWS, THEMES } from './content2.mjs';

const OUTDIR = OUT;
const out = (name, html) => {
  // Le serveur de développement peut verrouiller un fichier quelques instants (Windows) : on réessaie.
  for (let i = 0; i < 8; i++) {
    try {
      fs.writeFileSync(path.join(OUTDIR, name), html);
      return;
    } catch (e) {
      if (i === 7) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
    }
  }
};
const today = new Date().toISOString().slice(0, 10);
const urls = [];
const reg = (slug, priority = '0.7', freq = 'monthly') => urls.push({ loc: slug === 'index.html' ? HOME : `${SITE}/${slug}`, priority, freq });
const ALL_GUIDES = [...GUIDES, ...MORE_GUIDES];

await buildAssets();

const APP_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Mova',
  alternateName: 'Mova — coaching multi-sport',
  url: HOME,
  applicationCategory: 'HealthApplication',
  applicationSubCategory: 'Application de course à pied, vélo, natation, triathlon, musculation',
  operatingSystem: 'Android, iOS, Web',
  inLanguage: 'fr-FR',
  description: 'Application de coaching multi-sport : plans d’entraînement personnalisés, tracker GPS avec jauge d’allure, séance rapide, récupération et communauté.',
  offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'EUR', name: 'Mova gratuit' }, { '@type': 'Offer', price: '9.99', priceCurrency: 'EUR', name: 'Mova Premium (mensuel)' }],
  screenshot: ['accueil', 'jauge-allure', 'plan-entrainement', 'seance-rapide-intensite', 'theme-aurore'].map((s) => `${SITE}${asset(`img:${s}`)}`),
  featureList: ['Plans d’entraînement personnalisés', 'Tracker GPS avec jauge d’allure en temps réel', 'Séance rapide : type, durée, intensité', 'Export des séances au format FIT pour montre Garmin', 'Suivi de la récupération et de la charge', 'Prédiction de chrono', 'Classement et badges', 'Personnalisation complète (Premium)'],
};
const ORG_LD = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Mova', url: HOME, logo: `${SITE}/icon-512.png` };

const ALT = {
  accueil: 'Écran d’accueil de Mova avec la séance du jour',
  'plan-entrainement': 'Calendrier du plan d’entraînement dans Mova',
  'seance-rapide-sport': 'Séance rapide : choix du sport',
  'seance-rapide-type': 'Séance rapide : choix du type de séance de course',
  'seance-rapide-duree': 'Séance rapide : réglage de la durée avec le curseur',
  'seance-rapide-intensite': 'Séance rapide : curseur d’intensité tranquille, modérée, intense',
  'jauge-allure': 'Jauge d’allure en demi-cercle vert et rouge du tracker GPS',
  'tracker-gps': 'Tracker GPS libre avec carte, chrono, allure et distance',
  progres: 'Écran progrès avec classement et profil sportif',
  recuperation: 'Suivi de la récupération et de l’état de forme',
  'seances-recuperation': 'Séances de récupération guidées : étirements, mobilité, foam rolling',
  'prediction-course': 'Prédiction de chrono sur 5 km, 10 km, semi et marathon',
  communaute: 'Fil social de la communauté Mova',
  profil: 'Profil athlète avec rang, badges et abonnés',
  personnalisation: 'Écran de personnalisation de l’application (thèmes, fonds, couleurs)',
  'theme-aurore': 'Mova avec le thème Aurore rose, boutons en pilule et fond aurore boréale',
  'theme-ocean': 'Mova avec le thème Océan, cartes en verre et fond vagues',
  'theme-sunset': 'Mova avec le thème Coucher de soleil et fond dunes',
  'theme-nuit': 'Mova en mode sombre avec le thème Néon et fond en grille',
};
const A = (k) => ALT[k];

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

const trust = (items) => `<div class="trust">${items.map((t) => `<span>${rawIcon('check')} ${t}</span>`).join('')}</div>`;
const li = (arr, cls) => arr.map((t) => `<li>${rawIcon(cls === 'bad' ? 'x' : 'check')}<span>${t}</span></li>`).join('');

function pricingBlock(withHead = true) {
  return `<section id="tarifs"><div class="wrap">
${withHead ? '<div class="head center reveal"><span class="eyebrow">Tarifs</span><h2>L’essentiel est gratuit. Le reste est en option.</h2><p>Commence gratuitement, sans carte bancaire. Passe Premium seulement si tu en as besoin.</p></div>' : ''}
<div class="price">
<div class="plan reveal"><h3>Gratuit</h3><div class="amount">0 €<small> pour toujours</small></div>
<ul class="ticks"><li>Programme personnalisé et tracker GPS</li><li>Séance rapide (course, vélo, natation, musculation, callisthénie)</li><li>Récupération, prédiction de chrono, classement, badges</li><li>1 programme actif · 5 imports et 3 envois montre par mois · 1 club</li></ul>
<a class="btn ghost" href="/">Commencer gratuitement</a></div>
<div class="plan hot reveal"><span class="tag">Le plus complet</span><h3>Premium</h3><div class="amount">59,99 €<small> par an</small></div><p class="note">ou 9,99 € par mois · 7 jours d’essai</p>
<ul class="ticks"><li><b>Personnalisation complète :</b> 12 thèmes, 20 fonds animés, couleurs, boutons, polices</li><li>Plusieurs programmes en même temps</li><li>Imports et envois vers la montre illimités</li><li>Plusieurs clubs</li></ul>
<a class="btn primary" href="/settings/subscription">Essayer Premium 7 jours</a></div>
</div>
<p class="note" style="text-align:center;margin-top:16px">Sans engagement · résiliable à tout moment depuis ton compte ou le store · tarifs TTC indicatifs</p>
</div></section>`;
}

// ————————————————————— Page d'accueil du site —————————————————————
const FEATURES = [
  ['target', 'Allures calculées sur toi', 'Chrono, VMA, volume ou activités importées : Mova déduit tes zones (footing, seuil, VMA…) et les applique à chaque séance.', '/application-course-a-pied.html'],
  ['calendar', 'Plans personnalisés', '5 km, 10 km, semi, marathon, vélo, natation, triathlon, Ironman, musculation : un calendrier adapté à ton niveau et à tes jours libres.', '/plan-entrainement-10km.html'],
  ['bolt', 'Séance rapide', 'Sport, type de séance, durée, intensité : ta séance prête en 10 secondes, avec contrôle de cohérence.', '/seance-rapide.html'],
  ['pin', 'Tracker GPS et jauge d’allure', 'Un demi-cercle vert et rouge et un point qui suit ton allure en direct. Départ instantané, pause auto, coach vocal.', '/tracker-gps-course.html'],
  ['watch', 'Envoi sur ta montre', 'Séances structurées au format FIT pour Garmin, et formats adaptés aux autres marques.', '/envoyer-seance-montre-garmin.html'],
  ['moon', 'Récupération & sommeil', 'Charge d’entraînement, forme, sommeil, étirements et mobilité guidés avec chronomètre.', '/guide-recuperation-sommeil.html'],
  ['trend', 'Prédiction de course', 'Estime tes chronos sur 5 km, 10 km, semi et marathon d’après tes performances.', '/calculateur-allure.html'],
  ['award', 'Rangs, badges, classement', 'De Bronze à Champion : gagne de l’XP à chaque séance, débloque des badges, défie la communauté.', '/fonctionnalites.html#motivation'],
  ['users', 'Communauté', 'Fil d’actualité, clubs, partage de séances et de programmes, athlètes certifiés.', '/fonctionnalites.html#motivation'],
  ['palette', 'Personnalisation totale', 'Premium : 12 thèmes, 20 fonds animés, couleurs libres, boutons, cartes, polices. Lisible quoi que tu choisisses.', '/personnalisation.html'],
  ['download', 'Import & export', 'Importe tes sorties GPX / TCX (Strava, Garmin…), compare le prévu et le réalisé.', '/application-course-a-pied.html'],
  ['shield', 'Données sous contrôle', 'Consentements séparés, profil privé par défaut, export de tes données et suppression du compte.', '/privacy.html'],
];

const DISCIPLINES = [
  ['run', 'Course à pied', '5 km, 10 km, semi, marathon. Fractionné, seuil, sortie longue.', '/application-course-a-pied.html'],
  ['bike', 'Vélo', 'Séances en watts calées sur ta FTP, sorties longues, intervalles.', '/application-velo.html'],
  ['drop', 'Natation', 'Endurance et séries de 100 m avec repos courts.', '/application-natation.html'],
  ['layers', 'Triathlon & Ironman', 'Trois sports dans un seul calendrier, du sprint au 140.6.', '/application-triathlon.html'],
  ['dumbbell', 'Musculation', 'Corps entier, haut, bas ou muscles ciblés, avec ton matériel.', '/application-musculation.html'],
  ['body', 'Callisthénie', 'Pompes, tractions, dips, gainage : tout au poids du corps.', '/application-callisthenie.html'],
];

const USE_CASES = [
  ['Tu débutes la course', 'Tu veux courir 5 km sans t’arrêter : un plan progressif, des séances courtes et des allures faciles.', '/plan-course-debutant.html'],
  ['Tu prépares un 10 km ou un semi', 'Sorties longues, seuil et fractionné calés sur ton chrono, avec la jauge d’allure pour rester dans la zone.', '/plan-entrainement-10km.html'],
  ['Tu vises un marathon', 'Périodisation, semaines d’allègement, affûtage et suivi de la charge pour arriver frais.', '/plan-entrainement-marathon.html'],
  ['Tu fais du triathlon', 'Natation, vélo et course dans un même calendrier, avec une charge globale maîtrisée.', '/application-triathlon.html'],
  ['Tu manques de temps', 'Séance rapide : 20, 30 ou 45 minutes, choisis l’intensité, c’est prêt.', '/seance-rapide.html'],
  ['Tu t’entraînes à la maison', 'Callisthénie et musculation au poids du corps, aux haltères ou aux élastiques, avec repos guidés.', '/application-callisthenie.html'],
];

const landing = `
<section class="hero"><div class="wrap"><div class="grid">
<div>
<span class="eyebrow">Coaching multi-sport · Gratuit</span>
<h1>Ton coach de <em>course à pied, vélo, natation</em> et musculation</h1>
<p class="lead">Mova génère ton plan d’entraînement personnalisé, règle tes allures sur ton vrai niveau, te guide en direct avec le tracker GPS et suit ta récupération. Une seule application pour tous tes sports.</p>
<div class="cta-row"><a class="btn primary" href="/">${rawIcon('bolt')} Commencer gratuitement</a><a class="btn ghost" href="#captures">Voir l’application</a></div>
${trust(['Gratuit', 'Sans carte bancaire', 'Prêt en 2 minutes', 'iPhone & Android'])}
</div>
<div class="hero-shots">
${phone('seance-rapide-intensite', A('seance-rapide-intensite'), 'p1')}
${phone('accueil', A('accueil'), 'p2', true)}
${phone('jauge-allure', A('jauge-allure'), 'p3')}
</div>
</div>
<div class="stats reveal">
<div class="stat"><b data-count="7">7</b><span>disciplines couvertes</span></div>
<div class="stat"><b data-count="4">4</b><span>plans : 5 km, 10 km, semi, marathon</span></div>
<div class="stat"><b data-count="20">20</b><span>fonds animés (Premium)</span></div>
<div class="stat"><b data-count="12">12</b><span>thèmes de couleurs (Premium)</span></div>
</div></div></section>

<section class="alt"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Pourquoi Mova</span><h2>Fini les plans génériques et les allures au hasard</h2><p>La plupart des plans téléchargés ignorent ton niveau réel. Mova part de toi.</p></div>
<div class="versus">
<div class="col bad reveal"><h3>Sans Mova</h3><ul>${li(['Un plan PDF identique pour tout le monde', 'Des allures trop lentes ou trop rapides, faute de repères', 'Une application par sport, des données éparpillées', 'Une séance improvisée quand le temps manque', 'Aucun suivi de la fatigue ni de la récupération'], 'bad')}</ul></div>
<div class="col good reveal"><h3>Avec Mova</h3><ul>${li(['Un plan bâti sur ton objectif, tes jours et ton niveau', 'Des allures calculées sur ton chrono, ta VMA ou ta FTP', 'Course, vélo, natation, musculation : un seul calendrier', 'Séance rapide : type, durée et intensité en 4 touches', 'Charge, forme, sommeil et conseils de récupération'])}</ul></div>
</div>
</div></section>

<section id="fonctionnalites"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Fonctionnalités</span><h2>Tout ce qu’il faut pour progresser, dans une seule application</h2>
<p>Plan d’entraînement, tracker GPS, séance rapide, récupération, prédiction de chrono, communauté : chaque outil est pensé pour te faire gagner du temps et te garder motivé.</p></div>
<div class="cards">${FEATURES.map(([i, t, d, h]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p><a class="more" href="${h}">En savoir plus →</a></article>`).join('')}</div>
<p style="text-align:center;margin-top:26px"><a class="btn ghost" href="/fonctionnalites.html">Toutes les fonctionnalités</a></p>
</div></section>

<section id="captures" class="alt"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Captures d’écran</span><h2>L’application en images</h2><p>Des vraies captures de Mova : de l’accueil au tracker GPS, du plan d’entraînement à la personnalisation.</p></div>
<div class="gallery reveal" role="list">${SHOTS.map(([img, t, d]) => `<figure role="listitem">${phone(img, A(img))}<figcaption><b>${t}</b>${d}</figcaption></figure>`).join('')}</div>
</div></section>

<section><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Comment ça marche</span><h2>De zéro au premier kilomètre en 3 étapes</h2></div>
<div class="steps">
<div class="step reveal"><h3>Dis-nous qui tu es</h3><p>Sport, objectif, niveau, jours disponibles, et si tu les connais : chrono, VMA ou FTP.</p></div>
<div class="step reveal"><h3>Reçois ton plan</h3><p>Un calendrier de séances détaillées : échauffement, corps de séance, retour au calme, avec les allures de chaque étape.</p></div>
<div class="step reveal"><h3>Lance-toi, ajuste</h3><p>Démarre le tracker GPS, suis la jauge d’allure, puis compare le prévu et le réalisé. Le plan se met à jour avec toi.</p></div>
</div>
<p style="text-align:center;margin-top:26px"><a class="btn primary" href="/">Créer mon plan gratuitement</a></p>
</div></section>

<section class="alt"><div class="wrap split">
<div class="reveal"><span class="eyebrow">Séance rapide</span><h2>Une séance sur mesure, en 4 touches</h2>
<p style="margin-top:12px">Le sport, le type de séance, la durée, l’intensité. C’est toi qui décides ; Mova calcule le reste avec tes allures.</p>
<ul class="ticks"><li><b>Course :</b> footing, sortie longue, fractionné, seuil / tempo.</li><li><b>Contrôle de cohérence :</b> une sortie longue en 20 minutes ? Mova te le dit.</li><li><b>Trois intensités :</b> tranquille, modérée, ou dans le rouge.</li><li><b>Étape facultative :</b> complète ta VMA ou ton chrono pour des allures justes.</li></ul>
<div class="cta-row" style="margin-top:22px"><a class="btn ghost" href="/seance-rapide.html">Découvrir la séance rapide</a></div></div>
<div class="media reveal">${phone('seance-rapide-type', A('seance-rapide-type'))}${phone('seance-rapide-intensite', A('seance-rapide-intensite'))}</div>
</div></section>

<section><div class="wrap split rev">
<div class="reveal"><span class="eyebrow">Tracker GPS</span><h2>Une jauge qui te dit si tu es dans la zone</h2>
<p style="margin-top:12px">Un demi-cercle en trois parties : vert au centre, rouge de chaque côté. Le point suit ton allure seconde après seconde. Tu n’as plus à regarder ta montre pour savoir si tu accélères trop tôt.</p>
<ul class="ticks"><li><b>Allure visée en grand :</b> 4:01 /km, lisible d’un coup d’œil.</li><li><b>Étapes claires :</b> « Échauffement 12 minutes à 6:16 ».</li><li><b>Départ instantané</b> et détection automatique de la localisation.</li><li><b>Pause automatique</b> et coach vocal.</li></ul>
<div class="cta-row" style="margin-top:22px"><a class="btn ghost" href="/tracker-gps-course.html">Voir le tracker GPS</a></div></div>
<div class="media reveal">${phone('jauge-allure', A('jauge-allure'))}${phone('tracker-gps', A('tracker-gps'))}</div>
</div></section>

<section id="disciplines" class="alt"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Disciplines</span><h2>Une application, tous tes sports</h2><p>Que tu coures, pédales, nages ou soulèves de la fonte, Mova te propose des séances pensées pour ta discipline.</p></div>
<div class="cards">${DISCIPLINES.map(([i, t, d, h]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p><a class="more" href="${h}">Voir la discipline →</a></article>`).join('')}</div>
</div></section>

<section id="personnalisation"><div class="wrap split">
<div class="media reveal">${phone('theme-aurore', A('theme-aurore'))}${phone('theme-nuit', A('theme-nuit'))}</div>
<div class="reveal"><span class="eyebrow">Premium · Personnalisation</span><h2>Fais de Mova ton application</h2>
<p style="margin-top:12px">Comme sur ta montre, tout se personnalise : le fond d’écran, les couleurs, les boutons, les cartes, la police. Et ça reste lisible : le texte passe automatiquement en noir ou en blanc selon tes couleurs.</p>
<ul class="ticks"><li><b>12 thèmes</b> prêts à l’emploi : Aurore rose, Océan, Coucher de soleil, Forêt, Néon, Minuit…</li><li><b>20 fonds animés</b> : aurore boréale, vagues, étoiles, pluie fine, rayons, grille, dunes…</li><li><b>Couleurs libres :</b> palette, curseur de teinte ou code hexadécimal.</li><li><b>Boutons :</b> dégradé, uni, contour ou verre ; arrondi, pilule ou carré ; effet au toucher.</li><li>Sans personnalisation, tu gardes l’application standard.</li></ul>
<div class="cta-row" style="margin-top:22px"><a class="btn ghost" href="/personnalisation.html">Voir tous les thèmes et fonds</a></div></div>
</div></section>

${pricingBlock()}

<section id="outils" class="alt"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Outils gratuits</span><h2>Calculateurs et guides pour t’entraîner malin</h2><p>Des outils utilisables tout de suite, sans compte, et des guides pour comprendre ce que tu fais.</p></div>
<div class="cards four">
<a class="card reveal" href="/calculateur-vma.html" style="text-decoration:none">${icon('timer')}<h3>Calculateur de VMA</h3><p>Test de Cooper, demi-Cooper ou chrono : ta VMA et tes zones.</p></a>
<a class="card reveal" href="/calculateur-allure.html" style="text-decoration:none">${icon('trend')}<h3>Calculateur d’allure</h3><p>Allure, vitesse et prédictions de chrono.</p></a>
<a class="card reveal" href="/calculateur-frequence-cardiaque.html" style="text-decoration:none">${icon('heart')}<h3>Zones cardiaques</h3><p>FC max estimée et cinq zones d’effort.</p></a>
<a class="card reveal" href="/calculateur-ftp.html" style="text-decoration:none">${icon('bike')}<h3>Calculateur de FTP</h3><p>Test 20 minutes ou rampe : FTP et zones en watts.</p></a>
</div>
<p style="text-align:center;margin-top:26px"><a class="btn ghost" href="/outils.html">Tous les outils</a> <a class="btn ghost" href="/guides.html">Tous les guides</a></p>
</div></section>

<section><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Pour qui ?</span><h2>Mova s’adapte à ta situation</h2><p>Quelques exemples de profils pour lesquels l’application est pensée.</p></div>
<div class="cards">${USE_CASES.map(([t, d, h]) => `<a class="card reveal" href="${h}" style="text-decoration:none"><h3 style="margin-top:0">${t}</h3><p>${d}</p></a>`).join('')}</div>
</div></section>

${reviewsBlock({ limit: 6 })}

${faqBlock(FAQ_HOME)}

${installBlock()}
`;

out(
  'index.html',
  page({
    slug: 'index.html',
    title: 'Mova : application de coaching multi-sport (course, vélo, natation)',
    description: 'Mova génère ton plan d’entraînement personnalisé (5 km, 10 km, semi, marathon, triathlon, musculation), règle tes allures, te guide avec un tracker GPS et suit ta récupération. Gratuit, sur iPhone et Android.',
    keywords: ['application course à pied', 'plan d’entraînement running', 'coach sportif application', 'application triathlon', 'entraînement vélo watts', 'application natation', 'plan marathon', 'plan 10 km', 'calcul VMA', 'tracker GPS running', 'séance de sport rapide', 'musculation callisthénie', 'coaching multi-sport', 'application sport gratuite', 'Mova'],
    body: landing,
    preload: 'accueil',
    reviews: true,
    ld: [APP_LD, ORG_LD, faqLd(FAQ_HOME)],
  }),
);
reg('index.html', '1.0', 'weekly');

// ————————————————————— Fonctionnalités —————————————————————
{
  const bc = crumbs([['Accueil', '/apropos.html'], ['Fonctionnalités', '/fonctionnalites.html']]);
  const block = (id, eyebrow, title, intro, ticks, imgs, rev) => `<section id="${id}" ${rev ? 'class="alt"' : ''}><div class="wrap split ${rev ? '' : 'rev'}">
<div class="reveal"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2><p style="margin-top:12px">${intro}</p><ul class="ticks">${ticks.map((t) => `<li>${t}</li>`).join('')}</ul></div>
<div class="media reveal">${imgs.map((k) => phone(k, A(k))).join('')}</div></div></section>`;
  const body = `${bc.html}
<section class="hero" style="padding-top:30px;padding-bottom:10px"><div class="wrap"><span class="eyebrow">Fonctionnalités</span><h1 style="font-size:clamp(2rem,4.8vw,3.4rem)">Tout ce que fait <em>Mova</em>, en détail</h1>
<p class="lead">Planifier, s’entraîner, récupérer, se motiver, personnaliser : voici les fonctions de l’application, avec des captures réelles.</p>
<div class="cta-row"><a class="btn primary" href="/">Essayer gratuitement</a><a class="btn ghost" href="/tarifs.html">Voir les tarifs</a></div></div></section>
${block('planification', 'Planifier', 'Un plan qui part de toi', 'Objectif, niveau, jours disponibles, date de course : Mova construit un calendrier de séances détaillées et le fait évoluer avec toi.', ['Plans 5 km, 10 km, semi, marathon, vélo, natation, triathlon, Ironman, musculation', 'Allures et zones calculées sur ton chrono, ta VMA, ta FTP ou ton allure au 100 m', 'Périodisation, semaines d’allègement et affûtage', 'Prédiction de chrono d’après tes performances'], ['plan-entrainement', 'prediction-course'], false)}
${block('seance', 'S’entraîner', 'Séance rapide et tracker GPS', 'Peu de temps ou envie de liberté ? Compose une séance en 4 touches puis lance-la avec le tracker GPS et sa jauge d’allure.', ['Séance rapide : sport, type, durée (avec contrôle de cohérence), intensité', 'Jauge d’allure en demi-cercle, allure visée en grand, étapes détaillées', 'Départ instantané, pause automatique, coach vocal', 'Mode séance libre avec carte et données réglables'], ['seance-rapide-intensite', 'jauge-allure'], true)}
${block('recuperation', 'Récupérer', 'Charge, forme et récupération', 'Pour progresser sans t’épuiser, Mova suit ta charge d’entraînement et te propose des séances de récupération guidées.', ['État de forme, charge et fatigue', 'Étirements, mobilité et foam rolling avec chronomètre', 'Suivi du sommeil (avec une montre compatible)', 'Conseils adaptés à ta fatigue'], ['recuperation', 'seances-recuperation'], false)}
${block('motivation', 'Se motiver', 'Rangs, badges et communauté', 'Chaque séance rapporte de l’XP. Monte de rang, débloque des badges, partage une séance ou un programme et rejoins des clubs.', ['Rangs de Bronze à Champion, saisons et classements', 'Badges et athlètes certifiés', 'Fil d’actualité, abonnés, partage de séances et programmes', 'Profil public ou privé, au choix'], ['communaute', 'profil'], true)}
${block('personnaliser', 'Personnaliser', 'Une application à ton image', 'Avec Premium, change le fond d’écran, les couleurs, les boutons, les cartes et la police. La lisibilité est corrigée automatiquement.', ['12 thèmes et 20 fonds animés', 'Couleurs libres (palette, teinte, hexadécimal)', 'Boutons : style, forme, effet au toucher', 'Cartes en verre, pleines ou en contour ; police et taille du texte'], ['theme-aurore', 'personnalisation'], false)}
<section class="alt"><div class="wrap"><div class="head center reveal"><span class="eyebrow">Et aussi</span><h2>Des détails qui comptent</h2></div>
<div class="cards">
<article class="card reveal">${icon('watch')}<h3>Envoi sur la montre</h3><p>Fichier FIT avec étapes et allures pour Garmin, autres marques proposées.</p></article>
<article class="card reveal">${icon('download')}<h3>Import GPX / TCX</h3><p>Compare tes sorties réelles à la séance prévue.</p></article>
<article class="card reveal">${icon('phone')}<h3>Installable partout</h3><p>iPhone, Android et ordinateur, sans passer par un store.</p></article>
<article class="card reveal">${icon('globe')}<h3>Plusieurs langues</h3><p>Interface disponible en plusieurs langues.</p></article>
<article class="card reveal">${icon('shield')}<h3>Confidentialité</h3><p>Consentements séparés, profil privé par défaut, export et suppression des données.</p></article>
<article class="card reveal">${icon('moon')}<h3>Mode sombre</h3><p>Clair, sombre ou automatique selon ton téléphone.</p></article>
</div></div></section>
${ctaBanner('Essaie Mova gratuitement', 'Ton premier plan est prêt en quelques minutes.')}`;
  out('fonctionnalites.html', page({ slug: 'fonctionnalites.html', title: 'Fonctionnalités Mova : plan, tracker GPS, séance rapide, récupération', description: 'Toutes les fonctionnalités de Mova : plans d’entraînement personnalisés, séance rapide, tracker GPS avec jauge d’allure, récupération, prédiction de chrono, communauté, personnalisation.', keywords: ['fonctionnalités application sport', 'application coaching sportif', 'plan d’entraînement personnalisé', 'tracker GPS', 'suivi récupération', 'prédiction chrono'], body, ld: [bc.ld, APP_LD] }));
  reg('fonctionnalites.html', '0.9');
}

// ————————————————————— Tarifs —————————————————————
{
  const bc = crumbs([['Accueil', '/apropos.html'], ['Tarifs', '/tarifs.html']]);
  const faq = [
    ['Mova est-elle vraiment gratuite ?', 'Oui. Le programme personnalisé, le tracker GPS, la séance rapide, la récupération, le classement et la communauté sont gratuits, avec quelques limites mensuelles (un programme actif, cinq imports et trois envois vers la montre par mois, un club).'],
    ['Que débloque Premium ?', 'La personnalisation complète de l’application (12 thèmes, 20 fonds animés, couleurs, boutons, cartes, polices), plusieurs programmes en même temps, des imports et envois vers la montre illimités et plusieurs clubs.'],
    ['Combien coûte Premium ?', '9,99 € par mois ou 59,99 € par an (soit environ 5 € par mois), avec 7 jours d’essai. Les tarifs sont indicatifs et affichés dans l’application au moment de l’abonnement.'],
    ['Puis-je annuler quand je veux ?', 'Oui, sans engagement : tu gères ton abonnement depuis ton compte ou depuis le store. L’accès reste actif jusqu’à la fin de la période payée.'],
    ['Que se passe-t-il si je n’ai plus Premium ?', 'Tu retrouves l’application standard et les limites de l’offre gratuite. Tes séances et ton historique sont conservés.'],
  ];
  const body = `${bc.html}
<section class="wrap" style="padding-top:26px"><span class="eyebrow">Tarifs</span><h1 style="font-size:clamp(2rem,4.8vw,3.4rem)">Gratuit pour <em style="font-style:normal;color:var(--mint)">s’entraîner</em>, Premium pour tout personnaliser</h1></section>
${pricingBlock(false)}
<section class="alt"><div class="wrap"><div class="head center reveal"><h2>Comparer en détail</h2></div>
<div class="tablewrap reveal"><table><thead><tr><th>Fonction</th><th>Gratuit</th><th>Premium</th></tr></thead><tbody>
<tr><td>Programme personnalisé, tracker GPS, séance rapide</td><td class="y">✓</td><td class="y">✓</td></tr>
<tr><td>Récupération, prédiction de chrono, classement, badges</td><td class="y">✓</td><td class="y">✓</td></tr>
<tr><td>Communauté : fil, partage, profil</td><td class="y">✓</td><td class="y">✓</td></tr>
<tr><td>Programmes actifs en même temps</td><td>1</td><td class="y">Plusieurs</td></tr>
<tr><td>Imports d’activités par mois</td><td>5</td><td class="y">Illimité</td></tr>
<tr><td>Envois vers ta montre par mois</td><td>3</td><td class="y">Illimité</td></tr>
<tr><td>Clubs rejoints</td><td>1</td><td class="y">Plusieurs</td></tr>
<tr><td>12 thèmes et 20 fonds animés</td><td>—</td><td class="y">✓</td></tr>
<tr><td>Couleurs, boutons, cartes, polices personnalisés</td><td>—</td><td class="y">✓</td></tr>
</tbody></table></div></div></section>
${faqBlock(faq, 'Questions sur les tarifs')}
${ctaBanner()}`;
  out('tarifs.html', page({ slug: 'tarifs.html', title: 'Tarifs Mova : gratuit et Premium (7 jours d’essai)', description: 'Mova est gratuit pour s’entraîner : plan, tracker GPS, séance rapide. Premium (9,99 €/mois ou 59,99 €/an, 7 jours d’essai) débloque la personnalisation complète et supprime les limites.', keywords: ['prix Mova', 'application sport gratuite', 'abonnement premium sport', 'tarif application coaching', 'essai gratuit'], body, ld: [bc.ld, faqLd(faq), APP_LD] }));
  reg('tarifs.html', '0.8');
}

// ————————————————————— Personnalisation —————————————————————
{
  const bc = crumbs([['Accueil', '/apropos.html'], ['Personnaliser l’application', '/personnalisation.html']]);
  const faq = [
    ['Faut-il Premium pour personnaliser l’application ?', 'Oui : la personnalisation complète est réservée à Premium. Sans elle, tu gardes l’application standard, identique pour tout le monde.'],
    ['Et si je choisis une couleur trop claire ?', 'Mova corrige automatiquement : le texte des boutons passe en noir ou en blanc selon la couleur, et une couleur pâle est légèrement renforcée pour rester lisible. Le fond garde toujours un contraste suffisant avec le texte.'],
    ['Les animations sont-elles pénibles pour les yeux ?', 'Elles restent discrètes. Tu peux choisir aucune animation, douce ou vive, et l’option « Réduire les animations » des réglages fige tous les fonds.'],
    ['Puis-je revenir à l’application standard ?', 'Oui, en un geste : un bouton « Revenir à l’application standard » ou l’interrupteur « Personnalisation activée ».'],
  ];
  const body = `${bc.html}
<section class="hero" style="padding-top:30px"><div class="wrap"><div class="grid">
<div><span class="eyebrow">Premium · Personnalisation</span><h1 style="font-size:clamp(2.1rem,4.8vw,3.5rem)">Fais de Mova <em>ton application</em></h1>
<p class="lead">Fond d’écran, couleurs, boutons, cartes, police : compose l’application comme tu l’aimes. Douze thèmes prêts à l’emploi ou tout à la main. Et ça reste toujours lisible.</p>
<div class="cta-row"><a class="btn primary" href="/settings/subscription">Essayer Premium 7 jours</a><a class="btn ghost" href="/tarifs.html">Voir les tarifs</a></div>${trust(['12 thèmes', '20 fonds animés', 'Lisibilité automatique'])}</div>
<div class="hero-shots">${phone('theme-ocean', A('theme-ocean'), 'p1')}${phone('theme-aurore', A('theme-aurore'), 'p2', true)}${phone('theme-sunset', A('theme-sunset'), 'p3')}</div></div></div></section>
<section class="alt"><div class="wrap"><div class="head reveal"><span class="eyebrow">Thèmes</span><h2>12 thèmes prêts à l’emploi</h2><p>Un tap, et toute l’application change : couleurs, dégradé et fond animé.</p></div>
<div class="themes reveal">${THEMES.map(([n, a, b, c]) => `<div class="theme"><div class="sw"><b style="background:${a}"></b><b style="background:${b}"></b><em style="background:${c}"></em></div>${n}</div>`).join('')}</div></div></section>
<section><div class="wrap"><div class="head reveal"><span class="eyebrow">Fonds d’écran</span><h2>20 fonds animés</h2><p>Quelques mouvements discrets pour que ça vive sans distraire. Chacun se mélange à tes couleurs.</p></div>
<div class="chips reveal">${BACKGROUNDS.map(([n, d]) => `<span class="chip" title="${d}">${n} <small style="color:var(--muted);font-weight:600">· ${d}</small></span>`).join('')}</div></div></section>
<section class="alt"><div class="wrap split"><div class="media reveal">${phone('personnalisation', A('personnalisation'))}${phone('theme-nuit', A('theme-nuit'))}</div>
<div class="reveal"><span class="eyebrow">Tout se règle</span><h2>Des boutons à la police</h2>
<ul class="ticks"><li><b>Couleurs :</b> palette de pastilles, curseur de teinte ou code hexadécimal.</li><li><b>Boutons :</b> dégradé, uni, contour ou verre ; arrondi, pilule ou carré ; ressort, gonflement, enfoncement ou rien au toucher.</li><li><b>Cartes :</b> pleines, en verre ou en contour ; coins nets, doux ou très ronds.</li><li><b>Écriture :</b> police Mova, système, élégante ou technique ; taille normale, grande ou très grande.</li><li><b>Animation du fond :</b> aucune, douce ou vive.</li><li><b>Lisibilité :</b> le texte se corrige tout seul selon tes couleurs.</li></ul></div></div></section>
${faqBlock(faq, 'Questions sur la personnalisation')}
${ctaBanner('Fais-en ton application', 'Commence gratuitement, personnalise avec Premium.')}`;
  out('personnalisation.html', page({ slug: 'personnalisation.html', title: 'Personnaliser l’appli : thèmes, fonds animés, couleurs | Mova', description: 'Personnalise Mova : 12 thèmes, 20 fonds d’écran animés, couleurs libres, boutons, cartes, polices. Lisibilité automatique. Fonction Premium.', keywords: ['personnaliser application', 'thème application sport', 'fond d’écran animé', 'couleurs personnalisées', 'mode sombre application', 'customisation interface'], body, preload: 'theme-aurore', ld: [bc.ld, faqLd(faq)] }));
  reg('personnalisation.html', '0.8');
}

// ————————————————————— Pages discipline / objectif —————————————————————
for (const p of SPORT_PAGES) {
  const bc = crumbs([['Accueil', '/apropos.html'], [p.crumb, `/${p.slug}`]]);
  const body = `${bc.html}
<section class="hero" style="padding-top:34px"><div class="wrap"><div class="grid">
<div><span class="eyebrow">${p.kicker}</span><h1>${p.h1}</h1><p class="lead">${p.lead}</p>
<div class="cta-row"><a class="btn primary" href="/">Commencer gratuitement</a><a class="btn ghost" href="/telecharger.html">Installer l’application</a></div>${trust(['Gratuit', 'Sans carte bancaire', 'iPhone & Android'])}</div>
<div class="hero-shots">${phone(p.img[1], p.alts[1], 'p1')}${phone(p.img[0], p.alts[0], 'p2', true)}${phone(p.img[2], p.alts[2], 'p3')}</div>
</div></div></section>
<section class="alt"><div class="wrap"><div class="head reveal"><h2>Ce que Mova fait pour toi</h2></div>
<div class="cards">${p.cards.map(([i, t, d]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join('')}</div></div></section>
<section><div class="wrap split"><div class="reveal"><h2>En pratique</h2><ul class="ticks">${p.points.map((x) => `<li>${x}</li>`).join('')}</ul></div>
<div class="steps" style="grid-template-columns:1fr">${p.steps.map(([t, d]) => `<div class="step reveal"><h3>${t}</h3><p>${d}</p></div>`).join('')}</div></div></section>
${faqBlock(p.faq, 'Questions sur ce sujet')}
<section><div class="wrap"><h3>À découvrir aussi</h3><div class="related">${p.related.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}</div></div></section>
${ctaBanner()}`;
  out(p.slug, page({ slug: p.slug, title: p.title, description: p.description, keywords: p.keywords, body, preload: p.img[0], ld: [bc.ld, faqLd(p.faq), { ...APP_LD, url: `${SITE}/${p.slug}` }] }));
  reg(p.slug, '0.8');
}

// ————————————————————— Guides —————————————————————
for (const g of ALL_GUIDES) {
  const bc = crumbs([['Accueil', '/apropos.html'], ['Guides', '/guides.html'], [g.crumb, `/${g.slug}`]]);
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
function toolPage({ slug, crumb, title, description, keywords, h1, lead, fields, result, js, article, cta }) {
  const bc = crumbs([['Accueil', '/apropos.html'], ['Outils', '/outils.html'], [crumb, `/${slug}`]]);
  const body = `${bc.html}
<section class="wrap" style="padding-top:26px"><span class="eyebrow">Outil gratuit</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">${h1}</h1>
<p class="lead" style="margin:14px 0 26px;max-width:680px">${lead}</p>
<div class="tool"><div class="fields">${fields}</div><div class="result" id="out">${result}</div></div>
<div class="prose" style="margin-top:34px">${article}</div></section>
<script>${js}</script>
${ctaBanner(cta[0], cta[1])}`;
  out(slug, page({ slug, title, description, keywords, body, sticky: true, ld: [bc.ld, { '@context': 'https://schema.org', '@type': 'WebApplication', name: crumb, applicationCategory: 'HealthApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: `${SITE}/${slug}` }] }));
  reg(slug, '0.8');
}
const HELPERS = `var $=function(id){return document.getElementById(id)};function pace(s){s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}function fmt(s){s=Math.round(s);var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(r).padStart(2,'0');}function parseT(v){v=(v||'').trim().replace('h',':').replace("'",':').replace('m',':');var p=v.split(':').map(Number);if(p.some(isNaN)||!p.length)return null;var s=0;for(var i=0;i<p.length;i++)s=s*60+p[i];return s>0?s:null;}function num(v){return parseFloat(String(v).replace(',','.'));}`;

toolPage({
  slug: 'calculateur-vma.html', crumb: 'Calculateur de VMA',
  title: 'Calculateur de VMA gratuit : test de Cooper et zones d’allure | Mova',
  description: 'Calcule ta VMA (vitesse maximale aérobie) avec le test de Cooper, le demi-Cooper ou un chrono 5 / 10 km. Obtiens tes zones d’entraînement : footing, seuil, allure 10 km, VMA.',
  keywords: ['calculateur VMA', 'calcul VMA', 'test de Cooper', 'VMA en km/h', 'zones entraînement course', 'allure footing', 'VMA 5 km'],
  h1: 'Calculateur de <em style="font-style:normal;color:var(--mint)">VMA</em> et zones d’entraînement',
  lead: 'Calcule ta vitesse maximale aérobie avec le test de Cooper (12 minutes), le demi-Cooper (6 minutes) ou un chrono sur 5 ou 10 km, puis obtiens tes allures d’entraînement.',
  fields: `<label>Méthode<select id="mode"><option value="c12">Test de Cooper (12 min)</option><option value="c6">Demi-Cooper (6 min)</option><option value="r5">Chrono sur 5 km (estimation)</option><option value="r10">Chrono sur 10 km (estimation)</option></select></label><label>Ta valeur<input id="val" inputmode="decimal" value="3000" autocomplete="off"><span class="note" id="hint"></span></label>`,
  result: `<div><span class="note">Ta VMA estimée</span><div class="big-num" id="vma">—</div></div><div class="tablewrap"><table><thead><tr><th>Zone</th><th>% VMA</th><th>Vitesse</th><th>Allure</th></tr></thead><tbody id="zones"></tbody></table></div><p class="note">Valeurs indicatives : elles varient selon les personnes et les méthodes. Un test bien mené vaut mieux qu’une estimation à partir d’un chrono.</p>`,
  js: `(function(){${HELPERS}function calc(){var mode=$('mode').value,v=$('val').value,vma=null;$('hint').textContent=mode==='c12'?'Distance parcourue en 12 minutes, en mètres (ex. 3000)':mode==='c6'?'Distance parcourue en 6 minutes, en mètres (ex. 1600)':'Ton chrono (ex. 24:30 ou 1:44:00)';if(mode==='c12'){var d=num(v);if(d>0)vma=d/200;}else if(mode==='c6'){var d6=num(v);if(d6>0)vma=d6/100;}else{var t=parseT(v);var km=mode==='r5'?5:10;if(t){vma=(km/(t/3600))/(mode==='r5'?0.93:0.9);}}if(!vma||vma<6||vma>30){$('out').hidden=true;return;}$('out').hidden=false;$('vma').textContent=vma.toFixed(1).replace('.',',')+' km/h';var Z=[['Récupération',0.60,0.65],['Endurance fondamentale (footing)',0.65,0.75],['Allure marathon',0.75,0.80],['Seuil',0.85,0.90],['Allure 10 km',0.88,0.92],['VMA (fractionné)',0.95,1.05]];$('zones').innerHTML=Z.map(function(z){var a=vma*z[1],b=vma*z[2];return '<tr><td>'+z[0]+'</td><td>'+Math.round(z[1]*100)+' – '+Math.round(z[2]*100)+' %</td><td>'+a.toFixed(1).replace('.',',')+' – '+b.toFixed(1).replace('.',',')+' km/h</td><td>'+pace(3600/b)+' – '+pace(3600/a)+' /km</td></tr>';}).join('');}['mode','val'].forEach(function(id){$(id).addEventListener('input',calc);});calc();})();`,
  article: `<h2>Comment utiliser sa VMA ?</h2><p>Une fois ta VMA connue, tes séances de fractionné se calculent facilement : 30/30 à 100 % de la VMA, 400 m à 95–100 %, footing à 65–75 %. Lis notre <a href="/guide-vma.html">guide complet de la VMA</a> et celui du <a href="/guide-fractionne.html">fractionné</a>.</p>`,
  cta: ['Laisse Mova calculer toutes tes allures', 'Renseigne ta VMA ou un chrono : les séances de ton plan se recalculent automatiquement.'],
});

toolPage({
  slug: 'calculateur-allure.html', crumb: 'Calculateur d’allure',
  title: 'Calculateur d’allure running : allure, vitesse, prédiction chrono | Mova',
  description: 'Calcule ton allure au kilomètre, ta vitesse et prédis tes temps sur 5 km, 10 km, semi-marathon et marathon. Convertisseur allure ↔ vitesse gratuit.',
  keywords: ['calculateur allure', 'calcul allure course à pied', 'convertisseur allure vitesse', 'prédiction chrono', 'temps marathon', 'allure 10 km', 'formule de Riegel'],
  h1: 'Calculateur d’<em style="font-style:normal;color:var(--mint)">allure</em> et prédiction de chrono',
  lead: 'Entre une distance et un temps : obtiens ton allure au kilomètre, ta vitesse en km/h et une estimation de tes temps sur 5 km, 10 km, semi-marathon et marathon.',
  fields: `<label>Distance courue<select id="preset"><option value="">Personnalisée</option><option value="5" selected>5 km</option><option value="10">10 km</option><option value="21.0975">Semi-marathon</option><option value="42.195">Marathon</option></select></label><label>Distance (km)<input id="dist" inputmode="decimal" value="5"></label><label>Heures<input id="h" inputmode="numeric" value="0"></label><label>Minutes<input id="m" inputmode="numeric" value="25"></label><label>Secondes<input id="s" inputmode="numeric" value="0"></label>`,
  result: `<div class="kpis"><div class="kpi"><b id="pace">—</b><span>Allure</span></div><div class="kpi"><b id="speed">—</b><span>Vitesse</span></div></div><div class="tablewrap"><table><thead><tr><th>Distance</th><th>Temps estimé</th><th>Allure</th></tr></thead><tbody id="pred"></tbody></table></div><p class="note">Estimation par la formule de Riegel (temps × (distance ÷ distance de référence)^1,06). C’est une projection : l’entraînement spécifique, le parcours et la météo changent le résultat.</p>`,
  js: `(function(){${HELPERS}function calc(){var d=num($('dist').value);var t=(parseInt($('h').value)||0)*3600+(parseInt($('m').value)||0)*60+(parseInt($('s').value)||0);if(!(d>0)||!(t>0)){$('out').hidden=true;return;}$('out').hidden=false;$('pace').textContent=pace(t/d)+' /km';$('speed').textContent=(d/(t/3600)).toFixed(2).replace('.',',')+' km/h';var R=[['5 km',5],['10 km',10],['Semi-marathon',21.0975],['Marathon',42.195]];$('pred').innerHTML=R.map(function(r){var T=t*Math.pow(r[1]/d,1.06);return '<tr><td>'+r[0]+'</td><td>'+fmt(T)+'</td><td>'+pace(T/r[1])+' /km</td></tr>';}).join('');}$('preset').addEventListener('change',function(){if(this.value)$('dist').value=this.value;calc();});['dist','h','m','s'].forEach(function(id){$(id).addEventListener('input',calc);});calc();})();`,
  article: `<h2>Quelle allure pour quel objectif ?</h2><ul><li><strong>10 km en 50 minutes :</strong> 5:00 /km.</li><li><strong>Semi en 1 h 45 :</strong> 4:58 /km.</li><li><strong>Marathon en 4 heures :</strong> 5:41 /km.</li></ul><p>Consulte nos plans <a href="/plan-entrainement-10km.html">10 km</a>, <a href="/plan-entrainement-semi-marathon.html">semi-marathon</a> et <a href="/plan-entrainement-marathon.html">marathon</a>.</p>`,
  cta: ['Un plan calé sur tes allures', 'Mova transforme ton chrono en plan d’entraînement complet.'],
});

toolPage({
  slug: 'calculateur-frequence-cardiaque.html', crumb: 'Zones cardiaques',
  title: 'Calculateur de fréquence cardiaque max et zones d’effort | Mova',
  description: 'Estime ta fréquence cardiaque maximale (formule de Tanaka) et calcule tes 5 zones d’effort, en pourcentage de la FC max ou par la méthode de Karvonen avec la FC de repos.',
  keywords: ['fréquence cardiaque maximale', 'zones cardiaques', 'calcul FC max', 'formule de Karvonen', 'zones d’effort', 'formule de Tanaka', 'zone 2 cardiaque'],
  h1: 'Calculateur de <em style="font-style:normal;color:var(--mint)">fréquence cardiaque</em> et zones d’effort',
  lead: 'Estime ta FC max d’après ton âge (ou renseigne-la si tu la connais) et obtiens tes cinq zones. Ajoute ta FC de repos pour la méthode de Karvonen.',
  fields: `<label>Âge<input id="age" inputmode="numeric" value="35"></label><label>FC max (facultatif)<input id="fmax" inputmode="numeric" placeholder="ex. 188"></label><label>FC de repos (facultatif)<input id="frest" inputmode="numeric" placeholder="ex. 55"></label>`,
  result: `<div class="kpis"><div class="kpi"><b id="fm">—</b><span>FC max utilisée</span></div></div><div class="tablewrap"><table><thead><tr><th>Zone</th><th>Effort</th><th>% ciblé</th><th>Battements / min</th></tr></thead><tbody id="z"></tbody></table></div><p class="note">La FC max estimée par l’âge (208 − 0,7 × âge) peut s’écarter de 10 battements ou plus de la réalité. Un test encadré ou tes plus hautes valeurs en course sont plus fiables.</p>`,
  js: `(function(){${HELPERS}function calc(){var age=num($('age').value),fm=num($('fmax').value),fr=num($('frest').value);var max=fm>100?fm:(age>10&&age<100?208-0.7*age:0);if(!max){$('out').hidden=true;return;}$('out').hidden=false;$('fm').textContent=Math.round(max)+' bpm';var Z=[['1','Très facile, récupération',0.5,0.6],['2','Endurance fondamentale',0.6,0.7],['3','Tempo, allure marathon',0.7,0.8],['4','Seuil',0.8,0.9],['5','Très intense (VMA)',0.9,1.0]];var k=fr>30&&fr<max;$('z').innerHTML=Z.map(function(z){var a=k?fr+z[2]*(max-fr):z[2]*max,b=k?fr+z[3]*(max-fr):z[3]*max;return '<tr><td>Zone '+z[0]+'</td><td>'+z[1]+'</td><td>'+Math.round(z[2]*100)+' – '+Math.round(z[3]*100)+' %</td><td>'+Math.round(a)+' – '+Math.round(b)+'</td></tr>';}).join('');}['age','fmax','frest'].forEach(function(id){$(id).addEventListener('input',calc);});calc();})();`,
  article: `<h2>À quoi servent les zones cardiaques ?</h2><p>Elles aident à doser l’effort : l’essentiel du volume se fait en zones 1 et 2 (endurance), avec un peu de travail en zones 4 et 5. Si tu renseignes ta FC de repos, le calcul utilise la méthode de Karvonen (FC de réserve), plus personnalisée. Consulte un médecin avant de te lancer si tu as un doute sur ton cœur.</p><p>Voir aussi : <a href="/guide-recuperation-sommeil.html">récupération et sommeil</a>, <a href="/guide-vma.html">la VMA</a>.</p>`,
  cta: ['Suis ta forme au quotidien', 'Mova suit ta charge, ta récupération et ton état de forme.'],
});

toolPage({
  slug: 'calculateur-ftp.html', crumb: 'Calculateur de FTP',
  title: 'Calculateur de FTP vélo : test 20 min, rampe et zones en watts | Mova',
  description: 'Calcule ta FTP à partir d’un test de 20 minutes ou d’un test en rampe et obtiens tes zones de puissance en watts, avec les watts par kilo si tu indiques ton poids.',
  keywords: ['calculateur FTP', 'FTP vélo', 'test FTP 20 minutes', 'zones de puissance', 'watts par kilo', 'test en rampe'],
  h1: 'Calculateur de <em style="font-style:normal;color:var(--mint)">FTP</em> et zones de puissance',
  lead: 'Entre la puissance moyenne de ton test de 20 minutes (ou la meilleure minute d’un test en rampe) : Mova calcule ta FTP et tes zones en watts.',
  fields: `<label>Test<select id="mode"><option value="t20">Test 20 minutes (puissance moyenne)</option><option value="ramp">Test en rampe (meilleure minute)</option><option value="ftp">Je connais ma FTP</option></select></label><label>Puissance (watts)<input id="w" inputmode="numeric" value="250"></label><label>Poids (kg, facultatif)<input id="kg" inputmode="decimal" placeholder="ex. 70"></label>`,
  result: `<div class="kpis"><div class="kpi"><b id="ftp">—</b><span>FTP estimée</span></div><div class="kpi"><b id="wkg">—</b><span>Watts par kilo</span></div></div><div class="tablewrap"><table><thead><tr><th>Zone</th><th>% FTP</th><th>Watts</th></tr></thead><tbody id="z"></tbody></table></div><p class="note">FTP ≈ 95 % de la puissance moyenne sur 20 minutes, ou ≈ 75 % de la meilleure minute d’un test en rampe. Ce sont des estimations.</p>`,
  js: `(function(){${HELPERS}function calc(){var m=$('mode').value,w=num($('w').value),kg=num($('kg').value);if(!(w>50)){$('out').hidden=true;return;}var f=m==='t20'?w*0.95:m==='ramp'?w*0.75:w;$('out').hidden=false;$('ftp').textContent=Math.round(f)+' W';$('wkg').textContent=kg>30?(f/kg).toFixed(2).replace('.',',')+' W/kg':'—';var Z=[['1 · Récupération',0,0.55],['2 · Endurance',0.56,0.75],['3 · Tempo',0.76,0.90],['4 · Seuil',0.91,1.05],['5 · VO2max',1.06,1.20],['6 · Anaérobie',1.21,1.50]];$('z').innerHTML=Z.map(function(z){return '<tr><td>'+z[0]+'</td><td>'+(z[1]?Math.round(z[1]*100):'0')+' – '+Math.round(z[2]*100)+' %</td><td>'+(z[1]?Math.round(f*z[1]):'0')+' – '+Math.round(f*z[2])+' W</td></tr>';}).join('');}['mode','w','kg'].forEach(function(id){$(id).addEventListener('input',calc);});calc();})();`,
  article: `<h2>Que faire de ta FTP ?</h2><p>Elle sert à fixer les zones de tes séances : endurance en zone 2, blocs au seuil en zone 4, intervalles de VO2max en zone 5. Lis notre <a href="/guide-ftp.html">guide de la FTP</a> et découvre les séances de l’<a href="/application-velo.html">application vélo Mova</a>.</p>`,
  cta: ['Des séances vélo calées sur ta FTP', 'Renseigne ta FTP dans Mova : chaque étape affiche ses watts.'],
});

toolPage({
  slug: 'calculateur-css-natation.html', crumb: 'Calculateur de CSS',
  title: 'Calculateur de CSS natation : allure au 100 m et zones | Mova',
  description: 'Calcule ta vitesse critique de nage (CSS) avec un test 200 m / 400 m et obtiens ton allure au 100 m pour calibrer tes séries en piscine.',
  keywords: ['calculateur CSS natation', 'test 400 m 200 m natation', 'allure au 100 m', 'vitesse critique de nage', 'séries natation', 'seuil natation'],
  h1: 'Calculateur de <em style="font-style:normal;color:var(--mint)">CSS</em> en natation',
  lead: 'Entre tes temps sur 400 m et 200 m (à fond) : Mova calcule ta CSS, c’est-à-dire l’allure de nage que tu peux tenir longtemps, au 100 m.',
  fields: `<label>Temps sur 400 m (mm:ss)<input id="t4" value="6:40"></label><label>Temps sur 200 m (mm:ss)<input id="t2" value="3:10"></label>`,
  result: `<div class="kpis"><div class="kpi"><b id="css">—</b><span>CSS (par 100 m)</span></div></div><div class="tablewrap"><table><thead><tr><th>Type de séance</th><th>Allure au 100 m</th></tr></thead><tbody id="z"></tbody></table></div><p class="note">CSS = (temps 400 m − temps 200 m) ÷ 2. Deux efforts à fond, séparés de 5 à 10 minutes de récupération.</p>`,
  js: `(function(){${HELPERS}function calc(){var a=parseT($('t4').value),b=parseT($('t2').value);if(!a||!b||a<=b*1.8){$('out').hidden=true;return;}var c=(a-b)/2;$('out').hidden=false;$('css').textContent=pace(c)+' /100 m';var R=[['Séries au seuil',c,c],['Endurance',c+5,c+12],['Récupération / éducatifs',c+15,c+25],['Sprint court',c-8,c-4]];$('z').innerHTML=R.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+(r[1]===r[2]?pace(r[1]):pace(r[1])+' – '+pace(r[2]))+'</td></tr>';}).join('');}['t4','t2'].forEach(function(id){$(id).addEventListener('input',calc);});calc();})();`,
  article: `<h2>Comment utiliser ta CSS ?</h2><p>Elle sert de référence pour les séries : par exemple 8 × 100 m à ta CSS avec 15 à 20 secondes de repos. Retrouve le protocole complet dans le <a href="/guide-css-natation.html">guide de la CSS</a> et les séances de l’<a href="/application-natation.html">application natation Mova</a>.</p>`,
  cta: ['Des séances de piscine calées sur ton allure', 'Indique ton allure au 100 m dans Mova : les séries s’ajustent.'],
});

// ————————————————————— Hubs : outils, guides, glossaire, nouveautés —————————————————————
{
  const tools = [
    ['timer', 'Calculateur de VMA', 'Cooper, demi-Cooper, chrono : VMA et zones d’allure.', '/calculateur-vma.html'],
    ['trend', 'Calculateur d’allure', 'Allure, vitesse et prédiction de chrono sur 5 km, 10 km, semi, marathon.', '/calculateur-allure.html'],
    ['heart', 'Zones cardiaques', 'FC max estimée et cinq zones d’effort (Karvonen possible).', '/calculateur-frequence-cardiaque.html'],
    ['bike', 'Calculateur de FTP', 'Test 20 minutes ou rampe : FTP et zones en watts.', '/calculateur-ftp.html'],
    ['drop', 'Calculateur de CSS', 'Test 200 m / 400 m : allure de nage au 100 m.', '/calculateur-css-natation.html'],
  ];
  const bc = crumbs([['Accueil', '/apropos.html'], ['Outils', '/outils.html']]);
  out('outils.html', page({ slug: 'outils.html', title: 'Outils gratuits : VMA, allure, FTP, CSS, zones cardiaques | Mova', description: 'Calculateurs gratuits pour la course, le vélo et la natation : VMA, allure et prédiction de chrono, zones cardiaques, FTP, CSS. Sans compte.', keywords: ['calculateurs sport', 'outils running', 'calcul VMA', 'calcul FTP', 'zones cardiaques', 'calcul allure'], body: `${bc.html}<section class="wrap" style="padding-top:26px"><span class="eyebrow">Outils gratuits</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Calculateurs pour <em style="font-style:normal;color:var(--mint)">t’entraîner malin</em></h1><p class="lead" style="margin:14px 0 30px;max-width:680px">Utilisables tout de suite, sans compte. Chacun est expliqué par un guide.</p><div class="cards">${tools.map(([i, t, d, h]) => `<a class="card reveal" href="${h}" style="text-decoration:none">${icon(i)}<h3>${t}</h3><p>${d}</p><span class="more">Ouvrir l’outil →</span></a>`).join('')}</div></section>${ctaBanner()}`, ld: [bc.ld] }));
  reg('outils.html', '0.8');

  const groups = [
    ['Course à pied', ['plan-course-debutant.html', 'guide-vma.html', 'guide-fractionne.html', 'guide-fartlek.html', 'guide-seuil-tempo.html', 'guide-sortie-longue.html', 'guide-affutage.html', 'guide-echauffement.html', 'guide-prevenir-blessures-course.html']],
    ['Vélo et natation', ['guide-ftp.html', 'guide-css-natation.html']],
    ['Renforcement', ['guide-callisthenie-debutant.html']],
    ['Récupération et nutrition', ['guide-recuperation-sommeil.html', 'guide-nutrition-endurance.html']],
  ];
  const by = Object.fromEntries(ALL_GUIDES.map((g) => [g.slug, g]));
  const bc2 = crumbs([['Accueil', '/apropos.html'], ['Guides', '/guides.html']]);
  out('guides.html', page({ slug: 'guides.html', title: 'Guides d’entraînement : course, vélo, natation, récupération | Mova', description: 'Tous les guides Mova : VMA, fractionné, fartlek, seuil, sortie longue, affûtage, échauffement, FTP, CSS, callisthénie, récupération, nutrition et prévention des blessures.', keywords: ['guide entraînement course à pied', 'conseils running', 'apprendre à courir', 'guide VMA', 'guide fractionné', 'récupération sportive'], body: `${bc2.html}<section class="wrap" style="padding-top:26px"><span class="eyebrow">Guides</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Comprendre son <em style="font-style:normal;color:var(--mint)">entraînement</em></h1><p class="lead" style="margin:14px 0 10px;max-width:680px">Des explications claires, des séances types et des repères simples. Chaque guide renvoie vers l’outil ou la séance Mova qui va avec.</p>${groups.map(([t, s]) => `<h2 style="margin:34px 0 16px;font-size:1.5rem">${t}</h2><div class="cards">${s.map((k) => by[k]).filter(Boolean).map((g) => `<a class="card reveal" href="/${g.slug}" style="text-decoration:none"><h3 style="margin-top:0">${g.crumb}</h3><p>${g.description}</p><span class="more">Lire le guide →</span></a>`).join('')}</div>`).join('')}</section>${ctaBanner()}`, ld: [bc2.ld] }));
  reg('guides.html', '0.8');

  const sorted = [...GLOSSARY].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  const bc3 = crumbs([['Accueil', '/apropos.html'], ['Glossaire', '/glossaire.html']]);
  out('glossaire.html', page({ slug: 'glossaire.html', title: 'Glossaire course à pied, vélo et natation : VMA, FTP, CSS, fartlek… | Mova', description: 'Le lexique de l’entraînement : VMA, FTP, CSS, seuil, tempo, fractionné, fartlek, RPE, charge, ACWR, affûtage, brick, format FIT… définitions simples.', keywords: ['glossaire course à pied', 'définition VMA', 'définition FTP', 'lexique running', 'vocabulaire entraînement', 'fartlek définition', 'RPE définition'], body: `${bc3.html}<section class="wrap" style="padding-top:26px"><span class="eyebrow">Glossaire</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Le vocabulaire de l’<em style="font-style:normal;color:var(--mint)">entraînement</em></h1><div class="toc">${sorted.map(([t]) => `<a href="#${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${t}</a>`).join('')}</div><dl class="gloss">${sorted.map(([t, d]) => `<div id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl></section>${ctaBanner()}`, ld: [bc3.ld, { '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'Glossaire de l’entraînement — Mova', hasDefinedTerm: sorted.map(([t, d]) => ({ '@type': 'DefinedTerm', name: t, description: d.replace(/<[^>]+>/g, '').replace(/→.*$/, '').trim() })) }] }));
  reg('glossaire.html', '0.7');

  const bc4 = crumbs([['Accueil', '/apropos.html'], ['Nouveautés', '/nouveautes.html']]);
  out('nouveautes.html', page({ slug: 'nouveautes.html', title: 'Nouveautés Mova : dernières fonctionnalités de l’application', description: 'Les nouveautés de Mova : jauge d’allure, séance rapide, personnalisation complète, départ instantané du GPS, envoi sur la montre, installation iPhone, athlètes certifiés.', keywords: ['nouveautés Mova', 'mises à jour application sport', 'changelog', 'nouvelles fonctionnalités'], body: `${bc4.html}<section class="wrap" style="padding-top:26px"><span class="eyebrow">Nouveautés</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Ce qui vient d’arriver dans <em style="font-style:normal;color:var(--mint)">Mova</em></h1><div class="log" style="margin-top:26px">${NEWS.map(([d, t, x]) => `<article class="reveal"><time>${d}</time><h3>${t}</h3><p>${x}</p></article>`).join('')}</div></section>${ctaBanner('Essaie les nouveautés', 'Mets à jour ton application en la rouvrant : elle se met à jour toute seule.')}`, ld: [bc4.ld] }));
  reg('nouveautes.html', '0.6', 'weekly');
}

// ————————————————————— Avis —————————————————————
{
  const bc = crumbs([['Accueil', '/apropos.html'], ['Avis', '/avis.html']]);
  const body = `${bc.html}
<section class="wrap" style="padding-top:26px;padding-bottom:0"><span class="eyebrow">Avis des utilisateurs</span><h1 style="font-size:clamp(2rem,4.6vw,3.2rem)">Ce que les sportifs disent de <em style="font-style:normal;color:var(--mint)">Mova</em></h1>
<p class="lead" style="margin:14px 0 0;max-width:680px">Des avis de vraies personnes, publiés tels quels avec la note qu’elles ont choisie, de 1 à 5 étoiles. Tu utilises Mova ? Dis-nous ce que tu en penses : c’est ce qui nous aide à l’améliorer.</p></section>
${reviewsBlock({ limit: 50, heading: 'Les avis' })}
${installBlock()}`;
  out('avis.html', page({ slug: 'avis.html', title: 'Avis Mova : ce que pensent les utilisateurs de l’application', description: 'Lis les avis des utilisateurs de Mova, l’application de coaching multi-sport, et donne le tien. Notes de 1 à 5 étoiles, publiées sans filtre.', keywords: ['avis Mova', 'Mova application avis', 'avis application course à pied', 'application running avis', 'test application coaching sportif'], body, reviews: true, ld: [bc.ld] }));
  reg('avis.html', '0.7', 'daily');
}

// ————————————————————— Plan du site —————————————————————
{
  const groups = [
    ['Mova', [['Accueil du site', '/apropos.html'], ['Fonctionnalités', '/fonctionnalites.html'], ['Tarifs', '/tarifs.html'], ['Personnaliser l’application', '/personnalisation.html'], ['Nouveautés', '/nouveautes.html'], ['Avis', '/avis.html'], ['Installer l’application', '/telecharger.html'], ['Ouvrir l’application web', '/']]],
    ['Disciplines & plans', SPORT_PAGES.map((p) => [p.crumb, `/${p.slug}`])],
    ['Outils', [['Tous les outils', '/outils.html'], ['Calculateur de VMA', '/calculateur-vma.html'], ['Calculateur d’allure', '/calculateur-allure.html'], ['Zones cardiaques', '/calculateur-frequence-cardiaque.html'], ['Calculateur de FTP', '/calculateur-ftp.html'], ['Calculateur de CSS', '/calculateur-css-natation.html']]],
    ['Guides', [['Tous les guides', '/guides.html'], ['Glossaire', '/glossaire.html'], ...ALL_GUIDES.map((g) => [g.crumb, `/${g.slug}`])]],
    ['Légal', [['Politique de confidentialité', '/privacy.html'], ['Conditions d’utilisation', '/terms.html']]],
  ];
  const body = `<section class="wrap" style="padding-top:40px"><h1 style="font-size:clamp(2rem,4.6vw,3rem)">Plan du site</h1>
<div class="cards" style="margin-top:26px">${groups.map(([t, l]) => `<div class="card"><h3>${t}</h3><ul class="ticks" style="margin-top:12px">${l.map(([n, h]) => `<li><a href="${h}">${n}</a></li>`).join('')}</ul></div>`).join('')}</div></section>`;
  out('plan-du-site.html', page({ slug: 'plan-du-site.html', title: 'Plan du site Mova', description: 'Toutes les pages du site Mova : disciplines, plans d’entraînement, calculateurs, guides, glossaire, tarifs, avis, installation.', body }));
  reg('plan-du-site.html', '0.3', 'monthly');
}

// ————————————————————— sitemap / robots —————————————————————
fs.writeFileSync(
  path.join(OUTDIR, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(OUTDIR, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUTDIR, '.nojekyll'), '');
out('404.html', page({ slug: '404.html', title: 'Page introuvable | Mova', description: 'Cette page n’existe pas. Retrouve Mova, l’application de coaching multi-sport : plans, tracker GPS, séance rapide.', noindex: true, sticky: false, body: '<section class="wrap" style="padding:90px 20px;text-align:center"><h1>Page introuvable</h1><p style="margin:14px 0 26px">Le lien est peut-être ancien. Retourne à l’accueil ou ouvre l’application.</p><div class="cta-row" style="justify-content:center"><a class="btn primary" href="/apropos.html">Accueil du site</a><a class="btn ghost" href="/">Ouvrir l’application</a></div></section>' }));
console.log(`Site vitrine : ${urls.length} pages générées (${SITE}) — API avis : ${API}`);
void squeeze;
