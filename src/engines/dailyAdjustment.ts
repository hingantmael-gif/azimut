import type {
  OnboardingAnswers,
  PlannedWorkout,
  RpeFeedback,
  StravaActivity,
} from '../types/domain';
import { bodyAnalysisDigest } from './muscleRecovery';
import { canStartLiveWorkout } from './liveWorkout';
import { detectSkipPattern } from './progressiveLearning';
import {
  defaultDigitalTwin,
  type AthleteDigitalTwin,
} from './athleteDigitalTwin';
import { computeReadinessScore, type ReadinessBreakdown } from './readinessScore';
import { bayesianPerceivedForm } from './banisterPlus';
import { computeSentinel, type SentinelReport } from './sentinel';
import { predictSessionRpe, predictSessionCue } from './sessionPrediction';

export type DailyDecisionKind =
  | 'rpe_pending'
  | 'go'
  | 'adapt'
  | 'rest'
  | 'start_next'
  | 'create'
  | 'free';

export type DailyAdjustment = {
  kind: DailyDecisionKind;
  statusLine: string;
  watchOut: boolean;
  coachMessage?: string;
  /** Explication dominante (« pourquoi ») — Readiness V2 */
  whyLine?: string;
  volumeFactor: number;
  readinessPct: number;
  sleepScore: number | null;
  formTsb: number;
  readiness?: ReadinessBreakdown;
  sentinel?: SentinelReport;
  predictedRpe?: number;
  sessionCue?: string;
};

export type RecoveryBundle = {
  activities: StravaActivity[];
  feedbacks: RpeFeedback[];
  plan: PlannedWorkout[];
  onboarding?: OnboardingAnswers;
};

type Opts = {
  todayWorkout: PlannedWorkout | null | undefined;
  pendingRpe: boolean;
  hasActiveProgram: boolean;
  formTsb: number;
  sleepScore: number | null | undefined;
  recoveryInput: RecoveryBundle;
  twin?: AthleteDigitalTwin | null;
  hrvRatio?: number | null;
  sleepDebtHours3d?: number | null;
  recentRpeDelta?: number | null;
  lifeStress01?: number | null;
  acwr?: number | null;
  hrvTrend14d?: number | null;
  rpeCreep?: number | null;
  weeklyVolumeIncreasePct?: number | null;
  nowMs?: number;
};

function baseReturn(
  partial: Omit<DailyAdjustment, 'readinessPct' | 'sleepScore' | 'formTsb'> &
    Partial<Pick<DailyAdjustment, 'readinessPct' | 'sleepScore' | 'formTsb'>>,
  ctx: {
    readinessPct: number;
    sleepScore: number | null;
    formTsb: number;
    readiness?: ReadinessBreakdown;
    sentinel?: SentinelReport;
  },
): DailyAdjustment {
  return {
    ...partial,
    readinessPct: partial.readinessPct ?? ctx.readinessPct,
    sleepScore: partial.sleepScore ?? ctx.sleepScore,
    formTsb: partial.formTsb ?? ctx.formTsb,
    readiness: ctx.readiness,
    sentinel: ctx.sentinel,
    whyLine: partial.whyLine ?? ctx.readiness?.dominantWhy,
  };
}

/**
 * Orchestrateur quotidien V2 — Readiness individualisé + Sentinelle + prédiction RPE.
 * Décision : Go · Adapter · Repos · RPE · Créer · Prochaine.
 */
