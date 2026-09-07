/**
 * Adaptation dynamique du plan — inspirée Runna / NRC / TrainingPeaks.
 *
 * 3 scénarios :
 * 1. Séance imprévue (hors plan) → adapter la séance suivante (volume / intensité)
 * 2. Changement de jours dispo → décaler les séances futures (sans regénérer le contenu)
 * 3. Trou ≥ N jours → insérer un footing récupération
 */

import type {
  OnboardingAnswers,
  PlannedWorkout,
  StravaActivity,
} from '../types/domain';
import { resolvePaceZones } from './paceZones';
import { pickBestRaceReference } from './athleteProfile';
import { selectSessionDays } from './trainingSchedulePolicy';
import { addDaysIso } from './planGenerator';

export type ActivityIntensity = 'easy' | 'moderate' | 'hard';

export type PlanAdaptationResult = {
  plan: PlannedWorkout[];
  /** Message coach affiché à l'utilisateur */
  message?: string;
  /** Id de la séance modifiée */
  adaptedWorkoutId?: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function paceFromActivity(activity: StravaActivity): number | null {
  if (activity.avgPaceSecPerKm && activity.avgPaceSecPerKm > 0) {
    return activity.avgPaceSecPerKm;
  }
  if (activity.distanceM > 0 && activity.movingSec > 0) {
    return activity.movingSec / (activity.distanceM / 1000);
  }
  return null;
}

/** Estime l'intensité d'une séance importée (planifiée ou non). */
export function estimateActivityIntensity(
  activity: StravaActivity,
  onboarding?: OnboardingAnswers,
  activities?: StravaActivity[],
): { intensity: ActivityIntensity; estimatedRpe: number } {
  const km = activity.distanceM / 1000;
  const min = activity.movingSec / 60;

  if (km < 0.3 && min < 15) {
    return { intensity: 'easy', estimatedRpe: 2 };
  }

  let estimatedRpe = 4;

  if (onboarding) {
    const raceRef = pickBestRaceReference(onboarding);
    const zones = resolvePaceZones({
      level: onboarding.level,
      weeklyKmAvg: onboarding.weeklyKmAvg,
      recentDistanceKm: raceRef?.km ?? onboarding.recentDistanceKm,
      recentTimeSec: raceRef?.timeSec ?? onboarding.recentTimeSec,
      vmaKmh: onboarding.vmaKmh,
      activities,
    });
    const pace = paceFromActivity(activity);
    if (pace != null) {
      const easyMid = (zones.easy.minSecPerKm + zones.easy.maxSecPerKm) / 2;
      const thresholdMid = (zones.threshold.minSecPerKm + zones.threshold.maxSecPerKm) / 2;
      const intervalMid = (zones.interval.minSecPerKm + zones.interval.maxSecPerKm) / 2;

      if (pace <= intervalMid * 1.03) estimatedRpe = 8;
      else if (pace <= thresholdMid * 1.05) estimatedRpe = 7;
      else if (pace <= easyMid * 1.08) estimatedRpe = 5;
      else estimatedRpe = 3;
    }
  } else {
    if (min > 0 && km / (min / 60) > 14) estimatedRpe = 7;
    else if (min > 0 && km / (min / 60) > 11) estimatedRpe = 5;
    else estimatedRpe = 3;
  }

  if (km >= 18 && estimatedRpe >= 5) estimatedRpe = Math.min(9, estimatedRpe + 1);
  if (min >= 90 && estimatedRpe >= 4) estimatedRpe = Math.min(8, estimatedRpe + 1);

  const intensity: ActivityIntensity =
    estimatedRpe >= 7 ? 'hard' : estimatedRpe >= 5 ? 'moderate' : 'easy';

  return { intensity, estimatedRpe };
}

function isHardPlannedWorkout(w: PlannedWorkout): boolean {
  return (w.expectedRpe ?? 0) >= 7 || /vma|seuil|fraction|tempo|fartlek|allure|vo2|css/i.test(w.title);
}

function isLongPlannedWorkout(w: PlannedWorkout): boolean {
  return /longue|progressive|brick/i.test(w.title) || (w.plannedDistanceM ?? 0) >= 14000;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T12:00:00').getTime();
  const b = new Date(bIso + 'T12:00:00').getTime();
  return Math.round(Math.abs(b - a) / (24 * 3600 * 1000));
}

function reduceWorkoutVolume(w: PlannedWorkout, pct: number, note: string): PlannedWorkout {
  const factor = 1 - pct / 100;
  return {
    ...w,
    title: w.title.includes('(adapté)') ? w.title : `${w.title} (adapté)`,
    coachNote: note,
    expectedRpe: w.expectedRpe ? Math.max(2, w.expectedRpe - 1) : w.expectedRpe,
    plannedDistanceM: w.plannedDistanceM
      ? Math.round(w.plannedDistanceM * factor)
      : undefined,
    plannedDurationSec: w.plannedDurationSec
      ? Math.round(w.plannedDurationSec * factor)
      : undefined,
    steps: w.steps.map((s) => {
      if (s.endCondition === 'distance' && s.distanceMeters) {
        return { ...s, distanceMeters: Math.round(s.distanceMeters * factor) };
      }
      if (s.durationSec) {
        return { ...s, durationSec: Math.round(s.durationSec * factor) };
      }
      return s;
    }),
  };
}

function replaceWithRecovery(w: PlannedWorkout, note: string): PlannedWorkout {
  return {
    ...w,
    title: 'Footing récupération (adapté)',
    coachNote: note,
    expectedRpe: 2,
    plannedDistanceM: Math.round(Math.min(8000, (w.plannedDistanceM ?? 8000) * 0.55)),
    plannedDurationSec: 40 * 60,
    steps: [
      {
        id: 'easy',
        type: 'active',
        label: 'Footing très facile — récupération active',
        endCondition: 'duration',
        durationSec: 40 * 60,
      },
    ],
  };
}

/**
 * Séance imprévue détectée → adapte la prochaine séance planifiée (≤ 2 jours).
 * Logique coach : une dure séance non prévue avant une qualité = alléger drastiquement.
 */
export function adaptPlanAfterUnplannedActivity(opts: {
  plan: PlannedWorkout[];
  activity: StravaActivity;
  onboarding?: OnboardingAnswers;
  activities?: StravaActivity[];
  completedWorkoutIds?: Set<string>;
}): PlanAdaptationResult {
  const activityDay = opts.activity.startDate.slice(0, 10);
  const { intensity, estimatedRpe } = estimateActivityIntensity(
    opts.activity,
    opts.onboarding,
    opts.activities,
  );

  const future = opts.plan
    .filter(
      (w) =>
        w.date > activityDay &&
        w.discipline !== 'rest' &&
        !opts.completedWorkoutIds?.has(w.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const next = future[0];
  if (!next) {
    return { plan: opts.plan };
  }

  const gap = daysBetween(activityDay, next.date);
  if (gap > 2) {
    return {
      plan: opts.plan,
      message: `Séance extra enregistrée (${estimatedRpe}/10). Prochaine séance dans ${gap} jours — pas d'ajustement immédiat.`,
    };
  }

  let adapted = next;
  let message: string;

  const nextHard = isHardPlannedWorkout(next);
  const nextLong = isLongPlannedWorkout(next);
  const km = (opts.activity.distanceM / 1000).toFixed(1).replace('.', ',');

  if (intensity === 'hard' && nextHard) {
    adapted = replaceWithRecovery(
      next,
      `Séance intense non prévue (${km} km, ~${estimatedRpe}/10) hier/avant-hier → qualité remplacée par récup.`,
    );
    message = `Séance non prévue intense détectée. « ${next.title} » devient un footing récupération.`;
  } else if (intensity === 'hard' && nextLong) {
    adapted = reduceWorkoutVolume(
      next,
      35,
      `Charge élevée non planifiée → sortie longue réduite de 35 %.`,
    );
    message = `Séance extra intense : sortie longue allégée demain (−35 %).`;
  } else if (intensity === 'hard' && !nextHard) {
    adapted = reduceWorkoutVolume(
      next,
      25,
      `Séance dure non prévue → volume réduit de 25 %.`,
    );
    message = `Séance extra intense : prochaine séance allégée (−25 %).`;
  } else if (intensity === 'moderate' && nextHard) {
    adapted = reduceWorkoutVolume(
      next,
      20,
      `Séance modérée non prévue → qualité allégée (−20 %, moins de reps).`,
    );
    message = `Séance extra modérée : qualité du lendemain légèrement réduite.`;
  } else if (intensity === 'moderate' && gap === 1) {
    adapted = reduceWorkoutVolume(next, 10, `Séance modérée la veille → −10 % volume.`);
    message = `Séance extra enregistrée : légère réduction sur la séance de demain.`;
  } else if (intensity === 'easy' && nextHard && gap === 1) {
    adapted = reduceWorkoutVolume(
      next,
      10,
      `Footing extra la veille d'une qualité → légère réduction.`,
    );
    message = `Footing extra détecté : qualité de demain légèrement allégée.`;
  } else {
    return {
      plan: opts.plan,
      message: `Séance extra enregistrée (${km} km). Votre plan reste inchangé — bon travail !`,
    };
  }

  const plan = opts.plan.map((w) => (w.id === next.id ? adapted : w));
  return { plan, message, adaptedWorkoutId: next.id };
}

function weekStartSunday(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function dowFromIso(iso: string): number {
  return new Date(iso + 'T12:00:00').getDay();
}

/**
 * Décale les séances futures sur les nouveaux jours dispo (contenu inchangé).
 * Les séances passées / déjà réalisées ne bougent pas.
 */
export function reschedulePlanToNewDays(opts: {
  plan: PlannedWorkout[];
  fromDateIso: string;
  trainingDays: number[];
  longRunDay: number;
  completedWorkoutIds?: Set<string>;
}): PlannedWorkout[] {
  const sortedDays = [...opts.trainingDays].sort((a, b) => a - b);
  if (sortedDays.length === 0) return opts.plan;

  const past = opts.plan.filter(
    (w) =>
      w.date < opts.fromDateIso ||
      opts.completedWorkoutIds?.has(w.id),
  );
  const future = opts.plan
    .filter(
      (w) =>
        w.date >= opts.fromDateIso &&
        !opts.completedWorkoutIds?.has(w.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (future.length === 0) return opts.plan;

  const byWeek = new Map<string, PlannedWorkout[]>();
  for (const w of future) {
    const ws = weekStartSunday(w.date);
    if (!byWeek.has(ws)) byWeek.set(ws, []);
    byWeek.get(ws)!.push(w);
  }

  const rescheduled: PlannedWorkout[] = [];

  for (const [ws, workouts] of [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const count = Math.min(workouts.length, sortedDays.length);
    const sessionDows = selectSessionDays(sortedDays, opts.longRunDay, count);

    workouts.forEach((w, i) => {
      const targetDow = sessionDows[i] ?? sessionDows[sessionDows.length - 1];
      const weekStart = new Date(ws + 'T12:00:00');
      const newDate = addDaysIso(weekStart.toISOString().slice(0, 10), targetDow);
      rescheduled.push({
        ...w,
        date: newDate,
        coachNote:
          w.date !== newDate
            ? `Décalée du ${formatShortFr(w.date)} → ${formatShortFr(newDate)} (nouveaux jours dispo).`
            : w.coachNote,
      });
    });
  }

  return [...past, ...rescheduled].sort((a, b) => a.date.localeCompare(b.date));
}

function formatShortFr(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
  });
}

/** Insère des footings récup si trou ≥ maxGapDays entre deux séances futures. */
export function fillPlanGaps(opts: {
  plan: PlannedWorkout[];
  fromDateIso: string;
  onboarding?: OnboardingAnswers;
  maxGapDays?: number;
  completedWorkoutIds?: Set<string>;
}): PlanAdaptationResult {
  const maxGap = opts.maxGapDays ?? 4;
  const future = opts.plan
    .filter(
      (w) =>
        w.date >= opts.fromDateIso &&
        w.discipline !== 'rest' &&
        !opts.completedWorkoutIds?.has(w.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (future.length < 2) return { plan: opts.plan };

  const toInsert: PlannedWorkout[] = [];
  const messages: string[] = [];

  for (let i = 0; i < future.length - 1; i++) {
    const cur = future[i];
    const nxt = future[i + 1];
    const gap = daysBetween(cur.date, nxt.date);

    if (gap >= maxGap) {
      const midDay = addDaysIso(cur.date, Math.floor(gap / 2));
      const easyKm = clamp((opts.onboarding?.weeklyKmAvg ?? 25) * 0.12, 4, 8);
      toInsert.push({
        id: `gap-fill-${midDay}-${Date.now()}`,
        title: 'Footing récupération (comblement)',
        date: midDay,
        discipline: 'run',
        expectedRpe: 3,
        plannedDistanceM: Math.round(easyKm * 1000),
        plannedDurationSec: Math.round(easyKm * 360),
        coachNote: `${gap} jours sans séance → footing facile inséré pour maintenir la routine.`,
        steps: [
          {
            id: 'fill',
            type: 'active',
            label: `Footing facile · ${easyKm.toFixed(1).replace('.', ',')} km`,
            endCondition: 'distance',
            distanceMeters: Math.round(easyKm * 1000),
          },
        ],
      });
      messages.push(`Trou de ${gap} jours comblé par un footing le ${formatShortFr(midDay)}.`);
    }
  }

  if (toInsert.length === 0) return { plan: opts.plan };

  const plan = [...opts.plan, ...toInsert].sort((a, b) => a.date.localeCompare(b.date));
  return { plan, message: messages.join(' ') };
}

/** Séance planifiée faite un autre jour → marquer + décaler optionnellement. */
export function matchPlannedToActivityDay(
  plan: PlannedWorkout[],
  activity: StravaActivity,
  plannedId?: string,
): PlannedWorkout | undefined {
  const activityDay = activity.startDate.slice(0, 10);
  if (plannedId) {
    return plan.find((p) => p.id === plannedId);
  }
  return (
    plan.find((p) => p.date === activityDay && p.discipline !== 'rest') ??
    plan.find((p) => {
      if (p.discipline === 'rest') return false;
      const gap = daysBetween(p.date, activityDay);
      return gap <= 1;
    })
  );
}

export function completedWorkoutIdsFromAnalyses(
  analyses: { plannedWorkoutId: string }[],
): Set<string> {
  return new Set(analyses.map((a) => a.plannedWorkoutId));
}
