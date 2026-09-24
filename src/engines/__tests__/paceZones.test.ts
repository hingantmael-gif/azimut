import { describe, expect, it } from 'vitest';
import { vmaFromRaceTime } from '../athleteProfile';
import {
  deriveWarmupBand,
  paceBandForRunKind,
  resolvePaceZones,
  warmupBandForMain,
  type PaceBand,
  type PaceZones,
} from '../paceZones';
import {
  paceAtVdotFraction,
  vdotFromRace,
  velocityAtVo2,
} from '../raceTimePrediction';

const MIN = 60;
const center = (b: PaceBand) => (b.minSecPerKm + b.maxSecPerKm) / 2;

describe('velocityAtVo2 / paceAtVdotFraction', () => {
  it('est l’inverse exact du coût en O₂ de Daniels', () => {
    for (const v of [120, 200, 260, 320]) {
      const cost = -4.6 + 0.182258 * v + 0.000104 * v * v;
      expect(velocityAtVo2(cost)).toBeCloseTo(v, 6);
    }
  });

  it('VDOT 49.8 : 100 % VO₂max ≈ 3:51/km, 88 % ≈ 4:16/km', () => {
    const vdot = vdotFromRace(5, 20 * MIN);
    expect(paceAtVdotFraction(vdot, 1)).toBeGreaterThan(228);
    expect(paceAtVdotFraction(vdot, 1)).toBeLessThan(234);
    expect(paceAtVdotFraction(vdot, 0.88)).toBeGreaterThan(253);
    expect(paceAtVdotFraction(vdot, 0.88)).toBeLessThan(259);
  });

  it('fraction plus basse ⇒ allure plus lente', () => {
    expect(paceAtVdotFraction(50, 0.8)).toBeGreaterThan(paceAtVdotFraction(50, 0.9));
  });
});

describe('vmaFromRaceTime', () => {
  it('5 km en 20:00 ⇒ VMA ≈ 15,6 km/h', () => {
    expect(vmaFromRaceTime(5, 20 * MIN)).toBeGreaterThan(15.3);
    expect(vmaFromRaceTime(5, 20 * MIN)).toBeLessThan(15.9);
  });

  it('continue autour de 5,5 km (pas de saut d’un palier à l’autre)', () => {
    // Même allure (4:00/km) à 5,5 km et 5,6 km : l'ancien code sautait de ~5,5 %.
    const a = vmaFromRaceTime(5.5, 5.5 * 240);
    const b = vmaFromRaceTime(5.6, 5.6 * 240);
    expect(Math.abs(a - b) / a).toBeLessThan(0.01);
  });

  it('continue autour de 11 km et 22 km', () => {
    for (const km of [11, 22]) {
      const a = vmaFromRaceTime(km, km * 270);
      const b = vmaFromRaceTime(km + 0.1, (km + 0.1) * 270);
      expect(Math.abs(a - b) / a).toBeLessThan(0.01);
    }
  });

  it('cohérente entre distances : même niveau ⇒ VMA proche', () => {
    // Un athlète VDOT ~50 : 5 km 20:00, 10 km ~41:30, marathon ~3:10.
    const v5 = vmaFromRaceTime(5, 20 * MIN);
    const v10 = vmaFromRaceTime(10, 41 * MIN + 30);
    const vm = vmaFromRaceTime(42.195, 3 * 3600 + 10 * MIN);
    expect(Math.abs(v5 - v10)).toBeLessThan(0.8);
    expect(Math.abs(v5 - vm)).toBeLessThan(0.9);
  });

  it('meilleur chrono ⇒ VMA plus haute', () => {
    expect(vmaFromRaceTime(10, 38 * MIN)).toBeGreaterThan(vmaFromRaceTime(10, 48 * MIN));
  });

  it('entrées invalides ⇒ valeur par défaut, jamais NaN', () => {
    expect(vmaFromRaceTime(0, 1200)).toBe(14);
    expect(vmaFromRaceTime(5, 0)).toBe(14);
    expect(Number.isFinite(vmaFromRaceTime(5, NaN))).toBe(true);
  });

  it('résultat borné (10–22 km/h)', () => {
    expect(vmaFromRaceTime(5, 10 * MIN)).toBeLessThanOrEqual(22);
    expect(vmaFromRaceTime(5, 90 * MIN)).toBeGreaterThanOrEqual(10);
  });
});

