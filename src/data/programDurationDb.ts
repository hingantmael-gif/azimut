import type { AthleticLevel, GoalType, PeriodizationBlock } from '../types/domain';
import { ironman24Periodization } from '../engines/sportsScience';

/**
 * Base offline — durées & périodisation par objectif.
 * Aucune requête réseau : Play Store / app autonome.
 */

export type DurationGuide = {
  /** Semaines recommandées selon le niveau */
  recommended: Record<AthleticLevel, number>;
  /** Bornes acceptables (app clamp) */
  minWeeks: number;
  maxWeeks: number;
  /** Pic volume sortie longue (km) en fin de développement */
  peakLongRunKm?: number;
  /** Note coach courte (affichage UI) */
  tip: string;
};

/** Guides par type d'objectif (course & multi-sport) */
export const GOAL_DURATION_DB: Record<GoalType, DurationGuide> = {
  '5k': {
    recommended: { debutant: 8, intermediaire: 6, confirme: 4 },
    minWeeks: 3,
    maxWeeks: 16,
    peakLongRunKm: 12,
    tip: '5 km : VMA + allure spécifique. Sortie longue plafonnée ~12 km (base aérobie, pas une ultra).',
  },
  '10k': {
    recommended: { debutant: 10, intermediaire: 8, confirme: 6 },
    minWeeks: 4,
    maxWeeks: 18,
    peakLongRunKm: 16,
    tip: '10 km : endurance + 1 qualité/sem. Pic longue ~14–16 km.',
  },
  semi: {
    recommended: { debutant: 14, intermediaire: 12, confirme: 10 },
    minWeeks: 6,
    maxWeeks: 24,
    peakLongRunKm: 22,
    tip: 'Semi : longue ≈ 25–30 % du volume hebdo, pic ~20–22 km (pas obligatoire de courir 21 en entraînement).',
  },
  marathon: {
    recommended: { debutant: 20, intermediaire: 16, confirme: 14 },
    minWeeks: 10,
    maxWeeks: 28,
    peakLongRunKm: 32,
    tip: 'Marathon : pic longue 28–32 km (jamais 42). Affûtage 2–3 sem. Volume monté progressivement.',
  },
  trail: {
    recommended: { debutant: 16, intermediaire: 14, confirme: 12 },
    minWeeks: 8,
    maxWeeks: 28,
    peakLongRunKm: 35,
    tip: 'Trail : volume + dénivelé. Pic longue plafonné ; préférer le temps d’effort aux km seuls.',
  },
  triathlon_sprint: {
    recommended: { debutant: 12, intermediaire: 10, confirme: 8 },
    minWeeks: 6,
    maxWeeks: 20,
    peakLongRunKm: 12,
    tip: 'Sprint : 80/20, 1 brick/sem, priorité natation si novice. Pic course plafonnée.',
  },
  triathlon_olympique: {
    recommended: { debutant: 16, intermediaire: 14, confirme: 12 },
    minWeeks: 8,
    maxWeeks: 24,
    peakLongRunKm: 16,
    tip: 'Olympique / 5150 : volume vélo dominant, bricks course après vélo, 1–2 qualités max.',
  },
  ironman_70_3: {
    recommended: { debutant: 18, intermediaire: 16, confirme: 12 },
    minWeeks: 10,
    maxWeeks: 24,
    peakLongRunKm: 22,
    tip: '70.3 : 12–18 sem. Longues vélo (3–4 h) + bricks. Course plafonnée ~18–22 km.',
  },
  ironman: {
    recommended: { debutant: 28, intermediaire: 24, confirme: 20 },
    minWeeks: 16,
    maxWeeks: 36,
    peakLongRunKm: 28,
    tip: '140.6 : 20–28 sem. Pic vélo long, course plafonnée ~28 km (jamais 42). Affûtage 3–4 sem.',
  },
  forme: {
    recommended: { debutant: 8, intermediaire: 8, confirme: 6 },
    minWeeks: 4,
    maxWeeks: 16,
    tip: 'Forme : régularité > intensité. 3–4 séances / semaine.',
  },
  vma: {
    recommended: { debutant: 6, intermediaire: 6, confirme: 4 },
    minWeeks: 3,
    maxWeeks: 12,
    tip: 'Bloc VMA court : fractions + récupération. 4–6 semaines idéales.',
  },
};

