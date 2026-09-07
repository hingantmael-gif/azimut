/**
 * Bibliothèque de séances course — inspirée Runna / Nike Run Club / Daniels / Runix.
 * Rotation par phase et semaine (VMA → seuil → fartlek → cruise → allure 5 km).
 */

import type { AthleticLevel, GoalType, PeriodizationBlock, PlannedWorkout, WorkoutStep } from '../types/domain';
import { paceBandForRunKind, type PaceZones, type RunPaceKind, warmupBandForMain } from './paceZones';

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function paceTarget(b: { minSecPerKm: number; maxSecPerKm: number }) {
  return { type: 'pace' as const, minSecPerKm: b.minSecPerKm, maxSecPerKm: b.maxSecPerKm };
}

function warmupStep(
  id: string,
  zones: PaceZones,
  opts: {
    durationSec?: number;
    distanceMeters?: number;
    label: string;
    /** Intensité du bloc principal — l’échauffement sera toujours plus facile. */
    mainKind: RunPaceKind;
  },
): WorkoutStep {
  const p = warmupBandForMain(zones, opts.mainKind);
  return {
    id,
    type: 'warmup',
    label: opts.label,
    endCondition: opts.distanceMeters ? 'distance' : 'duration',
    durationSec: opts.durationSec,
    distanceMeters: opts.distanceMeters,
    target: paceTarget(p),
  };
}

function cooldownStep(
  id: string,
  zones: PaceZones,
  durationSec: number,
  label = 'Retour au calme · footing très facile',
): WorkoutStep {
  const p = paceBandForRunKind(zones, 'cooldown');
  return {
    id,
    type: 'cooldown',
    label,
    endCondition: 'duration',
    durationSec,
    target: paceTarget(p),
  };
}

function recoveryStep(
  id: string,
  zones: PaceZones,
  durationSec: number,
  label: string,
  repeat?: number,
): WorkoutStep {
  const p = paceBandForRunKind(zones, 'recovery');
  return {
    id,
    type: 'rest',
    label,
    endCondition: 'duration',
    durationSec,
    repeat,
    target: paceTarget(p),
  };
}

function finalize(
  partial: Omit<PlannedWorkout, 'plannedDurationSec' | 'steps'> & {
    plannedDurationSec?: number;
  },
  steps: WorkoutStep[],
): PlannedWorkout {
  const duration = steps.reduce((sum, st) => {
    let sec = st.durationSec ?? 0;
    if (!sec && st.distanceMeters) sec = (st.distanceMeters / 1000) * 330;
    return sum + sec * (st.repeat ?? 1);
  }, 0);
  return {
    ...partial,
    plannedDurationSec: clamp(Math.round(duration), 300, 6 * 3600),
    steps,
  };
}

export type RunSessionContext = {
  date: string;
  zones: PaceZones;
  level: AthleticLevel;
  load: number;
  block: PeriodizationBlock;
  weekIndex: number;
  goal?: GoalType;
  isDeload?: boolean;
  qualitySlot?: 0 | 1;
};

