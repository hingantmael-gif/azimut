import type { ActiveProgram, GoalType, OnboardingAnswers, PlannedWorkout } from '../types/domain';
import { findProgramById, type TrainingProgramTemplate } from '../constants/programs';
import {
  getDurationGuide,
  resolveTrainingWeeks,
} from '../data/programDurationDb';
import { resolveAthleteLevel } from './athleteProfile';
import { resolvePaceZones } from './paceZones';
import { generateMultiWeekPlan } from './planGenerator';
import {
  maxWeeklyKmForGoal,
  peakLongRunKmForGoal,
  sanitizePlanDistances,
  enforceFamilyDisciplines,
} from './sessionVolumePolicy';
import { resolveSportFamily } from './coachingEngine';
import {
  resolveWeeklySessionCount,
} from './trainingSchedulePolicy';
import { todayIsoDate } from './core';

export interface ProgramBuildInput {
  templateId: string;
  customDistanceKm?: number;
  customWeeks?: number;
  raceDateIso?: string;
  customTitle?: string;
  /** Jours d'entraînement (0=dim … 6=sam) */
  trainingDays: number[];
  longRunDay: number;
  /** Nombre de séances / semaine choisi dans le wizard */
  weeklySessionsTarget?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Volume hebdo moyen récent (km) */
  weeklyKmAvg: number;
  recentTimeSec?: number;
  recentDistanceKm?: number;
  averagePaceSecPerKm?: number;
  paceDistanceKm?: number;
  includePpg?: boolean;
  isPremium: boolean;
  /** Musculation : matériel (gym, haltères, etc.) — sélection multiple */
  strengthEquipment?: string[];
  /** Musculation : fitness | hypertrophy | power */
  strengthGoal?: string;
  /** Musculation : upper | lower | full */
  strengthBodyFocus?: string;
  /** Musculation : cibles précises (abs, back, arms, legs, chest). */
  strengthTargets?: string[];
  /** Callisthénie : zone (full | upper | lower) et cibles précises (abs, back, arms, legs, chest). */
  calisScope?: string;
  calisTargets?: string[];
  /** Musculation : pas de date limite — calendrier glissant */
  ongoing?: boolean;
  /** Intention course (démarrage doux si start / reprise) */
  runIntent?: OnboardingAnswers['runIntent'];
  /** Objectif d'entraînement course (endurance / puissance-vitesse / dénivelé / équilibré) */
  runFocus?: OnboardingAnswers['runFocus'];
  /** Horodatage de génération (tests) — défaut : maintenant */
  generatedAt?: Date;
}

/**
 * Après cette heure locale, une séance « aujourd’hui » n’est plus proposée
 * à la génération (ex. 22h24 → première séance demain).
 */
export const PROGRAM_GEN_SAME_DAY_CUTOFF_HOUR = 18;

/**
 * Première date autorisée pour une séance du plan nouvellement généré.
 * Avant 18h → aujourd’hui ; à partir de 18h → demain.
 */
export function effectiveProgramStartIso(now: Date = new Date()): string {
  const today = todayIsoDate(now);
  if (now.getHours() < PROGRAM_GEN_SAME_DAY_CUTOFF_HOUR) {
    return today;
  }
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0, 0);
  return todayIsoDate(next);
}

function weekStartIso(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  // Dimanche de la semaine locale en cours
  d.setDate(d.getDate() - d.getDay());
  return todayIsoDate(d);
}

function goalFromDistanceKm(km: number): GoalType {
  if (km <= 5) return '5k';
  if (km <= 10) return '10k';
  if (km <= 25) return 'semi';
  if (km <= 45) return 'marathon';
  return 'trail';
}

