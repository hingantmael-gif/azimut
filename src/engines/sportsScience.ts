/**
 * Sciences du sport — TRIMP, Banister/ACWR, fenêtres de récupération,
 * formats triathlon (XS→XXL), répartition zones, échauffement, phases Ironman.
 */

import type { PlannedWorkout, WorkoutStep } from '../types/domain';

/** Charge d'entraînement (Edwards / Banister simplifié) : durée × RPE. */
export function computeTrimp(durationMin: number, rpe: number): number {
  const d = Math.max(0, durationMin);
  const r = Math.min(10, Math.max(1, rpe));
  return Math.round(d * r * 10) / 10;
}

/** Normalise un TRIMP brut vers l'échelle Banister (~0–20 / jour). */
export function trimpToBanisterLoad(trimp: number): number {
  return Math.min(20, Math.max(0.5, trimp / 12));
}

export type DailyLoadPoint = { date: string; load: number };

/**
 * ACWR = charge aiguë (7 j) / charge chronique (28 j).
 * Ratio > 1.5 → risque élevé → forcer repos / Zone 1.
 */
export function computeAcwr(dailyLoads: DailyLoadPoint[], asOfDate: string): {
  acute7: number;
  chronic28: number;
  ratio: number;
  forceRest: boolean;
} {
  const asOf = asOfDate.slice(0, 10);
  const asOfMs = new Date(`${asOf}T12:00:00`).getTime();
  let acute = 0;
  let chronic = 0;
  for (const p of dailyLoads) {
    const ms = new Date(`${p.date.slice(0, 10)}T12:00:00`).getTime();
    const daysAgo = (asOfMs - ms) / 86_400_000;
    if (daysAgo < 0 || daysAgo > 28) continue;
    if (daysAgo <= 7) acute += p.load;
    chronic += p.load;
  }
  const acuteAvg = acute / 7;
  const chronicAvg = chronic / 28;
  const ratio =
    chronicAvg > 0.05 ? acuteAvg / chronicAvg : acuteAvg > 0 ? 2 : 1;
  return {
    acute7: Math.round(acuteAvg * 100) / 100,
    chronic28: Math.round(chronicAvg * 100) / 100,
    ratio: Math.round(ratio * 100) / 100,
    forceRest: ratio > 1.5,
  };
}

export type SessionIntensityKind =
  | 'ef'
  | 'tempo'
  | 'vma'
  | 'hypertrophy'
  | 'max_strength'
  | 'recovery';

/** Fenêtres de récupération minimale (heures) avant ré-engagement. */
export const RECOVERY_WINDOWS_H: Record<
  SessionIntensityKind,
  { minH: number; maxH: number; label: string }
> = {
  ef: { minH: 12, maxH: 24, label: 'Endurance fondamentale (Zone 2)' },
  tempo: { minH: 24, maxH: 36, label: 'Seuil / Tempo (Zone 3–4)' },
  vma: { minH: 48, maxH: 72, label: 'VMA / PMA / Intervalles (Zone 5)' },
  hypertrophy: { minH: 48, maxH: 48, label: 'Musculation hypertrophie/force' },
  max_strength: { minH: 72, maxH: 72, label: 'Force max / neuro' },
  recovery: { minH: 8, maxH: 12, label: 'Récupération active (Zone 1)' },
};

export function classifySessionKind(input: {
  title?: string;
  discipline?: string;
  expectedRpe?: number;
  strengthGoal?: 'fitness' | 'hypertrophy' | 'power';
}): SessionIntensityKind {
  const t = (input.title ?? '').toLowerCase();
  const d = input.discipline ?? '';
  const rpe = input.expectedRpe ?? 5;

  if (d === 'strength' || d === 'ppg') {
    if (input.strengthGoal === 'power' || rpe >= 9 || /force|max|neuro|puissance/.test(t)) {
      return 'max_strength';
    }
    return 'hypertrophy';
  }
  if (/vma|pma|interval|côté|cote|sprint|zone\s*5|qualité/.test(t) || rpe >= 8) {
    return 'vma';
  }
  if (/seuil|tempo|zone\s*[34]|threshold/.test(t) || (rpe >= 6 && rpe < 8)) {
    return 'tempo';
  }
  if (/récup|recup|mobilité|easy|zone\s*1/.test(t) || rpe <= 3) {
    return 'recovery';
  }
  return 'ef';
}

