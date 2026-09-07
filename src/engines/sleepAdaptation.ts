import type {
  AdaptiveAction,
  PlannedWorkout,
  SleepMetrics,
  SportDiscipline,
  WatchBrandId,
  WorkoutStep,
} from '../types/domain';

/**
 * Seuils coach sur score **canonique** (échelle type Garmin / Fitbit) :
 * ≥ 60 OK · < 60 médiocre → réduction forte du timing · < 40 repos.
 */
export type SleepBand = 'ok' | 'poor' | 'rest';

export function clampSleepScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Interpolation linéaire entre deux bornes. */
function mapRange(
  raw: number,
  fromLo: number,
  fromHi: number,
  toLo: number,
  toHi: number,
): number {
  if (fromHi <= fromLo) return toLo;
  const t = (raw - fromLo) / (fromHi - fromLo);
  return toLo + t * (toHi - toLo);
}

/**
 * Convertit le score affiché sur la montre → score canonique Azimut (0–100).
 *
 * Références publiques des bandes :
 * - Garmin / Fitbit / Samsung : Excellent 90–100, Good 80–89, Fair 60–79, Poor <60
 * - Apple Watch : Very High 96–100, High 81–95, OK 61–80, Low 41–60, Very Low 0–40
 * - Huawei : traité comme Garmin (échelle proche 0–100 / poor <60)
 */
export function normalizeSleepScore(
  rawScore: number,
  brand?: WatchBrandId | null,
): number {
  const raw = clampSleepScore(rawScore);
  if (!brand || brand === 'garmin' || brand === 'samsung' || brand === 'google_fitbit' || brand === 'huawei') {
    return raw;
  }

  if (raw <= 40) {
    return clampSleepScore(mapRange(raw, 0, 40, 0, 45));
  }
  if (raw <= 60) {
    return clampSleepScore(mapRange(raw, 41, 60, 46, 59));
  }
  if (raw <= 80) {
    return clampSleepScore(mapRange(raw, 61, 80, 60, 79));
  }
  if (raw <= 95) {
    return clampSleepScore(mapRange(raw, 81, 95, 80, 89));
  }
  return clampSleepScore(mapRange(raw, 96, 100, 90, 100));
}

export function sleepBandFromScore(
  score: number,
  brand?: WatchBrandId | null,
): SleepBand {
  const s = normalizeSleepScore(score, brand);
  if (s >= 60) return 'ok';
  if (s >= 40) return 'poor';
  return 'rest';
}

/** Libellé selon la marque (échelle native), pour l’UI. */
export function sleepScoreLabel(
  score: number,
  brand?: WatchBrandId | null,
): string {
  const s = clampSleepScore(score);
  if (brand === 'apple') {
    if (s >= 96) return 'Très élevé';
    if (s >= 81) return 'Élevé';
    if (s >= 61) return 'Correct';
    if (s >= 41) return 'Bas';
    return 'Très bas';
  }
  // Garmin / Fitbit / Samsung / Huawei / défaut
  if (s >= 90) return 'Excellent';
  if (s >= 80) return 'Bon';
  if (s >= 60) return 'Correct';
  if (s >= 40) return 'Médiocre';
  return 'Très faible';
}

/** Court rappel UI : un 72 n’est pas universel. */
export function sleepBrandCompareHint(brand?: WatchBrandId | null): string {
  switch (brand) {
    case 'apple':
      return 'Sur Apple, 72 est « Correct » (OK). L’app le compare à l’échelle Garmin pour adapter tes séances.';
    case 'garmin':
      return 'Sur Garmin, 72 est « Correct » (Fair). En dessous de 60 = médiocre.';
    case 'samsung':
      return 'Sur Samsung, l’échelle est proche de Garmin/Fitbit (médiocre sous 60).';
    case 'google_fitbit':
      return 'Sur Fitbit, la plupart des gens sont entre 72 et 83. Sous 60 = médiocre.';
    case 'huawei':
      return 'Sur Huawei, on utilise la même lecture que Garmin (médiocre sous 60).';
    default:
      return 'Le score est interprété selon ta montre, puis normalisé pour le coaching.';
  }
}

/** Nuit saisie manuellement : score brut + score normalisé pour le coach. */
export function buildManualSleepNight(opts: {
  score: number;
  totalMinutes?: number;
  date?: string;
  source?: WatchBrandId | 'manual';
}): SleepMetrics {
  const day = opts.date ?? new Date().toISOString().slice(0, 10);
  const totalMinutes = Math.max(0, Math.round(opts.totalMinutes ?? 0));
  const brand = opts.source === 'manual' ? undefined : opts.source;
  const score = clampSleepScore(opts.score);
  return {
    score,
    normalizedScore: normalizeSleepScore(score, brand),
    date: day,
    totalMinutes,
    lightMinutes: 0,
    deepMinutes: 0,
    remMinutes: 0,
    source: brand,
    entryMode: 'manual',
  };
}

export function coachingSleepScore(night: {
  score: number;
  normalizedScore?: number;
  source?: WatchBrandId;
}): number {
  if (night.normalizedScore != null) return clampSleepScore(night.normalizedScore);
  return normalizeSleepScore(night.score, night.source);
}

