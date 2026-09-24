import { describe, expect, it } from 'vitest';
import {
  buildLongRunCurve,
  buildWeeklyVolumeCurve,
  isDeloadWeek,
  isTaperWeek,
  resolveWeekLoadProfile,
} from '../volumeProgression';
import type { PeriodizationBlock } from '../../types/domain';

/** Blocs typiques : développement puis spécifique puis affûtage. */
function blocksFor(total: number): PeriodizationBlock[] {
  return Array.from({ length: total }, (_, w) => {
    if (w >= total - 2) return 'affutage';
    if (w >= total * 0.6) return 'travail_specifique';
    return 'developpement_general';
  });
}

describe('isDeloadWeek', () => {
  it('une semaine sur 4 (S4, S8, S12…), jamais sur les 2 dernières', () => {
    const total = 16;
    const deloads = Array.from({ length: total }, (_, w) => w).filter((w) =>
      isDeloadWeek(w, total, 'developpement_general'),
    );
    expect(deloads).toEqual([3, 7, 11]);
  });

  it('jamais pendant l’affûtage ni la récupération', () => {
    expect(isDeloadWeek(3, 16, 'affutage')).toBe(false);
    expect(isDeloadWeek(3, 16, 'recuperation_post_course')).toBe(false);
  });
});

describe('isTaperWeek', () => {
  it('nombre de semaines d’affûtage selon la durée du plan', () => {
    const count = (total: number) =>
      Array.from({ length: total }, (_, w) => isTaperWeek(w, total, 'developpement_general')).filter(Boolean).length;
    expect(count(12)).toBe(3);
    expect(count(8)).toBe(2);
    expect(count(5)).toBe(1);
    expect(count(3)).toBe(0);
  });
});

describe('resolveWeekLoadProfile', () => {
  it('facteurs toujours bornés', () => {
    for (const block of ['developpement_general', 'travail_specifique', 'affutage', 'recuperation_post_course'] as const) {
      for (let w = 0; w < 16; w++) {
        const p = resolveWeekLoadProfile(w, 16, block);
        expect(p.volumeFactor).toBeGreaterThanOrEqual(0.45);
        expect(p.volumeFactor).toBeLessThanOrEqual(1.15);
        expect(p.qualityFactor).toBeGreaterThanOrEqual(0.3);
        expect(p.qualityFactor).toBeLessThanOrEqual(1.15);
      }
    }
  });

  it('décharge : le volume baisse, la qualité baisse davantage', () => {
    const normal = resolveWeekLoadProfile(2, 16, 'developpement_general');
    const deload = resolveWeekLoadProfile(3, 16, 'developpement_general');
    expect(deload.isDeload).toBe(true);
    const volDrop = 1 - deload.volumeFactor / normal.volumeFactor;
    const qualDrop = 1 - deload.qualityFactor / normal.qualityFactor;
    expect(qualDrop).toBeGreaterThan(volDrop);
  });

  it('plan d’une seule semaine : pas de NaN', () => {
    const p = resolveWeekLoadProfile(0, 1, 'developpement_general');
    expect(Number.isFinite(p.volumeFactor)).toBe(true);
  });
});

