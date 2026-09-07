import type { PlannedWorkout, SleepMetrics, WatchBrandId, WorkoutStep } from '../types/domain';
import { addDaysIso, toLocalDateIso } from './sleepCalendar';
import { clampSleepScore, normalizeSleepScore } from './sleepAdaptation';

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
  // Plus le sommeil est bas, plus on démarre doux et sur plus de séances
  const startFactor = average < 40 ? 0.55 : average < 50 ? 0.62 : 0.72;
  const rampCount = average < 40 ? 8 : average < 50 ? 6 : 5;

  const scoped = opts.programId
    ? plan.filter((w) => w.programId === opts.programId)
    : plan;
  const trainings = [...scoped]
    .filter((w) => w.discipline !== 'rest' && !w.lockedRest)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const softenIds = new Map<string, number>();
  const targets = trainings.slice(0, Math.min(rampCount, trainings.length));
  targets.forEach((w, i) => {
    const t = targets.length <= 1 ? 1 : i / (targets.length - 1);
    const factor = startFactor + (1 - startFactor) * t;
    softenIds.set(w.id, factor);
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

  const nextPlan = plan.map((w) => {
    const factor = softenIds.get(w.id);
    if (factor == null || factor >= 0.99) return w;
    return softenStartupWorkout(w, factor, average, avg.count);
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

function softenStartupWorkout(
  w: PlannedWorkout,
  factor: number,
  averageScore: number,
  nightsUsed: number,
): PlannedWorkout {
  const pct = Math.round((1 - factor) * 100);
  if (pct <= 0) return w;
  const note = `Démarrage doux (sommeil ${averageScore}/100 · ${nightsUsed} nuit${nightsUsed > 1 ? 's' : ''}) — volume / intensité −${pct} %, puis montée progressive.`;
  const paceMul = 1 + (1 - factor) * 0.35; // allure plus lente

  return {
    ...w,
    title: w.title.includes('(démarrage doux)')
      ? w.title
      : `${w.title} (démarrage doux)`,
    coachNote: w.coachNote ? `${note}\n${w.coachNote}` : note,
    expectedRpe: w.expectedRpe
      ? Math.max(2, Math.round(w.expectedRpe * Math.max(0.55, factor)))
      : w.expectedRpe,
    plannedDistanceM: w.plannedDistanceM
      ? Math.max(400, Math.round(w.plannedDistanceM * factor))
      : undefined,
    plannedDurationSec: w.plannedDurationSec
      ? Math.max(600, Math.round(w.plannedDurationSec * factor))
      : undefined,
    steps: w.steps.map((s) => softenStartupStep(s, factor, paceMul)),
  };
}

function softenStartupStep(
  step: WorkoutStep,
  factor: number,
  paceMul: number,
): WorkoutStep {
  const next: WorkoutStep = { ...step };
  if (next.distanceMeters) {
    next.distanceMeters = Math.max(50, Math.round(next.distanceMeters * factor));
  }
  if (next.durationSec) {
    next.durationSec = Math.max(30, Math.round(next.durationSec * factor));
  }
  const target = next.target;
  if (target?.type === 'pace' && target.minSecPerKm != null && target.maxSecPerKm != null) {
    next.target = {
      ...target,
      minSecPerKm: Math.round(target.minSecPerKm * paceMul),
      maxSecPerKm: Math.round(target.maxSecPerKm * paceMul),
    };
  }
  if (target?.type === 'power' && target.minWatts != null && target.maxWatts != null) {
    next.target = {
      ...target,
      minWatts: Math.round(target.minWatts * factor),
      maxWatts: Math.round(target.maxWatts * factor),
    };
  }
  if (target?.type === 'hr' && target.minBpm != null && target.maxBpm != null) {
    next.target = {
      ...target,
      minBpm: Math.max(90, Math.round(target.minBpm * Math.max(0.9, factor))),
      maxBpm: Math.max(95, Math.round(target.maxBpm * Math.max(0.9, factor))),
    };
  }
  return next;
}
