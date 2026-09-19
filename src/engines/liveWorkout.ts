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
  // Arrondir d'abord le total : arrondir seulement les secondes donnait « 5'60" ».
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}'${s}"`;
}

export function formatLiveDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
}

/**
 * Splits km en temps réel (style Record Strava).
 * L'instant de passage de chaque km est interpolé entre les deux points GPS qui
 * l'encadrent (et non pris sur le point suivant). Tous les splits sont renvoyés :
 * l'UI n'affiche que les derniers (avant, plafonné à 8 ⇒ figé après le km 8).
 */
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
    const seg = haversineM({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    const before = dist;
    dist += seg;
    while (dist >= nextKm * 1000) {
      // Fraction du segment [a, b] parcourue quand on franchit le km.
      const frac = seg > 0 ? (nextKm * 1000 - before) / seg : 1;
      const crossTs = a.timestamp + frac * (b.timestamp - a.timestamp);
      const dt = Math.max(1, (crossTs - markTs) / 1000);
      out.push({
        km: nextKm,
        paceLabel: formatLivePace(dt),
      });
      markTs = crossTs;
      nextKm += 1;
    }
  }
  return out;
}

/** Durée par défaut d'une étape « ouverte » (bouton tour) qui n'est pas la dernière. */
const OPEN_STEP_SEC = 180;

/**
 * Position courante dans la séance : index de l'étape et, surtout, le temps ET la
 * distance au moment où elle a démarré. Sans ces deux repères, une étape à durée
 * (échauffement 10 min ≈ 2 km) fausse toutes les étapes à distance qui suivent
 * (le 400 m serait « déjà fini »), et inversement.
 */
export type LiveStepCursor = { index: number; startSec: number; startM: number };

export const INITIAL_LIVE_CURSOR: LiveStepCursor = { index: 0, startSec: 0, startM: 0 };

/**
 * Fait avancer le curseur tant que l'étape courante est terminée. Fonction pure et
 * idempotente : l'appeler à chaque tick avec le curseur précédent donne la position
 * exacte ; la dernière étape ne se termine jamais seule (fin manuelle).
 */
export function advanceLiveStepCursor(
  cursor: LiveStepCursor,
  flat: FlatLiveStep[],
  movingSec: number,
  distanceM: number,
): LiveStepCursor {
  if (flat.length === 0) return INITIAL_LIVE_CURSOR;
  let c = cursor;
  // Séance rechargée / compteurs remis à zéro : repartir du début.
  if (c.index < 0 || c.index >= flat.length || movingSec < c.startSec || distanceM < c.startM) {
    c = INITIAL_LIVE_CURSOR;
  }
  while (c.index < flat.length - 1) {
    const step = flat[c.index]!;
    const goalM = stepGoalMeters(step);
    const goalSec = stepGoalSec(step);
    let finished: boolean;
    let nextStartSec: number;
    let nextStartM: number;
    if (goalM != null) {
      finished = distanceM - c.startM >= goalM;
      nextStartM = c.startM + goalM;
      nextStartSec = movingSec;
    } else {
      const len = goalSec ?? OPEN_STEP_SEC;
      finished = movingSec - c.startSec >= len;
      nextStartSec = c.startSec + len;
      nextStartM = distanceM;
    }
    if (!finished) break;
    c = { index: c.index + 1, startSec: nextStartSec, startM: nextStartM };
  }
  return c;
}

/**
 * Calcule la progression dans les étapes à partir du temps / distance écoulés
 * (moving). Passer le curseur conservé entre deux appels (voir
 * {@link advanceLiveStepCursor}) pour un suivi exact des séances mixtes durée/distance.
 */
export function computeLiveStepProgress(
  flat: FlatLiveStep[],
  movingSec: number,
  distanceM: number,
  cursor: LiveStepCursor = INITIAL_LIVE_CURSOR,
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

  const c = advanceLiveStepCursor(cursor, flat, movingSec, distanceM);
  const step = flat[c.index]!;
  const goalM = stepGoalMeters(step);
  const goalSec = stepGoalSec(step);
  const base = { step, stepIndex: c.index, totalSteps: flat.length, done: false };

  if (goalM != null) {
    const inStepM = Math.max(0, distanceM - c.startM);
    return {
      ...base,
      ratio: Math.min(1, inStepM / goalM),
      remainingM: Math.max(0, goalM - inStepM),
    };
  }

  const len = goalSec ?? OPEN_STEP_SEC;
  const inStepSec = Math.max(0, movingSec - c.startSec);
  return {
    ...base,
    ratio: Math.min(1, inStepSec / len),
    remainingSec: Math.max(0, len - inStepSec),
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