export function computeDailyAdjustment(opts: Opts): DailyAdjustment {
  const now = opts.nowMs ?? Date.now();
  const twin = opts.twin ?? defaultDigitalTwin(opts.recoveryInput.onboarding);
  const digest = bodyAnalysisDigest(opts.recoveryInput, now);
  const musclePct = digest.readiness.score;

  const perceived = bayesianPerceivedForm({
    formTsb: opts.formTsb,
    hrvRatio: opts.hrvRatio,
    sleepScore: opts.sleepScore,
    hrvSensitivity: twin.response.hrvSensitivity,
    sleepDebtSensitivity: twin.response.sleepDebtSensitivity,
  });

  const readiness = computeReadinessScore({
    twin,
    hrvRatio: opts.hrvRatio,
    sleepScore: opts.sleepScore,
    sleepDebtHours3d: opts.sleepDebtHours3d,
    formTsb: perceived.score,
    muscleReadinessPct: musclePct,
    recentRpeDelta: opts.recentRpeDelta,
    lifeStress01: opts.lifeStress01,
  });

  const sentinel = computeSentinel({
    acwr: opts.acwr,
    acwrGreenMax: twin.response.acwrGreenMax,
    hrvTrend14d: opts.hrvTrend14d,
    rpeCreep: opts.rpeCreep,
    weeklyVolumeIncreasePct: opts.weeklyVolumeIncreasePct,
    volumeIncreaseMaxPct: twin.response.volumeIncreaseMaxPct,
  });

  const readinessPct = readiness.total;
  const sleepScore =
    opts.sleepScore != null && Number.isFinite(opts.sleepScore)
      ? opts.sleepScore
      : null;
  const formTsb = opts.formTsb;
  const ctx = { readinessPct, sleepScore, formTsb, readiness, sentinel };

  const sleepBit =
    sleepScore == null
      ? 'Sommeil non saisi'
      : sleepScore >= 70
        ? 'Sommeil correct'
        : sleepScore >= 50
          ? 'Sommeil moyen'
          : 'Sommeil faible';

  const readyBit = `Readiness ${readinessPct}%`;
  const why = readiness.dominantWhy;

  if (opts.pendingRpe) {
    return baseReturn(
      {
        kind: 'rpe_pending',
        statusLine: `${readyBit} · ${sleepBit} · Feedback effort en attente`,
        watchOut: true,
        volumeFactor: 1,
        coachMessage: 'Valide ton ressenti pour que le coach personnalise la suite.',
        whyLine: why,
      },
      ctx,
    );
  }

  const today = opts.todayWorkout;
  const isTraining = Boolean(today && today.discipline !== 'rest');

  if (!opts.hasActiveProgram && !isTraining) {
    return baseReturn(
      {
        kind: 'create',
        statusLine: `${readyBit} · ${sleepBit} · Crée ton programme`,
        watchOut: false,
        volumeFactor: 1,
        whyLine: why,
      },
      ctx,
    );
  }

  if (!isTraining) {
    const formBit =
      formTsb >= 5 ? 'Bonne forme' : formTsb <= -10 ? 'Forme en creux' : 'Forme stable';
    return baseReturn(
      {
        kind: 'start_next',
        statusLine: `${readyBit} · ${sleepBit} · ${formBit}`,
        watchOut:
          readinessPct < 45 ||
          (sleepScore != null && sleepScore < 50) ||
          sentinel.level !== 'ok',
        volumeFactor: 1,
        coachMessage:
          sentinel.level === 'ok' ? undefined : sentinel.message,
        whyLine: why,
      },
      ctx,
    );
  }

  const predictedRpe = predictSessionRpe(
    today!,
    readinessPct,
    twin.response.rpeBias,
  );
  const sessionCue = predictSessionCue(today!, readinessPct);

  const todayIso = new Date(now).toISOString().slice(0, 10);
  const skip = detectSkipPattern({
    plan: opts.recoveryInput.plan,
    activities: opts.recoveryInput.activities,
    todayIso,
  });

  if (sentinel.level === 'deload' || readinessPct < 32 || formTsb <= -28) {
    return baseReturn(
      {
        kind: 'rest',
        statusLine: `${readyBit} · ${sleepBit} · Repos conseillé`,
        watchOut: true,
        volumeFactor: 0,
        coachMessage: [
          sentinel.message,
          why,
          skip?.note,
        ]
          .filter(Boolean)
          .join(' '),
        whyLine: why,
        predictedRpe,
        sessionCue,
      },
      ctx,
    );
  }

  if (
    sentinel.level === 'adapt' ||
    readinessPct < 55 ||
    formTsb <= -12 ||
    (sleepScore != null && sleepScore < 55)
  ) {
    const factor =
      readinessPct < 42 || formTsb <= -18 || sentinel.level === 'adapt'
        ? 0.5
        : 0.7;
    return baseReturn(
      {
        kind: 'adapt',
        statusLine: `${readyBit} · ${sleepBit} · Séance à alléger`,
        watchOut: true,
        volumeFactor: factor,
        coachMessage: [
          `Ta readiness est à ${readinessPct}% : version allégée (~${Math.round(factor * 100)} %).`,
          why,
          sentinel.level !== 'ok' ? sentinel.message : null,
          skip?.note,
        ]
          .filter(Boolean)
          .join(' '),
        whyLine: why,
        predictedRpe,
        sessionCue,
      },
      ctx,
    );
  }

  const goHint = canStartLiveWorkout(today!.discipline)
    ? perceived.note || 'Bon jour pour t’entraîner'
    : 'Séance du jour prête';

  return baseReturn(
    {
      kind: 'go',
      statusLine: `${readyBit} · ${sleepBit} · ${goHint}`,
      watchOut: Boolean(skip) || sentinel.level === 'watch',
      volumeFactor: skip ? 1 - skip.suggestVolumeCutPct / 100 : 1,
      coachMessage: [skip?.note, sentinel.level === 'watch' ? sentinel.message : null]
        .filter(Boolean)
        .join(' ') || undefined,
      whyLine: why,
      predictedRpe,
      sessionCue,
    },
    ctx,
  );
}

/** Réduit la durée des steps d’une séance (mode Adapter / pas le temps). */
export function scaleWorkoutVolume(
  workout: PlannedWorkout,
  factor: number,
): PlannedWorkout {
  const f = Math.max(0.35, Math.min(1, factor));
  if (f >= 0.99) return workout;
  return {
    ...workout,
    title: `${workout.title} · allégée`,
    plannedDurationSec: workout.plannedDurationSec
      ? Math.round(workout.plannedDurationSec * f)
      : undefined,
    plannedDistanceM: workout.plannedDistanceM
      ? Math.round(workout.plannedDistanceM * f)
      : undefined,
    coachNote: [
      workout.coachNote,
      `Version adaptée (${Math.round(f * 100)} % du volume prévu).`,
    ]
      .filter(Boolean)
      .join(' '),
    steps: workout.steps.map((s) => ({
      ...s,
      durationSec: s.durationSec ? Math.max(60, Math.round(s.durationSec * f)) : s.durationSec,
      distanceMeters: s.distanceMeters
        ? Math.max(50, Math.round(s.distanceMeters * f))
        : s.distanceMeters,
    })),
  };
}
