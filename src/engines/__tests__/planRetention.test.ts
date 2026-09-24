import { describe, expect, it } from 'vitest';
import { prunePlanHistory, removeFutureProgramSessions } from '../multiProgramPlan';
import type { PlannedWorkout } from '../../types/domain';

const w = (id: string, date: string, programId?: string) =>
  ({ id, date, programId, title: id, discipline: 'run', steps: [] }) as PlannedWorkout;

describe('removeFutureProgramSessions — suppression d’un programme', () => {
  const today = '2026-09-24';
  const plan = [
    w('past', '2026-09-20', 'p1'),
    w('today', '2026-09-24', 'p1'),
    w('future', '2026-09-30', 'p1'),
    w('other', '2026-09-30', 'p2'),
    w('legacy', '2026-10-02'),
  ];

  it('retire tout le futur du programme et garde le passé et les autres programmes', () => {
    const ids = removeFutureProgramSessions(plan, 'p1', today).map((x) => x.id);
    expect(ids).toEqual(['past', 'other', 'legacy']);
  });

  it('dernier programme supprimé : les séances sans programme (anciens plans) partent aussi', () => {
    const ids = removeFutureProgramSessions(plan, 'p1', today, { includeUnassigned: true }).map((x) => x.id);
    expect(ids).toEqual(['past', 'other']);
  });

  it('une séance déjà faite aujourd’hui n’est jamais retirée', () => {
    const ids = removeFutureProgramSessions(plan, 'p1', today, { doneIds: new Set(['today']) }).map((x) => x.id);
    expect(ids).toContain('today');
    expect(ids).not.toContain('future');
  });
});

describe('prunePlanHistory — nettoyage automatique', () => {
  const today = '2026-09-24';

  it('séance non faite : retirée après 7 jours, gardée avant', () => {
    const plan = [w('missed-old', '2026-09-16'), w('missed-recent', '2026-09-18'), w('future', '2026-09-30')];
    expect(prunePlanHistory(plan, new Set(), today).map((x) => x.id)).toEqual(['missed-recent', 'future']);
  });

  it('séance faite : gardée 30 jours, puis retirée du plan', () => {
    const plan = [w('done-old', '2026-08-20'), w('done-recent', '2026-09-01')];
    const done = new Set(['done-old', 'done-recent']);
    expect(prunePlanHistory(plan, done, today).map((x) => x.id)).toEqual(['done-recent']);
  });

  it('renvoie le même tableau quand il n’y a rien à retirer (pas de re-rendu)', () => {
    const plan = [w('a', '2026-09-25'), w('b', '2026-09-22')];
    expect(prunePlanHistory(plan, new Set(), today)).toBe(plan);
  });
});
