import type { StravaActivity } from '../types/domain';

/**
 * Comparateur d’allures / sorties similaires sans Strava (audit §5).
 */

export type PaceCompareResult = {
  current: StravaActivity;
  previous: StravaActivity;
  distanceDeltaPct: number;
  paceDeltaSecPerKm: number;
  paceDeltaLabel: string;
  summary: string;
};

function paceSec(a: StravaActivity): number | null {
  if (a.avgPaceSecPerKm != null && a.avgPaceSecPerKm > 0) return a.avgPaceSecPerKm;
  const distKm = (a.distanceM ?? 0) / 1000;
  const dur = a.movingSec || a.elapsedSec || 0;
  if (distKm < 0.4 || dur < 60) return null;
  return dur / distKm;
}

function formatPaceDelta(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  const sign = sec > 2 ? '+' : sec < -2 ? '−' : '±';
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  if (m > 0) return `${sign}${m}:${String(s).padStart(2, '0')}/km`;
  return `${sign}${s} s/km`;
}

/** Compare l’activité à la plus proche passée (même sport, ±18 % distance). */
export function findSimilarPaceCompare(
  current: StravaActivity,
  history: StravaActivity[],
): PaceCompareResult | null {
  const curPace = paceSec(current);
  const curDist = current.distanceM ?? 0;
  if (curPace == null || curDist < 400) return null;

  let best: StravaActivity | null = null;
  let bestScore = Infinity;

  for (const a of history) {
    if (a.id === current.id) continue;
    if ((a.sport ?? 'run') !== (current.sport ?? 'run')) continue;
    const d = a.distanceM ?? 0;
    if (d < 400) continue;
    const ratio = d / curDist;
    if (ratio < 0.82 || ratio > 1.18) continue;
    const p = paceSec(a);
    if (p == null) continue;
    const score = Math.abs(1 - ratio) * 1000 + Math.abs(p - curPace) * 0.05;
    if (score < bestScore) {
      bestScore = score;
      best = a;
    }
  }

  if (!best) return null;
  const prevPace = paceSec(best)!;
  const paceDelta = curPace - prevPace;
  const distanceDeltaPct = Math.round(
    (((current.distanceM ?? 0) - (best.distanceM ?? 0)) / (best.distanceM || 1)) * 100,
  );

  let verdict = 'allure similaire';
  if (paceDelta < -8) verdict = 'plus rapide';
  else if (paceDelta > 8) verdict = 'plus lent';

  return {
    current,
    previous: best,
    distanceDeltaPct,
    paceDeltaSecPerKm: paceDelta,
    paceDeltaLabel: formatPaceDelta(paceDelta),
    summary: `Vs sortie du ${(best.startDate ?? '').slice(0, 10)} : ${verdict} (${formatPaceDelta(paceDelta)}).`,
  };
}
