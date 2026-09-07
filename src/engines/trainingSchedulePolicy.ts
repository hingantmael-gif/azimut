import type { AthleticLevel, GoalType } from '../types/domain';

export type ScheduleSportFamily =
  | 'run'
  | 'bike'
  | 'swim'
  | 'triathlon'
  | 'strength'
  | 'other';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Cap séances / semaine selon niveau (récupération incluse). */
const LEVEL_SESSION_CAP: Record<AthleticLevel, number> = {
  debutant: 4,
  intermediaire: 5,
  confirme: 6,
};

/**
 * Nombre de séances réelles à planifier — indépendamment des jours « disponibles ».
 * Ex. 7 jours cochés → 4–5 séances max + repos.
 */
export function resolveWeeklySessionCount(opts: {
  level: AthleticLevel;
  goal: GoalType;
  family: ScheduleSportFamily;
  availableDaysCount: number;
  weeklyKm?: number;
}): number {
  const avail = Math.max(1, opts.availableDaysCount);
  if (avail <= 2) return avail;

  const restBuffer = avail >= 6 ? 2 : avail >= 5 ? 1 : 0;
  const fromAvailability = Math.max(2, avail - restBuffer);

  let target = LEVEL_SESSION_CAP[opts.level];
  if (opts.family === 'triathlon') target = Math.min(6, target + 1);
  if (opts.family === 'strength') {
    target = clamp(avail - 1, 3, 5);
  }

  if (opts.weeklyKm != null && opts.weeklyKm > 0 && opts.weeklyKm < 15) {
    target = Math.min(target, 3);
  }

  return clamp(target, 2, Math.min(fromAvailability, avail));
}

function dayGap(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 7 - diff);
}

/** Choisit les jours de séance en les espaçant (sortie longue prioritaire). */
export function selectSessionDays(
  availableDays: number[],
  longRunDay: number,
  sessionCount: number,
): number[] {
  const sorted = [...availableDays].sort((a, b) => a - b);
  if (sessionCount >= sorted.length) return sorted;
  if (sessionCount <= 0) return [];

  const picked = new Set<number>();
  if (sorted.includes(longRunDay)) {
    picked.add(longRunDay);
  }

  const pool = sorted.filter((d) => !picked.has(d));
  while (picked.size < sessionCount && pool.length > 0) {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < pool.length; i++) {
      const d = pool[i];
      const pickedArr = [...picked];
      const minGap =
        pickedArr.length === 0
          ? 7
          : Math.min(...pickedArr.map((p) => dayGap(d, p)));
      const score = minGap * 10 + (pickedArr.length === 0 ? d : 0);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    picked.add(pool[bestIdx]);
    pool.splice(bestIdx, 1);
  }

  return [...picked].sort((a, b) => a - b);
}