describe('buildWeeklyVolumeCurve', () => {
  const opts = {
    totalWeeks: 16,
    goal: 'marathon' as const,
    level: 'intermediaire' as const,
    weeklyKmAvg: 35,
    blocks: blocksFor(16),
  };

  it('une valeur par semaine, positive et bornée par le profil', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    expect(curve).toHaveLength(16);
    for (const v of curve) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('sécurité : jamais plus de +10 % (+8 % sous 20 km) vs la dernière semaine de charge', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    const blocks = opts.blocks;
    let lastBuild = curve[0]!;
    let prev = curve[0]!;
    for (let w = 1; w < curve.length; w++) {
      const load = resolveWeekLoadProfile(w, 16, blocks[w]!);
      const prevWasDeload = resolveWeekLoadProfile(w - 1, 16, blocks[w - 1]!).isDeload;
      const ref = prevWasDeload ? Math.max(prev, lastBuild) : prev;
      const cap = ref * (ref < 20 ? 1.08 : 1.1);
      expect(curve[w]!).toBeLessThanOrEqual(cap + 0.11); // arrondi 0,1 km
      if (!load.isDeload && !load.isTaper) lastBuild = curve[w]!;
      prev = curve[w]!;
    }
  });

  it('les semaines de décharge sont plus légères que la semaine précédente', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    for (const w of [3, 7, 11]) {
      expect(curve[w]!).toBeLessThan(curve[w - 1]!);
    }
  });

  it('après une décharge le volume REMONTE au niveau d’avant (bug : restait sous-chargé)', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    for (const w of [4, 8]) {
      const beforeDeload = curve[w - 2]!; // dernière semaine de charge avant la décharge
      // La semaine suivante doit retrouver au moins ~95 % de ce niveau (hors plafond du profil).
      expect(curve[w]!).toBeGreaterThanOrEqual(beforeDeload * 0.95);
    }
  });

  it('le volume final de charge dépasse celui du début (progression réelle)', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    const peak = Math.max(...curve.slice(0, 13));
    expect(peak).toBeGreaterThan(curve[0]! * 1.05);
  });

  it('affûtage : les dernières semaines sont plus légères que le pic', () => {
    const curve = buildWeeklyVolumeCurve(opts);
    const peak = Math.max(...curve);
    expect(curve[15]!).toBeLessThan(peak * 0.85);
    expect(curve[14]!).toBeLessThanOrEqual(peak);
  });

  it('un niveau plus haut ⇒ un volume au moins égal', () => {
    const a = buildWeeklyVolumeCurve({ ...opts, level: 'debutant', weeklyKmAvg: undefined });
    const c = buildWeeklyVolumeCurve({ ...opts, level: 'confirme', weeklyKmAvg: undefined });
    expect(Math.max(...c)).toBeGreaterThan(Math.max(...a));
  });

  it('plan court (4 semaines) : pas de NaN, valeurs positives', () => {
    const curve = buildWeeklyVolumeCurve({ ...opts, totalWeeks: 4, blocks: blocksFor(4) });
    expect(curve).toHaveLength(4);
    for (const v of curve) expect(Number.isFinite(v) && v > 0).toBe(true);
  });
});

describe('buildLongRunCurve', () => {
  const total = 16;
  const blocks = blocksFor(total);
  const weekly = buildWeeklyVolumeCurve({
    totalWeeks: total,
    goal: 'marathon',
    level: 'intermediaire',
    weeklyKmAvg: 35,
    blocks,
  });
  const long = buildLongRunCurve({ totalWeeks: total, goal: 'marathon', weeklyVolumes: weekly, blocks });

  it('une sortie longue par semaine, positive', () => {
    expect(long).toHaveLength(total);
    for (const v of long) expect(v).toBeGreaterThan(0);
  });

  it('jamais plus longue que la part max du volume hebdo', () => {
    for (let w = 0; w < total; w++) {
      expect(long[w]!).toBeLessThanOrEqual(weekly[w]! * 0.6 + 0.11);
    }
  });

  it('sécurité : max +2 km et +10 % par rapport à la dernière sortie longue de charge', () => {
    let lastBuild = long[0]!;
    let prev = long[0]!;
    for (let w = 1; w < total; w++) {
      const prevDeload = resolveWeekLoadProfile(w - 1, total, blocks[w - 1]!).isDeload;
      const ref = prevDeload ? Math.max(prev, lastBuild) : prev;
      expect(long[w]!).toBeLessThanOrEqual(Math.max(ref * 1.1, ref) + 0.11);
      expect(long[w]!).toBeLessThanOrEqual(ref + 2 + 0.11);
      const load = resolveWeekLoadProfile(w, total, blocks[w]!);
      if (!load.isDeload) lastBuild = long[w]!;
      prev = long[w]!;
    }
  });

  it('après une décharge la sortie longue remonte', () => {
    const deloadWeek = 7;
    expect(long[deloadWeek]!).toBeLessThan(long[deloadWeek - 1]!);
    // Semaine suivante : retrouve ≥ ~93 % de la sortie longue d’avant la décharge (plafonnée par +10 %/+2 km).
    expect(long[deloadWeek + 1]!).toBeGreaterThanOrEqual(long[deloadWeek - 1]! * 0.93);
  });

  it('course courte (10 km) : sortie longue plafonnée', () => {
    const b = blocksFor(12);
    const w = buildWeeklyVolumeCurve({ totalWeeks: 12, goal: '10k', level: 'confirme', targetDistanceKm: 10, blocks: b });
    const l = buildLongRunCurve({ totalWeeks: 12, goal: '10k', targetDistanceKm: 10, weeklyVolumes: w, blocks: b });
    for (const v of l) expect(v).toBeLessThanOrEqual(20.1); // 2× la distance de course
  });
});
