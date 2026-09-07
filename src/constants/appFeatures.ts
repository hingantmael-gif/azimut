import type { Href } from 'expo-router';

/**
 * Catalogue unique des fonctionnalités Azimut — pas de distinction premium / basique.
 * Chaque entrée mène à l’écran (et éventuellement au bouton) concerné.
 */
export type AppFeatureSectionId =
  | 'coaching'
  | 'activities'
  | 'performance'
  | 'body'
  | 'social'
  | 'account';

export type AppFeature = {
  id: string;
  label: string;
  /** Sous-texte court (optionnel) */
  hint?: string;
  section: AppFeatureSectionId;
  href: Href;
  /** Met en avant le bouton d’action sur l’écran cible (`?focus=`) */
  focus?: string;
};

export const APP_FEATURE_SECTIONS: {
  id: AppFeatureSectionId;
  title: string;
}[] = [
  { id: 'coaching', title: 'Coaching & programmes' },
  { id: 'activities', title: 'Activités & export' },
  { id: 'performance', title: 'Performance & analyses' },
  { id: 'body', title: 'Corps & récupération' },
  { id: 'social', title: 'Social & découverte' },
  { id: 'account', title: 'Profil & paramètres' },
];

export const APP_FEATURES: AppFeature[] = [
  // —— Coaching ——
  {
    id: 'home-today',
    label: 'Séance du jour',
    hint: 'Accueil',
    section: 'coaching',
    href: '/(tabs)' as Href,
  },
  {
    id: 'training-plan',
    label: 'Plan du jour (entraînement)',
    section: 'coaching',
    href: '/(tabs)/training' as Href,
  },
  {
    id: 'calendar',
    label: 'Calendrier d’entraînement',
    section: 'coaching',
    href: '/(tabs)/calendar' as Href,
  },
  {
    id: 'new-program',
    label: 'Créer un programme',
    hint: 'Multi-sports, durée, options',
    section: 'coaching',
    href: '/program/new' as Href,
  },
  {
    id: 'programs-list',
    label: 'Mes programmes',
    hint: 'Plusieurs programmes en parallèle',
    section: 'coaching',
    href: '/programs' as Href,
  },
  {
    id: 'program-progress',
    label: 'Progrès du programme',
    section: 'coaching',
    href: '/program/progress' as Href,
  },
  {
    id: 'rpe',
    label: 'Feedback RPE (effort ressenti)',
    section: 'coaching',
    href: '/(tabs)/training' as Href,
    focus: 'rpe',
  },
  {
    id: 'coach-vokal',
    label: 'Coach vocal',
    section: 'coaching',
    href: '/coach-vokal' as Href,
  },
  {
    id: 'adaptive-plan',
    label: 'Adaptation RPE + sommeil',
    hint: 'Le plan s’ajuste après feedback et nuit',
    section: 'coaching',
    href: '/sleep' as Href,
  },

  // —— Activités ——
  {
    id: 'import-strava',
    label: 'Importer une activité depuis Strava',
    hint: 'Fichier GPX / TCX',
    section: 'activities',
    href: '/import-activity' as Href,
    focus: 'pick',
  },
  {
    id: 'send-garmin',
    label: 'Envoyer la séance à ma montre',
    hint: 'Garmin, Apple Watch, Galaxy…',
    section: 'activities',
    href: '/(tabs)/training' as Href,
    focus: 'garmin',
  },
  {
    id: 'send-strava',
    label: 'Envoyer / partager la séance vers Strava',
    section: 'activities',
    href: '/(tabs)/training' as Href,
    focus: 'strava',
  },
  {
    id: 'record',
    label: 'Enregistrer une activité',
    hint: 'Course, vélo, nage, brick, musculation',
    section: 'activities',
    href: '/(tabs)/record' as Href,
    focus: 'garmin',
  },
  {
    id: 'activities-list',
    label: 'Historique des activités',
    section: 'activities',
    href: '/activities' as Href,
  },
  {
    id: 'devices',
    label: 'Appareils connectés',
    hint: 'Garmin, Apple Santé…',
    section: 'activities',
    href: '/settings/devices' as Href,
  },
  {
    id: 'watch',
    label: 'Configurer ma montre',
    section: 'activities',
    href: '/settings/watch' as Href,
  },

  // —— Performance ——
  {
    id: 'analyse',
    label: 'Progrès & conformité au plan',
    section: 'performance',
    href: '/(tabs)/analyse' as Href,
  },
  {
    id: 'ranked',
    label: 'Classement & XP',
    hint: 'Ligues, niveaux, boucliers',
    section: 'performance',
    href: '/ranked' as Href,
  },
  {
    id: 'badges',
    label: 'Badges & succès',
    section: 'performance',
    href: '/badges' as Href,
  },
  {
    id: 'race-predictor',
    label: 'Prédiction de temps (course, nage, vélo)',
    section: 'performance',
    href: '/race-predictor' as Href,
  },
  {
    id: 'sports-data',
    label: 'Données sportives (chronos, VMA, FTP)',
    section: 'performance',
    href: '/settings/sports-data' as Href,
  },
  {
    id: 'athlete-profile',
    label: 'Profil sportif & objectifs',
    section: 'performance',
    href: '/settings/athlete-profile' as Href,
  },
  {
    id: 'fitness',
    label: 'Forme / Fitness / Fatigue (TSB)',
    section: 'performance',
    href: '/settings/performance' as Href,
  },
  {
    id: 'multisport',
    label: 'Multi-sport / triathlon',
    section: 'performance',
    href: '/multisport' as Href,
  },
  {
    id: 'year-review',
    label: 'Bilan annuel',
    section: 'performance',
    href: '/year-review' as Href,
  },

  // —— Corps ——
  {
    id: 'body',
    label: 'Corps & groupes musculaires',
    section: 'body',
    href: '/(tabs)/body' as Href,
  },
  {
    id: 'sleep',
    label: 'Sommeil (import / saisie)',
    section: 'body',
    href: '/sleep' as Href,
  },
  {
    id: 'recovery',
    label: 'Récupération & mobilité',
    section: 'body',
    href: '/recovery' as Href,
  },
  {
    id: 'nutrition',
    label: 'Nutrition & hydratation',
    section: 'body',
    href: '/nutrition' as Href,
  },
  {
    id: 'safety',
    label: 'Sécurité & alertes',
    section: 'body',
    href: '/safety' as Href,
  },

  // —— Social ——
  {
    id: 'profile-tab',
    label: 'Mon profil public',
    section: 'social',
    href: '/(tabs)/profile' as Href,
  },
  {
    id: 'search',
    label: 'Rechercher des athlètes',
    section: 'social',
    href: '/search' as Href,
  },
  {
    id: 'social-feed',
    label: 'Fil social & kudos',
    section: 'social',
    href: '/(tabs)/social' as Href,
  },
  {
    id: 'groups',
    label: 'Groupes / clubs',
    section: 'social',
    href: '/(tabs)/groups' as Href,
  },
  {
    id: 'maps',
    label: 'Cartes & segments',
    section: 'social',
    href: '/(tabs)/maps' as Href,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    section: 'social',
    href: '/notifications' as Href,
  },
  {
    id: 'profile-cover',
    label: 'Fonds de profil',
    section: 'social',
    href: '/settings/profile-cover' as Href,
  },

  // —— Compte ——
  {
    id: 'settings-profile',
    label: 'Modifier mon profil',
    section: 'account',
    href: '/settings/profile' as Href,
  },
  {
    id: 'goals',
    label: 'Mes objectifs',
    section: 'account',
    href: '/settings/goals' as Href,
  },
  {
    id: 'privacy',
    label: 'Confidentialité',
    section: 'account',
    href: '/settings/privacy' as Href,
  },
  {
    id: 'permissions',
    label: 'Autorisations (caméra, photos, push)',
    section: 'account',
    href: '/settings/data-permissions' as Href,
  },
  {
    id: 'display',
    label: 'Affichage (thème, unités)',
    section: 'account',
    href: '/settings/display' as Href,
  },
  {
    id: 'notif-prefs',
    label: 'Préférences de notifications',
    section: 'account',
    href: '/settings/notifications' as Href,
  },
  {
    id: 'account',
    label: 'Compte et sécurité',
    section: 'account',
    href: '/settings/account' as Href,
  },
  {
    id: 'help',
    label: 'Centre d’aide',
    section: 'account',
    href: '/settings/help' as Href,
  },
];

export function featuresForSection(section: AppFeatureSectionId): AppFeature[] {
  return APP_FEATURES.filter((f) => f.section === section);
}

/** Navigation vers une fonctionnalité (avec focus optionnel sur le bouton). */
export function hrefWithFocus(feature: AppFeature): Href {
  if (!feature.focus) return feature.href;
  const path = String(feature.href);
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}focus=${encodeURIComponent(feature.focus)}` as Href;
}
