import { describe, expect, it } from 'vitest';
import { matchActivityToPlanned } from '../activityPlanMatch';
import type { PlannedWorkout } from '../../types/domain';

const planned = (over: Partial<PlannedWorkout> = {}): PlannedWorkout =>
  ({ id: 'p', title: 'Footing', date: '2026-09-21', discipline: 'run', steps: [], plannedDistanceM: 10000, plannedDurationSec: 3600, ...over }) as PlannedWorkout;
const act = (over = {}) => ({ sport: 'run' as const, distanceM: 9500, movingSec: 3500, elapsedSec: 3600, startDate: '2026-09-21T08:00:00Z', ...over });

describe('matchActivityToPlanned', () => {
  it('reconnaît une sortie proche de la séance prévue', () => {
    const r = matchActivityToPlanned(act(), planned());
    expect(r.matches).toBe(true);
  });
  it('refuse un autre sport', () => {
    expect(matchActivityToPlanned(act({ sport: 'bike' }), planned()).matches).toBe(false);
  });
  it('refuse une sortie très différente', () => {
    expect(matchActivityToPlanned(act({ distanceM: 3000, movingSec: 900, startDate: '2026-09-25T08:00:00Z' }), planned()).matches).toBe(false);
  });
  it('pas de séance prévue ou repos : jamais de correspondance', () => {
    expect(matchActivityToPlanned(act(), null).matches).toBe(false);
    expect(matchActivityToPlanned(act(), planned({ discipline: 'rest' })).matches).toBe(false);
  });
});
