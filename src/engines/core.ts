import { decideSleepAdaptiveAction, applySleepAdaptiveToWorkout, normalizeSleepScore } from './sleepAdaptation';
import type {
  AdaptiveAction,
  BanisterState,
  ComplianceBreakdown,
  HealthSnapshot,
  MuscleSensation,
  OnboardingAnswers,
  PeriodizationBlock,
  PlannedWorkout,
  RankTier,
  RankedProgress,
  RpeFeedback,
  StravaActivity,
  WatchBrandId,
  WorkoutStep,
} from '../types/domain';
import { generateCoachedWeek } from './coachingEngine';
import { computeTrimp, trimpToBanisterLoad } from './sportsScience';

/** CDC §2.A — Score de conformité 0–100 */
export function computeCompliance(
  planned: PlannedWorkout,
  activity: StravaActivity,
): ComplianceBreakdown {
  const plannedDist = planned.plannedDistanceM ?? sumStepDistance(planned.steps);
  const plannedDur = planned.plannedDurationSec ?? sumStepDuration(planned.steps);

  const volumeDist =
    plannedDist > 0
      ? Math.max(0, 100 - (Math.abs(activity.distanceM - plannedDist) / plannedDist) * 100)
      : 100;
  const volumeDur =
    plannedDur > 0
      ? Math.max(0, 100 - (Math.abs(activity.movingSec - plannedDur) / plannedDur) * 100)
      : 100;
  const volumeScore = (volumeDist + volumeDur) / 2;

  const intensityScore = estimateIntensityInZone(planned, activity);
  const regularityScore = estimateRegularity(activity);

  const total = Math.round(
    volumeScore * 0.35 + intensityScore * 0.4 + regularityScore * 0.25,
  );

  return {
    volumeScore: Math.round(volumeScore),
    intensityScore: Math.round(intensityScore),
    regularityScore: Math.round(regularityScore),
    total: Math.min(100, Math.max(0, total)),
  };
}

function sumStepDuration(steps: WorkoutStep[]): number {
  return Math.round(
    steps.reduce((s, st) => {
      let sec = st.durationSec ?? 0;
      if (!sec && st.distanceMeters && st.target?.type === 'pace') {
        const pace = (st.target.minSecPerKm + st.target.maxSecPerKm) / 2;
        sec = (st.distanceMeters / 1000) * pace;
      }
      return s + sec * (st.repeat ?? 1);
    }, 0),
  );
}

function sumStepDistance(steps: WorkoutStep[]): number {
  return steps.reduce((s, st) => s + (st.distanceMeters ?? 0) * (st.repeat ?? 1), 0);
}

function estimateIntensityInZone(planned: PlannedWorkout, activity: StravaActivity): number {
  const target = planned.steps.find((s) => s.type === 'active' && s.target)?.target;
  if (!target || !activity.streams) return 75;

  if (target.type === 'hr' && activity.streams.heartrate) {
    const hr = activity.streams.heartrate;
    const inZone = hr.filter((v) => v >= target.minBpm && v <= target.maxBpm).length;
    return hr.length ? (inZone / hr.length) * 100 : 70;
  }

  if (target.type === 'pace' && activity.streams.velocitySmooth) {
    const paces = activity.streams.velocitySmooth
      .filter((v) => v > 0)
      .map((v) => 1000 / v);
    const inZone = paces.filter(
      (p) => p >= target.minSecPerKm && p <= target.maxSecPerKm,
    ).length;
    return paces.length ? (inZone / paces.length) * 100 : 70;
  }

  return 75;
}

function estimateRegularity(activity: StravaActivity): number {
  const laps = activity.laps?.filter((l) => (l.avgPaceSecPerKm ?? 0) > 0) ?? [];
  if (laps.length < 2) return 80;
  const paces = laps.map((l) => l.avgPaceSecPerKm!);
  const mean = paces.reduce((a, b) => a + b, 0) / paces.length;
  const variance =
    paces.reduce((a, b) => a + (b - mean) ** 2, 0) / paces.length;
  const std = Math.sqrt(variance);
  const cv = mean > 0 ? (std / mean) * 100 : 0;
  return Math.max(0, Math.min(100, 100 - cv * 5));
}

