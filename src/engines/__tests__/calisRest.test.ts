import { dedupeCalisthenicsPerDay } from '../calisthenicsProgramming';
import { describe, expect, it } from 'vitest';
import { buildCalisthenicsSession, restForExercise } from '../calisthenicsProgramming';
import { buildRunWarmupProtocol } from '../sportsScience';

describe('callisthénie : repos et durée', () => {
  it('grille de repos : poids du corps 40–60 s, tenues ≤ 40 s, tractions/dips 60–90 s', () => {
    for (const goal of ['strength', 'hypertrophy', 'skill', 'endurance'] as const) {
      expect(restForExercise({ id: 'pushup' }, goal)).toBeGreaterThanOrEqual(40);
      expect(restForExercise({ id: 'pushup' }, goal)).toBeLessThanOrEqual(60);
      expect(restForExercise({ id: 'plank', isometric: true }, goal)).toBeLessThanOrEqual(40);
      expect(restForExercise({ id: 'pullup' }, goal)).toBeGreaterThanOrEqual(60);
      expect(restForExercise({ id: 'pullup' }, goal)).toBeLessThanOrEqual(90);
    }
  });

  it('une séance dure entre 20 et 50 minutes, quel que soit le niveau et l’objectif', () => {
    for (const level of ['debutant', 'intermediaire', 'avance'] as const) {
      for (const goal of ['strength', 'hypertrophy', 'skill', 'endurance'] as const) {
        const w = buildCalisthenicsSession({ date: '2026-09-21', slotIndex: 0, trainingDaysCount: 3, level: level as never, block: 'base' as never, goal });
        expect(w.plannedDurationSec!).toBeGreaterThanOrEqual(20 * 60);
        expect(w.plannedDurationSec!).toBeLessThanOrEqual(50 * 60);
      }
    }
  });

  it('libellés courts : pas de longue consigne dans l’intitulé des étapes', () => {
    const w = buildCalisthenicsSession({ date: '2026-09-21', slotIndex: 0, trainingDaysCount: 3, level: 'intermediaire' as never, block: 'base' as never, goal: 'hypertrophy' });
    for (const st of w.steps) expect((st.label ?? "").length).toBeLessThan(80);
  });
});

describe('échauffement de course simplifié', () => {
  it('un seul bloc « Échauffement », sans étape vague', () => {
    const steps = buildRunWarmupProtocol({ sessionKind: 'ef' });
    expect(steps).toHaveLength(1);
    expect(steps[0]!.label).toMatch(/^Échauffement/);
    expect(steps.map((s) => s.label ?? "").join(' ')).not.toMatch(/ostéo|Zone 1/i);
  });

  it('les séances intenses ajoutent 4 accélérations chiffrées', () => {
    const steps = buildRunWarmupProtocol({ sessionKind: 'vma', raceDistanceKm: 10 });
    expect(steps.some((s) => /4 accélérations de 15 s/.test(s.label ?? ""))).toBe(true);
  });
});

describe('jamais deux séances de callisthénie le même jour', () => {
  const w = (id: string, date: string, title = 'Callisthénie · Push') => ({ id, date, title });
  it('garde la première par date', () => {
    const out = dedupeCalisthenicsPerDay([w('w-2026-09-21-calis', '2026-09-21'), w('p2__w-2026-09-21-calis', '2026-09-21'), w('w-2026-09-22-calis', '2026-09-22')]);
    expect(out.map((x) => x.date)).toEqual(['2026-09-21', '2026-09-22']);
  });
  it('respecte les séances déjà planifiées et ne touche pas aux autres sports', () => {
    const out = dedupeCalisthenicsPerDay(
      [w('x-calis', '2026-09-21'), { id: 'run1', date: '2026-09-21', title: 'Footing' }],
      [w('old-calis', '2026-09-21')],
    );
    expect(out.map((x) => x.id)).toEqual(['run1']);
  });
});

describe('visuels d’exercices : jamais une photo trompeuse', () => {
  it('pompes pike / déclinées → image neutre, pompes classiques → pompes', async () => {
    const { visualKeyFor } = await import('../guidedStrengthSession');
    expect(visualKeyFor('Pompes pike', 'pike_pushup')).toBe('generic');
    expect(visualKeyFor('Pompes déclinées')).toBe('generic');
    expect(visualKeyFor('Pompes')).toBe('pushup');
    expect(visualKeyFor('Développé couché')).toBe('press');
    expect(visualKeyFor('Rowing australien')).toBe('row');
  });
});
