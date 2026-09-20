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

/** Un programme de cette catégorie compte-t-il une sortie de ce sport ? (triathlon/ironman = 3 sports) */
export function programAcceptsSport(
  category: string | undefined,
  sport: StravaActivity['sport'] | undefined,
): boolean {
  const c = (category ?? '').toLowerCase();
  const s = sport ?? 'run';
  if (c === 'triathlon' || c === 'ironman') return s === 'run' || s === 'bike' || s === 'swim';
  if (c === 'strength' || c === 'calisthenics') return s === 'strength' || s === 'other';
  if (c === 'other' || c === '') return true;
  return c === s;
}

/**
 * Programme auquel rattacher une nouvelle activité :
 * 1. celui de la séance planifiée liée, 2. sinon un programme du même sport, 3. sinon le principal.
 */
export function pickProgramForActivity(
  programs: ActiveProgram[],
  primary: ActiveProgram | undefined,
  planned: Pick<PlannedWorkout, 'programId'> | undefined,
  activity: Pick<StravaActivity, 'sport'>,
): ActiveProgram | undefined {
  if (planned?.programId) {
    const byPlan = programs.find((p) => p.id === planned.programId);
    if (byPlan) return byPlan;
  }
  if (primary && programAcceptsSport(primary.sportCategory, activity.sport)) return primary;
  return programs.find((p) => programAcceptsSport(p.sportCategory, activity.sport)) ?? primary;
}

/**
 * Sortie « libre » : si une séance du plan du même jour et du même sport n'est pas encore
 * réalisée, elle compte pour cette séance (et donc pour le programme).
 */
export function findPlannedForFreeActivity(
  plan: PlannedWorkout[],
  linkedPlannedIds: ReadonlySet<string>,
  activity: Pick<StravaActivity, 'sport' | 'startDate'>,
): PlannedWorkout | undefined {
  const day = activity.startDate.slice(0, 10);
  const sport = activity.sport ?? 'run';
  return plan.find((w) => {
    if (w.date !== day || w.discipline === 'rest' || linkedPlannedIds.has(w.id)) return false;
    if (w.discipline === 'bike') return sport === 'bike';
    if (w.discipline === 'swim') return sport === 'swim';
    if (w.discipline === 'run' || w.discipline === 'brick') return sport === 'run';
    if (w.discipline === 'strength' || w.discipline === 'ppg') return sport === 'strength' || sport === 'other';
    return false;
  });
}
