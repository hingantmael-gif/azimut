/** Contenu éditorial du site vitrine : pages par discipline / objectif, guides, FAQ. Tout ce qui est affirmé existe dans l'app. */

export const FAQ_HOME = [
  ['Mova est-elle un vrai coach personnel ?', 'Elle en reprend les réflexes : elle prépare ton programme sur plusieurs mois jusqu’à ta course, puis regarde chaque jour ton sommeil, ta récupération, ta charge et ton ressenti pour adapter l’intensité, à la baisse comme à la hausse. Elle ne remplace pas un entraîneur ou un médecin pour un cas particulier ou une blessure.'],
  ['Que fait Mova si j’ai mal dormi ?', 'Si le score de sommeil est médiocre (40 à 59), la séance du jour est raccourcie d’environ 45 % et l’allure ralentie d’environ 1 min 30 par km. Sous 40, elle est remplacée par du repos ou de la mobilité. Le score vient de ta montre (Garmin, Apple, Samsung, Fitbit, Huawei) ou d’une saisie manuelle.'],
  ['Mova augmente-t-elle aussi l’intensité ?', 'Oui : si tu dors bien, que l’effort ressenti est plus bas que prévu et que tu suis plus de 95 % du plan, l’allure est relevée d’environ 1,5 %. Les zones se recalent sur ton niveau réel, et toutes les allures futures sont recalculées après un nouveau chrono ou une nouvelle VMA.'],
  ['Peut-on préparer une course sur plusieurs mois ?', 'Oui. Donne ta date de course : Mova construit un programme de 3 à 36 semaines (par exemple 14 à 20 semaines pour un marathon), avec base, travail spécifique, semaines d’allègement et affûtage, puis l’ajuste chaque jour.'],
  ['Mova est-elle gratuite ?', 'Oui, l’essentiel est gratuit : ton programme, le tracker GPS, la séance rapide, le suivi de récupération et la communauté. Une formule Premium optionnelle (9,99 € par mois ou 59,99 € par an, avec 7 jours d’essai) supprime les limites (plusieurs programmes, plus d’imports et d’envois vers ta montre, plusieurs clubs) et débloque la personnalisation complète de l’application.'],
  ['Quels sports et quels objectifs Mova couvre-t-elle ?', 'Course à pied (5 km, 10 km, semi-marathon, marathon, trail), vélo, natation, triathlon et Ironman, musculation et callisthénie. Tu choisis ton objectif, ton niveau et tes jours disponibles : Mova construit le plan semaine après semaine.'],
  ['Comment Mova calcule-t-elle mes allures d’entraînement ?', 'À partir de ce que tu sais de toi : un chrono récent (5 km, 10 km, semi…), ta VMA, ton volume hebdomadaire ou tes activités importées. Mova en déduit tes zones (footing, sortie longue, seuil, allure marathon, VMA) et les applique à chaque séance. Si tu n’as encore aucune donnée, l’appli te propose de compléter ta VMA ou un chrono pour éviter des allures trop lentes ou trop rapides.'],
  ['Comment installer Mova sur iPhone ou Android sans passer par un store ?', 'Mova est une application web installable. Sur Android : menu du navigateur → « Installer l’application ». Sur iPhone : ouvre le site dans Safari, touche Partager puis « Sur l’écran d’accueil ». L’icône apparaît avec tes autres applications et s’ouvre en plein écran. Un guide pas à pas est disponible sur la page d’installation.'],
  ['Puis-je envoyer mes séances sur ma montre Garmin ?', 'Oui. Mova exporte tes séances structurées au format .FIT, à importer dans Garmin Connect pour qu’elles apparaissent sur ta montre, avec les allures et les répétitions. Les autres marques de montres sont proposées avec le format qui leur correspond.'],
  ['Puis-je importer mes sorties depuis Strava ou un fichier GPX ?', 'Oui : tu peux importer des activités au format GPX ou TCX (exportées de Strava, Garmin, Coros, Suunto…). Mova les rattache à ta séance prévue pour comparer le prévu et le réalisé.'],
  ['À quoi sert la « séance rapide » ?', 'Tu as 30 minutes et pas de plan précis ? Choisis le sport, le type de séance (footing, sortie longue, fractionné, seuil…), la durée puis l’intensité (tranquille, modérée, intense). Mova prépare une séance calée sur tes allures. Si la durée n’est pas cohérente avec le type choisi, l’app te prévient.'],
  ['Comment fonctionne le tracker GPS ?', 'Pendant la séance, une jauge en demi-cercle te montre en temps réel si tu es dans la zone d’allure (vert) ou trop rapide / trop lent (rouge). Le tracker affiche le chrono, la distance, l’allure moyenne, gère la pause automatique et peut t’encourager à la voix.'],
  ['Mes données de santé et ma position sont-elles protégées ?', 'Tu gardes la main : consentements séparés (santé, position, notifications), profil privé par défaut, export de tes données et suppression du compte depuis l’application. Les détails figurent dans la politique de confidentialité.'],
  ['Peut-on personnaliser l’apparence de l’application ?', 'Avec Premium, oui : 12 thèmes prêts à l’emploi, 20 fonds d’écran animés, couleurs libres (palette, teinte, code hexadécimal), style et forme des boutons, cartes, police et taille du texte. Les contrastes se corrigent automatiquement pour que tout reste lisible. Sans personnalisation, tu gardes l’application standard.'],
  ['Mova convient-elle aux débutants ?', 'Oui. Le niveau (débutant, intermédiaire, confirmé) règle le volume, les séances de qualité et les temps de récupération. Les échauffements et retours au calme sont inclus, et chaque étape est expliquée pendant la séance.'],
  ['Comment donner mon avis ou signaler un problème ?', 'Tu peux publier un avis sur la page « Avis » du site. Pour une question ou un bug, utilise le formulaire de contact dans l’application (Réglages → Écrire à Mova) : ton message arrive directement à l’équipe.'],
];

const SEE = { seance: ['Séance rapide', '/seance-rapide.html'], gps: ['Tracker GPS', '/tracker-gps-course.html'], vma: ['Calculateur de VMA', '/calculateur-vma.html'], allure: ['Calculateur d’allure', '/calculateur-allure.html'] };

