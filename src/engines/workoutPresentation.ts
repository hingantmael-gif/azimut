import type { OnboardingAnswers, PlannedWorkout, StravaActivity, WorkoutStep } from '../types/domain';
import { formatDuration, formatPace } from './core';
import { computeSessionDurationSec } from './coachingEngine';
import { describePaceZoneSource, resolvePaceZones } from './paceZones';
import { pickBestRaceReference } from './athleteProfile';
import { dropOrdinal, findRepeatCycle } from './stepGrouping';

export function resolveAthletePaceZones(
  onboarding?: OnboardingAnswers,
  activities?: StravaActivity[],
) {
  if (!onboarding) return null;
  const race = pickBestRaceReference(onboarding);
  return resolvePaceZones({
    level: onboarding.level,
    weeklyKmAvg: onboarding.weeklyKmAvg,
    recentDistanceKm: race?.km ?? onboarding.recentDistanceKm,
    recentTimeSec: race?.timeSec ?? onboarding.recentTimeSec,
    vmaKmh: onboarding.vmaKmh,
    activities,
  });
}

const STEP_TYPE_LABELS: Record<WorkoutStep['type'], string> = {
  warmup: 'Échauffement',
  active: 'Corps de séance',
  rest: 'Récupération',
  cooldown: 'Retour au calme',
};

/** Durée ou distance d'une étape — toujours en min / km / m (jamais secondes brutes) */
export function formatStepMeasure(step: WorkoutStep): string {
  if (step.endCondition === 'distance' && step.distanceMeters) {
    const m = step.distanceMeters;
    if (m >= 1000) {
      const km = m / 1000;
      return `${km % 1 === 0 ? km : km.toFixed(1).replace('.', ',')} km`;
    }
    return `${m} m`;
  }
  if (step.durationSec && step.durationSec > 0) {
    return formatDuration(step.durationSec);
  }
  return '—';
}

export function formatStepTarget(step: WorkoutStep): string | null {
  if (!step.target) return null;
  if (step.target.type === 'pace') {
    const slow = step.target.maxSecPerKm;
    const fast = step.target.minSecPerKm;
    return `Allure ${formatPace(slow)} – ${formatPace(fast)}/km`;
  }
  if (step.target.type === 'hr') {
    return `FC ${step.target.minBpm}–${step.target.maxBpm} bpm`;
  }
  if (step.target.type === 'power') {
    return `${step.target.minWatts}–${step.target.maxWatts} W`;
  }
  return null;
}

export function describeWorkoutStep(step: WorkoutStep): { title: string; detail: string } {
  const raw = step.label?.trim() || STEP_TYPE_LABELS[step.type];
  const title = raw.replace(/^\[calis:[a-z_]+(?:\|[^\]]+)*\]\s*/i, '');
  const measure = formatStepMeasure(step);
  const withRepeat =
    step.repeat && step.repeat > 1 && !title.includes(`${step.repeat} ×`)
      ? `${step.repeat} × ${measure}`
      : measure;
  const target = formatStepTarget(step);
  const detail = target ? `${withRepeat} · ${target}` : withRepeat;
  return { title, detail };
}

export type StepLine = {
  title: string;
  detail: string;
  /** Bloc répété (ex. « 8 × ») : les lignes qu'il contient, pour un affichage détaillé à la demande. */
  group?: { count: number; parts: Array<{ title: string; detail: string }> };
};

/**
 * Séance lisible en un coup d'œil : une série d'étapes qui se répète (fartlek, côtes, surges…) devient UNE ligne
 * « Répéter N × … », et « N × effort » suivi de sa récupération devient une seule ligne.
 * Le détail complet reste disponible via describeWorkoutStep sur chaque étape.
 */
export function compactStepLines(steps: WorkoutStep[]): StepLine[] {
  const lines: StepLine[] = [];
  let i = 0;
  while (i < steps.length) {
    const cycle = findRepeatCycle(steps, i);
    if (cycle) {
      const parts = steps.slice(i, i + cycle.len).map((st) => {
        const d = describeWorkoutStep(st);
        return { title: dropOrdinal(d.title), detail: d.detail };
      });
      lines.push({
        title: `Répéter ${cycle.count} ×`,
        detail: parts.map((pt) => (pt.detail && pt.detail !== '—' ? `${pt.title} (${pt.detail})` : pt.title)).join('  →  '),
        group: { count: cycle.count, parts },
      });
      i += cycle.len * cycle.count;
      continue;
    }
    const cur = steps[i];
    const next = steps[i + 1];
    const d = describeWorkoutStep(cur);
    // « N × effort » + sa récupération répétée N fois → une seule ligne.
    if (cur.repeat && cur.repeat > 1 && next && next.type === 'rest' && next.repeat === cur.repeat) {
      lines.push({ title: d.title, detail: `${d.detail} · récup ${formatStepMeasure(next)}` });
      i += 2;
      continue;
    }
    lines.push(d);
    i += 1;
  }
  return lines;
}

export function formatWorkoutDistance(meters?: number): string | null {
  if (!meters || meters <= 0) return null;
  const km = meters / 1000;
  if (km >= 1) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${meters} m`;
}

export function formatPeriodization(block?: string): string {
  const map: Record<string, string> = {
    developpement_general: 'Fond',
    travail_specifique: 'Spécifique',
    affutage: 'Affûtage',
    recuperation_post_course: 'Récupération',
  };
  return block ? (map[block] ?? block) : '—';
}

export function summarizeWorkout(workout: PlannedWorkout): {
  durationLabel: string;
  distanceLabel: string | null;
  /** Lignes compactes (répétitions regroupées). */
  stepLines: StepLine[];
  /** Une ligne par étape, sans regroupement. */
  fullStepLines: Array<{ title: string; detail: string }>;
} {
  const durationSec =
    workout.plannedDurationSec && workout.plannedDurationSec > 0
      ? workout.plannedDurationSec
      : computeSessionDurationSec(workout.steps);

  return {
    durationLabel: formatDuration(durationSec),
    distanceLabel: formatWorkoutDistance(workout.plannedDistanceM),
    stepLines: compactStepLines(workout.steps),
    fullStepLines: workout.steps.map(describeWorkoutStep),
  };
}

export function formatVmaHint(
  onboarding?: OnboardingAnswers,
  activities?: StravaActivity[],
): string | null {
  const zones = resolveAthletePaceZones(onboarding, activities);
  if (!zones) return null;
  const easyMid = Math.round((zones.easy.minSecPerKm + zones.easy.maxSecPerKm) / 2);
  const source = describePaceZoneSource(zones.source);
  return `Allure facile ~${formatPace(easyMid)}/km · VMA ${zones.vmaKmh.toFixed(1)} km/h (${source})`;
}