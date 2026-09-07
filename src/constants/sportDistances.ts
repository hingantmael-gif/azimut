/**
 * Distances de référence par discipline — chronos utilisateur (paramètres)
 * et cibles de prédiction.
 */

export type SportTimeDiscipline = 'run' | 'swim' | 'bike' | 'triathlon';

export type SportDistanceDef = {
  key: string;
  label: string;
  /** Distance en km (natation : 0.1 = 100 m) */
  km: number;
  hint?: string;
};

export const RUN_DISTANCES: SportDistanceDef[] = [
  { key: '5k', label: '5 km', km: 5 },
  { key: '10k', label: '10 km', km: 10 },
  { key: '20k', label: '20 km', km: 20 },
  { key: 'semi', label: 'Semi (21,1 km)', km: 21.0975 },
  { key: 'marathon', label: 'Marathon (42,2 km)', km: 42.195 },
];

export const SWIM_DISTANCES: SportDistanceDef[] = [
  { key: '50m', label: '50 m nage libre', km: 0.05, hint: 'Bassin' },
  { key: '100m', label: '100 m nage libre', km: 0.1, hint: 'Bassin' },
  { key: '200m', label: '200 m nage libre', km: 0.2, hint: 'Bassin' },
  { key: '400m', label: '400 m nage libre', km: 0.4, hint: 'Bassin' },
  { key: '800m', label: '800 m nage libre', km: 0.8, hint: 'Bassin' },
  { key: '1500m', label: '1500 m nage libre', km: 1.5, hint: 'Bassin' },
  { key: '1k-ow', label: '1 km eau libre', km: 1, hint: 'Open water' },
  { key: '2k-ow', label: '2 km eau libre', km: 2, hint: 'Open water' },
  { key: '5k-ow', label: '5 km eau libre', km: 5, hint: 'Open water' },
];

export const BIKE_DISTANCES: SportDistanceDef[] = [
  { key: '10k', label: '10 km (CLM)', km: 10, hint: 'Contre-la-montre court' },
  { key: '20k', label: '20 km (CLM)', km: 20, hint: 'Contre-la-montre iconique' },
  { key: '40k', label: '40 km (CLM)', km: 40, hint: 'CLM classique ~1 h' },
  { key: '80k', label: '80 km (cyclosportive)', km: 80 },
  { key: '90k', label: '90 km (70.3 vélo)', km: 90 },
  { key: '120k', label: '120 km (gran fondo)', km: 120 },
  { key: '160k', label: '160 km (century)', km: 160, hint: '100 miles' },
  { key: '180k', label: '180 km (Ironman vélo)', km: 180 },
  { key: '200k', label: '200 km (brevet)', km: 200 },
];

/** Splits triathlon — clés stockées dans sportTimesSec.triathlon */
export const TRI_SPLIT_ROWS: {
  key: string;
  label: string;
  discipline: 'swim' | 'bike' | 'run';
  /** Distance de l’épreuve (km) pour estimation croisée */
  km: number;
  format: 'sprint' | 'olympic' | '70.3' | '140.6';
}[] = [
  { key: 'sprint-swim', label: 'Sprint — natation (750 m)', discipline: 'swim', km: 0.75, format: 'sprint' },
  { key: 'sprint-bike', label: 'Sprint — vélo (20 km)', discipline: 'bike', km: 20, format: 'sprint' },
  { key: 'sprint-run', label: 'Sprint — course (5 km)', discipline: 'run', km: 5, format: 'sprint' },
  { key: 'olympic-swim', label: 'Olympique — natation (1,5 km)', discipline: 'swim', km: 1.5, format: 'olympic' },
  { key: 'olympic-bike', label: 'Olympique — vélo (40 km)', discipline: 'bike', km: 40, format: 'olympic' },
  { key: 'olympic-run', label: 'Olympique — course (10 km)', discipline: 'run', km: 10, format: 'olympic' },
  { key: '70.3-swim', label: '70.3 — natation (1,9 km)', discipline: 'swim', km: 1.9, format: '70.3' },
  { key: '70.3-bike', label: '70.3 — vélo (90 km)', discipline: 'bike', km: 90, format: '70.3' },
  { key: '70.3-run', label: '70.3 — course (21,1 km)', discipline: 'run', km: 21.0975, format: '70.3' },
  { key: '140.6-swim', label: 'Ironman — natation (3,8 km)', discipline: 'swim', km: 3.8, format: '140.6' },
  { key: '140.6-bike', label: 'Ironman — vélo (180 km)', discipline: 'bike', km: 180, format: '140.6' },
  { key: '140.6-run', label: 'Ironman — course (42,2 km)', discipline: 'run', km: 42.195, format: '140.6' },
];

export const TRI_FORMATS = [
  { id: 'sprint' as const, label: 'Sprint', swimKm: 0.75, bikeKm: 20, runKm: 5 },
  { id: 'olympic' as const, label: 'Olympique', swimKm: 1.5, bikeKm: 40, runKm: 10 },
  { id: '70.3' as const, label: '70.3', swimKm: 1.9, bikeKm: 90, runKm: 21.0975 },
  { id: '140.6' as const, label: 'Ironman 140.6', swimKm: 3.8, bikeKm: 180, runKm: 42.195 },
];
