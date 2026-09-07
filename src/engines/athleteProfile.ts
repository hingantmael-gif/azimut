import type {
  ActiveProgram,
  AthleticLevel,
  GoalType,
  OnboardingAnswers,
  StravaActivity,
} from '../types/domain';
import {
  BIKE_DISTANCES,
  RUN_DISTANCES,
  SWIM_DISTANCES,
} from '../constants/sportDistances';

/**
 * Profil coureur — déduit hors ligne (pas de choix d'intensité).
 * VMA / niveau dérivés du volume et du chrono de référence.
 */

/** Volume hebdo moyen → niveau (fallback si pas de chrono 5 km) */
export function levelFromWeeklyKm(weeklyKm: number): AthleticLevel {
  if (weeklyKm < 20) return 'debutant';
  if (weeklyKm < 45) return 'intermediaire';
  return 'confirme';
}

/**
 * Niveau unifié : prend le meilleur signal entre chrono et volume hebdo.
 * Un coureur à 50 km/sem + 45 min au 10 km = confirmé, pas intermédiaire.
 */
export function resolveAthleteLevel(opts: {
  weeklyKm: number;
  recentTimeSec?: number;
  recentDistanceKm?: number;
  goalMaxWeeklyKm?: number;
}): AthleticLevel {
  const cappedKm =
    opts.goalMaxWeeklyKm != null
      ? Math.min(opts.weeklyKm, opts.goalMaxWeeklyKm)
      : opts.weeklyKm;
  const fromVolume = levelFromWeeklyKm(cappedKm);

  if (
    !opts.recentDistanceKm ||
    opts.recentDistanceKm <= 0 ||
    !opts.recentTimeSec ||
    opts.recentTimeSec <= 0
  ) {
    return fromVolume;
  }

  const pace = opts.recentTimeSec / opts.recentDistanceKm;
  const eq5k = pace * 5;
  let fromRace: AthleticLevel = 'debutant';
  if (eq5k <= 22 * 60) fromRace = 'confirme';
  else if (eq5k <= 30 * 60) fromRace = 'intermediaire';

  const order: AthleticLevel[] = ['debutant', 'intermediaire', 'confirme'];
  return order[Math.max(order.indexOf(fromVolume), order.indexOf(fromRace))];
}

/**
 * Niveau athlète : le chrono 5 km prime (personnalisation forte).
 * Sinon volume hebdo, borné selon l’objectif pour éviter « 100 km/sem ⇒ confirmé » sur un plan 5k.
 * @deprecated Préférer resolveAthleteLevel
 */
export function levelFromAthleteProfile(opts: {
  weeklyKm: number;
  recentTimeSec?: number;
  recentDistanceKm?: number;
  goalMaxWeeklyKm?: number;
}): AthleticLevel {
  return resolveAthleteLevel(opts);
}

/**
 * Estimation VMA (km/h) à partir d'un chrono de référence.
 * Formules empiriques type tables VMA / Daniels simplifiées.
 */
export function vmaFromRaceTime(distanceKm: number, timeSec: number): number {
  if (distanceKm <= 0 || timeSec <= 0) return 14;
  const paceSecPerKm = timeSec / distanceKm;
  // VMA ≈ allure 5k / 0.90 à 0.95 selon distance
  let factor = 0.92;
  if (distanceKm <= 5.5) factor = 0.95;
  else if (distanceKm <= 11) factor = 0.9;
  else if (distanceKm <= 22) factor = 0.85;
  else factor = 0.8;
  const vmaPace = paceSecPerKm * factor;
  const vmaKmh = 3600 / vmaPace;
  return roundVmaKmh(Math.min(22, Math.max(10, vmaKmh)));
}

/** Une seule décimale — affichage et stockage. */
export function roundVmaKmh(vma: number): number {
  if (!Number.isFinite(vma)) return 14;
  return Math.round(Math.min(28, Math.max(8, vma)) * 10) / 10;
}

/** Affichage VMA toujours à 1 décimale (ex. 15,2). */
export function formatVmaKmh(vma: number): string {
  return roundVmaKmh(vma).toFixed(1).replace('.', ',');
}

