import { describe, expect, it } from 'vitest';
import {
  banisterStep,
  bayesianPerceivedForm,
  eccentricLoadFactor,
  elapsedDays,
  personalizedAcwrGreen,
  projectBanister,
  updateBanisterPlus,
} from '../banisterPlus';
import { updateBanister } from '../core';
import type { BanisterState } from '../../types/domain';

const state = (date: string, fitness: number, fatigue: number): BanisterState => ({
  date,
  fitness,
  fatigue,
  formTsb: fitness - fatigue,
});

const response = { tauFitnessDays: 42, tauFatigueDays: 7 } as Parameters<typeof updateBanisterPlus>[3];

describe('elapsedDays', () => {
  it('compte les jours calendaires', () => {
    expect(elapsedDays('2026-03-01', '2026-03-08')).toBe(7);
    expect(elapsedDays('2026-03-08', '2026-03-01')).toBe(-7);
    expect(elapsedDays('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('insensible au changement d’heure (29 mars 2026)', () => {
    expect(elapsedDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(Number.isInteger(elapsedDays('2026-03-01', '2026-04-15'))).toBe(true);
  });

  it('accepte des ISO complets et rejette les dates invalides', () => {
    expect(elapsedDays('2026-03-01T23:59:00Z', '2026-03-02T00:01:00Z')).toBe(1);
    expect(elapsedDays('nope', '2026-03-02')).toBeNull();
  });
});

describe('updateBanister (Banister standard)', () => {
  it('lendemain : décroissance d’un jour (comportement historique)', () => {
    const next = updateBanister(state('2026-03-01', 100, 50), 10, '2026-03-02');
    expect(next.fitness).toBeCloseTo(100 * Math.exp(-1 / 42) + 10, 9);
    expect(next.fatigue).toBeCloseTo(50 * Math.exp(-1 / 7) + 10, 9);
    expect(next.formTsb).toBeCloseTo(next.fitness - next.fatigue, 9);
    expect(next.date).toBe('2026-03-02');
  });

  it('après 7 jours de repos : décroissance sur 7 jours, pas 1', () => {
    const next = updateBanister(state('2026-03-01', 100, 50), 0, '2026-03-08');
    expect(next.fitness).toBeCloseTo(100 * Math.exp(-7 / 42), 9);
    expect(next.fatigue).toBeCloseTo(50 * Math.exp(-7 / 7), 9);
  });

  it('même jour : pas de double décroissance', () => {
    const a = updateBanister(state('2026-03-01', 100, 50), 10, '2026-03-01');
    expect(a.fitness).toBeCloseTo(110, 9);
    expect(a.fatigue).toBeCloseTo(60, 9);
  });

  it('deux séances le même jour = une séance de charge cumulée', () => {
    const start = state('2026-03-01', 80, 40);
    const twice = updateBanister(updateBanister(start, 6, '2026-03-02'), 4, '2026-03-02');
    const once = updateBanister(start, 10, '2026-03-02');
    expect(twice.fitness).toBeCloseTo(once.fitness, 9);
    expect(twice.fatigue).toBeCloseTo(once.fatigue, 9);
  });

  it('date antérieure (import tardif) : pas de décroissance, date non reculée', () => {
    const next = updateBanister(state('2026-03-10', 100, 50), 5, '2026-03-01');
    expect(next.fitness).toBeCloseTo(105, 9);
    expect(next.date).toBe('2026-03-10');
  });

  it('date précédente invalide : repli sur 1 jour', () => {
    const next = updateBanister(state('', 100, 50), 0, '2026-03-02');
    expect(next.fitness).toBeCloseTo(100 * Math.exp(-1 / 42), 9);
  });

  it('charge NaN ou négative ignorée', () => {
    expect(updateBanister(state('2026-03-01', 10, 10), NaN, '2026-03-01').fitness).toBe(10);
    expect(updateBanister(state('2026-03-01', 10, 10), -50, '2026-03-01').fitness).toBe(10);
  });

  it('étape multi-jours = jour par jour (propriété de semi-groupe)', () => {
    let daily = state('2026-03-01', 100, 50);
    for (let d = 2; d <= 8; d++) {
      daily = updateBanister(daily, 0, `2026-03-0${d}`);
    }
    const jump = updateBanister(state('2026-03-01', 100, 50), 0, '2026-03-08');
    expect(jump.fitness).toBeCloseTo(daily.fitness, 9);
    expect(jump.fatigue).toBeCloseTo(daily.fatigue, 9);
  });
});

describe('updateBanisterPlus (τ individuels)', () => {
  it('borne les τ dans les plages physiologiques', () => {
    const weird = { tauFitnessDays: 1000, tauFatigueDays: 0.1 } as typeof response;
    const a = updateBanisterPlus(state('2026-03-01', 100, 100), 0, '2026-03-08', weird);
    const b = banisterStep(state('2026-03-01', 100, 100), 0, '2026-03-08', 56, 3);
    expect(a.fitness).toBeCloseTo(b.fitness, 9);
    expect(a.fatigue).toBeCloseTo(b.fatigue, 9);
  });

  it('τ fatigue court ⇒ meilleure récupération après repos', () => {
    const fast = updateBanisterPlus(state('2026-03-01', 100, 100), 0, '2026-03-05', {
      tauFitnessDays: 42,
      tauFatigueDays: 4,
    } as typeof response);
    const slow = updateBanisterPlus(state('2026-03-01', 100, 100), 0, '2026-03-05', {
      tauFitnessDays: 42,
      tauFatigueDays: 12,
    } as typeof response);
    expect(fast.formTsb).toBeGreaterThan(slow.formTsb);
  });
});

describe('projectBanister', () => {
  it('le repos remonte la forme (TSB) : la fatigue décroît plus vite que la forme', () => {
    const tired = state('2026-03-01', 100, 140); // TSB = −40
    const rested = projectBanister(tired, '2026-03-08', response);
    expect(rested.formTsb).toBeGreaterThan(tired.formTsb);
    expect(rested.fatigue).toBeLessThan(tired.fatigue);
    expect(rested.date).toBe('2026-03-08');
  });

  it('aujourd’hui ou passé ⇒ état inchangé (même référence)', () => {
    const s = state('2026-03-05', 10, 20);
    expect(projectBanister(s, '2026-03-05', response)).toBe(s);
    expect(projectBanister(s, '2026-03-01', response)).toBe(s);
  });

  it('dates invalides ⇒ état inchangé', () => {
    const s = state('2026-03-05', 10, 20);
    expect(projectBanister(s, 'invalid', response)).toBe(s);
  });

  it('projection puis charge = charge directement (cohérence)', () => {
    const s = state('2026-03-01', 100, 60);
    const viaProject = updateBanisterPlus(projectBanister(s, '2026-03-05', response), 12, '2026-03-05', response);
    const direct = updateBanisterPlus(s, 12, '2026-03-05', response);
    expect(viaProject.fitness).toBeCloseTo(direct.fitness, 9);
    expect(viaProject.fatigue).toBeCloseTo(direct.fatigue, 9);
  });

  it('ne modifie pas l’état d’origine', () => {
    const s = state('2026-03-01', 100, 60);
    const copy = { ...s };
    projectBanister(s, '2026-03-20', response);
    expect(s).toEqual(copy);
  });
});

describe('eccentricLoadFactor', () => {
  it('neutre par défaut', () => {
    expect(eccentricLoadFactor({})).toBe(1);
  });

  it('trail + gros dénivelé négatif ⇒ facteur plafonné à 1.6', () => {
    const f = eccentricLoadFactor({ discipline: 'trail', elevationLossM: 5000, cadence: 140 });
    expect(f).toBeGreaterThan(1.3);
    expect(f).toBeLessThanOrEqual(1.6);
  });

  it('jamais sous 0.85, même avec une cadence très haute', () => {
    expect(eccentricLoadFactor({ discipline: 'run', cadence: 200 })).toBeGreaterThanOrEqual(0.85);
  });

  it('cadence basse augmente la charge en course, pas en vélo', () => {
    expect(eccentricLoadFactor({ discipline: 'run', cadence: 150 })).toBeGreaterThan(1);
    expect(eccentricLoadFactor({ discipline: 'ride', cadence: 150 })).toBe(1);
  });
});

describe('bayesianPerceivedForm', () => {
  const base = { hrvSensitivity: 1, sleepDebtSensitivity: 1 };

  it('score toujours dans [0, 100]', () => {
    for (const formTsb of [-500, -40, 0, 40, 500]) {
      const r = bayesianPerceivedForm({ ...base, formTsb, hrvRatio: 3, sleepScore: 500 });
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it('TSB neutre sans autre signal ⇒ ~50', () => {
    expect(bayesianPerceivedForm({ ...base, formTsb: 0 }).score).toBe(50);
  });

  it('meilleur sommeil ⇒ meilleur score', () => {
    const good = bayesianPerceivedForm({ ...base, formTsb: 0, sleepScore: 95 }).score;
    const bad = bayesianPerceivedForm({ ...base, formTsb: 0, sleepScore: 40 }).score;
    expect(good).toBeGreaterThan(bad);
  });

  it('VFC en chute ⇒ message dédié', () => {
    const r = bayesianPerceivedForm({ ...base, formTsb: 10, hrvRatio: 0.4 });
    expect(r.note).toMatch(/VFC/);
  });

  it('valeurs NaN ignorées sans produire NaN', () => {
    const r = bayesianPerceivedForm({ ...base, formTsb: 0, hrvRatio: NaN, sleepScore: NaN });
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

describe('personalizedAcwrGreen', () => {
  it('borne le maximum et garde une largeur minimale', () => {
    const wide = personalizedAcwrGreen({ acwrGreenMax: 9 } as never);
    expect(wide.max).toBeLessThanOrEqual(1.5);
    const narrow = personalizedAcwrGreen({ acwrGreenMax: 0.1 } as never);
    expect(narrow.max - narrow.min).toBeGreaterThanOrEqual(0.15 - 1e-9);
  });
});
