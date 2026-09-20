import {
  TERMS_INTRO,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
  TERMS_VERSION,
  type TermsBlock,
} from './azimutTerms';
import { CNIL, HOSTS, LEGAL_CONTACT_CHANNEL, LEGAL_CONTACT_SHORT, PUBLISHER } from './publisher';

/**
 * Centre légal Mova : CGU, confidentialité (RGPD), santé & sécurité, permissions, mentions légales.
 * Contenu structuré (résumé « en bref », tableaux, encadrés) — rendu par src/ui/legal.
 */

export type LegalDocId = 'terms' | 'privacy' | 'health' | 'permissions' | 'notice';

export type CalloutTone = 'info' | 'ok' | 'warn' | 'danger';

export type LegalBlock =
  | TermsBlock
  | { type: 'callout'; tone: CalloutTone; title?: string; text: string }
  | { type: 'cards'; items: { title: string; lines: { label: string; value: string }[] }[] }
  | { type: 'steps'; items: string[] }
  | { type: 'link'; label: string; doc: LegalDocId };

export type LegalSection = {
  id: string;
  title: string;
  /** Une phrase en langage clair, visible même section repliée. */
  summary?: string;
  blocks: LegalBlock[];
};

export type LegalDoc = {
  id: LegalDocId;
  title: string;
  subtitle: string;
  icon: string; // Ionicons
  color: string;
  intro?: string;
  keyPoints?: string[];
  sections: LegalSection[];
};

export const LEGAL_VERSION = TERMS_VERSION;
export const LEGAL_UPDATED = TERMS_LAST_UPDATED;
export { LEGAL_CONTACT_CHANNEL, LEGAL_CONTACT_SHORT };

/** Résumé en une phrase de chaque article des CGU. */
const TERMS_SUMMARY: Record<string, string> = {
  agreement: 'En utilisant Mova, tu acceptes ces règles. On t’informe si elles changent.',
  service: 'Un coach multi-sport : plans, séances, suivi, progression, classement.',
  eligibility: 'Réservé aux 18 ans et plus (dès 16 ans avec l’accord d’un parent).',
  account: 'Un compte par personne, des infos exactes, un mot de passe que tu gardes pour toi.',
  'auth-third-party': 'Connexion Google possible : Mova ne reçoit que l’e-mail et le nom.',
  'acceptable-use': 'Pas de triche, de piratage, de harcèlement ni de revente des contenus.',
  'user-content': 'Tes données restent à toi ; Mova les utilise seulement pour faire fonctionner le service.',
  ip: 'L’app, les logos et les programmes appartiennent à Mova : usage personnel uniquement.',
  health: 'Mova n’est pas un avis médical. Consulte un médecin avant de t’y mettre.',
  outdoor: 'Dehors, tu restes responsable de ta sécurité : code de la route, météo, secours.',
  privacy: 'Quelles données, pourquoi, combien de temps — détail dans la Politique de confidentialité.',
  cookies: 'Stockage local uniquement pour la session et la vitesse — pas de pub, pas de traqueurs.',
  integrations: 'Montres et services tiers : leurs règles s’appliquent, pas celles de Mova.',
  availability: 'Service fourni « en l’état » : des pannes ou erreurs peuvent arriver.',
  liability: 'La responsabilité de Mova est limitée dans les cas permis par la loi.',
  indemnity: 'Tu réponds de tes usages illicites du service.',
  termination: 'Tu peux partir et supprimer ton compte à tout moment.',
  law: 'Droit français ; on cherche d’abord une solution amiable.',
  general: 'Si une clause tombe, les autres restent valables.',
  contact: 'Une question ? Écris-nous ou passe par l’aide dans l’app.',
};

const termsSections: LegalSection[] = TERMS_SECTIONS.map((s) => {
  const blocks: LegalBlock[] = s.blocks.map((b) =>
    b,
  );
  if (s.id === 'health') {
    blocks.push({ type: 'link', label: 'Ouvrir le guide Santé & sécurité', doc: 'health' });
  }
  if (s.id === 'privacy') {
    blocks.push({ type: 'link', label: 'Ouvrir la Politique de confidentialité', doc: 'privacy' });
  }
  return { id: s.id, title: s.title, summary: TERMS_SUMMARY[s.id], blocks };
});

