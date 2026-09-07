/**
 * Prédiction de chronos équivalents (5k → 10k / 20k / semi / marathon).
 *
 * Synthèse multi-sources (non propriétaire — formules publiques / peer-reviewed) :
 *
 * 1. Peter Riegel (American Scientist, 1977) — T2 = T1 × (D2/D1)^1.06
 *    Utilisé par Runner’s World ; bien calibré jusqu’au semi (BMC Sports Sci. 2016).
 *
 * 2. Dave Cameron (Nielsen / Statistical Services, 1998) — correction non linéaire
 *    f(D) sur distances en mètres ; souvent plus réaliste sur les grands écarts (5k→marathon).
 *
 * 3. Jack Daniels VDOT (Daniels’ Running Formula) — coût O₂ + %VO₂max soutenable
 *    Référence coaching ; Firstbeat/Garmin s’appuient aussi sur des tables type Daniels
 *    (VO₂max → performances), sans publier leur ML.
 *
 * 4. Correction « durabilité » volume (BMC 2016 + analyses VDOT/Riegel failure modes) :
 *    Riegel/VDOT sont trop optimistes au marathon si le volume hebdo est bas
 *    (< ~40–55 km/sem pour un recreational).
 *
 * Strava Performance Predictions = ML propriétaire (historique + pairs) → non reproductible
 * hors-ligne ; on ne l’imite pas, on reste sur des modèles audités.
 *
 * Stratégie Azimut : moyenne pondérée Riegel + Cameron + Daniels, puis facteur volume
 * sur semi long / marathon.
 */

import type { RacePrediction } from '../types/domain';
import { zoneMixForRaceDistanceKm } from './sportsScience';

export type RacePredictOpts = {
  /** Volume hebdo moyen (km) — affine le marathon / semi */
  weeklyKmAvg?: number;
};

const TARGETS: { label: string; km: number; key: '5k' | '10k' | '20k' | 'semi' | 'marathon' }[] = [
  { label: '5 km', km: 5, key: '5k' },
  { label: '10 km', km: 10, key: '10k' },
  { label: '20 km', km: 20, key: '20k' },
  { label: 'Semi', km: 21.0975, key: 'semi' },
  { label: 'Marathon', km: 42.195, key: 'marathon' },
];

/** Riegel — exposant classique 1.06 (recréatifs / Runner’s World). */
export function riegelPredictSec(
  refKm: number,
  refTimeSec: number,
  targetKm: number,
  exponent = 1.06,
): number {
  if (refKm <= 0 || targetKm <= 0 || refTimeSec <= 0) return 0;
  return refTimeSec * Math.pow(targetKm / refKm, exponent);
}

/**
 * Cameron (forme mètres, Nielsen) :
 * T2 = T1 × (D2/D1) × f(D1)/f(D2)
 * f(D) = 13.49681 − 0.000030363·D + 835.7114 / D^0.7905
 */
export function cameronPredictSec(
  refKm: number,
  refTimeSec: number,
  targetKm: number,
): number {
  if (refKm <= 0 || targetKm <= 0 || refTimeSec <= 0) return 0;
  const d1 = refKm * 1000;
  const d2 = targetKm * 1000;
  const f = (d: number) => 13.49681 - 0.000030363 * d + 835.7114 / Math.pow(d, 0.7905);
  return (refTimeSec / d1) * (f(d1) / f(d2)) * d2;
}

/** Coût O₂ Daniels (ml/kg/min) pour vitesse v en m/min. */
function danielsOxygenCost(vMetersPerMin: number): number {
  return -4.6 + 0.182258 * vMetersPerMin + 0.000104 * vMetersPerMin * vMetersPerMin;
}

/** Fraction de VO₂max soutenable selon la durée (min) — Daniels & Gilbert. */
function danielsPercentMax(tMin: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMin) +
    0.2989558 * Math.exp(-0.1932605 * tMin)
  );
}

/** VDOT à partir d’une perf connue. */
export function vdotFromRace(refKm: number, refTimeSec: number): number {
  const tMin = refTimeSec / 60;
  const v = (refKm * 1000) / tMin;
  const pct = danielsPercentMax(tMin);
  if (pct <= 0) return 0;
  return danielsOxygenCost(v) / pct;
}

/** Temps (sec) pour une distance donnée à un VDOT donné (recherche dichotomique). */
export function danielsPredictSec(vdot: number, targetKm: number): number {
  if (vdot <= 0 || targetKm <= 0) return 0;
  const distM = targetKm * 1000;
  let lo = 80; // ~7.5 km/h
  let hi = 450; // ~27 km/h
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const tMin = distM / mid;
    const demand = danielsOxygenCost(mid) / danielsPercentMax(tMin);
    if (demand > vdot) hi = mid;
    else lo = mid;
  }
  const v = (lo + hi) / 2;
  return (distM / v) * 60;
}