function resolveTemplate(input: ProgramBuildInput): {
  template: TrainingProgramTemplate | null;
  answers: OnboardingAnswers;
  weeks: number;
  title: string;
  subtitle: string;
  targetDistanceKm?: number;
  raceDateIso?: string;
  ongoing?: boolean;
} {
  const isCustom = input.templateId === 'custom';
  const template = isCustom ? null : findProgramById(input.templateId) ?? null;

  const targetDistanceKm = isCustom ? input.customDistanceKm : template?.distanceKm;
  const goal: GoalType =
    template?.goal ??
    (targetDistanceKm && targetDistanceKm > 0
      ? goalFromDistanceKm(targetDistanceKm)
      : 'forme');

  const level = resolveAthleteLevel({
    weeklyKm: input.weeklyKmAvg,
    recentTimeSec: input.recentTimeSec,
    recentDistanceKm: input.recentDistanceKm,
    goalMaxWeeklyKm: maxWeeklyKmForGoal(goal, targetDistanceKm),
  });
  const paceZones = resolvePaceZones({
    level,
    weeklyKmAvg: input.weeklyKmAvg,
    recentDistanceKm: input.recentDistanceKm,
    recentTimeSec: input.recentTimeSec,
  });
  const vmaKmh = paceZones.vmaKmh;

  const sportCat = template?.sportCategory ?? (input.customDistanceKm ? 'run' : undefined);
  const guide = getDurationGuide({
    goal,
    distanceKm: targetDistanceKm,
    sportFamily: resolveSportFamily(sportCat, goal),
  });

  const isOngoingStrength = sportCat === 'strength' && input.ongoing === true;

  let weeks: number;
  let raceDateIso: string | undefined;

  if (isOngoingStrength) {
    weeks = 8;
    raceDateIso = undefined;
  } else {
    const resolved = resolveTrainingWeeks({
      guide,
      level,
      manualWeeks: input.customWeeks ?? template?.weeks,
      raceDateIso: input.raceDateIso,
    });
    weeks = resolved.weeks;
    raceDateIso = resolved.raceDateIso;
  }

  const focusLabel =
    input.strengthBodyFocus === 'upper'
      ? 'Haut du corps'
      : input.strengthBodyFocus === 'lower'
        ? 'Bas du corps'
        : input.strengthBodyFocus === 'full'
          ? 'Haut + bas'
          : null;

  const title = isCustom
    ? input.customTitle ?? `Objectif ${input.customDistanceKm ?? '?'} km`
    : sportCat === 'strength'
      ? ['Musculation', focusLabel].filter(Boolean).join(' · ')
      : sportCat === 'other'
        ? 'Callisthénie'
        : template!.title;

  const dateHint = raceDateIso ? ` · course le ${raceDateIso}` : '';
  const family = resolveSportFamily(sportCat, goal);
  const sessionCount =
    input.weeklySessionsTarget ??
    resolveWeeklySessionCount({
      level,
      goal,
      family,
      availableDaysCount: input.trainingDays.length,
      weeklyKm: input.weeklyKmAvg,
    });
  const strengthHint =
    sportCat === 'strength' && input.strengthGoal
      ? ` · ${
          input.strengthGoal === 'hypertrophy'
            ? 'prendre du muscle'
            : input.strengthGoal === 'power'
              ? 'force'
              : 'tonifier'
        }`
      : sportCat === 'other' && input.strengthGoal
        ? ` · ${input.strengthGoal}`
        : '';
  const subtitle = isOngoingStrength
    ? `Sans date de fin · ${sessionCount} séances/sem${strengthHint}`
    : `${weeks} sem. · ${sessionCount} séances/sem${
        sportCat === 'strength' ? strengthHint : ' · 80/20'
      }${dateHint}`;

  const answers: OnboardingAnswers = {
    level,
    goal,
    trainingDays: input.trainingDays,
    longRunDay: input.longRunDay,
    weeklyKmAvg: input.weeklyKmAvg,
    weeklySessionsTarget: (input.weeklySessionsTarget ??
      sessionCount) as OnboardingAnswers['weeklySessionsTarget'],
    targetDistanceKm,
    recentTimeSec: input.recentTimeSec,
    recentDistanceKm: input.recentDistanceKm,
    vmaKmh,
    includePpg: input.includePpg,
    sportCategory:
      template?.sportCategory ?? (input.customDistanceKm ? 'run' : undefined),
    strengthEquipment: input.strengthEquipment,
    strengthGoal: input.strengthGoal,
    strengthBodyFocus: input.strengthBodyFocus,
    strengthTargets: input.strengthTargets,
    calisScope: input.calisScope,
    calisTargets: input.calisTargets,
    connectGarmin: true,
    connectStrava: true,
    runIntent: input.runIntent,
    runFocus: input.runFocus,
  };

  return {
    template,
    answers,
    weeks,
    title,
    subtitle,
    targetDistanceKm,
    raceDateIso,
    ongoing: isOngoingStrength || undefined,
  };
}

