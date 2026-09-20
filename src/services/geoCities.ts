import { detectCountryFromDevice } from '../engines/countryLock';

/**
 * Suggestions de villes pour l'inscription : pays détecté par l'adresse IP (repli : fuseau horaire /
 * langue de l'appareil), puis villes du pays dont le nom COMMENCE par les lettres tapées (5 maximum,
 * moins s'il y en a moins). Services publics sans clé : ipwho.is (pays) et Photon/OpenStreetMap (villes).
 */

export type CitySuggestion = { key: string; name: string; region?: string; country: string; label: string };

type Where = { code: string; country: string; lat?: number; lon?: number };

const NAME_TO_CODE: Record<string, string> = {
  France: 'FR', Belgique: 'BE', Suisse: 'CH', Luxembourg: 'LU', Monaco: 'MC', Maroc: 'MA', Algérie: 'DZ',
  Tunisie: 'TN', Canada: 'CA', 'États-Unis': 'US', 'Royaume-Uni': 'GB', Allemagne: 'DE', Espagne: 'ES',
  Italie: 'IT', Portugal: 'PT', 'Pays-Bas': 'NL', Irlande: 'IE', Autriche: 'AT', Suède: 'SE', Norvège: 'NO',
  Danemark: 'DK', Pologne: 'PL', Tchéquie: 'CZ', Grèce: 'GR', Roumanie: 'RO', Finlande: 'FI', Australie: 'AU',
  'Nouvelle-Zélande': 'NZ', Brésil: 'BR', Mexique: 'MX', Japon: 'JP', 'Corée du Sud': 'KR', Chine: 'CN',
  Singapour: 'SG', 'Émirats arabes unis': 'AE', Turquie: 'TR', Russie: 'RU', Hongrie: 'HU',
};

let whereCache: Promise<Where> | null = null;

function deviceWhere(): Where {
  const country = detectCountryFromDevice();
  return { code: NAME_TO_CODE[country] ?? 'FR', country };
}

/** Pays (et position approximative) déduits de l'adresse IP — mis en cache pour la session. */
export function detectWhere(): Promise<Where> {
  if (whereCache) return whereCache;
  whereCache = (async () => {
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => ctrl?.abort(), 3500);
      const res = await fetch('https://ipwho.is/?fields=success,country,country_code,latitude,longitude', {
        signal: ctrl?.signal,
      });
      clearTimeout(timer);
      const j = (await res.json()) as { success?: boolean; country_code?: string; country?: string; latitude?: number; longitude?: number };
      if (j.success && j.country_code) {
        const dev = deviceWhere();
        return {
          code: j.country_code.toUpperCase(),
          country: dev.code === j.country_code.toUpperCase() ? dev.country : j.country ?? dev.country,
          lat: j.latitude,
          lon: j.longitude,
        };
      }
    } catch {
      /* repli appareil */
    }
    return deviceWhere();
  })();
  return whereCache;
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Villes du pays dont le nom commence par `query` (5 maximum). */
export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  const q = fold(query);
  if (!q) return [];
  const where = await detectWhere();
  const params = new URLSearchParams({ q: query.trim(), limit: '30', lang: 'fr', layer: 'city' });
  if (where.lat != null && where.lon != null) {
    params.set('lat', String(where.lat));
    params.set('lon', String(where.lon));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{ properties?: { name?: string; state?: string; county?: string; country?: string; countrycode?: string } }>;
  };
  const out: CitySuggestion[] = [];
  const seen = new Set<string>();
  for (const f of data.features ?? []) {
    const p = f.properties;
    if (!p?.name || (p.countrycode ?? '').toUpperCase() !== where.code) continue;
    if (!fold(p.name).startsWith(q)) continue;
    const region = p.county || p.state;
    const key = `${fold(p.name)}|${fold(region ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const country = p.country ?? where.country;
    out.push({
      key,
      name: p.name,
      region,
      country,
      label: region ? `${p.name} (${region}), ${country}` : `${p.name}, ${country}`,
    });
    if (out.length >= 5) break;
  }
  return out;
}
