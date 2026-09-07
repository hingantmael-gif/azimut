import type { GoalType, AthleticLevel, PlannedWorkout } from '../types/domain';
import { getDurationGuide } from '../data/programDurationDb';

/**
 * Volume & longues multi-distances — logique coach :
 * 1) La DISTANCE OBJECTIF fixe la fourchette (min / cible / max) de km/semaine
 * 2) Le volume « déclaré » (ex. 100 km/sem) ne force PAS le plan : on reste dans la fourchette
 * 3) Le temps 5 km (VMA) personnalise allures + position dans la fourchette
 *
 * Réf. : 80/20 Seiler ; longue ≈ 25–30 % du volume ; pics course-spécifiques.
 */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export type VolumeProfile = {
  minWeeklyKm: number;
  /** Cible débutant / intermédiaire / confirmé */
  targetWeeklyKm: [number, number, number];
  maxWeeklyKm: number;
  peakLongKm: number;
  startLongKm: number;
  longShareMax: number;
  maxEasyKm: number;
};

function profile(
  minW: number,
  targets: [number, number, number],
  maxW: number,
  peak: number,
  start: number,
  easy: number,
  longShare = 0.3,
): VolumeProfile {
  return {
    minWeeklyKm: minW,
    targetWeeklyKm: targets,
    maxWeeklyKm: maxW,
    peakLongKm: peak,
    startLongKm: start,
    longShareMax: longShare,
    maxEasyKm: easy,
  };
}

/**
 * Profil selon distance de course (toute valeur libre) ou goal catalogue.
 * Ex. 3 km → type 5k ; 22 km → semi ; 90 km → ultra plafonné.
 */
export function volumeProfileFor(goal: GoalType, targetKm?: number): VolumeProfile {
  if (targetKm != null && targetKm > 0) {
    if (targetKm <= 3.5) {
      return profile(12, [14, 20, 28], 32, 10, 5, 7);
    }
    if (targetKm <= 5.5) {
      return profile(14, [18, 25, 35], 40, 12, 6, 8);
    }
    if (targetKm <= 8) {
      return profile(16, [20, 28, 38], 45, 14, 7, 9);
    }
    if (targetKm <= 12) {
      return profile(18, [22, 32, 45], 50, 16, 8, 10);
    }
    if (targetKm <= 18) {
      return profile(22, [28, 38, 50], 58, 18, 10, 11);
    }
    if (targetKm <= 25) {
      return profile(25, [32, 45, 58], 65, 22, 12, 12);
    }
    if (targetKm <= 35) {
      return profile(30, [38, 50, 65], 75, 26, 13, 13);
    }
    if (targetKm <= 45) {
      return profile(35, [42, 55, 72], 90, 32, 14, 14);
    }
    if (targetKm <= 70) {
      return profile(40, [48, 62, 80], 100, Math.min(40, Math.round(targetKm * 0.55)), 16, 14, 0.28);
    }
    if (targetKm <= 100) {
      return profile(45, [55, 70, 90], 110, Math.min(48, Math.round(targetKm * 0.48)), 18, 15, 0.28);
    }
    return profile(50, [60, 80, 100], 120, Math.min(55, Math.round(targetKm * 0.4)), 20, 16, 0.28);
  }

  const byGoal: Record<GoalType, VolumeProfile> = {
    '5k': profile(14, [18, 25, 35], 40, 12, 6, 8),
    '10k': profile(18, [22, 32, 45], 50, 16, 8, 10),
    vma: profile(14, [18, 26, 36], 42, 12, 6, 8, 0.28),
    forme: profile(14, [18, 25, 35], 42, 14, 7, 9),
    semi: profile(25, [32, 45, 58], 65, 22, 12, 12),
    marathon: profile(35, [42, 55, 72], 90, 32, 14, 14),
    trail: profile(35, [45, 58, 75], 100, 35, 14, 14, 0.28),
    triathlon_sprint: profile(16, [22, 32, 42], 48, 14, 7, 9, 0.28),
    triathlon_olympique: profile(22, [30, 42, 55], 65, 18, 9, 11, 0.28),
    ironman_70_3: profile(30, [40, 55, 70], 85, 22, 11, 12, 0.28),
    ironman: profile(40, [50, 70, 90], 110, 28, 12, 14, 0.28),
  };

  const guide = getDurationGuide({ goal, distanceKm: targetKm });
  const base = byGoal[goal] ?? byGoal.forme;
  if (guide.peakLongRunKm != null && guide.peakLongRunKm > 0) {
    return {
      ...base,
      peakLongKm: Math.min(base.peakLongKm, guide.peakLongRunKm),
      startLongKm: Math.min(base.startLongKm, guide.peakLongRunKm * 0.5),
    };
  }
  return base;
}

