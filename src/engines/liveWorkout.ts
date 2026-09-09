import type {
  PlannedWorkout,
  SportDiscipline,
  StravaActivity,
  WorkoutStep,
} from '../types/domain';
import { formatPace } from './core';

export type LivePaceStatus = 'too_fast' | 'in_zone' | 'too_slow' | 'none';

export type FlatLiveStep = WorkoutStep & {
  /** Index dans la liste aplatie */
  flatIndex: number;
  /** Libellé enrichi (ex. Intervalles 2/5) */
  displayLabel: string;
};

export type LiveStepProgress = {
  step: FlatLiveStep;
  stepIndex: number;
  totalSteps: number;
  /** 0–1 dans l’étape courante */
  ratio: number;
  remainingSec?: number;
  remainingM?: number;
  done: boolean;
};

const EARTH_R = 6371000;

/** Distance haversine en mètres. */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Aplatit les répétitions pour le guidage live. */
export function flattenWorkoutSteps(steps: WorkoutStep[]): FlatLiveStep[] {
  const out: FlatLiveStep[] = [];
  for (const step of steps) {
    const times = Math.max(1, Math.min(40, step.repeat ?? 1));
    for (let i = 0; i < times; i++) {
      const suffix = times > 1 ? ` (${i + 1}/${times})` : '';
      const base =
        step.label?.trim() ||
        (step.type === 'warmup'
          ? 'Échauffement'
          : step.type === 'cooldown'
            ? 'Retour au calme'
            : step.type === 'rest'
              ? 'Récupération'
              : 'Effort');
      out.push({
        ...step,
        id: `${step.id}__${i}`,
        repeat: undefined,
        flatIndex: out.length,
        displayLabel: `${base}${suffix}`,
      });
    }
  }
  return out;
}

export function stepGoalMeters(step: WorkoutStep): number | null {
  if (step.endCondition === 'distance' && step.distanceMeters && step.distanceMeters > 0) {
    return step.distanceMeters;
  }
  return null;
}

export function stepGoalSec(step: WorkoutStep): number | null {
  if (step.endCondition === 'duration' && step.durationSec && step.durationSec > 0) {
    return step.durationSec;
  }
  // Fallback : si durée renseignée sans distance
  if (step.durationSec && step.durationSec > 0 && !step.distanceMeters) {
    return step.durationSec;
  }
  return null;
}

export function paceStatus(
  currentSecPerKm: number | null,
  step: WorkoutStep | null,
): LivePaceStatus {
  if (!step?.target || step.target.type !== 'pace' || currentSecPerKm == null) {
    return 'none';
  }
  const { minSecPerKm, maxSecPerKm } = step.target;
  // Allure : plus petit = plus rapide
  if (currentSecPerKm < minSecPerKm - 3) return 'too_fast';
  if (currentSecPerKm > maxSecPerKm + 3) return 'too_slow';
  return 'in_zone';
}

export function formatPaceBand(step: WorkoutStep | null): string | null {
  if (!step?.target || step.target.type !== 'pace') return null;
  return `${formatPace(step.target.minSecPerKm)} – ${formatPace(step.target.maxSecPerKm)}/km`;
}

export function formatLiveClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatLivePace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm < 90 || secPerKm > 1200) {
    return '—';
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60)
    .toString()
    .padStart(2, '0');
  return `${m}'${s}"`;
}

export function formatLiveDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
}

/**
 * Calcule la progression dans les étapes à partir du temps / distance
 * écoulés depuis le début (moving).
 */