/** Pages « discipline / objectif » : même gabarit, contenu propre. */
export const SPORT_PAGES = [
  {
    slug: 'application-course-a-pied.html',
    crumb: 'Course à pied',
    title: 'Application course à pied : plans, GPS et allures | Mova',
    description: 'Mova, l’application de course à pied : plan d’entraînement 5 km, 10 km, semi et marathon, allures calculées sur ta VMA, tracker GPS avec jauge d’allure, fractionné et sortie longue.',
    keywords: ['application course à pied', 'appli running', 'plan d’entraînement running', 'entraînement course à pied', 'allure running', 'tracker GPS course', 'fractionné', 'sortie longue', 'VMA', 'coach running'],
    h1: 'L’application de <em>course à pied</em> qui règle tes allures sur toi',
    kicker: 'Course à pied · Running',
    lead: 'Footing, sortie longue, fractionné, seuil, allure spécifique : Mova construit ton plan de course à pied semaine après semaine, avec des allures calculées d’après ton chrono, ta VMA ou ton volume — pas des chiffres au hasard.',
    img: ['accueil', 'jauge-allure', 'plan-entrainement'],
    alts: ['Accueil de l’application de course à pied Mova avec la séance du jour', 'Tracker GPS de course avec jauge d’allure en demi-cercle', 'Calendrier du plan d’entraînement running'],
    cards: [
      ['target', 'Allures personnalisées', 'Footing facile, allure marathon, seuil, VMA : chaque zone est déduite de ton chrono, de ta VMA ou de tes sorties récentes.'],
      ['route', 'Une vraie progression', 'Volume, sortie longue et séances de qualité montent progressivement, avec des semaines d’allègement pour absorber la charge.'],
      ['pin', 'Tracker GPS live', 'Chrono, distance, allure et jauge verte/rouge pour rester dans la zone visée pendant la séance.'],
      ['bolt', 'Séance rapide', '30 minutes devant toi ? Choisis footing, fractionné ou seuil : la séance est prête en quelques secondes.'],
      ['watch', 'Sur ta montre', 'Envoie tes séances structurées vers ta montre Garmin au format FIT, allures et répétitions comprises.'],
      ['moon', 'Récupération', 'Sommeil, charge d’entraînement et état de forme pour savoir quand pousser et quand lever le pied.'],
    ],
    points: ['Plans pour le 5 km, le 10 km, le semi-marathon, le marathon et le trail', 'Échauffement et retour au calme inclus dans chaque séance', 'Prédiction de chrono sur 5 km, 10 km, semi et marathon', 'Import de tes sorties en GPX / TCX pour comparer prévu et réalisé', 'Coach vocal pour t’aider à tenir l’allure'],
    steps: [['Dis-nous où tu en es', 'Objectif, niveau, jours disponibles, chrono ou VMA si tu les connais.'], ['Reçois ton plan', 'Un calendrier de séances détaillées, avec les allures et les durées de chaque étape.'], ['Cours et ajuste', 'Lance le tracker GPS, suis la jauge d’allure, puis consulte ton bilan.']],
    faq: [['Quelle application de course à pied choisir pour progresser ?', 'Une bonne application adapte les allures à ton niveau réel, varie les séances (endurance, seuil, VMA) et prévoit la récupération. C’est exactement ce que Mova fait à partir de ton chrono, de ta VMA ou de ton volume hebdomadaire.'], ['Puis-je courir avec Mova sans montre ?', 'Oui. Le tracker GPS fonctionne avec ton téléphone : chrono, distance, allure moyenne et jauge d’allure en direct.'], ['Mova propose-t-elle un plan pour débutant ?', 'Oui : choisis le niveau « débutant » et ton objectif (par exemple courir 5 km) ; le volume et les séances de qualité sont adaptés.']],
    related: [SEE.gps, SEE.seance, ['Plan 10 km', '/plan-entrainement-10km.html'], ['Plan marathon', '/plan-entrainement-marathon.html'], SEE.vma, SEE.allure],
  },
  {
    slug: 'plan-entrainement-5km.html',
    crumb: 'Plan 5 km',
    title: 'Plan d’entraînement 5 km : courir 5 km ou battre son record | Mova',
    description: 'Plan d’entraînement 5 km gratuit : de ta première course à un nouveau record. Séances de VMA, seuil et footing avec allures personnalisées, tracker GPS et suivi de récupération.',
    keywords: ['plan entraînement 5 km', 'courir 5 km', 'programme 5 km débutant', 'préparer un 5 km', 'record 5 km', 'fractionné 5 km', 'allure 5 km'],
    h1: 'Plan d’entraînement <em>5 km</em> : courir ou battre ton record',
    kicker: 'Objectif 5 km',
    lead: 'Que tu veuilles courir ton premier 5 km sans t’arrêter ou passer sous les 22 minutes, Mova assemble un plan progressif avec des séances de VMA, de seuil et d’endurance calées sur tes allures.',
    img: ['plan-entrainement', 'seance-rapide-intensite', 'accueil'],
    alts: ['Plan d’entraînement 5 km dans le calendrier Mova', 'Choix de l’intensité d’une séance de fractionné', 'Séance du jour de ton programme 5 km'],
    cards: [
      ['calendar', 'Plan sur mesure', 'De 4 à plusieurs semaines selon ton niveau, tes jours disponibles et la date de ta course.'],
      ['bolt', 'Fractionné qui compte', 'Séries courtes à allure 5 km, 400 m, 1 000 m, pyramides : l’essentiel pour progresser sur la distance.'],
      ['target', 'Allure 5 km réaliste', 'Ton allure cible est déduite de ton chrono récent ou de ta VMA.'],
      ['trend', 'Prédiction de chrono', 'Vois où tu en es et ce que ton niveau actuel permet d’espérer.'],
    ],
    points: ['Programme débutant : alterner marche et course, puis courir en continu', 'Séances de VMA, de seuil et de footing en rotation', 'Semaines d’allègement et affûtage avant la course', 'Comparaison prévu / réalisé après chaque sortie'],
    steps: [['Choisis « 5 km »', 'Sélectionne ton objectif, ton niveau et la date visée.'], ['Complète tes repères', 'Chrono ou VMA : facultatif, mais l’allure sera plus juste.'], ['Suis ton plan', 'Chaque séance détaille échauffement, corps de séance et retour au calme.']],
    faq: [['En combien de temps se préparer à un 5 km ?', 'Un débutant qui court déjà un peu peut se préparer en 6 à 8 semaines ; un coureur régulier qui vise un record travaille généralement sur 6 à 10 semaines avec 2 séances de qualité par semaine.'], ['Combien de séances par semaine pour un 5 km ?', 'Trois à quatre séances suffisent : une séance de qualité (VMA ou seuil), une sortie plus longue et un ou deux footings faciles.']],
    related: [['Plan 10 km', '/plan-entrainement-10km.html'], ['Guide : le fractionné', '/guide-fractionne.html'], SEE.vma, SEE.allure],
  },
  {
    slug: 'plan-entrainement-10km.html',
    crumb: 'Plan 10 km',
    title: 'Plan d’entraînement 10 km personnalisé et gratuit | Mova',
    description: 'Prépare ton 10 km avec un plan d’entraînement personnalisé : allures calculées sur ton chrono ou ta VMA, fractionné, seuil, sortie longue, tracker GPS et prédiction de temps.',
    keywords: ['plan entraînement 10 km', 'préparer un 10 km', 'programme 10 km', 'allure 10 km', 'objectif 10 km en 50 minutes', 'entraînement seuil', 'préparation 10 km'],
    h1: 'Plan d’entraînement <em>10 km</em> personnalisé',
    kicker: 'Objectif 10 km',
    lead: 'Pour finir ton premier 10 km ou passer sous ton temps de référence, Mova organise la semaine : sortie longue, travail au seuil, fractionné et footings, avec des allures calculées sur ton profil.',
    img: ['plan-entrainement', 'jauge-allure', 'progres'],
    alts: ['Calendrier du plan 10 km avec les séances de la semaine', 'Jauge d’allure pendant une séance au seuil', 'Suivi des progrès et du classement'],
    cards: [
      ['target', 'Allure 10 km cible', 'Déduite de ton chrono, de ta VMA ou de ton volume : tu vois l’allure à viser, minute par minute.'],
      ['timer', 'Séances au seuil', 'Blocs continus ou cruise intervals pour repousser la vitesse que tu peux tenir longtemps.'],
      ['route', 'Sortie longue progressive', 'Elle grandit au fil des semaines, avec des versions plus soutenues quand tu es prêt.'],
      ['chart', 'Charge maîtrisée', 'Suivi de la charge et de la récupération pour éviter le surentraînement.'],
    ],
    points: ['3 à 5 séances par semaine selon tes disponibilités', 'Semaine d’allègement toutes les 3 à 4 semaines', 'Affûtage la dernière semaine', 'Export sur montre Garmin et import de tes sorties réelles'],
    steps: [['Renseigne ton objectif', '« 10 km », ton niveau, tes jours et la date de course.'], ['Vérifie tes allures', 'Chrono récent ou VMA : Mova recalcule tout le plan dès que tu les mets à jour.'], ['Progresse', 'Après chaque sortie, compare le prévu et le réalisé.']],
    faq: [['Quel plan pour courir un 10 km en moins de 50 minutes ?', 'Il faut pouvoir tenir 5:00 par kilomètre : un plan alterne travail au seuil, fractionné autour de cette allure et sorties longues faciles. Renseigne « 10 km » et ton chrono, Mova calcule le reste.'], ['Combien de kilomètres par semaine pour préparer un 10 km ?', 'Entre 20 et 40 km par semaine selon le niveau. Mova adapte le volume au tien et le fait monter progressivement.']],
    related: [['Plan semi-marathon', '/plan-entrainement-semi-marathon.html'], ['Plan 5 km', '/plan-entrainement-5km.html'], ['Guide : la sortie longue', '/guide-sortie-longue.html'], SEE.allure],
  },
  {
    slug: 'plan-entrainement-semi-marathon.html',
    crumb: 'Plan semi-marathon',
    title: 'Plan d’entraînement semi-marathon (21 km) gratuit | Mova',
    description: 'Plan semi-marathon personnalisé : sorties longues progressives, allure spécifique, seuil et récupération. Allures calculées sur tes chronos, tracker GPS et prédiction du temps final.',
    keywords: ['plan semi-marathon', 'préparer un semi-marathon', 'entraînement semi 21 km', 'programme semi débutant', 'allure semi-marathon', 'semi en 1h45', 'plan 8 semaines semi'],
    h1: 'Plan d’entraînement <em>semi-marathon</em> : 21,1 km bien préparés',
    kicker: 'Objectif semi-marathon',
    lead: 'Le semi demande de l’endurance et de la régularité. Mova bâtit ta préparation autour de la sortie longue, du travail à allure semi et de semaines d’allègement, en respectant ta charge.',
    img: ['plan-entrainement', 'prediction-course', 'recuperation'],
    alts: ['Plan de préparation semi-marathon', 'Prédiction de chrono sur semi-marathon', 'Suivi de la récupération pendant la préparation'],
    cards: [
      ['route', 'Sorties longues progressives', 'De 12 à 18 km et plus selon ton niveau, avec des versions progressives pour t’habituer à l’allure course.'],
      ['target', 'Allure spécifique', 'Des blocs à allure semi pour que le jour J ne soit pas une découverte.'],
      ['trend', 'Prédiction de temps', 'Estimation du chrono sur semi d’après tes performances récentes.'],
      ['moon', 'Récupération suivie', 'Sommeil, charge et forme : le plan tient compte de ta fatigue.'],
    ],
    points: ['Préparation de 8 à 12 semaines selon ta date de course', 'Séances de seuil, de VMA et d’allure spécifique', 'Affûtage avant la course', 'Départ possible avec un chrono 10 km ou 5 km'],
    steps: [['Indique la date de ton semi', 'Mova calcule le nombre de semaines disponibles.'], ['Donne un chrono de référence', '10 km ou 5 km récents : l’allure semi en est déduite.'], ['Suis les séances', 'Chaque sortie longue et chaque bloc d’allure sont détaillés.']],
    faq: [['Combien de semaines pour préparer un semi-marathon ?', 'Comptez 8 à 12 semaines si vous courez déjà 2 à 3 fois par semaine. Un débutant complet prévoira plutôt 12 semaines ou plus.'], ['Quelle allure viser sur un semi en 1 h 45 ?', 'Environ 4:58 par kilomètre. Avec ton chrono de référence, Mova affiche l’allure cible réaliste pour ton niveau.']],
    related: [['Plan marathon', '/plan-entrainement-marathon.html'], ['Plan 10 km', '/plan-entrainement-10km.html'], SEE.allure, ['Guide : la sortie longue', '/guide-sortie-longue.html']],
  },
  {
    slug: 'plan-entrainement-marathon.html',
    crumb: 'Plan marathon',
    title: 'Plan d’entraînement marathon : préparer ses 42,195 km | Mova',
    description: 'Prépare ton marathon avec un plan personnalisé : sorties longues, allure marathon, semaines d’allègement, affûtage. Allures sur ton chrono, tracker GPS, récupération et prédiction de temps.',
    keywords: ['plan marathon', 'préparer un marathon', 'entraînement marathon', 'programme marathon 12 semaines', 'allure marathon', 'marathon en 4h', 'sortie longue marathon', 'affûtage marathon'],
    h1: 'Plan d’entraînement <em>marathon</em> : de la première semaine au jour J',
    kicker: 'Objectif marathon',
    lead: 'Un marathon se prépare sur la durée. Mova construit ton plan avec une charge qui monte progressivement, des sorties longues, du travail à allure marathon, des semaines d’allègement et un vrai affûtage.',
    img: ['plan-entrainement', 'progres', 'recuperation'],
    alts: ['Plan marathon dans le calendrier', 'Suivi de la progression et de la charge', 'Récupération et état de forme avant la course'],
    cards: [
      ['layers', 'Périodisation', 'Fondation, développement, spécifique, affûtage : chaque bloc a son rôle et sa charge.'],
      ['route', 'Sorties longues', 'Jusqu’à 30–32 km selon ton niveau, avec des versions à allure marathon en fin de préparation.'],
      ['target', 'Allure marathon', 'Calculée d’après tes chronos récents, sans te surestimer.'],
      ['heart', 'Zéro blessure inutile', 'Charge suivie, semaines d’allègement et conseils de récupération.'],
    ],
    points: ['Plans de 12 à 20 semaines selon ta date et ton niveau', 'Semaine d’allègement régulière et affûtage de 2 semaines', 'Prédiction de temps marathon d’après tes chronos', 'Nutrition et hydratation : repères pour la sortie longue'],
    steps: [['Fixe ta date de course', 'Mova compte les semaines et organise les phases.'], ['Renseigne ton niveau et ton volume', 'Kilomètres actuels par semaine, jours disponibles, chrono de référence.'], ['Avance semaine après semaine', 'Tu vois ce qui t’attend, et l’app s’adapte quand tu manques une séance.']],
    faq: [['Combien de séances par semaine pour préparer un marathon ?', 'Quatre à cinq séances est courant : une sortie longue, une séance de qualité (seuil ou allure marathon), et deux à trois footings faciles.'], ['Quelle allure pour un marathon en 4 heures ?', 'Environ 5:41 par kilomètre. L’allure réaliste dépend de ton niveau : Mova la déduit de tes chronos.']],
    related: [['Plan semi-marathon', '/plan-entrainement-semi-marathon.html'], ['Guide : la sortie longue', '/guide-sortie-longue.html'], ['Guide : récupération', '/guide-recuperation-sommeil.html'], SEE.allure],
  },
  {
    slug: 'application-velo.html',
    crumb: 'Vélo',
    title: 'Application vélo : plan d’entraînement FTP et watts | Mova',
    description: 'Mova pour le cyclisme : plans d’entraînement vélo sur route ou home-trainer, séances en watts calées sur ta FTP, sorties longues, intervalles VO2 et suivi de la charge et de la récupération.',
    keywords: ['application vélo', 'plan entraînement vélo', 'entraînement FTP', 'séances watts', 'cyclisme entraînement', 'sortie longue vélo', 'intervalles VO2 vélo', 'home trainer'],
    h1: 'L’application <em>vélo</em> qui s’entraîne à la puissance',
    kicker: 'Cyclisme · Route · Home-trainer',
    lead: 'Endurance, sorties longues, intervalles au seuil ou à VO2 : Mova exprime tes séances en pourcentage de ta FTP, avec les watts cibles pour chaque étape.',
    img: ['accueil', 'seance-rapide-type', 'progres'],
    alts: ['Séance du jour de vélo dans Mova', 'Choix du type de séance vélo : endurance, sortie longue, intervalles', 'Suivi de la charge d’entraînement'],
    cards: [
      ['bike', 'Séances en watts', 'Chaque étape affiche sa fourchette de puissance, calculée depuis ta FTP.'],
      ['bolt', 'Séance rapide vélo', 'Endurance, sortie longue ou intervalles : choisis, règle la durée et l’intensité.'],
      ['chart', 'Charge d’entraînement', 'Vois ta fatigue, ta forme et ta récupération pour progresser sans t’épuiser.'],
      ['route', 'Import de sorties', 'Ajoute tes sorties GPX / TCX pour comparer au plan.'],
    ],
    points: ['Séances d’endurance, de tempo, de seuil et de VO2', 'Sorties longues de 2 à 4 heures', 'Renseigne ta FTP pour des watts justes, ou laisse Mova estimer', 'Idéal sur route comme sur home-trainer'],
    steps: [['Renseigne ta FTP', 'Facultatif : sinon une estimation selon ton niveau est utilisée.'], ['Choisis une séance ou un plan', 'Programme vélo ou séance rapide.'], ['Roule', 'Suis les cibles de puissance étape par étape.']],
    faq: [['Qu’est-ce que la FTP ?', 'La FTP (Functional Threshold Power) est la puissance moyenne que tu peux soutenir environ une heure. Elle sert de référence pour fixer les zones d’entraînement.'], ['Faut-il un capteur de puissance ?', 'C’est idéal mais pas obligatoire : tu peux te repérer aux sensations et au temps de chaque étape.']],
    related: [['Triathlon & Ironman', '/application-triathlon.html'], SEE.seance, ['Guide : récupération', '/guide-recuperation-sommeil.html']],
  },
  {
    slug: 'application-natation.html',
    crumb: 'Natation',
    title: 'Application natation : séances de piscine et séries CSS | Mova',
    description: 'Mova pour la natation : séances d’endurance et de séries calées sur ton allure au 100 m, échauffements, retours au calme et plans pour le triathlon. Progresse en piscine avec des séances claires.',
    keywords: ['application natation', 'séances natation piscine', 'entraînement natation', 'séries CSS', 'allure 100 m', 'programme natation débutant', 'natation triathlon'],
    h1: 'L’application de <em>natation</em> qui te dit quoi nager',
    kicker: 'Natation · Piscine',
    lead: 'Endurance continue ou séries de 100 m avec repos courts : Mova prépare ta séance de piscine à partir de ton allure au 100 m, échauffement et retour au calme compris.',
    img: ['seance-rapide-type', 'seance-rapide-duree', 'accueil'],
    alts: ['Choix du type de séance de natation', 'Réglage de la durée de la séance de piscine', 'Accueil Mova avec la séance du jour'],
    cards: [
      ['drop', 'Séances prêtes', 'Endurance ou séries : mètres, répétitions et repos sont calculés pour la durée que tu as.'],
      ['timer', 'Allure au 100 m', 'Donne ton temps sur 100 m ou 400 m : les cibles s’ajustent.'],
      ['wave', 'Trois niveaux d’intensité', 'Tranquille, modérée ou intense : le rythme et les repos suivent.'],
      ['layers', 'Pour le triathlon', 'Intègre la natation à un plan multi-sport cohérent.'],
    ],
    points: ['Échauffement avec éducatifs, corps de séance, retour au calme', 'Séries de 100 m avec repos de 15 à 25 s', 'Durées de 20 à 90 minutes', 'Fonctionne en piscine ; adapte les distances en eau libre'],
    steps: [['Indique ton allure au 100 m', 'Facultatif : Mova te propose de la compléter au premier besoin.'], ['Choisis endurance ou séries', 'Puis la durée et l’intensité.'], ['Nage', 'Suis les étapes : distance, répétitions, repos.']],
    faq: [['Comment progresser en natation en piscine ?', 'Alterne des séances d’endurance continue et des séries de 100 m à une allure un peu plus rapide, avec des repos courts, en soignant l’échauffement.']],
    related: [['Triathlon & Ironman', '/application-triathlon.html'], SEE.seance, ['Application vélo', '/application-velo.html']],
  },
  {
    slug: 'application-triathlon.html',
    crumb: 'Triathlon & Ironman',
    title: 'Application triathlon & Ironman : plan multi-sport | Mova',
    description: 'Plan d’entraînement triathlon, Ironman 70.3 et 140.6 : natation, vélo et course dans un même calendrier, charge maîtrisée, séances enchaînées et suivi de la récupération. Une seule app pour les trois sports.',
    keywords: ['application triathlon', 'plan triathlon', 'entraînement ironman', 'ironman 70.3 plan', 'triathlon sprint olympique', 'préparation triathlon', 'entraînement multisport'],
    h1: 'Ton plan de <em>triathlon</em> et d’Ironman, en un seul calendrier',
    kicker: 'Triathlon · Ironman 70.3 · 140.6',
    lead: 'Natation, vélo, course à pied et renforcement dans le même plan : Mova répartit la charge entre les trois disciplines et organise la progression jusqu’à ta course.',
    img: ['plan-entrainement', 'progres', 'accueil'],
    alts: ['Calendrier multi-sport de triathlon', 'Charge d’entraînement répartie entre les disciplines', 'Séance du jour de triathlon'],
    cards: [
      ['layers', 'Trois sports, une logique', 'Les séances de natation, de vélo et de course se répartissent sans se marcher dessus.'],
      ['chart', 'Charge globale', 'Une seule courbe de forme et de fatigue pour l’ensemble de tes entraînements.'],
      ['calendar', 'Du sprint à l’Ironman', 'Sprint, olympique, 70.3 et 140.6 : la durée et le volume suivent la distance.'],
      ['dumbbell', 'Renforcement', 'Musculation et gainage intégrés pour rester solide.'],
    ],
    points: ['Périodisation en phases (fondation, spécifique, affûtage)', 'Séances enchaînées vélo-course', 'Repères pour la nutrition et l’hydratation', 'Suivi de la récupération sur l’ensemble des disciplines'],
    steps: [['Choisis ta course', 'Sprint, olympique, 70.3 ou Ironman, et sa date.'], ['Précise ton niveau dans chaque sport', 'Chrono, FTP et allure au 100 m si tu les connais.'], ['Suis le calendrier', 'Trois disciplines, une seule application.']],
    faq: [['Combien de temps pour préparer un Ironman ?', 'Une préparation complète s’étend souvent sur 20 à 24 semaines pour une personne déjà sportive. Mova organise ce temps en phases progressives.'], ['Puis-je préparer un triathlon sprint en débutant ?', 'Oui : un plan de 8 à 12 semaines avec 4 à 5 séances par semaine est courant pour un sprint.']],
    related: [['Application vélo', '/application-velo.html'], ['Application natation', '/application-natation.html'], ['Application course à pied', '/application-course-a-pied.html']],
  },
  {
    slug: 'application-musculation.html',
    crumb: 'Musculation',
    title: 'Application musculation : séances haut, bas et corps entier | Mova',
    description: 'Séances de musculation guidées : corps entier, haut ou bas du corps, ou muscles ciblés (abdos, dos, bras, jambes, pectoraux, épaules). Salle, haltères, machines, élastiques ou poids du corps, avec temps de repos adaptés.',
    keywords: ['application musculation', 'programme musculation', 'séance musculation guidée', 'entraînement haut du corps', 'entraînement jambes', 'renforcement musculaire runner', 'prise de muscle'],
    h1: 'L’application de <em>musculation</em> qui te guide série par série',
    kicker: 'Musculation · Renforcement',
    lead: 'Choisis ta zone (corps entier, haut, bas) ou tes muscles cibles, ton matériel et ta durée : Mova compose la séance et te guide exercice après exercice avec les temps de repos.',
    img: ['seance-rapide-type', 'seance-rapide-intensite', 'accueil'],
    alts: ['Choix de la zone à travailler', 'Choix de l’intensité de la séance de musculation', 'Accueil avec séance de musculation du jour'],
    cards: [
      ['dumbbell', 'Selon ton matériel', 'Salle, haltères, machines, élastiques ou poids du corps : les exercices s’adaptent.'],
      ['target', 'Muscles ciblés', 'Abdos, dos, bras, jambes, pectoraux et épaules : tu travailles ce que tu veux.'],
      ['timer', 'Repos adaptés', 'Les temps de repos suivent l’exercice et l’objectif.'],
      ['bolt', 'Intensité au choix', 'Tranquille pour la forme, modérée pour le volume, intense pour la force.'],
    ],
    points: ['Séance guidée avec minuteur de repos', 'Renforcement pour coureurs, cyclistes et triathlètes', 'Séance rapide de 10 à 90 minutes', 'Alternance biceps / triceps et mix dos + bras'],
    steps: [['Choisis la zone', 'Corps entier, haut, bas ou muscle précis.'], ['Règle la durée et l’intensité', 'La séance est ajustée au temps que tu as.'], ['Suis le guide', 'Exercice, séries, répétitions, repos.']],
    faq: [['Combien de séances de musculation par semaine ?', 'Deux à trois séances suffisent pour progresser ; le renforcement complète bien un plan de course ou de vélo.']],
    related: [['Application callisthénie', '/application-callisthenie.html'], SEE.seance],
  },
  {
    slug: 'application-callisthenie.html',
    crumb: 'Callisthénie',
    title: 'Application callisthénie : pompes, tractions, dips | Mova',
    description: 'Séances de callisthénie au poids du corps : pompes, tractions, dips, gainage et jambes. Choisis abdos, dos, bras, jambes ou haut/bas du corps, avec des temps de repos réalistes et une progression guidée.',
    keywords: ['application callisthénie', 'programme callisthénie', 'entraînement poids du corps', 'pompes tractions dips', 'street workout', 'muscle-up progression', 'entraînement abdos', 'callisthénie débutant'],
    h1: 'L’application de <em>callisthénie</em> : tout au poids du corps',
    kicker: 'Callisthénie · Poids du corps',
    lead: 'Pompes, tractions, dips, gainage, squats : Mova propose des séances de callisthénie ciblées sur la zone de ton choix, avec des repos réalistes et une intensité que tu règles.',
    img: ['seance-rapide-type', 'seance-rapide-duree', 'accueil'],
    alts: ['Choix de la zone à travailler en callisthénie', 'Réglage de la durée d’une séance de callisthénie', 'Séance du jour de callisthénie'],
    cards: [
      ['body', 'Zones et cibles', 'Abdos, dos, bras, jambes, haut ou bas du corps : tu choisis la partie à travailler.'],
      ['timer', 'Repos réalistes', 'Douze pompes ne demandent pas la même pause qu’une série de tractions : les repos suivent l’exercice.'],
      ['bolt', 'Objectif ajustable', 'Endurance, volume ou force : l’intensité règle le nombre de séries et de répétitions.'],
      ['layers', 'Avec ou sans barre', 'Des variantes pour t’entraîner partout.'],
    ],
    points: ['Séance guidée avec minuteur', 'Progressions du débutant au confirmé', 'Séance rapide de 10 à 90 minutes', 'Complément idéal pour coureurs et triathlètes'],
    steps: [['Choisis ta zone', 'Ou une cible précise : abdos, dos, bras, jambes…'], ['Règle durée et intensité', 'Tranquille, modérée ou intense.'], ['Lance la séance guidée', 'Exercices, répétitions et repos à l’écran.']],
    faq: [['Peut-on progresser en callisthénie sans matériel ?', 'Oui, les pompes, squats, fentes et gainages se font sans matériel. Une barre de traction ou des anneaux permettent d’aller plus loin sur le dos et les bras.']],
    related: [['Application musculation', '/application-musculation.html'], SEE.seance],
  },
  {
    slug: 'tracker-gps-course.html',
    crumb: 'Tracker GPS',
    title: 'Tracker GPS course à pied avec jauge d’allure en direct | Mova',
    description: 'Tracker GPS de course : chrono, distance, allure et jauge en demi-cercle qui te montre en temps réel si tu es dans la zone. Pause automatique, coach vocal, sauvegarde de séance et export.',
    keywords: ['tracker GPS course', 'application GPS running', 'allure en temps réel', 'chrono course à pied', 'pause automatique', 'coach vocal running', 'suivi GPS séance'],
    h1: 'Tracker GPS de course avec <em>jauge d’allure</em> en direct',
    kicker: 'GPS · Temps réel',
    lead: 'Un demi-cercle divisé en trois : vert au milieu (la zone cible), rouge de chaque côté. Le point suit ton allure seconde après seconde et te dit tout de suite si tu vas trop vite ou trop lentement.',
    img: ['jauge-allure', 'tracker-gps', 'accueil'],
    alts: ['Jauge d’allure en demi-cercle vert et rouge du tracker GPS', 'Tracker GPS libre avec carte, chrono, allure et distance', 'Séance guidée démarrée depuis l’accueil'],
    cards: [
      ['target', 'Allure visée en grand', 'L’allure cible de l’étape (par exemple 4:01 /km) est affichée en gros, avec la zone autour.'],
      ['bolt', 'Départ instantané', 'La séance démarre tout de suite : le GPS se cale en arrière-plan.'],
      ['pin', 'Autorisation détectée', 'Tu actives la localisation dans les réglages ? Mova le détecte sans quitter la séance.'],
      ['mic', 'Coach vocal', 'Encouragements et consignes (« accélère », « ralentis ») à la voix.'],
      ['timer', 'Pause automatique', 'Tu t’arrêtes à un feu ? Le chrono se met en pause.'],
      ['download', 'Sauvegarde & export', 'Reprends une séance plus tard, enregistre-la, exporte-la.'],
    ],
    points: ['Étapes détaillées : « Échauffement 12 minutes à 6:16 », « 5 minutes à 4:01 »', 'Barre de progression de l’étape et bouton pour passer l’étape', 'Mode séance libre avec carte et données réglables', 'Fonctionne sur téléphone, sans montre'],
    steps: [['Ouvre ta séance', 'Depuis le plan, la séance rapide ou la séance libre.'], ['Appuie sur Démarrer', 'Autorise la localisation si on te le demande.'], ['Reste dans le vert', 'Suis le point sur l’arc, puis retrouve ton bilan.']],
    faq: [['Le tracker fonctionne-t-il sans connexion ?', 'Le GPS fonctionne sans internet ; la synchronisation et la communauté demandent une connexion.'], ['Pourquoi ma localisation est-elle refusée ?', 'Autorise la localisation dans les réglages de ton navigateur ou de ton téléphone : Mova détecte l’autorisation automatiquement et démarre le GPS.']],
    related: [['Application course à pied', '/application-course-a-pied.html'], SEE.seance, ['Envoyer une séance sur sa montre', '/envoyer-seance-montre-garmin.html']],
  },
  {
    slug: 'seance-rapide.html',
    crumb: 'Séance rapide',
    title: 'Séance rapide : ta séance de sport prête en 10 secondes | Mova',
    description: 'Peu de temps ? Choisis le sport, le type (footing, sortie longue, fractionné, seuil), la durée et l’intensité : Mova génère une séance calée sur tes allures. Course, vélo, natation, musculation, callisthénie.',
    keywords: ['séance rapide sport', 'séance de course 30 minutes', 'footing 30 minutes', 'fractionné 45 minutes', 'entraînement rapide', 'séance sport courte', 'générateur de séance'],
    h1: 'La <em>séance rapide</em> : ton entraînement en 10 secondes',
    kicker: 'Séance sur mesure',
    lead: 'Quatre étapes, pas une de plus : le sport, le type de séance, la durée, l’intensité. Mova calcule la séance avec les allures de ton profil, et te prévient si la durée n’a pas de sens.',
    img: ['seance-rapide-type', 'seance-rapide-duree', 'seance-rapide-intensite'],
    alts: ['Étape 1 : choisir le type de séance', 'Étape 2 : régler la durée', 'Étape 3 : choisir l’intensité tranquille, modérée ou intense'],
    cards: [
      ['bolt', 'Toi qui décides', 'Footing, sortie longue, fractionné, seuil / tempo pour la course ; endurance, intervalles pour le vélo ; endurance ou séries pour la natation.'],
      ['timer', 'Durée cohérente', 'Une sortie longue en 20 minutes ? Mova te le dit et te propose une durée ou un autre type de séance.'],
      ['target', 'Intensité en trois crans', 'Tranquille, modérée, intense : du plus doux à « dans le rouge ».'],
      ['user', 'Allures à ta mesure', 'Basées sur ta VMA, ton chrono ou ton volume ; sinon Mova te propose de compléter l’information.'],
    ],
    points: ['Course : footing, sortie longue, fractionné, seuil / tempo', 'Vélo : endurance, sortie longue, intervalles en watts', 'Natation : endurance ou séries de 100 m', 'Musculation et callisthénie : zone du corps + intensité'],
    steps: [['Choisis le sport et le type', 'Une liste claire avec la plage de durée conseillée.'], ['Règle la durée', 'Un curseur simple, de 10 minutes à plusieurs heures selon le sport.'], ['Choisis l’intensité et lance', 'La séance démarre avec le tracker GPS ou le mode guidé.']],
    faq: [['Que faire si je n’ai pas de VMA ni de chrono ?', 'Mova te propose, avant de générer la séance, une étape facultative pour indiquer ta VMA ou un chrono récent : les allures seront beaucoup plus justes. Tu peux aussi la passer.']],
    related: [['Application course à pied', '/application-course-a-pied.html'], SEE.gps, SEE.vma],
  },
  {
    slug: 'envoyer-seance-montre-garmin.html',
    crumb: 'Envoi sur la montre',
    title: 'Envoyer une séance sur sa montre Garmin (fichier FIT) | Mova',
    description: 'Exporte tes séances d’entraînement structurées au format FIT pour ta montre Garmin : étapes, allures, répétitions. Guide simple pour retrouver la séance sur ta montre via Garmin Connect.',
    keywords: ['envoyer séance montre Garmin', 'fichier FIT entraînement', 'séance structurée Garmin', 'Garmin Connect workout', 'importer entraînement montre', 'Coros Suunto Polar séance'],
    h1: 'Envoie tes séances sur ta <em>montre Garmin</em>',
    kicker: 'Garmin · Fichier FIT',
    lead: 'Mova prépare un vrai fichier d’entraînement .FIT avec les étapes, les répétitions et les allures cibles. Une fois importé dans Garmin Connect, ta montre te guide comme n’importe quelle séance structurée.',
    img: ['plan-entrainement', 'jauge-allure', 'accueil'],
    alts: ['Séance du plan prête à être envoyée sur la montre', 'Étapes détaillées avec allures cibles', 'Accueil Mova'],
    cards: [
      ['watch', 'Séance structurée', 'Échauffement, blocs, récupérations et retour au calme, chacun avec sa cible.'],
      ['download', 'Un seul fichier', 'Un fichier .FIT est généré et proposé au téléchargement ou au partage.'],
      ['shield', 'Sans blocage', 'Un panneau d’étapes te guide au lieu d’une pile d’alertes.'],
      ['globe', 'Autres marques', 'Coros, Suunto, Polar et autres : le format adapté est proposé.'],
    ],
    points: ['Répétitions (par exemple 6 × 400 m) codées comme des boucles sur la montre', 'Allures et durées repérables pendant l’effort', 'Pas d’envoi pour la musculation ni la callisthénie (elles se font en mode guidé sur le téléphone)', 'Limite mensuelle sur l’offre gratuite'],
    steps: [['Ouvre ta séance', 'Depuis le plan ou la séance rapide.'], ['Touche « Envoyer sur la montre »', 'Choisis ta marque si on te le demande.'], ['Importe le fichier', 'Dans Garmin Connect (Entraînements → Importer) ou via le partage.']],
    faq: [['Comment importer un fichier FIT d’entraînement dans Garmin Connect ?', 'Dans Garmin Connect, ouvre le menu Entraînements → Importer, choisis le fichier .FIT, puis synchronise ta montre : la séance apparaît dans la liste des entraînements.']],
    related: [SEE.gps, ['Application course à pied', '/application-course-a-pied.html'], ['Application vélo', '/application-velo.html']],
  },
];

