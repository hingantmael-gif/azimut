/**
 * Critical Power / W' vélo — estimation honnête.
 * Sans données de puissance (watts), CP = null ; on documente le proxy vitesse.
 */

import type { StravaActivity } from '../types/domain';
import { powerFromSpeedMps } from './bikePrediction';

export type PowerDurationCurve = {
  p5s?: number;
  p1m?: number;
  p5m?: number;
  p20m?: number;
  p60m?: number;
};

export type CriticalPowerEstimate = {
  cp: number;
  wPrime: number;
};

export type RiderProfileKind = 'sprinter' | 'climber' | 'rouleur' | 'puncheur' | 'unknown';

/**
 * Modèle 2 paramètres : P(t) = CP + W'/t
 * Utilise deux points de durée distincts (ex. 5 min + 20 min).
 */
export function estimateCriticalPower(
  curve: PowerDurationCurve,
): CriticalPowerEstimate | null {
  const points: { tSec: number; p: number }[] = [];
  if (curve.p1m != null && curve.p1m > 0) points.push({ tSec: 60, p: curve.p1m });
  if (curve.p5m != null && curve.p5m > 0) points.push({ tSec: 300, p: curve.p5m });
  if (curve.p20m != null && curve.p20m > 0) points.push({ tSec: 1200, p: curve.p20m });
  if (curve.p60m != null && curve.p60m > 0) points.push({ tSec: 3600, p: curve.p60m });

  if (points.length < 2) {
    // Un seul point long ≈ FTP ≈ CP (W' inconnu → estimation grossière)
    if (curve.p60m != null && curve.p60m > 80) {
      return { cp: Math.round(curve.p60m), wPrime: Math.round(curve.p60m * 12) };
    }
    if (curve.p20m != null && curve.p20m > 80) {
      // 20 min ≈ 105 % FTP classiquement
      const cp = Math.round(curve.p20m / 1.05);
      return { cp, wPrime: Math.round(cp * 14) };
    }
    return null;
  }

  // Préférer paires aérobies (5m–20m, 5m–60m, 20m–60m)
  const preferPairs: [number, number][] = [
    [300, 1200],
    [300, 3600],
    [1200, 3600],
    [60, 300],
    [60, 1200],
  ];
  let best: CriticalPowerEstimate | null = null;

  for (const [t1, t2] of preferPairs) {
    const a = points.find((p) => p.tSec === t1);
    const b = points.find((p) => p.tSec === t2);
    if (!a || !b || a.p <= b.p) continue;
    // P1 = CP + W'/t1 ; P2 = CP + W'/t2
    // W' = (P1 - P2) / (1/t1 - 1/t2)
    const denom = 1 / a.tSec - 1 / b.tSec;
    if (Math.abs(denom) < 1e-9) continue;
    const wPrime = (a.p - b.p) / denom;
    const cp = a.p - wPrime / a.tSec;
    if (!(cp > 50) || !(cp < 550) || !(wPrime > 1000) || !(wPrime < 50_000)) continue;
    best = { cp: Math.round(cp), wPrime: Math.round(wPrime) };
    break;
  }

  if (best) return best;

  // Régression linéaire P vs 1/t sur tous les points
  const xs = points.map((p) => 1 / p.tSec);
  const ys = points.map((p) => p.p);
  const n = points.length;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den < 1e-12) return null;
  const wPrime = num / den;
  const cp = meanY - wPrime * meanX;
  if (!(cp > 50) || !(cp < 550) || !(wPrime > 1000)) return null;
  return { cp: Math.round(cp), wPrime: Math.round(wPrime) };
}

/**
 * Profil morpho-puissance simplifié depuis la forme de la courbe.
 */
export function inferRiderProfile(curve: PowerDurationCurve): RiderProfileKind {
  const sprint = curve.p5s ?? curve.p1m;
  const mid = curve.p5m;
  const long = curve.p20m ?? curve.p60m;
  if (sprint == null || long == null) return 'unknown';

  const ratioShortLong = sprint / Math.max(1, long);
  const midLong = mid != null ? mid / Math.max(1, long) : null;

  if (ratioShortLong >= 1.85 && (midLong == null || midLong < 1.25)) {
    return 'sprinter';
  }
  if (ratioShortLong >= 1.55 && midLong != null && midLong >= 1.2) {
    return 'puncheur';
  }
  // Rouleur : courbe plate (peu d'écart entre 5 min et la durée longue). L'ancienne
  // condition `long >= p5m` était impossible sur une vraie courbe (p20m ≤ p5m).
  if (ratioShortLong <= 1.35 && (midLong == null || midLong < 1.12)) {
    return 'rouleur';
  }
  // Climber : bon 5–20 min relatif, sprint moins explosif
  if (mid != null && mid / Math.max(1, sprint) >= 0.72 && ratioShortLong < 1.6) {
    return 'climber';
  }
  if (midLong != null && midLong >= 1.12 && ratioShortLong < 1.7) {
    return 'climber';
  }
  return 'unknown';
}