export function computeLiveStepProgress(
  flat: FlatLiveStep[],
  movingSec: number,
  distanceM: number,
): LiveStepProgress {
  if (flat.length === 0) {
    return {
      step: {
        id: 'empty',
        type: 'active',
        endCondition: 'lap_button',
        flatIndex: 0,
        displayLabel: 'Séance libre',
      },
      stepIndex: 0,
      totalSteps: 1,
      ratio: 0,
      done: false,
    };
  }

  let elapsedSec = 0;
  let elapsedM = 0;

  for (let i = 0; i < flat.length; i++) {
    const step = flat[i]!;
    const goalSec = stepGoalSec(step);
    const goalM = stepGoalMeters(step);

    if (goalM != null) {
      const inStepM = Math.max(0, distanceM - elapsedM);
      if (inStepM < goalM || i === flat.length - 1) {
        return {
          step,
          stepIndex: i,
          totalSteps: flat.length,
          ratio: Math.min(1, inStepM / goalM),
          remainingM: Math.max(0, goalM - inStepM),
          done: false,
        };
      }
      elapsedM += goalM;
      // estime le temps consommé proportionnellement si besoin
      continue;
    }

    if (goalSec != null) {
      const inStepSec = Math.max(0, movingSec - elapsedSec);
      if (inStepSec < goalSec || i === flat.length - 1) {
        return {
          step,
          stepIndex: i,
          totalSteps: flat.length,
          ratio: Math.min(1, inStepSec / goalSec),
          remainingSec: Math.max(0, goalSec - inStepSec),
          done: false,
        };
      }
      elapsedSec += goalSec;
      continue;
    }

    // Étape ouverte : reste jusqu’à la fin manuelle si dernière, sinon 3 min par défaut
    const openSec = 180;
    const inStepSec = Math.max(0, movingSec - elapsedSec);
    if (inStepSec < openSec || i === flat.length - 1) {
      return {
        step,
        stepIndex: i,
        totalSteps: flat.length,
        ratio: Math.min(1, inStepSec / openSec),
        remainingSec: Math.max(0, openSec - inStepSec),
        done: false,
      };
    }
    elapsedSec += openSec;
  }

  const last = flat[flat.length - 1]!;
  return {
    step: last,
    stepIndex: flat.length - 1,
    totalSteps: flat.length,
    ratio: 1,
    done: true,
  };
}

export function disciplineToActivitySport(
  d: SportDiscipline,
): StravaActivity['sport'] {
  if (d === 'bike') return 'bike';
  if (d === 'swim') return 'swim';
  if (d === 'strength') return 'strength';
  if (d === 'run' || d === 'brick') return 'run';
  return 'other';
}

export function buildLiveActivity(opts: {
  workout: PlannedWorkout;
  distanceM: number;
  elapsedSec: number;
  movingSec: number;
  startIso: string;
  latlng: [number, number][];
  timeStream: number[];
  velocitySmooth: number[];
}): StravaActivity {
  const moving = Math.max(1, opts.movingSec);
  const dist = Math.max(0, opts.distanceM);
  const avgPace =
    dist > 20 ? Math.round((moving / (dist / 1000))) : undefined;
  return {
    id: `azimut-live-${Date.now()}`,
    name: opts.workout.title,
    distanceM: Math.round(dist),
    elapsedSec: Math.round(opts.elapsedSec),
    movingSec: Math.round(moving),
    startDate: opts.startIso,
    sport: disciplineToActivitySport(opts.workout.discipline),
    avgPaceSecPerKm: avgPace,
    streams:
      opts.latlng.length >= 2
        ? {
            time: opts.timeStream,
            latlng: opts.latlng,
            velocitySmooth: opts.velocitySmooth,
          }
        : undefined,
  };
}

export function canStartLiveWorkout(discipline: SportDiscipline): boolean {
  return discipline === 'run' || discipline === 'bike' || discipline === 'brick';
}

export function paceStatusLabel(status: LivePaceStatus): string {
  switch (status) {
    case 'too_fast':
      return 'Trop rapide — freine un peu';
    case 'too_slow':
      return 'Trop lent — accélère';
    case 'in_zone':
      return 'Dans la zone — nickel';
    default:
      return 'Allure libre';
  }
}
