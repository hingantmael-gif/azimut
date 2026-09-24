/**
 * Le « coach personnel » de Mova : programmes sur plusieurs mois + adaptation quotidienne (réduction ET hausse d'intensité).
 * Chaque affirmation correspond à une règle réelle du moteur (src/engines : sleepAdaptation, dailyAdjustment, sentinel,
 * readinessScore, athleteDigitalTwin, planAdaptation, progressiveLearning, programDurationDb…). Les seuils cités sont ceux du code.
 */
import { API, HOME, SITE, crumbs, ctaBanner, faqBlock, faqLd, icon, page, phone, rawIcon } from './lib.mjs';

const li = (items) => `<ul class="ticks">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const trust = (items) => `<div class="trust">${items.map((t) => `<span>${rawIcon('check')} ${t}</span>`).join('')}</div>`;

export const REDUCE = [
  ['Sommeil médiocre (score 40 à 59)', 'La séance du jour est <b>raccourcie d’environ 45 %</b> et l’allure <b>ralentie d’environ 1 min 30 par km</b>.', 'moon'],
  ['Sommeil très faible (score < 40)', 'La séance est <b>remplacée par du repos ou de la mobilité</b>, avec la raison affichée.', 'moon'],
  ['Variabilité cardiaque (HRV) en chute de plus de 10 %', 'Le volume de la séance est <b>réduit de 25 %</b>.', 'heart'],
  ['Effort ressenti supérieur à 8/10', 'Le volume est <b>réduit de 25 %</b> sur la séance suivante.', 'bolt'],
  ['Charge aiguë trop haute (ratio charge récente / habituelle)', 'La séance devient une <b>récupération facile</b>.', 'chart'],
  ['Prêt à moins de 55 %, forme en creux ou sommeil < 55', 'Mova propose une <b>version allégée à environ 70 %</b> (50 % si la fatigue est marquée).', 'target'],
  ['Prêt à moins de 32 %, forme très basse ou semaine allégée conseillée', '<b>Repos conseillé</b> ce jour-là, avec l’explication.', 'shield'],
  ['Séances sautées (35 % ou plus sur 14 jours)', 'Le volume à venir <b>baisse de 15 à 25 %</b> pour coller à ton vrai rythme.', 'calendar'],
  ['Séance imprévue dure juste avant une séance de qualité', 'La qualité est <b>remplacée par un footing de récupération</b> ; une sortie longue est <b>allégée de 35 %</b> ; une séance modérée retire 10 à 20 %.', 'route'],
  ['Démarrage après de mauvaises nuits (moyenne < 60 sur 5 jours)', 'Les <b>premières séances sont adoucies</b>, puis la charge remonte progressivement.', 'layers'],
];

export const INCREASE = [
  ['Tu dors très bien (score > 80), l’effort ressenti est plus bas que prévu et tu suis plus de 95 % du plan', 'L’allure est <b>relevée d’environ 1,5 %</b> : tu progresses sans attendre.', 'trend'],
  ['Tu cours plus vite que la séance prévue', 'Tes zones sont <b>resserrées</b> (jusqu’à −3 %) : les prochaines allures suivent ton niveau réel. Plus lent que prévu ? Elles s’assouplissent (jusqu’à +4 %).', 'target'],
  ['Nouveau chrono, nouvelle VMA ou belles sorties récentes', 'Toutes les allures des séances <b>à venir sont recalculées</b> (VMA glissante estimée sur tes meilleures sorties récentes).', 'timer'],
  ['Tu encaisses bien la charge', 'Le volume monte par paliers, <b>dans la limite que ton corps tolère</b> (tolérance de hausse hebdomadaire apprise, 10 % au départ).', 'chart'],
];

export const SIGNALS = [
  ['moon', 'Sommeil', 'Score de ta montre (Garmin, Apple, Samsung, Fitbit, Huawei) ramené à une échelle commune, ou saisi à la main. Dette de sommeil sur 3 jours.'],
  ['heart', 'Variabilité cardiaque (HRV)', 'Ta nuit comparée à ta base des 7 derniers jours, et la tendance sur 14 jours.'],
  ['chart', 'Charge et forme', 'Charge aiguë / chronique et forme (modèle de Banister : fitness, fatigue, équilibre).'],
  ['body', 'Récupération musculaire', 'Seize groupes musculaires suivis : frais, en récupération, fatigués ou sollicités.'],
  ['bolt', 'Effort ressenti', 'Ton RPE après chaque séance, comparé à celui que Mova avait prévu.'],
  ['user', 'Stress de vie', 'Un signal que tu peux renseigner pour tenir compte de ta semaine.'],
];

export function timeline(weeks) {
  const taper = weeks >= 16 ? 3 : weeks >= 10 ? 2 : 1;
  const specific = Math.max(1, Math.round((weeks - taper) * 0.45));
  const base = weeks - taper - specific;
  const w = (n) => `${(n / weeks) * 100}%`;
  return `<div class="tl"><div class="tl-title">${weeks} semaines</div><div class="tl-bar"><i style="width:${w(base)};background:linear-gradient(90deg,#22d3ee,#3dff9a)">Base ${base} sem.</i><i style="width:${w(specific)};background:linear-gradient(90deg,#fbbf24,#fb923c);color:#2a1300">Spécifique ${specific} sem.</i><i style="width:${w(taper)};background:linear-gradient(90deg,#a78bfa,#818cf8)">Affûtage ${taper} sem.</i></div></div>`;
}

const DURATIONS = [
  ['5 km', '4 à 8 semaines', '3 à 16', '12 km'],
  ['10 km', '6 à 10 semaines', '4 à 18', '16 km'],
  ['Semi-marathon', '10 à 14 semaines', '6 à 24', '22 km'],
  ['Marathon', '14 à 20 semaines', '10 à 28', '32 km'],
  ['Trail', '12 à 16 semaines', '8 à 28', '35 km'],
  ['Triathlon sprint', '8 à 12 semaines', '6 à 20', '12 km'],
  ['Triathlon olympique', '12 à 16 semaines', '8 à 24', '16 km'],
  ['Ironman 70.3', '12 à 18 semaines', '10 à 24', '22 km'],
  ['Ironman 140.6', '20 à 28 semaines', '16 à 36', '28 km'],
];

/** Bloc court pour la page d'accueil : le coach algorithmique en premier. */
export function coachLanding(A) {
  return `<section id="coach" class="alt"><div class="wrap">