/** Sortie longue endurance — allure facile/longue constante. */
export function makeLongRunEasy(ctx: RunSessionContext, distanceM: number): PlannedWorkout {
  const p = paceBandForRunKind(ctx.zones, 'long');
  const dist = Math.round(distanceM);
  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 10 * 60,
      label: 'Échauffement · footing très facile',
      mainKind: 'long',
    }),
    {
      id: 'main',
      type: 'active',
      label: `Sortie longue · ${(dist / 1000).toFixed(1).replace('.', ',')} km`,
      endCondition: 'distance',
      distanceMeters: dist,
      target: paceTarget(p),
    },
    cooldownStep('cd', ctx.zones, 5 * 60),
  ];
  return finalize(
    {
      id: `w-${ctx.date}-run-long`,
      title: 'Sortie longue',
      date: ctx.date,
      discipline: 'run',
      plannedDistanceM: dist,
      expectedRpe: 4,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Sortie longue — progression NRC : facile puis accélération légère sur le dernier tiers. */
export function makeProgressionLongRun(
  ctx: RunSessionContext,
  distanceM: number,
): PlannedWorkout {
  const easy = paceBandForRunKind(ctx.zones, 'long');
  const moderate = paceBandForRunKind(ctx.zones, 'easy');
  const dist = Math.round(distanceM);
  const mainEasy = Math.round(dist * 0.65);
  const mainProg = dist - mainEasy;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 10 * 60,
      label: 'Échauffement · footing très facile',
      mainKind: 'easy',
    }),
    {
      id: 'easy',
      type: 'active',
      label: `Endurance facile · ${(mainEasy / 1000).toFixed(1).replace('.', ',')} km`,
      endCondition: 'distance',
      distanceMeters: mainEasy,
      target: paceTarget(easy),
    },
    {
      id: 'prog',
      type: 'active',
      label: `Progression · ${(mainProg / 1000).toFixed(1).replace('.', ',')} km (accélère progressivement)`,
      endCondition: 'distance',
      distanceMeters: mainProg,
      target: paceTarget(moderate),
    },
    cooldownStep('cd', ctx.zones, 5 * 60),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-long-prog`,
      title: 'Sortie longue progressive',
      date: ctx.date,
      discipline: 'run',
      plannedDistanceM: dist,
      expectedRpe: 4,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Footing récup — zone facile sur tout le corps de séance. */
export function makeRecoveryRun(ctx: RunSessionContext, distanceM: number): PlannedWorkout {
  const p = paceBandForRunKind(ctx.zones, 'easy');
  const dist = Math.round(distanceM);
  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 8 * 60,
      label: 'Échauffement · footing très facile',
      mainKind: 'easy',
    }),
    {
      id: 'main',
      type: 'active',
      label: `Récup active · ${(dist / 1000).toFixed(1).replace('.', ',')} km`,
      endCondition: 'distance',
      distanceMeters: dist,
      target: paceTarget(p),
    },
    cooldownStep('cd', ctx.zones, 5 * 60),
  ];
  return finalize(
    {
      id: `w-${ctx.date}-run-recovery`,
      title: 'Footing récupération',
      date: ctx.date,
      discipline: 'run',
      plannedDistanceM: dist,
      expectedRpe: 3,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Fractionné VMA — reps courtes ou longues selon la semaine. */
export function makeVmaIntervals(ctx: RunSessionContext): PlannedWorkout {
  const p = paceBandForRunKind(ctx.zones, 'interval');
  const variant = ctx.weekIndex % 3;
  let reps: number;
  let repM: number;
  let restSec: number;
  let title: string;

  if (ctx.isDeload) {
    reps = ctx.level === 'debutant' ? 3 : 4;
    repM = 400;
    restSec = 90;
    title = 'VMA allégée (décharge)';
  } else if (variant === 0) {
    reps = ctx.level === 'debutant' ? 6 : ctx.level === 'intermediaire' ? 8 : 10;
    repM = 400;
    restSec = 75;
    title = 'Fractionné court 400 m';
  } else if (variant === 1) {
    reps = ctx.level === 'debutant' ? 4 : ctx.level === 'intermediaire' ? 5 : 6;
    repM = 800;
    restSec = 90;
    title = 'Fractionné 800 m VMA';
  } else {
    reps = ctx.level === 'debutant' ? 3 : 4;
    repM = 1000;
    restSec = 120;
    title = 'Fractionné 1000 m VMA';
  }

  const loadScale = ctx.isDeload ? 0.7 : clamp(0.85 + ctx.load * 0.15, 0.85, 1.1);
  reps = Math.max(3, Math.round(reps * loadScale));

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 15 * 60,
      label: 'Échauffement 15 min · footing facile + 4 accélérations courtes',
      mainKind: 'interval',
    }),
    {
      id: 'rep',
      type: 'active',
      label: `${reps} × ${repM} m @ VMA`,
      endCondition: 'distance',
      distanceMeters: repM,
      repeat: reps,
      target: paceTarget(p),
    },
    recoveryStep('rest', ctx.zones, restSec, 'Récupération active · footing facile', reps),
    cooldownStep('cd', ctx.zones, 10 * 60, 'Retour au calme 10 min · footing très facile'),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-vma`,
      title,
      date: ctx.date,
      discipline: 'run',
      plannedDistanceM: Math.round(2500 + reps * repM),
      expectedRpe: ctx.isDeload ? 6 : 8,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Cruise intervals Daniels — ex. 3 × 8 min seuil, récup courte. */
export function makeCruiseThreshold(ctx: RunSessionContext): PlannedWorkout {
  const p = paceBandForRunKind(ctx.zones, 'threshold');
  const reps = ctx.isDeload
    ? 2
    : ctx.level === 'debutant'
      ? 2
      : ctx.level === 'intermediaire'
        ? 3
        : 4;
  const repMin = ctx.isDeload ? 5 : ctx.weekIndex % 2 === 0 ? 8 : 5;
  const repSec = repMin * 60;
  const restSec = repMin >= 8 ? 90 : 120;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 15 * 60,
      label: 'Échauffement progressif 15 min · footing facile',
      mainKind: 'threshold',
    }),
    {
      id: 'rep',
      type: 'active',
      label: `${reps} × ${repMin} min au seuil (cruise)`,
      endCondition: 'duration',
      durationSec: repSec,
      repeat: reps,
      target: paceTarget(p),
    },
    recoveryStep(
      'rest',
      ctx.zones,
      restSec,
      `Récup ${Math.round(restSec / 60)} min · footing facile`,
      reps,
    ),
    cooldownStep('cd', ctx.zones, 10 * 60, 'Retour au calme 10 min · footing très facile'),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-cruise`,
      title: 'Seuil · cruise intervals',
      date: ctx.date,
      discipline: 'run',
      expectedRpe: ctx.isDeload ? 6 : 7,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Tempo continu — bloc unique au seuil (NRC Tempo Run). */
export function makeTempoContinuous(ctx: RunSessionContext): PlannedWorkout {
  const p = paceBandForRunKind(ctx.zones, 'threshold');
  const tempoMin = ctx.isDeload
    ? 12
    : ctx.level === 'debutant'
      ? 15
      : ctx.level === 'intermediaire'
        ? 20
        : 25;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      distanceMeters: 2000,
      label: 'Échauffement 2 km · footing facile',
      mainKind: 'threshold',
    }),
    {
      id: 'tempo',
      type: 'active',
      label: `Tempo continu · ${tempoMin} min au seuil`,
      endCondition: 'duration',
      durationSec: tempoMin * 60,
      target: paceTarget(p),
    },
    cooldownStep('cd', ctx.zones, 10 * 60, 'Retour au calme 10 min · footing très facile'),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-tempo`,
      title: 'Tempo continu',
      date: ctx.date,
      discipline: 'run',
      expectedRpe: ctx.isDeload ? 6 : 7,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Fartlek — surges alternées facile/rapide (NRC). */
