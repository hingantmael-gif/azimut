/**
 * Conditions d’utilisation Azimut — texte unifié (app + site).
 * Contenu original ; structure détaillée type apps sportives (compte, santé, données, responsabilité).
 */

export const TERMS_LAST_UPDATED = '8 septembre 2026';
export const TERMS_VERSION = '2026.09';

export type TermsBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

export type TermsSection = {
  id: string;
  title: string;
  blocks: TermsBlock[];
};

export const TERMS_INTRO =
  `Conditions d’utilisation Azimut — version ${TERMS_VERSION} (${TERMS_LAST_UPDATED}). ` +
  `Ces Conditions constituent un contrat entre toi et Azimut concernant l’accès et l’utilisation ` +
  `de l’application, du site et des services associés (ci-après les « Services »). ` +
  `En cochant « J’accepte », en créant un compte, en te connectant ou en utilisant les Services, ` +
  `tu confirmes avoir lu, compris et accepté l’intégralité des présentes Conditions, y compris ` +
  `les dispositions relatives aux données personnelles. Si tu n’acceptes pas ces Conditions, ` +
  `tu ne dois pas utiliser les Services.`;

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'agreement',
    title: '1. Acceptation et modifications',
    blocks: [
      {
        type: 'p',
        text:
          'Azimut peut mettre à jour ces Conditions pour refléter l’évolution des Services, ' +
          'des exigences légales ou de la sécurité. La date de « dernière mise à jour » et le ' +
          'numéro de version figurent en tête du document. En cas de changement substantiel, ' +
          'Azimut s’efforce d’en informer les utilisateurs via l’application ou le site. ' +
          'La poursuite de l’utilisation après la date d’effet vaut acceptation des Conditions ' +
          'modifiées. Si tu refuses une modification, tu dois cesser d’utiliser les Services ' +
          'et peux demander la suppression de ton compte.',
      },
    ],
  },
  {
    id: 'service',
    title: '2. Description des Services',
    blocks: [
      {
        type: 'p',
        text:
          'Azimut est une application de coaching et de suivi multi-sport destinée à un usage ' +
          'personnel. Selon les fonctionnalités disponibles à un moment donné, les Services ' +
          'peuvent inclure notamment :',
      },
      {
        type: 'ul',
        items: [
          'création et suivi de plans d’entraînement (course, vélo, natation, triathlon, Ironman, musculation, multi-sport) ;',
          'calendrier de séances, notes coach, adaptation selon ton profil et tes retours (ex. RPE) ;',
          'enregistrement ou import d’activités, statistiques, progression et classements ludiques ;',
          'outils de récupération, sommeil saisi, nutrition indicative, prédiction de performances ;',
          'profil utilisateur, paramètres de confidentialité, éventuelle dimension sociale (groupes, abonnements) ;',
          'installation en PWA, synchronisation compte (appareil / serveur), connexions optionnelles (ex. Google) ;',
          'pages d’information et d’installation du site hingantmael-gif.github.io.',
        ],
      },
      {
        type: 'p',
        text:
          'Azimut se réserve le droit d’ajouter, modifier, suspendre ou retirer tout ou partie ' +
          'des fonctionnalités, sans obligation de maintenir une fonctionnalité particulière ' +
          'indéfiniment. Certaines fonctions peuvent être limitées, expérimentales ou réservées ' +
          'à des comptes spécifiques.',
      },
    ],
  },
  {
    id: 'eligibility',
    title: '3. Conditions d’éligibilité et capacité',
    blocks: [
      {
        type: 'p',
        text:
          'Les Services s’adressent aux personnes majeures selon le droit applicable dans ton ' +
          'pays de résidence (en France : 18 ans). Si tu as entre 16 et 18 ans (ou l’âge de la ' +
          'majorité numérique localement applicable), tu ne peux utiliser les Services qu’avec ' +
          'l’accord d’un parent ou tuteur légal, qui reste responsable de ton usage. ' +
          'Les Services ne sont pas destinés aux enfants de moins de 16 ans. En t’inscrivant, ' +
          'tu déclares disposer de la capacité juridique pour conclure ce contrat et ne pas ' +
          'être interdit(e) d’utiliser ce type de service.',
      },
    ],
  },
  {
    id: 'account',
    title: '4. Compte utilisateur',
    blocks: [
      {
        type: 'p',
        text: 'Pour accéder à la plupart des Services, tu dois créer un compte. Tu t’engages à :',
      },
      {
        type: 'ul',
        items: [
          'fournir des informations exactes, à jour et complètes (identité, e-mail, profil sportif, etc.) et les mettre à jour rapidement ;',
          'créer un seul compte pour ton usage personnel et ne pas le partager, le vendre ni le céder ;',
          'protéger tes identifiants (mot de passe fort, non réutilisé) et ne pas laisser un tiers accéder à ton compte ;',
          'nous informer sans délai de toute utilisation non autorisée ou suspicion de compromission ;',
          'faire en sorte que les activités associées à ton compte reflètent tes propres séances (pas d’usurpation ni de données fictives destinées à tromper).',
        ],
      },
      {
        type: 'p',
        text:
          'Tu es responsable de toutes les actions réalisées via ton compte. Azimut peut ' +
          'refuser, suspendre ou résilier un compte en cas d’informations inexactes, de ' +
          'comptes multiples abusifs, de violation des présentes Conditions ou de risque ' +
          'pour la sécurité des Services ou des autres utilisateurs.',
      },
    ],
  },
  {
    id: 'auth-third-party',
    title: '5. Connexion via des services tiers (ex. Google)',
    blocks: [
      {
        type: 'p',
        text:
          'Si tu choisis de te connecter avec Google (ou un autre fournisseur d’identité ' +
          'proposé), tu autorises Azimut à recevoir certaines données d’identité (par ex. ' +
          'e-mail, nom) selon les permissions que tu accordes. Ton usage de Google reste ' +
          'soumis aux conditions et à la politique de confidentialité de Google. Azimut ' +
          'n’est pas responsable des indisponibilités ou décisions du fournisseur tiers. ' +
          'Tu peux révoquer l’accès depuis les réglages de ton compte Google, ce qui peut ' +
          'limiter certaines fonctionnalités Azimut.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: '6. Règles d’usage acceptable',
    blocks: [
      {
        type: 'p',
        text: 'Tu t’engages à utiliser les Services de manière loyale et légale. Il est notamment interdit de :',
      },
      {
        type: 'ul',
        items: [
          'contourner les mesures de sécurité, d’accéder sans autorisation aux systèmes, comptes ou données d’autrui ;',
          'perturber, surcharger ou compromettre l’infrastructure (scraping agressif, robots non autorisés, attaques, reverse engineering abusif) ;',
          'diffuser des contenus illicites, haineux, harcelants, diffamatoires, pornographiques illégaux, ou portant atteinte aux droits de tiers ;',
          'usurper l’identité d’autrui, falsifier des performances de façon trompeuse dans un contexte compétitif ou social ;',
          'utiliser les Services à des fins commerciales non autorisées (revente de plans, spam, publicité non sollicitée) ;',
          'extraire massivement les contenus Azimut pour entraîner des modèles ou créer un service concurrent sans autorisation écrite.',
        ],
      },
      {
        type: 'p',
        text:
          'Azimut peut retirer des contenus, limiter des fonctionnalités ou suspendre un ' +
          'compte en cas de manquement, avec ou sans préavis selon la gravité.',
      },
    ],
  },
  {
    id: 'user-content',
    title: '7. Tes contenus et licence accordée à Azimut',
    blocks: [
      {
        type: 'p',
        text:
          'Tu conserves les droits sur les contenus que tu fournis (profil, bio, photos, ' +
          'activités, commentaires, notes, données de séance, etc. — les « Contenus ' +
          'Utilisateur »). En les publiant ou en les synchronisant via les Services, tu ' +
          'accordes à Azimut une licence mondiale, non exclusive, gratuite, transférable ' +
          'et sous-licenciable, pour héberger, stocker, reproduire, adapter (format, ' +
          'affichage, compression), afficher et traiter ces Contenus uniquement afin de ' +
          'fournir, améliorer, sécuriser et promouvoir les Services (y compris sauvegarde, ' +
          'analyse agrégée anonymisée, support).',
      },
      {
        type: 'p',
        text:
          'Tu garantis disposer des droits nécessaires sur tes Contenus et qu’ils ne ' +
          'violent pas la loi ni les droits de tiers. Tu peux supprimer certains contenus ' +
          'ou ton compte ; des copies techniques peuvent subsister un temps limité dans ' +
          'les sauvegardes. Les contenus partagés avec d’autres utilisateurs peuvent ' +
          'demeurer visibles selon les paramètres de confidentialité et les copies déjà ' +
          'réalisées par ces utilisateurs.',
      },
    ],
  },
  {
    id: 'ip',
    title: '8. Propriété intellectuelle Azimut',
    blocks: [
      {
        type: 'p',
        text:
          'Les Services, le logiciel, le design, les textes, graphismes, logos, marques, ' +
          'bases de programmes d’entraînement, algorithmes de coaching, documentation et ' +
          'autres éléments fournis par Azimut sont protégés par le droit de la propriété ' +
          'intellectuelle. Aucune disposition des présentes ne te transfère de droits de ' +
          'propriété. Tu disposes d’un droit d’usage personnel, non exclusif, non ' +
          'cessible et révocable, strictement limité à l’utilisation conforme des Services. ' +
          'Toute reproduction, extraction, modification ou exploitation commerciale non ' +
          'autorisée est interdite.',
      },
    ],
  },
  {
    id: 'health',
    title: '9. Santé, entraînement et avertissement médical',
    blocks: [
      {
        type: 'p',
        text:
          'IMPORTANT — Les informations, plans, allures, volumes, scores, messages coach, ' +
          'outils de récupération, sommeil, nutrition ou prédiction fournis par Azimut ou ' +
          'par des tiers via les Services sont destinés à des fins informatives et de ' +
          'coaching sportif général. Ils ne constituent PAS un avis médical, un diagnostic, ' +
          'un traitement, ni un dispositif médical au sens de la réglementation applicable.',
      },
      {
        type: 'ul',
        items: [
          'Consulte un médecin ou un professionnel de santé qualifié avant de commencer ou modifier un programme d’entraînement, surtout en cas d’antécédents, de grossesse, de pathologie, de reprise après blessure ou d’intensité élevée.',
          'N’ignore jamais un avis médical ni ne retarde une consultation en raison d’informations issues des Services.',
          'Adapte toujours l’effort à ta condition du jour ; arrête-toi en cas de douleur anormale, malaise, vertiges, douleur thoracique ou symptômes inquiétants, et cherche une aide médicale si nécessaire.',
          'Les estimations (allures, VMA, RPE, charges) sont approximatives et peuvent être inexactes ; tu restes seul(e) juge de ce que tu peux accomplir en sécurité.',
        ],
      },
      {
        type: 'p',
        text:
          'Dans toute la mesure permise par la loi, Azimut décline toute responsabilité ' +
          'pour les blessures, problèmes de santé ou dommages résultant de l’utilisation ' +
          'ou de la confiance accordée aux contenus d’entraînement des Services.',
      },
    ],
  },
  {
    id: 'outdoor',
    title: '10. Sécurité des activités outdoor et environnement',
    blocks: [
      {
        type: 'p',
        text:
          'Lorsque tu t’entraînes à l’extérieur (route, trail, vélo, eau libre, etc.), tu ' +
          'es seul(e) responsable de ta sécurité et du respect du code de la route, des ' +
          'règles locales, de la météo, du matériel et de l’environnement. Azimut ne ' +
          'fournit pas de service de secours. Ne te fie pas exclusivement à l’app pour la ' +
          'navigation critique. Emporte de l’eau, un moyen d’appeler les secours, et ' +
          'informe quelqu’un de ta sortie si tu t’éloignes. La baignade en eau libre ' +
          'comporte des risques spécifiques (courants, température, visibilité) : ne nage ' +
          'jamais au-delà de tes compétences et respecte les consignes locales.',
      },
    ],
  },
  {
    id: 'privacy',
    title: '11. Données personnelles et confidentialité',
    blocks: [
      {
        type: 'p',
        text:
          'Azimut traite des données personnelles pour fournir et sécuriser les Services. ' +
          'Selon ton usage, les catégories peuvent inclure :',
      },
      {
        type: 'ul',
        items: [
          'données de compte : e-mail, identifiant, nom, photo, mot de passe hashé, préférences ;',
          'données d’authentification Google si tu choisis cette connexion ;',
          'profil sportif : sport, niveau, objectifs, jours d’entraînement, volumes, matériel, intentions d’onboarding ;',
          'données d’activité et de santé saisies ou générées : séances, GPS éventuel, RPE, sommeil, métriques dérivées ;',
          'données techniques : type d’appareil, journaux nécessaires à la sécurité et au diagnostic, jetons de session.',
        ],
      },
      {
        type: 'p',
        text:
          'Finalités principales : création et gestion du compte, personnalisation des ' +
          'plans, affichage du calendrier et des stats, sécurité (lutte contre la fraude), ' +
          'amélioration des Services, et communication liée au service (ex. support). Bases ' +
          'légales typiques (RGPD) : exécution du contrat, intérêt légitime (sécurité, ' +
          'amélioration), et consentement lorsque requis (ex. certaines permissions ' +
          'appareil ou communications marketing si proposées).',
      },
      {
        type: 'p',
        text:
          'Stockage : données sur ton appareil (stockage local / PWA) et/ou sur des ' +
          'serveurs d’authentification et d’hébergement utilisés par Azimut (par ex. ' +
          'infrastructure cloud). Durées : aussi longtemps que ton compte est actif, puis ' +
          'suppression ou anonymisation dans un délai raisonnable après clôture, sauf ' +
          'obligations légales ou besoins de preuve. Azimut ne vend pas tes données ' +
          'personnelles.',
      },
      {
        type: 'p',
        text:
          'Tes droits (RGPD / droit français) : accès, rectification, effacement, ' +
          'limitation, opposition, portabilité lorsque applicable, et retrait du ' +
          'consentement. Tu peux exercer ces droits via Paramètres → Compte / Aide dans ' +
          'l’app, ou en contactant le support. Tu peux également introduire une réclamation ' +
          'auprès de la CNIL (www.cnil.fr). Les paramètres de visibilité du profil ' +
          '(public, abonnés, privé) te permettent de contrôler une partie du partage ' +
          'social ; ils ne remplacent pas les présentes règles de traitement.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '12. Stockage local, PWA et technologies similaires',
    blocks: [
      {
        type: 'p',
        text:
          'L’application web / PWA utilise des technologies de stockage local (par ex. ' +
          'localStorage, cache du service worker) pour faire fonctionner l’app hors ligne ' +
          'partiel, mémoriser la session et accélérer le chargement. Ces mécanismes sont ' +
          'nécessaires au service. Tu peux les effacer via les réglages du navigateur ou ' +
          'en désinstallant la PWA ; cela peut te déconnecter ou réinitialiser des données ' +
          'uniquement locales.',
      },
    ],
  },
  {
    id: 'integrations',
    title: '13. Services et appareils tiers',
    blocks: [
      {
        type: 'p',
        text:
          'Les Services peuvent renvoyer vers ou interagir avec des sites, API, montres, ' +
          'plateformes sportives ou outils tiers. Azimut ne contrôle pas ces services et ' +
          'n’est pas responsable de leur contenu, disponibilité, sécurité ou politiques. ' +
          'Ton utilisation de ces tiers est régie par leurs propres conditions. Toute ' +
          'perte liée à un tiers (données perdues, synchro défaillante, etc.) relève, ' +
          'sauf faute d’Azimut prouvée, de la relation avec ce tiers.',
      },
    ],
  },
  {
    id: 'availability',
    title: '14. Disponibilité, maintenance et absence de garantie',
    blocks: [
      {
        type: 'p',
        text:
          'Les Services sont fournis « en l’état » et « selon disponibilité ». Azimut ne ' +
          'garantit pas que les Services seront ininterrompus, exempts d’erreurs, de ' +
          'virus ou adaptés à un usage particulier, ni que les plans ou métriques seront ' +
          'exacts ou complets. Des maintenances, pannes réseau, mises à jour PWA ou ' +
          'incidents cloud peuvent survenir. Dans les limites autorisées par la loi, ' +
          'toutes garanties implicites sont exclues.',
      },
    ],
  },
  {
    id: 'liability',
    title: '15. Limitation de responsabilité',
    blocks: [
      {
        type: 'p',
        text:
          'Dans toute la mesure permise par le droit applicable, Azimut et ses ' +
          'contributeurs ne sauraient être responsables des dommages indirects, ' +
          'accessoires, spéciaux, consécutifs ou punitifs, ni des pertes de données, de ' +
          'profits, d’opportunité ou de réputation, résultant de l’usage ou de ' +
          'l’impossibilité d’utiliser les Services — y compris blessures liées à ' +
          'l’activité sportive, décisions prises sur la base des plans, ou actions d’autres ' +
          'utilisateurs.',
      },
      {
        type: 'p',
        text:
          'La responsabilité totale d’Azimut pour tout litige lié aux Services est, sauf ' +
          'faute lourde ou dol, ou atteinte à l’intégrité physique résultant d’une faute ' +
          'd’Azimut, limitée au montant que tu as éventuellement payé à Azimut au titre ' +
          'des Services au cours des douze (12) mois précédant le fait générateur, ou à ' +
          'cinquante (50) euros si tu n’as rien payé. Rien dans les présentes n’exclut ' +
          'les responsabilités qui ne peuvent être limitées en droit de la consommation ' +
          '(UE / France) lorsque tu agis en qualité de consommateur.',
      },
    ],
  },
  {
    id: 'indemnity',
    title: '16. Indemnisation',
    blocks: [
      {
        type: 'p',
        text:
          'Tu t’engages à indemniser et dégager Azimut de toute réclamation, perte ou ' +
          'frais (y compris honoraires raisonnables) résultant de ton usage illicite des ' +
          'Services, de tes Contenus Utilisateur, ou de ta violation des présentes ' +
          'Conditions ou des droits de tiers.',
      },
    ],
  },
  {
    id: 'termination',
    title: '17. Suspension, résiliation et suppression de compte',
    blocks: [
      {
        type: 'p',
        text:
          'Tu peux cesser d’utiliser les Services à tout moment et demander la ' +
          'suppression de ton compte via les paramètres prévus à cet effet (Compte / ' +
          'sécurité) ou via le support. Azimut peut suspendre ou résilier l’accès, avec ' +
          'ou sans préavis, en cas de violation des Conditions, de risque sécurité, ' +
          'd’inactivité prolongée, d’obligation légale, ou de cessation des Services. En ' +
          'cas de résiliation, le droit d’accès cesse ; les licences nécessaires à ' +
          'l’exploitation déjà consentie et les dispositions qui par leur nature doivent ' +
          'survivre (propriété intellectuelle, limitations de responsabilité, droit ' +
          'applicable, etc.) demeurent en vigueur.',
      },
    ],
  },
  {
    id: 'law',
    title: '18. Droit applicable et litiges',
    blocks: [
      {
        type: 'p',
        text:
          'Les présentes Conditions sont régies par le droit français, sous réserve des ' +
          'dispositions impératives du pays de résidence du consommateur. En cas de ' +
          'litige, tu es invité(e) à contacter d’abord le support afin de rechercher une ' +
          'solution amiable. À défaut, les tribunaux français compétents pourront être ' +
          'saisis, sans préjudice des droits du consommateur de saisir les juridictions ' +
          'de son lieu de résidence lorsque la loi l’autorise. La médiation de la ' +
          'consommation peut être proposée lorsque applicable.',
      },
    ],
  },
  {
    id: 'general',
    title: '19. Dispositions générales',
    blocks: [
      {
        type: 'ul',
        items: [
          'Si une clause est jugée invalide, les autres restent en vigueur.',
          'Le fait de ne pas exercer un droit ne vaut pas renonciation.',
          'Tu ne peux céder ce contrat sans accord écrit d’Azimut ; Azimut peut céder le contrat en cas de réorganisation ou de transfert d’activité.',
          'Les présentes Conditions (et tout document expressément incorporé) constituent l’intégralité de l’accord relatif aux Services et remplacent les versions antérieures.',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: '20. Contact',
    blocks: [
      {
        type: 'p',
        text:
          'Pour toute question sur ces Conditions, l’exercice de tes droits ou le ' +
          'support : utilise Aide / Compte dans l’application, ou écris à ' +
          'support@endurance-coach.app. Mentions complémentaires éventuelles : page ' +
          '« À propos » du site.',
      },
    ],
  },
];
