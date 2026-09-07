/**
 * Prédictions multi-disciplines — chaque sport a son propre moteur.
 *
 * - Course : hybride Riegel + Cameron + Daniels + durabilité volume
 * - Natation : Critical Swim Speed + exposant adaptatif (pas le même Riegel course)
 * - Vélo : FTP / physique plat (CdA) + intensité selon durée (pas Riegel)
 */

import {
  BIKE_DISTANCES,
  RUN_DISTANCES,
  SWIM_DISTANCES,
  TRI_FORMATS,
  type SportDistanceDef,
} from '../constants/sportDistances';
import type { OnboardingAnswers, RacePrediction } from '../types/domain';
import { predictBikeCatalog, bikeSecForDistanceKm } from './bikePrediction';
import { hybridPredictSec } from './raceTimePrediction';
import { predictSwimCatalog, swimSecForDistanceKm } from './swimPrediction';

export type PredictionRow = RacePrediction & {
  key: string;
  /** Chrono réellement saisi par l’utilisateur */
  isMeasured?: boolean;
  /** Vitesse moyenne (vélo) */
  avgKmh?: number;
  method?: string;
};

function bestRef(
  times: Partial<Record<string, number>> | undefined,
  catalog: SportDistanceDef[],
): { key: string; km: number; sec: number } | null {
  if (!times) return null;
  let best: { key: string; km: number; sec: number } | null = null;
  for (const d of catalog) {
    const sec = times[d.key];
    if (sec == null || !(sec > 0)) continue;
    if (!best) {
      best = { key: d.key, km: d.km, sec };
      continue;
    }
    if (d.km >= best.km) best = { key: d.key, km: d.km, sec };
  }
  return best;
}

function runTimesMap(o?: OnboardingAnswers | null): Partial<Record<string, number>> {
  return { ...(o?.raceTimesSec ?? {}) };
}

function riderWeightKg(weightKg?: number): number | undefined {
  return weightKg != null && weightKg > 40 ? weightKg : undefined;
}

/** Course : prédictions uniquement si au moins un chrono saisi. */
export function predictRunFromProfile(o?: OnboardingAnswers | null): PredictionRow[] {
  const times = runTimesMap(o);
  const ref = bestRef(times, RUN_DISTANCES);
  if (!ref) return [];

  return RUN_DISTANCES.map((d) => {
    const measured = times[d.key];
    if (measured != null && measured > 0) {
      return {
        key: d.key,
        distanceLabel: d.label,
        predictedSec: measured,
        paceSecPerKm: Math.round(measured / d.km),
        isMeasured: true,
        method: 'measured',
      };
    }
    const predictedSec = hybridPredictSec(ref.km, ref.sec, d.km, {
      weeklyKmAvg: o?.weeklyKmAvg,
    });
    return {
      key: d.key,
      distanceLabel: d.label,
      predictedSec,
      paceSecPerKm: Math.round(predictedSec / d.km),
      isMeasured: false,
      method: 'hybrid',
    };
  });
}

/**
 * Natation — CSS (200/400) + facteurs de pace + Riegel natation adaptatif.
 */
export function predictSwimFromProfile(o?: OnboardingAnswers | null): PredictionRow[] {
  const times = o?.sportTimesSec?.swim ?? {};
  return predictSwimCatalog(times).map((r) => ({
    key: r.key,
    distanceLabel: r.distanceLabel,
    predictedSec: r.predictedSec,
    paceSecPerKm: r.paceSecPer100,
    isMeasured: r.isMeasured,
    method: r.method,
  }));
}

/**
 * Vélo — FTP + équation de puissance (plat) ; pas d’exposant type course.
 */
