import type { SessionAnalysis, StravaActivity } from '../types/domain';

/**
 * Insight coach court pour partage / détail activité (likes social).
 * Une seule ligne FR, sans jargon lourd.
 */

function paceFromLap(lap: {
  distanceM: number;
  elapsedSec: number;
  avgPaceSecPerKm?: number;
}): number | null {
  if (lap.avgPaceSecPerKm != null && lap.avgPaceSecPerKm > 0) {
    return lap.avgPaceSecPerKm;
  }
  if (lap.distanceM >= 80 && lap.elapsedSec >= 20) {
    return lap.elapsedSec / (lap.distanceM / 1000);
  }
  return null;
}

/** Negative split si 2e moitié plus rapide d’au moins ~3 %. */
function detectNegativeSplit(activity: StravaActivity): boolean | null {
  const laps = activity.laps;
  if (laps && laps.length >= 2) {
    const mid = Math.floor(laps.length / 2);
    const first = laps.slice(0, mid);
    const second = laps.slice(mid);
    const paceAvg = (xs: typeof laps) => {
      const paces = xs.map(paceFromLap).filter((p): p is number => p != null);
      if (!paces.length) return null;
      return paces.reduce((a, b) => a + b, 0) / paces.length;
    };
    const p1 = paceAvg(first);
    const p2 = paceAvg(second);
    if (p1 != null && p2 != null && p1 > 0) {
      return p2 < p1 * 0.97;
    }
  }

  const vel = activity.streams?.velocitySmooth;
  if (vel && vel.length >= 20) {
    const mid = Math.floor(vel.length / 2);
    const avg = (arr: number[]) =>
      arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    const first = avg(vel.slice(0, mid));
    const second = avg(vel.slice(mid));
    if (first > 0.5 && second > 0.5) {
      // velocitySmooth ≈ m/s — plus rapide = plus grand
      return second > first * 1.03;
    }
  }

  return null;
}

/**
 * Retourne une courte phrase de coaching, ou null si rien de notable.
 */
export function buildSessionCoachingInsight(
  activity: StravaActivity,
  analyses?: SessionAnalysis[] | SessionAnalysis | null,
): string | null {
  const analysis = Array.isArray(analyses)
    ? analyses.find((a) => a.activityId === activity.id)
    : analyses?.activityId === activity.id
      ? analyses
      : null;

  const compliance = analysis?.compliance.total;
  if (compliance != null && compliance >= 85) {
    return 'Excellente fidélité au plan — belle exécution.';
  }
  if (compliance != null && compliance >= 70) {
    return 'Bonne compliance au plan — rythme maîtrisé.';
  }

  const neg = detectNegativeSplit(activity);
  if (neg === true) {
    return 'Negative split réussi — tu as bien géré l’allure.';
  }

  if (compliance != null && compliance < 55) {
    return 'Écart au plan notable — le coach ajustera la suite.';
  }

  const km = (activity.distanceM ?? 0) / 1000;
  const moving = activity.movingSec || activity.elapsedSec || 0;
  if (km >= 8 && moving >= 35 * 60) {
    return 'Volume solide — récupération et hydratation aujourd’hui.';
  }

  if (activity.avgHr != null && activity.maxHr != null) {
    const ratio = activity.avgHr / Math.max(1, activity.maxHr);
    if (ratio < 0.72 && km >= 3) {
      return 'Effort aérobie bien tenu — idéal pour construire.';
    }
  }

  if (neg === false && km >= 4) {
    return 'Allure un peu plus dure en fin — note pour la prochaine.';
  }

  if (moving >= 20 * 60) {
    return 'Séance validée — chaque sortie compte pour la forme.';
  }

  return null;
}
