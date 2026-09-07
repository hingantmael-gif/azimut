import type { OnboardingAnswers, PlannedWorkout, SportDiscipline, StravaActivity } from '../types/domain';
import type { MuscleGroupId } from './muscleRecovery';
import {
  musclesForDiscipline,
  muscleWeightsForSession,
  type DetectedSport,
  type SessionIntensityBand,
} from '../data/muscleExerciseMap';
import { resolvePaceZones, type PaceZones } from './paceZones';
import { formatPace } from './core';

/**
 * Analyse de séance multi-sport (modèle physiologique simplifié) :
 * - Classification sport (nom, allure, vitesse, plan)
 * - Intensité (FC, allure relative, durée)
 * - Facteur excentrique (course / trail) vs concentrique (vélo) vs traction (natation)
 * - Impulse-réponse par groupe musculaire
 *
 * Concepts : Banister / TRIMP, DOMS excentrique (course), recrutement sport-spécifique.
 */

export type { DetectedSport, SessionIntensityBand };

export type SessionAnalysisContext = {
  onboarding?: OnboardingAnswers;
  recentActivities?: StravaActivity[];
};

export interface SessionMuscleAnalysis {
  sport: DetectedSport;
  discipline: SportDiscipline;
  intensityBand: SessionIntensityBand;
  /** 0–1 intensité normalisée */
  intensity01: number;
  /** Charge globale séance (TRIMP-like) */
  sessionTrimp: number;
  /** Facteur dommage musculaire (excentrique) */
  eccentricFactor: number;
  durationH: number;
  distanceKm: number;
  avgPaceSecPerKm?: number;
  avgSpeedKmh?: number;
  avgHr?: number;
  /** Charge 0–100 par muscle avant décroissance temporelle */
  muscleImpulse: Partial<Record<MuscleGroupId, number>>;
  summary: string;
  /** Zone d'intensité course (si profil disponible) */
  paceZoneLabel?: string;
}

const RUN_PACE_EASY = 330;
const RUN_PACE_THRESHOLD = 255;

function resolveRunPaceZones(ctx?: SessionAnalysisContext): PaceZones | null {
  if (!ctx?.onboarding) return null;
  return resolvePaceZones({
    level: ctx.onboarding.level,
    weeklyKmAvg: ctx.onboarding.weeklyKmAvg,
    recentDistanceKm: ctx.onboarding.recentDistanceKm,
    recentTimeSec: ctx.onboarding.recentTimeSec,
    vmaKmh: ctx.onboarding.vmaKmh,
    activities: ctx.recentActivities,
  });
}

function runPaceIntensityFromZones(paceSecPerKm: number, zones: PaceZones): number {
  const easyMid = (zones.easy.minSecPerKm + zones.easy.maxSecPerKm) / 2;
  const thresholdMid = (zones.threshold.minSecPerKm + zones.threshold.maxSecPerKm) / 2;
  const intervalMid = (zones.interval.minSecPerKm + zones.interval.maxSecPerKm) / 2;

  if (paceSecPerKm >= easyMid * 1.12) return 0.28;
  if (paceSecPerKm >= easyMid) return 0.42;
  if (paceSecPerKm >= thresholdMid * 1.05) return 0.58;
  if (paceSecPerKm >= intervalMid * 1.03) return 0.75;
  if (paceSecPerKm >= intervalMid * 0.97) return 0.88;
  return 0.98;
}

function paceZoneLabelFromZones(paceSecPerKm: number, zones: PaceZones): string {
  const easyMid = (zones.easy.minSecPerKm + zones.easy.maxSecPerKm) / 2;
  const thresholdMid = (zones.threshold.minSecPerKm + zones.threshold.maxSecPerKm) / 2;
  const intervalMid = (zones.interval.minSecPerKm + zones.interval.maxSecPerKm) / 2;

  if (paceSecPerKm >= easyMid * 1.1) return 'récupération / footing lent';
  if (paceSecPerKm >= easyMid * 0.98) return 'endurance fondamentale';
  if (paceSecPerKm >= thresholdMid * 1.04) return 'allure tempo';
  if (paceSecPerKm >= intervalMid * 1.02) return 'seuil lactique';
  if (paceSecPerKm >= intervalMid * 0.96) return 'VMA / VO2max';
  return 'allure très haute';
}

