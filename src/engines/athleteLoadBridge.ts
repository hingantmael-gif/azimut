/**
 * Pont Readiness · Calibration (twin) · Sentinelle · Banister → plan.
 * Utilisé à la création de programme et pour recalibrer les séances futures.
 */

import type {
  HealthSnapshot,
  OnboardingAnswers,
  PlannedWorkout,
  RpeFeedback,
  StravaActivity,
} from '../types/domain';
import {
  defaultDigitalTwin,
  type AthleteDigitalTwin,
} from './athleteDigitalTwin';
import { bayesianPerceivedForm } from './banisterPlus';
import { banisterLoadFromSession, computeAcwr } from './core';
import { scaleWorkoutVolume } from './dailyAdjustment';
import { bodyAnalysisDigest } from './muscleRecovery';
import { computeReadinessScore, type ReadinessBreakdown } from './readinessScore';
import { computeSentinel, type SentinelReport } from './sentinel';

export type AthleteLoadSnapshot = {
  readinessPct: number;
  readiness: ReadinessBreakdown;
  sentinel: SentinelReport;
  formTsb: number;
  acwr: number | null;
  sleepScore: number | null;
  hrvRatio: number | null;
  sleepDebtHours3d: number | null;
  recentRpeDelta: number | null;
  hrvTrend14d: number | null;
  rpeCreep: number | null;
  weeklyVolumeIncreasePct: number | null;
  twin: AthleteDigitalTwin;
  /** Facteur semaine 0 (création) */
  week0Factor: number;
  /** Facteur semaine 1 */
  week1Factor: number;
  /** Facteur séances à venir (sync continue) */
  upcomingFactor: number;
  coachMessage: string;
  /** Clé anti-thrash (niveau + bande readiness + jour) */
  syncKey: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isoDaysAgo(fromIso: string, days: number): string {
  const d = new Date(`${fromIso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function hrvRatioFromHealth(
  hrv: HealthSnapshot['hrv'] | undefined,
): number | null {
  if (!hrv?.rmssdNight || !hrv?.baseline7d || hrv.baseline7d <= 0) {
    return null;
  }
  return hrv.rmssdNight / hrv.baseline7d;
}

/** Dette de sommeil approx. sur 3 nuits (cible 7,5 h). */
export function estimateSleepDebtHours3d(
  history: HealthSnapshot['sleepHistory'] | undefined,
): number | null {
  if (!history?.length) return null;
  const nights = [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  if (nights.length === 0) return null;
  let debt = 0;
  let counted = 0;
  for (const night of nights) {
    const h =
      night.totalMinutes > 0
        ? night.totalMinutes / 60
        : night.score != null
          ? 4 + (night.score / 100) * 4
          : null;
    if (h == null) continue;
    debt += Math.max(0, 7.5 - h);
    counted += 1;
  }
  if (counted === 0) return null;
  return Math.round(debt * 10) / 10;
}

/** Tendance HRV via deltaPct du snapshot (négatif = baisse). */
export function estimateHrvTrend14d(
  hrv: HealthSnapshot['hrv'] | undefined,
): number | null {
  if (!hrv || !Number.isFinite(hrv.deltaPct)) return null;
  return Math.round((hrv.deltaPct / 100) * 1000) / 1000;
}

/** Dérive RPE récente vs plus ancienne (positif = effort qui monte). */
export function estimateRpeCreep(feedbacks: RpeFeedback[]): number | null {
  if (feedbacks.length < 4) return null;
  const scored = [...feedbacks]
    .filter((f) => f.submittedAt)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  if (scored.length < 4) return null;
  const recent = scored.slice(0, 3);
  const older = scored.slice(3, 8);
  if (older.length === 0) return null;
  const mean = (xs: RpeFeedback[]) =>
    xs.reduce((sum, x) => sum + x.rpe, 0) / xs.length;
  return Math.round((mean(recent) - mean(older)) * 100) / 100;
}

/** Hausse de volume km semaine courante vs moyenne 3 semaines précédentes. */
export function estimateWeeklyVolumeIncreasePct(
  activities: StravaActivity[],
  asOfIso: string,
): number | null {
  const asOf = asOfIso.slice(0, 10);
  const kmInRange = (from: string, to: string) => {
    let km = 0;
    for (const a of activities) {
      const d = a.startDate.slice(0, 10);
      if (d >= from && d <= to) km += a.distanceM / 1000;
    }
    return km;
  };
  const w0 = kmInRange(isoDaysAgo(asOf, 6), asOf);
  const prev: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const end = isoDaysAgo(asOf, 7 * i);
    const start = isoDaysAgo(asOf, 7 * i + 6);
    prev.push(kmInRange(start, end));
  }
  const avgPrev = prev.reduce((sum, n) => sum + n, 0) / prev.length;
  if (avgPrev < 8 && w0 < 8) return null;
  if (avgPrev < 1) return w0 > 12 ? 80 : null;
  return Math.round(((w0 - avgPrev) / avgPrev) * 100);
}

export function recentRpeDelta(feedbacks: RpeFeedback[]): number | null {
  if (feedbacks.length < 2) return null;
  const sorted = [...feedbacks].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
  const a = sorted[0]?.rpe;
  const b = sorted[1]?.rpe;
  if (a == null || b == null) return null;
  return a - b;
}

function loadPointsFromActivities(activities: StravaActivity[]) {
  return activities.map((a) => ({
    date: a.startDate.slice(0, 10),
    load: banisterLoadFromSession(a.movingSec, 6),
  }));
}

function factorsFromSignals(opts: {
  readinessPct: number;
  formTsb: number;
  sentinel: SentinelReport;
  twin: AthleteDigitalTwin;
}): Pick<
  AthleteLoadSnapshot,
  'week0Factor' | 'week1Factor' | 'upcomingFactor' | 'coachMessage'
> {
  let week0 = 1;
  let week1 = 1;
  let upcoming = 1;
  const bits: string[] = [];

  if (opts.sentinel.suggestDeloadWeek || opts.sentinel.level === 'deload') {
    week0 = 0.62;
    week1 = 0.78;
    upcoming = 0.68;
    bits.push('Sentinelle : semaine allégée pour digérer la charge');
  } else if (opts.sentinel.level === 'adapt') {
    week0 = 0.78;
    week1 = 0.88;
    upcoming = 0.82;
    bits.push('Sentinelle : volume un cran plus bas');
  } else if (opts.sentinel.level === 'watch') {
    week0 = 0.9;
    week1 = 0.95;
    upcoming = 0.92;
    bits.push('Sentinelle : marge de sécurité');
  }

  if (opts.readinessPct < 35) {
    week0 = Math.min(week0, 0.55);
    week1 = Math.min(week1, 0.72);
    upcoming = Math.min(upcoming, 0.6);
    bits.push(`Readiness basse (${opts.readinessPct} %)`);
  } else if (opts.readinessPct < 50) {
    week0 = Math.min(week0, 0.78);
    week1 = Math.min(week1, 0.88);
    upcoming = Math.min(upcoming, 0.85);
    bits.push(`Readiness moyenne (${opts.readinessPct} %)`);
  } else if (opts.readinessPct >= 75 && opts.sentinel.level === 'ok') {
    // Légère confiance — plafonnée par le twin
    const bump = 1 + Math.min(0.06, opts.twin.response.volumeIncreaseMaxPct / 400);
    week0 = Math.min(1.05, week0 * bump);
    week1 = Math.min(1.08, week1 * bump);
  }

  if (opts.formTsb <= -20) {
    week0 = Math.min(week0, 0.7);
    week1 = Math.min(week1, 0.82);
    upcoming = Math.min(upcoming, 0.75);
    bits.push('Forme (TSB) en creux');
  } else if (opts.formTsb <= -10) {
    week0 = Math.min(week0, 0.85);
    upcoming = Math.min(upcoming, 0.9);
  }

  const conf = opts.twin.modelConfidence;
  if (conf < 0.35) {
    // Calibration faible → démarrage plus prudent
    week0 *= 0.92;
    week1 *= 0.95;
    bits.push(`Calibration coach ${Math.round(conf * 100)} % — démarrage prudent`);
  }

  week0 = clamp(week0, 0.45, 1.08);
  week1 = clamp(week1, 0.5, 1.1);
  upcoming = clamp(upcoming, 0.45, 1);

  const coachMessage =
    bits.length > 0
      ? `Plan relié à ta forme : ${bits.join(' · ')}.`
      : 'Charge dans une zone saine — le plan suit ta Readiness et la Sentinelle.';

  return { week0Factor: week0, week1Factor: week1, upcomingFactor: upcoming, coachMessage };
}

export function computeAthleteLoadSnapshot(input: {
  formTsb: number;
  health: HealthSnapshot;
  activities: StravaActivity[];
  feedbacks: RpeFeedback[];
  plan: PlannedWorkout[];
  onboarding?: OnboardingAnswers;
  twin?: AthleteDigitalTwin | null;
  lifeStress01?: number | null;
  asOfIso?: string;
  nowMs?: number;
}): AthleteLoadSnapshot {
  const asOf = (input.asOfIso ?? new Date().toISOString()).slice(0, 10);
  const twin =
    input.twin ??
    defaultDigitalTwin({
      level: input.onboarding?.level,
    });
  const hrvRatio = hrvRatioFromHealth(input.health.hrv);
  const sleepScore = input.health.sleep?.score ?? null;
  const sleepDebtHours3d = estimateSleepDebtHours3d(input.health.sleepHistory);
  const hrvTrend14d = estimateHrvTrend14d(input.health.hrv);
  const rpeCreep = estimateRpeCreep(input.feedbacks);
  const weeklyVolumeIncreasePct = estimateWeeklyVolumeIncreasePct(
    input.activities,
    asOf,
  );
  const recentDelta = recentRpeDelta(input.feedbacks);
  const loads = loadPointsFromActivities(input.activities);
  const acwr = computeAcwr(loads, asOf);

  const digest = bodyAnalysisDigest(
    {
      activities: input.activities,
      feedbacks: input.feedbacks,
      plan: input.plan,
      onboarding: input.onboarding,
    },
    input.nowMs ?? Date.now(),
  );

  const perceived = bayesianPerceivedForm({
    formTsb: input.formTsb,
    hrvRatio,
    sleepScore,
    hrvSensitivity: twin.response.hrvSensitivity,
    sleepDebtSensitivity: twin.response.sleepDebtSensitivity,
  });

  const readiness = computeReadinessScore({
    twin,
    hrvRatio,
    sleepScore,
    sleepDebtHours3d,
    formTsb: perceived.score,
    muscleReadinessPct: digest.readiness.score,
    recentRpeDelta: recentDelta,
    lifeStress01: input.lifeStress01,
  });

  const sentinel = computeSentinel({
    acwr: acwr.ratio,
    acwrGreenMax: twin.response.acwrGreenMax,
    hrvTrend14d,
    rpeCreep,
    weeklyVolumeIncreasePct,
    volumeIncreaseMaxPct: twin.response.volumeIncreaseMaxPct,
    recentInjuryFlag: (input.feedbacks ?? [])
      .slice()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 3)
      .some((f) => f.muscle === 'douleur_ciblee'),
  });

  const factors = factorsFromSignals({
    readinessPct: readiness.total,
    formTsb: input.formTsb,
    sentinel,
    twin,
  });

  const band =
    readiness.total >= 70 ? 'hi' : readiness.total >= 45 ? 'mid' : 'lo';
  const syncKey = `${asOf}|${sentinel.level}|${band}|${Math.round(factors.upcomingFactor * 100)}`;

  return {
    readinessPct: readiness.total,
    readiness,
    sentinel,
    formTsb: input.formTsb,
    acwr: acwr.ratio,
    sleepScore,
    hrvRatio,
    sleepDebtHours3d,
    recentRpeDelta: recentDelta,
    hrvTrend14d,
    rpeCreep,
    weeklyVolumeIncreasePct,
    twin,
    ...factors,
    syncKey,
  };
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekIndexFromStart(dateIso: string, startIso: string): number {
  const a = new Date(`${startIso.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${dateIso.slice(0, 10)}T12:00:00`).getTime();
  const days = Math.max(0, Math.round((b - a) / 86_400_000));
  return Math.floor(days / 7);
}

function scaleSession(
  w: PlannedWorkout,
  factor: number,
  note: string,
): PlannedWorkout {
  if (factor >= 0.98) return w;
  const scaled = scaleWorkoutVolume(w, factor);
  // Évite le double « allégée »
  const title = scaled.title.replace(/ · allégée$/, '').replace(/ \(adapté\)$/, '');
  return {
    ...scaled,
    title: factor < 0.75 ? `${title} (adapté)` : `${title} · calibrée`,
    coachNote: [w.coachNote, note].filter(Boolean).join(' '),
  };
}

/**
 * À la création : allège les 2 premières semaines selon Readiness / Sentinelle / TSB.
 */
export function applyAthleteLoadStartupRamp(
  plan: PlannedWorkout[],
  snap: AthleteLoadSnapshot,
  opts: { startDateIso: string; programId?: string },
): { plan: PlannedWorkout[]; message: string | null } {
  const start = opts.startDateIso.slice(0, 10);
  const note = snap.coachMessage;
  let touched = 0;
  const next = plan.map((w) => {
    if (opts.programId && w.programId && w.programId !== opts.programId) {
      return w;
    }
    if (w.discipline === 'rest') return w;
    if (w.date < start) return w;
    const wi = weekIndexFromStart(w.date, start);
    const factor = wi <= 0 ? snap.week0Factor : wi === 1 ? snap.week1Factor : 1;
    if (factor >= 0.98) return w;
    touched += 1;
    return scaleSession(w, factor, note);
  });
  if (touched === 0) {
    return {
      plan,
      message:
        snap.sentinel.level === 'ok'
          ? 'Readiness & Sentinelle OK — démarrage sur le volume prévu.'
          : null,
    };
  }
  return {
    plan: next,
    message: `${note} (${touched} séance${touched > 1 ? 's' : ''} calibrée${touched > 1 ? 's' : ''} à la création).`,
  };
}

/**
 * Sync continue : recalibre les séances futures (horizon) selon la charge actuelle.
 * Ne touche pas aux séances passées / déjà marquées done.
 */
export function adaptPlanFromAthleteLoad(
  plan: PlannedWorkout[],
  snap: AthleteLoadSnapshot,
  opts: {
    fromDateIso: string;
    horizonDays?: number;
    completedWorkoutIds?: Set<string>;
  },
): { plan: PlannedWorkout[]; message: string | null; changed: boolean } {
  const from = opts.fromDateIso.slice(0, 10);
  const horizon = opts.horizonDays ?? (snap.sentinel.suggestDeloadWeek ? 10 : 5);
  const until = addDaysIso(from, horizon);
  const factor = snap.upcomingFactor;

  // Zone saine + bonne readiness → pas de réécriture (évite le yo-yo)
  if (snap.sentinel.level === 'ok' && snap.readinessPct >= 55 && factor >= 0.95) {
    return { plan, message: null, changed: false };
  }

  let changed = false;
  const next = plan.map((w) => {
    if (w.discipline === 'rest') return w;
    if (w.date < from || w.date > until) return w;
    if (opts.completedWorkoutIds?.has(w.id)) return w;
    // Ne pas re-réduire indéfiniment les séances déjà fortement adaptées
    if (/\(adapté\)|· calibrée|· allégée/.test(w.title) && factor > 0.85) {
      return w;
    }
    const scaled = scaleSession(w, factor, snap.coachMessage);
    if (scaled !== w) changed = true;
    return scaled;
  });

  return {
    plan: next,
    message: changed ? snap.coachMessage : null,
    changed,
  };
}
