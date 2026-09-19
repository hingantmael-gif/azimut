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

/** Aplatit les répétitions pour le guidage live (effort ↔ récup entrelacés). */
export function flattenWorkoutSteps(steps: WorkoutStep[]): FlatLiveStep[] {
  const out: FlatLiveStep[] = [];

  const pushFlat = (step: WorkoutStep, repIndex: number, times: number) => {
    const suffix = times > 1 ? ` (${repIndex + 1}/${times})` : '';
    const base =
      step.label?.trim() ||
      (step.type === 'warmup'
        ? 'Échauffement'
        : step.type === 'cooldown'
          ? 'Retour au calme'
          : step.type === 'rest'
            ? 'Récupération'
            : 'Effort');
    // Label court pour les reps : phase + compteur, pas tout le libellé catalogue
    const short =
      times > 1
        ? `${
            step.type === 'rest'
              ? 'Récupération'
              : step.type === 'active'
                ? 'Effort'
                : base.split('·')[0]?.trim() || base
          }${suffix}`
        : base;
    out.push({
      ...step,
      id: `${step.id}__${repIndex}`,
      repeat: undefined,
      flatIndex: out.length,
      displayLabel: short,
    });
  };

  let i = 0;
  while (i < steps.length) {
    const step = steps[i]!;
    const next = steps[i + 1];
    const times = Math.max(1, Math.min(40, step.repeat ?? 1));
    const nextTimes = next ? Math.max(1, Math.min(40, next.repeat ?? 1)) : 0;

    if (
      next &&
      step.type === 'active' &&
      next.type === 'rest' &&
      times > 1 &&
      times === nextTimes
    ) {
      for (let r = 0; r < times; r++) {
        pushFlat(step, r, times);
        pushFlat(next, r, times);
      }
      i += 2;
      continue;
    }

    for (let r = 0; r < times; r++) {
      pushFlat(step, r, times);
    }
    i += 1;
  }
  return out;
}

/** Phase lisible façon Garmin : échauffement / effort / récup / retour. */
export function stepPhaseTitle(step: WorkoutStep): string {
  switch (step.type) {
    case 'warmup':
      return 'Échauffement';
    case 'rest':
      return 'Récupération';
    case 'cooldown':
      return 'Retour au calme';
    default:
      return 'Effort';
  }
}

/**
 * Position 0–1 de l’aiguille sur la jauge d’allure.
 * 0 = trop rapide (gauche), 1 = trop lent (droite).
 * La zone cible occupe le centre élargi.
 */
export function paceGaugeLayout(
  currentSecPerKm: number | null,
  minSecPerKm: number,
  maxSecPerKm: number,
): { needle: number; zoneStart: number; zoneEnd: number } {
  const lo = Math.min(minSecPerKm, maxSecPerKm);
  const hi = Math.max(minSecPerKm, maxSecPerKm);
  const pad = Math.max(35, (hi - lo) * 0.9);
  const rangeLo = lo - pad;
  const rangeHi = hi + pad;
  const span = Math.max(1, rangeHi - rangeLo);
  const zoneStart = (lo - rangeLo) / span;
  const zoneEnd = (hi - rangeLo) / span;
  const cur =
    currentSecPerKm != null && Number.isFinite(currentSecPerKm)
      ? currentSecPerKm
      : (lo + hi) / 2;
  const needle = Math.min(1, Math.max(0, (cur - rangeLo) / span));
  return { needle, zoneStart, zoneEnd };
}