export function detectSportFromActivity(
  activity: StravaActivity,
  planned?: PlannedWorkout,
): DetectedSport {
  if (activity.sport) {
    const s = activity.sport;
    if (s === 'run' || s === 'bike' || s === 'swim' || s === 'strength') return s;
  }

  const name = `${activity.name}`.toLowerCase();
  if (/trail|ultra|raid|mountain/.test(name)) return 'trail';
  if (/natation|swim|aqua|crawl|brasse|longueur/.test(name)) return 'swim';
  if (/v[eé]lo|bike|cycl|watt|ftp|home.?trainer|zwift/.test(name)) return 'bike';
  if (/muscul|force|strength|halter|ppg|gainage|crossfit|hiit/.test(name)) return 'strength';
  if (/brick|encha[iî]nement|transition/.test(name)) return 'brick';
  if (/mobilit[eé]|yoga|stretch|souplesse/.test(name)) return 'mobility';
  if (/course|run|footing|fractionn|vma|tempo|semi|marathon|10\s?km|5\s?km/.test(name)) {
    return 'run';
  }

  if (planned?.discipline && planned.discipline !== 'rest') {
    if (planned.discipline === 'run') return 'run';
    if (planned.discipline === 'bike') return 'bike';
    if (planned.discipline === 'swim') return 'swim';
    if (planned.discipline === 'strength') return 'strength';
    if (planned.discipline === 'brick') return 'brick';
    if (planned.discipline === 'ppg') return 'ppg';
    if (planned.discipline === 'mobility') return 'mobility';
  }

  // Heuristiques métriques
  const km = activity.distanceM / 1000;
  const h = Math.max(activity.movingSec / 3600, 1 / 60);
  const speed = km / h;
  const pace = activity.avgPaceSecPerKm ?? (km > 0 ? activity.movingSec / km : undefined);

  if (km > 0.2 && km < 4 && speed < 6 && /eau|piscine|bassin/.test(name)) return 'swim';
  if (km >= 5 && speed >= 18 && speed <= 55) return 'bike';
  if (km >= 1 && pace != null && pace >= 200 && pace <= 600) return 'run';
  if (km < 0.5 && activity.movingSec > 1200) return 'strength';

  return planned?.discipline === 'swim'
    ? 'swim'
    : planned?.discipline === 'bike'
      ? 'bike'
      : 'run';
}

export function toDiscipline(sport: DetectedSport): SportDiscipline {
  switch (sport) {
    case 'trail':
    case 'run':
    case 'other':
      return 'run';
    case 'bike':
      return 'bike';
    case 'swim':
      return 'swim';
    case 'strength':
      return 'strength';
    case 'brick':
      return 'brick';
    case 'ppg':
      return 'ppg';
    case 'mobility':
      return 'mobility';
    default:
      return 'run';
  }
}

function hrIntensity01(avgHr?: number, maxHr?: number): number | undefined {
  if (!avgHr || avgHr < 80) return undefined;
  const max = maxHr && maxHr > avgHr ? maxHr : 190;
  const pct = avgHr / max;
  // Zone 1≈0.25 … Zone 5≈1
  if (pct < 0.6) return 0.25;
  if (pct < 0.7) return 0.4;
  if (pct < 0.8) return 0.58;
  if (pct < 0.88) return 0.78;
  return 0.95;
}

function runPaceIntensity01(paceSecPerKm?: number): number | undefined {
  if (!paceSecPerKm || paceSecPerKm < 150 || paceSecPerKm > 900) return undefined;
  if (paceSecPerKm >= RUN_PACE_EASY + 40) return 0.28; // recovery jog
  if (paceSecPerKm >= RUN_PACE_EASY) return 0.42;
  if (paceSecPerKm >= (RUN_PACE_EASY + RUN_PACE_THRESHOLD) / 2) return 0.58;
  if (paceSecPerKm >= RUN_PACE_THRESHOLD) return 0.75;
  if (paceSecPerKm >= RUN_PACE_THRESHOLD - 25) return 0.88;
  return 0.98;
}

