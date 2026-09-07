/**
 * Prédiction vélo — modèle distinct de la course et de la natation.
 *
 * Sources :
 * - Critical Power / FTP (Allen & Coggan ; CP literature) : puissance soutenable
 *   ~1 h ≈ FTP ; efforts plus courts > FTP, plus longs < FTP.
 * - Équation de puissance cycliste (flat) :
 *   P ≈ ½·ρ·CdA·v³ + Crr·m·g·v  (Roadman / BetterLife race predictors)
 * - Intensités typiques selon durée (coaching) :
 *   CLM 20–40 min ≈ 100–108 % FTP ; 2–3 h ≈ 75–85 % ; gran fondo / century ≈ 70–80 %.
 *
 * Distances iconiques ciblées : 10 / 20 / 40 km CLM, cyclo 80–120, century 160,
 * splits triathlon 90 / 180.
 */

import { BIKE_DISTANCES, type SportDistanceDef } from '../constants/sportDistances';
import type { AthleticLevel } from '../types/domain';

export type BikePredictRow = {
  key: string;
  distanceLabel: string;
  predictedSec: number;
  /** sec / km (allure) */
  paceSecPerKm: number;
  avgKmh: number;
  isMeasured: boolean;
  method?: 'measured' | 'ftp' | 'chrono' | 'blend';
};

const G = 9.80665;
const RHO = 1.225;
/** Route drops / endurance hoods — CdA moyen amateur */
const CDA = 0.32;
const CRR = 0.0045;
const BIKE_KG = 9;

/** % FTP soutenable selon durée d’effort (min). */
export function ftpIntensityForDurationMin(tMin: number): number {
  if (tMin <= 12) return 1.18;
  if (tMin <= 20) return 1.08;
  if (tMin <= 35) return 1.02;
  if (tMin <= 55) return 0.98;
  if (tMin <= 75) return 0.94;
  if (tMin <= 120) return 0.86;
  if (tMin <= 180) return 0.8;
  if (tMin <= 270) return 0.75;
  return 0.7;
}

/**
 * Vitesse (m/s) pour une puissance donnée sur plat (Newton).
 */