/** CDC §2.C — Ajustement dynamique */
export function decideAdaptiveAction(input: {
  sleepScore?: number;
  sleepBrand?: WatchBrandId | null;
  hrvDeltaPct?: number;
  rpe?: number;
  expectedRpe?: number;
  compliance: number;
  muscle?: MuscleSensation;
  /** ACWR > 1.5 → forcer repos / Zone 1 */
  acwrForceRest?: boolean;
}): AdaptiveAction {
  if (input.muscle === 'douleur_ciblee') {
    return {
      case: 3,
      type: 'replace_rest_or_mobility',
      reason: 'injury',
      message:
        'Signal de douleur détecté : séance suivante remplacée par repos ou mobilité. Prévention blessure.',
    };
  }

  if (input.acwrForceRest) {
    return {
      case: 2,
      type: 'easy_recovery',
    };
  }

  // Sommeil : score brut + marque → score canonique (sleepAdaptation)
  if (input.sleepScore !== undefined) {
    const sleepAction = decideSleepAdaptiveAction(input.sleepScore, input.sleepBrand);
    if (sleepAction.case !== 4) return sleepAction;
  }

  if (
    (input.hrvDeltaPct !== undefined && input.hrvDeltaPct < -10) ||
    (input.rpe !== undefined && input.rpe > 8)
  ) {
    return { case: 2, type: 'reduce_volume', pct: 25 };
  }

  if (input.compliance < 50) {
    return { case: 4, type: 'recalc_weekly_load_no_shift' };
  }

  const coachSleep =
    input.sleepScore !== undefined
      ? normalizeSleepScore(input.sleepScore, input.sleepBrand)
      : 0;
  if (
    coachSleep > 80 &&
    input.rpe !== undefined &&
    input.expectedRpe !== undefined &&
    input.rpe < input.expectedRpe &&
    input.compliance > 95
  ) {
    return { case: 1, type: 'increase_pace', pct: 1.5 };
  }

  return { case: 4, type: 'recalc_weekly_load_no_shift' };
}

/** @deprecated Ancienne courbe fixe — préférer xpRequiredForLevel */
export const XP_PER_LEVEL = 100;

/**
 * XP pour passer du niveau `level` → `level + 1`.
 *
 * Courbe polynomiale progressive (pratique standard jeux / Duolingo / Soft Ladder) :
 * - début rapide (rétention) ;
 * - milieu régulier ;
 * - hauts paliers exigeants (compétition réelle).
 *
 * Cibles « ~50 XP / séance planifiée typique » :
 * Bronze (1–9) ≈ 1–2 séances/niv · Argent–Or ≈ quelques séances ·
 * Diamant–Élite ≈ 1–2 sem./niv · Champion = prestige multi-semaines.
 *
 * Formule : 48 + 8L + 0.35 L² + 0.018 L³
 */
export function xpRequiredForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  const need = 48 + 8 * lv + 0.35 * lv * lv + 0.018 * lv * lv * lv;
  return Math.max(40, Math.round(need));
}

/** XP cumulés minimum pour atteindre ce niveau (niveau 1 = 0). */
export function totalXpToReachLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  let sum = 0;
  for (let L = 1; L < target; L++) sum += xpRequiredForLevel(L);
  return sum;
}

/** Plafond carrière raisonnable (~niveau 100) — évite XP corrompues / démo absurde. */
export function maxCareerXp(): number {
  return totalXpToReachLevel(100) - 1;
}

export function levelFromXp(xp: number): number {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let i = 0; i < 500; i++) {
    const need = xpRequiredForLevel(level);
    if (remaining < need) return level;
    remaining -= need;
    level += 1;
  }
  return level;
}