export function decideSleepAdaptiveAction(
  sleepScore: number,
  brand?: WatchBrandId | null,
): AdaptiveAction {
  const raw = clampSleepScore(sleepScore);
  const canonical = normalizeSleepScore(raw, brand);
  const band = sleepBandFromScore(raw, brand);
  const brandTag = brand ? ` · ${brandLabelShort(brand)}` : '';

  if (band === 'ok') {
    return { case: 4, type: 'recalc_weekly_load_no_shift' };
  }
  if (band === 'poor') {
    // Médiocre (< 60) : coupe nette du timing + allure plus douce
    return {
      case: 2,
      type: 'reduce_intensity',
      pct: 45,
      paceSecPerKmAdd: 90,
      message: `Sommeil ${raw}/100${brandTag} (médiocre · coach ${canonical}) — séance fortement raccourcie.`,
    };
  }
  return {
    case: 3,
    type: 'replace_rest_or_mobility',
    message: `Changement séance → repos · justificatif : sommeil (${raw}/100${brandTag}).`,
    reason: 'sleep',
  };
}

function brandLabelShort(brand: WatchBrandId): string {
  switch (brand) {
    case 'apple':
      return 'Apple';
    case 'garmin':
      return 'Garmin';
    case 'samsung':
      return 'Samsung';
    case 'google_fitbit':
      return 'Fitbit';
    case 'huawei':
      return 'Huawei';
    default:
      return brand;
  }
}

function softenStep(step: WorkoutStep, paceAdd: number, intensityFactor: number): WorkoutStep {
  const target = step.target;
  if (!target) {
    return {
      ...step,
      durationSec: step.durationSec
        ? Math.max(60, Math.round(step.durationSec * Math.min(1, 0.85 + intensityFactor * 0.15)))
        : step.durationSec,
    };
  }
  if (target.type === 'pace') {
    return {
      ...step,
      target: {
        ...target,
        minSecPerKm: target.minSecPerKm + paceAdd,
        maxSecPerKm: target.maxSecPerKm + paceAdd,
      },
    };
  }
  if (target.type === 'hr') {
    const cut = 1 - (1 - intensityFactor) * 0.9;
    return {
      ...step,
      target: {
        ...target,
        minBpm: Math.max(90, Math.round(target.minBpm * cut)),
        maxBpm: Math.max(95, Math.round(target.maxBpm * cut)),
      },
    };
  }
  if (target.type === 'power') {
    return {
      ...step,
      target: {
        ...target,
        minWatts: Math.max(40, Math.round(target.minWatts * intensityFactor)),
        maxWatts: Math.max(50, Math.round(target.maxWatts * intensityFactor)),
      },
    };
  }
  return step;
}

function disciplineRestTitle(discipline: SportDiscipline): string {
  switch (discipline) {
    case 'swim':
      return 'Repos natation (sommeil)';
    case 'bike':
      return 'Repos vélo (sommeil)';
    case 'strength':
    case 'ppg':
      return 'Repos musculation (sommeil)';
    case 'brick':
      return 'Repos enchaînement (sommeil)';
    default:
      return 'Repos (sommeil)';
  }
}

/**
 * Applique l’adaptation sommeil sur une séance (course, nage, vélo, muscu…).
 * < 40 canonique → repos crédité (pas un oubli).
 */
export function applySleepAdaptiveToWorkout(
  workout: PlannedWorkout,
  action: AdaptiveAction,
  sleepScore: number,
): PlannedWorkout {
  if (workout.discipline === 'rest' || workout.lockedRest) return workout;

  if (action.case === 3 && action.reason === 'sleep') {
    const score = clampSleepScore(sleepScore);
    return {
      ...workout,
      title: disciplineRestTitle(workout.discipline),
      discipline: 'rest',
      lockedRest: true,
      expectedRpe: 1,
      steps: [],
      plannedDistanceM: undefined,
      plannedDurationSec: undefined,
      coachNote: action.message,
      sleepAdaptation: {
        reason: 'poor_sleep',
        score,
        originalTitle: workout.title,
        originalDiscipline: workout.discipline,
        creditedComplete: true,
      },
    };
  }

  if (action.case === 2 && action.type === 'reduce_intensity') {
    const factor = 1 - action.pct / 100;
    const paceAdd = action.paceSecPerKmAdd ?? 60;
    // Coupe nette du timing (surtout sommeil médiocre < 60)
    const volumeFactor = Math.max(0.45, factor);
    return {
      ...workout,
      title: `${workout.title} (−${action.pct}% timing)`,
      expectedRpe: workout.expectedRpe
        ? Math.max(2, Math.round(workout.expectedRpe * Math.max(0.55, factor)))
        : workout.expectedRpe,
      plannedDistanceM: workout.plannedDistanceM
        ? Math.round(workout.plannedDistanceM * volumeFactor)
        : undefined,
      plannedDurationSec: workout.plannedDurationSec
        ? Math.round(workout.plannedDurationSec * volumeFactor)
        : undefined,
      steps: workout.steps.map((s) => {
        const softened = softenStep(s, paceAdd, factor);
        return {
          ...softened,
          durationSec: softened.durationSec
            ? Math.max(60, Math.round(softened.durationSec * volumeFactor))
            : softened.durationSec,
          distanceMeters: softened.distanceMeters
            ? Math.max(50, Math.round(softened.distanceMeters * volumeFactor))
            : softened.distanceMeters,
        };
      }),
      coachNote: action.message,
      sleepAdaptation: {
        reason: 'poor_sleep',
        score: clampSleepScore(sleepScore),
        originalTitle: workout.title,
        originalDiscipline: workout.discipline,
        creditedComplete: false,
      },
    };
  }

  return workout;
}

/** Séance du jour (ou prochaine) à adapter après saisie du score. */
export function findWorkoutToAdaptForSleep(
  plan: PlannedWorkout[],
  todayIso: string,
): PlannedWorkout | undefined {
  const today = plan
    .filter((w) => w.date === todayIso && w.discipline !== 'rest' && !w.lockedRest)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (today) return today;
  return plan
    .filter((w) => w.date > todayIso && w.discipline !== 'rest' && !w.lockedRest)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
}
