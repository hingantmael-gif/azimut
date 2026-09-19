/**
 * Sentinelle — détection de surcharge d’entraînement (non médicale).
 * Signaux : ACWR, tendance HRV, dérive RPE, hausse de volume, flag blessure.
 * Messages : recommandations d’entraînement uniquement, jamais de diagnostic.
 */

export type SentinelLevel = 'ok' | 'watch' | 'adapt' | 'deload';

export type SentinelReport = {
  level: SentinelLevel;
  /** Score de risque 0–100 (plus haut = plus de prudence) */
  score0to100: number;
  reasons: string[];
  /** Message coach FR, non médical */
  message: string;
  suggestDeloadWeek: boolean;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeSentinel(opts: {
  acwr?: number | null;
  acwrGreenMax: number;
  hrvTrend14d?: number | null;
  /** RPE qui monte à charge égale (positif = dérive) */
  rpeCreep?: number | null;
  weeklyVolumeIncreasePct?: number | null;
  volumeIncreaseMaxPct: number;
  recentInjuryFlag?: boolean;
}): SentinelReport {
  let score = 0;
  const reasons: string[] = [];

  const acwr = opts.acwr;
  if (acwr != null && Number.isFinite(acwr)) {
    const green = Math.max(0.5, opts.acwrGreenMax);
    if (acwr > green * 1.25) {
      score += 38;
      reasons.push(`Charge aiguë élevée (ACWR ${acwr.toFixed(2)}).`);
    } else if (acwr > green) {
      score += 22;
      reasons.push(`Charge un peu au-dessus de la zone verte (ACWR ${acwr.toFixed(2)}).`);
    } else if (acwr < 0.7) {
      score += 6;
      reasons.push('Charge récente basse — reprise progressive conseillée.');
    }
  }

  const hrv = opts.hrvTrend14d;
  if (hrv != null && Number.isFinite(hrv)) {
    // négatif = baisse de VFC / tendance défavorable
    if (hrv <= -0.12) {
      score += 28;
      reasons.push('Tendance récupération (HRV) en baisse sur 14 j.');
    } else if (hrv <= -0.05) {
      score += 14;
      reasons.push('Légère baisse de la tendance HRV récente.');
    }
  }

  const creep = opts.rpeCreep;
  if (creep != null && Number.isFinite(creep)) {
    if (creep >= 1.2) {
      score += 24;
      reasons.push('Effort ressenti en hausse à charge comparable.');
    } else if (creep >= 0.6) {
      score += 12;
      reasons.push('Léger durcissement du ressenti à volume similaire.');
    }
  }

  const volInc = opts.weeklyVolumeIncreasePct;
  const volMax = Math.max(5, opts.volumeIncreaseMaxPct);
  if (volInc != null && Number.isFinite(volInc)) {
    if (volInc > volMax * 1.4) {
      score += 30;
      reasons.push(`Hausse de volume très rapide (+${Math.round(volInc)} %).`);
    } else if (volInc > volMax) {
      score += 16;
      reasons.push(`Hausse de volume au-dessus du seuil (+${Math.round(volInc)} %).`);
    }
  }

  if (opts.recentInjuryFlag) {
    score += 35;
    reasons.push('Signal de gêne récente — prudence sur les intensités.');
  }

  score = clamp(Math.round(score), 0, 100);

  let level: SentinelLevel = 'ok';
  if (score >= 70) level = 'deload';
  else if (score >= 45) level = 'adapt';
  else if (score >= 22) level = 'watch';

  const suggestDeloadWeek = level === 'deload' || (level === 'adapt' && score >= 58);

  const message = messageFor(level, suggestDeloadWeek);

  return {
    level,
    score0to100: score,
    reasons,
    message,
    suggestDeloadWeek,
  };
}

function messageFor(level: SentinelLevel, suggestDeload: boolean): string {
  switch (level) {
    case 'ok':
      return 'Charge dans une zone saine — tu peux suivre le plan.';
    case 'watch':
      return 'À surveiller — garde de la marge et note bien ton ressenti.';
    case 'adapt':
      return suggestDeload
        ? 'Charge élevée — allège cette semaine (volume / intensité) pour mieux digérer.'
        : 'Adapte la séance du jour : un cran plus facile, même si le plan est ambitieux.';
    case 'deload':
      return 'Semaine allégée conseillée — privilégie récupération active et qualité du sommeil.';
  }
}