export function xpProgressFromTotal(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  ratio: number;
  remaining: number;
} {
  const level = levelFromXp(xp);
  const floor = totalXpToReachLevel(level);
  const xpForNext = xpRequiredForLevel(level);
  const xpIntoLevel = Math.max(0, Math.floor(xp) - floor);
  const ratio = xpForNext > 0 ? Math.min(1, xpIntoLevel / xpForNext) : 1;
  return {
    level,
    xpIntoLevel,
    xpForNext,
    ratio,
    remaining: Math.max(0, xpForNext - xpIntoLevel),
  };
}

/**
 * XP par km : entre 5 et 10 selon la fidélité au plan (0 % → 5, 100 % → 10).
 */
export function xpPerKmFromCompliance(compliancePct: number): number {
  const c = Math.max(0, Math.min(100, compliancePct)) / 100;
  return 5 + 5 * c;
}

/** Bonus RPE — encourage à renseigner l’effort (présence active). */
export const RPE_SUBMIT_XP = 40;

/** Première séance du jour — présence + entraînement. */
export const FIRST_SESSION_OF_DAY_XP = 20;

/** CDC §4.A — XP Engine (km, durée, conformité, série, présence) */
export function computeSessionXp(opts: {
  durationSec: number;
  distanceM: number;
  compliance: number;
  streakMultiplier: number;
  rpeSubmitted: boolean;
  /** Première activité validée aujourd’hui */
  isFirstSessionOfDay?: boolean;
}): {
  total: number;
  base: number;
  complianceBonus: number;
  streakBonus: number;
  rpeBonus: number;
  firstSessionBonus: number;
} {
  const km = Math.max(0, opts.distanceM / 1000);
  const xpPerKm = xpPerKmFromCompliance(opts.compliance);
  const distanceXp = Math.round(km * xpPerKm);
  const durationXp = Math.round(Math.max(0, opts.durationSec) / 180);
  const base = distanceXp + durationXp;

  let complianceMult = 1;
  if (opts.compliance >= 95) complianceMult = 1.2;
  else if (opts.compliance >= 85) complianceMult = 1.12;
  else if (opts.compliance >= 70) complianceMult = 1.06;

  const afterCompliance = Math.round(base * complianceMult);
  const complianceBonus = afterCompliance - base;
  const streakMult = Math.min(1.25, Math.max(1, opts.streakMultiplier));
  const withStreak = Math.round(afterCompliance * streakMult);
  const streakBonus = withStreak - afterCompliance;
  const rpeBonus = opts.rpeSubmitted ? RPE_SUBMIT_XP : 0;
  const firstSessionBonus = opts.isFirstSessionOfDay ? FIRST_SESSION_OF_DAY_XP : 0;

  return {
    base,
    complianceBonus,
    streakBonus,
    rpeBonus,
    firstSessionBonus,
    total: withStreak + rpeBonus + firstSessionBonus,
  };
}

/** 9 niveaux / palier (3×3), puis Champion sans division */
const LEVELS_PER_TIER = 9;
const RANKED_TIERS: RankTier[] = [
  'bronze',
  'argent',
  'or',
  'diamant',
  'platine',
  'elite',
];

export function tierFromLevel(level: number): RankTier {
  const lv = Math.max(1, level);
  const championFrom = RANKED_TIERS.length * LEVELS_PER_TIER + 1; // 55
  if (lv >= championFrom) return 'champion';
  return RANKED_TIERS[Math.floor((lv - 1) / LEVELS_PER_TIER)];
}

/** XP profil / semaine — jamais négatif, plafonné (anti-explosion affichage). */
export function clampXp(xp: number): number {
  if (!Number.isFinite(xp)) return 0;
  return Math.max(0, Math.min(maxCareerXp(), Math.floor(xp)));
}

