import type { ActiveProgram, AthleteProfile, PlannedWorkout } from '../types/domain';

/** Programmes actuellement actifs (multi-sports simultanés). */
export function resolveActivePrograms(profile: AthleteProfile): ActiveProgram[] {
  if (profile.activePrograms?.length) return profile.activePrograms;
  if (profile.activeProgram) return [profile.activeProgram];
  return [];
}

export function tagPlanForProgram(plan: PlannedWorkout[], programId: string): PlannedWorkout[] {
  return plan.map((w) => ({
    ...w,
    programId,
    id: w.id.includes(programId) ? w.id : `${programId}__${w.id}`,
  }));
}

/** Conserve le planning existant et ajoute les séances du nouveau programme. */
export function mergeProgramPlans(
  existing: PlannedWorkout[],
  incoming: PlannedWorkout[],
): PlannedWorkout[] {
  const ids = new Set(existing.map((w) => w.id));
  const added = incoming.filter((w) => !ids.has(w.id));
  return [...existing, ...added].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

/** Retire les séances futures d'un programme (passé conservé dans le calendrier). */
export function removeFutureProgramSessions(
  plan: PlannedWorkout[],
  programId: string,
  todayIso: string,
): PlannedWorkout[] {
  return plan.filter((w) => w.programId !== programId || w.date < todayIso);
}

export function createProgramInstanceId(catalogId: string): string {
  return `${catalogId}-${Date.now()}`;
}

/** Garde activeProgram et activePrograms alignés après une mutation du programme courant. */
export function syncActiveProgramInProfile(
  profile: AthleteProfile,
  updatedProgram: ActiveProgram,
): AthleteProfile {
  const activePrograms = resolveActivePrograms(profile).map((p) =>
    p.id === updatedProgram.id ? updatedProgram : p,
  );
  const activeProgram =
    profile.activeProgram?.id === updatedProgram.id ? updatedProgram : profile.activeProgram;
  return { ...profile, activeProgram, activePrograms };
}
