/**
 * Prédiction de séance en boucle fermée — RPE attendu + consigne coach.
 * Utilisé avant le départ et après soumission du RPE (observation pour biais).
 *
 * Shared core (CP / VMA) : `./performancePredictionCore`
 */

import type { PlannedWorkout } from '../types/domain';

export type SessionOutcomeObservation = {
  predictedRpe: number;
  actualRpe: number;
  activityId: string;
  at: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Intensité nominale 1–10 depuis le plan (sans readiness). */
function baseRpeFromWorkout(workout: PlannedWorkout): number {
  if (workout.expectedRpe != null && workout.expectedRpe >= 1) {
    return clamp(workout.expectedRpe, 1, 10);
  }
  const t = (workout.title ?? '').toLowerCase();
  if (workout.discipline === 'rest' || /repos|récup|mobilité|yoga/.test(t)) return 2;
  if (/vma|pma|interval|sprint|vo2|force max|max/.test(t)) return 8;
  if (/seuil|tempo|threshold|allure|fartlek|qualité/.test(t)) return 7;
  if (/longue|long|sortie longue|brick/.test(t)) return 6;
  if (/récup|easy|footing|z2|zone\s*2/.test(t)) return 3;
  if (workout.discipline === 'strength' || /callis|calis|pompe|traction|dip/.test(t)) return 6;
  return 5;
}

/**
 * RPE prédit pour la séance : base plan × readiness + biais personnel.
 * readinessPct bas → RPE ressenti plus élevé ; rpeBias > 0 = athlète qui sous-estime.
 */
export function predictSessionRpe(
  workout: PlannedWorkout,
  readinessPct: number,
  rpeBias: number,
): number {
  const base = baseRpeFromWorkout(workout);
  const ready = clamp(readinessPct, 0, 100);
  // 100 % → −0,6 ; 50 % → +0,9 ; 20 % → +1,8
  const readinessDelta = ((70 - ready) / 50) * 1.5;
  const raw = base + readinessDelta + clamp(rpeBias, -2.5, 2.5);
  return Math.round(clamp(raw, 1, 10) * 10) / 10;
}

/**
 * Consigne courte FR avant départ — pas de jargon médical.
 */
export function predictSessionCue(
  workout: PlannedWorkout,
  readiness: number,
): string {
  const ready = clamp(readiness, 0, 100);
  const base = baseRpeFromWorkout(workout);
  const isHard = base >= 7;
  const isEasy = base <= 3 || workout.discipline === 'rest';

  if (isEasy) {
    if (ready < 45) return 'Jour léger — écoute le corps, reste en zone confort.';
    return 'Séance douce — profite pour bien bouger sans forcer.';
  }

  if (ready < 40) {
    return isHard
      ? 'Forme basse — allège l’intensité, garde la qualité du geste.'
      : 'Fatigue présente — réduis un peu le volume et reste fluide.';
  }
  if (ready < 55) {
    return isHard
      ? 'Récup moyenne — démarre prudent, ajuste si ça tire.'
      : 'OK pour y aller, mais sans chercher le max.';
  }
  if (ready < 70) {
    return isHard
      ? 'Prêt pour la qualité — monte progressivement dans les efforts.'
      : 'Bonne base — suis le plan, reste régulier.';
  }
  if (ready > 90 && isHard) {
    return 'Très frais — tu peux viser le haut de la fourchette prévue.';
  }
  if (ready >= 70) {
    return isHard
      ? 'Forme solide — exécute le plan avec intention.'
      : 'Bonne récup — séance dans le tempo prévu.';
  }
  return 'Suis le plan et note ton ressenti après.';
}

/**
 * Met à jour le biais RPE à partir d’observations (moyenne des écarts).
 * actual − predicted > 0 → athlète ressent plus dur que prévu.
 */
export function updateRpeBiasFromObservations(
  observations: SessionOutcomeObservation[],
  priorBias = 0,
): number {
  if (observations.length === 0) return clamp(priorBias, -2.5, 2.5);
  const recent = observations.slice(-8);
  const meanErr =
    recent.reduce((s, o) => s + (o.actualRpe - o.predictedRpe), 0) / recent.length;
  // Lissage exponentiel léger
  const next = priorBias * 0.55 + meanErr * 0.45;
  return Math.round(clamp(next, -2.5, 2.5) * 100) / 100;
}
