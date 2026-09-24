import type { SessionAnalysis, StravaActivity } from '../types/domain';
import { haversineM } from './liveWorkout';

/**
 * Analyse d'une activité terminée (style Garmin Connect) : découpage au km, profil d'altitude,
 * zones de fréquence cardiaque et phrases de coach très courtes.
 * Toute donnée absente est simplement ignorée — jamais de « — » ni de message d'erreur.
 */

export interface KmSplit {
  km: number;
  /** Fraction de km pour le dernier tronçon (1 = km complet). */
  fraction: number;
  paceSecPerKm: number;
  avgHr?: number;
  elevDeltaM?: number;
}

export interface ElevationPoint {
  distKm: number;
  altM: number;
}

export interface HrZoneShare {
  zone: 1 | 2 | 3 | 4 | 5;
  pct: number;
  sec: number;
}

interface Sample {
  distM: number;
  sec: number;
  alt?: number;
  hr?: number;
}

function samplesOf(a: StravaActivity): Sample[] {
  const s = a.streams;
  if (!s || !s.latlng || s.latlng.length < 2 || !s.time || s.time.length !== s.latlng.length) return [];
  const out: Sample[] = [];
  let dist = 0;
  for (let i = 0; i < s.latlng.length; i++) {
    if (i > 0) {
      const p = s.latlng[i - 1]!;
      const q = s.latlng[i]!;
      dist += haversineM({ lat: p[0], lng: p[1] }, { lat: q[0], lng: q[1] });
    }
    const alt = s.altitude?.length === s.latlng.length ? s.altitude[i] : undefined;
    const hr = s.heartrate?.length === s.latlng.length ? s.heartrate[i] : undefined;
    out.push({ distM: dist, sec: s.time[i]!, alt: Number.isFinite(alt) ? alt : undefined, hr: hr && hr > 30 ? hr : undefined });
  }
  return out;
}

/** Allure par kilomètre (dernier tronçon partiel gardé s'il dépasse 300 m). */
export function computeSplits(a: StravaActivity): KmSplit[] {
  const pts = samplesOf(a);
  if (pts.length < 2) return [];
  const splits: KmSplit[] = [];
  let startIdx = 0;
  let markDist = 0;
  let markSec = pts[0]!.sec;
  let nextKm = 1;
  const hrOf = (from: number, to: number): number | undefined => {
    const v = pts.slice(from, to + 1).map((p) => p.hr).filter((x): x is number => x != null);
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : undefined;
  };
  const altOf = (from: number, to: number): number | undefined => {
    const x = pts[from]!.alt;
    const y = pts[to]!.alt;
    return x != null && y != null ? Math.round(y - x) : undefined;
  };
  for (let i = 1; i < pts.length; i++) {
    while (pts[i]!.distM >= nextKm * 1000) {
      const a0 = pts[i - 1]!;
      const b0 = pts[i]!;
      const seg = b0.distM - a0.distM;
      const frac = seg > 0 ? (nextKm * 1000 - a0.distM) / seg : 1;
      const crossSec = a0.sec + frac * (b0.sec - a0.sec);
      const dt = crossSec - markSec;
      if (dt > 0) {
        splits.push({ km: nextKm, fraction: 1, paceSecPerKm: dt, avgHr: hrOf(startIdx, i), elevDeltaM: altOf(startIdx, i) });
      }
      markSec = crossSec;
      markDist = nextKm * 1000;
      startIdx = i;
      nextKm += 1;
    }
  }
  const last = pts[pts.length - 1]!;
  const restM = last.distM - markDist;
  if (restM >= 300 && last.sec > markSec) {
    splits.push({
      km: nextKm,
      fraction: restM / 1000,
      paceSecPerKm: (last.sec - markSec) / (restM / 1000),
      avgHr: hrOf(startIdx, pts.length - 1),
      elevDeltaM: altOf(startIdx, pts.length - 1),
    });
  }
  return splits;
}

