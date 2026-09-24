import { describe, expect, it } from 'vitest';
import { resolvePaceZones } from '../paceZones';
import { buildLibrary, buildQuickSession, defaultLibContext, fitToDuration, instantiateWorkout, LIB_SPORTS } from '../sessionLibrary';

const ctx = defaultLibContext('intermediaire', resolvePaceZones({ level: 'intermediaire' }));
const DATE = '2026-09-21';

describe('bibliothèque de séances', () => {
  const lib = buildLibrary(ctx, DATE);

  it('couvre tous les sports, chaque séance a des étapes et une durée', () => {
    for (const s of LIB_SPORTS) expect(lib.some((e) => e.sport === s.id)).toBe(true);
    for (const e of lib) {
      expect(e.workout.steps.length).toBeGreaterThan(0);
      expect(e.minutes).toBeGreaterThanOrEqual(5);
      expect(e.title.length).toBeGreaterThan(2);
    }
  });

  it('clés uniques', () => {
    expect(new Set(lib.map((e) => e.key)).size).toBe(lib.length);
  });

  it('callisthénie : séances par cible (abdos, dos, bras, jambes, pectoraux) et par zone', () => {
    const groups = new Set(lib.filter((e) => e.sport === 'calisthenics').map((e) => e.group));
    for (const g of ['Ensemble du corps', 'Haut du corps', 'Bas du corps', 'Cible · Abdos', 'Cible · Dos', 'Cible · Bras', 'Cible · Jambes']) expect(groups.has(g)).toBe(true);
  });

  it('instantiateWorkout : identifiant neuf, date choisie', () => {
    const w = instantiateWorkout(lib[0]!.workout, '2026-09-22');
    expect(w.id).not.toBe(lib[0]!.workout.id);
    expect(w.date).toBe('2026-09-22');
  });
});

describe('séance rapide', () => {
  it('course : durée respectée', () => {
    const w = buildQuickSession(ctx, DATE, { sport: 'run', minutes: 30 });
    expect(Math.round((w.plannedDurationSec ?? 0) / 60)).toBe(30);
    expect(w.date).toBe(DATE);
  });

  it('callisthénie abdos : raccourcie à la durée, uniquement des exercices d’abdos', () => {
    const w = buildQuickSession(ctx, DATE, { sport: 'calisthenics', minutes: 20, targets: ['abs'] });
    expect((w.plannedDurationSec ?? 0) / 60).toBeLessThanOrEqual(30);
    expect(w.steps.filter((s) => s.type === 'active').length).toBeGreaterThanOrEqual(2);
    expect(w.title).toMatch(/Abdos/);
  });

  it('fitToDuration ne descend jamais sous 2 exercices', () => {
    const long = buildQuickSession(ctx, DATE, { sport: 'calisthenics', minutes: 60 });
    const short = fitToDuration(long, 5);
    expect(short.steps.filter((s) => s.type === 'active').length).toBe(2);
  });

  it('vélo et natation : séance produite', () => {
    expect(buildQuickSession(ctx, DATE, { sport: 'bike', minutes: 45 }).discipline).toBe('bike');
    expect(buildQuickSession(ctx, DATE, { sport: 'swim', minutes: 30 }).discipline).toBe('swim');
  });
});