export function applyXp(ranked: RankedProgress, gain: number): RankedProgress {
  const add = Math.max(0, gain);
  const xp = clampXp(ranked.xp + add);
  const level = levelFromXp(xp);
  return {
    ...ranked,
    xp,
    level,
    weekXp: clampXp((ranked.weekXp ?? 0) + add),
  };
}

/** Like programme / séance d’un autre athlète (une fois chacun). */
export const PROGRAM_LIKE_XP = 20;
export const SESSION_LIKE_XP = 12;

/** Ouvrir l’app au moins une fois dans la journée. */
export const DAILY_PRESENCE_XP = 15;

export function todayIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bonus quotidien de présence — 1× / jour calendaire. */
export function claimDailyPresenceXp(
  ranked: RankedProgress,
  today: string = todayIsoDate(),
): { ranked: RankedProgress; gained: number } {
  if (ranked.lastPresenceXpDate === today) {
    return { ranked, gained: 0 };
  }
  const next = applyXp(ranked, DAILY_PRESENCE_XP);
  return {
    ranked: { ...next, lastPresenceXpDate: today },
    gained: DAILY_PRESENCE_XP,
  };
}

/** Texte d’aide — comment gagner de l’XP (UI Classement). */
export const XP_EARN_GUIDE_LINES = [
  'Séances : distance + durée + fidélité au plan (+ bonus 1ʳᵉ séance du jour).',
  'Effort ressenti (RPE) après une séance.',
  'Likes sur programmes / séances d’autres athlètes.',
  'Présence : ouvrir l’app au moins une fois par jour.',
  'Badges et Odyssée km : bonus ponctuels.',
  'Plus tu montes, plus chaque niveau demande d’XP — la ligue hebdo reste le vrai combat.',
] as const;

/** CDC §3.A — Banister Fitness-Fatigue */
export function updateBanister(
  prev: BanisterState,
  trainingLoad: number,
  date: string,
): BanisterState {
  const fitness = prev.fitness * Math.exp(-1 / 42) + trainingLoad;
  const fatigue = prev.fatigue * Math.exp(-1 / 7) + trainingLoad;
  return {
    date,
    fitness,
    fatigue,
    formTsb: fitness - fatigue,
  };
}

export {
  computeTrimp,
  trimpToBanisterLoad,
  computeAcwr,
  classifySessionKind,
  minRestHoursForKind,
  minDayGapForKind,
  RECOVERY_WINDOWS_H,
  TRIATHLON_FORMATS,
  triathlonFormatFromGoal,
  zoneMixForRaceDistanceKm,
  qualitySessionsFromZoneMix,
  buildRunWarmupProtocol,
  ironman24WeekPhase,
  ironman24Periodization,
  enrichRunWarmup,
} from './sportsScience';

/** Charge Banister depuis durée + RPE (TRIMP = min × RPE). */
export function banisterLoadFromSession(durationSec: number, rpe: number): number {
  return trimpToBanisterLoad(computeTrimp(durationSec / 60, rpe));
}

/** CDC §6 — Génération semaine déléguée au moteur multi-sports 80/20 */
export function generateWeekPlan(
  answers: OnboardingAnswers,
  weekStartIso: string,
  opts?: {
    weekIndex?: number;
    totalWeeks?: number;
    periodization?: PeriodizationBlock;
    sportCategory?: string;
    weeklyKmOverride?: number;
    longKmOverride?: number;
  },
): PlannedWorkout[] {
  return generateCoachedWeek(answers, weekStartIso, {
    weekIndex: opts?.weekIndex ?? 0,
    totalWeeks: opts?.totalWeeks ?? 1,
    periodization: opts?.periodization ?? 'developpement_general',
    sportCategory: opts?.sportCategory ?? answers.sportCategory,
    weeklyKmOverride: opts?.weeklyKmOverride,
    longKmOverride: opts?.longKmOverride,
  });
}

/** CDC §1.B — JSON Garmin workout (voir garminWorkout.ts) */
export { buildGarminWorkoutExport, toGarminWorkoutPayload } from './garminWorkout';

