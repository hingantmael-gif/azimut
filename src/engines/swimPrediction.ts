/**
 * Prédiction natation — modèle distinct de la course.
 *
 * Sources (coaching / littérature) :
 * - Critical Swim Speed (Wakayoshi et al. 1992) : seuil ~30 min,
 *   test classique 200 m + 400 m. Équivalent natation du FTP vélo.
 * - CSS → temps de course : TrainingZones / MyProCoach / TraPlaGo
 *   (facteurs de pace relatifs au CSS selon la distance).
 * - Exposant Riegel natation ~1.06–1.10 (fatigue technique + aérobie),
 *   personnalisable si 2 chronos connus (SwimmingRegimen adaptive mode).
 *
 * Les sprints (50–100 m) sont surtout anaérobies : le CSS est moins
 * prédictif ; on applique des facteurs empiriques plus larges.
 */

import { SWIM_DISTANCES, type SportDistanceDef } from '../constants/sportDistances';

export type SwimPredictRow = {
  key: string;
  distanceLabel: string;
  predictedSec: number;
  /** sec / 100 m */
  paceSecPer100: number;
  isMeasured: boolean;
  method?: 'measured' | 'css' | 'riegel' | 'blend';
};

/** Facteur pace (sec/100 m) vs CSS : <1 = plus rapide que le seuil. */
const CSS_PACE_FACTOR: Record<string, number> = {
  '50m': 0.78,
  '100m': 0.86,
  '200m': 0.93,
  '400m': 0.97,
  '800m': 1.01,
  '1500m': 1.025,
  '1k-ow': 1.06, // eau libre : navigation + courant
  '2k-ow': 1.09,
  '5k-ow': 1.14,
};

/** Exposant Riegel par bande (baseline freestyle). */
function swimBandExponent(fromKm: number, toKm: number): number {
  const short = Math.min(fromKm, toKm);
  const long = Math.max(fromKm, toKm);
  if (long <= 0.2) return 1.05; // 50–200 : anaérobie / vitesse
  if (short >= 0.4) return 1.07; // distance aérobie
  return 1.08; // croisement sprint ↔ distance
}

function pacePer100(sec: number, km: number): number {
  if (km <= 0) return 0;
  return Math.round(sec / (km * 10));
}

/**
 * CSS (m/s) depuis 200 m + 400 m.
 * CSS = (D2−D1)/(T2−T1) avec D en mètres.
 */
export function criticalSwimSpeedMps(
  sec200: number,
  sec400: number,
): number | null {
  if (!(sec200 > 0) || !(sec400 > 0) || sec400 <= sec200) return null;
  return 200 / (sec400 - sec200);
}

/** Pace CSS en sec / 100 m. */
export function cssPaceSecPer100(cssMps: number): number {
  if (!(cssMps > 0)) return 0;
  return 100 / cssMps;
}

/** Estime le CSS pace depuis un seul chrono via le facteur de distance. */
export function estimateCssPaceFromRace(
  key: string,
  sec: number,
  km: number,
): number | null {
  const factor = CSS_PACE_FACTOR[key];
  if (!factor || !(sec > 0) || km <= 0) return null;
  const racePace100 = sec / (km * 10);
  return racePace100 / factor;
}

function personalExponent(
  km1: number,
  sec1: number,
  km2: number,
  sec2: number,
): number | null {
  if (km1 <= 0 || km2 <= 0 || sec1 <= 0 || sec2 <= 0 || km1 === km2) return null;
  const exp = Math.log(sec2 / sec1) / Math.log(km2 / km1);
  if (!Number.isFinite(exp) || exp < 1.02 || exp > 1.18) return null;
  return exp;
}

function riegelSwim(
  refKm: number,
  refSec: number,
  targetKm: number,
  exponent: number,
): number {
  return refSec * Math.pow(targetKm / refKm, exponent);
}

function pickBestSwimRef(
  times: Partial<Record<string, number>>,
): { key: string; km: number; sec: number } | null {
  // Préférer 200/400 (base CSS), sinon distance moyenne connue
  const prefer = ['400m', '200m', '100m', '800m', '1500m', '50m', '1k-ow', '2k-ow', '5k-ow'];
  for (const key of prefer) {
    const def = SWIM_DISTANCES.find((d) => d.key === key);
    const sec = times[key];
    if (def && sec != null && sec > 0) {
      return { key, km: def.km, sec };
    }
  }
  return null;
}

