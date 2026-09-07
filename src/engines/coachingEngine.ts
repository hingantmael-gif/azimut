/**
 * Moteur de coaching offline — séances personnalisées multi-disciplines.
 *
 * Principes (littérature Seiler / 80-20 / progressive overload) :
 * - ~80 % volume facile (Z1–Z2), ~20 % intensité (seuil / VMA / VO2)
 * - Progression ≤ ~10 % volume / semaine
 * - Affûtage : baisse volume, maintien d’intensité légère
 * - PPG : 1–2×/sem, jamais la veille d’une qualité clé
 */

import type {
  AthleticLevel,
  OnboardingAnswers,
  PeriodizationBlock,
  PlannedWorkout,
  SportDiscipline,
  WorkoutStep,
} from '../types/domain';
import {
  paceBandForRunKind,
  resolvePaceZones,
  type PaceZones,
} from './paceZones';
import {
  pickBestRaceReference,
  swimPaceSecPer100FromOnboarding,
} from './athleteProfile';
import {
  makeLongRunEasy,
  makeProgressionLongRun,
  makeRecoveryRun,
  pickQualitySession,
  type RunSessionContext,
} from './runSessionLibrary';
import {
  qualitySessionsFromZoneMix,
  zoneMixForRaceDistanceKm,
  enrichRunWarmup,
  ironman24WeekPhase,
} from './sportsScience';
import {
  resolveEasyRunKm,
  resolveTrainingWeeklyKm,
} from './sessionVolumePolicy';
import {
  resolveWeeklySessionCount,
  selectSessionDays,
} from './trainingSchedulePolicy';
import { assignRolesWithConstraints } from './trainingConstraints';
import { resolveWeekLoadProfile } from './volumeProgression';
import {
  buildStrengthSession,
  normalizeStrengthEquipment,
  type StrengthBodyFocus,
  type StrengthEquipment,
  type StrengthGoalFocus,
} from './strengthProgramming';

export type SportFamily = 'run' | 'bike' | 'swim' | 'triathlon' | 'strength' | 'other';

export function resolveSportFamily(
  category?: string,
  goal?: OnboardingAnswers['goal'],
): SportFamily {
  if (category === 'ironman') return 'triathlon';
  if (
    category === 'run' ||
    category === 'bike' ||
    category === 'swim' ||
    category === 'triathlon' ||
    category === 'strength' ||
    category === 'other'
  ) {
    return category;
  }
  if (
    goal === 'triathlon_sprint' ||
    goal === 'triathlon_olympique' ||
    goal === 'ironman_70_3' ||
    goal === 'ironman'
  ) {
    return 'triathlon';
  }
  if (goal === 'vma' || goal === '5k' || goal === '10k' || goal === 'semi' || goal === 'marathon' || goal === 'trail') {
    return 'run';
  }
  return 'run';
}