/**
 * Facteur de durabilité (temps × facteur = plus lent si volume insuffisant).
 * Aligné sur les constats BMC 2016 / analyses « Riegel too fast at marathon ».
 */
export function durabilityTimeFactor(
  targetKm: number,
  weeklyKmAvg?: number,
): number {
  const km = weeklyKmAvg != null && weeklyKmAvg > 0 ? weeklyKmAvg : 28;
  if (targetKm >= 40) {
    if (km < 35) return 1.1;
    if (km < 45) return 1.07;
    if (km < 55) return 1.04;
    if (km < 70) return 1.02;
    return 1;
  }
  if (targetKm >= 18) {
    if (km < 25) return 1.04;
    if (km < 40) return 1.02;
    return 1;
  }
  return 1;
}

/**
 * Pondération selon l’écart de distance :
 * - proches (≤×2.2) : Riegel + Cameron (très proches, bons jusqu’au 10k/20k)
 * - moyens : mélange des 3
 * - marathon : plus de poids Daniels + Cameron (moins d’optimisme Riegel)
 */
function blendWeights(ratio: number): { r: number; c: number; d: number } {
  if (ratio <= 2.2) return { r: 0.45, c: 0.45, d: 0.1 };
  if (ratio <= 5) return { r: 0.3, c: 0.35, d: 0.35 };
  return { r: 0.2, c: 0.35, d: 0.45 };
}

export function hybridPredictSec(
  refKm: number,
  refTimeSec: number,
  targetKm: number,
  opts?: RacePredictOpts,
): number {
  if (Math.abs(targetKm - refKm) < 0.05) return refTimeSec;

  const r = riegelPredictSec(refKm, refTimeSec, targetKm);
  const c = cameronPredictSec(refKm, refTimeSec, targetKm);
  const vdot = vdotFromRace(refKm, refTimeSec);
  const d = danielsPredictSec(vdot, targetKm);

  const ratio = targetKm / refKm;
  const w = blendWeights(ratio);
  let blended = w.r * r + w.c * c + w.d * d;

  // Si un modèle diverait (NaN), fallback Riegel
  if (!Number.isFinite(blended) || blended <= 0) {
    blended = r > 0 ? r : c > 0 ? c : d;
  }

  blended *= durabilityTimeFactor(targetKm, opts?.weeklyKmAvg);
  return Math.round(blended);
}

export function predictRaceTimes(
  refDistanceKm: number,
  refTimeSec: number,
  opts?: RacePredictOpts,
): RacePrediction[] {
  if (refDistanceKm <= 0 || refTimeSec <= 0) return [];
  return TARGETS.map((t) => {
    const predictedSec = hybridPredictSec(refDistanceKm, refTimeSec, t.km, opts);
    return {
      distanceLabel: t.label,
      predictedSec,
      paceSecPerKm: Math.round(predictedSec / t.km),
    };
  });
}

export function predictRaceTimesSecMap(
  refDistanceKm: number,
  refTimeSec: number,
  opts?: RacePredictOpts,
): NonNullable<import('../types/domain').OnboardingAnswers['raceTimesSec']> {
  const list = predictRaceTimes(refDistanceKm, refTimeSec, opts);
  const byLabel = Object.fromEntries(list.map((r) => [r.distanceLabel, r.predictedSec]));
  return {
    '5k': byLabel['5 km'],
    '10k': byLabel['10 km'],
    '20k': byLabel['20 km'],
    semi: byLabel['Semi'],
    marathon: byLabel['Marathon'],
  };
}

/**
 * Extrapolation Riegel pour une distance personnalisée (ex. 63 km).
 * T2 = T1 × (D2/D1)^1.06 — avec option hybride + mix de zones.
 */
export function predictCustomDistance(opts: {
  refKm: number;
  refTimeSec: number;
  targetKm: number;
  weeklyKmAvg?: number;
  useHybrid?: boolean;
}): {
  predictedSec: number;
  paceSecPerKm: number;
  riegelSec: number;
  zoneMix: ReturnType<typeof zoneMixForRaceDistanceKm>;
} {
  const riegelSec = riegelPredictSec(opts.refKm, opts.refTimeSec, opts.targetKm);
  const predictedSec = opts.useHybrid === false
    ? Math.round(riegelSec)
    : hybridPredictSec(opts.refKm, opts.refTimeSec, opts.targetKm, {
        weeklyKmAvg: opts.weeklyKmAvg,
      });
  return {
    predictedSec,
    paceSecPerKm: opts.targetKm > 0 ? Math.round(predictedSec / opts.targetKm) : 0,
    riegelSec: Math.round(riegelSec),
    zoneMix: zoneMixForRaceDistanceKm(opts.targetKm),
  };
}

/** Affichage chrono course : mm:ss ou h:mm:ss */
export function formatRaceClock(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '—';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
}