function twoBestTimes(
  times: Partial<Record<string, number>>,
): Array<{ key: string; km: number; sec: number }> {
  const out: Array<{ key: string; km: number; sec: number }> = [];
  for (const d of SWIM_DISTANCES) {
    const sec = times[d.key];
    if (sec != null && sec > 0) out.push({ key: d.key, km: d.km, sec });
  }
  out.sort((a, b) => a.km - b.km);
  return out;
}

/**
 * Prédictions natation pour tout le catalogue.
 */
export function predictSwimCatalog(
  times: Partial<Record<string, number>>,
): SwimPredictRow[] {
  const measured = twoBestTimes(times);
  if (measured.length === 0) return [];

  const sec200 = times['200m'];
  const sec400 = times['400m'];
  let cssPace: number | null = null;
  if (sec200 != null && sec400 != null) {
    const css = criticalSwimSpeedMps(sec200, sec400);
    if (css) cssPace = cssPaceSecPer100(css);
  }
  if (cssPace == null) {
    const ref = pickBestSwimRef(times);
    if (ref) cssPace = estimateCssPaceFromRace(ref.key, ref.sec, ref.km);
  }

  let personalExp: number | null = null;
  if (measured.length >= 2) {
    // Prendre la paire la plus « distance-séparée »
    const a = measured[0]!;
    const b = measured[measured.length - 1]!;
    personalExp = personalExponent(a.km, a.sec, b.km, b.sec);
  }

  const ref = pickBestSwimRef(times)!;

  return SWIM_DISTANCES.map((d: SportDistanceDef) => {
    const m = times[d.key];
    if (m != null && m > 0) {
      return {
        key: d.key,
        distanceLabel: d.label,
        predictedSec: m,
        paceSecPer100: pacePer100(m, d.km),
        isMeasured: true,
        method: 'measured' as const,
      };
    }

    const bandExp = personalExp ?? swimBandExponent(ref.km, d.km);
    const riegelSec = riegelSwim(ref.km, ref.sec, d.km, bandExp);

    let cssSec: number | null = null;
    if (cssPace != null) {
      const factor = CSS_PACE_FACTOR[d.key] ?? 1.05;
      cssSec = cssPace * factor * (d.km * 10);
    }

    let predictedSec: number;
    let method: SwimPredictRow['method'];
    if (cssSec != null && Number.isFinite(cssSec)) {
      // Blend : CSS pour ≥200 m, plus de Riegel sur sprints
      const wCss = d.km >= 0.2 ? 0.7 : 0.35;
      predictedSec = Math.round(wCss * cssSec + (1 - wCss) * riegelSec);
      method = 'blend';
    } else {
      predictedSec = Math.round(riegelSec);
      method = personalExp != null ? 'riegel' : 'riegel';
    }

    return {
      key: d.key,
      distanceLabel: d.label,
      predictedSec,
      paceSecPer100: pacePer100(predictedSec, d.km),
      isMeasured: false,
      method,
    };
  });
}

/** Remplit les distances manquantes depuis les chronos connus. */
export function predictSwimTimesSecMap(
  times: Partial<Record<string, number>>,
): Partial<Record<string, number>> {
  const rows = predictSwimCatalog(times);
  const out: Partial<Record<string, number>> = { ...times };
  for (const r of rows) {
    if (out[r.key] == null || !(out[r.key]! > 0)) {
      out[r.key] = r.predictedSec;
    }
  }
  return out;
}

export function swimSecForDistanceKm(
  times: Partial<Record<string, number>>,
  targetKm: number,
): number | null {
  const rows = predictSwimCatalog(times);
  if (rows.length === 0) return null;
  // Exact match
  const exact = SWIM_DISTANCES.find((d) => Math.abs(d.km - targetKm) < 0.02);
  if (exact) {
    const row = rows.find((r) => r.key === exact.key);
    if (row) return row.predictedSec;
  }
  const ref = pickBestSwimRef(times);
  if (!ref) return null;
  const measured = twoBestTimes(times);
  const exp =
    measured.length >= 2
      ? personalExponent(
          measured[0]!.km,
          measured[0]!.sec,
          measured[measured.length - 1]!.km,
          measured[measured.length - 1]!.sec,
        ) ?? swimBandExponent(ref.km, targetKm)
      : swimBandExponent(ref.km, targetKm);
  return Math.round(riegelSwim(ref.km, ref.sec, targetKm, exp));
}