export function defaultVmaForLevel(level: AthleticLevel): number {
  if (level === 'debutant') return 12;
  if (level === 'intermediaire') return 15;
  return 18;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** VMA estimée depuis le volume hebdo (même sans chrono). */
export function vmaFromWeeklyKm(weeklyKm: number, level: AthleticLevel): number {
  const km = clamp(weeklyKm, 5, 120);
  let easyPaceSec = 498 - km * 2.65;
  if (level === 'confirme') easyPaceSec -= 22;
  if (level === 'debutant') easyPaceSec += 28;
  easyPaceSec = clamp(easyPaceSec, 295, 470);
  return roundVmaKmh(clamp(3600 / (easyPaceSec * 0.68), 11, 21));
}

export type VmaInference = {
  vmaKmh: number;
  confidence: 'high' | 'medium' | 'low';
};

/**
 * Déduit la VMA depuis les sorties enregistrées (90 derniers jours).
 * Utilise les meilleurs efforts récents ou l'allure médiane des footings.
 */
export function inferVmaFromActivities(
  activities: StravaActivity[],
  level: AthleticLevel = 'intermediaire',
): VmaInference | null {
  const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
  const runs = activities.filter((a) => {
    if (a.sport && a.sport !== 'run') return false;
    if (Date.parse(a.startDate) < cutoff) return false;
    return a.distanceM / 1000 >= 2.5;
  });
  if (runs.length === 0) return null;

  const effortEstimates: number[] = [];
  for (const a of runs) {
    const km = a.distanceM / 1000;
    const pace =
      a.avgPaceSecPerKm && a.avgPaceSecPerKm > 0
        ? a.avgPaceSecPerKm
        : a.movingSec / km;
    if (pace < 180 || pace > 720) continue;
    if (km >= 3) {
      effortEstimates.push(vmaFromRaceTime(km, pace * km));
    }
  }

  if (effortEstimates.length >= 1) {
    effortEstimates.sort((a, b) => b - a);
    const topCount = Math.max(1, Math.ceil(effortEstimates.length * 0.35));
    const top = effortEstimates.slice(0, topCount);
    const avg = top.reduce((sum, v) => sum + v, 0) / top.length;
    return {
      vmaKmh: Math.round(avg * 10) / 10,
      confidence: effortEstimates.length >= 5 ? 'high' : effortEstimates.length >= 2 ? 'medium' : 'low',
    };
  }

  const paces = runs
    .map((a) => {
      const km = a.distanceM / 1000;
      return a.avgPaceSecPerKm && a.avgPaceSecPerKm > 0
        ? a.avgPaceSecPerKm
        : a.movingSec / km;
    })
    .filter((p) => p >= 200 && p <= 600)
    .sort((a, b) => a - b);

  if (paces.length >= 2) {
    const easyPace = paces[Math.floor(paces.length * 0.35)];
    const vma = clamp(3600 / (easyPace * 0.68), 11, 21);
    return {
      vmaKmh: Math.round(vma * 10) / 10,
      confidence: paces.length >= 4 ? 'medium' : 'low',
    };
  }

  return {
    vmaKmh: vmaFromWeeklyKm(level === 'confirme' ? 45 : level === 'intermediaire' ? 25 : 12, level),
    confidence: 'low',
  };
}

/** Parse allure mm:ss ou 5'30 → secondes / km */
export function parsePaceSecPerKm(raw: string): number | null {
  const t = raw.trim().replace(/\/km/gi, '').replace(/"/g, '').replace(/'/g, ':');
  const parts = t.split(':').map((p) => Number(p.trim()));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && parts[0] > 0) return parts[0]; // secondes seules improbable
  return null;
}

/** VMA depuis allure moyenne sur une distance (ex. 5 km) */
export function vmaFromAveragePace(distanceKm: number, paceSecPerKm: number): number {
  const timeSec = paceSecPerKm * distanceKm;
  return vmaFromRaceTime(distanceKm, timeSec);
}

/** Résout VMA : chrono > activités > volume > saisie directe > niveau */
export function resolveVma(opts: {
  level: AthleticLevel;
  vmaKmh?: number;
  recentDistanceKm?: number;
  recentTimeSec?: number;
  averagePaceSecPerKm?: number;
  paceDistanceKm?: number;
  weeklyKmAvg?: number;
  activities?: StravaActivity[];
}): number {
  if (opts.recentDistanceKm && opts.recentTimeSec && opts.recentTimeSec > 0) {
    return vmaFromRaceTime(opts.recentDistanceKm, opts.recentTimeSec);
  }
  if (
    opts.averagePaceSecPerKm &&
    opts.averagePaceSecPerKm > 0 &&
    opts.paceDistanceKm &&
    opts.paceDistanceKm > 0
  ) {
    return vmaFromAveragePace(opts.paceDistanceKm, opts.averagePaceSecPerKm);
  }
  if (opts.activities?.length) {
    const fromActs = inferVmaFromActivities(opts.activities, opts.level);
    if (fromActs) return fromActs.vmaKmh;
  }
  if (opts.weeklyKmAvg != null && opts.weeklyKmAvg >= 5) {
    return vmaFromWeeklyKm(opts.weeklyKmAvg, opts.level);
  }
  if (opts.vmaKmh && opts.vmaKmh > 0) return opts.vmaKmh;
  return defaultVmaForLevel(opts.level);
}

export type ReferenceRace = { label: string; km: number };

export const REFERENCE_RACES: ReferenceRace[] = [
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: 'Semi marathon', km: 21.1 },
  { label: 'Marathon', km: 42.195 },
];