export function predictBikeFromProfile(
  o?: OnboardingAnswers | null,
  opts?: { weightKg?: number },
): PredictionRow[] {
  const times = o?.sportTimesSec?.bike ?? {};
  return predictBikeCatalog(times, {
    ftpWatts: o?.ftpWatts,
    weightKg: riderWeightKg(opts?.weightKg),
  }).map((r) => ({
    key: r.key,
    distanceLabel: r.distanceLabel,
    predictedSec: r.predictedSec,
    paceSecPerKm: r.paceSecPerKm,
    avgKmh: r.avgKmh,
    isMeasured: r.isMeasured,
    method: r.method,
  }));
}

function swimSecForKm(o: OnboardingAnswers | null | undefined, km: number): number | null {
  const times = o?.sportTimesSec?.swim ?? {};
  return swimSecForDistanceKm(times, km);
}

function bikeSecForKm(
  o: OnboardingAnswers | null | undefined,
  km: number,
  weightKg?: number,
): number | null {
  const times = o?.sportTimesSec?.bike ?? {};
  return bikeSecForDistanceKm(times, km, {
    ftpWatts: o?.ftpWatts,
    weightKg: riderWeightKg(weightKg),
  });
}

function runSecForKm(o: OnboardingAnswers | null | undefined, km: number): number | null {
  const times = runTimesMap(o);
  const ref = bestRef(times, RUN_DISTANCES);
  if (!ref) return null;
  return hybridPredictSec(ref.km, ref.sec, km, { weeklyKmAvg: o?.weeklyKmAvg });
}

export type TriathlonPrediction = {
  formatId: string;
  formatLabel: string;
  swimSec: number | null;
  bikeSec: number | null;
  runSec: number | null;
  totalSec: number | null;
  /** true si chaque split a une base (saisie ou estimation discipline) */
  complete: boolean;
  missing: Array<'swim' | 'bike' | 'run'>;
};

/**
 * Triathlon : somme des 3 disciplines (moteurs distincts).
 * Pas de total si une discipline manque — on n’invente pas.
 */
export function predictTriathlonFromProfile(
  o?: OnboardingAnswers | null,
  opts?: { weightKg?: number },
): TriathlonPrediction[] {
  const stored = o?.sportTimesSec?.triathlon ?? {};

  return TRI_FORMATS.map((fmt) => {
    const swimKey = `${fmt.id}-swim`;
    const bikeKey = `${fmt.id}-bike`;
    const runKey = `${fmt.id}-run`;

    const swimStored = stored[swimKey];
    const bikeStored = stored[bikeKey];
    const runStored = stored[runKey];

    const swimSec =
      swimStored != null && swimStored > 0
        ? swimStored
        : swimSecForKm(o, fmt.swimKm);
    const bikeSec =
      bikeStored != null && bikeStored > 0
        ? bikeStored
        : bikeSecForKm(o, fmt.bikeKm, opts?.weightKg);
    const runSec =
      runStored != null && runStored > 0
        ? runStored
        : runSecForKm(o, fmt.runKm);

    const missing: Array<'swim' | 'bike' | 'run'> = [];
    if (swimSec == null) missing.push('swim');
    if (bikeSec == null) missing.push('bike');
    if (runSec == null) missing.push('run');

    const complete = missing.length === 0;
    const totalSec = complete
      ? Math.round((swimSec ?? 0) + (bikeSec ?? 0) + (runSec ?? 0))
      : null;

    return {
      formatId: fmt.id,
      formatLabel: fmt.label,
      swimSec,
      bikeSec,
      runSec,
      totalSec,
      complete,
      missing,
    };
  });
}

export function hasAnySportReference(o?: OnboardingAnswers | null): boolean {
  if (!o) return false;
  if (o.raceTimesSec && Object.values(o.raceTimesSec).some((v) => v != null && v > 0)) {
    return true;
  }
  const st = o.sportTimesSec;
  if (st?.swim && Object.values(st.swim).some((v) => v != null && v > 0)) return true;
  if (st?.bike && Object.values(st.bike).some((v) => v != null && v > 0)) return true;
  if (st?.triathlon && Object.values(st.triathlon).some((v) => v != null && v > 0)) {
    return true;
  }
  if (o.ftpWatts && o.ftpWatts > 80) return true;
  return false;
}
