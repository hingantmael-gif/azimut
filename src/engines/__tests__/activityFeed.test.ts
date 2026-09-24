import { describe, expect, it } from 'vitest';
import {
  activitiesInPeriod,
  availableSports,
  filterActivities,
  groupByMonth,
  programOfActivity,
  sortActivities,
  totalsOf,
} from '../activityFeed';
import type { ActiveProgram, StravaActivity } from '../../types/domain';

const act = (id: string, startDate: string, sport?: StravaActivity['sport'], distanceM = 5000, movingSec = 1800) =>
  ({ id, name: id, startDate, sport, distanceM, movingSec, elapsedSec: movingSec }) as StravaActivity;

const list = [
  act('a', '2026-08-30T08:00:00Z', 'run'),
  act('b', '2026-09-18T08:00:00Z', 'bike', 40000, 5400),
  act('c', '2026-09-20T08:00:00Z', 'run', 10000, 3000),
];

describe('activityFeed', () => {
  it('trie de la plus récente à la plus ancienne', () => {
    expect(sortActivities(list).map((a) => a.id)).toEqual(['c', 'b', 'a']);
  });

  it('filtre par sport et liste les sports présents', () => {
    expect(filterActivities(list, 'bike').map((a) => a.id)).toEqual(['b']);
    expect(filterActivities(list, 'all')).toHaveLength(3);
    expect(availableSports(list)).toEqual(['run', 'bike']);
  });

  it('un sport absent est considéré comme course', () => {
    expect(filterActivities([act('x', '2026-09-01T08:00:00Z')], 'run')).toHaveLength(1);
  });

  it('totaux : séances, km, heures', () => {
    const t = totalsOf(list);
    expect(t.sessions).toBe(3);
    expect(t.km).toBeCloseTo(55);
    expect(t.hours).toBeCloseTo((1800 + 5400 + 3000) / 3600);
  });

  it('période : 7 jours / 30 jours / tout', () => {
    const now = new Date('2026-09-21T12:00:00Z');
    expect(activitiesInPeriod(list, 'week', now).map((a) => a.id)).toEqual(['b', 'c']);
    expect(activitiesInPeriod(list, 'month', now)).toHaveLength(3);
    expect(activitiesInPeriod(list, 'all', now)).toHaveLength(3);
  });

  it('regroupe par mois sans mélanger', () => {
    const groups = groupByMonth(sortActivities(list));
    expect(groups.map((g) => g.key)).toEqual(['2026-09', '2026-08']);
    expect(groups[0]!.items).toHaveLength(2);
    expect(groups[0]!.label).toMatch(/^Septembre/);
  });

  it('retrouve le programme d’une activité', () => {
    const programs = [{ id: 'p1', activityIds: ['x'] }, { id: 'p2', activityIds: ['c'] }] as ActiveProgram[];
    expect(programOfActivity('c', programs)?.id).toBe('p2');
    expect(programOfActivity('zz', programs)).toBeUndefined();
  });
});
