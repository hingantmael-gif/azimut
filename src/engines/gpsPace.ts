/**
 * Logique GPS pure (sans React ni expo-location) — extraite de `useLiveGpsTrack`
 * pour être testable : filtrage des segments et allure instantanée lissée.
 */

import { haversineM } from './liveWorkout';

export type GpsSample = {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
};

/** Points trop flous exclus du calcul d’allure (GpsSignalBars niveau ≤ 2). */
export const PACE_BAD_ACCURACY_M = 25;
/** Déplacement minimal (m) pour compter un segment avec un bon signal. */
export const MIN_MOVE_M = 2.5;
/** Vitesse native (m/s) sous laquelle on considère un quasi-arrêt. */
export const STILL_SPEED_MPS = 0.45;
/** Vitesse max plausible (m/s ≈ 100 km/h) : au-delà = saut GPS. */
export const MAX_SPEED_MPS = 28;

/**
 * Faut-il compter ce segment dans la distance ? Écarte le bruit de position :
 * - déplacement sous le seuil (plus large quand le signal est flou : un fix à ±30 m
 *   « bouge » de 10 m à l’arrêt, ce n’est pas de la distance) ;
 * - vitesse irréaliste (saut GPS) ;
 * - vitesse native quasi nulle avec petit déplacement.
 */
export function shouldCountGpsSegment(opts: {
  distanceM: number;
  dtSec: number;
  accuracyPrevM?: number;
  accuracyNextM?: number;
  nativeSpeedMps?: number | null;
}): boolean {
  const { distanceM, nativeSpeedMps } = opts;
  if (!Number.isFinite(distanceM) || distanceM <= 0) return false;

  const dt = Math.max(0.4, Number.isFinite(opts.dtSec) ? opts.dtSec : 0.4);
  if (distanceM / dt > MAX_SPEED_MPS) return false;

  // Incertitude de la mesure : la plus mauvaise des deux extrémités.
  const acc = Math.max(opts.accuracyPrevM ?? 0, opts.accuracyNextM ?? 0);
  // Un déplacement inférieur à l’incertitude annoncée est indiscernable du bruit.
  // Seuil continu : historique (2,5 m) tant que le signal est net (≤ ~10 m), puis ≈ précision − 8 m.
  const minMove = Math.max(MIN_MOVE_M, acc - 8);
  if (distanceM < minMove) return false;

  if (
    nativeSpeedMps != null &&
    nativeSpeedMps >= 0 &&
    nativeSpeedMps < STILL_SPEED_MPS &&
    distanceM < minMove * 2.2
  ) {
    return false;
  }
  return true;
}

/** Allure lissée : poids croissant vers les échantillons récents (le dernier pèse le plus). */
export function weightedRecentPace(paces: number[]): number | null {
  if (paces.length === 0) return null;
  let num = 0;
  let den = 0;
  for (let i = 0; i < paces.length; i++) {
    const w = (i + 1) * (i + 1);
    num += paces[i]! * w;
    den += w;
  }
  return den > 0 ? num / den : null;
}

/**
 * Allure instantanée (s/km) sur une fenêtre glissante d’environ 25 s / 80 m :
 * ignore les fixes flous (> 25 m), pondère plus fort les segments récents et les
 * signaux nets.
 */
export function computeAdaptiveWindowPace(pts: GpsSample[]): number | null {
  let weightedDist = 0;
  let weightedT = 0;
  let rawDist = 0;
  let rawT = 0;
  let segIndex = 0;

  // On remonte du point le plus récent vers les plus anciens : segIndex = âge du segment.
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const accA = a.accuracy ?? 999;
    const accB = b.accuracy ?? 999;
    if (accA > PACE_BAD_ACCURACY_M || accB > PACE_BAD_ACCURACY_M) continue;

    const d = haversineM({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    const dt = Math.max(0, (b.timestamp - a.timestamp) / 1000);
    if (dt <= 0 || d <= 0) continue;

    const goodSignal = accA < 12 && accB < 12;
    const okSignal = accA < 25 && accB < 25;
    // Plus le segment est ancien, moins il compte (l’ancienne formule 1 + age·0,35 faisait
    // l’inverse : l’allure affichée réagissait avec retard).
    const recency = 1 / (1 + segIndex * 0.35);
    const quality = goodSignal ? 1.45 : okSignal ? 1 : 0.55;
    const w = recency * quality;

    weightedDist += d * w;
    weightedT += dt * w;
    rawDist += d;
    rawT += dt;
    segIndex += 1;
    if (rawT >= 25 || rawDist >= 80) break;
  }

  // Seuils de validité sur les valeurs réelles (pas pondérées) : la pondération ne doit
  // pas retarder l’apparition de l’allure.
  if (rawDist > 12 && rawT > 4 && weightedDist > 0) {
    return weightedT / (weightedDist / 1000);
  }
  return null;
}

/**
 * Allure INSTANTANÉE (s/km), pensée pour coller à une montre : fenêtre de ~10 s seulement, et vitesse
 * « Doppler » du GPS quand elle est fournie (la plus réactive). Renvoie null si pas assez de données.
 */
export function computeInstantPace(pts: GpsSample[], nativeSpeedMps?: number | null): number | null {
  const last = pts[pts.length - 1];
  if (!last) return null;
  const lastAcc = last.accuracy ?? 999;
  if (nativeSpeedMps != null && nativeSpeedMps >= 0.8 && nativeSpeedMps <= MAX_SPEED_MPS && lastAcc <= 20) {
    return 1000 / nativeSpeedMps;
  }
  let dist = 0;
  let t = 0;
  for (let i = pts.length - 1; i > 0; i--) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if ((a.accuracy ?? 999) > PACE_BAD_ACCURACY_M || (b.accuracy ?? 999) > PACE_BAD_ACCURACY_M) continue;
    const dt = (b.timestamp - a.timestamp) / 1000;
    if (dt <= 0) continue;
    dist += haversineM({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    t += dt;
    if (t >= 10) break;
  }
  if (t >= 3 && dist >= 6) return t / (dist / 1000);
  return computeAdaptiveWindowPace(pts);
}

/**
 * Lissage exponentiel à constante de temps ~3 s : une accélération se voit en 4–6 s (une montre en 3–5 s),
 * au lieu de 30–60 s avec l'ancien lissage sur 12 échantillons.
 */
export function smoothPace(prev: number | null, next: number, dtSec: number): number {
  if (prev == null) return next;
  const alpha = 1 - Math.exp(-Math.max(dtSec, 0.5) / 3);
  return prev + alpha * (next - prev);
}