export function speedMpsFromPower(
  watts: number,
  massKg: number,
): number {
  if (!(watts > 0) || !(massKg > 0)) return 0;
  const A = 0.5 * RHO * CDA;
  const B = CRR * massKg * G;
  // A v³ + B v − P = 0
  let lo = 2;
  let hi = 25;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const need = A * mid * mid * mid + B * mid;
    if (need > watts) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function powerFromSpeedMps(v: number, massKg: number): number {
  if (!(v > 0)) return 0;
  const A = 0.5 * RHO * CDA;
  const B = CRR * massKg * G;
  return A * v * v * v + B * v;
}

function systemMassKg(riderKg?: number): number {
  const r = riderKg != null && riderKg > 40 ? riderKg : 75;
  return r + BIKE_KG;
}

function predictSecFromFtp(
  km: number,
  ftpWatts: number,
  riderKg?: number,
): number {
  const mass = systemMassKg(riderKg);
  // Itérer : durée ↔ intensité FTP
  let tMin = (km / 35) * 60; // amorce ~35 km/h
  for (let i = 0; i < 8; i++) {
    const intensity = ftpIntensityForDurationMin(tMin);
    const watts = ftpWatts * intensity;
    const v = speedMpsFromPower(watts, mass); // m/s
    if (v <= 0) return 0;
    tMin = (km * 1000) / v / 60;
  }
  return Math.round(tMin * 60);
}

/** Estime FTP depuis un chrono plat connu. */
export function estimateFtpFromBikeTime(
  km: number,
  sec: number,
  riderKg?: number,
): number | null {
  if (!(km > 0) || !(sec > 0)) return null;
  const mass = systemMassKg(riderKg);
  const v = (km * 1000) / sec; // m/s
  const avgWatts = powerFromSpeedMps(v, mass);
  const tMin = sec / 60;
  const intensity = ftpIntensityForDurationMin(tMin);
  if (intensity <= 0) return null;
  const ftp = avgWatts / intensity;
  if (!Number.isFinite(ftp) || ftp < 80 || ftp > 500) return null;
  return Math.round(ftp);
}

/**
 * FTP de départ si aucun chrono / FTP saisi — W/kg typiques coaching amateur.
 * Volume hebdo course sert d’indicateur d’endurance générale.
 */
export function estimateFtpFromProfile(opts: {
  level?: AthleticLevel;
  weeklyKmAvg?: number;
  weightKg?: number;
}): number {
  const weight = opts.weightKg != null && opts.weightKg > 40 ? opts.weightKg : 75;
  let wkg = 2.6;
  if (opts.level === 'debutant') wkg = 2.1;
  if (opts.level === 'confirme') wkg = 3.3;
  const vol = opts.weeklyKmAvg ?? 0;
  if (vol >= 50) wkg += 0.25;
  else if (vol >= 30) wkg += 0.1;
  else if (vol > 0 && vol < 15) wkg -= 0.15;
  return Math.round(Math.min(380, Math.max(120, wkg * weight)));
}

function pickBestBikeRef(
  times: Partial<Record<string, number>>,
): { key: string; km: number; sec: number } | null {
  // Préférer CLM iconiques 20/40 puis distances moyennes
  const prefer = [
    '40k',
    '20k',
    '10k',
    '80k',
    '90k',
    '120k',
    '160k',
    '180k',
    '200k',
  ];
  for (const key of prefer) {
    const def = BIKE_DISTANCES.find((d) => d.key === key);
    const sec = times[key];
    if (def && sec != null && sec > 0) return { key, km: def.km, sec };
  }
  return null;
}

export function predictBikeCatalog(
  times: Partial<Record<string, number>>,
  opts?: { ftpWatts?: number; weightKg?: number },
): BikePredictRow[] {
  const timesCopy = { ...times };
  let ftp = opts?.ftpWatts != null && opts.ftpWatts > 80 ? opts.ftpWatts : null;

  const ref = pickBestBikeRef(timesCopy);
  if (!ftp && ref) {
    ftp = estimateFtpFromBikeTime(ref.km, ref.sec, opts?.weightKg);
  }

  // Seed 40 km depuis FTP seul
  if (!ref && ftp) {
    const sec40 = predictSecFromFtp(40, ftp, opts?.weightKg);
    timesCopy['40k'] = sec40;
  }

  const baseRef = pickBestBikeRef(timesCopy);
  if (!baseRef && !ftp) return [];

  const effectiveFtp =
    ftp ??
    (baseRef
      ? estimateFtpFromBikeTime(baseRef.km, baseRef.sec, opts?.weightKg)
      : null);

  return BIKE_DISTANCES.map((d: SportDistanceDef) => {
    const measured = times[d.key];
    if (measured != null && measured > 0) {
      const kmh = d.km / (measured / 3600);
      return {
        key: d.key,
        distanceLabel: d.label,
        predictedSec: measured,
        paceSecPerKm: Math.round(measured / d.km),
        avgKmh: Math.round(kmh * 10) / 10,
        isMeasured: true,
        method: 'measured' as const,
      };
    }

    let ftpSec: number | null = null;
    if (effectiveFtp) {
      ftpSec = predictSecFromFtp(d.km, effectiveFtp, opts?.weightKg);
    }

    let chronoSec: number | null = null;
    if (baseRef) {
      // Scaling « power-duration » via FTP estimé plutôt que Riegel plat
      const est = estimateFtpFromBikeTime(baseRef.km, baseRef.sec, opts?.weightKg);
      if (est) chronoSec = predictSecFromFtp(d.km, est, opts?.weightKg);
    }

    let predictedSec: number;
    let method: BikePredictRow['method'];
    if (ftpSec != null && chronoSec != null) {
      predictedSec = Math.round(0.55 * ftpSec + 0.45 * chronoSec);
      method = 'blend';
    } else if (ftpSec != null) {
      predictedSec = Math.round(ftpSec);
      method = 'ftp';
    } else if (chronoSec != null) {
      predictedSec = Math.round(chronoSec);
      method = 'chrono';
    } else {
      return {
        key: d.key,
        distanceLabel: d.label,
        predictedSec: 0,
        paceSecPerKm: 0,
        avgKmh: 0,
        isMeasured: false,
      };
    }

    const kmh = d.km / (predictedSec / 3600);
    return {
      key: d.key,
      distanceLabel: d.label,
      predictedSec,
      paceSecPerKm: Math.round(predictedSec / d.km),
      avgKmh: Math.round(kmh * 10) / 10,
      isMeasured: false,
      method,
    };
  }).filter((r) => r.predictedSec > 0 || r.isMeasured);
}

export function predictBikeTimesSecMap(
  times: Partial<Record<string, number>>,
  opts?: { ftpWatts?: number; weightKg?: number },
): Partial<Record<string, number>> {
  const rows = predictBikeCatalog(times, opts);
  const out: Partial<Record<string, number>> = { ...times };
  for (const r of rows) {
    if (out[r.key] == null || !(out[r.key]! > 0)) {
      out[r.key] = r.predictedSec;
    }
  }
  return out;
}

export function bikeSecForDistanceKm(
  times: Partial<Record<string, number>>,
  targetKm: number,
  opts?: { ftpWatts?: number; weightKg?: number },
): number | null {
  const rows = predictBikeCatalog(times, opts);
  const exact = BIKE_DISTANCES.find((d) => Math.abs(d.km - targetKm) < 0.5);
  if (exact) {
    const row = rows.find((r) => r.key === exact.key);
    if (row) return row.predictedSec;
  }
  let ftp = opts?.ftpWatts != null && opts.ftpWatts > 80 ? opts.ftpWatts : null;
  const ref = pickBestBikeRef(times);
  if (!ftp && ref) ftp = estimateFtpFromBikeTime(ref.km, ref.sec, opts?.weightKg);
  if (!ftp) return null;
  return predictSecFromFtp(targetKm, ftp, opts?.weightKg);
}
