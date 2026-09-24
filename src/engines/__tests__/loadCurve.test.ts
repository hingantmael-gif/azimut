import { describe, expect, it } from 'vitest';
import { computeWeekLoads } from '../weekLoads';
import type { PlannedWorkout } from '../../types/domain';

/** Séance de `min` minutes le jour `date`. */
const w = (date: string, min: number, discipline = 'run'): PlannedWorkout =>
  ({ id: `${date}-${min}`, date, title: 't', discipline, steps: [], plannedDurationSec: min * 60 }) as unknown as PlannedWorkout;

// Lundis consécutifs : 2026-03-02, 03-09, 03-16, 03-23, 03-30, 04-06 …
const MONDAYS = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30', '2026-04-06', '2026-04-13'];

describe('computeWeekLoads', () => {
  it('regroupe par semaine (lundi → dimanche) et additionne les minutes', () => {
    const loads = computeWeekLoads([
      w('2026-03-02', 40), // lundi
      w('2026-03-08', 60), // dimanche de la même semaine
      w('2026-03-09', 30), // lundi suivant
    ]);
    expect(loads).toHaveLength(2);
    expect(loads[0]).toMatchObject({ minutes: 100, sessions: 2 });
    expect(loads[1]).toMatchObject({ minutes: 30, sessions: 1 });
  });

  it('ignore les jours de repos', () => {
    const loads = computeWeekLoads([w('2026-03-02', 40), w('2026-03-03', 999, 'rest')]);
    expect(loads[0]!.minutes).toBe(40);
  });

  it('plan vide ⇒ liste vide', () => {
    expect(computeWeekLoads([])).toEqual([]);
  });

  it('repère le pic, une décharge et l’affûtage', () => {
    const minutes = [100, 110, 120, 80, 130, 140, 90];
    const loads = computeWeekLoads(minutes.map((m, i) => w(MONDAYS[i]!, m)));
    expect(loads.map((l) => l.kind)).toEqual([
      'build',
      'build',
      'build',
      'deload', // 80 ≤ 120 × 0,85
      'build',
      'peak',
      'taper', // semaine finale allégée après le pic
    ]);
  });

  it('les semaines sont triées chronologiquement, même si le plan ne l’est pas', () => {
    const loads = computeWeekLoads([w('2026-03-16', 50), w('2026-03-02', 10), w('2026-03-09', 30)]);
    expect(loads.map((l) => l.minutes)).toEqual([10, 30, 50]);
  });

  it('repli sur les étapes puis la distance quand la durée manque', () => {
    const fromSteps = {
      id: 'a', date: '2026-03-02', title: 't', discipline: 'run',
      steps: [{ id: 's', type: 'active', durationSec: 600, repeat: 3 }],
    } as unknown as PlannedWorkout;
    const fromDistance = {
      id: 'b', date: '2026-03-09', title: 't', discipline: 'run', steps: [], plannedDistanceM: 10_000,
    } as unknown as PlannedWorkout;
    const loads = computeWeekLoads([fromSteps, fromDistance]);
    expect(loads[0]!.minutes).toBe(30);
    expect(loads[1]!.minutes).toBe(60);
  });

  it('date invalide ignorée sans planter', () => {
    expect(computeWeekLoads([w('pas-une-date', 30), w('2026-03-02', 20)])).toHaveLength(1);
  });
});
