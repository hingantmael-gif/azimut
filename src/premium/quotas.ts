/**
 * Quotas Free / avantages Premium — alignés sur le brief monétisation Sept. 2026.
 * La boucle centrale (programme + séance GPS) n’est jamais bloquée.
 */
export const FREE_QUOTAS = {
  /** Imports GPX/TCX par mois calendaire */
  importsPerMonth: 5,
  /** Exports fichier vers Strava par mois */
  stravaExportsPerMonth: 3,
  /** Envois vers montre par mois */
  watchExportsPerMonth: 3,
  /** Programmes actifs simultanés */
  maxActivePrograms: 1,
  /** Clubs rejoints simultanés */
  maxJoinedClubs: 1,
} as const;

export const BILLING_PRODUCTS = {
  monthly: 'azimut_premium_monthly',
  annual: 'azimut_premium_annual',
  /** Entitlement RevenueCat unique */
  entitlement: 'premium',
} as const;

/** Prix affichés (EUR) — à synchroniser avec Play Console. */
export const BILLING_DISPLAY_PRICES = {
  monthly: { amount: 9.99, currency: 'EUR', label: '9,99 € / mois' },
  annual: {
    amount: 59.99,
    currency: 'EUR',
    label: '59,99 € / an',
    monthlyEquivalent: '5,00 € / mois',
  },
  trialDays: 7,
} as const;

export type PaywallReason =
  | 'import_quota'
  | 'strava_export_quota'
  | 'watch_export_quota'
  | 'multi_program'
  | 'premium_cover'
  | 'advanced_analytics'
  | 'generic';

export const PAYWALL_COPY: Record<
  PaywallReason,
  { title: string; body: string }
> = {
  import_quota: {
    title: 'Imports du mois utilisés',
    body: `Tu as utilisé tes ${FREE_QUOTAS.importsPerMonth} imports gratuits ce mois-ci. Passe en Premium pour importer sans limite.`,
  },
  strava_export_quota: {
    title: 'Exports Strava du mois utilisés',
    body: `Tu as utilisé tes ${FREE_QUOTAS.stravaExportsPerMonth} envois Strava gratuits ce mois-ci. Premium = exports illimités.`,
  },
  watch_export_quota: {
    title: 'Envois montre du mois utilisés',
    body: `Tu as utilisé tes ${FREE_QUOTAS.watchExportsPerMonth} envois montre gratuits ce mois-ci. Premium = envois illimités.`,
  },
  multi_program: {
    title: 'Plusieurs programmes en parallèle',
    body: 'En gratuit : un seul programme actif à la fois. Premium te laisse superposer course + musculation (ou plus) avec charge combinée.',
  },
  premium_cover: {
    title: 'Fond de profil Premium',
    body: 'Ce fond animé est réservé aux abonnés Premium. Les covers de rang restent liés à ton mérite sportif.',
  },
  advanced_analytics: {
    title: 'Analyses avancées',
    body: 'Courbes Critical Power, Banister détaillé et prédictions multi-distances : Premium.',
  },
  generic: {
    title: 'Mova Premium',
    body: 'Débloque multi-programmes, imports/exports illimités, analyses avancées et covers Premium.',
  },
};
