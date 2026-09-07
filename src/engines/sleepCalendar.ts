import type { HealthSnapshot, SleepMetrics, WatchBrandId } from '../types/domain';

const MAX_SLEEP_NIGHTS = 120;
/** Moyenne dès la 1ʳᵉ nuit du mois */
export const MIN_NIGHTS_FOR_MONTHLY_AVG = 1;

export function upsertSleepNight(
  health: HealthSnapshot,
  night: SleepMetrics,
): HealthSnapshot {
  const history = [...(health.sleepHistory ?? [])];
  const idx = history.findIndex((n) => n.date === night.date);
  if (idx >= 0) history[idx] = night;
  else history.push(night);
  history.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = history.slice(-MAX_SLEEP_NIGHTS);
  const latest = trimmed.length > 0 ? trimmed[trimmed.length - 1] : night;
  return {
    ...health,
    // Toujours la nuit la plus récente chronologiquement (pas une rétro-saisie plus ancienne)
    sleep: latest,
    sleepHistory: trimmed,
  };
}

/** Efface une nuit (saisie erronée) — la « dernière nuit » redevient la plus récente restante. */
export function removeSleepNight(
  health: HealthSnapshot,
  date: string,
): HealthSnapshot {
  const history = (health.sleepHistory ?? [])
    .filter((n) => n.date !== date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const trimmed = history.slice(-MAX_SLEEP_NIGHTS);
  const latest = trimmed.length > 0 ? trimmed[trimmed.length - 1] : undefined;
  const keepCurrent =
    health.sleep && health.sleep.date !== date ? health.sleep : undefined;
  return {
    ...health,
    sleep: keepCurrent ?? latest,
    sleepHistory: trimmed,
  };
}

export function sleepNightsInMonth(
  history: SleepMetrics[] | undefined,
  year: number,
  monthIndex: number,
): SleepMetrics[] {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return (history ?? []).filter((n) => n.date.startsWith(prefix));
}

export type MonthlySleepStats = {
  average: number;
  averageMinutes: number;
  count: number;
  year: number;
  monthIndex: number;
};

/** Moyenne score + durée dès qu’il y a ≥ 1 nuit dans le mois */
export function monthlySleepAverage(
  history: SleepMetrics[] | undefined,
  year: number,
  monthIndex: number,
): MonthlySleepStats | null {
  const nights = sleepNightsInMonth(history, year, monthIndex);
  if (nights.length < MIN_NIGHTS_FOR_MONTHLY_AVG) {
    return null;
  }
  const sumScore = nights.reduce((acc, n) => acc + n.score, 0);
  const withDuration = nights.filter((n) => n.totalMinutes > 0);
  const sumMin = withDuration.reduce((acc, n) => acc + n.totalMinutes, 0);
  return {
    average: Math.round(sumScore / nights.length),
    averageMinutes:
      withDuration.length > 0 ? Math.round(sumMin / withDuration.length) : 0,
    count: nights.length,
    year,
    monthIndex,
  };
}

/** Mois passés (hors mois affiché) qui ont au moins une nuit, du plus récent au plus ancien */
export function previousMonthsWithSleep(
  history: SleepMetrics[] | undefined,
  currentYear: number,
  currentMonthIndex: number,
  limit = 12,
): MonthlySleepStats[] {
  const keys = new Set<string>();
  for (const n of history ?? []) {
    const y = Number(n.date.slice(0, 4));
    const m = Number(n.date.slice(5, 7)) - 1;
    if (y > currentYear || (y === currentYear && m >= currentMonthIndex)) continue;
    keys.add(`${y}-${m}`);
  }
  return [...keys]
    .map((k) => {
      const [ys, ms] = k.split('-');
      return monthlySleepAverage(history, Number(ys), Number(ms));
    })
    .filter((x): x is MonthlySleepStats => x != null)
    .sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)
    .slice(0, limit);
}

export function scoreForDate(
  history: SleepMetrics[] | undefined,
  dateIso: string,
): number | undefined {
  return history?.find((n) => n.date === dateIso)?.score;
}

export function nightForDate(
  history: SleepMetrics[] | undefined,
  dateIso: string,
): SleepMetrics | undefined {
  return history?.find((n) => n.date === dateIso);
}

/** Date calendaire (YYYY-MM-DD) locale à partir d’un Instant ISO. */
export function toLocalDateIso(isoOrDate: string | Date = new Date()): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return toLocalDateIso(dt);
}

/**
 * Première date saisissable = jour d’inscription du compte.
 * Pas de nuit avant la création du compte.
 */
export function earliestSleepDateIso(accountCreatedAt?: string | null): string {
  if (!accountCreatedAt) return toLocalDateIso();
  return toLocalDateIso(accountCreatedAt);
}

export function isSleepDateAllowed(
  dateIso: string,
  opts: { accountCreatedAt?: string | null; todayIso?: string },
): boolean {
  const today = opts.todayIso ?? toLocalDateIso();
  const earliest = earliestSleepDateIso(opts.accountCreatedAt);
  return dateIso >= earliest && dateIso <= today;
}

export function sleepNightsLogged(history?: SleepMetrics[]): number {
  return (history ?? []).length;
}

/** Série de nuits consécutives (si aujourd’hui vide, démarre sur hier). */
export function computeSleepStreak(
  history: SleepMetrics[] | undefined,
  todayIso?: string,
): number {
  const today = todayIso ?? toLocalDateIso();
  const set = new Set((history ?? []).map((n) => n.date));
  let cursor = today;
  if (!set.has(cursor)) {
    cursor = addDaysIso(cursor, -1);
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysIso(cursor, -1);
  }
  return streak;
}

/** Grille calendrier : jours du mois + padding début (lundi = 0) */
export function buildMonthGrid(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: mondayOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(iso);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** @deprecated Ne plus utiliser — inventait score/durée. Préférer buildManualSleepNight. */
export function simulateWatchSleepNight(_source: WatchBrandId, date?: string): SleepMetrics {
  const day = date ?? new Date().toISOString().slice(0, 10);
  return {
    totalMinutes: 0,
    lightMinutes: 0,
    deepMinutes: 0,
    remMinutes: 0,
    score: 0,
    date: day,
    entryMode: 'manual',
  };
}
