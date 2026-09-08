import type { PlannedWorkout, WorkoutStep } from '../types/domain';

/** Allège volume / intensité d’une séance (démarrage progressif). */
export function softenWorkoutForStartup(
  w: PlannedWorkout,
  factor: number,
  note: string,
): PlannedWorkout {
  const pct = Math.round((1 - factor) * 100);
  if (pct <= 0) return w;
  const paceMul = 1 + (1 - factor) * 0.35;

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

export function applyStartupFactorsToPlan(
  plan: PlannedWorkout[],
  softenIds: Map<string, number>,
  noteForFactor: (factor: number) => string,
): PlannedWorkout[] {
  if (softenIds.size === 0) return plan;
  return plan.map((w) => {
    const factor = softenIds.get(w.id);
    if (factor == null || factor >= 0.99) return w;
    return softenWorkoutForStartup(w, factor, noteForFactor(factor));
  });
}

/** Premières séances d’entraînement (hors repos), chronologiques. */
export function firstTrainingSessions(
  plan: PlannedWorkout[],
  opts: { programId?: string; count: number },
): PlannedWorkout[] {
  const scoped = opts.programId
    ? plan.filter((w) => w.programId === opts.programId)
    : plan;
  return [...scoped]
    .filter((w) => w.discipline !== 'rest' && !w.lockedRest)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, opts.count));
}
