import type { PlannedWorkout, StravaActivity } from '../types/domain';
import { computeSessionDurationSec } from './coachingEngine';

/**
 * Une séance importée (Strava, GPX…) ressemble-t-elle à la séance prévue ?
 * On compare le sport, puis la distance (si la séance en a une) ou la durée. Tolérance large :
 * on veut reconnaître « c'est bien ma sortie du jour », pas exiger le même kilométrage.
 */
export type PlanMatch = {
  matches: boolean;
  /** 0–1 : confiance. */
  score: number;
  /** Raisons lisibles (pour l'écran d'import). */
  reasons: string[];
};

type SportGroup = 'run' | 'bike' | 'swim' | 'strength' | 'other';

function groupOfPlanned(w: PlannedWorkout): SportGroup {
  switch (w.discipline) {
    case 'run':
    case 'brick':
      return 'run';
    case 'bike':
      return 'bike';
    case 'swim':
      return 'swim';
    case 'strength':
    case 'ppg':
      return 'strength';
    default:
      return 'other';
  }
}

function groupOfActivity(a: Pick<StravaActivity, 'sport'>): SportGroup {
  return a.sport === 'run' || a.sport === 'bike' || a.sport === 'swim' || a.sport === 'strength' ? a.sport : 'other';
}

const near = (actual: number, target: number, tol: number) => target > 0 && Math.abs(actual - target) / target <= tol;

export function matchActivityToPlanned(
  activity: Pick<StravaActivity, 'sport' | 'distanceM' | 'movingSec' | 'elapsedSec' | 'startDate'>,
  planned: PlannedWorkout | null | undefined,
): PlanMatch {
  if (!planned || planned.discipline === 'rest') return { matches: false, score: 0, reasons: [] };
  const reasons: string[] = [];
  const sameSport = groupOfActivity(activity) === groupOfPlanned(planned);
  if (!sameSport) return { matches: false, score: 0, reasons: ['Le sport ne correspond pas à ta séance prévue.'] };
  reasons.push('Même sport que ta séance prévue');
  let score = 0.45;

  const plannedKm = planned.plannedDistanceM ? planned.plannedDistanceM / 1000 : 0;
  const plannedSec = planned.plannedDurationSec ?? computeSessionDurationSec(planned.steps);
  const km = activity.distanceM / 1000;
  const sec = activity.movingSec || activity.elapsedSec;

  if (plannedKm > 0 && near(km, plannedKm, 0.35)) {
    score += 0.4;
    reasons.push(`Distance proche (${km.toFixed(1)} km pour ${plannedKm.toFixed(1)} km prévus)`);
  } else if (plannedSec > 0 && near(sec, plannedSec, 0.4)) {
    score += 0.4;
    reasons.push('Durée proche de la séance prévue');
  } else if (plannedKm > 0 || plannedSec > 0) {
    reasons.push('Distance / durée assez différentes de la séance prévue');
  }

  // Même jour : petit bonus.
  if (activity.startDate.slice(0, 10) === planned.date) score += 0.15;

  return { matches: score >= 0.7, score: Math.min(1, score), reasons };
}