describe('resolvePaceZones — chrono récent', () => {
  const refs: [string, number, number][] = [
    ['5 km 20:00', 5, 20 * MIN],
    ['5 km 27:00', 5, 27 * MIN],
    ['10 km 45:00', 10, 45 * MIN],
    ['semi 1:40', 21.0975, 100 * MIN],
    ['marathon 3:30', 42.195, 210 * MIN],
  ];

  for (const [label, km, sec] of refs) {
    describe(label, () => {
      const z = resolvePaceZones({ level: 'intermediaire', recentDistanceKm: km, recentTimeSec: sec });
      const racePace = sec / km;

      it('source = chrono', () => {
        expect(z.source).toBe('race');
      });

      it('ordre physiologique : intervalles < seuil < marathon < facile < sortie longue (allures)', () => {
        expect(center(z.interval)).toBeLessThan(center(z.threshold));
        expect(center(z.threshold)).toBeLessThan(center(z.marathon));
        expect(center(z.marathon)).toBeLessThan(center(z.easy));
        expect(center(z.easy)).toBeLessThanOrEqual(center(z.long));
      });

      it('bandes valides (min < max, valeurs positives et finies)', () => {
        for (const b of Object.values(z).filter((x): x is PaceBand => typeof x === 'object')) {
          expect(Number.isFinite(b.minSecPerKm)).toBe(true);
          expect(b.minSecPerKm).toBeGreaterThan(0);
          expect(b.minSecPerKm).toBeLessThanOrEqual(b.maxSecPerKm);
        }
      });

      it('les intervalles ne sont jamais plus rapides que ~ l’allure 1500 m de cet athlète', () => {
        // Garde-fou sécurité : intervalles ≥ 0,85 × allure de course (5 km) — l'ancien code
        // donnait 0,88 × sur 5 km puis descendait sous la limite pour d'autres distances.
        expect(center(z.interval)).toBeGreaterThan(racePace * (km <= 5.5 ? 0.9 : 0.78));
      });
    });
  }

  it('5 km 20:00 : seuil ≈ 4:16/km (88 % VO₂max), et plus lent que l’allure 5 km', () => {
    const z = resolvePaceZones({ level: 'confirme', recentDistanceKm: 5, recentTimeSec: 20 * MIN });
    expect(center(z.threshold)).toBeGreaterThan(250);
    expect(center(z.threshold)).toBeLessThan(262);
    expect(center(z.threshold)).toBeGreaterThan(20 * MIN / 5); // plus lent que 4:00/km
  });

  it('5 km 20:00 : intervalles ≈ 3:55/km, plus rapides que l’allure 5 km', () => {
    const z = resolvePaceZones({ level: 'confirme', recentDistanceKm: 5, recentTimeSec: 20 * MIN });
    expect(center(z.interval)).toBeGreaterThan(228);
    expect(center(z.interval)).toBeLessThan(242);
    expect(center(z.interval)).toBeLessThan(20 * MIN / 5);
  });

  it('10 km 40:00 : seuil plus lent que l’allure 10 km (4:00/km)', () => {
    const z = resolvePaceZones({ level: 'confirme', recentDistanceKm: 10, recentTimeSec: 40 * MIN });
    expect(center(z.threshold)).toBeGreaterThan(240);
  });

  it('allure marathon projetée depuis un 10 km ≈ Daniels (pas +6 % de l’allure 10 km)', () => {
    // 10 km 40:00 ⇒ VDOT ≈ 51,9 ⇒ marathon ≈ 3:06 ⇒ ~4:25/km. L'ancien code : 4:14/km.
    const z = resolvePaceZones({ level: 'confirme', recentDistanceKm: 10, recentTimeSec: 40 * MIN });
    expect(center(z.marathon)).toBeGreaterThan(258);
    expect(center(z.marathon)).toBeLessThan(272);
  });

  it('monotonie : meilleur chrono ⇒ toutes les allures plus rapides', () => {
    const fast = resolvePaceZones({ level: 'confirme', recentDistanceKm: 10, recentTimeSec: 38 * MIN });
    const slow = resolvePaceZones({ level: 'confirme', recentDistanceKm: 10, recentTimeSec: 50 * MIN });
    for (const k of ['easy', 'long', 'marathon', 'threshold', 'interval', 'race'] as const) {
      expect(center(fast[k])).toBeLessThan(center(slow[k]));
    }
  });
});