/** @deprecated Utilise resolveWeekLoadProfile — conservé pour compatibilité interne. */
function phaseLoad(block: PeriodizationBlock, weekIndex: number, totalWeeks: number): number {
  return resolveWeekLoadProfile(weekIndex, totalWeeks, block).volumeFactor;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function addDays(iso: string, dayOffset: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

/** Durée totale d’une séance (secondes) — distance convertie via allure si besoin */
export function computeSessionDurationSec(steps: WorkoutStep[]): number {
  return Math.round(
    steps.reduce((sum, st) => {
      let sec = st.durationSec ?? 0;
      if (!sec && st.distanceMeters && st.target?.type === 'pace') {
        const pace = (st.target.minSecPerKm + st.target.maxSecPerKm) / 2;
        sec = (st.distanceMeters / 1000) * pace;
      } else if (!sec && st.distanceMeters) {
        // fallback ~5:30 / km course, ~2:00 / 100 m nage, etc. géré côté builder
        sec = (st.distanceMeters / 1000) * 330;
      }
      return sum + sec * (st.repeat ?? 1);
    }, 0),
  );
}

function finalize(
  partial: Omit<PlannedWorkout, 'plannedDurationSec'> & { plannedDurationSec?: number },
): PlannedWorkout {
  const duration =
    partial.plannedDurationSec && partial.plannedDurationSec > 0
      ? partial.plannedDurationSec
      : computeSessionDurationSec(partial.steps);
  return {
    ...partial,
    plannedDurationSec: clamp(duration, 300, 6 * 3600), // 5 min – 6 h max
  };
}

function paceTargetFromBand(b: { minSecPerKm: number; maxSecPerKm: number }) {
  return { type: 'pace' as const, minSecPerKm: b.minSecPerKm, maxSecPerKm: b.maxSecPerKm };
}

function ftpWattsFromLevel(level: AthleticLevel): number {
  if (level === 'debutant') return 160;
  if (level === 'intermediaire') return 220;
  return 280;
}

function swimPaceSecPer100(level: AthleticLevel): number {
  if (level === 'debutant') return 140;
  if (level === 'intermediaire') return 110;
  return 95;
}

// ——— Course ———
// Séances course : bibliothèque runSessionLibrary.ts (VMA, seuil, fartlek, progression…)

// ——— Vélo ———

function makeBikeEndurance(
  date: string,
  minutes: number,
  ftp: number,
  block: PeriodizationBlock,
  title = 'Sortie endurance vélo',
): PlannedWorkout {
  const watts = Math.round(ftp * 0.7);
  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: 'Échauffement souple',
      endCondition: 'duration',
      durationSec: 10 * 60,
    },
    {
      id: 'main',
      type: 'active',
      label: `Endurance Z2 · ${minutes} min`,
      endCondition: 'duration',
      durationSec: Math.max(20, minutes - 15) * 60,
      target: { type: 'power', minWatts: watts - 15, maxWatts: watts + 15 },
    },
    {
      id: 'cd',
      type: 'cooldown',
      label: 'Retour au calme',
      endCondition: 'duration',
      durationSec: 5 * 60,
    },
  ];
  // ~28 km/h moyen pour distance indicative
  const distM = Math.round((minutes / 60) * 28000);
  return finalize({
    id: `w-${date}-bike-end`,
    title,
    date,
    discipline: 'bike',
    plannedDistanceM: distM,
    expectedRpe: 4,
    periodization: block,
    steps,
  });
}

function makeBikeVo2(
  date: string,
  ftp: number,
  level: AthleticLevel,
  block: PeriodizationBlock,
): PlannedWorkout {
  const reps = level === 'debutant' ? 4 : 6;
  const hard = Math.round(ftp * 1.1);
  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: 'Échauffement 15 min',
      endCondition: 'duration',
      durationSec: 15 * 60,
    },
    {
      id: 'rep',
      type: 'active',
      label: `${reps} × 3 min VO2`,
      endCondition: 'duration',
      durationSec: 180,
      repeat: reps,
      target: { type: 'power', minWatts: hard - 10, maxWatts: hard + 20 },
    },
    {
      id: 'rest',
      type: 'rest',
      label: 'Récupération 3 min',
      endCondition: 'duration',
      durationSec: 180,
      repeat: reps,
    },
    {
      id: 'cd',
      type: 'cooldown',
      label: 'Retour au calme',
      endCondition: 'duration',
      durationSec: 10 * 60,
    },
  ];
  return finalize({
    id: `w-${date}-bike-vo2`,
    title: 'Intervalles vélo VO2',
    date,
    discipline: 'bike',
    expectedRpe: 8,
    periodization: block,
    steps,
  });
}

// ——— Natation ———

function makeSwimAerobic(
  date: string,
  meters: number,
  pace100: number,
  block: PeriodizationBlock,
  title = 'Endurance natation',
): PlannedWorkout {
  const mainM = Math.max(400, meters - 500);
  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: 'Échauffement 200 m + éducatifs',
      endCondition: 'distance',
      distanceMeters: 300,
      durationSec: Math.round((300 / 100) * pace100 * 1.15),
    },
    {
      id: 'main',
      type: 'active',
      label: `Nage continue ${mainM} m`,
      endCondition: 'distance',
      distanceMeters: mainM,
      durationSec: Math.round((mainM / 100) * pace100),
    },
    {
      id: 'cd',
      type: 'cooldown',
      label: 'Retour au calme 200 m',
      endCondition: 'distance',
      distanceMeters: 200,
      durationSec: Math.round((200 / 100) * pace100 * 1.1),
    },
  ];
  return finalize({
    id: `w-${date}-swim-end`,
    title,
    date,
    discipline: 'swim',
    plannedDistanceM: meters,
    expectedRpe: 4,
    periodization: block,
    steps,
  });
}

