import type { PlannedWorkout, WorkoutStep } from '../types/domain';
import { addDaysIso, toLocalDateIso } from './sleepCalendar';

export type ProgramScheduleMode = 'stack' | 'spread';

export type SameDayOverlap = {
  date: string;
  count: number;
  titles: string[];
};

/** Classe de charge pour espacer correctement les séances. */
export type WorkoutLoadClass = 'quality' | 'long' | 'easy' | 'strength' | 'other';

export function classifyWorkoutLoad(w: PlannedWorkout): WorkoutLoadClass {
  if (w.discipline === 'rest' || w.discipline === 'mobility') return 'other';
  if (w.discipline === 'strength' || w.discipline === 'ppg') return 'strength';

  const t = `${w.title ?? ''} ${w.coachNote ?? ''}`.toLowerCase();
  if (/renfo|renforcement|ppg|muscu|force\b|salle/.test(t)) return 'strength';
  if (/longue|long run|sortie longue|endurance longue/.test(t)) return 'long';
  if (
    /vma|seuil|allure|tempo|interval|qualité|fartlek|cruise|spécifique|5\s*km|10\s*km|semi|marathon|vo2|répétition/.test(
      t,
    )
  ) {
    return 'quality';
  }
  if (w.discipline === 'brick') return 'quality';
  return 'easy';
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T12:00:00').getTime();
  const b = new Date(bIso + 'T12:00:00').getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatShortDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function weekKey(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Jours calendaires minimum entre deux classes (1 = jours consécutifs OK). */
function minCalendarGap(a: WorkoutLoadClass, b: WorkoutLoadClass): number {
  if (a === 'other' || b === 'other') return 0;
  if (a === 'quality' && b === 'quality') return 2;
  if ((a === 'quality' && b === 'long') || (a === 'long' && b === 'quality')) return 2;
  if (a === 'long' && b === 'long') return 2;
  if (a === 'strength' && b === 'strength') return 2;
  if (
    (a === 'strength' && (b === 'quality' || b === 'long')) ||
    (b === 'strength' && (a === 'quality' || a === 'long'))
  ) {
    return 2;
  }
  // En répartissant un 2e programme : éviter aussi le « tous les jours »
  return 1;
}

type OccupiedDay = { load: WorkoutLoadClass };

/**
 * Place les séances du nouveau programme sur des jours libres, en respectant
 * des jours de repos et l’espacement qualité / renfo (pas un packing jour par jour).
 */
export function spreadIncomingSessions(
  existing: PlannedWorkout[],
  incoming: PlannedWorkout[],
  preferredDows: number[] = [],
): PlannedWorkout[] {
  const today = toLocalDateIso();
  const occupied = new Map<string, OccupiedDay>();

  for (const w of existing) {
    if (w.discipline === 'rest' || w.date < today) continue;
    occupied.set(w.date, { load: classifyWorkoutLoad(w) });
  }

  const sorted = [...incoming].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const result: PlannedWorkout[] = [];

  for (const w of sorted) {
    if (w.discipline === 'rest' || w.date < today) {
      result.push(w);
      continue;
    }

    const load = classifyWorkoutLoad(w);
    let date = w.date;
    const currentScore = occupied.has(date)
      ? 999
      : placementScore(date, w.date, load, occupied, preferredDows);
    const best = findBestFreeDay(w.date, load, occupied, preferredDows, today);
    if (best != null) {
      const bestScore = placementScore(best, w.date, load, occupied, preferredDows);
      // Déplace si jour pris, ou si un autre jour est clairement mieux espacé
      if (occupied.has(date) || bestScore + 12 < currentScore) {
        date = best;
      }
    }

    occupied.set(date, { load });

    if (date !== w.date) {
      result.push({
        ...w,
        date,
        coachNote: [
          `Répartie pour un meilleur espacement (${formatShortDate(w.date)} → ${formatShortDate(date)}).`,
          w.coachNote,
        ]
          .filter(Boolean)
          .join(' '),
      });
    } else {
      result.push(w);
    }
  }

  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

/**
 * Décale les séances *nouvelles* qui collent trop à une qualité / renfo voisine
 * (jours distincts). Ne force pas le départ d’un jour déjà pris (superposition).
 */
export function rebalanceIncomingAgainstPlan(
  existing: PlannedWorkout[],
  incoming: PlannedWorkout[],
  preferredDows: number[] = [],
): PlannedWorkout[] {
  const today = toLocalDateIso();
  const incomingIds = new Set(incoming.map((w) => w.id));
  const occupied = new Map<string, OccupiedDay>();

  for (const w of existing) {
    if (w.discipline === 'rest' || w.date < today) continue;
    if (incomingIds.has(w.id)) continue;
    occupied.set(w.date, { load: classifyWorkoutLoad(w) });
  }

  const movable = [...incoming]
    .filter((w) => w.discipline !== 'rest' && w.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const placed: PlannedWorkout[] = incoming.filter(
    (w) => w.discipline === 'rest' || w.date < today,
  );

  for (const w of movable) {
    const load = classifyWorkoutLoad(w);
    let date = w.date;
    if (hasAdjacentLoadConflict(w.date, load, occupied)) {
      const best = findBestFreeDay(w.date, load, occupied, preferredDows, today);
      if (best != null) {
        const better =
          placementScore(best, w.date, load, occupied, preferredDows) + 10 <
          placementScore(w.date, w.date, load, occupied, preferredDows);
        if (better) date = best;
      }
    }
    const prev = occupied.get(date);
    if (!prev || loadRank(load) >= loadRank(prev.load)) {
      occupied.set(date, { load });
    }
    if (date !== w.date) {
      placed.push({
        ...w,
        date,
        coachNote: [
          `Décalée pour espacer les séances dures / renfo (${formatShortDate(w.date)} → ${formatShortDate(date)}).`,
          w.coachNote,
        ]
          .filter(Boolean)
          .join(' '),
      });
    } else {
      placed.push(w);
    }
  }

  return placed.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

function loadRank(load: WorkoutLoadClass): number {
  switch (load) {
    case 'quality':
      return 4;
    case 'long':
      return 3;
    case 'strength':
      return 2;
    case 'easy':
      return 1;
    default:
      return 0;
  }
}

/** Conflit sur des jours distincts (gap > 0) — le même jour reste OK pour superposer. */
function hasAdjacentLoadConflict(
  date: string,
  load: WorkoutLoadClass,
  occupied: Map<string, OccupiedDay>,
): boolean {
  for (const [otherDate, meta] of occupied) {
    const gap = Math.abs(daysBetween(date, otherDate));
    if (gap === 0) continue;
    if (gap < minCalendarGap(load, meta.load)) return true;
  }
  return false;
}

function weekSessionCount(occupied: Map<string, OccupiedDay>, iso: string): number {
  const key = weekKey(iso);
  let n = 0;
  for (const d of occupied.keys()) {
    if (weekKey(d) === key) n += 1;
  }
  return n;
}

function placementScore(
  candidate: string,
  original: string,
  load: WorkoutLoadClass,
  occupied: Map<string, OccupiedDay>,
  preferredDows: number[],
): number {
  let score = Math.abs(daysBetween(original, candidate)) * 2;

  const dow = new Date(candidate + 'T12:00:00').getDay();
  if (preferredDows.length > 0 && !preferredDows.includes(dow)) {
    score += 12;
  }

  const weekCount = weekSessionCount(occupied, candidate);
  if (weekCount >= 6) score += 50;
  else if (weekCount >= 5) score += 28;
  else if (weekCount >= 4) score += 10;

  let minGap = 99;
  for (const [otherDate, meta] of occupied) {
    const gap = Math.abs(daysBetween(candidate, otherDate));
    minGap = Math.min(minGap, gap);
    const need = minCalendarGap(load, meta.load);
    if (gap < need) {
      score += 45 + (need - gap) * 20;
    } else if (gap === 1) {
      // Jours consécutifs : pénalité douce (évite le packing « tous les jours »)
      score += load === 'easy' && meta.load === 'easy' ? 8 : 18;
    }
  }

  if (minGap < 99) {
    score -= Math.min(12, minGap * 3);
  }

  return score;
}

function findBestFreeDay(
  fromIso: string,
  load: WorkoutLoadClass,
  occupied: Map<string, OccupiedDay>,
  preferredDows: number[],
  today: string,
): string | null {
  const candidates: string[] = [];
  // Cherche plutôt vers l'avant pour ne pas tasser avant la date prévue
  for (let delta = -10; delta <= 42; delta++) {
    const c = addDaysIso(fromIso, delta);
    if (c < today || occupied.has(c)) continue;
    candidates.push(c);
  }
  if (!candidates.length) return null;

  candidates.sort(
    (a, b) =>
      placementScore(a, fromIso, load, occupied, preferredDows) -
        placementScore(b, fromIso, load, occupied, preferredDows) ||
      a.localeCompare(b),
  );
  return candidates[0] ?? null;
}

/**
 * Jours où le nouveau programme empile ≥ 2 séances avec le planning existant
 * (hors repos).
 */
export function findSameDayOverlaps(
  existing: PlannedWorkout[],
  incoming: PlannedWorkout[],
): SameDayOverlap[] {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, PlannedWorkout[]>();

  for (const w of [...existing, ...incoming]) {
    if (w.discipline === 'rest' || w.date < today) continue;
    const list = byDate.get(w.date) ?? [];
    list.push(w);
    byDate.set(w.date, list);
  }

  const overlaps: SameDayOverlap[] = [];
  for (const [date, list] of byDate) {
    if (list.length < 2) continue;
    overlaps.push({
      date,
      count: list.length,
      titles: list.map((w) => w.title),
    });
  }
  return overlaps.sort((a, b) => a.date.localeCompare(b.date));
}

export function formatOverlapSummary(overlaps: SameDayOverlap[], max = 4): string {
  const shown = overlaps.slice(0, max).map((o) => {
    const d = new Date(o.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${d} (${o.count} séances)`;
  });
  const more = overlaps.length > max ? ` · +${overlaps.length - max}` : '';
  return shown.join(' · ') + more;
}

/**
 * Concurrent training (même jour) — pratique coach / littérature :
 * - Empiler endurance + force est possible, mais on évite deux séances « dures » à pleine charge.
 * - Volume et intensité légèrement baissés sur **chaque** séance du jour (−15 % si 2, −20 % si ≥3).
 * - RPE −1 (plafond blessure / récupération).
 */
export function applyConcurrentDaySoftening(plan: PlannedWorkout[]): PlannedWorkout[] {
  const today = new Date().toISOString().slice(0, 10);
  const byDate = new Map<string, PlannedWorkout[]>();

  for (const w of plan) {
    if (w.discipline === 'rest' || w.date < today) continue;
    const list = byDate.get(w.date) ?? [];
    list.push(w);
    byDate.set(w.date, list);
  }

  const softenIds = new Map<string, { pct: number; count: number }>();
  for (const [, list] of byDate) {
    if (list.length < 2) continue;
    const pct = list.length >= 3 ? 20 : 15;
    for (const w of list) {
      softenIds.set(w.id, { pct, count: list.length });
    }
  }

  if (softenIds.size === 0) return plan;

  return plan.map((w) => {
    const meta = softenIds.get(w.id);
    if (!meta) return w;
    return softenWorkoutForConcurrentDay(w, meta.pct, meta.count);
  });
}

function softenWorkoutForConcurrentDay(
  w: PlannedWorkout,
  pct: number,
  dayCount: number,
): PlannedWorkout {
  if (w.coachNote?.includes('double journée')) return w;

  const factor = 1 - pct / 100;
  const note =
    dayCount >= 3
      ? `Double / triple journée (${dayCount} séances) — volume −${pct} % et intensité allégée (pratique concurrent training : limiter la fatigue cumulée).`
      : `Deux séances le même jour — volume −${pct} % et intensité allégée pour préserver la récupération (idéal : ≥6 h entre les deux).`;

  return {
    ...w,
    title: w.title.includes('(allégé)') ? w.title : `${w.title} (allégé)`,
    coachNote: note,
    expectedRpe: w.expectedRpe
      ? Math.max(2, w.expectedRpe - (dayCount >= 3 ? 2 : 1))
      : w.expectedRpe,
    plannedDistanceM: w.plannedDistanceM
      ? Math.max(400, Math.round(w.plannedDistanceM * factor))
      : undefined,
    plannedDurationSec: w.plannedDurationSec
      ? Math.max(600, Math.round(w.plannedDurationSec * factor))
      : undefined,
    steps: w.steps.map((s) => softenStep(s, factor)),
  };
}

function softenStep(step: WorkoutStep, factor: number): WorkoutStep {
  const next: WorkoutStep = { ...step };
  if (next.distanceMeters) {
    next.distanceMeters = Math.max(50, Math.round(next.distanceMeters * factor));
  }
  if (next.durationSec) {
    next.durationSec = Math.max(30, Math.round(next.durationSec * factor));
  }
  const target = next.target;
  if (target?.type === 'pace' && target.minSecPerKm != null && target.maxSecPerKm != null) {
    next.target = {
      ...target,
      minSecPerKm: Math.round(target.minSecPerKm * 1.05),
      maxSecPerKm: Math.round(target.maxSecPerKm * 1.05),
    };
  }
  if (target?.type === 'power' && target.minWatts != null && target.maxWatts != null) {
    next.target = {
      ...target,
      minWatts: Math.round(target.minWatts * factor),
      maxWatts: Math.round(target.maxWatts * factor),
    };
  }
  if (target?.type === 'hr' && target.minBpm != null && target.maxBpm != null) {
    next.target = {
      ...target,
      minBpm: Math.round(target.minBpm * 0.96),
      maxBpm: Math.round(target.maxBpm * 0.96),
    };
  }
  return next;
}