export function makeFartlek(ctx: RunSessionContext): PlannedWorkout {
  const easy = paceBandForRunKind(ctx.zones, 'easy');
  const fast = paceBandForRunKind(ctx.zones, 'interval');
  const surges = ctx.isDeload ? 4 : ctx.level === 'debutant' ? 6 : 8;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 10 * 60,
      label: 'Échauffement 10 min · footing facile',
      mainKind: 'interval',
    }),
    {
      id: 'easy1',
      type: 'active',
      label: 'Fond facile 8 min',
      endCondition: 'duration',
      durationSec: 8 * 60,
      target: paceTarget(easy),
    },
  ];

  for (let i = 0; i < surges; i++) {
    steps.push({
      id: `surge-${i}`,
      type: 'active',
      label: `Accélération ${i + 1} · 1 min rapide`,
      endCondition: 'duration',
      durationSec: 60,
      target: paceTarget(fast),
    });
    steps.push({
      id: `rec-${i}`,
      type: 'rest',
      label: 'Récup facile 2 min · footing facile',
      endCondition: 'duration',
      durationSec: 120,
      target: paceTarget(paceBandForRunKind(ctx.zones, 'recovery')),
    });
  }

  steps.push(
    {
      id: 'easy2',
      type: 'active',
      label: 'Retour facile 8 min',
      endCondition: 'duration',
      durationSec: 8 * 60,
      target: paceTarget(easy),
    },
    cooldownStep('cd', ctx.zones, 5 * 60),
  );

  return finalize(
    {
      id: `w-${ctx.date}-run-fartlek`,
      title: 'Fartlek · jeu d’allures',
      date: ctx.date,
      discipline: 'run',
      expectedRpe: ctx.isDeload ? 5 : 7,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Fractionné allure 5 km (spécifique) — rotation type Runix, 1×/semaine max via pickQuality.
 * Allures = zones « race » (5 km) dérivées du profil (VMA / chrono) → 4'/km ≠ 7'/km.
 */
export function makeFiveKPaceIntervals(ctx: RunSessionContext): PlannedWorkout {
  const pace = paceBandForRunKind(ctx.zones, 'race');
  const variant = ctx.weekIndex % 3;
  const wuM =
    ctx.level === 'debutant' ? 2500 : ctx.level === 'intermediaire' ? 3500 : 4000;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      distanceMeters: wuM,
      label: `Échauffement ${(wuM / 1000).toFixed(1).replace('.', ',')} km · footing facile`,
      mainKind: 'race',
    }),
  ];

  let title: string;
  let plannedExtraM = 0;

  if (ctx.isDeload || variant === 0) {
    // 5' + 4' + 3' allure 5K, récup 3' (allégé en décharge : 4'+3'+2')
    const blocks = ctx.isDeload
      ? [
          { min: 4, id: 'b1' },
          { min: 3, id: 'b2' },
          { min: 2, id: 'b3' },
        ]
      : [
          { min: 5, id: 'b1' },
          { min: 4, id: 'b2' },
          { min: 3, id: 'b3' },
        ];
    title = ctx.isDeload
      ? 'Allure 5 km · pyramide courte (décharge)'
      : 'Allure 5 km · 5′ / 4′ / 3′';
    blocks.forEach((b, i) => {
      steps.push({
        id: b.id,
        type: 'active',
        label: `${b.min} min à l’allure visée 5 km`,
        endCondition: 'duration',
        durationSec: b.min * 60,
        target: paceTarget(pace),
      });
      if (i < blocks.length - 1) {
        steps.push(
          recoveryStep(`r${i}`, ctx.zones, 180, 'Récupération 3 min · footing facile'),
        );
      }
    });
  } else if (variant === 1) {
    // 4 × 1000 m piste, récup 2'
    const reps =
      ctx.level === 'debutant' ? 3 : ctx.level === 'intermediaire' ? 4 : 5;
    const repM = 1000;
    title = `Allure 5 km · ${reps} × 1000 m`;
    plannedExtraM = reps * repM;
    steps.push({
      id: 'rep',
      type: 'active',
      label: `${reps} × 1000 m @ allure 5 km (piste · ~2,5 tours)`,
      endCondition: 'distance',
      distanceMeters: repM,
      repeat: reps,
      target: paceTarget(pace),
    });
    steps.push(
      recoveryStep('rest', ctx.zones, 120, 'Récupération 2 min entre les 1000 m', reps),
    );
  } else {
    // 10 × 400 m, récup 1' — volume adapté au niveau
    const reps =
      ctx.level === 'debutant' ? 6 : ctx.level === 'intermediaire' ? 8 : 10;
    const repM = 400;
    title = `Allure 5 km · ${reps} × 400 m`;
    plannedExtraM = reps * repM;
    steps.push({
      id: 'rep',
      type: 'active',
      label: `${reps} × 400 m @ allure 5 km (piste · 1 tour)`,
      endCondition: 'distance',
      distanceMeters: repM,
      repeat: reps,
      target: paceTarget(pace),
    });
    steps.push(
      recoveryStep('rest', ctx.zones, 60, 'Récupération 1 min entre les 400 m', reps),
    );
  }

  steps.push(
    cooldownStep(
      'cd',
      ctx.zones,
      10 * 60,
      'Retour au calme 10 min · footing très facile',
    ),
  );

  return finalize(
    {
      id: `w-${ctx.date}-run-5k-spec`,
      title,
      date: ctx.date,
      discipline: 'run',
      plannedDistanceM: Math.round(wuM + plannedExtraM + 1500),
      expectedRpe: ctx.isDeload ? 6 : 8,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Blocs allure objectif — 5k / 10k / semi / marathon (phase spécifique). */
export function makeGoalPaceBlocks(ctx: RunSessionContext): PlannedWorkout {
  const isShort = ctx.goal === '5k' || ctx.goal === '10k' || ctx.goal === 'vma';
  const paceBand = paceBandForRunKind(ctx.zones, isShort ? 'race' : 'marathon');
  const reps = ctx.isDeload ? 2 : ctx.level === 'debutant' ? 3 : 4;
  const repMin =
    ctx.goal === '5k' || ctx.goal === 'vma'
      ? ctx.level === 'debutant'
        ? 3
        : 4
      : ctx.level === 'debutant'
        ? 6
        : 8;

  const goalLabel =
    ctx.goal === '5k' || ctx.goal === 'vma'
      ? '5 km'
      : ctx.goal === '10k'
        ? '10 km'
        : ctx.goal === 'semi'
          ? 'semi'
          : 'marathon';

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 15 * 60,
      label: 'Échauffement 15 min · footing facile',
      mainKind: isShort ? 'race' : 'marathon',
    }),
    {
      id: 'gp',
      type: 'active',
      label: `${reps} × ${repMin} min allure ${goalLabel}`,
      endCondition: 'duration',
      durationSec: repMin * 60,
      repeat: reps,
      target: paceTarget(paceBand),
    },
    recoveryStep('rest', ctx.zones, 180, 'Récup 3 min · footing facile', reps),
    cooldownStep('cd', ctx.zones, 10 * 60, 'Retour au calme 10 min · footing très facile'),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-gp`,
      title: `Allure ${goalLabel} · blocs spécifiques`,
      date: ctx.date,
      discipline: 'run',
      expectedRpe: ctx.isDeload ? 5 : 7,
      periodization: ctx.block,
    },
    steps,
  );
}

/** Blocs allure marathon — phase spécifique semi/marathon (Runna race-pace). */
export function makeMarathonPaceBlocks(ctx: RunSessionContext): PlannedWorkout {
  return makeGoalPaceBlocks(ctx);
}

/** Strides — affûtage / semaine légère (5–6 × 20 s). */
export function makeStridesSession(ctx: RunSessionContext): PlannedWorkout {
  const reps = 6;

  const steps: WorkoutStep[] = [
    warmupStep('wu', ctx.zones, {
      durationSec: 20 * 60,
      label: 'Footing facile 20 min · footing très facile',
      mainKind: 'easy',
    }),
    {
      id: 'stride',
      type: 'active',
      label: `${reps} accélérations · 20 s rapide`,
      endCondition: 'duration',
      durationSec: 20,
      repeat: reps,
    },
    recoveryStep('rec', ctx.zones, 60, 'Récup complète entre accélérations', reps),
    cooldownStep('cd', ctx.zones, 5 * 60),
  ];

  return finalize(
    {
      id: `w-${ctx.date}-run-strides`,
      title: 'Footing + strides (affûtage)',
      date: ctx.date,
      discipline: 'run',
      expectedRpe: 4,
      periodization: ctx.block,
    },
    steps,
  );
}

const RACE_GOALS: GoalType[] = ['5k', '10k', 'vma', 'semi', 'marathon', 'trail'];

/** Choisit la séance qualité selon phase, semaine et objectif. */
export function pickQualitySession(ctx: RunSessionContext): PlannedWorkout {
  const slot = ctx.qualitySlot ?? 0;

  if (ctx.block === 'affutage') {
    return slot === 0 ? makeStridesSession(ctx) : makeRecoveryRun(ctx, 5000);
  }

  if (ctx.isDeload) {
    const deloadVariants = [
      makeFiveKPaceIntervals,
      makeVmaIntervals,
      makeCruiseThreshold,
      makeFartlek,
    ];
    return deloadVariants[(ctx.weekIndex + slot) % deloadVariants.length](ctx);
  }

  // Une séance « allure 5 km » max / semaine (slot 0), tous programmes course.
  if (slot === 0 && ctx.weekIndex % 2 === 0) {
    return makeFiveKPaceIntervals(ctx);
  }

  if (ctx.block === 'travail_specifique' && ctx.goal && RACE_GOALS.includes(ctx.goal)) {
    if (slot === 0) {
      if (ctx.goal === '5k' || ctx.goal === '10k' || ctx.goal === 'vma') {
        return ctx.weekIndex % 2 === 0 ? makeGoalPaceBlocks(ctx) : makeTempoContinuous(ctx);
      }
      if (ctx.goal === 'marathon' || ctx.goal === 'semi') {
        return ctx.weekIndex % 3 === 0 ? makeGoalPaceBlocks(ctx) : makeCruiseThreshold(ctx);
      }
      return makeCruiseThreshold(ctx);
    }
    if (slot === 1) {
      return ctx.weekIndex % 2 === 0 ? makeVmaIntervals(ctx) : makeFartlek(ctx);
    }
  }

  // Développement général — rotation VMA / seuil / fartlek / tempo / allure 5K
  const baseRotation = [
    makeVmaIntervals,
    makeCruiseThreshold,
    makeFartlek,
    makeTempoContinuous,
    makeFiveKPaceIntervals,
  ];
  const idx = (ctx.weekIndex + slot * 2) % baseRotation.length;
  return baseRotation[idx](ctx);
}