<div class="head center reveal"><span class="eyebrow">Ton coach personnel</span><h2>Un programme sur des mois. Une décision chaque matin.</h2>
<p>Mova ne te donne pas un plan figé. Elle prépare ta course sur plusieurs mois, puis ajuste chaque séance à ta forme du jour : mauvaise nuit, fatigue ou grande forme, l’intensité baisse ou monte pour toi.</p></div>
<div class="cards">
<article class="card reveal">${icon('calendar')}<h3>Ton programme, de 3 à 36 semaines</h3><p>Base, travail spécifique, affûtage, semaines d’allègement, sorties longues progressives : tout est planifié jusqu’à la date de ta course.</p><a class="more" href="/programme-course-plusieurs-mois.html">Voir la préparation →</a></article>
<article class="card reveal">${icon('moon')}<h3>Il lit ton sommeil et ta récupération</h3><p>Nuit médiocre : séance raccourcie d’environ 45 % et allure ralentie. Nuit très faible : repos. HRV en baisse, charge trop haute : Mova lève le pied.</p><a class="more" href="/sommeil-readiness-entrainement.html">Voir comment →</a></article>
<article class="card reveal">${icon('trend')}<h3>Il monte aussi l’intensité</h3><p>Bien reposé, séances plus faciles que prévu, plan suivi à plus de 95 % : l’allure est relevée. Nouveau chrono : toutes tes allures futures sont recalculées.</p><a class="more" href="/coach-personnel.html">Toutes les règles →</a></article>
</div>
<div class="split" style="margin-top:46px">
<div class="media reveal">${phone('coach-adapte', A('coach-adapte'))}${phone('coach-explique', A('coach-explique'))}</div>
<div class="reveal"><span class="eyebrow">Chaque matin</span><h2>Go, allégé ou repos : et il t’explique pourquoi</h2>
<p style="margin-top:12px">Mova combine six signaux (HRV, sommeil, forme, récupération musculaire, effort ressenti, stress) en un score de forme du jour, puis décide.</p>
${li(['<b>Readiness 65 % · sommeil faible :</b> séance à alléger, version allégée proposée.', '<b>« Pourquoi ? »</b> : la raison dominante est toujours affichée.', '<b>Tu gardes la main :</b> « Voir l’ajustement » ou « Démarrer quand même ».', '<b>Il apprend de toi :</b> ton jumeau numérique affine tes seuils à chaque séance.'])}
<div class="cta-row" style="margin-top:22px"><a class="btn primary" href="/coach-personnel.html">Découvrir le coach</a></div></div>
</div>
</div></section>`;
}

const FAQ_COACH = [
  ['Mova est-elle vraiment un coach personnel ?', 'Elle fait ce que ferait un coach attentif : elle bâtit ton programme jusqu’à ta course, regarde chaque jour comment tu as dormi, récupéré et ressenti tes séances, puis adapte l’intensité, à la baisse comme à la hausse. Elle ne remplace pas un entraîneur ni un médecin pour les objectifs très spécifiques ou en cas de blessure.'],
  ['Comment Mova sait-elle que j’ai mal dormi ?', 'Par le score de sommeil de ta montre (Garmin, Apple, Samsung, Fitbit, Huawei) ou par une saisie manuelle. Le score est ramené à une échelle commune : un 72 sur Apple n’est pas un 72 sur Garmin.'],
  ['Que se passe-t-il si je dors mal ?', 'Score de 40 à 59 : la séance du jour est raccourcie d’environ 45 % et l’allure ralentie d’environ 1 min 30 par km. Score inférieur à 40 : elle est remplacée par du repos ou de la mobilité. Au-dessus de 60, le plan est maintenu.'],
  ['Mova augmente-t-elle aussi l’intensité ?', 'Oui. Si tu dors bien (score > 80), que l’effort ressenti est plus bas que prévu et que tu suis plus de 95 % du plan, l’allure est relevée d’environ 1,5 %. Les zones se recalent aussi quand tu cours plus vite que prévu, et toutes les allures futures sont recalculées après un nouveau chrono ou une nouvelle VMA.'],
  ['Puis-je refuser une adaptation ?', 'Oui. Mova propose, tu décides : l’écran d’accueil offre « Voir l’ajustement » et « Démarrer quand même ». Le coach explique toujours la raison dominante de sa décision.'],
  ['Faut-il une montre ?', 'Non, mais elle enrichit l’analyse (sommeil, HRV, fréquence cardiaque de repos). Sans montre, tu peux saisir ton sommeil à la main et noter ton effort ressenti après chaque séance.'],
  ['Est-ce un avis médical ?', 'Non. La Sentinelle détecte des signaux de surcharge d’entraînement et donne des recommandations d’entraînement, jamais de diagnostic. En cas de douleur ou de doute, consulte un professionnel de santé.'],
];

/** Génère les trois pages « coach ». */
export function buildCoachPages({ out, reg, A, APP_LD }) {
  // ————— 1) Coach personnel —————
  {
    const bc = crumbs([['Accueil', '/apropos.html'], ['Coach personnel', '/coach-personnel.html']]);
    const body = `${bc.html}