function bikeSpeedIntensity01(speedKmh?: number): number | undefined {
  if (!speedKmh || speedKmh < 8) return undefined;
  if (speedKmh < 22) return 0.35;
  if (speedKmh < 28) return 0.5;
  if (speedKmh < 32) return 0.65;
  if (speedKmh < 36) return 0.8;
  return 0.92;
}

function bandFromIntensity(i: number): SessionIntensityBand {
  if (i < 0.35) return 'recovery';
  if (i < 0.5) return 'easy';
  if (i < 0.65) return 'tempo';
  if (i < 0.8) return 'threshold';
  if (i < 0.92) return 'vo2';
  return 'race';
}

/** Facteur de dommage musculaire : course >> vélo (concentrique) */
function eccentricFactor(sport: DetectedSport, intensity01: number, durationH: number): number {
  const base: Record<DetectedSport, number> = {
    run: 1.35,
    trail: 1.7,
    bike: 0.55,
    swim: 0.7,
    strength: 1.25,
    brick: 1.4,
    ppg: 0.9,
    mobility: 0.35,
    other: 1,
  };
  const longBoost = sport === 'run' || sport === 'trail' ? 1 + Math.min(0.6, durationH / 8) : 1;
  const intBoost = 1 + intensity01 * 0.35;
  return base[sport] * longBoost * intBoost;
}

function volumeFactor(sport: DetectedSport, km: number, durationH: number): number {
  switch (sport) {
    case 'swim':
      // km natation : 2–4 km déjà très costaud
      return Math.min(2.2, 0.55 + km / 2.5 + durationH / 1.8);
    case 'bike':
      return Math.min(2.4, 0.4 + km / 60 + durationH / 3);
    case 'run':
    case 'trail':
      return Math.min(2.6, 0.45 + km / 18 + durationH / 2.5);
    case 'brick':
      return Math.min(2.5, 0.5 + km / 20 + durationH / 2.2);
    case 'strength':
    case 'ppg':
      return Math.min(2, 0.6 + durationH / 1.2);
    case 'mobility':
      return Math.min(1.2, 0.3 + durationH / 2);
    default:
      return Math.min(2, 0.5 + durationH / 2);
  }
}

/**
 * Analyse complète d'une activité → impulses musculaires.
 */
