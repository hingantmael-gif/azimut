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

export interface ProgramBuildInput {
  templateId: string;
  customDistanceKm?: number;
  customWeeks?: number;
  raceDateIso?: string;
  customTitle?: string;
  /** Jours d'entraînement (0=dim … 6=sam) */
  trainingDays: number[];
  longRunDay: number;
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
  /** Musculation : pas de date limite — calendrier glissant */
  ongoing?: boolean;
  /** Intention course (démarrage doux si start / reprise) */
  runIntent?: OnboardingAnswers['runIntent'];
}

function weekStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
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
      : template!.title;

  const dateHint = raceDateIso ? ` · course le ${raceDateIso}` : '';
  const family = resolveSportFamily(sportCat, goal);
  const sessionCount = resolveWeeklySessionCount({
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
    connectGarmin: true,
    connectStrava: true,
    runIntent: input.runIntent,
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

  let plan = generateMultiWeekPlan(
    resolved.answers,
    weekStartIso(),
    weeks,
    resolved.answers.sportCategory,
    { ongoing: resolved.ongoing },
  );

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
    startedAt: new Date().toISOString().slice(0, 10),
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
        ? new Date().toISOString()
        : undefined,
  };

  return { plan, meta, answers: resolved.answers };
}

/** @deprecated — plus utilisé (l'algo fixe les durées) */
export type DayAvailability = { day: number; maxMinutes: number };
