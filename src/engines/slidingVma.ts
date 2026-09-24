/**
 * VMA glissante / Critical Speed course — estimation récente + zones du jour.
 * Décale les allures vers le plus lent si readiness basse.
 */

import type { StravaActivity } from '../types/domain';
import { inferVmaFromActivities, roundVmaKmh, vmaFromRaceTime } from './athleteProfile';
import type { PaceBand, PaceZones } from './paceZones';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function shiftBand(b: PaceBand, addSec: number): PaceBand {
  return {
    minSecPerKm: clamp(Math.round(b.minSecPerKm + addSec), 140, 720),
    maxSecPerKm: clamp(Math.round(b.maxSecPerKm + addSec), 155, 740),
  };
}

/**
 * Estime une VMA « glissante » depuis les meilleures sorties récentes.
 * Blend avec prior si fourni. confidence 0–1.
 */
export function estimateSlidingVmaKmh(
  activities: StravaActivity[],
  priorVma?: number,
): { vmaKmh: number; confidence: number; source: string } {
  const cutoff = Date.now() - 60 * 24 * 3600 * 1000;
  const runs = activities.filter((a) => {
    if (a.sport && a.sport !== 'run') return false;
    if (Date.parse(a.startDate) < cutoff) return false;
    return a.distanceM / 1000 >= 2;
  });

  const samples: { vma: number; weight: number }[] = [];
  for (const a of runs) {
    const km = a.distanceM / 1000;
    const dur = a.movingSec || a.elapsedSec || 0;
    if (dur < 90 || km < 2) continue;
    const pace =
      a.avgPaceSecPerKm && a.avgPaceSecPerKm > 0
        ? a.avgPaceSecPerKm
        : dur / km;
    if (pace < 160 || pace > 650) continue;

    // Efforts « qualité » : 3–12 km à allure plus rapide → poids plus fort
    let weight = 1;
    if (km >= 3 && km <= 12 && pace < 320) weight = 2.2;
    else if (km >= 2.5 && km <= 8) weight = 1.6;
    else if (km > 15) weight = 0.7;

    // Recency : plus récent = plus de poids
    const ageDays = (Date.now() - Date.parse(a.startDate)) / 86_400_000;
    weight *= clamp(1.15 - ageDays / 70, 0.35, 1.15);

    samples.push({ vma: vmaFromRaceTime(km, pace * km), weight });
  }

  if (samples.length === 0) {
    const inferred = inferVmaFromActivities(activities);
    if (inferred) {
      const blended =
        priorVma != null && priorVma >= 8
          ? priorVma * 0.55 + inferred.vmaKmh * 0.45
          : inferred.vmaKmh;
      return {
        vmaKmh: roundVmaKmh(blended),
        confidence: inferred.confidence === 'high' ? 0.55 : inferred.confidence === 'medium' ? 0.4 : 0.25,
        source: 'activités (faible signal)',
      };
    }
    const fallback = priorVma != null && priorVma >= 8 ? priorVma : 14;
    return {
      vmaKmh: roundVmaKmh(fallback),
      confidence: priorVma != null ? 0.35 : 0.15,
      source: priorVma != null ? 'VMA profil' : 'défaut',
    };
  }

  // Top 35 % pondérés (Critical Speed / best recent efforts)
  samples.sort((a, b) => b.vma - a.vma);
  const topN = Math.max(1, Math.ceil(samples.length * 0.35));
  const top = samples.slice(0, topN);
  const wSum = top.reduce((s, x) => s + x.weight, 0);
  const fromActs = top.reduce((s, x) => s + x.vma * x.weight, 0) / wSum;

  let vma = fromActs;
  let source = 'meilleurs efforts récents';
  if (priorVma != null && priorVma >= 8 && priorVma <= 28) {
    vma = priorVma * 0.35 + fromActs * 0.65;
    source = 'VMA glissante (activités + profil)';
  }

  const confidence = clamp(
    0.35 + Math.min(samples.length, 12) * 0.05 + (topN >= 2 ? 0.1 : 0),
    0.2,
    0.95,
  );

  return {
    vmaKmh: roundVmaKmh(vma),
    confidence: Math.round(confidence * 100) / 100,
    source,
  };
}

/**
 * Décale toutes les bandes d’allure selon la readiness du jour.
 * Fatigué → plus lent (sec/km ↑) ; très frais → léger resserrement optionnel.
 */
export function dayAdjustedPaceZones(
  baseZones: PaceZones,
  readinessPct: number,
): PaceZones {
  const ready = clamp(readinessPct, 0, 100);
  // 50 % → +18 s/km ; 30 % → +30 ; 100 % → −4 ; 70 % → 0
  let addSec = 0;
  if (ready < 70) {
    addSec = Math.round(((70 - ready) / 40) * 28);
  } else if (ready > 90) {
    addSec = -4;
  }

  if (addSec === 0) return { ...baseZones };

  const shiftVma =
    addSec > 0
      ? roundVmaKmh(baseZones.vmaKmh * (1 - addSec / 900))
      : roundVmaKmh(baseZones.vmaKmh * (1 + Math.abs(addSec) / 1200));

  return {
    easy: shiftBand(baseZones.easy, addSec),
    long: shiftBand(baseZones.long, addSec),
    warmup: shiftBand(baseZones.warmup, addSec),
    cooldown: shiftBand(baseZones.cooldown, addSec),
    recovery: shiftBand(baseZones.recovery, addSec),
    race: shiftBand(baseZones.race, Math.round(addSec * 0.7)),
    marathon: shiftBand(baseZones.marathon, Math.round(addSec * 0.75)),
    threshold: shiftBand(baseZones.threshold, Math.round(addSec * 0.65)),
    interval: shiftBand(baseZones.interval, Math.round(addSec * 0.55)),
    vmaKmh: shiftVma,
    source: baseZones.source,
  };
}

/** Badge UI si les zones du jour sont personnalisées par readiness. */
export function personalizedZonesBadge(readinessPct: number): string | null {
  const ready = clamp(readinessPct, 0, 100);
  if (ready < 70 || ready > 90) return 'Ajusté pour toi';
  return null;
}