/** Profil d'altitude lissé et réduit à ~120 points. */
export function elevationProfile(a: StravaActivity, maxPoints = 120): ElevationPoint[] {
  const pts = samplesOf(a).filter((p) => p.alt != null);
  if (pts.length < 5) return [];
  const step = Math.max(1, Math.floor(pts.length / maxPoints));
  const out: ElevationPoint[] = [];
  for (let i = 0; i < pts.length; i += step) {
    const win = pts.slice(Math.max(0, i - 2), i + 3).map((p) => p.alt!);
    out.push({ distKm: pts[i]!.distM / 1000, altM: win.reduce((s, x) => s + x, 0) / win.length });
  }
  const min = Math.min(...out.map((p) => p.altM));
  const max = Math.max(...out.map((p) => p.altM));
  // Terrain plat / bruit GPS : pas de profil.
  return max - min < 4 ? [] : out;
}

/** Temps passé dans chaque zone de FC (% de la FC max). */
export function hrZoneShares(a: StravaActivity, maxHrOverride?: number): HrZoneShare[] {
  const s = a.streams;
  const hr = s?.heartrate;
  const time = s?.time;
  if (!hr || hr.length < 10 || !time || time.length !== hr.length) return [];
  const maxHr = maxHrOverride ?? a.maxHr ?? Math.max(...hr);
  if (!maxHr || maxHr < 100) return [];
  const secs = [0, 0, 0, 0, 0];
  for (let i = 1; i < hr.length; i++) {
    const v = hr[i]!;
    if (v < 30) continue;
    const dt = Math.min(15, Math.max(0, time[i]! - time[i - 1]!));
    const r = v / maxHr;
    const z = r < 0.6 ? 0 : r < 0.7 ? 1 : r < 0.8 ? 2 : r < 0.9 ? 3 : 4;
    secs[z]! += dt;
  }
  const total = secs.reduce((s, x) => s + x, 0);
  if (total < 30) return [];
  return secs.map((sec, i) => ({ zone: (i + 1) as HrZoneShare['zone'], sec, pct: Math.round((sec / total) * 100) }));
}

function coefVar(xs: number[]): number {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  if (m <= 0) return 0;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v) / m;
}

/**
 * Phrases de coach : très courtes, croisées (plan × allure × FC). Maximum 4.
 * Aucune phrase si la donnée nécessaire manque.
 */
export function buildCoachLines(a: StravaActivity, analysis?: SessionAnalysis | null): string[] {
  const lines: string[] = [];
  const total = analysis?.compliance.total;
  if (total != null) {
    lines.push(total >= 85 ? 'Séance respectée' : total >= 65 ? 'Séance bien suivie' : total >= 40 ? 'Séance partiellement suivie' : 'Séance différente du plan');
  }

  const full = computeSplits(a).filter((s) => s.fraction >= 0.99);
  if (full.length >= 3) {
    const paces = full.map((s) => s.paceSecPerKm);
    const cv = coefVar(paces);
    const mid = Math.floor(paces.length / 2);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const first = avg(paces.slice(0, mid));
    const second = avg(paces.slice(paces.length - mid));
    if (second < first * 0.97) lines.push('Fin de séance plus rapide');
    else if (second > first * 1.06) lines.push('Départ un peu trop rapide');
    else if (cv < 0.04) lines.push('Allure stable');
    else if (cv > 0.1) lines.push('Allure irrégulière');
  }

  const zones = hrZoneShares(a);
  if (zones.length) {
    const hard = zones[3]!.pct + zones[4]!.pct;
    const easy = zones[0]!.pct + zones[1]!.pct;
    if (hard >= 40) lines.push('Effort intense');
    else if (easy >= 70) lines.push('Effort facile, bien maîtrisé');
    // Dérive cardiaque : FC qui monte à allure égale = fatigue / chaleur.
    const hr = a.streams?.heartrate;
    if (hr && hr.length >= 20 && full.length >= 4) {
      const h = Math.floor(hr.length / 2);
      const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const drift = avg(hr.slice(h)) / avg(hr.slice(0, h));
      const paceKeep = full[full.length - 1]!.paceSecPerKm / full[0]!.paceSecPerKm;
      if (drift > 1.06 && paceKeep < 1.03) lines.push('FC en hausse à allure égale');
    }
  }
  return lines.slice(0, 4);
}
