import { describe, expect, it } from 'vitest';
import {
  findPlannedForFreeActivity,
  pickProgramForActivity,
  programAcceptsSport,
} from '../programSessions';
import type { ActiveProgram, PlannedWorkout } from '../../types/domain';

const prog = (id: string, sportCategory: string) => ({ id, sportCategory }) as ActiveProgram;
const workout = (id: string, date: string, discipline: PlannedWorkout['discipline'], programId?: string) =>
  ({ id, date, discipline, programId }) as PlannedWorkout;

describe('programAcceptsSport', () => {
  it('associe chaque catégorie aux bons sports', () => {
    expect(programAcceptsSport('run', 'run')).toBe(true);
    expect(programAcceptsSport('run', 'bike')).toBe(false);
    expect(programAcceptsSport('triathlon', 'swim')).toBe(true);
    expect(programAcceptsSport('ironman', 'strength')).toBe(false);
    expect(programAcceptsSport('strength', 'strength')).toBe(true);
  });
});

describe('pickProgramForActivity', () => {
  const run = prog('p-run', 'run');
  const bike = prog('p-bike', 'bike');
  it('privilégie le programme de la séance planifiée', () => {
    expect(pickProgramForActivity([run, bike], run, { programId: 'p-bike' }, { sport: 'run' })?.id).toBe('p-bike');
  });
  it('sans séance liée : programme principal si le sport correspond', () => {
    expect(pickProgramForActivity([run, bike], run, undefined, { sport: 'run' })?.id).toBe('p-run');
  });
  it('sinon : programme du même sport, même secondaire', () => {
    expect(pickProgramForActivity([run, bike], run, undefined, { sport: 'bike' })?.id).toBe('p-bike');
  });
  it('aucun programme du sport : retombe sur le principal', () => {
    expect(pickProgramForActivity([run], run, undefined, { sport: 'swim' })?.id).toBe('p-run');
  });
  it('sans programme : undefined', () => {
    expect(pickProgramForActivity([], undefined, undefined, { sport: 'run' })).toBeUndefined();
  });
});

describe('findPlannedForFreeActivity', () => {
  const plan = [
    workout('a', '2026-09-20', 'bike'),
    workout('b', '2026-09-20', 'run'),
    workout('c', '2026-09-21', 'run'),
    workout('r', '2026-09-20', 'rest'),
  ];
  it('trouve la séance du même jour et du même sport', () => {
    expect(findPlannedForFreeActivity(plan, new Set(), { sport: 'run', startDate: '2026-09-20T08:00:00Z' })?.id).toBe('b');
    expect(findPlannedForFreeActivity(plan, new Set(), { sport: 'bike', startDate: '2026-09-20T08:00:00Z' })?.id).toBe('a');
  });
  it('ignore les séances déjà réalisées et les autres jours', () => {
    expect(findPlannedForFreeActivity(plan, new Set(['b']), { sport: 'run', startDate: '2026-09-20T08:00:00Z' })).toBeUndefined();
    expect(findPlannedForFreeActivity(plan, new Set(), { sport: 'swim', startDate: '2026-09-20T08:00:00Z' })).toBeUndefined();
  });
});
