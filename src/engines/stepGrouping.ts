import type { WorkoutStep } from '../types/domain';

/** Empreinte d'une étape, sans son numéro (« Accélération 3 · … » = « Accélération 1 · … »). */
export function stepSignature(step: WorkoutStep): string {
  return [
    step.type,
    step.endCondition,
    step.durationSec ?? '',
    step.distanceMeters ?? '',
    step.repeat ?? '',
    (step.label ?? '').replace(/\d+/g, '#'),
    step.target ? JSON.stringify(step.target) : '',
  ].join('|');
}

export const MAX_CYCLE_LEN = 4;
export const MIN_CYCLE_REPEATS = 3;

/**
 * Cherche à partir de l'étape `i` un motif de 1 à 4 étapes répété au moins 3 fois d'affilée
 * (surges de fartlek, côtes, etc.). Renvoie le motif qui couvre le plus d'étapes.
 */
export function findRepeatCycle(steps: WorkoutStep[], i: number): { len: number; count: number } | null {
  let bestLen = 0;
  let bestCount = 1;
  for (let len = 1; len <= MAX_CYCLE_LEN && i + len * MIN_CYCLE_REPEATS <= steps.length; len++) {
    const cycle = steps.slice(i, i + len).map(stepSignature);
    let count = 1;
    while (
      i + (count + 1) * len <= steps.length &&
      steps.slice(i + count * len, i + (count + 1) * len).every((st, k) => stepSignature(st) === cycle[k])
    ) {
      count++;
    }
    if (count >= MIN_CYCLE_REPEATS && count * len > bestLen * bestCount) {
      bestLen = len;
      bestCount = count;
    }
  }
  return bestLen > 0 ? { len: bestLen, count: bestCount } : null;
}

/** « Accélération 3 · 1 min rapide » → « Accélération · 1 min rapide » (numéro d'ordre retiré dans un bloc répété). */
export function dropOrdinal(title: string): string {
  return title.replace(/\s\d+(?=\s·)/, '');
}
