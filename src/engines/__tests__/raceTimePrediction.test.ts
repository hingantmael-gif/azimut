import { describe, expect, it } from 'vitest';
import {
  cameronPredictSec,
  danielsPredictSec,
  durabilityTimeFactor,
  formatRaceClock,
  hybridPredictSec,
  predictCustomDistance,
  predictRaceTimes,
  riegelPredictSec,
  vdotFromRace,
} from '../raceTimePrediction';

const MIN = 60;
const H = 3600;

describe('riegelPredictSec', () => {
  it('10 km en 40:00 ⇒ semi ≈ 1:28 (exposant 1.06)', () => {
    const t = riegelPredictSec(10, 40 * MIN, 21.0975);
    expect(t).toBeCloseTo(40 * MIN * Math.pow(2.10975, 1.06), 6);
    expect(t / MIN).toBeGreaterThan(87);
    expect(t / MIN).toBeLessThan(89);
  });

  it('même distance ⇒ même temps', () => {
    expect(riegelPredictSec(5, 1200, 5)).toBeCloseTo(1200, 9);
  });

  it('entrées invalides ⇒ 0', () => {
    expect(riegelPredictSec(0, 1200, 10)).toBe(0);
    expect(riegelPredictSec(5, -1, 10)).toBe(0);
    expect(riegelPredictSec(5, 1200, 0)).toBe(0);
  });
});

describe('cameronPredictSec', () => {
  it('reste proche de Riegel sur 5 → 10 km (±2 %)', () => {
    const c = cameronPredictSec(5, 20 * MIN, 10);
    const r = riegelPredictSec(5, 20 * MIN, 10);
    expect(Math.abs(c - r) / r).toBeLessThan(0.02);
  });

  it('même distance ⇒ même temps', () => {
    expect(cameronPredictSec(10, 2400, 10)).toBeCloseTo(2400, 6);
  });
});

describe('VDOT (Daniels)', () => {
  it('5 km en 20:00 ⇒ VDOT ≈ 49.8 (table Daniels)', () => {
    expect(vdotFromRace(5, 20 * MIN)).toBeCloseTo(49.8, 0);
  });

  it('marathon en 3:00:00 ⇒ VDOT ≈ 53.5', () => {
    expect(vdotFromRace(42.195, 3 * H)).toBeCloseTo(53.5, 0);
  });

  it('aller-retour : danielsPredictSec(vdotFromRace(x)) ≈ x', () => {
    const vdot = vdotFromRace(10, 42 * MIN);
    expect(danielsPredictSec(vdot, 10)).toBeCloseTo(42 * MIN, 0);
  });

  it('VDOT plus élevé ⇒ temps plus court', () => {
    expect(danielsPredictSec(60, 10)).toBeLessThan(danielsPredictSec(50, 10));
  });
});

