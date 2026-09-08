import type { PlannedWorkout, SleepMetrics, WatchBrandId } from '../types/domain';
import { addDaysIso, toLocalDateIso } from './sleepCalendar';
import { clampSleepScore, normalizeSleepScore } from './sleepAdaptation';
import {
  applyStartupFactorsToPlan,
  firstTrainingSessions,
} from './startupSoftening';

const LOOKBACK_DAYS = 5;
/** Moyenne sous ce seuil (échelle coach) → démarrage doux */
const POOR_THRESHOLD = 60;
/** Au moins 3 nuits renseignées sur la fenêtre de 5 jours */
const MIN_NIGHTS_FOR_RAMP = 3;

export type SleepRecentAverage = {
  average: number | null;
  count: number;
  nights: SleepMetrics[];
  /** Dates couvertes (les 5 jours précédents, hors aujourd’hui de démarrage) */
  windowStart: string;
  windowEnd: string;
};

export type SleepStartupRampResult = {
  plan: PlannedWorkout[];
  applied: boolean;
  averageScore: number | null;
  nightsUsed: number;
  sessionsSoftened: number;
  message: string | null;
};

/**
 * Moyenne des scores sommeil sur les `days` jours précédant le démarrage
 * (ex. si on démarre le 6 → 1, 2, 3, 4, 5).
 */
export function averageSleepScoreLastDays(
  history: SleepMetrics[] | undefined,
  opts: {
    days?: number;
    /** Jour de démarrage du programme (exclu de la fenêtre) */
    startDateIso?: string;
    brand?: WatchBrandId | null;
  } = {},
): SleepRecentAverage {
  const days = opts.days ?? LOOKBACK_DAYS;
  const start = opts.startDateIso ?? toLocalDateIso();
  const windowEnd = addDaysIso(start, -1);
  const windowStart = addDaysIso(start, -days);
  const nights = (history ?? []).filter(
    (n) => n.date >= windowStart && n.date <= windowEnd,
  );
  if (nights.length === 0) {
    return {
      average: null,
      count: 0,
      nights: [],
      windowStart,
      windowEnd,
    };
  }
  const sum = nights.reduce(
    (acc, n) => acc + normalizeSleepScore(n.score, n.source ?? opts.brand),
    0,
  );
  return {
    average: clampSleepScore(Math.round(sum / nights.length)),
    count: nights.length,
    nights,
    windowStart,
    windowEnd,
  };
}

/**
 * Si la moyenne sommeil des 5 jours précédents est médiocre (&lt; 60),
 * allège les premières séances du plan puis remonte progressivement.
 */
export function applySleepStartupRamp(
  plan: PlannedWorkout[],
  history: SleepMetrics[] | undefined,
  opts: {
    brand?: WatchBrandId | null;
    startDateIso?: string;
    programId?: string;
  } = {},
): SleepStartupRampResult {
  const avg = averageSleepScoreLastDays(history, {
    startDateIso: opts.startDateIso,
    brand: opts.brand,
  });

  if (
    avg.average == null ||
    avg.count < MIN_NIGHTS_FOR_RAMP ||
    avg.average >= POOR_THRESHOLD
  ) {
    return {
      plan,
      applied: false,
      averageScore: avg.average,
      nightsUsed: avg.count,
      sessionsSoftened: 0,
      message: null,
    };
  }

  const average = avg.average;
  const startFactor = average < 40 ? 0.55 : average < 50 ? 0.62 : 0.72;
  const rampCount = average < 40 ? 8 : average < 50 ? 6 : 5;

  const targets = firstTrainingSessions(plan, {
    programId: opts.programId,
    count: rampCount,
  });

  const softenIds = new Map<string, number>();
  targets.forEach((w, i) => {
    const t = targets.length <= 1 ? 1 : i / (targets.length - 1);
    softenIds.set(w.id, startFactor + (1 - startFactor) * t);
  });

  if (softenIds.size === 0) {
    return {
      plan,
      applied: false,
      averageScore: average,
      nightsUsed: avg.count,
      sessionsSoftened: 0,
      message: null,
    };
  }

  const nextPlan = applyStartupFactorsToPlan(plan, softenIds, (factor) => {
    const pct = Math.round((1 - factor) * 100);
    return `Démarrage doux (sommeil ${average}/100 · ${avg.count} nuit${avg.count > 1 ? 's' : ''}) — volume / intensité −${pct} %, puis montée progressive.`;
  });

  const pctStart = Math.round((1 - startFactor) * 100);
  const message = `Sommeil moyen ${average}/100 sur ${avg.count} nuit${avg.count > 1 ? 's' : ''} (5 jours précédents) — démarrage progressif : les ${softenIds.size} premières séances sont allégées (jusqu’à −${pctStart} %), puis l’intensité remonte.`;

  return {
    plan: nextPlan,
    applied: true,
    averageScore: average,
    nightsUsed: avg.count,
    sessionsSoftened: softenIds.size,
    message,
  };
}

/** Aperçu sans muter le plan (pour alerte UI). */
export function previewSleepStartupRamp(
  history: SleepMetrics[] | undefined,
  opts: { brand?: WatchBrandId | null; startDateIso?: string } = {},
): { wouldApply: boolean; averageScore: number | null; nightsUsed: number; message: string | null } {
  const avg = averageSleepScoreLastDays(history, opts);
  if (
    avg.average == null ||
    avg.count < MIN_NIGHTS_FOR_RAMP ||
    avg.average >= POOR_THRESHOLD
  ) {
    return {
      wouldApply: false,
      averageScore: avg.average,
      nightsUsed: avg.count,
      message: null,
    };
  }
  const startFactor = avg.average < 40 ? 0.55 : avg.average < 50 ? 0.62 : 0.72;
  const pctStart = Math.round((1 - startFactor) * 100);
  const rampCount = avg.average < 40 ? 8 : avg.average < 50 ? 6 : 5;
  return {
    wouldApply: true,
    averageScore: avg.average,
    nightsUsed: avg.count,
    message: `Moyenne sommeil ${avg.average}/100 sur ${avg.count} des 5 derniers jours. Les ${rampCount} premières séances seront plus tranquilles (jusqu’à −${pctStart} %), puis l’intensité remontera progressivement.`,
  };
}