export function maxWeeklyKmForGoal(goal: GoalType, targetKm?: number): number {
  return volumeProfileFor(goal, targetKm).maxWeeklyKm;
}

export function peakLongRunKmForGoal(goal: GoalType, targetKm?: number): number {
  return volumeProfileFor(goal, targetKm).peakLongKm;
}

export function startLongRunKm(peakKm: number, goal: GoalType): number {
  const p = volumeProfileFor(goal);
  return clamp(peakKm * 0.5, Math.min(p.startLongKm, peakKm * 0.45), p.startLongKm);
}

/**
 * Volume hebdo d’entraînement = fourchette de l’OBJECTIF.
 * Un coureur à 100 km/sem sur un plan 5 km → reste dans [min, max] 5k (~14–40),
 * pas 100 km de séances imposées.
 */
export function resolveTrainingWeeklyKm(opts: {
  goal: GoalType;
  level: AthleticLevel;
  weeklyKmAvg?: number;
  targetDistanceKm?: number;
  phaseLoad: number;
  /** VMA (km/h) si chrono 5 km fourni — affine dans la fourchette */
  vmaKmh?: number;
}): number {
  const profile = volumeProfileFor(opts.goal, opts.targetDistanceKm);
  const [tDeb, tInt, tConf] = profile.targetWeeklyKm;
  const suggested =
    opts.level === 'debutant' ? tDeb : opts.level === 'intermediaire' ? tInt : tConf;

  // Base = cible objectif × niveau (pas le volume déclaré)
  let weekly = suggested;

  // Bias fitness VMA : athlète plus rapide → haut de fourchette ; plus lent → bas
  if (opts.vmaKmh != null && opts.vmaKmh > 0) {
    const bias = clamp(0.88 + (opts.vmaKmh - 12) * 0.035, 0.85, 1.12);
    weekly = suggested * bias;
  }

  // Volume déclaré : indication douce UNIQUEMENT dans [min, max] objectif
  if (opts.weeklyKmAvg != null && opts.weeklyKmAvg > 0) {
    const declaredInBand = clamp(opts.weeklyKmAvg, profile.minWeeklyKm, profile.maxWeeklyKm);
    // Si déclaré >> max (ex. 100 sur plan 5k), declaredInBand = max → on ne dépasse jamais
    // Mélange 70 % cible objectif / 30 % déclaré borné (personnalisation légère)
    weekly = weekly * 0.7 + declaredInBand * 0.3;
  }

  weekly = clamp(weekly, profile.minWeeklyKm, profile.maxWeeklyKm);
  return Math.round(Math.max(profile.minWeeklyKm, weekly * opts.phaseLoad) * 10) / 10;
}

export function resolveLongRunKm(opts: {
  weeklyKm: number;
  goal: GoalType;
  targetDistanceKm?: number;
  weekIndex: number;
  totalWeeks: number;
}): number {
  const profile = volumeProfileFor(opts.goal, opts.targetDistanceKm);
  const peak = profile.peakLongKm;
  const start = profile.startLongKm;
  const tw = Math.max(1, opts.totalWeeks);

  const taperWeeks = tw >= 10 ? 3 : tw >= 6 ? 2 : tw >= 4 ? 1 : 0;
  const buildEnd = Math.max(0, tw - 1 - taperWeeks);

  let weekTarget: number;
  if (opts.weekIndex > buildEnd && taperWeeks > 0) {
    const taperIdx = opts.weekIndex - buildEnd;
    const taperFactor = clamp(1 - taperIdx * (0.12 / Math.max(1, taperWeeks)), 0.7, 0.9);
    weekTarget = peak * taperFactor;
  } else if (tw <= 1) {
    weekTarget = clamp((start + peak) / 2, start, peak);
  } else {
    const t = clamp(opts.weekIndex / Math.max(1, buildEnd), 0, 1);
    const eased = t * t * (3 - 2 * t);
    weekTarget = start + (peak - start) * eased;
  }

  const fromVolume = opts.weeklyKm * profile.longShareMax;
  let longKm = Math.min(weekTarget, fromVolume, peak);
  longKm = clamp(longKm, Math.min(start, peak * 0.45), peak);

  const race = opts.targetDistanceKm;
  if (race != null && race > 0 && race <= 12) {
    longKm = Math.min(longKm, peak, Math.max(race * 2.0, start));
  }
  if (race != null && race > 12 && race <= 25) {
    longKm = Math.min(longKm, peak, Math.max(race * 1.05, start));
  }
  if (race != null && race > 25 && race <= 45) {
    longKm = Math.min(longKm, peak, race * 0.78);
  }

  return Math.round(longKm * 10) / 10;
}

