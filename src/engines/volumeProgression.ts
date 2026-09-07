/**
 * Progression volume — inspirée Runna :
 * - Build / build / deload (3:1)
 * - Plafond +10 % volume / semaine
 * - Sortie longue gérée indépendamment du volume hebdo
 * - Décharge : qualités réduites plus que les footings
 */

import type { AthleticLevel, GoalType, PeriodizationBlock } from '../types/domain';
import { volumeProfileFor } from './sessionVolumePolicy';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export type WeekLoadProfile = {
  volumeFactor: number;
  qualityFactor: number;
  isDeload: boolean;
  isTaper: boolean;
};

/** Semaine de décharge planifiée (hors affûtage). Pattern 3 build + 1 deload. */
export function isDeloadWeek(
  weekIndex: number,
  totalWeeks: number,
  block: PeriodizationBlock,
): boolean {
  if (block === 'affutage' || block === 'recuperation_post_course') return false;
  // Pas de décharge sur les 2 dernières semaines (affûtage / course)
  if (weekIndex >= totalWeeks - 2) return false;
  return (weekIndex + 1) % 4 === 0;
}

export function isTaperWeek(
  weekIndex: number,
  totalWeeks: number,
  block: PeriodizationBlock,
): boolean {
  if (block === 'affutage') return true;
  const taperWeeks = totalWeeks >= 10 ? 3 : totalWeeks >= 6 ? 2 : totalWeeks >= 4 ? 1 : 0;
  const buildEnd = Math.max(0, totalWeeks - 1 - taperWeeks);
  return weekIndex > buildEnd && taperWeeks > 0;
}

/** Facteurs de charge séparés volume / qualité (Runna : deload réduit plus les dures séances). */
export function resolveWeekLoadProfile(
  weekIndex: number,
  totalWeeks: number,
  block: PeriodizationBlock,
): WeekLoadProfile {
  const progress = totalWeeks <= 1 ? 1 : weekIndex / Math.max(1, totalWeeks - 1);
  const deload = isDeloadWeek(weekIndex, totalWeeks, block);
  const taper = isTaperWeek(weekIndex, totalWeeks, block);

  let volumeFactor = 1;
  let qualityFactor = 1;

  if (block === 'affutage') {
    volumeFactor = 0.6;
    qualityFactor = 0.45;
  } else if (block === 'recuperation_post_course') {
    volumeFactor = 0.5;
    qualityFactor = 0.35;
  } else if (block === 'travail_specifique') {
    volumeFactor = 0.92 + progress * 0.12;
    qualityFactor = 0.95 + progress * 0.1;
  } else {
    volumeFactor = 0.78 + progress * 0.28;
    qualityFactor = 0.85 + progress * 0.15;
  }

  if (deload) {
    volumeFactor *= 0.78;
    qualityFactor *= 0.55;
  }

  if (taper && block !== 'affutage') {
    const taperWeeks = totalWeeks >= 10 ? 3 : totalWeeks >= 6 ? 2 : 1;
    const taperIdx = weekIndex - (totalWeeks - taperWeeks);
    const taperCut = clamp(1 - taperIdx * 0.12, 0.55, 0.9);
    volumeFactor *= taperCut;
    qualityFactor *= clamp(taperCut + 0.15, 0.5, 0.85);
  }

  return {
    volumeFactor: clamp(volumeFactor, 0.45, 1.15),
    qualityFactor: clamp(qualityFactor, 0.3, 1.15),
    isDeload: deload,
    isTaper: taper,
  };
}

