import type { OnboardingAnswers, PlannedWorkout, StravaActivity, WorkoutStep } from '../types/domain';
import { formatDuration, formatPace } from './core';
import { computeSessionDurationSec } from './coachingEngine';
import { describePaceZoneSource, resolvePaceZones } from './paceZones';
import { pickBestRaceReference } from './athleteProfile';

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
  const title = step.label?.trim() || STEP_TYPE_LABELS[step.type];
  const measure = formatStepMeasure(step);
  const withRepeat =
    step.repeat && step.repeat > 1 && !title.includes(`${step.repeat} ×`)
      ? `${step.repeat} × ${measure}`
      : measure;
  const target = formatStepTarget(step);
  const detail = target ? `${withRepeat} · ${target}` : withRepeat;
  return { title, detail };
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
  stepLines: Array<{ title: string; detail: string }>;
} {
  const durationSec =
    workout.plannedDurationSec && workout.plannedDurationSec > 0
      ? workout.plannedDurationSec
      : computeSessionDurationSec(workout.steps);

  return {
    durationLabel: formatDuration(durationSec),
    distanceLabel: formatWorkoutDistance(workout.plannedDistanceM),
    stepLines: workout.steps.map(describeWorkoutStep),
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