function makeSwimCss(
  date: string,
  pace100: number,
  level: AthleticLevel,
  block: PeriodizationBlock,
): PlannedWorkout {
  const reps = level === 'debutant' ? 6 : 8;
  const repM = 100;
  const hardPace = Math.round(pace100 * 0.95);
  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: 'Échauffement 400 m',
      endCondition: 'distance',
      distanceMeters: 400,
      durationSec: Math.round(4 * pace100 * 1.1),
    },
    {
      id: 'rep',
      type: 'active',
      label: `${reps} × 100 m CSS`,
      endCondition: 'distance',
      distanceMeters: repM,
      repeat: reps,
      durationSec: hardPace,
    },
    {
      id: 'rest',
      type: 'rest',
      label: 'Repos 20 s au mur',
      endCondition: 'duration',
      durationSec: 20,
      repeat: reps,
    },
    {
      id: 'cd',
      type: 'cooldown',
      label: 'Retour au calme 200 m',
      endCondition: 'distance',
      distanceMeters: 200,
      durationSec: Math.round(2 * pace100 * 1.1),
    },
  ];
  return finalize({
    id: `w-${date}-swim-css`,
    title: 'Séries CSS natation',
    date,
    discipline: 'swim',
    plannedDistanceM: 400 + reps * 100 + 200,
    expectedRpe: 7,
    periodization: block,
    steps,
  });
}

// ——— Brick / Tri ———

function makeBrick(
  date: string,
  ftp: number,
  zones: PaceZones,
  load: number,
  block: PeriodizationBlock,
  goal?: OnboardingAnswers['goal'],
): PlannedWorkout {
  let bikeMin = Math.round(30 + 20 * load);
  let runM = Math.round(3000 + 2000 * load);
  if (goal === 'triathlon_sprint') {
    bikeMin = Math.min(bikeMin, 35);
    runM = Math.min(runM, 4000);
  } else if (goal === 'triathlon_olympique') {
    bikeMin = Math.min(Math.round(40 + 25 * load), 60);
    runM = Math.min(Math.round(4000 + 2500 * load), 8000);
  } else if (goal === 'ironman_70_3') {
    bikeMin = Math.min(Math.round(55 + 30 * load), 100);
    runM = Math.min(Math.round(5000 + 3500 * load), 14000);
  } else if (goal === 'ironman') {
    bikeMin = Math.min(Math.round(70 + 40 * load), 120);
    runM = Math.min(Math.round(6000 + 4000 * load), 16000);
  }
  const p = paceBandForRunKind(zones, 'easy');
  const watts = Math.round(ftp * 0.75);
  const steps: WorkoutStep[] = [
    {
      id: 'bike',
      type: 'active',
      label: `Vélo ${bikeMin} min Z2`,
      endCondition: 'duration',
      durationSec: bikeMin * 60,
      target: { type: 'power', minWatts: watts - 15, maxWatts: watts + 15 },
    },
    {
      id: 't1',
      type: 'rest',
      label: 'Transition T2 (2 min)',
      endCondition: 'duration',
      durationSec: 120,
    },
    {
      id: 'run',
      type: 'active',
      label: `Course ${(runM / 1000).toFixed(1).replace('.', ',')} km après vélo`,
      endCondition: 'distance',
      distanceMeters: runM,
      target: paceTargetFromBand(p),
    },
  ];
  return finalize({
    id: `w-${date}-brick`,
    title: 'Brick vélo → course',
    date,
    discipline: 'brick',
    plannedDistanceM: Math.round((bikeMin / 60) * 28000 + runM),
    expectedRpe: 6,
    periodization: block,
    steps,
  });
}

// ——— Force / PPG ———

function parseEquipmentList(raw?: string | string[]): StrengthEquipment[] {
  const list = normalizeStrengthEquipment(raw);
  return list.length > 0 ? list : ['gym'];
}

function parseStrengthGoal(raw?: string): StrengthGoalFocus {
  if (raw === 'fitness' || raw === 'hypertrophy' || raw === 'power') return raw;
  return 'hypertrophy';
}

function ppgStrengthOpts(
  answers: OnboardingAnswers,
  weekIndex?: number,
  slotIndex = 0,
  trainingDaysCount = 3,
) {
  return {
    equipment: parseEquipmentList(answers.strengthEquipment),
    weekIndex,
    slotIndex,
    trainingDaysCount,
  };
}

