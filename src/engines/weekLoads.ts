/**
 * Charge d'entraînement par semaine à partir d'un plan généré — fonctions pures
 * (sans React) pour rester testables. Utilisé par l'aperçu de l'assistant de programme.
 */
import type { PlannedWorkout } from '../types/domain';

export type WeekLoad = {
  /** 0 = première semaine du plan. */
  index: number;
  /** Minutes d'entraînement planifiées. */
  minutes: number;
  sessions: number;
  kind: 'build' | 'deload' | 'peak' | 'taper';
};

const DAY_MS = 86_400_000;

function weekKey(iso: string): number {
  // Lundi de la semaine (UTC) → nombre de jours depuis l'epoch.
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) return NaN;
  const day = Math.floor(t / DAY_MS);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // 0 = lundi
  return day - dow;
}

function workoutMinutes(w: PlannedWorkout): number {
  if (w.discipline === 'rest') return 0;
  if (w.plannedDurationSec && w.plannedDurationSec > 0) return w.plannedDurationSec / 60;
  const stepSec = (w.steps ?? []).reduce(
    (s, st) => s + (st.durationSec ?? 0) * (st.repeat ?? 1),
    0,
  );
  if (stepSec > 0) return stepSec / 60;
  // Repli : distance × allure moyenne (6 min/km) — jamais 0 pour une séance réelle.
  return w.plannedDistanceM && w.plannedDistanceM > 0 ? (w.plannedDistanceM / 1000) * 6 : 30;
}

/**
 * Charge par semaine à partir d'un plan généré (fonction pure, testable).
 * Classe chaque semaine : pic (max), décharge (creux net après une semaine plus chargée),
 * affûtage (dernières semaines en baisse), sinon montée.
 */
export function computeWeekLoads(plan: PlannedWorkout[]): WeekLoad[] {
  const byWeek = new Map<number, { minutes: number; sessions: number }>();
  for (const w of plan) {
    if (w.discipline === 'rest') continue;
    const key = weekKey(w.date);
    if (!Number.isFinite(key)) continue;
    const cur = byWeek.get(key) ?? { minutes: 0, sessions: 0 };
    cur.minutes += workoutMinutes(w);
    cur.sessions += 1;
    byWeek.set(key, cur);
  }
  const keys = [...byWeek.keys()].sort((a, b) => a - b);
  if (keys.length === 0) return [];

  const minutes = keys.map((k) => byWeek.get(k)!.minutes);
  const max = Math.max(...minutes);
  const peakIdx = minutes.indexOf(max);
  const last = keys.length - 1;

  return keys.map((k, i) => {
    const m = minutes[i]!;
    let kind: WeekLoad['kind'] = 'build';
    if (i === peakIdx) kind = 'peak';
    else if (i > 0 && m <= minutes[i - 1]! * 0.85 && i < last - 1) kind = 'deload';
    else if (i > peakIdx && i >= last - 2 && m < max * 0.9) kind = 'taper';
    return { index: i, minutes: Math.round(m), sessions: byWeek.get(k)!.sessions, kind };
  });
}
