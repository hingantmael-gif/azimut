import { describe, expect, it } from 'vitest';
import { resolvePaceZones } from '../paceZones';
import { makeFartlek, makeVmaIntervals, type RunSessionContext } from '../runSessionLibrary';
import { compactStepLines, summarizeWorkout } from '../workoutPresentation';

const ctx = (over: Partial<RunSessionContext> = {}): RunSessionContext => ({
  date: '2026-09-16',
  zones: resolvePaceZones({ level: 'confirme', weeklyKmAvg: 40 }),
  level: 'confirme',
  load: 1,
  block: 'developpement_general',
  weekIndex: 0,
  goal: '10k',
  ...over,
});

describe('compactStepLines — répétitions regroupées', () => {
  it('un fartlek de 8 accélérations devient UNE ligne « Répéter 8 × »', () => {
    const w = makeFartlek(ctx());
    const lines = compactStepLines(w.steps);
    const group = lines.find((l) => l.group);
    expect(group).toBeDefined();
    expect(group!.title).toBe('Répéter 8 ×');
    expect(group!.group!.count).toBe(8);
    expect(group!.group!.parts).toHaveLength(2);
    expect(group!.detail).toMatch(/Accélération · 1 min rapide/);
    expect(group!.detail).not.toMatch(/Accélération 1/);
    // 8 accélérations + 8 récups = 16 étapes → 1 ligne : la liste est bien plus courte
    expect(lines.length).toBeLessThan(w.steps.length - 10);
  });

  it('le détail complet garde une ligne par étape', () => {
    const w = makeFartlek(ctx());
    expect(summarizeWorkout(w).fullStepLines).toHaveLength(w.steps.length);
  });

  it('« N × effort » + récupération répétée N fois tient sur une seule ligne', () => {
    const w = makeVmaIntervals(ctx());
    const lines = compactStepLines(w.steps);
    const rep = lines.find((l) => /× \d+ m/.test(l.title) || /×/.test(l.title));
    expect(rep).toBeDefined();
    expect(rep!.detail).toMatch(/récup/);
    expect(lines.length).toBe(w.steps.length - 1);
  });

  it('des étapes qui ne se répètent pas ne sont pas regroupées', () => {
    const w = makeVmaIntervals(ctx({ isDeload: true }));
    expect(compactStepLines(w.steps).some((l) => l.group)).toBe(false);
  });
});
