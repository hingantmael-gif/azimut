import { describe, expect, it } from 'vitest';
import { defaultDigitalTwin } from '../athleteDigitalTwin';
import { computeReadinessScore } from '../readinessScore';

const twin = defaultDigitalTwin();
const good = {
  twin,
  hrvRatio: 1.3,
  sleepScore: 95,
  sleepDebtHours3d: 0,
  formTsb: 20,
  muscleReadinessPct: 100,
  recentRpeDelta: -1,
  lifeStress01: 0,
};
const bad = {
  twin,
  hrvRatio: 0.6,
  sleepScore: 30,
  sleepDebtHours3d: 6,
  formTsb: -40,
  muscleReadinessPct: 20,
  recentRpeDelta: 3,
  lifeStress01: 1,
};

describe('computeReadinessScore', () => {
  it('total toujours dans [0, 100]', () => {
    for (const input of [good, bad]) {
      const r = computeReadinessScore(input);
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(100);
    }
  });

  it('bonnes conditions ≫ mauvaises conditions', () => {
    expect(computeReadinessScore(good).total).toBeGreaterThan(85);
    expect(computeReadinessScore(bad).total).toBeLessThan(25);
  });

  it('les poids somment à 1', () => {
    const w = computeReadinessScore(good).weights;
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('poids personnalisés (VFC sensible + modèle calibré) somment aussi à 1', () => {
    const tuned = {
      ...twin,
      modelConfidence: 0.9,
      response: { ...twin.response, hrvSensitivity: 1.6 },
    };
    const r = computeReadinessScore({ ...good, twin: tuned });
    expect(Object.values(r.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(r.weights.hrv).toBeGreaterThan(0.3);
  });

  it('chaque signal dégradé fait baisser le score (monotonie)', () => {
    const base = computeReadinessScore(good).total;
    expect(computeReadinessScore({ ...good, hrvRatio: 0.7 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, sleepScore: 40 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, sleepDebtHours3d: 5 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, formTsb: -30 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, muscleReadinessPct: 30 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, recentRpeDelta: 3 }).total).toBeLessThan(base);
    expect(computeReadinessScore({ ...good, lifeStress01: 1 }).total).toBeLessThan(base);
  });

  it('signaux absents ⇒ score neutre fini (pas de NaN)', () => {
    const r = computeReadinessScore({ twin, formTsb: 0, muscleReadinessPct: 70 });
    expect(Number.isFinite(r.total)).toBe(true);
    expect(r.total).toBeGreaterThan(30);
    expect(r.total).toBeLessThan(85);
  });

  it('valeurs NaN traitées comme absentes', () => {
    const r = computeReadinessScore({
      twin,
      hrvRatio: NaN,
      sleepScore: NaN,
      sleepDebtHours3d: NaN,
      formTsb: 0,
      muscleReadinessPct: 70,
      recentRpeDelta: NaN,
      lifeStress01: NaN,
    });
    expect(Number.isFinite(r.total)).toBe(true);
    for (const c of r.components) expect(Number.isFinite(c.score)).toBe(true);
  });

  it('valeurs extrêmes bornées sans dépasser 0–100 par composante', () => {
    const r = computeReadinessScore({
      ...good,
      hrvRatio: 50,
      sleepScore: 500,
      formTsb: 9999,
      muscleReadinessPct: 999,
      lifeStress01: -5,
    });
    for (const c of r.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it('un sommeil très faible peut être expliqué en priorité', () => {
    const r = computeReadinessScore({ ...good, sleepScore: 10, sleepDebtHours3d: 8 });
    expect(r.dominantWhy).toMatch(/Sommeil/);
  });

  it('6 composantes, une phrase d’explication non vide', () => {
    const r = computeReadinessScore(good);
    expect(r.components).toHaveLength(6);
    expect(r.dominantWhy.length).toBeGreaterThan(10);
  });
});
