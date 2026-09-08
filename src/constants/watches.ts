import type { WatchBrandId } from '../types/domain';

export type WatchCatalogEntry = {
  id: WatchBrandId;
  label: string;
  subtitle: string;
  /** Échelle native du score (pour la saisie manuelle) */
  scoreScaleHint: string;
};

/**
 * Top montres — score saisi manuellement ; interprétation selon la marque.
 */
export const WATCH_CATALOG: WatchCatalogEntry[] = [
  {
    id: 'apple',
    label: 'Apple Watch',
    subtitle: 'Apple Santé',
    scoreScaleHint: 'Score 0–100 (Très élevé / Élevé / Correct / Bas)',
  },
  {
    id: 'garmin',
    label: 'Garmin',
    subtitle: 'Garmin',
    scoreScaleHint: 'Score 0–100 (Excellent / Bon / Correct / Médiocre sous 60)',
  },
  {
    id: 'samsung',
    label: 'Samsung Galaxy Watch',
    subtitle: 'Samsung Health',
    scoreScaleHint: 'Score 0–100 (proche Garmin / Fitbit)',
  },
  {
    id: 'google_fitbit',
    label: 'Pixel Watch / Fitbit',
    subtitle: 'Fitbit',
    scoreScaleHint: 'Score 0–100 (souvent 72–83 en moyenne)',
  },
  {
    id: 'huawei',
    label: 'Huawei Watch',
    subtitle: 'Huawei Santé',
    scoreScaleHint: 'Score 0–100 (lecture type Garmin)',
  },
];

export function getWatchEntry(id: WatchBrandId): WatchCatalogEntry {
  return WATCH_CATALOG.find((w) => w.id === id) ?? WATCH_CATALOG[0]!;
}

export function watchExtractLabel(_id?: WatchBrandId): string {
  return 'Importer manuellement';
}