export function minRestHoursForKind(kind: SessionIntensityKind): number {
  return RECOVERY_WINDOWS_H[kind].minH;
}

/** Gap minimum (jours calendaires) entre deux rôles durs. */
export function minDayGapForKind(kind: SessionIntensityKind): number {
  const h = minRestHoursForKind(kind);
  return Math.max(1, Math.ceil(h / 24));
}

// ——— Triathlon formats FFTRI / World Triathlon ———

export type TriathlonFormat = 'XS' | 'S' | 'M' | 'L' | 'XXL';

export type TriathlonDistances = {
  format: TriathlonFormat;
  label: string;
  swimKm: number;
  bikeKm: number;
  runKm: number;
  totalKm: number;
};

export const TRIATHLON_FORMATS: TriathlonDistances[] = [
  { format: 'XS', label: 'XS (super sprint)', swimKm: 0.4, bikeKm: 10, runKm: 2.5, totalKm: 12.9 },
  { format: 'S', label: 'S (sprint)', swimKm: 0.75, bikeKm: 20, runKm: 5, totalKm: 25.75 },
  { format: 'M', label: 'M (olympique)', swimKm: 1.5, bikeKm: 40, runKm: 10, totalKm: 51.5 },
  { format: 'L', label: 'L (half / 70.3)', swimKm: 1.9, bikeKm: 90, runKm: 21.1, totalKm: 113 },
  { format: 'XXL', label: 'XXL (Ironman 140.6)', swimKm: 3.8, bikeKm: 180, runKm: 42.195, totalKm: 225.995 },
];

export function triathlonFormatFromGoal(
  goal?: string,
): TriathlonDistances | undefined {
  if (!goal) return undefined;
  if (goal === 'triathlon_sprint') return TRIATHLON_FORMATS[1];
  if (goal === 'triathlon_olympique') return TRIATHLON_FORMATS[2];
  if (goal === 'ironman_70_3') return TRIATHLON_FORMATS[3];
  if (goal === 'ironman') return TRIATHLON_FORMATS[4];
  return undefined;
}

export function nearestTriathlonFormat(totalKm: number): TriathlonDistances {
  let best = TRIATHLON_FORMATS[0]!;
  let bestDiff = Math.abs(best.totalKm - totalKm);
  for (const f of TRIATHLON_FORMATS) {
    const d = Math.abs(f.totalKm - totalKm);
    if (d < bestDiff) {
      best = f;
      bestDiff = d;
    }
  }
  return best;
}

/** Répartition zones selon distance course (Riegel / polarisation). */
export function zoneMixForRaceDistanceKm(distanceKm: number): {
  z2Pct: number;
  z34Pct: number;
  z5Pct: number;
  label: string;
} {
  if (distanceKm <= 10) {
    return { z2Pct: 80, z34Pct: 0, z5Pct: 20, label: '≤10 km · 80 % Z2 / 20 % Z4-5' };
  }
  if (distanceKm <= 42) {
    return { z2Pct: 85, z34Pct: 15, z5Pct: 0, label: '10–42 km · 85 % Z2 / 15 % Z3-4' };
  }
  return { z2Pct: 90, z34Pct: 10, z5Pct: 0, label: '>42 km · 90 % Z2 / 10 % Z3' };
}

/** Nombre de séances « qualité » hebdo selon mix zones. */
export function qualitySessionsFromZoneMix(
  mix: ReturnType<typeof zoneMixForRaceDistanceKm>,
  availableDays: number,
): number {
  const intensityShare = (mix.z34Pct + mix.z5Pct) / 100;
  if (intensityShare >= 0.18) return Math.min(2, Math.max(1, availableDays - 2));
  if (intensityShare >= 0.1) return Math.min(1, Math.max(0, availableDays - 2));
  return availableDays >= 5 ? 1 : 0;
}

/**
 * Échauffement structuré (mobilité → cardio EF → gammes si ≤21 km).
 */