/** CDC §9.A — Race time predictor (hybride Riegel + Cameron + Daniels VDOT) */
export {
  predictRaceTimes,
  predictRaceTimesSecMap,
  formatRaceClock,
  hybridPredictSec,
  riegelPredictSec,
  cameronPredictSec,
  vdotFromRace,
  danielsPredictSec,
  predictCustomDistance,
} from './raceTimePrediction';

/** CDC §9.B — Nutrition */
export function computeNutrition(opts: {
  durationMin: number;
  intensity: 'easy' | 'tempo' | 'hard';
  tempC: number;
}) {
  const baseWater = opts.durationMin * 8;
  const heatBonus = opts.tempC > 22 ? opts.durationMin * 3 : 0;
  const carbs =
    opts.intensity === 'easy' ? 40 : opts.intensity === 'tempo' ? 60 : 80;
  return {
    waterMl: Math.round(baseWater + heatBonus),
    carbsGPerHour: carbs,
    reminderEveryMin: 20,
    tips: [
      'Boire 2 gorgées toutes les 20 minutes',
      opts.durationMin >= 75 ? 'Manger 1 gel toutes les 40–45 minutes' : 'Hydratation suffisante pour cette durée',
    ],
  };
}

export function applyAdaptiveToWorkout(
  workout: PlannedWorkout,
  action: AdaptiveAction,
  health?: HealthSnapshot,
): PlannedWorkout {
  if (action.case === 3 && action.reason === 'sleep') {
    return applySleepAdaptiveToWorkout(
      workout,
      action,
      health?.sleep?.score ?? workout.sleepAdaptation?.score ?? 0,
    );
  }
  if (action.case === 3) {
    return {
      ...workout,
      title: 'Repos / Mobilité (prévention)',
      discipline: 'mobility',
      lockedRest: true,
      coachNote: action.message,
      steps: [
        {
          id: 'mob',
          type: 'active',
          endCondition: 'duration',
          durationSec: 900,
        },
      ],
    };
  }
  if (action.case === 2 && action.type === 'reduce_intensity') {
    return applySleepAdaptiveToWorkout(
      workout,
      action,
      health?.sleep?.score ?? workout.sleepAdaptation?.score ?? 55,
    );
  }
  if (action.case === 2 && action.type === 'reduce_volume') {
    const factor = 1 - action.pct / 100;
    return {
      ...workout,
      title: `${workout.title} (−${action.pct}% volume)`,
      plannedDistanceM: workout.plannedDistanceM
        ? Math.round(workout.plannedDistanceM * factor)
        : undefined,
      plannedDurationSec: workout.plannedDurationSec
        ? Math.round(workout.plannedDurationSec * factor)
        : undefined,
    };
  }
  if (action.case === 2 && action.type === 'easy_recovery') {
    return {
      ...workout,
      title: 'Footing récupération très doux',
      expectedRpe: 2,
      steps: [
        {
          id: 'easy',
          type: 'active',
          endCondition: 'duration',
          durationSec: 2400,
        },
      ],
    };
  }
  if (action.case === 1 && health) {
    return {
      ...workout,
      title: `${workout.title} (+${action.pct}% allure)`,
    };
  }
  return workout;
}

export function formatPace(secPerKm: number): string {
  const safe = Math.min(720, Math.max(150, Number.isFinite(secPerKm) ? secPerKm : 330));
  const m = Math.floor(safe / 60);
  const s = Math.round(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${m}'${s}"/km`;
}

/**
 * Durée lisible (entrée = secondes).
 * < 60 min → « 45 min » ; dès 60 min → « 1 h 41 min », « 4 h ».
 */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  return formatMinutes(Math.max(1, Math.round(sec / 60)));
}

/** Durée lisible à partir de minutes entières. */
export function formatMinutes(totalMin: number): string {
  if (!Number.isFinite(totalMin) || totalMin <= 0) return '—';
  const min = Math.round(totalMin);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