describe('durabilityTimeFactor', () => {
  it('ne pénalise jamais les distances courtes', () => {
    expect(durabilityTimeFactor(5, 10)).toBe(1);
    expect(durabilityTimeFactor(10, 5)).toBe(1);
  });

  it('marathon : pénalité décroissante avec le volume', () => {
    const f = (km: number) => durabilityTimeFactor(42.195, km);
    expect(f(20)).toBeGreaterThan(f(40));
    expect(f(40)).toBeGreaterThan(f(50));
    expect(f(50)).toBeGreaterThan(f(60));
    expect(f(60)).toBeGreaterThan(f(80));
    expect(f(80)).toBe(1);
  });

  it('facteur toujours ≥ 1 (jamais plus rapide que le modèle)', () => {
    for (const km of [undefined, 0, 10, 30, 50, 100]) {
      expect(durabilityTimeFactor(42.195, km)).toBeGreaterThanOrEqual(1);
      expect(durabilityTimeFactor(21.0975, km)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('hybridPredictSec', () => {
  it('distance de référence ⇒ renvoie le temps de référence', () => {
    expect(hybridPredictSec(10, 2500, 10)).toBe(2500);
  });

  it('les prédictions croissent avec la distance', () => {
    const preds = predictRaceTimes(5, 20 * MIN, { weeklyKmAvg: 60 });
    for (let i = 1; i < preds.length; i++) {
      expect(preds[i].predictedSec).toBeGreaterThan(preds[i - 1].predictedSec);
    }
  });

  it('l’allure ralentit avec la distance (jamais de « négatif split » irréaliste)', () => {
    const preds = predictRaceTimes(5, 20 * MIN, { weeklyKmAvg: 60 });
    for (let i = 1; i < preds.length; i++) {
      expect(preds[i].paceSecPerKm).toBeGreaterThanOrEqual(preds[i - 1].paceSecPerKm);
    }
  });

  it('5 km en 20:00 ⇒ marathon plausible (3:10–3:35 à 60 km/sem)', () => {
    const marathon = predictRaceTimes(5, 20 * MIN, { weeklyKmAvg: 60 }).find(
      (p) => p.distanceLabel === 'Marathon',
    )!;
    expect(marathon.predictedSec).toBeGreaterThan(3 * H + 10 * MIN);
    expect(marathon.predictedSec).toBeLessThan(3 * H + 35 * MIN);
  });

  it('un faible volume ralentit le marathon prédit', () => {
    const low = hybridPredictSec(5, 20 * MIN, 42.195, { weeklyKmAvg: 25 });
    const high = hybridPredictSec(5, 20 * MIN, 42.195, { weeklyKmAvg: 80 });
    expect(low).toBeGreaterThan(high);
  });

  it('un meilleur chrono de référence ⇒ meilleures prédictions', () => {
    expect(hybridPredictSec(10, 38 * MIN, 21.0975)).toBeLessThan(
      hybridPredictSec(10, 45 * MIN, 21.0975),
    );
  });

  it('sortie toujours finie et entière', () => {
    for (const [km, sec, target] of [
      [1, 200, 42.195],
      [42.195, 4 * H, 1],
      [100, 12 * H, 5],
    ] as const) {
      const v = hybridPredictSec(km, sec, target);
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe('predictRaceTimes', () => {
  it('entrées invalides ⇒ liste vide', () => {
    expect(predictRaceTimes(0, 1200)).toEqual([]);
    expect(predictRaceTimes(5, 0)).toEqual([]);
  });

  it('renvoie 5 distances avec allure cohérente', () => {
    const preds = predictRaceTimes(10, 45 * MIN);
    expect(preds.map((p) => p.distanceLabel)).toEqual(['5 km', '10 km', '20 km', 'Semi', 'Marathon']);
    const ten = preds.find((p) => p.distanceLabel === '10 km')!;
    expect(ten.predictedSec).toBe(45 * MIN);
    expect(ten.paceSecPerKm).toBe(270);
  });
});

describe('predictCustomDistance', () => {
  it('useHybrid=false ⇒ Riegel pur', () => {
    const r = predictCustomDistance({ refKm: 10, refTimeSec: 2400, targetKm: 63, useHybrid: false });
    expect(r.predictedSec).toBe(r.riegelSec);
  });

  it('distance cible nulle ⇒ allure 0 (pas de division par zéro)', () => {
    const r = predictCustomDistance({ refKm: 10, refTimeSec: 2400, targetKm: 0 });
    expect(r.paceSecPerKm).toBe(0);
  });
});

describe('formatRaceClock', () => {
  it('formate mm:ss et h:mm:ss', () => {
    expect(formatRaceClock(65)).toBe('1:05');
    expect(formatRaceClock(3600)).toBe('1:00:00');
    expect(formatRaceClock(3 * H + 5 * MIN + 9)).toBe('3:05:09');
  });

  it('arrondit sans produire « 60 » secondes', () => {
    expect(formatRaceClock(3599.6)).toBe('1:00:00');
    expect(formatRaceClock(59.6)).toBe('1:00');
  });

  it('valeurs invalides ⇒ tiret', () => {
    expect(formatRaceClock(undefined)).toBe('—');
    expect(formatRaceClock(0)).toBe('—');
    expect(formatRaceClock(NaN)).toBe('—');
    expect(formatRaceClock(-5)).toBe('—');
  });
});
