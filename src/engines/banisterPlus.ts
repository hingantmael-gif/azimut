/**
 * Banister personnalisé — mêmes décroissances expo que `updateBanister`,
 * avec τ fitness / fatigue du jumeau numérique.
 */

import type { BanisterState } from '../types/domain';
import type { IndividualResponseProfile } from './athleteDigitalTwin';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Mise à jour Banister avec τ individuels.
 * fitness' = fitness · e^(−1/τf) + load ; idem fatigue.
 */
export function updateBanisterPlus(
  prev: BanisterState,
  load: number,
  date: string,
  response: IndividualResponseProfile,
): BanisterState {
  const tauFit = clamp(response.tauFitnessDays || 42, 20, 56);
  const tauFat = clamp(response.tauFatigueDays || 7, 3, 14);
  const trainingLoad = Math.max(0, load);
  const fitness = prev.fitness * Math.exp(-1 / tauFit) + trainingLoad;
  const fatigue = prev.fatigue * Math.exp(-1 / tauFat) + trainingLoad;
  return {
    date,
    fitness,
    fatigue,
    formTsb: fitness - fatigue,
  };
}

/**
 * Facteur de charge excentrique (dommage musculaire relatif).
 * Trail / descente (D−) et cadence basse augmentent le facteur.
 */
export function eccentricLoadFactor(opts: {
  elevationLossM?: number;
  discipline?: string;
  cadence?: number;
}): number {
  let factor = 1;

  const disc = (opts.discipline ?? '').toLowerCase();
  const isTrail =
    disc.includes('trail') || disc === 'run_trail' || disc === 'running_trail';
  const isRun = disc === 'run' || disc === 'running' || isTrail;

  const loss = Math.max(0, opts.elevationLossM ?? 0);
  if (loss > 0 && (isRun || isTrail)) {
    // ~+8 % par 200 m de D−, plafonné.
    factor += Math.min(0.45, (loss / 200) * 0.08);
    if (isTrail) factor += 0.06;
  } else if (isTrail) {
    factor += 0.08;
  }

  const cadence = opts.cadence;
  if (cadence != null && Number.isFinite(cadence) && isRun) {
    // Cadence basse → plus d’impact / phase excentrique.
    if (cadence < 155) factor += 0.12;
    else if (cadence < 165) factor += 0.05;
    else if (cadence > 180) factor -= 0.03;
  }

  return clamp(Math.round(factor * 1000) / 1000, 0.85, 1.6);
}

/**
 * Forme perçue bayésienne : TSB + VFC + sommeil, pondérés par sensibilités.
 */
export function bayesianPerceivedForm(opts: {
  formTsb: number;
  hrvRatio?: number | null;
  sleepScore?: number | null;
  hrvSensitivity: number;
  sleepDebtSensitivity: number;
}): { score: number; note: string } {
  // TSB typique −40…+40 → score 0–100 centré ~50.
  const tsbScore = clamp(50 + opts.formTsb * 1.1, 0, 100);

  const hrvSens = clamp(opts.hrvSensitivity || 1, 0.5, 2);
  const sleepSens = clamp(opts.sleepDebtSensitivity || 1, 0.5, 2);

  let hrvScore: number | null = null;
  if (opts.hrvRatio != null && Number.isFinite(opts.hrvRatio)) {
    // Ratio 1 → 70 ; écart amplifié par sensibilité.
    const delta = (opts.hrvRatio - 1) * 55 * hrvSens;
    hrvScore = clamp(70 + delta, 0, 100);
  }

  let sleepComponent: number | null = null;
  if (opts.sleepScore != null && Number.isFinite(opts.sleepScore)) {
    const raw = clamp(opts.sleepScore, 0, 100);
    // Sensibilité élevée : un sommeil moyen pèse plus bas.
    sleepComponent = clamp(100 - (100 - raw) * sleepSens, 0, 100);
  }

  // Poids adaptatifs selon signaux présents.
  let wTsb = 0.5;
  let wHrv = hrvScore != null ? 0.3 : 0;
  let wSleep = sleepComponent != null ? 0.2 : 0;
  const wSum = wTsb + wHrv + wSleep;
  wTsb /= wSum;
  wHrv /= wSum;
  wSleep /= wSum;

  const score = Math.round(
    tsbScore * wTsb +
      (hrvScore ?? 0) * wHrv +
      (sleepComponent ?? 0) * wSleep,
  );

  let note: string;
  if (score >= 75) {
    note = 'Forme perçue excellente — fenêtre idéale pour progresser.';
  } else if (score >= 55) {
    note = 'Forme correcte — tu peux enchaîner sans forcer.';
  } else if (score >= 40) {
    note = 'Forme moyenne — privilégie l’endurance facile.';
  } else {
    note = 'Forme basse — récupération prioritaire aujourd’hui.';
  }

  if (hrvScore != null && hrvScore < 45) {
    note = 'VFC en retrait — écoute ton système nerveux.';
  } else if (sleepComponent != null && sleepComponent < 45) {
    note = 'Sommeil insuffisant — la forme ressentie en pâtit.';
  }

  return { score: clamp(score, 0, 100), note };
}

/** Zone ACWR verte personnalisée (min fixe prudent, max depuis le jumeau). */
export function personalizedAcwrGreen(response: IndividualResponseProfile): {
  min: number;
  max: number;
} {
  const max = clamp(response.acwrGreenMax || 1.3, 1.05, 1.5);
  const min = 0.8;
  return { min, max: Math.max(min + 0.15, max) };
}
