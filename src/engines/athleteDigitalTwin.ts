/**
 * Jumeau numérique athlète — profil de réponse individuel +
 * apprentissage incrémental type Kalman (on-device).
 */

import type { AthleticLevel } from '../types/domain';

export type ResponderType = 'high' | 'normal' | 'low';

export type IndividualResponseProfile = {
  /** Constante de temps fitness Banister (jours). Init 42, clamp 20–56. */
  tauFitnessDays: number;
  /** Constante de temps fatigue Banister (jours). Init 7, clamp 3–14. */
  tauFatigueDays: number;
  /** Multiplicateur sur MUSCLE_TAU par groupe musculaire. Init 1. */
  recoveryRateMuscle: Partial<Record<string, number>>;
  /** Plus élevé = la VFC baisse davantage pour une même charge. Init 1. */
  hrvSensitivity: number;
  /** Sensibilité à la dette de sommeil. Init 1. */
  sleepDebtSensitivity: number;
  /** Biais RPE systématique vs HR/puissance ; 0 = neutre ; + = surestime l’effort. */
  rpeBias: number;
  responderType: ResponderType;
  /** Plafond ACWR « vert » personnalisé. Init 1.3. */
  acwrGreenMax: number;
  /** Tolérance d’augmentation hebdo de volume (%). Init 10. */
  volumeIncreaseMaxPct: number;
  /** Nombre de séances ayant contribué à l’apprentissage. */
  calibrationSessions: number;
  lastUpdatedIso?: string;
};

export type AthleteDigitalTwin = {
  response: IndividualResponseProfile;
  /** Confiance 0–1 que le modèle « connaît » l’athlète (~40 séances / 8 semaines). */
  modelConfidence: number;
  /** Insights récents pour célébration UI. */
  insights: string[];
};

export type DigitalTwinOnboardingSeed = {
  ageYears?: number;
  birthDate?: string;
  level?: AthleticLevel;
};

const TAU_FIT_INIT = 42;
const TAU_FIT_MIN = 20;
const TAU_FIT_MAX = 56;
const TAU_FAT_INIT = 7;
const TAU_FAT_MIN = 3;
const TAU_FAT_MAX = 14;
const MAX_INSIGHTS = 8;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function ageFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const d = new Date(birthDate.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 10 && age <= 100 ? age : undefined;
}

function resolveAgeYears(onboarding?: DigitalTwinOnboardingSeed): number | undefined {
  if (onboarding?.ageYears != null && Number.isFinite(onboarding.ageYears)) {
    return clamp(onboarding.ageYears, 10, 100);
  }
  return ageFromBirthDate(onboarding?.birthDate);
}

/** Confiance modèle : 0 → 1 sur ~40 séances. */
export function modelConfidenceFromSessions(n: number): number {
  const sessions = Math.max(0, n);
  return clamp(sessions / 40, 0, 1);
}

/**
 * Mise à jour scalaire Kalman 1D :
 * K = P / (P + R) ; μ' = μ + K(z − μ) ; P' = (1 − K)P.
 */
export function kalmanUpdateScalar(
  prior: number,
  observation: number,
  priorVar: number,
  obsVar: number,
): { mean: number; variance: number } {
  const P = Math.max(1e-9, priorVar);
  const R = Math.max(1e-9, obsVar);
  const K = P / (P + R);
  const mean = prior + K * (observation - prior);
  const variance = (1 - K) * P;
  return { mean, variance };
}