const terms: LegalDoc = {
  id: 'terms',
  title: 'Conditions d’utilisation',
  subtitle: 'Le contrat entre toi et Mova',
  icon: 'document-text',
  color: '#2563EB',
  intro: TERMS_INTRO,
  keyPoints: [
    'Mova est un outil de coaching sportif, pas un service médical.',
    'Tu es majeur (ou tu as l’accord d’un parent dès 16 ans).',
    'Tes données restent les tiennes ; Mova ne les vend pas.',
    'Tu peux supprimer ton compte à tout moment.',
  ],
  sections: termsSections,
};

const privacy: LegalDoc = {
  id: 'privacy',
  title: 'Politique de confidentialité',
  subtitle: 'Tes données : lesquelles, pourquoi, tes droits',
  icon: 'shield-checkmark',
  color: '#0B8262',
  intro:
    'Cette politique explique, en langage clair, comment Mova collecte et protège tes données personnelles, ' +
    'conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.',
  keyPoints: [
    'Mova ne vend jamais tes données et n’affiche aucune publicité ciblée.',
    'Ta position n’est utilisée que pendant une séance que tu lances toi-même.',
    'Ton profil est privé tant que tu ne changes pas ce réglage.',
    'Tu peux exporter ou supprimer toutes tes données depuis Compte et sécurité.',
  ],
  sections: [
    {
      id: 'controller',
      title: '1. Qui est responsable de tes données ?',
      summary: 'Mova, éditeur de l’application — joignable à l’adresse ci-dessous.',
      blocks: [
        {
          type: 'p',
          text:
            `Le responsable du traitement est ${PUBLISHER.name} (${PUBLISHER.status.toLowerCase()}). ` +
            `Pour toute question sur tes données ou pour exercer tes droits : utilise ${LEGAL_CONTACT_CHANNEL}.`,
        },
      ],
    },
    {
      id: 'data',
      title: '2. Les données que nous traitons',
      summary: 'Compte, profil sportif, activités, santé saisie, position GPS (à ta demande), données techniques.',
      blocks: [
        { type: 'p', text: 'Pour chaque catégorie : ce que c’est, pourquoi, sur quelle base légale et combien de temps.' },
        {
          type: 'cards',
          items: [
            {
              title: 'Compte',
              lines: [
                { label: 'Données', value: 'E-mail, identifiant, prénom/nom, photo, mot de passe (haché), pays, langue' },
                { label: 'Pourquoi', value: 'Créer et sécuriser ton compte, te connecter' },
                { label: 'Base légale', value: 'Exécution du contrat' },
                { label: 'Durée', value: 'Tant que le compte existe, puis suppression' },
              ],
            },
            {
              title: 'Profil sportif',
              lines: [
                { label: 'Données', value: 'Sports, niveau, objectifs, jours d’entraînement, volumes, matériel' },
                { label: 'Pourquoi', value: 'Générer et adapter tes plans' },
                { label: 'Base légale', value: 'Exécution du contrat' },
                { label: 'Durée', value: 'Tant que le compte existe' },
              ],
            },
            {
              title: 'Activités et trajets',
              lines: [
                { label: 'Données', value: 'Séances, distance, durée, allure, fréquence cardiaque, tracé GPS, RPE' },
                { label: 'Pourquoi', value: 'Suivi, statistiques, charge d’entraînement, classement' },
                { label: 'Base légale', value: 'Exécution du contrat ; ton consentement pour la position GPS' },
                { label: 'Durée', value: 'Tant que le compte existe (tu peux supprimer une séance)' },
              ],
            },
            {
              title: 'Santé et bien-être (données sensibles)',
              lines: [
                { label: 'Données', value: 'Sommeil, poids, fréquence cardiaque, indicateurs de forme' },
                { label: 'Pourquoi', value: 'Adapter la charge et les conseils de récupération' },
                { label: 'Base légale', value: 'Ton consentement explicite, retirable à tout moment' },
                { label: 'Durée', value: 'Jusqu’au retrait du consentement ou à la suppression du compte' },
              ],
            },
            {
              title: 'Social',
              lines: [
                { label: 'Données', value: 'Abonnements, likes, groupes, visibilité du profil' },
                { label: 'Pourquoi', value: 'Fonctions communautaires que tu choisis d’utiliser' },
                { label: 'Base légale', value: 'Exécution du contrat' },
                { label: 'Durée', value: 'Tant que le compte existe' },
              ],
            },
            {
              title: 'Données techniques',
              lines: [
                { label: 'Données', value: 'Type d’appareil, version de l’app, journaux d’erreurs, jeton de session' },
                { label: 'Pourquoi', value: 'Sécurité, prévention de la fraude, diagnostic' },
                { label: 'Base légale', value: 'Intérêt légitime' },
                { label: 'Durée', value: 'Durée limitée (journaux) ou durée de la session' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sensitive',
      title: '3. Données de santé : un traitement à part',
      summary: 'Sommeil, poids, cardio : uniquement avec ton accord, jamais pour de la publicité.',
      blocks: [
        {
          type: 'callout',
          tone: 'info',
          title: 'Ton consentement compte',
          text:
            'Les données de santé sont des données sensibles au sens du RGPD. Mova les traite uniquement pour ' +
            'personnaliser ton entraînement, avec ton accord. Tu peux les masquer sur ton profil, les exporter ou ' +
            'les supprimer, et retirer ton consentement à tout moment sans conséquence sur le reste de l’app.',
        },
        {
          type: 'p',
          text:
            'Mova n’est pas un dispositif médical : les indicateurs de forme et de récupération sont indicatifs. ' +
            'Voir aussi le guide Santé & sécurité.',
        },
        { type: 'link', label: 'Ouvrir le guide Santé & sécurité', doc: 'health' },
      ],
    },
    {
      id: 'never',
      title: '4. Ce que Mova ne fait jamais',
      summary: 'Pas de vente de données, pas de publicité ciblée, pas de décision automatisée à effet juridique.',
      blocks: [
        {
          type: 'ul',
          items: [
            'Vendre ou louer tes données personnelles.',
            'T’afficher de la publicité ciblée ou construire un profil publicitaire.',
            'Partager ta position avec d’autres utilisateurs sans que tu l’aies demandé.',
            'Prendre une décision te concernant produisant des effets juridiques uniquement par algorithme : les plans d’entraînement sont des recommandations que tu peux ignorer.',
          ],
        },
      ],
    },
    {
      id: 'device',
      title: '5. Autorisations de ton appareil',
      summary: 'Position et notifications : demandées au moment utile, refusables à tout moment.',
      blocks: [
        {
          type: 'p',
          text: 'Mova ne te demande une autorisation que lorsqu’elle sert à quelque chose. Le détail est dans le guide « Autorisations ».',
        },
        { type: 'link', label: 'Voir toutes les autorisations', doc: 'permissions' },
      ],
    },
    {
      id: 'recipients',
      title: '6. Avec qui tes données sont partagées',
      summary: 'Nos hébergeurs techniques, Google si tu l’utilises, et les autres membres selon ta visibilité.',
      blocks: [
        {
          type: 'cards',
          items: [
            ...HOSTS.map((h) => ({
              title: h.name,
              lines: [
                { label: 'Rôle', value: h.role },
                { label: 'Adresse', value: h.address },
              ],
            })),
            {
              title: 'Google (facultatif)',
              lines: [
                { label: 'Rôle', value: 'Connexion « Continuer avec Google » si tu la choisis' },
                { label: 'Données', value: 'E-mail et nom fournis par Google avec ton accord' },
              ],
            },
            {
              title: 'Autres membres Mova',
              lines: [
                { label: 'Rôle', value: 'Voient ton profil et tes séances selon ton réglage « Qui peut me voir »' },
                { label: 'Contrôle', value: 'Public, abonnés ou privé — modifiable à tout moment' },
              ],
            },
          ],
        },
        {
          type: 'p',
          text: 'Ces prestataires n’agissent que sur instruction de Mova et ne peuvent pas utiliser tes données pour leurs propres finalités publicitaires.',
        },
      ],
    },
    {
      id: 'transfers',
      title: '7. Transferts hors de l’Union européenne',
      summary: 'Nos hébergeurs sont aux États-Unis, avec des garanties reconnues par l’UE.',
      blocks: [
        {
          type: 'p',
          text:
            'GitHub et Render sont établis aux États-Unis. Les transferts sont encadrés par des garanties appropriées ' +
            '(clauses contractuelles types de la Commission européenne et/ou cadre de protection des données UE–États-Unis).',
        },
      ],
    },
    {
      id: 'retention',
      title: '8. Combien de temps on garde tes données',
      summary: 'Tant que ton compte existe ; effacées dans un délai raisonnable après sa suppression.',
      blocks: [
        {
          type: 'ul',
          items: [
            'Compte actif : tes données sont conservées pour faire fonctionner le service.',
            'Après suppression du compte : effacement ou anonymisation dans un délai raisonnable, sauf obligation légale de conservation.',
            'Sauvegardes techniques : purgées selon leur cycle normal de rotation.',
            'Journaux de sécurité : durée limitée, strictement nécessaire.',
          ],
        },
      ],
    },
    {
      id: 'security',
      title: '9. Comment on protège tes données',
      summary: 'Connexion chiffrée, mots de passe hachés, accès restreints.',
      blocks: [
        {
          type: 'ul',
          items: [
            'Communications chiffrées (HTTPS).',
            'Mots de passe jamais stockés en clair (hachage).',
            'Accès aux serveurs limité aux personnes qui en ont besoin.',
            'Jetons de session révocables (déconnexion, suppression du compte).',
          ],
        },
        {
          type: 'callout',
          tone: 'warn',
          title: 'Ta part de sécurité',
          text: 'Utilise un mot de passe unique et ne le partage pas. En cas de doute, change-le dans Compte et sécurité.',
        },
      ],
    },
    {
      id: 'rights',
      title: '10. Tes droits',
      summary: 'Accès, rectification, effacement, portabilité, opposition — réponse sous un mois.',
      blocks: [
        {
          type: 'cards',
          items: [
            { title: 'Accès', lines: [{ label: 'Tu peux', value: 'Obtenir une copie de tes données' }, { label: 'Comment', value: 'Compte et sécurité → Exporter mes données' }] },
            { title: 'Rectification', lines: [{ label: 'Tu peux', value: 'Corriger des informations inexactes' }, { label: 'Comment', value: 'Modifier le profil' }] },
            { title: 'Effacement', lines: [{ label: 'Tu peux', value: 'Supprimer ton compte et tes données' }, { label: 'Comment', value: 'Compte et sécurité → Supprimer mon compte' }] },
            { title: 'Portabilité', lines: [{ label: 'Tu peux', value: 'Récupérer tes données dans un format lisible' }, { label: 'Comment', value: 'Compte et sécurité → Exporter mes données' }] },
            { title: 'Opposition et limitation', lines: [{ label: 'Tu peux', value: 'T’opposer à un traitement ou demander sa limitation' }, { label: 'Comment', value: LEGAL_CONTACT_SHORT }] },
            { title: 'Retrait du consentement', lines: [{ label: 'Tu peux', value: 'Retirer un consentement (santé, position, notifications)' }, { label: 'Comment', value: 'Paramètres → Autorisations / Notifications' }] },
          ],
        },
        {
          type: 'p',
          text: 'Nous répondons dans un délai d’un mois. Une pièce d’identité peut être demandée en cas de doute sur ton identité.',
        },
        {
          type: 'callout',
          tone: 'info',
          title: 'Un désaccord ?',
          text: `Tu peux introduire une réclamation auprès de la ${CNIL.name} (${CNIL.site}), l’autorité française de protection des données.`,
        },
      ],
    },
    {
      id: 'minors',
      title: '11. Mineurs',
      summary: 'Mova n’est pas destiné aux moins de 16 ans.',
      blocks: [
        {
          type: 'p',
          text: 'Nous ne collectons pas sciemment de données d’enfants de moins de 16 ans. Si tu penses qu’un mineur a créé un compte, écris-nous : nous le supprimerons.',
        },
      ],
    },
    {
      id: 'storage',
      title: '12. Stockage local et cookies',
      summary: 'Uniquement du stockage nécessaire au fonctionnement : aucun traceur publicitaire.',
      blocks: [
        {
          type: 'p',
          text:
            'Mova utilise le stockage local de ton appareil (session, préférences, cache hors ligne) : ces éléments sont ' +
            'strictement nécessaires au service et ne nécessitent donc pas de bannière de consentement. Aucun cookie ' +
            'publicitaire ni outil de mesure d’audience tiers n’est utilisé.',
        },
      ],
    },
    {
      id: 'changes',
      title: '13. Modifications de cette politique',
      summary: 'On te prévient dans l’app en cas de changement important.',
      blocks: [
        {
          type: 'p',
          text: `La date et la version figurent en tête de page (version ${LEGAL_VERSION}, ${LEGAL_UPDATED}). En cas de changement important, tu en es informé(e) dans l’application.`,
        },
      ],
    },
  ],
};

const health: LegalDoc = {
  id: 'health',
  title: 'Santé & sécurité',
  subtitle: 'À lire avant ta première séance',
  icon: 'heart',
  color: '#E11D48',
  intro: 'Le sport fait du bien quand on le pratique en sécurité. Ce guide résume les réflexes essentiels.',
  keyPoints: [
    'Mova ne remplace jamais un médecin.',
    'Douleur thoracique, malaise, vertige : tu arrêtes et tu consultes.',
    'Dehors : casque, visibilité, code de la route, météo.',
    'Urgence en Europe : 112 — en France aussi le 15 (SAMU) et le 18 (pompiers).',
  ],
  sections: [
    {
      id: 'medical',
      title: '1. Mova n’est pas un avis médical',
      summary: 'Plans, allures et scores sont indicatifs — pas un diagnostic.',
      blocks: [
        {
          type: 'callout',
          tone: 'warn',
          title: 'Important',
          text:
            'Les plans, allures, scores de forme, conseils de récupération, de sommeil ou de nutrition sont fournis à titre ' +
            'informatif et de coaching sportif général. Ils ne constituent ni un avis médical, ni un diagnostic, ni un dispositif médical.',
        },
      ],
    },
    {
      id: 'before',
      title: '2. Avant de commencer',
      summary: 'Un avis médical est recommandé dans plusieurs situations.',
      blocks: [
        { type: 'p', text: 'Consulte un médecin avant de commencer ou d’augmenter ta charge si :' },
        {
          type: 'ul',
          items: [
            'tu reprends le sport après une longue pause ou une blessure ;',
            'tu es enceinte, ou en post-partum ;',
            'tu as un antécédent cardiaque, respiratoire, une hypertension, du diabète ou un traitement en cours ;',
            'tu as plus de 35 ans et vises une forte intensité (courses, compétition) ;',
            'tu ressens des douleurs inhabituelles à l’effort.',
          ],
        },
      ],
    },
    {
      id: 'stop',
      title: '3. Quand s’arrêter immédiatement',
      summary: 'Certains signaux ne se négocient pas.',
      blocks: [
        {
          type: 'callout',
          tone: 'danger',
          title: 'Stop, puis avis médical',
          text:
            'Douleur ou oppression dans la poitrine · essoufflement anormal · vertiges ou malaise · palpitations inhabituelles · ' +
            'douleur vive articulaire ou musculaire · vision trouble.',
        },
        {
          type: 'p',
          text: 'En cas de doute ou de gravité : appelle le 112 (Europe) — en France, 15 (SAMU) ou 18 (pompiers).',
        },
      ],
    },
    {
      id: 'outdoor',
      title: '4. Activités en extérieur',
      summary: 'Route, trail, vélo, eau libre : ta sécurité d’abord.',
      blocks: [
        {
          type: 'steps',
          items: [
            'Vérifie la météo et adapte ta tenue, ton hydratation et ta nutrition.',
            'Sur route : reste visible (couleurs vives, lumière), respecte le code de la route, garde une oreille libre.',
            'À vélo : casque obligatoire pour toi, freins et pneus contrôlés.',
            'En trail ou en montagne : prévois de quoi appeler les secours et préviens un proche de ton itinéraire.',
            'En eau libre : nage accompagné(e), avec une bouée de sécurité, et jamais au-delà de tes capacités.',
          ],
        },
        {
          type: 'p',
          text: 'Mova ne fournit pas de service de secours et ne doit pas être ta seule aide à la navigation.',
        },
      ],
    },
    {
      id: 'listen',
      title: '5. Écoute ton corps',
      summary: 'L’effort ressenti (RPE) prime sur le plan.',
      blocks: [
        {
          type: 'p',
          text:
            'Les charges proposées sont des estimations. Si tu es fatigué(e), malade ou que tu dors mal, allège ou repose-toi : ' +
            'un plan bien suivi vaut mieux qu’un plan subi. Renseigne ton RPE pour que Mova s’adapte.',
        },
      ],
    },
    {
      id: 'responsibility',
      title: '6. Responsabilité',
      summary: 'Tu restes seul juge de ce que tu peux faire en sécurité.',
      blocks: [
        {
          type: 'p',
          text: 'Voir l’article « Santé, entraînement et avertissement médical » des Conditions d’utilisation.',
        },
        { type: 'link', label: 'Ouvrir les Conditions d’utilisation', doc: 'terms' },
      ],
    },
  ],
};

const permissions: LegalDoc = {
  id: 'permissions',
  title: 'Autorisations',
  subtitle: 'Ce que Mova te demande, et pourquoi',
  icon: 'key',
  color: '#F59E0B',
  intro: 'Mova ne demande une autorisation que si elle a une vraie utilité. Tu peux les changer quand tu veux.',
  keyPoints: [
    'Aucune autorisation n’est obligatoire pour utiliser l’essentiel de Mova.',
    'La position n’est utilisée que quand tu lances un enregistrement.',
    'Tu peux tout modifier depuis les réglages de ton téléphone.',
  ],
  sections: [
    {
      id: 'list',
      title: '1. Les autorisations',
      summary: 'Notifications, position, stockage local.',
      blocks: [
        {
          type: 'cards',
          items: [
            {
              title: 'Notifications',
              lines: [
                { label: 'Pourquoi', value: 'Rappels de séance, feedback du soir, abonnés et likes' },
                { label: 'Si tu refuses', value: 'Tu retrouves tout dans la cloche de l’app, sans alerte téléphone' },
                { label: 'Réglage', value: 'Paramètres → Notifications' },
              ],
            },
            {
              title: 'Localisation',
              lines: [
                { label: 'Pourquoi', value: 'Distance, allure et tracé de tes sorties dans le tracker' },
                { label: 'Quand', value: 'Uniquement pendant un enregistrement lancé par toi' },
                { label: 'Si tu refuses', value: 'Tu peux saisir ta séance manuellement ou importer un fichier' },
              ],
            },
            {
              title: 'Stockage local',
              lines: [
                { label: 'Pourquoi', value: 'Garder ta session, tes préférences et accélérer l’app' },
                { label: 'Si tu l’effaces', value: 'Tu seras déconnecté(e) ; les données du serveur restent' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'change',
      title: '2. Modifier une autorisation',
      summary: 'Depuis les réglages de ton téléphone ou du navigateur.',
      blocks: [
        {
          type: 'steps',
          items: [
            'iPhone : Réglages → Mova (ou Safari → Réglages du site) → Notifications / Localisation.',
            'Android : Paramètres → Applications → Mova → Autorisations.',
            'Navigateur : icône de cadenas à côté de l’adresse → Paramètres du site.',
          ],
        },
        {
          type: 'callout',
          tone: 'info',
          text: 'Après un refus, le système ne redemande pas : il faut réactiver l’autorisation dans les réglages.',
        },
      ],
    },
  ],
};

const notice: LegalDoc = {
  id: 'notice',
  title: 'Mentions légales',
  subtitle: 'Éditeur, hébergement, contact',
  icon: 'business',
  color: '#64748B',
  intro: 'Informations requises par l’article 6 de la loi pour la confiance dans l’économie numérique (LCEN).',
  sections: [
    {
      id: 'publisher',
      title: '1. Éditeur',
      summary: PUBLISHER.status,
      blocks: [
        {
          type: 'cards',
          items: [
            {
              title: PUBLISHER.name,
              lines: [
                { label: 'Statut', value: PUBLISHER.status },
                { label: 'Directeur de la publication', value: PUBLISHER.director },
                { label: 'Contact', value: LEGAL_CONTACT_SHORT },
              ],
            },
          ],
        },
        { type: 'p', text: PUBLISHER.identityNote },
      ],
    },
    {
      id: 'hosting',
      title: '2. Hébergement',
      summary: 'GitHub Pages (site) et Render (API).',
      blocks: [
        {
          type: 'cards',
          items: HOSTS.map((h) => ({
            title: h.name,
            lines: [
              { label: 'Rôle', value: h.role },
              { label: 'Adresse', value: h.address },
              { label: 'Site', value: h.site },
            ],
          })),
        },
      ],
    },
    {
      id: 'ip',
      title: '3. Propriété intellectuelle',
      summary: 'Marque, logos, textes et programmes protégés.',
      blocks: [
        {
          type: 'p',
          text: 'La marque Mova, les logos de rang, l’interface, les textes et les programmes d’entraînement sont protégés. Toute reproduction sans autorisation écrite est interdite.',
        },
      ],
    },
    {
      id: 'report',
      title: '4. Signaler un contenu',
      summary: 'Un contenu illicite ? Écris-nous, on le retire rapidement.',
      blocks: [
        {
          type: 'p',
          text: `Pour signaler un contenu illicite ou abusif : utilise ${LEGAL_CONTACT_CHANNEL}. Précise le contenu concerné (lien ou nom d’utilisateur) et le motif.`,
        },
      ],
    },
    {
      id: 'consumer',
      title: '5. Litiges et médiation',
      summary: 'Solution amiable d’abord ; médiation de la consommation si applicable.',
      blocks: [
        {
          type: 'p',
          text:
            'En cas de litige, contacte-nous d’abord. Si des services payants sont proposés, tu peux recourir gratuitement à un ' +
            'médiateur de la consommation dans les conditions prévues par le Code de la consommation.',
        },
      ],
    },
    {
      id: 'data-authority',
      title: '6. Données personnelles',
      summary: 'Traitement décrit dans la Politique de confidentialité.',
      blocks: [{ type: 'link', label: 'Ouvrir la Politique de confidentialité', doc: 'privacy' }],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = { terms, privacy, health, permissions, notice };
export const LEGAL_DOC_ORDER: LegalDocId[] = ['terms', 'privacy', 'health', 'permissions', 'notice'];

export function isLegalDocId(v: string | undefined): v is LegalDocId {
  return Boolean(v) && v! in LEGAL_DOCS;
}

/** Texte brut d'une section (recherche plein texte). */
export function sectionText(s: LegalSection): string {
  const parts: string[] = [s.title, s.summary ?? ''];
  for (const b of s.blocks) {
    if (b.type === 'p') parts.push(b.text);
    else if (b.type === 'ul' || b.type === 'steps') parts.push(...b.items);
    else if (b.type === 'callout') parts.push(b.title ?? '', b.text);
    else if (b.type === 'cards') for (const c of b.items) parts.push(c.title, ...c.lines.map((l) => `${l.label} ${l.value}`));
    else if (b.type === 'link') parts.push(b.label);
  }
  return parts.join(' ').toLowerCase();
}

/** Estimation du temps de lecture (minutes). */
export function readingMinutes(doc: LegalDoc): number {
  const words = doc.sections.reduce((n, s) => n + sectionText(s).split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 200));
}