/** Durée selon distance libre (km) — base offline */
export function guideForDistanceKm(distanceKm: number): DurationGuide {
  if (distanceKm <= 5) return GOAL_DURATION_DB['5k'];
  if (distanceKm <= 10) return GOAL_DURATION_DB['10k'];
  if (distanceKm <= 25) return GOAL_DURATION_DB.semi;
  if (distanceKm <= 45) return GOAL_DURATION_DB.marathon;
  if (distanceKm <= 70) {
    return {
      recommended: { debutant: 20, intermediaire: 18, confirme: 16 },
      minWeeks: 12,
      maxWeeks: 28,
      peakLongRunKm: Math.min(Math.round(distanceKm * 0.55), 40),
      tip: `Distance ${distanceKm} km : pic sortie ~${Math.min(Math.round(distanceKm * 0.55), 40)} km (pas la distance course entière).`,
    };
  }
  if (distanceKm <= 100) {
    return {
      recommended: { debutant: 24, intermediaire: 20, confirme: 18 },
      minWeeks: 14,
      maxWeeks: 32,
      peakLongRunKm: Math.min(Math.round(distanceKm * 0.5), 50),
      tip: `Ultra ${distanceKm} km : volume progressif, pic longue plafonné ~${Math.min(Math.round(distanceKm * 0.5), 50)} km.`,
    };
  }
  return {
    recommended: { debutant: 28, intermediaire: 24, confirme: 20 },
    minWeeks: 16,
    maxWeeks: 36,
    peakLongRunKm: Math.min(Math.round(distanceKm * 0.4), 55),
    tip: `Très longue distance (${distanceKm} km) : cycle long, décharges régulières, pic longue plafonné.`,
  };
}

/** Durées adaptées au cyclisme (sortie / cyclo / gran fondo / brevet). */
export function guideForBikeDistanceKm(distanceKm: number): DurationGuide {
  if (distanceKm <= 50) {
    return {
      recommended: { debutant: 6, intermediaire: 5, confirme: 4 },
      minWeeks: 3,
      maxWeeks: 12,
      peakLongRunKm: Math.round(distanceKm * 0.95),
      tip: `Sortie ${distanceKm} km : endurance facile + 1 qualité douce. Pic longue ≈ distance objectif.`,
    };
  }
  if (distanceKm <= 90) {
    return {
      recommended: { debutant: 8, intermediaire: 7, confirme: 6 },
      minWeeks: 4,
      maxWeeks: 14,
      peakLongRunKm: Math.round(distanceKm * 0.9),
      tip: `Cyclo ~${distanceKm} km (medio fondo) : monter la longue progressivement, nutrition et cadence.`,
    };
  }
  if (distanceKm <= 130) {
    return {
      recommended: { debutant: 10, intermediaire: 9, confirme: 8 },
      minWeeks: 6,
      maxWeeks: 16,
      peakLongRunKm: Math.round(distanceKm * 0.88),
      tip: `Gran fondo ${distanceKm} km : seuil classique (≥120 km). Pic longue ~85–90 % de l’objectif.`,
    };
  }
  if (distanceKm <= 170) {
    return {
      recommended: { debutant: 12, intermediaire: 11, confirme: 10 },
      minWeeks: 8,
      maxWeeks: 18,
      peakLongRunKm: Math.round(distanceKm * 0.85),
      tip: `Century / gran fondo ${distanceKm} km (~100 miles) : volume aérobie, longues 4–6 h en fin de cycle.`,
    };
  }
  return {
    recommended: { debutant: 16, intermediaire: 14, confirme: 12 },
    minWeeks: 10,
    maxWeeks: 22,
    peakLongRunKm: Math.min(Math.round(distanceKm * 0.8), 180),
    tip: `Brevet / longue distance ${distanceKm} km : ravitaillement, sorties progressives, récupération prioritaire.`,
  };
}

export function getDurationGuide(opts: {
  goal?: GoalType;
  distanceKm?: number;
  /** run (défaut) | bike — évite de traiter 80 km vélo comme un ultra trail */
  sportFamily?: 'run' | 'bike' | 'swim' | 'triathlon' | 'strength' | 'other';
}): DurationGuide {
  if (opts.sportFamily === 'bike' && opts.distanceKm && opts.distanceKm > 0) {
    return guideForBikeDistanceKm(opts.distanceKm);
  }
  if (opts.distanceKm && opts.distanceKm > 0 && !opts.goal) {
    return guideForDistanceKm(opts.distanceKm);
  }
  if (opts.goal) return GOAL_DURATION_DB[opts.goal];
  if (opts.distanceKm) return guideForDistanceKm(opts.distanceKm);
  return GOAL_DURATION_DB.forme;
}