function maxMeanWatts(watts: number[], windowSec: number): number | null {
  if (watts.length < 3) return null;
  // Assume ~1 Hz sampling
  const n = Math.max(1, Math.round(windowSec));
  // Sortie plus courte que la fenêtre : la puissance moyenne maximale sur `windowSec`
  // n'est pas établie (la moyenne d'une sortie de 25 min n'est pas un « 60 min »).
  // La renvoyer gonflerait la courbe puissance-durée et donc CP / W'.
  if (watts.length < n) return null;
  let windowSum = 0;
  for (let i = 0; i < n; i++) windowSum += watts[i];
  let best = windowSum;
  for (let i = n; i < watts.length; i++) {
    windowSum += watts[i] - watts[i - n];
    if (windowSum > best) best = windowSum;
  }
  const mean = best / n;
  return mean > 40 ? Math.round(mean) : null;
}

function activityHasPower(a: StravaActivity): boolean {
  return Boolean(a.streams?.watts && a.streams.watts.length > 10);
}

/**
 * Construit une courbe durée-puissance best-effort.
 * Préfère les streams watts. Sans watts + allowSpeedProxy : proxy vitesse×masse
 * (indicatif). Sinon courbe partielle / vide — voir `lastCurveBuildNotes`.
 */
let lastCurveBuildNotes: string[] = [];
let lastCurveHadRealPower = false;

export function getLastCurveBuildMeta(): { notes: string[]; hasRealPower: boolean } {
  return { notes: [...lastCurveBuildNotes], hasRealPower: lastCurveHadRealPower };
}

export function buildCurveFromActivities(
  activities: StravaActivity[],
  opts?: { riderKg?: number; allowSpeedProxy?: boolean },
): PowerDurationCurve {
  const bikes = activities.filter(
    (a) => (!a.sport || a.sport === 'bike') && (a.movingSec || a.elapsedSec) > 30,
  );
  const withPower = bikes.filter(activityHasPower);
  const notes: string[] = [];
  const curve: PowerDurationCurve = {};

  if (withPower.length === 0) {
    notes.push(
      'Aucune donnée de puissance (watts) — CP/W\' non estimable de façon fiable.',
    );
    if (opts?.allowSpeedProxy) {
      const mass = opts.riderKg != null && opts.riderKg > 40 ? opts.riderKg + 9 : 84;
      let best20: number | undefined;
      let best60: number | undefined;
      for (const a of bikes) {
        const dur = a.movingSec || a.elapsedSec;
        const dist = a.distanceM;
        if (dist < 2000 || dur < 120) continue;
        const v = dist / dur;
        const p = powerFromSpeedMps(v, mass);
        if (!(p > 60)) continue;
        if (dur >= 1100 && dur <= 1500) best20 = Math.max(best20 ?? 0, Math.round(p));
        if (dur >= 3000) best60 = Math.max(best60 ?? 0, Math.round(p * 0.95));
      }
      if (best20) curve.p20m = best20;
      if (best60) curve.p60m = best60;
      if (best20 || best60) {
        notes.push(
          'Proxy vitesse×masse utilisé (pas de capteur puissance) — CP indicatif seulement.',
        );
      }
    }
    lastCurveBuildNotes = notes;
    lastCurveHadRealPower = false;
    return curve;
  }

  const windows: Array<{ key: keyof PowerDurationCurve; sec: number }> = [
    { key: 'p5s', sec: 5 },
    { key: 'p1m', sec: 60 },
    { key: 'p5m', sec: 300 },
    { key: 'p20m', sec: 1200 },
    { key: 'p60m', sec: 3600 },
  ];

  for (const { key, sec } of windows) {
    let best = 0;
    for (const a of withPower) {
      const watts = a.streams!.watts!;
      const m = maxMeanWatts(watts, sec);
      if (m != null && m > best) best = m;
    }
    if (best > 0) curve[key] = best;
  }

  notes.push(`Courbe construite depuis ${withPower.length} sortie(s) avec watts.`);
  lastCurveBuildNotes = notes;
  lastCurveHadRealPower = true;
  return curve;
}

/**
 * Estimation CP uniquement si puissance réelle disponible (sauf allowSpeedProxy).
 */
export function estimateCriticalPowerFromActivities(
  activities: StravaActivity[],
  opts?: { riderKg?: number; allowSpeedProxy?: boolean },
): (CriticalPowerEstimate & { notes: string[]; profile: RiderProfileKind }) | null {
  const curve = buildCurveFromActivities(activities, opts);
  const meta = getLastCurveBuildMeta();
  if (!meta.hasRealPower && !opts?.allowSpeedProxy) {
    return null;
  }
  const est = estimateCriticalPower(curve);
  if (!est) return null;
  return {
    ...est,
    notes: meta.notes,
    profile: inferRiderProfile(curve),
  };
}

/** Garde utilitaire — évite d’afficher un CP fantôme. */
export function canTrustCriticalPower(hasRealPower: boolean): boolean {
  return hasRealPower;
}
