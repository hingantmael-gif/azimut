import type { ActiveProgram, StravaActivity } from '../types/domain';

/** Logique pure de l'écran « Activités » : tri, filtres par sport, totaux, regroupement par mois. */

export type ActivitySportFilter = 'all' | 'run' | 'bike' | 'swim' | 'strength' | 'other';
export type ActivityPeriod = 'week' | 'month' | 'all';

export function activitySport(a: Pick<StravaActivity, 'sport'>): Exclude<ActivitySportFilter, 'all'> {
  return a.sport ?? 'run';
}

/** Plus récente d'abord (les imports n'arrivent pas forcément dans l'ordre). */
export function sortActivities(list: StravaActivity[]): StravaActivity[] {
  return [...list].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function filterActivities(list: StravaActivity[], sport: ActivitySportFilter): StravaActivity[] {
  return sport === 'all' ? list : list.filter((a) => activitySport(a) === sport);
}

/** Sports réellement présents (pour n'afficher que les filtres utiles). */
export function availableSports(list: StravaActivity[]): Exclude<ActivitySportFilter, 'all'>[] {
  const order: Exclude<ActivitySportFilter, 'all'>[] = ['run', 'bike', 'swim', 'strength', 'other'];
  const present = new Set(list.map(activitySport));
  return order.filter((s) => present.has(s));
}

export function activitiesInPeriod(list: StravaActivity[], period: ActivityPeriod, now = new Date()): StravaActivity[] {
  if (period === 'all') return list;
  const days = period === 'week' ? 7 : 30;
  const since = now.getTime() - days * 86400000;
  return list.filter((a) => new Date(a.startDate).getTime() >= since);
}

export type ActivityTotals = { sessions: number; km: number; hours: number };

export function totalsOf(list: StravaActivity[]): ActivityTotals {
  return {
    sessions: list.length,
    km: list.reduce((s, a) => s + a.distanceM, 0) / 1000,
    hours: list.reduce((s, a) => s + a.movingSec, 0) / 3600,
  };
}

export type MonthGroup = { key: string; label: string; items: StravaActivity[] };

/** Regroupe une liste déjà triée par mois calendaire (« septembre 2026 »). */
export function groupByMonth(sorted: StravaActivity[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const a of sorted) {
    const key = a.startDate.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const label = new Date(`${key}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(g);
    }
    g.items.push(a);
  }
  return groups;
}

/** Programme auquel une activité est rattachée (via `activityIds`). */
export function programOfActivity(activityId: string, programs: ActiveProgram[]): ActiveProgram | undefined {
  return programs.find((p) => p.activityIds?.includes(activityId));
}