<section class="hero" style="padding-top:30px"><div class="wrap"><div class="grid">
<div><span class="eyebrow">Coach personnel · Algorithme adaptatif</span>
<h1 style="font-size:clamp(2.1rem,5vw,3.6rem)">Un vrai <em>coach personnel</em>, recalculé chaque jour pour toi</h1>
<p class="lead">Ton programme est construit sur plusieurs mois vers ta course. Puis, chaque matin, Mova regarde ton sommeil, ta récupération, ta charge et ton ressenti : elle réduit l’intensité quand il le faut, la relève quand tu es prêt.</p>
<div class="cta-row"><a class="btn primary" href="/">Créer mon programme gratuitement</a><a class="btn ghost" href="#regles">Voir toutes les règles</a></div>
${trust(['Programme jusqu’à 36 semaines', '6 signaux de forme analysés', 'Tu gardes toujours la main'])}</div>
<div class="hero-shots">${phone('sommeil-score', A('sommeil-score'), 'p1')}${phone('coach-adapte', A('coach-adapte'), 'p2', true)}${phone('coach-explique', A('coach-explique'), 'p3')}</div>
</div></div></section>

<section class="alt"><div class="wrap"><div class="head center reveal"><span class="eyebrow">Trois niveaux d’intelligence</span><h2>Long terme, jour après jour, et il apprend de toi</h2></div>
<div class="cards">
<article class="card reveal">${icon('calendar')}<h3>1 · Le programme, sur des mois</h3><p>Ta date de course, ton niveau et tes jours libres fixent la durée (de 3 à 36 semaines) et découpent la préparation en phases, avec des semaines d’allègement et un affûtage.</p><a class="more" href="/programme-course-plusieurs-mois.html">Voir la préparation →</a></article>
<article class="card reveal">${icon('target')}<h3>2 · La décision du jour</h3><p>Chaque matin : go, séance allégée ou repos. Mova combine sommeil, HRV, forme, récupération musculaire, effort ressenti et stress, puis explique sa décision.</p><a class="more" href="#regles">Voir les règles →</a></article>
<article class="card reveal">${icon('sparkle')}<h3>3 · Il apprend de toi</h3><p>Ton « jumeau numérique » ajuste, séance après séance, ta vitesse de récupération, ta sensibilité au manque de sommeil ou à la HRV, et la charge que tu tolères.</p><a class="more" href="#jumeau">Comment il apprend →</a></article>
</div></div></section>

