import type { ActiveProgram, StravaActivity } from '../types/domain';
import { formatRaceTime } from './athleteProfile';

/**
 * Suivi d’évolution avant / pendant / après un programme
 * (ex. 5 km : 25:00 → 22:00 = −3:00 gagnées).
 */

export function distanceLabel(km?: number): string {
  if (km == null || !(km > 0)) return 'référence';
  if (Math.abs(km - 5) < 0.3) return '5 km';
  if (Math.abs(km - 10) < 0.3) return '10 km';
  if (Math.abs(km - 21.1) < 0.4) return 'semi';
  if (Math.abs(km - 42.195) < 0.5) return 'marathon';
  const rounded = Math.round(km * 10) / 10;
  return `${String(rounded).replace('.', ',')} km`;
}

/** Activité assez proche de la distance cible (±12 %, min ±0,4 km) */
export function activityMatchesTarget(
  activity: StravaActivity,
  targetKm?: number,
): boolean {
  if (!targetKm || targetKm <= 0) return false;
  const km = activity.distanceM / 1000;
  const tol = Math.max(0.4, targetKm * 0.12);
  return Math.abs(km - targetKm) <= tol;
}

export function equivalentTimeOnTargetKm(
  activity: StravaActivity,
  targetKm: number,
): number | null {
  const km = activity.distanceM / 1000;
  if (km < 0.5 || activity.movingSec < 60) return null;
  // Projection simple à allure constante (suffisant pour un suivi de tendance)
  return Math.round((activity.movingSec / km) * targetKm);
}

export type ProgramEvolution = {
  label: string;
  baselineSec?: number;
  currentSec?: number;
  /** Négatif = amélioration (temps plus bas) */
  deltaSec?: number;
  gainLabel?: string;
  baselineLabel: string;
  currentLabel: string;
  hasBaseline: boolean;
  hasCurrent: boolean;
  improved: boolean;
};

export function computeProgramEvolution(prog: ActiveProgram): ProgramEvolution {
  const label = distanceLabel(prog.baselineDistanceKm ?? prog.targetDistanceKm);
  const baselineSec = prog.baselineTimeSec;
  const currentSec = prog.currentBestTimeSec;
  const hasBaseline = baselineSec != null && baselineSec > 0;
  const hasCurrent = currentSec != null && currentSec > 0;

  let deltaSec: number | undefined;
  let gainLabel: string | undefined;
  let improved = false;

  if (hasBaseline && hasCurrent) {
    deltaSec = currentSec! - baselineSec!;
    improved = deltaSec < 0;
    const abs = Math.abs(deltaSec);
    const sign = deltaSec <= 0 ? '−' : '+';
    gainLabel = `${sign}${formatRaceTime(abs)}`;
  }

  return {
    label,
    baselineSec,
    currentSec,
    deltaSec,
    gainLabel,
    baselineLabel: hasBaseline ? formatRaceTime(baselineSec!) : '—',
    currentLabel: hasCurrent ? formatRaceTime(currentSec!) : '—',
    hasBaseline,
    hasCurrent,
    improved,
  };
}

/** Met à jour le meilleur chrono si l’activité colle à la distance de suivi */
export function applyActivityToProgramProgress(
  prog: ActiveProgram,
  activity: StravaActivity,
): ActiveProgram {
  // Suivi = distance de la référence (ex. chrono 5 km saisi) — pas forcément la course cible
  const trackKm = prog.baselineDistanceKm ?? prog.targetDistanceKm;
  if (!trackKm || !activityMatchesTarget(activity, trackKm)) return prog;

  const eq = equivalentTimeOnTargetKm(activity, trackKm);
  if (eq == null || eq < 60) return prog;

  const prev = prog.currentBestTimeSec;
  if (prev != null && eq >= prev) return prog;

  return {
    ...prog,
    currentBestTimeSec: eq,
    currentBestAt: activity.startDate,
  };
}
