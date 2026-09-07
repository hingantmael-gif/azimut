import type { StravaActivity } from '../types/domain';

export type ActivityFingerprintInput = {
  id?: string;
  startDate: string;
  distanceM: number;
  movingSec: number;
  elapsedSec: number;
  avgHr?: number;
  maxHr?: number;
};

/** Jour civil de la séance (AAAA-MM-JJ) */
export function activityDayKey(startDate: string): string {
  if (!startDate) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(startDate)) return startDate.slice(0, 10);
  const d = new Date(startDate);
  if (Number.isNaN(d.getTime())) return startDate.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nearlySameDistance(a: number, b: number): boolean {
  return Math.abs(Math.round(a) - Math.round(b)) <= 1;
}

function hrCompatible(
  incoming?: number,
  existing?: number,
): boolean {
  // Pas de FC des deux côtés → OK ; une seule → on n’exige pas l’égalité
  if (incoming == null || existing == null) return true;
  return Math.abs(Math.round(incoming) - Math.round(existing)) <= 1;
}

/**
 * Doublon = même jour + même durée + même distance (+ FC si dispo des deux côtés),
 * ou même id d’activité déjà importée.
 */
export function isSameActivitySession(
  a: ActivityFingerprintInput,
  b: ActivityFingerprintInput,
): boolean {
  if (a.id && b.id && a.id === b.id) return true;

  if (activityDayKey(a.startDate) !== activityDayKey(b.startDate)) return false;
  if (Math.round(a.movingSec) !== Math.round(b.movingSec)) return false;
  if (Math.round(a.elapsedSec) !== Math.round(b.elapsedSec)) return false;
  if (!nearlySameDistance(a.distanceM, b.distanceM)) return false;
  if (!hrCompatible(a.avgHr, b.avgHr)) return false;
  if (!hrCompatible(a.maxHr, b.maxHr)) return false;
  return true;
}

export function findDuplicateActivity(
  candidate: ActivityFingerprintInput,
  existing: StravaActivity[],
): StravaActivity | undefined {
  return existing.find((a) =>
    isSameActivitySession(candidate, {
      id: a.id,
      startDate: a.startDate,
      distanceM: a.distanceM,
      movingSec: a.movingSec,
      elapsedSec: a.elapsedSec,
      avgHr: a.avgHr,
      maxHr: a.maxHr,
    }),
  );
}

export const DUPLICATE_ACTIVITY_MESSAGE =
  'Cette séance est déjà enregistrée (même jour, durée, distance' +
  ' et données similaires). Vous ne pouvez pas l’importer en double.';
