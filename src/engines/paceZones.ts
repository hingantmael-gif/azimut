import type { AthleticLevel, StravaActivity } from '../types/domain';
import {
  inferVmaFromActivities,
  levelFromWeeklyKm,
  resolveVma,
  vmaFromRaceTime,
  vmaFromWeeklyKm,
} from './athleteProfile';

export type PaceBand = { minSecPerKm: number; maxSecPerKm: number };

export type PaceZones = {
  easy: PaceBand;
  long: PaceBand;
  /** Échauffement — extrémité basse zone E (59–65 % vVO2max, Daniels) */
  warmup: PaceBand;
  /** Retour au calme — footing très facile (56–62 % vVO2max) */
  cooldown: PaceBand;
  /** Récup active entre répétitions — jog facile (62–68 % vVO2max) */
  recovery: PaceBand;
  /** Allure course objectif (chrono récent) */
  race: PaceBand;
  /** Allure marathon (M) — phase spécifique semi / marathon */
  marathon: PaceBand;
  threshold: PaceBand;
  interval: PaceBand;
  vmaKmh: number;
  /** Comment les allures ont été dérivées (UI / debug) */
  source: 'race' | 'volume' | 'activities' | 'weekly_km' | 'vma_default';
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function bandCenter(b: PaceBand): number {
  return (b.minSecPerKm + b.maxSecPerKm) / 2;
}

/** Marge d’allure (sec/km) : l’échauffement doit être au moins aussi lent que le main + buffer. */
const WARMUP_EASIER_THAN_MAIN_SEC = 10;

function band(center: number, spreadFast = 15, spreadSlow = 20): PaceBand {
  // Plancher bas pour coureurs rapides (ex. 5 km en 17 min ≈ 3'24"/km)
  const mid = clamp(Math.round(center), 150, 720);
  return {
    minSecPerKm: clamp(mid - spreadFast, 140, 700),
    maxSecPerKm: clamp(mid + spreadSlow, 155, 720),
  };
}

/** Allure moyenne (sec/km) pour un % de VMA — vitesse en km/h. */
function paceSecAtVmaPct(vmaKmh: number, pct: number): number {
  const safe = clamp(vmaKmh, 10, 23);
  return 3600 / (safe * (pct / 100));
}

/** Échauffement / retour au calme / récup — dérivés de la zone E (Daniels, Runna, NRC). */
function auxiliaryBandsFromVma(vmaKmh: number): Pick<PaceZones, 'warmup' | 'cooldown' | 'recovery'> {
  const wuFast = paceSecAtVmaPct(vmaKmh, 65);
  const wuSlow = paceSecAtVmaPct(vmaKmh, 59);
  const cdFast = paceSecAtVmaPct(vmaKmh, 62);
  const cdSlow = paceSecAtVmaPct(vmaKmh, 56);
  const recFast = paceSecAtVmaPct(vmaKmh, 68);
  const recSlow = paceSecAtVmaPct(vmaKmh, 62);
  return {
    warmup: {
      minSecPerKm: Math.round(Math.min(wuFast, wuSlow)),
      maxSecPerKm: Math.round(Math.max(wuFast, wuSlow)),
    },
    cooldown: {
      minSecPerKm: Math.round(Math.min(cdFast, cdSlow)),
      maxSecPerKm: Math.round(Math.max(cdFast, cdSlow)),
    },
    recovery: {
      minSecPerKm: Math.round(Math.min(recFast, recSlow)),
      maxSecPerKm: Math.round(Math.max(recFast, recSlow)),
    },
  };
}

function auxiliaryBandsFromEasyLong(easy: PaceBand, long: PaceBand): Pick<PaceZones, 'warmup' | 'cooldown' | 'recovery'> {
  return {
    warmup: {
      minSecPerKm: clamp(Math.round(easy.maxSecPerKm), 160, 700),
      maxSecPerKm: clamp(Math.round(easy.maxSecPerKm + 18), 175, 720),
    },
    cooldown: {
      minSecPerKm: clamp(Math.round(easy.maxSecPerKm + 5), 165, 720),
      maxSecPerKm: clamp(Math.round(long.maxSecPerKm + 10), 180, 720),
    },
    recovery: {
      minSecPerKm: clamp(Math.round(easy.maxSecPerKm), 160, 700),
      maxSecPerKm: clamp(Math.round(easy.maxSecPerKm + 22), 175, 720),
    },
  };
}

/** Zones E / M / T / I inspirées Daniels (59–74 %, ~80 %, ~88 %, ~98–100 % vVO2max). */
function zonesFromVmaKmh(vmaKmh: number, source: PaceZones['source']): PaceZones {
  const vma = Math.round(Math.min(28, Math.max(8, vmaKmh)) * 10) / 10;
  const easyFast = paceSecAtVmaPct(vma, 74);
  const easySlow = paceSecAtVmaPct(vma, 59);
  const easy: PaceBand = {
    minSecPerKm: Math.round(Math.min(easyFast, easySlow)),
    maxSecPerKm: Math.round(Math.max(easyFast, easySlow)),
  };
  const longCenter = paceSecAtVmaPct(vma, 56);
  const marathonCenter = paceSecAtVmaPct(vma, 80);
  const thresholdCenter = paceSecAtVmaPct(vma, 88);
  const intervalCenter = paceSecAtVmaPct(vma, 98);
  const long = band(longCenter, 12, 18);

  return {
    easy,
    long,
    ...auxiliaryBandsFromVma(vma),
    race: band(paceSecAtVmaPct(vma, 92), 5, 7),
    marathon: band(marathonCenter, 8, 10),
    threshold: band(thresholdCenter, 6, 8),
    interval: band(intervalCenter, 5, 7),
    vmaKmh: vma,
    source,
  };
}

/**
 * Allures faciles depuis un chrono récent — facteurs type Daniels
 * (easy ≈ +22–35 % vs allure course selon la distance).
 */
function zonesFromRace(
  distanceKm: number,
  timeSec: number,
): PaceZones {
  const racePace = timeSec / distanceKm;
  const vmaKmh = vmaFromRaceTime(distanceKm, timeSec);

  let easyFastFactor = 1.22;
  let easySlowFactor = 1.34;
  let thresholdFactor = 0.9;
  let intervalFactor = 0.82;

  if (distanceKm <= 5.5) {
    // EF : ~+18–28 % vs allure 5 km (bande resserrée, pas un fossé de 30 s+)
    easyFastFactor = 1.18;
    easySlowFactor = 1.28;
    thresholdFactor = 0.95;
    intervalFactor = 0.88;
  } else if (distanceKm <= 11) {
    easyFastFactor = 1.2;
    easySlowFactor = 1.3;
    thresholdFactor = 0.92;
    intervalFactor = 0.85;
  } else if (distanceKm <= 22) {
    easyFastFactor = 1.14;
    easySlowFactor = 1.24;
    thresholdFactor = 0.9;
    intervalFactor = 0.82;
  } else {
    easyFastFactor = 1.1;
    easySlowFactor = 1.18;
    thresholdFactor = 0.88;
    intervalFactor = 0.8;
  }

  const easyCenter = racePace * ((easyFastFactor + easySlowFactor) / 2);
  const easySpread = Math.round(racePace * ((easySlowFactor - easyFastFactor) / 2));
  const easy: PaceBand = {
    minSecPerKm: Math.round(easyCenter - Math.max(8, easySpread)),
    maxSecPerKm: Math.round(easyCenter + Math.max(8, easySpread)),
  };
  const longCenter = racePace * (easySlowFactor + 0.06);
  const long = band(longCenter, 12, 20);
  const marathonCenter = racePace * (distanceKm >= 21 ? 1.02 : distanceKm >= 10 ? 1.06 : 1.1);
  const thresholdCenter = racePace * thresholdFactor;
  const intervalCenter = racePace * intervalFactor;

  return {
    easy,
    long,
    ...auxiliaryBandsFromEasyLong(easy, long),
    race: band(racePace, 4, 6),
    marathon: band(marathonCenter, 8, 12),
    threshold: band(thresholdCenter, 6, 8),
    interval: band(intervalCenter, 5, 7),
    vmaKmh,
    source: 'race',
  };
}

/**
 * Sans chrono : estime l'allure facile via le volume hebdo
 * (coureurs à 50 km/sem ne s'entraînent pas à 7:30/km en endurance).
 */
function zonesFromWeeklyVolume(
  weeklyKm: number,
  level: AthleticLevel,
): PaceZones {
  const km = clamp(weeklyKm, 8, 120);
  // Centre allure facile : ~7:20 à 15 km/sem → ~4:55 à 70 km/sem
  let center = 498 - km * 2.65;
  if (level === 'confirme') center -= 22;
  if (level === 'debutant') center += 28;
  center = clamp(center, 295, 470);

  const vmaKmh = Math.round(clamp(3600 / (center * 0.68), 11, 21) * 10) / 10;
  const easy = band(center, 16, 22);
  const long = band(center + 14, 14, 20);
  return {
    ...zonesFromVmaKmh(vmaKmh, 'volume'),
    easy,
    long,
    ...auxiliaryBandsFromEasyLong(easy, long),
  };
}

/**
 * Résout les zones d'allure pour les séances générées.
 * Priorité : chrono → activités enregistrées → volume hebdo → profil niveau.
 */
export function resolvePaceZones(opts: {
  level: AthleticLevel;
  weeklyKmAvg?: number;
  recentDistanceKm?: number;
  recentTimeSec?: number;
  vmaKmh?: number;
  activities?: StravaActivity[];
}): PaceZones {
  // Chrono saisi (données sportives / onboarding) en priorité
  if (
    opts.recentDistanceKm &&
    opts.recentDistanceKm > 0 &&
    opts.recentTimeSec &&
    opts.recentTimeSec > 0
  ) {
    return zonesFromRace(opts.recentDistanceKm, opts.recentTimeSec);
  }

  // VMA explicite (données sportives / profil)
  if (opts.vmaKmh && opts.vmaKmh >= 8 && opts.vmaKmh <= 28) {
    return zonesFromVmaKmh(opts.vmaKmh, 'vma_default');
  }

  if (opts.activities?.length) {
    const inferred = inferVmaFromActivities(opts.activities, opts.level);
    if (inferred && inferred.confidence !== 'low') {
      return zonesFromVmaKmh(inferred.vmaKmh, 'activities');
    }
  }

  if (opts.weeklyKmAvg != null && opts.weeklyKmAvg >= 8) {
    const level =
      opts.level ?? levelFromWeeklyKm(opts.weeklyKmAvg);
    return zonesFromWeeklyVolume(opts.weeklyKmAvg, level);
  }

  if (opts.activities?.length) {
    const inferred = inferVmaFromActivities(opts.activities, opts.level);
    if (inferred) {
      return zonesFromVmaKmh(inferred.vmaKmh, 'activities');
    }
  }

  if (opts.weeklyKmAvg != null && opts.weeklyKmAvg >= 5) {
    return zonesFromVmaKmh(
      vmaFromWeeklyKm(opts.weeklyKmAvg, opts.level),
      'weekly_km',
    );
  }

  const vma = resolveVma({
    level: opts.level,
    vmaKmh: opts.vmaKmh,
    recentDistanceKm: opts.recentDistanceKm,
    recentTimeSec: opts.recentTimeSec,
    weeklyKmAvg: opts.weeklyKmAvg,
    activities: opts.activities,
  });
  return zonesFromVmaKmh(vma, 'vma_default');
}

export function describePaceZoneSource(source: PaceZones['source']): string {
  switch (source) {
    case 'race':
      return 'chrono récent';
    case 'activities':
      return 'historique d’activités';
    case 'volume':
      return 'volume hebdomadaire';
    case 'weekly_km':
      return 'volume estimé';
    default:
      return 'profil athlète';
  }
}

/** Bande d'allure pour un type de séance course à pied. */
export function paceBandForRunKind(
  zones: PaceZones,
  kind:
    | 'easy'
    | 'long'
    | 'warmup'
    | 'cooldown'
    | 'recovery'
    | 'race'
    | 'marathon'
    | 'threshold'
    | 'interval',
): PaceBand {
  switch (kind) {
    case 'long':
      return zones.long;
    case 'warmup':
      return zones.warmup;
    case 'cooldown':
      return zones.cooldown;
    case 'recovery':
      return zones.recovery;
    case 'race':
      return zones.race;
    case 'marathon':
      return zones.marathon;
    case 'threshold':
      return zones.threshold;
    case 'interval':
      return zones.interval;
    default:
      return zones.easy;
  }
}

export type RunPaceKind = Parameters<typeof paceBandForRunKind>[1];

/**
 * Ajuste l’échauffement pour qu’il soit toujours moins intense (allure plus lente)
 * que le corps de séance — y compris les sorties longues où le main est plus lent
 * que l’allure « facile » classique.
 */
export function deriveWarmupBand(baseWarmup: PaceBand, mainBand: PaceBand): PaceBand {
  const mainCenter = bandCenter(mainBand);
  const baseCenter = bandCenter(baseWarmup);
  const halfWidth = Math.max((baseWarmup.maxSecPerKm - baseWarmup.minSecPerKm) / 2, 12);
  const targetCenter = Math.max(baseCenter, mainCenter + WARMUP_EASIER_THAN_MAIN_SEC);

  return {
    minSecPerKm: clamp(Math.round(targetCenter - halfWidth), 210, 720),
    maxSecPerKm: clamp(Math.round(targetCenter + halfWidth), 230, 720),
  };
}

/** Échauffement calé sur l’intensité réelle du bloc principal de la séance. */
export function warmupBandForMain(zones: PaceZones, mainKind: RunPaceKind): PaceBand {
  const main = paceBandForRunKind(zones, mainKind);
  const base = paceBandForRunKind(zones, 'warmup');
  return deriveWarmupBand(base, main);
}
