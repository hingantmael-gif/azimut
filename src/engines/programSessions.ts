import type { ActiveProgram, PlannedWorkout, StravaActivity } from '../types/domain';

/** Séances rattachées à un programme (ids + repli sur dates) */
export function activitiesForProgram(
  program: ActiveProgram,
  activities: StravaActivity[],
): StravaActivity[] {
  const ids = new Set(program.activityIds ?? []);
  const start = program.startedAt;
  const end = (program.completedAt ?? new Date().toISOString()).slice(0, 10);

  return activities
    .filter((a) => {
      if (ids.has(a.id)) return true;
      if (ids.size > 0) return false;
      const day = a.startDate.slice(0, 10);
      return day >= start && day <= end;
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function plannedSessionsForProgram(
  plan: PlannedWorkout[],
  program: ActiveProgram | undefined,
  isActive: boolean,
): PlannedWorkout[] {
  if (!isActive || !program) return [];
  return plan
    .filter((w) => {
      const inProgram = w.programId ? w.programId === program.id : true;
      if (!inProgram) return false;
      // Repos sommeil crédité = compte comme séance (pas un oubli)
      if (w.discipline === 'rest' && w.sleepAdaptation?.creditedComplete) return true;
      if (w.discipline === 'rest') return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
