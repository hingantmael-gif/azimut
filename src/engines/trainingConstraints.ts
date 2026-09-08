/**
 * Contraintes de planning — sciences du sport :
 * - Fenêtres récup EF 12–24 h, seuil 24–36 h, VMA 48–72 h
 * - PPG ≥ 48 h avant une qualité
 * - Sortie longue espacée des qualités
 * - Musculation : 48 h (hypertrophie) / 72 h (force max)
 */

import { minDayGapForKind } from './sportsScience';

export type SessionRole =
  | 'long'
  | 'quality_a'
  | 'quality_b'
  | 'easy'
  | 'strength'
  | 'brick'
  | 'swim'
  | 'bike';

const HARD_ROLES = new Set<SessionRole>(['quality_a', 'quality_b', 'brick']);

function dayGap(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 7 - diff);
}

function isHard(role: SessionRole): boolean {
  return HARD_ROLES.has(role);
}

/** Gap min (jours) selon le rôle — VMA/qualité = 2 j (≈48 h). */
function requiredGap(role: SessionRole, other: SessionRole): number {
  if (role === 'quality_a' || other === 'quality_a') {
    return minDayGapForKind('vma');
  }
  if (role === 'quality_b' || other === 'quality_b' || role === 'brick' || other === 'brick') {
    return Math.max(2, minDayGapForKind('tempo'));
  }
  if (role === 'strength' || other === 'strength') {
    return minDayGapForKind('hypertrophy');
  }
  return 2;
}

/** Vérifie qu'aucune règle n'est violée pour un rôle sur un jour donné. */
function canPlace(
  dow: number,
  role: SessionRole,
  assignments: Map<number, SessionRole>,
): boolean {
  for (const [existingDow, existingRole] of assignments) {
    const gap = dayGap(dow, existingDow);

    if (isHard(role) && isHard(existingRole) && gap < requiredGap(role, existingRole)) {
      return false;
    }

    if (role === 'long' && isHard(existingRole) && gap < 2) {
      return false;
    }
    if (isHard(role) && existingRole === 'long' && gap < 2) {
      return false;
    }

    if (role === 'strength' && isHard(existingRole) && gap < requiredGap(role, existingRole)) {
      return false;
    }
    if (isHard(role) && existingRole === 'strength' && gap < requiredGap(role, existingRole)) {
      return false;
    }
  }
  return true;
}

/** Trouve le meilleur jour disponible pour un rôle en respectant les contraintes. */
function findBestDay(
  candidates: number[],
  role: SessionRole,
  assignments: Map<number, SessionRole>,
  preferDow?: number,
): number | undefined {
  const pool = preferDow != null && candidates.includes(preferDow) ? [preferDow, ...candidates.filter((d) => d !== preferDow)] : candidates;

  for (const dow of pool) {
    if (assignments.has(dow)) continue;
    if (canPlace(dow, role, assignments)) return dow;
  }

  // Relâchement minimal : accepter gap=1 si impossible autrement (plans 3 j/sem)
  if (candidates.length <= 3 && (isHard(role) || role === 'long')) {
    for (const dow of pool) {
      if (!assignments.has(dow)) return dow;
    }
  }

  return undefined;
}

export type RoleAssignmentInput = {
  days: number[];
  longDow: number;
  hiCount: number;
  includePpg: boolean;
  family: 'run' | 'bike' | 'swim' | 'triathlon' | 'strength' | 'other';
};

/**
 * Assigne les rôles aux jours en respectant les contraintes de récupération.
 * Remplace l'ancien assignRoles positionnel.
 */
export function assignRolesWithConstraints(input: RoleAssignmentInput): Map<number, SessionRole> {
  const { days, longDow, hiCount, includePpg, family } = input;
  const sorted = [...days].sort((a, b) => a - b);
  const assignments = new Map<number, SessionRole>();

  if (family === 'strength') {
    sorted.forEach((d) => assignments.set(d, 'strength'));
    return assignments;
  }

  // 1. Sortie longue (course pure) — toujours distincte du brick en triathlon
  if (sorted.includes(longDow)) {
    assignments.set(longDow, 'long');
  }

  // 1b. Brick triathlon : 1×/sem max, jamais le même jour que la longue
  if (family === 'triathlon' && sorted.length >= 3) {
    const brickCandidates = sorted.filter((d) => d !== longDow);
    const brickDay =
      findBestDay(brickCandidates, 'brick', assignments, brickCandidates[0]) ??
      brickCandidates[0];
    if (brickDay != null && sorted.includes(brickDay)) {
      assignments.set(brickDay, 'brick');
    }
  }

  const remaining = sorted.filter((d) => !assignments.has(d));

  // 2. Qualités — espacées, loin de la longue
  const qualityRoles: SessionRole[] = [];
  if (hiCount >= 1) qualityRoles.push('quality_a');
  if (hiCount >= 2) qualityRoles.push('quality_b');

  for (const role of qualityRoles) {
    const candidates = remaining.filter((d) => !assignments.has(d));
    const prefer = candidates.find((d) => dayGap(d, longDow) >= 2) ?? candidates[0];
    const day = findBestDay(candidates, role, assignments, prefer);
    if (day != null) assignments.set(day, role);
  }

  // 3. Disciplines spécifiques tri / swim / bike / other
  if (family === 'triathlon') {
    const free = sorted.filter((d) => !assignments.has(d));
    if (free[0] != null) assignments.set(free[0], 'swim');
    if (free[1] != null) assignments.set(free[1], 'bike');
    free.slice(2).forEach((d, i) => {
      if (!assignments.has(d)) {
        // Alterner footing facile et nage — jamais tout absorber en brick
        assignments.set(d, i % 2 === 0 ? 'easy' : 'swim');
      }
    });
  } else if (family === 'swim') {
    sorted.forEach((d) => {
      if (!assignments.has(d)) assignments.set(d, 'swim');
    });
  } else if (family === 'bike') {
    sorted.forEach((d) => {
      if (!assignments.has(d)) assignments.set(d, 'easy');
    });
  } else if (family === 'other') {
    // Biathlon / duathlon : brick + vélo + course (easy)
    if (sorted.includes(longDow) && sorted.length >= 3) {
      assignments.set(longDow, 'brick');
    }
    const free = sorted.filter((d) => !assignments.has(d));
    free.forEach((d, i) => {
      assignments.set(d, i % 2 === 0 ? 'bike' : 'easy');
    });
  } else {
    // run — easy par défaut
    sorted.forEach((d) => {
      if (!assignments.has(d)) assignments.set(d, 'easy');
    });
  }

  // 4. PPG — jour avec ≥ 2 jours avant la prochaine qualité
  if (includePpg) {
    const candidates = [1, 2, 3, 4, 5].filter((d) => sorted.includes(d) && !assignments.has(d));
    let ppgDay = findBestDay(candidates.length > 0 ? candidates : sorted.filter((d) => !assignments.has(d)), 'strength', assignments);

    if (ppgDay == null) {
      const easyDays = sorted.filter((d) => assignments.get(d) === 'easy');
      ppgDay = easyDays.find((d) => canPlace(d, 'strength', assignments)) ?? easyDays[easyDays.length - 1];
    }

    if (ppgDay != null) {
      if (assignments.get(ppgDay) === 'easy') {
        assignments.set(ppgDay, 'strength');
      } else if (!assignments.has(ppgDay)) {
        assignments.set(ppgDay, 'strength');
      }
    }
  }

  return assignments;
}