export function recommendedWeeks(guide: DurationGuide, level: AthleticLevel): number {
  return guide.recommended[level];
}

/** Semaines entières restantes jusqu'à une date ISO (AAAA-MM-JJ) */
export function weeksUntilDate(targetIso: string, from = new Date()): number {
  const target = new Date(targetIso + 'T12:00:00');
  const start = new Date(from);
  start.setHours(12, 0, 0, 0);
  const diffMs = target.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 3600 * 1000)));
}

/** Clamp + message si hors bornes */
export function resolveTrainingWeeks(opts: {
  guide: DurationGuide;
  level: AthleticLevel;
  manualWeeks?: number;
  raceDateIso?: string;
}): {
  weeks: number;
  source: 'manual' | 'race_date' | 'recommended';
  warning?: string;
  raceDateIso?: string;
} {
  const { guide, level } = opts;

  if (opts.raceDateIso) {
    const raw = weeksUntilDate(opts.raceDateIso);
    if (raw < 1) {
      return {
        weeks: guide.minWeeks,
        source: 'race_date',
        raceDateIso: opts.raceDateIso,
        warning: 'La date est trop proche ou passée. Durée minimale appliquée.',
      };
    }
    let weeks = Math.min(guide.maxWeeks, Math.max(guide.minWeeks, raw));
    let warning: string | undefined;
    if (raw < guide.minWeeks) {
      warning = `Seulement ${raw} sem. avant la course — minimum recommandé : ${guide.minWeeks}. Plan condensé.`;
      weeks = Math.max(1, raw);
    } else if (raw > guide.maxWeeks) {
      warning = `${raw} sem. disponibles — plafonné à ${guide.maxWeeks} (démarrage plus tard possible).`;
    }
    return { weeks, source: 'race_date', raceDateIso: opts.raceDateIso, warning };
  }

  if (opts.manualWeeks != null && opts.manualWeeks > 0) {
    const weeks = Math.min(guide.maxWeeks, Math.max(guide.minWeeks, Math.round(opts.manualWeeks)));
    let warning: string | undefined;
    if (opts.manualWeeks < guide.minWeeks) {
      warning = `Durée courte : minimum ${guide.minWeeks} semaines pour cet objectif.`;
    } else if (opts.manualWeeks > guide.maxWeeks) {
      warning = `Durée longue : plafonnée à ${guide.maxWeeks} semaines.`;
    }
    return { weeks, source: 'manual', warning };
  }

  return {
    weeks: recommendedWeeks(guide, level),
    source: 'recommended',
  };
}

/**
 * Répartition périodisation selon le nombre de semaines (offline).
 * Ironman 24 sem. : foncière 8 / spécifique 8 / affûtage 6 / compétition 2.
 */
export function periodizationForWeeks(weeks: number): PeriodizationBlock[] {
  if (weeks <= 0) return [];
  if (weeks === 24) {
    return ironman24Periodization();
  }
  if (weeks === 1) return ['affutage'];
  if (weeks === 2) return ['travail_specifique', 'affutage'];
  if (weeks === 3) return ['developpement_general', 'travail_specifique', 'affutage'];

  const taper = weeks >= 16 ? 3 : weeks >= 10 ? 2 : 1;
  const specific = Math.max(1, Math.round((weeks - taper) * 0.45));
  const base = weeks - taper - specific;

  const blocks: PeriodizationBlock[] = [];
  for (let i = 0; i < base; i++) blocks.push('developpement_general');
  for (let i = 0; i < specific; i++) blocks.push('travail_specifique');
  for (let i = 0; i < taper; i++) blocks.push('affutage');
  return blocks;
}

/** Options de semaines rapides pour l'UI (autour de la reco) */
export function weekPresetOptions(guide: DurationGuide, level: AthleticLevel): number[] {
  const rec = recommendedWeeks(guide, level);
  const set = new Set<number>([
    guide.minWeeks,
    Math.max(guide.minWeeks, rec - 2),
    rec,
    Math.min(guide.maxWeeks, rec + 2),
    Math.min(guide.maxWeeks, rec + 4),
    guide.maxWeeks,
  ]);
  return [...set].filter((w) => w >= guide.minWeeks && w <= guide.maxWeeks).sort((a, b) => a - b);
}

export function formatRaceDateFr(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