export function buildRunWarmupProtocol(opts: {
  raceDistanceKm?: number;
  sessionKind?: SessionIntensityKind;
}): WorkoutStep[] {
  const kind = opts.sessionKind ?? 'ef';
  const dist = opts.raceDistanceKm ?? 10;
  const steps: WorkoutStep[] = [
    {
      id: 'wu-mob',
      type: 'warmup',
      label: 'Mobilité ostéo-articulaire (chevilles, hanches) · 5 min',
      endCondition: 'duration',
      durationSec: 5 * 60,
    },
    {
      id: 'wu-cardio',
      type: 'warmup',
      label:
        kind === 'vma' || kind === 'tempo'
          ? 'Cardio progressif Zone 1 → Zone 2 · 12 min'
          : 'Cardio progressif Zone 1 → Zone 2 · 10 min',
      endCondition: 'duration',
      durationSec: (kind === 'vma' || kind === 'tempo' ? 12 : 10) * 60,
    },
  ];
  if (dist <= 21 && (kind === 'vma' || kind === 'tempo' || kind === 'ef')) {
    steps.push({
      id: 'wu-strides',
      type: 'warmup',
      label: 'Gammes / lignes droites · 4 × 50 m accélération progressive',
      endCondition: 'duration',
      durationSec: 4 * 60,
    });
  }
  return steps;
}

// ——— Ironman XXL 24 semaines ———

export type IronmanPhase =
  | 'fonciere'
  | 'specifique'
  | 'affutage'
  | 'competition';

export function ironman24WeekPhase(weekIndex0: number): {
  phase: IronmanPhase;
  label: string;
  volumeFactor: number;
} {
  const w = weekIndex0 + 1;
  if (w <= 8) {
    return {
      phase: 'fonciere',
      label: 'Phase foncière · volume Zone 2 + renforcement',
      volumeFactor: 0.85 + (w / 8) * 0.15,
    };
  }
  if (w <= 16) {
    return {
      phase: 'specifique',
      label: 'Phase spécifique · bricks & nutrition effort long',
      volumeFactor: 1,
    };
  }
  if (w <= 22) {
    const t = (w - 16) / 6;
    return {
      phase: 'affutage',
      label: 'Phase d’affûtage · intensité maintenue, volume −30 à −50 %',
      volumeFactor: 0.7 - t * 0.2,
    };
  }
  return {
    phase: 'competition',
    label: 'Compétition & tapering · glycogène & repos stratégique',
    volumeFactor: 0.45,
  };
}

/** Périodisation explicite 24 sem. Ironman (8 / 8 / 6 / 2). */
export function ironman24Periodization(): Array<
  'developpement_general' | 'travail_specifique' | 'affutage'
> {
  const blocks: Array<'developpement_general' | 'travail_specifique' | 'affutage'> = [];
  for (let i = 0; i < 8; i++) blocks.push('developpement_general');
  for (let i = 0; i < 8; i++) blocks.push('travail_specifique');
  for (let i = 0; i < 6; i++) blocks.push('affutage');
  for (let i = 0; i < 2; i++) blocks.push('affutage');
  return blocks;
}

/** Ajustement 1RM haltères : −10 % à −15 % vs barre/machine (stabilisation). */
export function dumbbellOneRmFactor(level: 'debutant' | 'intermediaire' | 'confirme'): number {
  if (level === 'debutant') return 0.85;
  if (level === 'intermediaire') return 0.88;
  return 0.9;
}

export function formatDumbbellLoadHint(
  oneRmPct: number,
  level: 'debutant' | 'intermediaire' | 'confirme',
): string {
  const adj = Math.round(oneRmPct * dumbbellOneRmFactor(level));
  return `≈ ${adj} % 1RM (haltères −10/−15 % vs barre)`;
}

/** Repos entre séries haltères (tonification / hypertrophie). */
export function dumbbellRestSec(goal: 'fitness' | 'hypertrophy' | 'power'): number {
  if (goal === 'power') return 180;
  if (goal === 'hypertrophy') return 75; // milieu 60–90 s
  return 60;
}

/** Injecte un protocole d'échauffement run si la séance n'en a qu'un générique. */
export function enrichRunWarmup(
  workout: PlannedWorkout,
  raceDistanceKm?: number,
): PlannedWorkout {
  if (workout.discipline !== 'run') return workout;
  const kind = classifySessionKind({
    title: workout.title,
    discipline: workout.discipline,
    expectedRpe: workout.expectedRpe,
  });
  const protocol = buildRunWarmupProtocol({ raceDistanceKm, sessionKind: kind });
  const withoutOldWu = workout.steps.filter((s) => s.type !== 'warmup');
  return {
    ...workout,
    steps: [...protocol, ...withoutOldWu],
  };
}
