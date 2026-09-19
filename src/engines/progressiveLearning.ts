import type { PlannedWorkout, StravaActivity, SportDiscipline } from '../types/domain';

/**
 * Apprentissage progressif (audit §6.2) — compare réalisé vs planifié
 * et détecte les séances régulièrement sautées pour proposer une baisse de volume.
 */

export type PaceRecalibration = {
  /** Ratio allure réalisée / planifiée (1 = pile, >1 = plus lent) */
  paceRatio: number;
  /** Suggestion de recalibrage zones (−5 % à +5 %) */
  zoneShiftPct: number;
  note: string;
};

export type SkipPatternHint = {
  skippedLast14d: number;
  plannedLast14d: number;
  suggestVolumeCutPct: number;
  note: string;
};

function sportToDiscipline(sport?: StravaActivity['sport']): SportDiscipline | null {
  if (sport === 'run') return 'run';
  if (sport === 'bike') return 'bike';
  if (sport === 'swim') return 'swim';
  if (sport === 'strength') return 'strength';
  return null;
}

function plannedPaceSecPerKm(w: PlannedWorkout): number | null {
  const distM = w.plannedDistanceM ?? 0;
  const dur = w.plannedDurationSec ?? 0;
  if (distM < 400 || dur < 60) return null;
  return dur / (distM / 1000);
}

function activityPaceSecPerKm(a: StravaActivity): number | null {
  if (a.avgPaceSecPerKm != null && a.avgPaceSecPerKm > 0) return a.avgPaceSecPerKm;
  const distM = a.distanceM ?? 0;
  const dur = a.movingSec || a.elapsedSec || 0;
  if (distM < 400 || dur < 60) return null;
  return dur / (distM / 1000);
}

/** Compare une activité à sa séance planifiée (même jour / discipline). */
export function compareSessionVsPlan(
  activity: StravaActivity,
  plan: PlannedWorkout[],
): PaceRecalibration | null {
  const day = (activity.startDate ?? '').slice(0, 10);
  const disc = sportToDiscipline(activity.sport) ?? 'run';
  const match = plan.find(
    (w) => w.date === day && w.discipline === disc && w.discipline !== 'rest',
  );

  if (!match) return null;
  const planned = plannedPaceSecPerKm(match);
  const actual = activityPaceSecPerKm(activity);
  if (planned == null || actual == null) return null;

  const paceRatio = actual / planned;
  let zoneShiftPct = 0;
  if (paceRatio > 1.08) zoneShiftPct = 4;
  else if (paceRatio > 1.04) zoneShiftPct = 2;
  else if (paceRatio < 0.94) zoneShiftPct = -3;
  else if (paceRatio < 0.97) zoneShiftPct = -1;

  if (zoneShiftPct === 0) {
    return {
      paceRatio,
      zoneShiftPct: 0,
      note: 'Allure proche du plan — zones stables.',
    };
  }

  return {
    paceRatio,
    zoneShiftPct,
    note:
      zoneShiftPct > 0
        ? `Réalisé plus lent que prévu (+${Math.round((paceRatio - 1) * 100)} %) — zones un peu assouplies.`
        : `Réalisé plus rapide que prévu — zones légèrement resserrées (${zoneShiftPct} %).`,
  };
}

/** Détecte un pattern de séances sautées sur 14 jours. */
export function detectSkipPattern(opts: {
  plan: PlannedWorkout[];
  activities: StravaActivity[];
  todayIso: string;
}): SkipPatternHint | null {
  const end = new Date(opts.todayIso + 'T12:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  const startIso = start.toISOString().slice(0, 10);

  const planned = opts.plan.filter(
    (w) =>
      w.discipline !== 'rest' &&
      w.date >= startIso &&
      w.date <= opts.todayIso,
  );
  if (planned.length < 4) return null;

  const doneDates = new Set(
    opts.activities
      .map((a) => (a.startDate ?? '').slice(0, 10))
      .filter(Boolean),
  );
  const skipped = planned.filter((w) => !doneDates.has(w.date) && w.date < opts.todayIso);
  const skippedLast14d = skipped.length;
  const plannedLast14d = planned.length;
  const skipRate = skippedLast14d / Math.max(1, plannedLast14d - 1);

  if (skipRate < 0.35) return null;

  const suggestVolumeCutPct = skipRate >= 0.55 ? 25 : 15;
  return {
    skippedLast14d,
    plannedLast14d,
    suggestVolumeCutPct,
    note: `Tu as sauté ${skippedLast14d} séance${skippedLast14d > 1 ? 's' : ''} sur 14 j — on peut baisser le volume d’environ ${suggestVolumeCutPct} % pour coller à ton rythme.`,
  };
}