/** Courbe de volume hebdo avec plafond +10 % / semaine (depuis volume déclaré ou cible). */
export function buildWeeklyVolumeCurve(opts: {
  totalWeeks: number;
  goal: GoalType;
  level: AthleticLevel;
  targetDistanceKm?: number;
  weeklyKmAvg?: number;
  vmaKmh?: number;
  blocks: PeriodizationBlock[];
}): number[] {
  const profile = volumeProfileFor(opts.goal, opts.targetDistanceKm);
  const [tDeb, tInt, tConf] = profile.targetWeeklyKm;
  const target =
    opts.level === 'debutant' ? tDeb : opts.level === 'intermediaire' ? tInt : tConf;

  let base = target;
  if (opts.vmaKmh != null && opts.vmaKmh > 0) {
    const bias = clamp(0.88 + (opts.vmaKmh - 12) * 0.035, 0.85, 1.12);
    base = target * bias;
  }
  if (opts.weeklyKmAvg != null && opts.weeklyKmAvg > 0) {
    const declared = clamp(opts.weeklyKmAvg, profile.minWeeklyKm, profile.maxWeeklyKm);
    // Coureur déjà à gros volume → le plan démarre plus haut dans la fourchette
    base = base * 0.5 + declared * 0.5;
  }
  base = clamp(base, profile.minWeeklyKm, profile.maxWeeklyKm);

  const declaredHigh =
    opts.weeklyKmAvg != null && opts.weeklyKmAvg >= base * 0.95;
  const startKm = declaredHigh
    ? clamp(base * 0.9, profile.minWeeklyKm, base)
    : clamp(base * 0.82, profile.minWeeklyKm, base * 0.92);
  const peakKm = clamp(base * 1.02, startKm, profile.maxWeeklyKm);

  const curve: number[] = [];
  let prev = startKm;

  for (let w = 0; w < opts.totalWeeks; w++) {
    const block = opts.blocks[w] ?? 'developpement_general';
    const load = resolveWeekLoadProfile(w, opts.totalWeeks, block);
    const buildEnd = opts.totalWeeks - (opts.totalWeeks >= 10 ? 3 : opts.totalWeeks >= 6 ? 2 : opts.totalWeeks >= 4 ? 1 : 0) - 1;
    const t = clamp(w / Math.max(1, buildEnd), 0, 1);
    const eased = t * t * (3 - 2 * t);
    let targetW = startKm + (peakKm - startKm) * eased;
    targetW *= load.volumeFactor;

    // Règle Runna : max +10 % / semaine (plus conservateur si faible volume)
    const maxIncrease = prev < 20 ? 1.08 : 1.1;
    targetW = Math.min(targetW, prev * maxIncrease);
    targetW = clamp(targetW, profile.minWeeklyKm, profile.maxWeeklyKm);
    targetW = Math.round(targetW * 10) / 10;

    curve.push(targetW);
    prev = targetW;
  }

  return curve;
}

/** Courbe sortie longue — progression indépendante, max +10 % ou +2 km / semaine. */
export function buildLongRunCurve(opts: {
  totalWeeks: number;
  goal: GoalType;
  targetDistanceKm?: number;
  weeklyVolumes: number[];
  blocks: PeriodizationBlock[];
}): number[] {
  const profile = volumeProfileFor(opts.goal, opts.targetDistanceKm);
  const peak = profile.peakLongKm;
  const start = profile.startLongKm;
  const taperWeeks = opts.totalWeeks >= 10 ? 3 : opts.totalWeeks >= 6 ? 2 : opts.totalWeeks >= 4 ? 1 : 0;
  const buildEnd = Math.max(0, opts.totalWeeks - 1 - taperWeeks);

  const curve: number[] = [];
  let prevLong = start;

  for (let w = 0; w < opts.totalWeeks; w++) {
    const block = opts.blocks[w] ?? 'developpement_general';
    const load = resolveWeekLoadProfile(w, opts.totalWeeks, block);
    const weeklyKm = opts.weeklyVolumes[w] ?? profile.targetWeeklyKm[1];

    let weekTarget: number;
    if (w > buildEnd && taperWeeks > 0) {
      const taperIdx = w - buildEnd;
      weekTarget = peak * clamp(1 - taperIdx * (0.14 / Math.max(1, taperWeeks)), 0.65, 0.92);
    } else if (opts.totalWeeks <= 1) {
      weekTarget = (start + peak) / 2;
    } else {
      const t = clamp(w / Math.max(1, buildEnd), 0, 1);
      const eased = t * t * (3 - 2 * t);
      weekTarget = start + (peak - start) * eased;
    }

    if (load.isDeload) weekTarget *= 0.72;

    const fromVolume = weeklyKm * profile.longShareMax;
    let longKm = Math.min(weekTarget, fromVolume, peak);

    // Plafond indépendant Runna : max +10 % ou +2 km vs semaine précédente
    const maxFromPrev = prevLong * 1.1;
    const maxAbs = prevLong + 2;
    longKm = Math.min(longKm, maxFromPrev, maxAbs);

    longKm = clamp(longKm, Math.min(start, peak * 0.45), peak);

    const race = opts.targetDistanceKm;
    if (race != null && race > 0 && race <= 12) {
      longKm = Math.min(longKm, Math.max(race * 2.0, start));
    } else if (race != null && race > 12 && race <= 25) {
      longKm = Math.min(longKm, Math.max(race * 1.05, start));
    } else if (race != null && race > 25 && race <= 45) {
      longKm = Math.min(longKm, race * 0.78);
    }

    longKm = Math.round(longKm * 10) / 10;
    curve.push(longKm);
    prevLong = longKm;
  }

  return curve;
}
