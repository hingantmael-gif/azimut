import { dedupeCalisthenicsPerDay } from './calisthenicsProgramming';
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
  const added = dedupeCalisthenicsPerDay(
    incoming.filter((w) => !ids.has(w.id)),
    existing,
  );
  return [...existing, ...added].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

/** Retire les séances futures d'un programme (passé conservé dans le calendrier). */
export function removeFutureProgramSessions(
  plan: PlannedWorkout[],
  programId: string,
  todayIso: string,
  opts?: {
    /** Séances déjà réalisées : jamais retirées, même aujourd'hui. */
    doneIds?: ReadonlySet<string>;
    /** Séances sans programme (anciens plans) : les retirer aussi (dernier programme supprimé). */
    includeUnassigned?: boolean;
  },
): PlannedWorkout[] {
  return plan.filter((w) => {
    const belongs = w.programId === programId || (opts?.includeUnassigned === true && !w.programId);
    if (!belongs) return true;
    if (w.date < todayIso) return true;
    return opts?.doneIds?.has(w.id) === true;
  });
}

/** Séance non faite : disparaît du plan au bout d'une semaine. */
export const MISSED_SESSION_RETENTION_DAYS = 7;
/** Séance faite : quitte le plan au bout d'un mois (l'activité et l'historique du programme restent). */
export const DONE_SESSION_RETENTION_DAYS = 30;

function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Nettoie le plan : séances passées non réalisées après 7 jours, réalisées après 30 jours.
 * Renvoie le même tableau (même référence) s'il n'y a rien à retirer.
 */
export function prunePlanHistory(
  plan: PlannedWorkout[],
  doneIds: ReadonlySet<string>,
  todayIso: string,
): PlannedWorkout[] {
  const missedCutoff = shiftIsoDate(todayIso, -MISSED_SESSION_RETENTION_DAYS);
  const doneCutoff = shiftIsoDate(todayIso, -DONE_SESSION_RETENTION_DAYS);
  const kept = plan.filter((w) => {
    if (doneIds.has(w.id)) return w.date >= doneCutoff;
    return w.date >= missedCutoff;
  });
  return kept.length === plan.length ? plan : kept;
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