<section><div class="wrap"><div class="head center reveal"><span class="eyebrow">Ce que Mova détecte</span><h2>Six signaux, un score de forme du jour</h2>
<p>Ils sont pondérés (HRV 30 %, sommeil 20 %, forme 20 %, récupération musculaire 15 %, effort ressenti 10 %, stress 5 %) puis personnalisés selon ta façon de réagir. Avec une montre compatible ou en saisie manuelle.</p></div>
<div class="cards">${SIGNALS.map(([i, t, d]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join('')}</div></div></section>

<section id="regles" class="alt"><div class="wrap"><div class="head reveal"><span class="eyebrow">Quand Mova réduit l’intensité</span><h2>Ce qui se passe, précisément</h2><p>Voici les règles réellement appliquées par l’algorithme, avec leurs seuils.</p></div>
<div class="tablewrap reveal"><table><thead><tr><th>Ce que Mova détecte</th><th>Ce qu’elle fait</th></tr></thead><tbody>${REDUCE.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div></div></section>

<section><div class="wrap"><div class="head reveal"><span class="eyebrow">Quand Mova augmente l’intensité</span><h2>Elle sait aussi accélérer</h2><p>Un bon coach ne fait pas que freiner : il te pousse quand tu es prêt.</p></div>
<div class="cards two">${INCREASE.map(([a, b, i]) => `<article class="card reveal">${icon(i)}<h3 style="font-size:1.02rem">${a}</h3><p>${b}</p></article>`).join('')}</div></div></section>

<section class="alt"><div class="wrap split">
<div class="reveal"><span class="eyebrow">La Sentinelle</span><h2>Détecter la surcharge avant qu’elle ne devienne une blessure</h2>
<p style="margin-top:12px">Cinq signaux sont surveillés en continu. Ils donnent un score de risque et un niveau : <b>OK</b>, <b>à surveiller</b>, <b>adapter</b> ou <b>semaine allégée</b>.</p>
${li(['Charge aiguë par rapport à ta charge habituelle (ACWR)', 'Tendance de la HRV sur 14 jours', 'Effort ressenti qui monte à charge égale', 'Hausse de volume au-dessus de ta tolérance', 'Signal de gêne récente'])}
<p class="note" style="margin-top:14px">Recommandations d’entraînement uniquement : jamais de diagnostic médical.</p></div>
<div class="media reveal">${phone('recuperation-hrv', A('recuperation-hrv'))}${phone('recuperation', A('recuperation'))}</div>
</div></section>

<section id="jumeau"><div class="wrap split rev">
<div class="reveal"><span class="eyebrow">Ton jumeau numérique</span><h2>Plus tu t’entraînes, mieux il te connaît</h2>
<p style="margin-top:12px">Après chaque séance, Mova compare ce qu’elle avait prévu à ce que tu as vécu. L’apprentissage se fait sur ton téléphone et affine :</p>
${li(['ta <b>vitesse de récupération</b> (constantes de fitness et de fatigue)', 'ta <b>sensibilité à la HRV</b> et à la <b>dette de sommeil</b>', 'ton <b>biais d’effort ressenti</b> (tu surestimes ou sous-estimes ?)', 'ton <b>seuil de charge</b> personnel (1,3 au départ)', 'la <b>hausse de volume que tu tolères</b> (10 % au départ)'])}</div>
<div class="media reveal">${phone('progres', A('progres'))}${phone('prediction-course', A('prediction-course'))}</div>
</div></section>

<section class="alt"><div class="wrap"><div class="head center reveal"><span class="eyebrow">Autour du programme</span><h2>D’autres réflexes de coach, automatiques</h2></div>
<div class="cards">
<article class="card reveal">${icon('calendar')}<h3>Tu changes tes jours libres</h3><p>Les séances à venir sont déplacées sans régénérer tout le plan, en respectant les délais de récupération.</p></article>
<article class="card reveal">${icon('route')}<h3>Un trou dans ton planning</h3><p>Si le calendrier reste vide trop longtemps, un footing de récupération est ajouté pour garder le rythme.</p></article>
<article class="card reveal">${icon('layers')}<h3>Trop de sports à la fois</h3><p>Quand tu empiles programmes et séances, Mova mesure la charge cumulée et te prévient si c’est trop.</p></article>
<article class="card reveal">${icon('timer')}<h3>Respect des délais de récupération</h3><p>Footing 12 à 24 h, seuil 24 à 36 h, VMA 48 à 72 h, renforcement 48 h avant une qualité : les séances dures ne s’enchaînent pas.</p></article>
<article class="card reveal">${icon('shield')}<h3>Des garde-fous</h3><p>Pas de sortie longue absurde (jamais 42 km pour un marathon), plafonds de volume : déclarer 100 km par semaine ne force pas un plan hors de portée.</p></article>
<article class="card reveal">${icon('mic')}<h3>Pendant la séance</h3><p>La jauge d’allure et le coach vocal (« accélère », « ralentis ») te tiennent dans la zone visée.</p></article>
</div></div></section>

${faqBlock(FAQ_COACH, 'Questions sur le coach')}
${ctaBanner('Un coach qui s’adapte à toi', 'Crée ton programme gratuitement : dès la première semaine, il s’ajuste à ton sommeil et à ta forme.')}`;
    out('coach-personnel.html', page({ slug: 'coach-personnel.html', title: 'Coach sportif personnalisé : plan qui s’adapte à ton sommeil | Mova', description: 'Mova est un coach personnel par algorithme : programme sur plusieurs mois, intensité réduite si ton sommeil est mauvais, relevée quand tu es prêt. HRV, charge, RPE, jumeau numérique.', keywords: ['coach sportif personnalisé', 'coach personnel application', 'plan d’entraînement adaptatif', 'entraînement adapté au sommeil', 'adapter l’intensité entraînement', 'readiness entraînement', 'HRV entraînement', 'coaching algorithme sport', 'plan d’entraînement intelligent', 'application coach running'], body, preload: 'coach-adapte', reviews: false, ld: [bc.ld, faqLd(FAQ_COACH), { ...APP_LD, url: `${SITE}/coach-personnel.html` }] }));
    reg('coach-personnel.html', '0.9');
  }

  // ————— 2) Programme sur plusieurs mois —————
  {
    const bc = crumbs([['Accueil', '/apropos.html'], ['Programme sur plusieurs mois', '/programme-course-plusieurs-mois.html']]);
    const faq = [
      ['Combien de temps faut-il pour préparer une course ?', 'Cela dépend de la course et de ton niveau : par exemple 6 à 10 semaines pour un 10 km, 10 à 14 pour un semi, 14 à 20 pour un marathon et 20 à 28 pour un Ironman. Mova calcule les semaines restantes jusqu’à ta date de course et reste dans une fourchette cohérente (elle te prévient si c’est trop court ou trop long).'],
      ['Que se passe-t-il si je change ma date de course ou mes jours libres ?', 'Le programme se recale : les séances à venir sont déplacées en respectant les délais de récupération, sans tout régénérer.'],
      ['Le plan s’adapte-t-il si je manque des séances ?', 'Oui. Si tu sautes 35 % ou plus des séances sur 14 jours, Mova réduit le volume à venir de 15 à 25 % pour rester réaliste. Une séance imprévue dure allège aussi la séance suivante.'],
      ['Puis-je préparer plusieurs sports en même temps ?', 'Oui. Mova mesure la charge du planning combiné et te prévient si tu en fais trop.'],
      ['Mon plan tient-il compte de mon chrono ?', 'Oui : tes allures viennent de ton chrono, de ta VMA ou de ton volume, et se recalculent dès que tu mets un nouveau chrono ou une nouvelle VMA.'],
    ];
    const body = `${bc.html}
<section class="hero" style="padding-top:30px"><div class="wrap"><div class="grid">
<div><span class="eyebrow">Préparation de course</span><h1 style="font-size:clamp(2.1rem,5vw,3.5rem)">Prépare ta course sur <em>plusieurs mois</em>, semaine après semaine</h1>
<p class="lead">Donne ta date de course : Mova construit un programme de 3 à 36 semaines avec des phases claires, des sorties longues progressives, des semaines d’allègement et un affûtage. Puis elle l’ajuste à ta forme, chaque jour.</p>
<div class="cta-row"><a class="btn primary" href="/">Créer mon programme</a><a class="btn ghost" href="/coach-personnel.html">Comment il s’adapte</a></div>
${trust(['5 km au marathon, trail, triathlon, Ironman', 'Recalé si tu changes de date', 'Garde-fous anti-surcharge'])}</div>
<div class="hero-shots">${phone('plan-entrainement', A('plan-entrainement'), 'p1')}${phone('accueil', A('accueil'), 'p2', true)}${phone('prediction-course', A('prediction-course'), 'p3')}</div>
</div></div></section>

<section class="alt"><div class="wrap"><div class="head reveal"><span class="eyebrow">Durées</span><h2>Une durée pensée pour ta course</h2><p>Mova calcule les semaines jusqu’à ta date de course, dans une fourchette cohérente pour l’objectif et ton niveau (débutant, intermédiaire, confirmé).</p></div>
<div class="tablewrap reveal"><table><thead><tr><th>Objectif</th><th>Durée conseillée</th><th>Bornes (semaines)</th><th>Pic de sortie longue</th></tr></thead><tbody>${DURATIONS.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></section>

<section><div class="wrap"><div class="head reveal"><span class="eyebrow">Périodisation</span><h2>Base, spécifique, affûtage</h2><p>Le programme est découpé en phases. Chacune a sa charge et son rôle. Voici la répartition pour quatre durées.</p></div>
<div class="tls reveal">${[8, 12, 16, 24].map(timeline).join('')}</div>
<div class="legend reveal"><span><i style="background:#3dff9a"></i>Base : endurance et régularité</span><span><i style="background:#fbbf24"></i>Spécifique : allure de course</span><span><i style="background:#a78bfa"></i>Affûtage : fraîcheur</span></div></div></section>

<section class="alt"><div class="wrap split">
<div class="reveal"><span class="eyebrow">Progression</span><h2>Monter en charge sans se blesser</h2>
${li(['<b>Sorties longues progressives</b> jusqu’à un pic réaliste (jamais la distance de la course).', '<b>Semaines d’allègement</b> régulières pour absorber la charge.', '<b>Volume plafonné</b> selon l’objectif : déclarer 100 km par semaine ne pousse pas le plan hors de portée.', '<b>Part de la sortie longue</b> limitée à environ 25 à 30 % du volume hebdomadaire.', '<b>Hausse de volume</b> dans ta tolérance personnelle, apprise avec le temps.'])}</div>
<div class="reveal">${li(['<b>Délais de récupération</b> : footing 12 à 24 h, seuil 24 à 36 h, VMA 48 à 72 h.', '<b>Sorties longues espacées</b> des séances de qualité.', '<b>Renforcement</b> au moins 48 h avant une séance dure.', '<b>Multi-sport</b> : alerte si tu empiles trop de séances.'])}
<div class="media" style="margin-top:22px">${phone('recuperation', A('recuperation'))}</div></div>
</div></section>

<section><div class="wrap"><div class="head center reveal"><span class="eyebrow">Un programme vivant</span><h2>Il change quand ta vie change</h2></div>
<div class="cards">
<article class="card reveal">${icon('calendar')}<h3>Nouveaux jours libres</h3><p>Les séances à venir sont déplacées sans tout refaire.</p></article>
<article class="card reveal">${icon('target')}<h3>Nouveau chrono ou VMA</h3><p>Toutes les allures des séances futures sont recalculées.</p></article>
<article class="card reveal">${icon('moon')}<h3>Mauvaises nuits, fatigue</h3><p>La séance du jour s’adapte (voir les règles du coach).</p></article>
<article class="card reveal">${icon('route')}<h3>Séances sautées ou en trop</h3><p>Le volume et la séance suivante sont ajustés.</p></article>
<article class="card reveal">${icon('trend')}<h3>Prédiction de chrono</h3><p>Ton temps estimé sur 5 km, 10 km, semi et marathon évolue avec tes séances.</p></article>
<article class="card reveal">${icon('award')}<h3>Bilan de semaine</h3><p>Charge, séances faites et prévues, kilomètres : tu vois ta progression.</p></article>
</div></div></section>

${faqBlock(faq, 'Questions sur les programmes')}
${ctaBanner('Prépare ta course avec un vrai plan', 'Choisis ton objectif et ta date : ton programme est prêt en quelques minutes.')}`;
    out('programme-course-plusieurs-mois.html', page({ slug: 'programme-course-plusieurs-mois.html', title: 'Programme d’entraînement sur plusieurs mois pour préparer sa course | Mova', description: 'Prépare une course sur plusieurs mois : programme de 3 à 36 semaines avec périodisation, sorties longues, semaines d’allègement et affûtage. 10 km, semi, marathon, trail, triathlon, Ironman.', keywords: ['programme entraînement plusieurs mois', 'préparation marathon 16 semaines', 'plan semi-marathon 12 semaines', 'périodisation course à pied', 'préparation course longue durée', 'plan ironman 24 semaines', 'affûtage', 'plan d’entraînement jusqu’à la course'], body, preload: 'plan-entrainement', ld: [bc.ld, faqLd(faq), { ...APP_LD, url: `${SITE}/programme-course-plusieurs-mois.html` }] }));
    reg('programme-course-plusieurs-mois.html', '0.9');
  }

  // ————— 3) Sommeil / readiness —————
  {
    const bc = crumbs([['Accueil', '/apropos.html'], ['Sommeil et entraînement', '/sommeil-readiness-entrainement.html']]);
    const faq = [
      ['À partir de quel score de sommeil Mova réduit-elle l’intensité ?', 'En dessous de 60 sur l’échelle commune (type Garmin / Fitbit) : de 40 à 59, la séance est raccourcie d’environ 45 % et l’allure ralentie d’environ 1 min 30 par km ; sous 40, elle est remplacée par du repos ou de la mobilité. À partir de 60, rien ne change.'],
      ['Mon score Apple Watch est de 72 : est-ce bon ?', 'Sur Apple, 72 correspond à « Correct ». Mova convertit les scores de chaque marque vers une échelle commune avant de décider, pour ne pas te pénaliser à tort.'],
      ['Puis-je saisir mon sommeil à la main ?', 'Oui : score et durée peuvent être saisis sans montre, pour une nuit ou pour un jour oublié.'],
      ['Qu’est-ce que la « readiness » ?', 'C’est ton score de forme du jour (0 à 100) : il combine HRV, sommeil, forme, récupération musculaire, effort ressenti et stress. Il détermine si la séance du jour reste telle quelle, est allégée ou remplacée par du repos.'],
      ['La séance est-elle modifiée sans me prévenir ?', 'Non : la raison est affichée (« Pourquoi ? ») et tu peux voir l’ajustement ou démarrer quand même.'],
    ];
    const body = `${bc.html}
<section class="hero" style="padding-top:30px"><div class="wrap"><div class="grid">
<div><span class="eyebrow">Sommeil · HRV · Readiness</span><h1 style="font-size:clamp(2.1rem,5vw,3.5rem)">Tu as mal dormi ? Mova <em>réduit l’intensité</em> pour toi</h1>
<p class="lead">Ton entraînement ne devrait pas ignorer ta nuit. Mova lit ton sommeil, ta variabilité cardiaque et ta récupération, puis adapte la séance du jour : plus courte, plus douce, ou remplacée par du repos.</p>
<div class="cta-row"><a class="btn primary" href="/">Essayer gratuitement</a><a class="btn ghost" href="/coach-personnel.html">Voir tout le coach</a></div>
${trust(['Compatible Garmin, Apple, Samsung, Fitbit, Huawei', 'Saisie manuelle possible', 'Tu gardes la main'])}</div>
<div class="hero-shots">${phone('coach-explique', A('coach-explique'), 'p1')}${phone('coach-adapte', A('coach-adapte'), 'p2', true)}${phone('sommeil-score', A('sommeil-score'), 'p3')}</div>
</div></div></section>

<section class="alt"><div class="wrap"><div class="head reveal"><span class="eyebrow">Sommeil</span><h2>Trois bandes, trois décisions</h2></div>
<div class="cards">
<article class="card reveal">${icon('check')}<h3>60 et plus · maintenu</h3><p>Sommeil correct à excellent : la séance est maintenue. Elle peut même être relevée si tu dors très bien et que tes séances te paraissent faciles.</p></article>
<article class="card reveal">${icon('moon')}<h3>40 à 59 · allégé</h3><p>Séance <b>raccourcie d’environ 45 %</b> et allure <b>ralentie d’environ 1 min 30 par km</b>. Tu bouges, sans t’épuiser.</p></article>
<article class="card reveal">${icon('shield')}<h3>Moins de 40 · repos</h3><p>Séance <b>remplacée par du repos ou de la mobilité</b>, avec « justificatif : sommeil » affiché.</p></article>
</div>
<p class="note" style="margin-top:14px">Les scores sont ramenés à une échelle commune : un 72 sur Apple Watch (« Correct ») n’est pas un 72 sur Garmin.</p></div></section>

<section><div class="wrap split">
<div class="reveal"><span class="eyebrow">Readiness</span><h2>Un score de forme du jour, expliqué</h2>
<p style="margin-top:12px">Six composantes, pondérées puis personnalisées grâce à ton jumeau numérique :</p>
<div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Composante</th><th>Poids de départ</th></tr></thead><tbody><tr><td>Variabilité cardiaque (HRV)</td><td>30 %</td></tr><tr><td>Sommeil</td><td>20 %</td></tr><tr><td>Forme (charge / fatigue)</td><td>20 %</td></tr><tr><td>Récupération musculaire</td><td>15 %</td></tr><tr><td>Effort ressenti</td><td>10 %</td></tr><tr><td>Stress de vie</td><td>5 %</td></tr></tbody></table></div></div>
<div class="reveal"><h3>Ce que ça change concrètement</h3>${li(['<b>Moins de 55 %</b>, forme en creux ou sommeil < 55 : version allégée (environ 70 %).', '<b>Fatigue marquée</b> : environ 50 % du volume prévu.', '<b>Moins de 32 %</b> ou surcharge détectée : repos conseillé.', '<b>Ligne « Pourquoi ? »</b> : la raison dominante est toujours affichée.', '<b>Prédiction d’effort</b> : Mova indique l’effort attendu avant que tu démarres.'])}
<div class="media" style="margin-top:22px">${phone('recuperation-hrv', A('recuperation-hrv'))}</div></div>
</div></section>

<section class="alt"><div class="wrap"><div class="head center reveal"><span class="eyebrow">Autres signaux</span><h2>Le sommeil n’est pas seul</h2></div>
<div class="cards">${SIGNALS.slice(1).map(([i, t, d]) => `<article class="card reveal">${icon(i)}<h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
<p style="text-align:center;margin-top:26px"><a class="btn ghost" href="/coach-personnel.html">Toutes les règles d’adaptation</a></p></div></section>

${faqBlock(faq, 'Questions sur le sommeil et l’adaptation')}
${ctaBanner('Un entraînement qui écoute ton corps', 'Connecte ta montre ou saisis ton sommeil : Mova adapte tes séances dès demain matin.')}`;
    out('sommeil-readiness-entrainement.html', page({ slug: 'sommeil-readiness-entrainement.html', title: 'Sommeil et entraînement : l’appli qui réduit l’intensité si tu dors mal | Mova', description: 'Mauvaise nuit ? Mova détecte ton sommeil (Garmin, Apple, Samsung, Fitbit, Huawei) et raccourcit ou remplace la séance. Score de forme du jour (readiness), HRV, charge, récupération.', keywords: ['sommeil et entraînement', 'entraînement mauvaise nuit', 'adapter séance sommeil', 'score de sommeil sport', 'HRV entraînement', 'readiness score', 'récupération sportive application', 'plan d’entraînement adapté à la fatigue', 'surentraînement'], body, preload: 'coach-adapte', ld: [bc.ld, faqLd(faq), { ...APP_LD, url: `${SITE}/sommeil-readiness-entrainement.html` }] }));
    reg('sommeil-readiness-entrainement.html', '0.9');
  }
  void API;
  void HOME;
}
