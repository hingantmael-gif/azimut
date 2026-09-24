import type { PlannedWorkout, SportDiscipline } from '../types/domain';

export type OverloadLevel = 'ok' | 'caution' | 'strong';

export type OverloadAssessment = {
  level: OverloadLevel;
  reasons: string[];
  message: string;
  sportCount: number;
  maxSessionsPerDay: number;
};

function sportBucket(discipline: SportDiscipline): string {
  if (discipline === 'strength' || discipline === 'ppg') return 'musculation';
  if (discipline === 'brick') return 'triathlon';
  if (discipline === 'mobility' || discipline === 'rest') return 'recuperation';
  return discipline;
}

function weekStartIso(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

/**
 * Analyse la charge du planning combiné (programmes existants + nouveau).
 * Alerte « fortement déconseillé » si trop de sports / séances empilées.
 */
export function analyzeCombinedPlanOverload(
  existing: PlannedWorkout[],
  incoming: PlannedWorkout[],
  newSportCategory?: string,
): OverloadAssessment {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = [...existing, ...incoming].filter(
    (w) => w.discipline !== 'rest' && w.date >= today,
  );

  const sports = new Set<string>();
  for (const w of sessions) {
    sports.add(sportBucket(w.discipline));
  }
  if (newSportCategory) {
    sports.add(
      newSportCategory === 'strength'
        ? 'musculation'
        : newSportCategory === 'triathlon' || newSportCategory === 'ironman'
          ? 'triathlon'
          : newSportCategory,
    );
  }
  sports.delete('recuperation');

  const reasons: string[] = [];
  const existingProgramIds = new Set(
    existing.map((w) => w.programId).filter(Boolean) as string[],
  );

  const activeProgramCount = existingProgramIds.size;
  if (activeProgramCount >= 1 && incoming.length > 0) {
    reasons.push(
      activeProgramCount >= 2
        ? `${activeProgramCount} programmes déjà actifs + un nouveau`
        : 'plusieurs programmes actifs en parallèle',
    );
  }

  const byDate = new Map<string, number>();
  for (const w of sessions) {
    byDate.set(w.date, (byDate.get(w.date) ?? 0) + 1);
  }
  let maxSessionsPerDay = 0;
  let doubleDays = 0;
  for (const [, count] of byDate) {
    maxSessionsPerDay = Math.max(maxSessionsPerDay, count);
    if (count >= 2) doubleDays += 1;
  }
  // Une seule ligne, jamais une liste de dates (des dizaines de lignes identiques étaient illisibles).
  if (doubleDays > 0) reasons.push('des séances sont déjà prévues aux mêmes dates');

  const byWeek = new Map<string, number>();
  for (const w of sessions) {
    const wk = weekStartIso(w.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }
  let maxSessionsPerWeek = 0;
  for (const [, count] of byWeek) {
    maxSessionsPerWeek = Math.max(maxSessionsPerWeek, count);
    if (count >= 7) {
      reasons.push(`${count} séances sur une semaine`);
      break;
    }
  }

  const sportCount = sports.size;
  if (sportCount >= 4) {
    reasons.push(`${sportCount} disciplines différentes (course, vélo, natation, muscu…)`);
  } else if (sportCount >= 3) {
    reasons.push(`${sportCount} disciplines simultanées dans le planning`);
  }

  let level: OverloadLevel = 'ok';
  if (
    sportCount >= 3 ||
    maxSessionsPerDay >= 3 ||
    activeProgramCount >= 3 ||
    maxSessionsPerWeek >= 8 ||
    (sportCount >= 2 && maxSessionsPerDay >= 2 && activeProgramCount >= 1)
  ) {
    level = 'strong';
  } else if (
    (sportCount >= 2 && activeProgramCount >= 1) ||
    activeProgramCount >= 2 ||
    maxSessionsPerDay >= 2 ||
    maxSessionsPerWeek >= 6
  ) {
    level = 'caution';
  }

  const uniqueReasons = [...new Set(reasons)];
  const message =
    level === 'strong'
      ? 'Attention : des séances sont déjà prévues aux mêmes dates. Risque de surcharge et de blessure.'
      : level === 'caution'
        ? 'Attention : ton planning est déjà chargé. Prévois de la récupération.'
        : '';

  return {
    level,
    reasons: uniqueReasons,
    message,
    sportCount,
    maxSessionsPerDay,
  };
}

