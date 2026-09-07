/**
 * Pays compétitif — détecté une fois (fuseau / locale), puis verrouillé.
 * Évite de changer de pays pour gruger les classements nationaux.
 * (Pas de lecture Wi‑Fi / numéro : non fiable et trop intrusif en Expo/web.)
 */

const TZ_TO_COUNTRY: Record<string, string> = {
  'Europe/Paris': 'France',
  'Europe/Brussels': 'Belgique',
  'Europe/Zurich': 'Suisse',
  'Europe/Luxembourg': 'Luxembourg',
  'Europe/Monaco': 'Monaco',
  'Africa/Casablanca': 'Maroc',
  'Africa/Algiers': 'Algérie',
  'Africa/Tunis': 'Tunisie',
  'America/Montreal': 'Canada',
  'America/Toronto': 'Canada',
  'America/New_York': 'États-Unis',
  'America/Los_Angeles': 'États-Unis',
  'Europe/London': 'Royaume-Uni',
  'Europe/Berlin': 'Allemagne',
  'Europe/Madrid': 'Espagne',
  'Europe/Rome': 'Italie',
  'Europe/Lisbon': 'Portugal',
  'Europe/Amsterdam': 'Pays-Bas',
  'Europe/Dublin': 'Irlande',
  'Europe/Vienna': 'Autriche',
  'Europe/Stockholm': 'Suède',
  'Europe/Oslo': 'Norvège',
  'Europe/Copenhagen': 'Danemark',
  'Europe/Warsaw': 'Pologne',
  'Europe/Prague': 'Tchéquie',
  'Europe/Athens': 'Grèce',
  'Europe/Bucharest': 'Roumanie',
  'Europe/Helsinki': 'Finlande',
  'Australia/Sydney': 'Australie',
  'Pacific/Auckland': 'Nouvelle-Zélande',
  'America/Sao_Paulo': 'Brésil',
  'America/Mexico_City': 'Mexique',
  'Asia/Tokyo': 'Japon',
  'Asia/Seoul': 'Corée du Sud',
  'Asia/Shanghai': 'Chine',
  'Asia/Singapore': 'Singapour',
  'Asia/Dubai': 'Émirats arabes unis',
};

const LANG_TO_COUNTRY: Record<string, string> = {
  fr: 'France',
  be: 'Belgique',
  ch: 'Suisse',
  ca: 'Canada',
  en: 'Royaume-Uni',
  de: 'Allemagne',
  es: 'Espagne',
  it: 'Italie',
  pt: 'Portugal',
  nl: 'Pays-Bas',
  pl: 'Pologne',
  ja: 'Japon',
  ko: 'Corée du Sud',
  zh: 'Chine',
  ar: 'Maroc',
  tr: 'Turquie',
  ru: 'Russie',
  sv: 'Suède',
  no: 'Norvège',
  da: 'Danemark',
  fi: 'Finlande',
  el: 'Grèce',
  ro: 'Roumanie',
  cs: 'Tchéquie',
  hu: 'Hongrie',
  br: 'Brésil',
  mx: 'Mexique',
  us: 'États-Unis',
  gb: 'Royaume-Uni',
  au: 'Australie',
  nz: 'Nouvelle-Zélande',
};

export function normalizeCompetitiveCountry(raw?: string | null): string {
  const c = (raw ?? '').trim();
  return c.length > 0 ? c : 'France';
}

/** Détection locale (fuseau horaire → langue navigateur / système). */
export function detectCountryFromDevice(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz]!;
  } catch {
    /* ignore */
  }

  try {
    const lang =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : Intl.DateTimeFormat().resolvedOptions().locale;
    const lower = (lang ?? 'fr').toLowerCase();
    const region = lower.includes('-') ? lower.split('-')[1] : '';
    if (region && LANG_TO_COUNTRY[region]) return LANG_TO_COUNTRY[region]!;
    const primary = lower.split('-')[0] ?? 'fr';
    if (LANG_TO_COUNTRY[primary]) return LANG_TO_COUNTRY[primary]!;
  } catch {
    /* ignore */
  }

  return 'France';
}

/**
 * Applique le verrouillage pays : première détection figée.
 * Si déjà verrouillé, on ne change plus (anti-fraude classement national).
 */
export function resolveLockedCountry(opts: {
  country?: string | null;
  countryLocked?: boolean;
}): { country: string; countryLocked: true; changed: boolean } {
  if (opts.countryLocked && opts.country?.trim()) {
    return {
      country: normalizeCompetitiveCountry(opts.country),
      countryLocked: true,
      changed: false,
    };
  }
  const detected = detectCountryFromDevice();
  const next = normalizeCompetitiveCountry(opts.country?.trim() ? opts.country : detected);
  return {
    country: next,
    countryLocked: true,
    changed: !opts.countryLocked || normalizeCompetitiveCountry(opts.country) !== next,
  };
}