export function defaultIndividualResponse(
  onboarding?: DigitalTwinOnboardingSeed,
): IndividualResponseProfile {
  const age = resolveAgeYears(onboarding);
  const level = onboarding?.level;

  let tauFitness = TAU_FIT_INIT;
  let tauFatigue = TAU_FAT_INIT;
  let acwrGreenMax = 1.3;
  let volumeIncreaseMaxPct = 10;
  let hrvSensitivity = 1;
  let sleepDebtSensitivity = 1;
  let responderType: ResponderType = 'normal';

  // Âge : plus âgé → τ fitness un peu plus long (adaptation plus lente).
  if (age != null) {
    if (age >= 50) {
      tauFitness += 6;
      tauFatigue += 1.5;
      volumeIncreaseMaxPct = 7;
      sleepDebtSensitivity = 1.15;
    } else if (age >= 40) {
      tauFitness += 3;
      tauFatigue += 0.5;
      volumeIncreaseMaxPct = 8;
      sleepDebtSensitivity = 1.08;
    } else if (age < 25) {
      tauFitness -= 2;
      volumeIncreaseMaxPct = 12;
    }
  }

  if (level === 'debutant') {
    tauFitness += 2;
    acwrGreenMax = 1.2;
    volumeIncreaseMaxPct = Math.min(volumeIncreaseMaxPct, 8);
    hrvSensitivity = 1.1;
    responderType = 'low';
  } else if (level === 'confirme') {
    tauFitness -= 2;
    acwrGreenMax = 1.35;
    volumeIncreaseMaxPct = Math.max(volumeIncreaseMaxPct, 12);
    responderType = 'high';
  }

  return {
    tauFitnessDays: clamp(tauFitness, TAU_FIT_MIN, TAU_FIT_MAX),
    tauFatigueDays: clamp(tauFatigue, TAU_FAT_MIN, TAU_FAT_MAX),
    recoveryRateMuscle: {},
    hrvSensitivity: clamp(hrvSensitivity, 0.5, 2),
    sleepDebtSensitivity: clamp(sleepDebtSensitivity, 0.5, 2),
    rpeBias: 0,
    responderType,
    acwrGreenMax: clamp(acwrGreenMax, 1.05, 1.5),
    volumeIncreaseMaxPct: clamp(volumeIncreaseMaxPct, 5, 15),
    calibrationSessions: 0,
  };
}

export function defaultDigitalTwin(
  onboarding?: DigitalTwinOnboardingSeed,
): AthleteDigitalTwin {
  const response = defaultIndividualResponse(onboarding);
  return {
    response,
    modelConfidence: modelConfidenceFromSessions(response.calibrationSessions),
    insights: [],
  };
}

export type SessionLearningObservation = {
  predictedRpe?: number;
  actualRpe?: number;
  predictedFormTsb?: number;
  /** Ratio VFC du jour / baseline (1 = normal). */
  observedHrvRatio?: number;
  sleepHoursDebt?: number;
  /** Ressenti récup vs attendu (−1..1). */
  recoveryFeltVsExpected?: number;
};

function pushInsight(insights: string[], line: string): string[] {
  const next = [line, ...insights.filter((x) => x !== line)];
  return next.slice(0, MAX_INSIGHTS);
}

/**
 * Après séance : compare prédit vs observé (RPE / forme / VFC) → met à jour le profil.
 */