describe('resolvePaceZones — VMA / volume / défaut', () => {
  it('VMA explicite : intervalles ≈ 98 % VMA, seuil ≈ 88 % VMA', () => {
    const z = resolvePaceZones({ level: 'confirme', vmaKmh: 18 });
    expect(z.source).toBe('vma_default');
    expect(center(z.interval)).toBeCloseTo(3600 / (18 * 0.98), -1);
    expect(center(z.threshold)).toBeCloseTo(3600 / (18 * 0.88), -1);
  });

  it('les allures suivent la VMA sur tout le domaine 8–28 km/h (plus de plateau)', () => {
    // paceSecAtVmaPct était bornée à 10–23 km/h : au-delà, les allures ne bougeaient plus.
    const a = resolvePaceZones({ level: 'confirme', vmaKmh: 23 });
    const b = resolvePaceZones({ level: 'confirme', vmaKmh: 26 });
    expect(center(b.interval)).toBeLessThan(center(a.interval));
    const c = resolvePaceZones({ level: 'debutant', vmaKmh: 8 });
    const d = resolvePaceZones({ level: 'debutant', vmaKmh: 9.5 });
    expect(center(d.threshold)).toBeLessThan(center(c.threshold));
  });

  it('VMA absurde (40 km/h) ⇒ défaut du niveau, pas une VMA d’élite plafonnée', () => {
    expect(resolvePaceZones({ level: 'debutant', vmaKmh: 40 }).vmaKmh).toBe(12);
    expect(resolvePaceZones({ level: 'confirme', vmaKmh: 3 }).vmaKmh).toBe(18);
  });

  it('volume hebdo seul : plus de km ⇒ facile plus rapide', () => {
    const lo = resolvePaceZones({ level: 'intermediaire', weeklyKmAvg: 15 });
    const hi = resolvePaceZones({ level: 'intermediaire', weeklyKmAvg: 70 });
    expect(center(hi.easy)).toBeLessThan(center(lo.easy));
    expect(lo.source).toBe('volume');
  });

  it('aucune donnée ⇒ zones par défaut valides', () => {
    const z = resolvePaceZones({ level: 'debutant' });
    expect(z.vmaKmh).toBeGreaterThan(8);
    expect(z.easy.minSecPerKm).toBeLessThanOrEqual(z.easy.maxSecPerKm);
  });

  it('un niveau plus élevé ⇒ zones plus rapides (défaut)', () => {
    const d = resolvePaceZones({ level: 'debutant' });
    const c = resolvePaceZones({ level: 'confirme' });
    expect(center(c.easy)).toBeLessThan(center(d.easy));
  });
});

describe('échauffement', () => {
  const zones: PaceZones = resolvePaceZones({ level: 'confirme', recentDistanceKm: 10, recentTimeSec: 42 * MIN });

  it('toujours plus lent que le corps de séance', () => {
    for (const kind of ['easy', 'long', 'threshold', 'interval', 'marathon', 'race'] as const) {
      const wu = warmupBandForMain(zones, kind);
      const main = paceBandForRunKind(zones, kind);
      expect(center(wu)).toBeGreaterThan(center(main));
    }
  });

  it('deriveWarmupBand garde la largeur minimale (24 s)', () => {
    const wu = deriveWarmupBand({ minSecPerKm: 300, maxSecPerKm: 302 }, { minSecPerKm: 250, maxSecPerKm: 260 });
    expect(wu.maxSecPerKm - wu.minSecPerKm).toBeGreaterThanOrEqual(23);
  });
});

describe('paceBandForRunKind', () => {
  const zones = resolvePaceZones({ level: 'intermediaire', vmaKmh: 16 });
  it('renvoie la bande demandée', () => {
    expect(paceBandForRunKind(zones, 'threshold')).toBe(zones.threshold);
    expect(paceBandForRunKind(zones, 'interval')).toBe(zones.interval);
    expect(paceBandForRunKind(zones, 'long')).toBe(zones.long);
    expect(paceBandForRunKind(zones, 'easy')).toBe(zones.easy);
  });
});