export function formatStepRemaining(progress: LiveStepProgress): string {
  if (progress.remainingM != null) {
    if (progress.remainingM >= 1000) {
      return `${(progress.remainingM / 1000).toFixed(2).replace('.', ',')} km restants`;
    }
    return `${Math.round(progress.remainingM)} m restants`;
  }
  if (progress.remainingSec != null) {
    return `${formatLiveClock(progress.remainingSec)} restants`;
  }
  return 'En cours';
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
  // Affichage « entre X et Y » : plus lent → plus rapide (ex. 6'00" – 5'00"/km)
  return `${formatPace(step.target.maxSecPerKm)} – ${formatPace(step.target.minSecPerKm)}/km`;
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

/** Chrono tracker plein écran — toujours HH:MM:SS. */
export function formatLiveClockLong(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Valeur km pour héros distance (ex. « 0,00 »). */
export function formatLiveDistanceKmValue(meters: number): string {
  return (Math.max(0, meters) / 1000).toFixed(2).replace('.', ',');
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

/** Splits km en temps réel (style Record Strava). */
export function computeLiveKmSplits(
  points: Array<{ lat: number; lng: number; timestamp: number }>,
): Array<{ km: number; paceLabel: string }> {
  if (points.length < 2) return [];
  const out: Array<{ km: number; paceLabel: string }> = [];
  let dist = 0;
  let nextKm = 1;
  let markTs = points[0]!.timestamp;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    dist += haversineM(
      { lat: a.lat, lng: a.lng },
      { lat: b.lat, lng: b.lng },
    );
    while (dist >= nextKm * 1000) {
      const dt = Math.max(1, (b.timestamp - markTs) / 1000);
      out.push({
        km: nextKm,
        paceLabel: formatLivePace(dt),
      });
      markTs = b.timestamp;
      nextKm += 1;
      if (out.length >= 8) return out;
    }
  }
  return out;
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
      opts.latlng.length >= 1
        ? {
            time: opts.timeStream.length
              ? opts.timeStream
              : opts.latlng.map((_, i) => i),
            latlng: opts.latlng,
            velocitySmooth:
              opts.velocitySmooth.length === opts.latlng.length
                ? opts.velocitySmooth
                : opts.latlng.map(() => 0),
          }
        : undefined,
  };
}

export function freeLiveShell(opts: {
  sport: 'run' | 'bike' | 'swim';
  dateIso?: string;
}): PlannedWorkout {
  const date = opts.dateIso ?? new Date().toISOString().slice(0, 10);
  const title =
    opts.sport === 'bike'
      ? 'Sortie vélo libre'
      : opts.sport === 'swim'
        ? 'Natation libre'
        : 'Course libre';
  return {
    id: `free-${opts.sport}-${Date.now()}`,
    date,
    title,
    discipline: opts.sport,
    steps: [
      {
        id: 'free-1',
        type: 'active',
        label: 'Libre',
        endCondition: 'lap_button',
      },
    ],
  };
}

export function canStartLiveWorkout(discipline: SportDiscipline): boolean {
  return (
    discipline === 'run' ||
    discipline === 'bike' ||
    discipline === 'swim' ||
    discipline === 'brick'
  );
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

export type PaceAnomalyKind = 'sudden_slowdown' | 'fatigue_drift' | 'zone_collapse';

export type PaceAnomaly = {
  kind: PaceAnomalyKind;
  severity: 'mild' | 'strong';
  label: string;
};

/**
 * Détecte un moment de faiblesse : ralentissement anormal vs allure récente / moyenne / cible.
 * `recentPaces` = échantillons d’allure fenêtre (sec/km), du plus ancien au plus récent.
 */
export function detectPaceAnomaly(opts: {
  currentPaceSecPerKm: number | null;
  avgPaceSecPerKm: number | null;
  recentPaces: number[];
  step: WorkoutStep | null;
  movingSec: number;
}): PaceAnomaly | null {
  const { currentPaceSecPerKm: cur, avgPaceSecPerKm: avg, recentPaces, step, movingSec } =
    opts;
  if (cur == null || !Number.isFinite(cur) || movingSec < 75) return null;
  if (cur < 120 || cur > 900) return null;

  const history = recentPaces.filter((p) => p >= 120 && p <= 900);
  const prior = history.slice(0, Math.max(0, history.length - 1));
  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)]!;
  };
  const med = median(prior.length >= 3 ? prior : history);

  // Effondrement soudain vs médiane récente
  if (med != null && prior.length >= 3) {
    const jump = cur - med;
    const pct = jump / med;
    if (jump >= 45 || pct >= 0.18) {
      return {
        kind: 'sudden_slowdown',
        severity: jump >= 70 || pct >= 0.28 ? 'strong' : 'mild',
        label:
          jump >= 70 || pct >= 0.28
            ? 'Ralentissement brutal — moment de faiblesse détecté'
            : 'Tu ralentis nettement — écoute ton corps',
      };
    }
  }

  // Dérive de fatigue vs moyenne séance
  if (avg != null && avg > 0 && movingSec >= 180) {
    const drift = cur - avg;
    if (drift >= 35 || drift / avg >= 0.12) {
      return {
        kind: 'fatigue_drift',
        severity: drift >= 55 ? 'strong' : 'mild',
        label:
          drift >= 55
            ? 'Fatigue marquée — allure bien en dessous de ta moyenne'
            : 'Allure qui s’effrite — signe de fatigue',
      };
    }
  }

  // Hors zone cible (étape active) de façon nette
  if (
    step &&
    (step.type === 'active' || step.type === 'warmup') &&
    step.target?.type === 'pace'
  ) {
    const max = step.target.maxSecPerKm;
    if (cur > max + 25) {
      return {
        kind: 'zone_collapse',
        severity: cur > max + 45 ? 'strong' : 'mild',
        label:
          cur > max + 45
            ? 'Bien trop lent vs la cible — baisse d’énergie probable'
            : 'Sous la zone cible — ralentissement anormal',
      };
    }
  }

  return null;
}

export function liveCueLabel(
  status: LivePaceStatus,
  anomaly: PaceAnomaly | null,
): string {
  if (anomaly) return anomaly.label;
  return paceStatusLabel(status);
}