function parseStrengthBodyFocus(raw?: string): StrengthBodyFocus {
  if (raw === 'upper' || raw === 'lower' || raw === 'full') return raw;
  return 'full';
}

function makeStrength(
  date: string,
  level: AthleticLevel,
  block: PeriodizationBlock,
  focus: 'ppg' | 'hypertrophy' = 'ppg',
  opts?: {
    slotIndex?: number;
    trainingDaysCount?: number;
    equipment?: string | string[];
    strengthGoal?: string;
    strengthBodyFocus?: string;
    weekIndex?: number;
  },
): PlannedWorkout {
  return finalize(
    buildStrengthSession({
      date,
      slotIndex: opts?.slotIndex ?? 0,
      trainingDaysCount: opts?.trainingDaysCount ?? 3,
      level,
      block,
      equipment: parseEquipmentList(opts?.equipment),
      strengthGoal:
        focus === 'ppg'
          ? 'fitness'
          : parseStrengthGoal(opts?.strengthGoal ?? (focus === 'hypertrophy' ? 'hypertrophy' : undefined)),
      bodyFocus: parseStrengthBodyFocus(opts?.strengthBodyFocus),
      ppgLite: focus === 'ppg',
      weekIndex: opts?.weekIndex,
    }),
  );
}

function makeMobility(date: string, block: PeriodizationBlock): PlannedWorkout {
  return finalize({
    id: `w-${date}-mob`,
    title: 'Mobilité & récupération',
    date,
    discipline: 'mobility',
    expectedRpe: 2,
    periodization: block,
    steps: [
      {
        id: 'mob',
        type: 'active',
        label: 'Foam roller + étirements dynamiques',
        endCondition: 'duration',
        durationSec: 20 * 60,
      },
    ],
  });
}

export type CoachWeekOpts = {
  weekIndex: number;
  totalWeeks: number;
  periodization: PeriodizationBlock;
  sportCategory?: string;
  /** Volume pré-calculé (courbe Runna +10 %/sem) — prioritaire si fourni */
  weeklyKmOverride?: number;
  /** Sortie longue pré-calculée (progression indépendante) */
  longKmOverride?: number;
};

/**
 * Génère une semaine coachée 80/20 adaptée à la discipline.
 */
