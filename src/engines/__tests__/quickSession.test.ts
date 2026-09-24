import { describe, expect, it } from 'vitest';
import { resolvePaceZones } from '../paceZones';
import {
  buildQuickBike,
  buildQuickRun,
  buildQuickSwim,
  checkQuickCoherence,
  missingQuickData,
  type Intensity,
  type QuickKindId,
} from '../quickSession';
import { buildQuickSession, defaultLibContext } from '../sessionLibrary';

const zones = resolvePaceZones({ level: 'confirme', vmaKmh: 18 });
const ctx = { zones, ftp: 250, swimPace100: 95, level: 'confirme' as const };
const mean = (b: { minSecPerKm: number; maxSecPerKm: number }) => (b.minSecPerKm + b.maxSecPerKm) / 2;
const mainPace = (kind: QuickKindId, i: Intensity) => {
  const w = buildQuickRun(ctx, '2026-01-05', kind, 45, i);
  const main = w.steps.find((s) => s.type === 'active')!;
  return mean(main.target as { minSecPerKm: number; maxSecPerKm: number });
};

describe('séance rapide — course', () => {
  it('respecte la durée demandée pour chaque type et chaque intensité', () => {
    for (const kind of ['easy', 'long', 'intervals', 'tempo'] as QuickKindId[]) {
      for (const i of ['gentle', 'moderate', 'hard'] as Intensity[]) {
        const minutes = kind === 'long' ? 90 : 45;
        const w = buildQuickRun(ctx, '2026-01-05', kind, minutes, i);
        expect(Math.abs((w.plannedDurationSec ?? 0) / 60 - minutes)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('plus l’intensité monte, plus l’allure du bloc principal est rapide', () => {
    for (const kind of ['easy', 'long', 'intervals', 'tempo'] as QuickKindId[]) {
      expect(mainPace(kind, 'gentle')).toBeGreaterThan(mainPace(kind, 'moderate'));
      expect(mainPace(kind, 'moderate')).toBeGreaterThanOrEqual(mainPace(kind, 'hard'));
    }
  });

  it('utilise les zones du profil : avec une VMA de 18, le footing est bien plus rapide que le défaut niveau', () => {
    const slowZones = resolvePaceZones({ level: 'debutant' });
    const fast = buildQuickRun(ctx, '2026-01-05', 'easy', 30, 'moderate').steps.find((s) => s.id === 'm1')!;
    const slow = buildQuickRun({ ...ctx, zones: slowZones }, '2026-01-05', 'easy', 30, 'moderate').steps.find((s) => s.id === 'm1')!;
    expect(mean(fast.target as never)).toBeLessThan(mean(slow.target as never) - 60);
  });

  it('le fractionné alterne efforts et récupérations en nombre égal', () => {
    const w = buildQuickRun(ctx, '2026-01-05', 'intervals', 50, 'hard');
    const rep = w.steps.find((s) => s.id === 'rep')!;
    const rec = w.steps.find((s) => s.id === 'rec')!;
    expect(rep.repeat).toBe(rec.repeat);
    expect(rep.repeat).toBeGreaterThanOrEqual(3);
  });
});

describe('séance rapide — cohérence durée / type', () => {
  it('signale une sortie longue de 20 min', () => {
    const c = checkQuickCoherence('run', 'long', 20);
    expect(c.ok).toBe(false);
    if (!c.ok) {
      expect(c.message).toMatch(/pas cohérent/);
      expect(c.suggestedMinutes).toBe(60);
      expect(c.alt?.id).toBe('easy');
    }
  });
  it('accepte un footing de 30 min et une sortie longue de 90 min', () => {
    expect(checkQuickCoherence('run', 'easy', 30).ok).toBe(true);
    expect(checkQuickCoherence('run', 'long', 90).ok).toBe(true);
  });
  it('signale un footing de 2 h', () => {
    expect(checkQuickCoherence('run', 'easy', 120).ok).toBe(false);
  });
});

describe('séance rapide — données manquantes', () => {
  it('demande de compléter sans VMA, chrono ni volume', () => {
    expect(missingQuickData('run', { level: 'intermediaire', goal: '10k', trainingDays: [1], longRunDay: 6 })).toEqual(['run-pace']);
  });
  it('ne demande rien quand la VMA est connue', () => {
    expect(missingQuickData('run', { level: 'intermediaire', goal: '10k', trainingDays: [1], longRunDay: 6, vmaKmh: 16 })).toEqual([]);
  });
  it('vélo : FTP ; natation : allure 100 m', () => {
    const base = { level: 'intermediaire' as const, goal: '10k' as const, trainingDays: [1], longRunDay: 6 };
    expect(missingQuickData('bike', base)).toEqual(['bike-ftp']);
    expect(missingQuickData('bike', { ...base, ftpWatts: 230 })).toEqual([]);
    expect(missingQuickData('swim', base)).toEqual(['swim-pace']);
    expect(missingQuickData('swim', { ...base, sportTimesSec: { swim: { '100m': 100 } } })).toEqual([]);
  });
});

describe('séance rapide — vélo et natation', () => {
  it('vélo : watts croissants avec l’intensité, durée respectée', () => {
    const lo = buildQuickBike(ctx, '2026-01-05', 'endurance', 60, 'gentle');
    const hi = buildQuickBike(ctx, '2026-01-05', 'endurance', 60, 'hard');
    const watts = (w: ReturnType<typeof buildQuickBike>) => (w.steps.find((s) => s.type === 'active')!.target as { minWatts: number }).minWatts;
    expect(watts(hi)).toBeGreaterThan(watts(lo));
    expect(Math.abs((lo.plannedDurationSec ?? 0) / 60 - 60)).toBeLessThanOrEqual(1);
  });
  it('natation : durée cohérente', () => {
    const w = buildQuickSwim(ctx, '2026-01-05', 'endurance', 45, 'moderate');
    expect(Math.abs((w.plannedDurationSec ?? 0) / 60 - 45)).toBeLessThanOrEqual(2);
    expect(w.plannedDistanceM).toBeGreaterThan(800);
  });
  it('buildQuickSession route le type et l’intensité choisis', () => {
    const lib = defaultLibContext('confirme', zones);
    const w = buildQuickSession(lib, '2026-01-05', { sport: 'run', minutes: 40, kind: 'intervals', intensity: 'hard' });
    expect(w.title).toMatch(/VMA/);
    expect(w.adHoc).toBe(true);
  });
});
