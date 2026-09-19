import type { Href } from 'expo-router';

export type SettingsSearchItem = {
  id: string;
  label: string;
  path: string;
  keywords: string[];
  href: Href;
};

/** Catalogue searchable — chemins alignés sur la nouvelle IA */
export const SETTINGS_SEARCH_CATALOG: SettingsSearchItem[] = [
  {
    id: 'premium-manage',
    label: 'Gestion compte premium',
    path: 'Paramètres → Compte → Gestion compte premium',
    keywords: [
      'premium',
      'cadeau',
      'offrir',
      'abonnement',
      'gestion',
      'owner',
      'champion',
    ],
    href: '/settings/premium-manage' as Href,
  },
  {
    id: 'watch',
    label: 'Montre',
    path: 'Paramètres → Appareils & sync → Montre',
    keywords: ['montre', 'watch', 'sommeil', 'garmin', 'apple', 'samsung', 'fitbit', 'huawei'],
    href: '/settings/watch' as Href,
  },
  {
    id: 'watch-change',
    label: 'Changer de montre',
    path: 'Paramètres → Appareils & sync → Montre',
    keywords: [
      'changer',
      'montre',
      'watch',
      'remplacer',
      'garmin',
      'apple',
      'samsung',
      'quelle montre',
    ],
    href: '/settings/watch?change=1' as Href,
  },
  {
    id: 'sleep',
    label: 'Importer sommeil',
    path: 'Paramètres → Appareils & sync',
    keywords: ['sommeil', 'sleep', 'importer', 'nuit', 'score', 'calendrier'],
    href: '/sleep' as Href,
  },
  {
    id: 'sports-data',
    label: 'Données sportives',
    path: 'Paramètres → Profil sportif → Données',
    keywords: [
      'chronos',
      'vma',
      'ftp',
      'athlétisme',
      'course',
      'natation',
      'vélo',
      'triathlon',
      'prédiction',
      '5k',
      '100m',
      'performance',
      'discipline',
    ],
    href: '/settings/athlete-hub' as Href,
  },
  {
    id: 'profile-cover',
    label: 'Fond profil',
    path: 'Vous → Modifier le profil → Fond',
    keywords: ['fond', 'cover', 'profil', 'animation', 'bannière'],
    href: '/settings/profile-cover' as Href,
  },
  {
    id: 'profile',
    label: 'Modifier mon profil',
    path: 'Vous → Modifier le profil',
    keywords: ['profil', 'compte', 'nom', 'bio', 'identifiant'],
    href: '/settings/profile' as Href,
  },
  {
    id: 'athlete-hub',
    label: 'Profil sportif',
    path: 'Paramètres → Compte → Profil sportif',
    keywords: [
      'profil sportif',
      'objectifs',
      'but',
      'niveau',
      'volume',
      'chronos',
      'vma',
      'ftp',
      'forme',
      'fitness',
      'athlète',
    ],
    href: '/settings/athlete-hub' as Href,
  },
  {
    id: 'goals',
    label: 'Objectifs & niveau',
    path: 'Paramètres → Profil sportif → Objectifs',
    keywords: ['objectifs', 'but', 'niveau', 'volume'],
    href: '/settings/athlete-hub' as Href,
  },
  {
    id: 'privacy',
    label: 'Qui peut voir mon profil',
    path: 'Paramètres → Confidentialité',
    keywords: ['confidentialité', 'privacy', 'visibilité', 'privé', 'public'],
    href: '/settings/privacy' as Href,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: 'Paramètres → Communications',
    keywords: ['notifications', 'alertes'],
    href: '/settings/notifications' as Href,
  },
  {
    id: 'display',
    label: 'Unités, carte et langue',
    path: 'Paramètres → Affichage',
    keywords: [
      'affichage',
      'thème',
      'unités',
      'sombre',
      'carte',
      'langue',
      'language',
      'english',
      'idioma',
      'sprache',
    ],
    href: '/settings/display' as Href,
  },
  {
    id: 'language',
    label: 'Langue',
    path: 'Paramètres → Affichage → Langue',
    keywords: ['langue', 'language', 'traduction', 'english', 'español', 'deutsch'],
    href: '/settings/display' as Href,
  },
  {
    id: 'account',
    label: 'Compte et sécurité',
    path: 'Paramètres → Compte',
    keywords: ['compte', 'sécurité', 'mot de passe', '2fa', 'déconnexion'],
    href: '/settings/account' as Href,
  },
  {
    id: 'help',
    label: 'Centre d’aide',
    path: 'Paramètres → Aide',
    keywords: ['aide', 'help', 'faq'],
    href: '/settings/help' as Href,
  },
  {
    id: 'data-permissions',
    label: 'Autorisations (caméra, photos, push)',
    path: 'Paramètres → Confidentialité → Autorisations',
    keywords: [
      'autorisation',
      'permission',
      'caméra',
      'appareil photo',
      'photos',
      'galerie',
      'notifications',
      'push',
    ],
    href: '/settings/data-permissions' as Href,
  },
  {
    id: 'devices',
    label: 'Applications connectées',
    path: 'Paramètres → Appareils & sync',
    keywords: [
      'localisation',
      'gps',
      'santé',
      'garmin',
      'sync',
      'synchronisation',
      'appareils',
    ],
    href: '/settings/devices' as Href,
  },
  {
    id: 'account-export',
    label: 'Télécharger mes données',
    path: 'Paramètres → Compte',
    keywords: ['télécharger', 'export', 'données', 'rgpd'],
    href: '/settings/account' as Href,
  },
  {
    id: 'subscription',
    label: 'Abonnement Premium',
    path: 'Paramètres → Abonnement',
    keywords: [
      'premium',
      'abonnement',
      'payer',
      'offre',
      'mensuel',
      'annuel',
      'essai',
    ],
    href: '/settings/subscription' as Href,
  },
  {
    id: 'explorer',
    label: 'Tout explorer',
    path: 'Paramètres → Abonnement',
    keywords: ['explorer', 'fonctionnalités', 'outils', 'catalogue'],
    href: '/settings/subscription' as Href,
  },
];

export function searchSettings(query: string): SettingsSearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = SETTINGS_SEARCH_CATALOG.map((item) => {
    const hay = `${item.label} ${item.path} ${item.keywords.join(' ')}`.toLowerCase();
    const match = tokens.every((t) => hay.includes(t));
    if (!match) return null;
    let score = 0;
    if (item.label.toLowerCase() === q) score += 100;
    if (item.label.toLowerCase().startsWith(q)) score += 40;
    if (item.id === 'watch-change' && (q.includes('montre') || q.includes('changer'))) {
      score += 80;
    }
    if (item.id === 'watch' && (q === 'montre' || q.includes('montre'))) score += 20;
    tokens.forEach((t) => {
      if (item.keywords.includes(t)) score += 10;
      if (item.label.toLowerCase().includes(t)) score += 5;
    });
    return { item, score };
  }).filter((x): x is { item: SettingsSearchItem; score: number } => x != null);

  return scored.sort((a, b) => b.score - a.score).map((x) => x.item);
}