export function analyzeSessionMuscles(
  activity: StravaActivity,
  planned?: PlannedWorkout,
  ctx?: SessionAnalysisContext,
): SessionMuscleAnalysis {
  const sport = detectSportFromActivity(activity, planned);
  const discipline = toDiscipline(sport);
  const distanceKm = activity.distanceM / 1000;
  const durationH = Math.max(activity.movingSec / 3600, 1 / 120);
  const avgPace =
    activity.avgPaceSecPerKm ??
    (distanceKm > 0.05 ? activity.movingSec / distanceKm : undefined);
  const avgSpeedKmh = distanceKm / durationH;

  const hrI = hrIntensity01(activity.avgHr, activity.maxHr);
  const paceZones = resolveRunPaceZones(ctx);
  const paceI =
    sport === 'run' || sport === 'trail' || sport === 'brick'
      ? paceZones && avgPace
        ? runPaceIntensityFromZones(avgPace, paceZones)
        : runPaceIntensity01(avgPace)
      : undefined;
  const bikeI = sport === 'bike' ? bikeSpeedIntensity01(avgSpeedKmh) : undefined;

  // Pondération : FC > allure/vitesse > durée seule
  const parts = [hrI, paceI, bikeI].filter((v): v is number => v != null);
  let intensity01 =
    parts.length > 0
      ? parts.reduce((a, b) => a + b, 0) / parts.length
      : Math.min(0.85, 0.35 + durationH / 4);

  // Ultra / très longue → intensité souvent « easy » mais volume énorme : garder intensité basse-modérée
  if ((sport === 'run' || sport === 'trail') && durationH >= 4 && intensity01 > 0.7) {
    intensity01 = 0.55 + (intensity01 - 0.55) * 0.4;
  }

  const intensityBand = bandFromIntensity(intensity01);
  const ecc = eccentricFactor(sport, intensity01, durationH);
  const vol = volumeFactor(sport, distanceKm, durationH);

  // TRIMP-like : durée (min) × intensité × facteur sport
  const sportTrimpScale: Record<DetectedSport, number> = {
    run: 1,
    trail: 1.15,
    bike: 0.85,
    swim: 1.05,
    strength: 1.1,
    brick: 1.2,
    ppg: 0.9,
    mobility: 0.4,
    other: 0.9,
  };
  const sessionTrimp = Math.min(
    280,
    durationH * 60 * intensity01 * sportTrimpScale[sport] * (0.7 + vol * 0.3),
  );

  const weights = muscleWeightsForSession(sport, intensityBand);
  const muscleImpulse: Partial<Record<MuscleGroupId, number>> = {};
  const baseImpulse = Math.min(100, sessionTrimp * 0.42 * ecc);

  for (const [id, w] of Object.entries(weights)) {
    if (!w || w <= 0) continue;
    // Impulse 0–100 : combinaison volume × intensité × recrutement
    muscleImpulse[id as MuscleGroupId] = Math.min(
      98,
      baseImpulse * w * (0.55 + intensity01 * 0.55),
    );
  }

  // Fallback si map vide
  if (Object.keys(muscleImpulse).length === 0) {
    for (const { id, weight } of musclesForDiscipline(discipline)) {
      muscleImpulse[id] = Math.min(90, baseImpulse * weight);
    }
  }

  const paceZoneLabel =
    paceZones && avgPace ? paceZoneLabelFromZones(avgPace, paceZones) : undefined;

  const summary = buildSummary({
    sport,
    intensityBand,
    durationH,
    distanceKm,
    ecc,
    sessionTrimp,
    avgPace,
    avgHr: activity.avgHr,
    paceZoneLabel,
    vmaKmh: paceZones?.vmaKmh,
  });

  return {
    sport,
    discipline,
    intensityBand,
    intensity01,
    sessionTrimp: Math.round(sessionTrimp),
    eccentricFactor: Math.round(ecc * 100) / 100,
    durationH,
    distanceKm,
    avgPaceSecPerKm: avgPace,
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
    avgHr: activity.avgHr,
    muscleImpulse,
    summary,
    paceZoneLabel,
  };
}

function buildSummary(o: {
  sport: DetectedSport;
  intensityBand: SessionIntensityBand;
  durationH: number;
  distanceKm: number;
  ecc: number;
  sessionTrimp: number;
  avgPace?: number;
  avgHr?: number;
  paceZoneLabel?: string;
  vmaKmh?: number;
}): string {
  const sportLabel: Record<DetectedSport, string> = {
    run: 'Course à pied',
    trail: 'Trail / ultra',
    bike: 'Cyclisme',
    swim: 'Natation',
    strength: 'Musculation',
    brick: 'Brick / enchaînement',
    ppg: 'PPG',
    mobility: 'Mobilité',
    other: 'Séance',
  };
  const bandLabel: Record<SessionIntensityBand, string> = {
    recovery: 'récupération',
    easy: 'endurance fondamentale',
    tempo: 'tempo',
    threshold: 'seuil',
    vo2: 'VO2 / intensité haute',
    race: 'allure course',
  };
  const parts = [
    `${sportLabel[o.sport]} · ${bandLabel[o.intensityBand]}`,
    `${o.distanceKm.toFixed(1)} km en ${(o.durationH * 60).toFixed(0)} min`,
  ];
  if (o.avgPace && o.paceZoneLabel) {
    parts.push(`${formatPace(o.avgPace)}/km · ${o.paceZoneLabel}`);
  }
  if (o.vmaKmh) {
    parts.push(`VMA profil ${o.vmaKmh} km/h`);
  }
  if (o.avgHr) parts.push(`FC moy. ${o.avgHr}`);
  if (o.ecc >= 1.3) {
    parts.push('forte composante excentrique (DOMS possible 24–72 h)');
  } else if (o.ecc <= 0.65) {
    parts.push('charge surtout métabolique (récup musculaire plus rapide)');
  }
  parts.push(`charge séance ${Math.round(o.sessionTrimp)}`);
  return parts.join(' · ');
}