export function resolveEasyRunKm(opts: {
  weeklyKm: number;
  longKm: number;
  easyDayCount: number;
  qualitySessionCount?: number;
  goal: GoalType;
  targetDistanceKm?: number;
}): number {
  const profile = volumeProfileFor(opts.goal, opts.targetDistanceKm);
  const qualityCount = opts.qualitySessionCount ?? 1;
  // Réserve ~10–12 % du volume par séance qualité (distance + échauffement)
  const qualityReserveKm = qualityCount * clamp(opts.weeklyKm * 0.11, 4, 11);
  const easyShare = opts.weeklyKm * 0.8;
  const remaining = Math.max(0, easyShare - opts.longKm - qualityReserveKm);
  const days = Math.max(1, opts.easyDayCount);
  return clamp(remaining / days, 3, profile.maxEasyKm);
}

function scaleWorkoutDistance(w: PlannedWorkout, newDistanceM: number): PlannedWorkout {
  const prev = w.plannedDistanceM && w.plannedDistanceM > 0 ? w.plannedDistanceM : newDistanceM;
  const factor = newDistanceM / prev;
  return {
    ...w,
    plannedDistanceM: newDistanceM,
    plannedDurationSec: w.plannedDurationSec
      ? Math.round(w.plannedDurationSec * factor)
      : undefined,
    steps: w.steps.map((s) => {
      if (s.endCondition !== 'distance' || !s.distanceMeters) return s;
      const d = Math.max(100, Math.round(s.distanceMeters * factor));
      const label = s.label?.replace(
        /\d+[.,]\d+\s*km/i,
        `${(d / 1000).toFixed(1).replace('.', ',')} km`,
      );
      return { ...s, distanceMeters: d, label: label ?? s.label };
    }),
  };
}

export function sanitizePlanDistances(
  plan: PlannedWorkout[],
  goal: GoalType,
  targetKm?: number,
): PlannedWorkout[] {
  const profile = volumeProfileFor(goal, targetKm);
  const peakM = Math.round(profile.peakLongKm * 1000);
  const easyCapM = Math.round(profile.maxEasyKm * 1000);

  return plan.map((w) => {
    if (!w.plannedDistanceM) return w;

    // Course à pied
    if (w.discipline === 'run') {
      const isLong = /longue/i.test(w.title);
      const isQuality = /vma|seuil|fraction|tempo|qualité/i.test(w.title);
      const cap = isLong ? peakM : isQuality ? Math.round(peakM * 0.55) : easyCapM;
      if (w.plannedDistanceM <= cap * 1.02) return w;
      return scaleWorkoutDistance(w, cap);
    }

    // Natation : rester proche de l’objectif (mètres)
    if (w.discipline === 'swim' && targetKm != null && targetKm > 0 && targetKm <= 5) {
      const targetM = Math.round(targetKm * 1000);
      const isLong = /longue/i.test(w.title);
      const cap = isLong
        ? Math.round(Math.min(targetM * 2.5, targetM + 2500))
        : Math.round(Math.min(targetM * 1.8, targetM + 1500));
      if (w.plannedDistanceM <= cap * 1.05) return w;
      return scaleWorkoutDistance(w, cap);
    }

    return w;
  });
}

/** Filet de sécurité : aucune séance hors famille (ex. brick dans un plan 5 km). */
export function enforceFamilyDisciplines(
  plan: PlannedWorkout[],
  family: string,
): PlannedWorkout[] {
  const allowed: Record<string, Set<string>> = {
    run: new Set(['run', 'ppg', 'mobility', 'strength']),
    bike: new Set(['bike', 'ppg', 'mobility', 'strength']),
    swim: new Set(['swim', 'ppg', 'mobility', 'strength']),
    triathlon: new Set(['run', 'bike', 'swim', 'brick', 'ppg', 'mobility', 'strength']),
    strength: new Set(['strength', 'ppg', 'mobility']),
    other: new Set(['run', 'bike', 'brick', 'ppg', 'mobility', 'strength']),
  };
  const ok = allowed[family] ?? allowed.run;
  return plan.filter((w) => ok.has(w.discipline));
}

/** Exposition pour UI / debug */
export function describeVolumeBand(goal: GoalType, targetKm?: number): string {
  const p = volumeProfileFor(goal, targetKm);
  return `${p.minWeeklyKm}–${p.maxWeeklyKm} km/sem (cible ~${p.targetWeeklyKm[1]}) · longue max ${p.peakLongKm} km`;
}