export function learnFromSession(
  twin: AthleteDigitalTwin,
  observation: SessionLearningObservation,
): { twin: AthleteDigitalTwin; insight?: string } {
  const prev = twin.response;
  let tauFitness = prev.tauFitnessDays;
  let tauFatigue = prev.tauFatigueDays;
  let hrvSensitivity = prev.hrvSensitivity;
  let sleepDebtSensitivity = prev.sleepDebtSensitivity;
  let rpeBias = prev.rpeBias;
  let acwrGreenMax = prev.acwrGreenMax;
  let volumeIncreaseMaxPct = prev.volumeIncreaseMaxPct;
  let responderType = prev.responderType;
  let insight: string | undefined;
  let insights = [...twin.insights];

  // RPE : biais systématique + légère adaptation τ fatigue.
  if (
    observation.predictedRpe != null &&
    observation.actualRpe != null &&
    Number.isFinite(observation.predictedRpe) &&
    Number.isFinite(observation.actualRpe)
  ) {
    const delta = observation.actualRpe - observation.predictedRpe;
    const biasUp = kalmanUpdateScalar(rpeBias, delta, 0.35, 1.2);
    rpeBias = clamp(round3(biasUp.mean), -2.5, 2.5);

    if (Math.abs(delta) >= 1.2) {
      // Effort plus dur que prévu → fatigue plus longue (τ↑) ; inverse → τ↓.
      const tauObs = clamp(tauFatigue + delta * 0.35, TAU_FAT_MIN, TAU_FAT_MAX);
      const tauUp = kalmanUpdateScalar(tauFatigue, tauObs, 1.5, 4);
      tauFatigue = clamp(round3(tauUp.mean), TAU_FAT_MIN, TAU_FAT_MAX);
      insight =
        delta > 0
          ? 'Tu notes l’effort plus dur que prévu — on affine ta fatigue.'
          : 'Effort mieux géré que prévu — ta récupération paraît plus vive.';
    }
  }

  // VFC : sensibilité (ratio bas après charge → sensibilité↑).
  if (
    observation.observedHrvRatio != null &&
    Number.isFinite(observation.observedHrvRatio)
  ) {
    const ratio = observation.observedHrvRatio;
    // Observation implicite : sensibilité ≈ 1 / ratio (bornée).
    const impliedSens = clamp(1 / Math.max(0.5, ratio), 0.5, 2);
    const sensUp = kalmanUpdateScalar(hrvSensitivity, impliedSens, 0.08, 0.25);
    hrvSensitivity = clamp(round3(sensUp.mean), 0.5, 2);

    if (!insight && Math.abs(ratio - 1) > 0.12) {
      insight =
        ratio < 1
          ? 'Ta VFC réagit fort à la charge — on pondère davantage ce signal.'
          : 'VFC solide malgré la charge — ton système nerveux récupère bien.';
    }
  }

  // Dette sommeil → sensibilité sommeil.
  if (
    observation.sleepHoursDebt != null &&
    observation.recoveryFeltVsExpected != null &&
    Number.isFinite(observation.sleepHoursDebt) &&
    Number.isFinite(observation.recoveryFeltVsExpected)
  ) {
    const debt = Math.max(0, observation.sleepHoursDebt);
    const felt = clamp(observation.recoveryFeltVsExpected, -1, 1);
    if (debt >= 1) {
      // Dette + ressenti bas → sensibilité↑ ; dette + ressenti haut → sensibilité↓.
      const implied = clamp(1 - felt * 0.35 + debt * 0.08, 0.5, 2);
      const sleepUp = kalmanUpdateScalar(sleepDebtSensitivity, implied, 0.06, 0.22);
      sleepDebtSensitivity = clamp(round3(sleepUp.mean), 0.5, 2);
      if (!insight && felt < -0.25) {
        insight = 'Le manque de sommeil te coûte cher — on le prend plus au sérieux.';
      }
    }
  }

  // Forme Banister prédite vs ressenti récup → τ fitness.
  if (
    observation.predictedFormTsb != null &&
    observation.recoveryFeltVsExpected != null &&
    Number.isFinite(observation.predictedFormTsb) &&
    Number.isFinite(observation.recoveryFeltVsExpected)
  ) {
    const felt = clamp(observation.recoveryFeltVsExpected, -1, 1);
    // Ressenti meilleur que la forme prédite → fitness monte plus vite (τ↓).
    const tauObs = clamp(tauFitness - felt * 4, TAU_FIT_MIN, TAU_FIT_MAX);
    const fitUp = kalmanUpdateScalar(tauFitness, tauObs, 8, 28);
    tauFitness = clamp(round3(fitUp.mean), TAU_FIT_MIN, TAU_FIT_MAX);
  }

  // Tolérance volume / ACWR : si RPE OK et VFC OK → un peu plus agressif.
  const rpeOk =
    observation.predictedRpe != null &&
    observation.actualRpe != null &&
    Math.abs(observation.actualRpe - observation.predictedRpe) < 1;
  const hrvOk =
    observation.observedHrvRatio == null || observation.observedHrvRatio >= 0.92;
  if (rpeOk && hrvOk) {
    acwrGreenMax = clamp(round3(acwrGreenMax + 0.005), 1.05, 1.5);
    volumeIncreaseMaxPct = clamp(round3(volumeIncreaseMaxPct + 0.05), 5, 15);
  } else if (
    observation.actualRpe != null &&
    observation.predictedRpe != null &&
    observation.actualRpe - observation.predictedRpe >= 1.5
  ) {
    acwrGreenMax = clamp(round3(acwrGreenMax - 0.01), 1.05, 1.5);
    volumeIncreaseMaxPct = clamp(round3(volumeIncreaseMaxPct - 0.15), 5, 15);
  }

  // Type de répondeur (heuristique lente).
  if (rpeBias <= -0.6 && hrvSensitivity <= 0.9) responderType = 'high';
  else if (rpeBias >= 0.8 || hrvSensitivity >= 1.25) responderType = 'low';
  else responderType = 'normal';

  const calibrationSessions = prev.calibrationSessions + 1;
  const lastUpdatedIso = new Date().toISOString();
  if (insight) insights = pushInsight(insights, insight);

  const response: IndividualResponseProfile = {
    ...prev,
    tauFitnessDays: tauFitness,
    tauFatigueDays: tauFatigue,
    hrvSensitivity,
    sleepDebtSensitivity,
    rpeBias,
    responderType,
    acwrGreenMax,
    volumeIncreaseMaxPct,
    calibrationSessions,
    lastUpdatedIso,
  };

  return {
    twin: {
      response,
      modelConfidence: modelConfidenceFromSessions(calibrationSessions),
      insights,
    },
    insight,
  };
}
