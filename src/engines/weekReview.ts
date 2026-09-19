import { computeTrimp } from './sportsScience';
import type { PlannedWorkout, StravaActivity } from '../types/domain';

export type WeekSlice = {
  startIso: string;
  endIso: string;
  load: number;
  sessionsDone: number;
  sessionsPlanned: number;
  km: number;
  hours: number;
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** Charge TRIMP-ish d’une activité (durée × RPE estimé via FC ou défaut 6). */
function activityLoad(a: StravaActivity): number {
  const min = Math.max(1, (a.movingSec || a.elapsedSec) / 60);
  let rpe = 6;
  if (a.avgHr != null) {
    if (a.avgHr >= 165) rpe = 8;
    else if (a.avgHr >= 145) rpe = 7;
    else if (a.avgHr >= 125) rpe = 6;
    else rpe = 5;
  }
  return computeTrimp(min, rpe);
}

function plannedLoad(w: PlannedWorkout): number {
  if (w.discipline === 'rest') return 0;
  const min = Math.max(10, (w.plannedDurationSec ?? 1800) / 60);
  return computeTrimp(min, w.expectedRpe ?? 6);
}

function inRange(iso: string, start: string, end: string): boolean {
  const d = iso.slice(0, 10);
  return d >= start && d <= end;
}

export function buildWeekSlice(
  startIso: string,
  endIso: string,
  activities: StravaActivity[],
  plan: PlannedWorkout[],
): WeekSlice {
  const acts = activities.filter((a) =>
    inRange(a.startDate, startIso, endIso),
  );
  const planned = plan.filter(
    (w) => inRange(w.date, startIso, endIso) && w.discipline !== 'rest',
  );
  const doneDates = new Set(acts.map((a) => a.startDate.slice(0, 10)));
  const sessionsDone = Math.max(
    acts.length,
    planned.filter((w) => doneDates.has(w.date)).length,
  );
  return {
    startIso,
    endIso,
    load: Math.round(acts.reduce((s, a) => s + activityLoad(a), 0)),
    sessionsDone,
    sessionsPlanned: planned.length,
    km: Math.round((acts.reduce((s, a) => s + a.distanceM, 0) / 1000) * 10) / 10,
    hours:
      Math.round(
        (acts.reduce((s, a) => s + (a.movingSec || a.elapsedSec), 0) / 3600) * 10,
      ) / 10,
  };
}

export type WeekReviewSummary = {
  current: WeekSlice;
  previous: WeekSlice;
  loadDeltaPct: number | null;
  sessionsDelta: number;
  formTsb: number;
  formTrend: 'up' | 'down' | 'flat';
  highlight: string;
};

/** Bilan 7 derniers jours vs 7 précédents + forme Banister. */
export function buildWeekReview(opts: {
  activities: StravaActivity[];
  plan: PlannedWorkout[];
  formTsb: number;
  asOf?: Date;
}): WeekReviewSummary {
  const asOf = opts.asOf ?? new Date();
  const end = isoDay(asOf);
  const start = addDays(end, -6);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -6);

  const current = buildWeekSlice(start, end, opts.activities, opts.plan);
  const previous = buildWeekSlice(prevStart, prevEnd, opts.activities, opts.plan);

  const loadDeltaPct =
    previous.load > 0
      ? Math.round(((current.load - previous.load) / previous.load) * 100)
      : current.load > 0
        ? 100
        : null;

  const formTsb = opts.formTsb;
  const formTrend: WeekReviewSummary['formTrend'] =
    formTsb >= 5 ? 'up' : formTsb <= -10 ? 'down' : 'flat';

  const ratio =
    current.sessionsPlanned > 0
      ? current.sessionsDone / current.sessionsPlanned
      : current.sessionsDone > 0
        ? 1
        : 0;

  let highlight: string;
  if (current.sessionsPlanned === 0 && current.sessionsDone === 0) {
    highlight = 'Semaine calme — crée ou relance un programme pour reprendre le rythme.';
  } else if (ratio >= 0.85) {
    highlight = 'Belle régularité : tu as enchaîné la plupart des séances prévues.';
  } else if (ratio >= 0.5) {
    highlight = 'Semaine correcte — quelques séances manquées, le plan reste tenable.';
  } else if (formTrend === 'down') {
    highlight = 'Charge en retrait et forme en creux : privilégie récup et qualité.';
  } else {
    highlight = 'Charge légère cette semaine — une sortie structurée relancera la tendance.';
  }

  return {
    current,
    previous,
    loadDeltaPct,
    sessionsDelta: current.sessionsDone - previous.sessionsDone,
    formTsb,
    formTrend,
    highlight,
  };
}
