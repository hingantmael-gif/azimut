/** Langues UI supportées */
export type AppLocale = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'nl';

export const APP_LOCALES: Array<{
  code: AppLocale;
  label: string;
  nativeLabel: string;
}> = [
  { code: 'fr', label: 'Français', nativeLabel: 'Français' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

export type CountryEntry = {
  /** Nom canonique (classements / profil) */
  id: string;
  /** Affichage dans le sélecteur */
  label: string;
  locale: AppLocale;
  /** Alias de recherche */
  aliases?: string[];
};

/** Pays compétitifs + langue d’interface par défaut */
export const COUNTRY_CATALOG: CountryEntry[] = [
  { id: 'France', label: 'France', locale: 'fr', aliases: ['fr', 'français'] },
  { id: 'Belgique', label: 'Belgique', locale: 'fr', aliases: ['belgium', 'belgië'] },
  { id: 'Suisse', label: 'Suisse', locale: 'fr', aliases: ['switzerland', 'schweiz'] },
  { id: 'Luxembourg', label: 'Luxembourg', locale: 'fr' },
  { id: 'Monaco', label: 'Monaco', locale: 'fr' },
  { id: 'Canada', label: 'Canada', locale: 'en', aliases: ['québec', 'quebec'] },
  { id: 'Maroc', label: 'Maroc', locale: 'fr', aliases: ['morocco'] },
  { id: 'Algérie', label: 'Algérie', locale: 'fr', aliases: ['algeria'] },
  { id: 'Tunisie', label: 'Tunisie', locale: 'fr', aliases: ['tunisia'] },
  { id: 'Sénégal', label: 'Sénégal', locale: 'fr' },
  { id: 'Côte d’Ivoire', label: 'Côte d’Ivoire', locale: 'fr', aliases: ['ivory'] },
  { id: 'Royaume-Uni', label: 'Royaume-Uni', locale: 'en', aliases: ['uk', 'england', 'britain'] },
  { id: 'Irlande', label: 'Irlande', locale: 'en', aliases: ['ireland'] },
  { id: 'États-Unis', label: 'États-Unis', locale: 'en', aliases: ['usa', 'us', 'america'] },
  { id: 'Australie', label: 'Australie', locale: 'en', aliases: ['australia'] },
  { id: 'Nouvelle-Zélande', label: 'Nouvelle-Zélande', locale: 'en', aliases: ['new zealand'] },
  { id: 'Espagne', label: 'España / Espagne', locale: 'es', aliases: ['spain', 'españa'] },
  { id: 'Mexique', label: 'México / Mexique', locale: 'es', aliases: ['mexico'] },
  { id: 'Argentine', label: 'Argentina / Argentine', locale: 'es' },
  { id: 'Colombie', label: 'Colombia / Colombie', locale: 'es' },
  { id: 'Chili', label: 'Chile / Chili', locale: 'es' },
  { id: 'Allemagne', label: 'Deutschland / Allemagne', locale: 'de', aliases: ['germany'] },
  { id: 'Autriche', label: 'Österreich / Autriche', locale: 'de', aliases: ['austria'] },
  { id: 'Italie', label: 'Italia / Italie', locale: 'it', aliases: ['italy'] },
  { id: 'Portugal', label: 'Portugal', locale: 'pt' },
  { id: 'Brésil', label: 'Brasil / Brésil', locale: 'pt', aliases: ['brazil'] },
  { id: 'Pays-Bas', label: 'Nederland / Pays-Bas', locale: 'nl', aliases: ['netherlands', 'holland'] },
  { id: 'Suède', label: 'Sverige / Suède', locale: 'en', aliases: ['sweden'] },
  { id: 'Norvège', label: 'Norge / Norvège', locale: 'en', aliases: ['norway'] },
  { id: 'Danemark', label: 'Danmark / Danemark', locale: 'en', aliases: ['denmark'] },
  { id: 'Finlande', label: 'Suomi / Finlande', locale: 'en', aliases: ['finland'] },
  { id: 'Pologne', label: 'Polska / Pologne', locale: 'en', aliases: ['poland'] },
  { id: 'Tchéquie', label: 'Česko / Tchéquie', locale: 'en', aliases: ['czech'] },
  { id: 'Roumanie', label: 'România / Roumanie', locale: 'en' },
  { id: 'Grèce', label: 'Ελλάδα / Grèce', locale: 'en', aliases: ['greece'] },
  { id: 'Turquie', label: 'Türkiye / Turquie', locale: 'en' },
  { id: 'Japon', label: '日本 / Japon', locale: 'en', aliases: ['japan'] },
  { id: 'Corée du Sud', label: '한국 / Corée du Sud', locale: 'en', aliases: ['korea'] },
  { id: 'Chine', label: '中国 / Chine', locale: 'en', aliases: ['china'] },
  { id: 'Singapour', label: 'Singapore / Singapour', locale: 'en' },
  { id: 'Émirats arabes unis', label: 'UAE / Émirats', locale: 'en', aliases: ['dubai', 'uae'] },
];

export function normalizeLocale(raw?: string | null): AppLocale {
  const c = String(raw ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  if (c === 'fr' || c === 'en') return c;
  // Langues encore incomplètes (es, de, it, pt, nl) : anglais plutôt qu'un mélange de langues.
  if (c === 'es' || c === 'de' || c === 'it' || c === 'pt' || c === 'nl') return 'en';
  return 'fr';
}

export function findCountryEntry(countryId?: string | null): CountryEntry | undefined {
  const id = String(countryId ?? '').trim().toLowerCase();
  if (!id) return undefined;
  return COUNTRY_CATALOG.find(
    (c) =>
      c.id.toLowerCase() === id ||
      c.label.toLowerCase() === id ||
      c.aliases?.some((a) => a.toLowerCase() === id),
  );
}

export function localeFromCountry(countryId?: string | null): AppLocale {
  return normalizeLocale(findCountryEntry(countryId)?.locale ?? 'fr');
}

export function localeLabel(code: AppLocale): string {
  return APP_LOCALES.find((l) => l.code === code)?.nativeLabel ?? code;
}

export function filterCountries(query: string): CountryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_CATALOG;
  return COUNTRY_CATALOG.filter((c) => {
    const hay = [c.id, c.label, ...(c.aliases ?? [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