/** Guides (contenu rédactionnel) : bonnes pratiques, formules simples, mises en garde. */
export const GUIDES = [
  {
    slug: 'guide-vma.html',
    crumb: 'La VMA',
    title: 'La VMA : définition, test et calcul (Cooper, demi-Cooper) | Mova',
    description: 'Qu’est-ce que la VMA ? Comment la mesurer avec le test de Cooper ou le demi-Cooper, comment l’utiliser pour fixer tes allures d’entraînement et quelles séances travailler.',
    keywords: ['VMA', 'vitesse maximale aérobie', 'calcul VMA', 'test de Cooper', 'test demi-Cooper', 'zones d’entraînement VMA', 'améliorer sa VMA'],
    h1: 'La <em>VMA</em> : comprendre, mesurer et utiliser',
    body: `
<p>La <strong>VMA</strong> (vitesse maximale aérobie) est la vitesse de course à laquelle ton organisme consomme le maximum d’oxygène qu’il peut utiliser. En pratique, c’est une vitesse que l’on ne tient que 4 à 8 minutes environ : elle sert de référence pour calculer toutes tes autres allures.</p>
<h2>Comment mesurer sa VMA ?</h2>
<h3>Le test de Cooper (12 minutes)</h3>
<p>Après un bon échauffement, cours 12 minutes le plus loin possible sur une piste ou un terrain plat. <strong>VMA (km/h) ≈ distance parcourue en mètres ÷ 200.</strong> Exemple : 3 000 m en 12 minutes → 15 km/h.</p>
<h3>Le demi-Cooper (6 minutes)</h3>
<p>Même principe sur 6 minutes : <strong>VMA (km/h) ≈ distance en mètres ÷ 100.</strong> Exemple : 1 600 m en 6 minutes → 16 km/h. Il demande de bien répartir l’effort pour ne pas partir trop vite.</p>
<h3>À partir d’un chrono</h3>
<p>Un chrono récent sur 5 km donne une estimation : ta vitesse sur 5 km représente en général 90 à 95 % de ta VMA. C’est moins précis qu’un test, mais suffisant pour démarrer. Utilise notre <a href="/calculateur-vma.html">calculateur de VMA</a>.</p>
<h2>À quoi sert la VMA ?</h2>
<ul>
<li><strong>Fixer les allures :</strong> footing facile autour de 60 à 75 % de la VMA, seuil vers 80 à 90 %, séances de VMA à 95–105 %.</li>
<li><strong>Construire un fractionné :</strong> 30 s vite / 30 s lent, 6 × 400 m, 5 × 1 000 m… tout se calcule à partir d’elle.</li>
<li><strong>Suivre ta progression :</strong> refaire le test toutes les 6 à 8 semaines.</li>
</ul>
<h2>Comment progresser ?</h2>
<p>Deux leviers : le travail d’intensité (séances courtes proches de la VMA) et le volume d’endurance qui élargit ta base. Une ou deux séances de qualité par semaine suffisent, le reste en allure facile.</p>
<p><em>Avec Mova :</em> renseigne ta VMA ou un chrono récent, et toutes les allures de tes séances (footing, sortie longue, seuil, fractionné) se recalculent automatiquement, y compris dans les séances déjà planifiées.</p>`,
    related: [['Calculateur de VMA', '/calculateur-vma.html'], ['Guide : le fractionné', '/guide-fractionne.html'], ['Application course à pied', '/application-course-a-pied.html']],
  },
  {
    slug: 'guide-fractionne.html',
    crumb: 'Le fractionné',
    title: 'Fractionné en course à pied : 30/30, 400 m, seuil expliqués | Mova',
    description: 'Le fractionné, comment ça marche ? Les séances classiques (30/30, 6×400 m, 5×1000 m, seuil), les allures, la récupération et la fréquence idéale pour progresser sans se blesser.',
    keywords: ['fractionné course à pied', 'séance 30/30', '6x400 m', '5x1000 m', 'séance de seuil', 'fractionné débutant', 'VMA séance'],
    h1: 'Le <em>fractionné</em> : les séances qui font progresser',
    body: `
<p>Le fractionné consiste à alterner des <strong>efforts rapides</strong> et des <strong>récupérations lentes</strong>. Il permet de passer plus de temps à haute intensité qu’en courant d’un seul trait, donc de progresser plus vite en vitesse et en endurance.</p>
<h2>Les séances de base</h2>
<ul>
<li><strong>30/30 :</strong> 30 secondes à allure VMA, 30 secondes de trot, en séries de 8 à 12 répétitions. Idéal pour débuter le travail de VMA.</li>
<li><strong>6 × 400 m :</strong> allure 5 km ou un peu plus vite, 1 minute de récupération. Développe la vitesse et l’économie de course.</li>
<li><strong>5 × 1 000 m :</strong> allure 10 km à 5 km, 2 minutes de récupération. Très spécifique pour le 5 et le 10 km.</li>
<li><strong>Seuil (cruise intervals) :</strong> 3 × 8 minutes à allure seuil, 2 minutes de récupération. Repousse la vitesse tenable longtemps.</li>
<li><strong>Fartlek :</strong> alternance libre, plus ludique, avec des temps rapides et lents variés.</li>
</ul>
<h2>Règles d’or</h2>
<ul>
<li>Échauffe-toi 10 à 15 minutes en footing lent, avec quelques accélérations.</li>
<li>Reste sur des allures maîtrisées : le fractionné doit être régulier du premier au dernier effort.</li>
<li>Une à deux séances de qualité par semaine, jamais deux jours d’affilée.</li>
<li>Termine par un retour au calme de 5 à 10 minutes.</li>
</ul>
<h2>Quelles allures ?</h2>
<p>Elles se calculent d’après ta VMA ou un chrono récent. Le plus simple est de laisser l’application le faire : les séances de la <a href="/seance-rapide.html">séance rapide</a> et de ton plan affichent l’allure de chaque effort, et la <a href="/tracker-gps-course.html">jauge d’allure</a> t’aide à la tenir.</p>`,
    related: [['Guide : la VMA', '/guide-vma.html'], ['Séance rapide', '/seance-rapide.html'], ['Tracker GPS', '/tracker-gps-course.html']],
  },
  {
    slug: 'guide-sortie-longue.html',
    crumb: 'La sortie longue',
    title: 'La sortie longue en course à pied : durée, allure, fréquence | Mova',
    description: 'Tout sur la sortie longue : à quoi elle sert, combien de temps, à quelle allure, quand la faire progresser et comment la placer dans un plan 10 km, semi ou marathon.',
    keywords: ['sortie longue', 'sortie longue course à pied', 'durée sortie longue', 'allure sortie longue', 'sortie longue marathon', 'sortie longue semi', 'endurance fondamentale'],
    h1: 'La <em>sortie longue</em> : la séance clé de l’endurance',
    body: `
<p>La sortie longue est la séance la plus importante d’un plan d’endurance : elle développe ton endurance, ta résistance à la fatigue et ton habitude à gérer l’effort longtemps.</p>
<h2>Combien de temps ?</h2>
<p>Une bonne règle : entre <strong>25 et 35 % du volume hebdomadaire</strong>, sans dépasser environ 2 h 30 pour la plupart des coureurs (jusqu’à 3 h pour un marathon selon le niveau). Pour un 10 km, 1 h à 1 h 15 suffit ; pour un semi, 1 h 30 à 1 h 45.</p>
<h2>À quelle allure ?</h2>
<p>Facile : tu dois pouvoir parler. C’est en général plus lent que ton footing habituel, 1 à 1 min 30 par kilomètre plus lent que l’allure de course visée sur 10 km. Une <em>sortie longue progressive</em> peut finir à allure marathon sur les derniers kilomètres.</p>
<h2>Comment progresser ?</h2>
<ul>
<li>Augmente la durée de 10 % environ chaque semaine, avec une semaine plus légère toutes les 3 à 4 semaines.</li>
<li>Emporte de l’eau et, au-delà d’1 h 15, quelque chose à manger.</li>
<li>Après la sortie, prévois une journée facile.</li>
</ul>
<p><em>Dans Mova :</em> la séance rapide propose la « sortie longue » à partir de 60 minutes et te prévient si la durée choisie est trop courte. Ton plan la place chaque semaine et la fait grandir progressivement.</p>`,
    related: [['Plan marathon', '/plan-entrainement-marathon.html'], ['Plan semi-marathon', '/plan-entrainement-semi-marathon.html'], ['Séance rapide', '/seance-rapide.html']],
  },
  {
    slug: 'guide-recuperation-sommeil.html',
    crumb: 'Récupération',
    title: 'Récupération sportive : sommeil, charge et fatigue expliqués | Mova',
    description: 'Comment récupérer efficacement : sommeil, alternance charge / repos, semaines d’allègement, signaux de fatigue et outils pour suivre sa forme (charge d’entraînement, récupération).',
    keywords: ['récupération sportive', 'sommeil et sport', 'charge d’entraînement', 'surentraînement', 'semaine d’allègement', 'fatigue sportive', 'récupération musculaire'],
    h1: 'La <em>récupération</em> : là où l’on progresse vraiment',
    body: `
<p>On ne progresse pas pendant l’entraînement, mais <strong>pendant la récupération qui le suit</strong>. Trop de charge sans repos mène à la fatigue chronique et aux blessures.</p>
<h2>Les leviers</h2>
<ul>
<li><strong>Le sommeil :</strong> 7 à 9 heures pour la plupart des adultes. C’est le premier outil de récupération.</li>
<li><strong>L’alternance :</strong> les jours difficiles sont suivis d’un jour facile ou de repos.</li>
<li><strong>Les semaines d’allègement :</strong> réduire le volume de 20 à 30 % toutes les 3 à 4 semaines.</li>
<li><strong>L’alimentation et l’hydratation :</strong> des glucides et des protéines après les séances longues ou intenses.</li>
</ul>
<h2>Les signaux d’alerte</h2>
<p>Fatigue persistante, jambes lourdes, sommeil perturbé, baisse de motivation ou de performance, fréquence cardiaque de repos qui monte : ce sont des signaux à écouter. En cas de douleur ou de doute, consulte un professionnel de santé.</p>
<h2>Suivre sa charge</h2>
<p>La charge d’entraînement (durée × intensité) se compare à ta forme du moment. Mova calcule ces courbes, affiche un état de forme et propose des séances de récupération (étirements, mobilité, foam rolling) avec un chronomètre intégré.</p>`,
    related: [['Application course à pied', '/application-course-a-pied.html'], ['Guide : la sortie longue', '/guide-sortie-longue.html']],
  },
];
