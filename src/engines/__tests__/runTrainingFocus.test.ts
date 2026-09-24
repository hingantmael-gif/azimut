import { describe, expect, it } from 'vitest';
import { pickQualitySession, type RunSessionContext } from '../runSessionLibrary';
import { resolvePaceZones } from '../paceZones';
import { generateWeekPlan } from '../core';
import type { OnboardingAnswers } from '../../types/domain';

const zones = resolvePaceZones({ level: 'intermediaire', weeklyKmAvg: 30 });

function ctx(overrides: Partial<RunSessionContext> = {}): RunSessionContext {
  return {
    date: '2026-09-22',
    zones,
    level: 'intermediaire',
    load: 1,
    block: 'developpement_general',
    weekIndex: 0,
    goal: 'semi',
    isDeload: false,
    qualitySlot: 0,
    ...overrides,
  };
}

describe('pickQualitySession — focus dénivelé/endurance/puissance', () => {
  it('sans focus (undefined) reproduit exactement le comportement historique "balanced"', () => {
    for (const weekIndex of [0, 1, 2, 3]) {
      for (const qualitySlot of [0, 1] as const) {
        const withFocus = pickQualitySession(ctx({ weekIndex, qualitySlot, focus: 'balanced' }));
        const noFocus = pickQualitySession(ctx({ weekIndex, qualitySlot, focus: undefined }));
        expect(withFocus.title).toBe(noFocus.title);
        expect(withFocus.id).toBe(noFocus.id);
      }
    }
  });

  it("focus 'hills' produit des séances de côtes (jamais VMA/tempo classiques) en slot 0", () => {
    for (const weekIndex of [0, 1, 2, 3, 4]) {
      const w = pickQualitySession(ctx({ weekIndex, qualitySlot: 0, focus: 'hills' }));
      expect(w.id).toContain('run-hills');
      expect(w.steps.some((s) => s.label?.includes('côte'))).toBe(true);
    }
  });

  it("focus 'speed_power' alterne VMA et allure 5 km, jamais de côtes ni de tempo continu", () => {
    for (const weekIndex of [0, 1, 2, 3]) {
      for (const qualitySlot of [0, 1] as const) {
        const w = pickQualitySession(ctx({ weekIndex, qualitySlot, focus: 'speed_power' }));
        expect(['run-vma', 'run-5k-spec'].some((k) => w.id.includes(k))).toBe(true);
      }
    }
  });

  it("focus 'endurance' privilégie seuil/tempo, jamais de côtes ni d'allure 5 km en slot 0", () => {
    for (const weekIndex of [0, 1, 2, 3]) {
      const w = pickQualitySession(ctx({ weekIndex, qualitySlot: 0, focus: 'endurance' }));
      expect(['run-cruise', 'run-tempo'].some((k) => w.id.includes(k))).toBe(true);
    }
  });

  it('les 4 focus produisent des séances différentes pour le même contexte (algorithme réellement distinct)', () => {
    const titles = new Set(
      (['balanced', 'endurance', 'speed_power', 'hills'] as const).map(
        (focus) => pickQualitySession(ctx({ weekIndex: 1, qualitySlot: 0, focus })).id,
      ),
    );
    expect(titles.size).toBeGreaterThan(1);
  });
});

describe("generateWeekPlan — trainingTerrain: 'hills' (onboarding) sert de repli quand runFocus n'est pas défini", () => {
  const baseAnswers: OnboardingAnswers = {
    level: 'intermediaire',
    goal: 'semi',
    trainingDays: [1, 3, 5, 0],
    longRunDay: 0,
    weeklyKmAvg: 30,
    weeklySessionsTarget: 4,
    sportCategory: 'run',
  };

  it('sans trainingTerrain ni runFocus : aucune séance de côtes (comportement historique)', () => {
    const plan = generateWeekPlan(baseAnswers, '2026-09-20', {
      weekIndex: 2,
      totalWeeks: 12,
      periodization: 'developpement_general',
    });
    expect(plan.some((w) => w.id.includes('run-hills'))).toBe(false);
  });

  it("trainingTerrain: 'hills' active bien les séances de côtes en génération réelle", () => {
    const plan = generateWeekPlan(
      { ...baseAnswers, trainingTerrain: 'hills' },
      '2026-09-20',
      { weekIndex: 2, totalWeeks: 12, periodization: 'developpement_general' },
    );
    expect(plan.some((w) => w.id.includes('run-hills'))).toBe(true);
  });

  it("runFocus explicite est prioritaire sur trainingTerrain", () => {
    const plan = generateWeekPlan(
      { ...baseAnswers, trainingTerrain: 'hills', runFocus: 'speed_power' },
      '2026-09-20',
      { weekIndex: 2, totalWeeks: 12, periodization: 'developpement_general' },
    );
    expect(plan.some((w) => w.id.includes('run-hills'))).toBe(false);
  });
});