/** Parse "mm:ss" ou "h:mm:ss" → secondes */
export function parseRaceTime(raw: string): number | null {
  const t = raw.trim();
  const parts = t.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function formatRaceTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Volume hebdo suggéré selon objectif (affichage info / défaut) */
export function suggestedWeeklyKm(goal: GoalType, level: AthleticLevel): number {
  const base: Record<GoalType, [number, number, number]> = {
    '5k': [18, 25, 35],
    '10k': [22, 32, 45],
    semi: [32, 45, 58],
    marathon: [42, 55, 72],
    trail: [45, 58, 75],
    triathlon_sprint: [22, 32, 42],
    triathlon_olympique: [30, 42, 55],
    ironman_70_3: [40, 55, 70],
    ironman: [50, 70, 90],
    forme: [18, 25, 35],
    vma: [18, 26, 36],
  };
  const [d, i, c] = base[goal] ?? [20, 32, 45];
  if (level === 'debutant') return d;
  if (level === 'intermediaire') return i;
  return c;
}

export const WEEKLY_KM_PRESETS = [10, 15, 20, 25, 30, 40, 50, 60, 70];

/** Meilleure référence chrono course pour personnaliser les allures (priorité 5k → …). */
export function pickBestRaceReference(
  o?: OnboardingAnswers | null,
): { km: number; timeSec: number; key: string } | null {
  if (!o) return null;
  const times = o.raceTimesSec ?? {};
  for (const row of RUN_DISTANCES) {
    const t = times[row.key as keyof typeof times];
    if (typeof t === 'number' && t > 0) {
      return { km: row.km, timeSec: t, key: row.key };
    }
  }
  if (
    o.recentTimeSec &&
    o.recentTimeSec > 0 &&
    o.recentDistanceKm &&
    o.recentDistanceKm > 0
  ) {
    return {
      km: o.recentDistanceKm,
      timeSec: o.recentTimeSec,
      key: 'recent',
    };
  }
  return null;
}

function kmMatch(a: number, b: number): boolean {
  const tol = Math.max(0.08, Math.min(a, b) * 0.04);
  return Math.abs(a - b) <= tol;
}

/**
 * Chrono déjà connu pour la distance demandée (données sportives, chrono récent,
 * ou meilleur temps d’un programme précédent sur la même distance).
 */
export function lookupStoredChronoSec(opts: {
  onboarding?: OnboardingAnswers | null;
  sport?: string | null;
  distanceKm: number;
  programs?: ActiveProgram[];
}): number | null {
  const { onboarding: o, sport, distanceKm, programs } = opts;
  if (!(distanceKm > 0)) return null;

  if (sport === 'swim') {
    const swim = o?.sportTimesSec?.swim ?? {};
    for (const row of SWIM_DISTANCES) {
      if (!kmMatch(row.km, distanceKm)) continue;
      const t = swim[row.key];
      if (typeof t === 'number' && t > 0) return t;
    }
  } else if (sport === 'bike') {
    const bike = o?.sportTimesSec?.bike ?? {};
    for (const row of BIKE_DISTANCES) {
      if (!kmMatch(row.km, distanceKm)) continue;
      const t = bike[row.key];
      if (typeof t === 'number' && t > 0) return t;
    }
  } else {
    const times = o?.raceTimesSec ?? {};
    for (const row of RUN_DISTANCES) {
      if (!kmMatch(row.km, distanceKm)) continue;
      const t = times[row.key as keyof typeof times];
      if (typeof t === 'number' && t > 0) return t;
    }
  }

  if (
    o?.recentTimeSec &&
    o.recentTimeSec > 0 &&
    o.recentDistanceKm &&
    kmMatch(o.recentDistanceKm, distanceKm)
  ) {
    return o.recentTimeSec;
  }

  for (const p of programs ?? []) {
    const progKm = p.baselineDistanceKm ?? p.targetDistanceKm;
    if (progKm == null || !kmMatch(progKm, distanceKm)) continue;
    if (sport && p.sportCategory && p.sportCategory !== sport) continue;
    const best = p.currentBestTimeSec ?? p.baselineTimeSec;
    if (typeof best === 'number' && best > 0) return best;
  }

  return null;
}

/** Allure natation sec/100 m depuis chronos saisis. */
export function swimPaceSecPer100FromOnboarding(
  o?: OnboardingAnswers | null,
): number | null {
  const swim = o?.sportTimesSec?.swim ?? {};
  if (swim['100m'] && swim['100m'] > 0) return Math.round(swim['100m']);
  if (swim['50m'] && swim['50m'] > 0) return Math.round(swim['50m'] * 2);
  if (swim['200m'] && swim['200m'] > 0) return Math.round(swim['200m'] / 2);
  if (swim['400m'] && swim['400m'] > 0) return Math.round(swim['400m'] / 4);
  return null;
}

export type SportsDataFill = {
  runFilled: number;
  runTotal: number;
  swimFilled: number;
  swimTotal: number;
  bikeFilled: number;
  bikeTotal: number;
  triFilled: number;
  triTotal: number;
  hasVma: boolean;
  hasFtp: boolean;
  disciplinesWithData: number;
};

export function summarizeSportsData(o?: OnboardingAnswers | null): SportsDataFill {
  const race = o?.raceTimesSec ?? {};
  const swim = o?.sportTimesSec?.swim ?? {};
  const bike = o?.sportTimesSec?.bike ?? {};
  const tri = o?.sportTimesSec?.triathlon ?? {};
  const countPos = (obj: Record<string, number | undefined>, keys: string[]) =>
    keys.filter((k) => typeof obj[k] === 'number' && (obj[k] as number) > 0).length;

  const runKeys = RUN_DISTANCES.map((d) => d.key);
  const swimKeys = ['50m', '100m', '200m', '400m', '800m', '1500m', '1k-ow', '2k-ow', '5k-ow'];
  const bikeKeys = BIKE_DISTANCES.map((d) => d.key);
  const triKeys = Object.keys(tri).length
    ? Object.keys(tri)
    : [
        'sprint-swim',
        'sprint-bike',
        'sprint-run',
        'olympic-swim',
        'olympic-bike',
        'olympic-run',
        '70.3-swim',
        '70.3-bike',
        '70.3-run',
        '140.6-swim',
        '140.6-bike',
        '140.6-run',
      ];

  const runFilled = countPos(race as Record<string, number | undefined>, runKeys);
  const swimFilled = countPos(swim, swimKeys);
  const bikeFilled =
    countPos(bike, bikeKeys) + (o?.ftpWatts && o.ftpWatts > 0 ? 1 : 0);
  const triFilled = countPos(tri, triKeys);
  const hasVma = !!(o?.vmaKmh && o.vmaKmh > 0);
  const hasFtp = !!(o?.ftpWatts && o.ftpWatts > 0);

  let disciplinesWithData = 0;
  if (runFilled > 0 || hasVma) disciplinesWithData += 1;
  if (swimFilled > 0) disciplinesWithData += 1;
  if (bikeFilled > 0) disciplinesWithData += 1;
  if (triFilled > 0) disciplinesWithData += 1;

  return {
    runFilled,
    runTotal: runKeys.length,
    swimFilled,
    swimTotal: swimKeys.length,
    bikeFilled,
    bikeTotal: bikeKeys.length + 1,
    triFilled,
    triTotal: 12,
    hasVma,
    hasFtp,
    disciplinesWithData,
  };
}