function scaleWorkoutDistance(w: PlannedWorkout, newDistanceM: number): PlannedWorkout {
  const prev = w.plannedDistanceM && w.plannedDistanceM > 0 ? w.plannedDistanceM : newDistanceM;
  const factor = newDistanceM / prev;
  return {
    ...w,
    plannedDistanceM: newDistanceM,
    plannedDurationSec: w.plannedDurationSec
      ? Math.round(w.plannedDurationSec * factor)
      : undefined,
    steps: w.steps.map((s) => {
      if (s.endCondition !== 'distance' || !s.distanceMeters) return s;
      const d = Math.round(s.distanceMeters * factor);
      const label = s.label?.replace(
        /\d+[.,]\d+\s*km/i,
        `${(d / 1000).toFixed(1).replace('.', ',')} km`,
      );
      return { ...s, distanceMeters: d, label: label ?? s.label };
    }),
  };
}

/**
 * Ramp progressive des sorties longues vers le pic du profil objectif
 * (met à jour plannedDistanceM ET les steps).
 */
function scaleLongRunsToGoal(
  plan: PlannedWorkout[],
  targetKm: number,
  goal: OnboardingAnswers['goal'],
): PlannedWorkout[] {
  const peakKm = peakLongRunKmForGoal(goal, targetKm);
  const peakLongRunM = Math.round(peakKm * 1000);
  const longRuns = plan.filter((w) => /longue/i.test(w.title));
  if (longRuns.length === 0) return plan;

  const sorted = [...longRuns].sort((a, b) => a.date.localeCompare(b.date));
  const startM = Math.round(peakLongRunM * 0.48);

  return plan.map((w) => {
    const idx = sorted.findIndex((lr) => lr.id === w.id);
    if (idx < 0) return w;
    const progress = (idx + 1) / sorted.length;
    const scaled = Math.round(startM + (peakLongRunM - startM) * progress);
    return {
      ...scaleWorkoutDistance(w, scaled),
      title: `Sortie longue · cible ${targetKm} km`,
    };
  });
}

export function buildProgramPlan(input: ProgramBuildInput): {
  plan: PlannedWorkout[];
  meta: ActiveProgram;
  answers: OnboardingAnswers;
} {
  const resolved = resolveTemplate(input);
  const weeks = resolved.weeks;
  const generatedAt = input.generatedAt ?? new Date();

  let plan = generateMultiWeekPlan(
    resolved.answers,
    weekStartIso(generatedAt),
    weeks,
    resolved.answers.sportCategory,
    { ongoing: resolved.ongoing },
  );

  // Pas de séance avant aujourd’hui — et pas « aujourd’hui » si génération trop tardive (≥ 18h)
  const planStart = effectiveProgramStartIso(generatedAt);
  plan = plan.filter((w) => w.date >= planStart);

  const dist = input.customDistanceKm ?? resolved.targetDistanceKm;
  // La courbe buildLongRunCurve gère déjà la progression — pas de rescale post-génération
  plan = sanitizePlanDistances(plan, resolved.answers.goal, dist);

  const family = resolveSportFamily(
    resolved.answers.sportCategory,
    resolved.answers.goal,
  );
  plan = enforceFamilyDisciplines(plan, family);

  const sportCategory =
    resolved.template?.sportCategory ?? (input.customDistanceKm ? 'run' : 'other');

  const catalogId =
    input.templateId === 'custom' ? `custom-${Date.now()}` : input.templateId;

  const meta: ActiveProgram = {
    id: catalogId,
    catalogId,
    title: resolved.title,
    subtitle: resolved.subtitle,
    /** Aligné sur la 1ʳᵉ date de séance possible (demain si soir) */
    startedAt: planStart,
    weeks: resolved.weeks,
    targetDistanceKm: resolved.targetDistanceKm,
    sportCategory,
    raceDateIso: resolved.raceDateIso,
    ongoing: resolved.ongoing,
    baselineTimeSec:
      input.recentTimeSec && input.recentTimeSec > 0 ? input.recentTimeSec : undefined,
    baselineDistanceKm:
      input.recentTimeSec && input.recentDistanceKm
        ? input.recentDistanceKm
        : resolved.targetDistanceKm,
    // Au départ, le « actuel » = baseline (évolution à 0 jusqu’à un meilleur test)
    currentBestTimeSec:
      input.recentTimeSec && input.recentTimeSec > 0 ? input.recentTimeSec : undefined,
    currentBestAt:
      input.recentTimeSec && input.recentTimeSec > 0
        ? generatedAt.toISOString()
        : undefined,
  };

  return { plan, meta, answers: resolved.answers };
}

/** @deprecated — plus utilisé (l'algo fixe les durées) */
export type DayAvailability = { day: number; maxMinutes: number };