export function generateCoachedWeek(
  answers: OnboardingAnswers,
  weekStartIso: string,
  opts: CoachWeekOpts,
): PlannedWorkout[] {
  const family = resolveSportFamily(opts.sportCategory ?? answers.sportCategory, answers.goal);
  const weekLoad = resolveWeekLoadProfile(opts.weekIndex, opts.totalWeeks, opts.periodization);
  const ironmanPhase =
    (answers.goal === 'ironman' || opts.sportCategory === 'ironman') && opts.totalWeeks === 24
      ? ironman24WeekPhase(opts.weekIndex)
      : null;
  const load = weekLoad.volumeFactor * (ironmanPhase?.volumeFactor ?? 1);
  const raceRef = pickBestRaceReference(answers);
  const paceZones = resolvePaceZones({
    level: answers.level,
    weeklyKmAvg: answers.weeklyKmAvg,
    recentDistanceKm: raceRef?.km ?? answers.recentDistanceKm,
    recentTimeSec: raceRef?.timeSec ?? answers.recentTimeSec,
    vmaKmh: answers.vmaKmh,
  });
  const vma = paceZones.vmaKmh;
  const weeklyKm =
    opts.weeklyKmOverride ??
    resolveTrainingWeeklyKm({
      goal: answers.goal,
      level: answers.level,
      weeklyKmAvg: answers.weeklyKmAvg,
      targetDistanceKm: answers.targetDistanceKm,
      phaseLoad: load,
      vmaKmh: vma,
    });
  const ftp =
    answers.ftpWatts && answers.ftpWatts >= 80
      ? answers.ftpWatts
      : ftpWattsFromLevel(answers.level);
  const swimFromData = swimPaceSecPer100FromOnboarding(answers);
  const swimPace = swimFromData ?? swimPaceSecPer100(answers.level);
  const availableDays = [...answers.trainingDays].sort((a, b) => a - b);
  if (availableDays.length === 0) return [];

  const longDow = availableDays.includes(answers.longRunDay)
    ? answers.longRunDay
    : availableDays[availableDays.length - 1];

  const sessionCount = resolveWeeklySessionCount({
    level: answers.level,
    goal: answers.goal,
    family,
    availableDaysCount: availableDays.length,
    weeklyKm,
  });
  const days = selectSessionDays(availableDays, longDow, sessionCount);
  const raceKm = answers.targetDistanceKm ?? answers.recentDistanceKm ?? 10;
  const zoneMix = zoneMixForRaceDistanceKm(raceKm);
  const hiCount = qualitySessionsFromZoneMix(zoneMix, days.length);

  const roles = assignRolesWithConstraints({
    days,
    longDow,
    hiCount,
    includePpg: !!answers.includePpg && family !== 'strength',
    family,
  });
  let strengthSlot = 0;

  const longKm =
    opts.longKmOverride ??
    Math.round(weeklyKm * 0.28 * 10) / 10;

  const easyDayCount = [...roles.values()].filter((r) => r === 'easy').length;
  const qualitySessionCount = [...roles.values()].filter(
    (r) => r === 'quality_a' || r === 'quality_b',
  ).length;
  const otherEasyKm = resolveEasyRunKm({
    weeklyKm,
    longKm,
    easyDayCount: Math.max(1, easyDayCount),
    qualitySessionCount,
    goal: answers.goal,
    targetDistanceKm: answers.targetDistanceKm,
  });

  const workouts: PlannedWorkout[] = [];
  const block = opts.periodization;
  let qualitySlot: 0 | 1 = 0;

  const runCtxBase = (): RunSessionContext => ({
    date: '',
    zones: paceZones,
    level: answers.level,
    load,
    block,
    weekIndex: opts.weekIndex,
    goal: answers.goal,
    isDeload: weekLoad.isDeload,
  });

  for (const [dow, role] of roles) {
    const date = addDays(weekStartIso, dow);

    if (family === 'run') {
      const ctx: RunSessionContext = { ...runCtxBase(), date };

      if (role === 'long') {
        const distM = Math.round(longKm * 1000);
        if (block === 'affutage' || weekLoad.isTaper) {
          workouts.push(makeLongRunEasy(ctx, Math.round(distM * 0.72)));
        } else if (weekLoad.isDeload) {
          workouts.push(makeLongRunEasy(ctx, Math.round(distM * 0.85)));
        } else if (opts.weekIndex % 2 === 1) {
          workouts.push(makeProgressionLongRun(ctx, distM));
        } else {
          workouts.push(makeLongRunEasy(ctx, distM));
        }
      } else if (role === 'quality_a' || role === 'quality_b') {
        workouts.push(
          pickQualitySession({
            ...ctx,
            qualitySlot: qualitySlot,
            load: load * weekLoad.qualityFactor,
          }),
        );
        qualitySlot = 1;
      } else if (role === 'strength') {
        workouts.push(makeStrength(date, answers.level, block, 'ppg', ppgStrengthOpts(answers, opts.weekIndex)));
      } else {
        workouts.push(makeRecoveryRun(ctx, Math.round(otherEasyKm * 1000)));
      }
      continue;
    }

    if (family === 'other') {
      const ctx: RunSessionContext = { ...runCtxBase(), date };
      if (role === 'brick') {
        workouts.push(makeBrick(date, ftp, paceZones, load, block, 'triathlon_sprint'));
      } else if (role === 'long') {
        workouts.push(makeLongRunEasy(ctx, Math.round(longKm * 1000)));
      } else if (role === 'easy') {
        workouts.push(makeRecoveryRun(ctx, Math.round(otherEasyKm * 1000)));
      } else if (role === 'quality_a' || role === 'quality_b') {
        workouts.push(pickQualitySession({ ...ctx, qualitySlot: qualitySlot }));
        qualitySlot = 1;
      } else if (role === 'bike') {
        workouts.push(makeBikeEndurance(date, Math.round(50 + 25 * load), ftp, block));
      } else if (role === 'strength') {
        workouts.push(makeStrength(date, answers.level, block, 'ppg', ppgStrengthOpts(answers, opts.weekIndex)));
      } else {
        workouts.push(makeRecoveryRun(ctx, Math.round(otherEasyKm * 1000)));
      }
      continue;
    }

    if (family === 'bike') {
      const targetKm = answers.targetDistanceKm ?? 80;
      const avgKmh = 26;
      const peakLongMin = clamp(
        Math.round(((targetKm * 0.88) / avgKmh) * 60),
        50,
        420,
      );
      const easyMin = clamp(Math.round(peakLongMin * 0.38), 40, 140);
      const longMin = clamp(
        Math.round(peakLongMin * (0.55 + 0.45 * load)),
        easyMin + 10,
        peakLongMin,
      );
      if (role === 'long') {
        workouts.push(
          makeBikeEndurance(date, longMin, ftp, block, 'Longue sortie vélo'),
        );
      } else if (role === 'quality_a' || role === 'quality_b') {
        workouts.push(makeBikeVo2(date, ftp, answers.level, block));
      } else if (role === 'strength') {
        workouts.push(makeStrength(date, answers.level, block, 'ppg', ppgStrengthOpts(answers, opts.weekIndex)));
      } else {
        workouts.push(makeBikeEndurance(date, easyMin, ftp, block));
      }
      continue;
    }

    if (family === 'swim') {
      const targetM = answers.targetDistanceKm
        ? Math.round(answers.targetDistanceKm * 1000)
        : 2000;
      // Volumes nage plafonnés vs objectif (ex. 1500 m → séances ≤ ~2,5×)
      const longCap = Math.round(Math.min(targetM * 2.5, targetM + 2500));
      const easyCap = Math.round(Math.min(targetM * 1.6, targetM + 1200));
      const baseM = clamp(Math.round((targetM * 0.9 + 200 * load)), 600, easyCap);
      if (role === 'long') {
        workouts.push(
          makeSwimAerobic(date, clamp(Math.round(baseM * 1.35), 800, longCap), swimPace, block, 'Longue nage'),
        );
      } else if (role === 'quality_a' || role === 'quality_b') {
        workouts.push(makeSwimCss(date, swimPace, answers.level, block));
      } else if (role === 'strength') {
        workouts.push(makeStrength(date, answers.level, block, 'ppg', ppgStrengthOpts(answers, opts.weekIndex)));
      } else {
        workouts.push(makeSwimAerobic(date, baseM, swimPace, block));
      }
      continue;
    }

    if (family === 'triathlon') {
      const swimM =
        answers.goal === 'ironman'
          ? Math.round(2200 + 700 * load)
          : answers.goal === 'ironman_70_3'
            ? Math.round(1800 + 550 * load)
            : answers.goal === 'triathlon_olympique'
              ? Math.round(1500 + 450 * load)
              : Math.round(1000 + 350 * load);
      const bikeMin =
        answers.goal === 'ironman'
          ? Math.round(90 + 45 * load)
          : answers.goal === 'ironman_70_3'
            ? Math.round(70 + 30 * load)
            : answers.goal === 'triathlon_olympique'
              ? Math.round(55 + 20 * load)
              : Math.round(40 + 15 * load);

      if (role === 'brick' || role === 'long') {
        workouts.push(makeBrick(date, ftp, paceZones, load, block, answers.goal));
      } else if (role === 'swim') {
        workouts.push(makeSwimAerobic(date, swimM, swimPace, block, 'Natation endurance'));
      } else if (role === 'bike' || role === 'quality_a') {
        workouts.push(
          qualitySlot++ % 2 === 0
            ? makeBikeVo2(date, ftp, answers.level, block)
            : makeBikeEndurance(date, bikeMin, ftp, block),
        );
      } else if (role === 'strength') {
        workouts.push(makeStrength(date, answers.level, block, 'ppg', ppgStrengthOpts(answers, opts.weekIndex)));
      } else {
        workouts.push(
          makeRecoveryRun(
            { ...runCtxBase(), date },
            Math.round(otherEasyKm * 1000),
          ),
        );
      }
      continue;
    }

    if (family === 'strength') {
      const slot = strengthSlot++;
      workouts.push(
        makeStrength(date, answers.level, block, 'hypertrophy', {
          slotIndex: slot,
          trainingDaysCount: days.length,
          equipment: answers.strengthEquipment,
          strengthGoal: answers.strengthGoal,
          strengthBodyFocus: answers.strengthBodyFocus,
          weekIndex: opts.weekIndex,
        }),
      );
      continue;
    }
  }

  return workouts
    .map((w) =>
      enrichRunWarmup(w, answers.targetDistanceKm ?? answers.recentDistanceKm),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
