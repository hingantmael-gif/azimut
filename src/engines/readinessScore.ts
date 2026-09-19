/**
 * Score de readiness multi-composantes (0–100) pour le cockpit.
 * Fonctions pures — pas de React.
 */

import type { AthleteDigitalTwin } from './athleteDigitalTwin';

export type ReadinessBreakdown = {
  total: number;
  components: {
    id: string;
    label: string;
    score: number;
    weight: number;
    weighted: number;
  }[];
  /** Phrase FR pour le cockpit. */
  dominantWhy: string;
  /** Poids après personnalisation (somme ≈ 1). */
  weights: Record<string, number>;
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  hrv: 0.3,
  sleep: 0.2,
  tsb: 0.2,
  muscle: 0.15,
  rpe: 0.1,
  stress: 0.05,
};

const LABELS: Record<string, string> = {
  hrv: 'Variabilité cardiaque',
  sleep: 'Sommeil',
  tsb: 'Forme (TSB)',
  muscle: 'Récup musculaire',
  rpe: 'Effort ressenti',
  stress: 'Stress de vie',
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Score composante VFC : ratio 1 → ~75, amplifié par sensibilité. */
function scoreHrv(ratio: number | null | undefined, hrvSensitivity: number): number {
  if (ratio == null || !Number.isFinite(ratio)) return 55;
  const sens = clamp(hrvSensitivity || 1, 0.5, 2);
  const delta = (ratio - 1) * 60 * sens;
  return clamp(75 + delta, 0, 100);
}

function scoreSleep(
  sleepScore: number | null | undefined,
  sleepDebtHours3d: number | null | undefined,
  sleepDebtSensitivity: number,
): number {
  const sens = clamp(sleepDebtSensitivity || 1, 0.5, 2);
  let base =
    sleepScore != null && Number.isFinite(sleepScore)
      ? clamp(sleepScore, 0, 100)
      : 55;

  if (sleepDebtHours3d != null && Number.isFinite(sleepDebtHours3d)) {
    const debt = Math.max(0, sleepDebtHours3d);
    base -= debt * 6 * sens;
  }
  return clamp(base, 0, 100);
}

/** TSB typique −40…+40 → 0–100. */
function scoreTsb(formTsb: number): number {
  return clamp(50 + formTsb * 1.15, 0, 100);
}

function scoreMuscle(muscleReadinessPct: number): number {
  return clamp(muscleReadinessPct, 0, 100);
}

/** Delta RPE (actuel − prédit) : 0 → 80 ; positif (plus dur) → baisse. */
function scoreRpe(recentRpeDelta: number | null | undefined): number {
  if (recentRpeDelta == null || !Number.isFinite(recentRpeDelta)) return 60;
  return clamp(80 - recentRpeDelta * 18, 0, 100);
}

function scoreStress(lifeStress01: number | null | undefined): number {
  if (lifeStress01 == null || !Number.isFinite(lifeStress01)) return 70;
  return clamp(100 - clamp(lifeStress01, 0, 1) * 85, 0, 100);
}

function personalizedWeights(twin: AthleteDigitalTwin): Record<string, number> {
  const w = { ...DEFAULT_WEIGHTS };
  const conf = twin.modelConfidence ?? 0;
  const sens = twin.response.hrvSensitivity ?? 1;

  // Sensibilité VFC élevée + calibration correcte → un peu plus de poids VFC.
  if (sens >= 1.15 && conf >= 0.35) {
    const bump = 0.04 * Math.min(1, (sens - 1) / 0.5) * Math.min(1, conf / 0.7);
    w.hrv += bump;
    w.sleep -= bump * 0.4;
    w.tsb -= bump * 0.35;
    w.rpe -= bump * 0.25;
  }

  const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(w)) {
    w[k] = round2(w[k] / sum);
  }
  // Renormaliser les arrondis pour somme exacte ~1.
  const sum2 = Object.values(w).reduce((a, b) => a + b, 0);
  if (Math.abs(sum2 - 1) > 1e-6) {
    w.hrv = round2(w.hrv + (1 - sum2));
  }
  return w;
}

function dominantWhyFrom(
  components: ReadinessBreakdown['components'],
  total: number,
): string {
  const sorted = [...components].sort((a, b) => a.score - b.score);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  if (total >= 80) {
    if (best && best.score >= 85) {
      return `${best.label} au top — tu es prêt à performer.`;
    }
    return 'Tous les voyants sont au vert — belle journée pour t’entraîner.';
  }

  if (total >= 60) {
    if (worst && worst.score < 55) {
      return `${worst.label} un peu en retrait — tu peux y aller en douceur.`;
    }
    return 'Readiness correcte — enchaîne sans forcer l’intensité.';
  }

  if (total >= 40) {
    if (worst) {
      return `${worst.label} limite ta fraîcheur — privilégie la récupération active.`;
    }
    return 'Readiness moyenne — allège la séance du jour.';
  }

  if (worst) {
    return `${worst.label} tire le score vers le bas — repos ou mobilité conseillés.`;
  }
  return 'Readiness basse — écoute ton corps aujourd’hui.';
}

export function computeReadinessScore(opts: {
  twin: AthleteDigitalTwin;
  hrvRatio?: number | null;
  sleepScore?: number | null;
  sleepDebtHours3d?: number | null;
  formTsb: number;
  /** % récup musculaire des groupes sollicités aujourd’hui. */
  muscleReadinessPct: number;
  /** Moyenne (RPE réel − prédit) sur ~2 séances. */
  recentRpeDelta?: number | null;
  /** 0 = aucun stress, 1 = élevé. */
  lifeStress01?: number | null;
}): ReadinessBreakdown {
  const weights = personalizedWeights(opts.twin);
  const r = opts.twin.response;

  const scores: Record<string, number> = {
    hrv: scoreHrv(opts.hrvRatio, r.hrvSensitivity),
    sleep: scoreSleep(opts.sleepScore, opts.sleepDebtHours3d, r.sleepDebtSensitivity),
    tsb: scoreTsb(opts.formTsb),
    muscle: scoreMuscle(opts.muscleReadinessPct),
    rpe: scoreRpe(opts.recentRpeDelta),
    stress: scoreStress(opts.lifeStress01),
  };

  const components = (Object.keys(DEFAULT_WEIGHTS) as string[]).map((id) => {
    const weight = weights[id] ?? 0;
    const score = Math.round(scores[id] ?? 0);
    return {
      id,
      label: LABELS[id] ?? id,
      score,
      weight,
      weighted: round2(score * weight),
    };
  });

  const total = clamp(
    Math.round(components.reduce((acc, c) => acc + c.weighted, 0)),
    0,
    100,
  );

  return {
    total,
    components,
    dominantWhy: dominantWhyFrom(components, total),
    weights,
  };
}
