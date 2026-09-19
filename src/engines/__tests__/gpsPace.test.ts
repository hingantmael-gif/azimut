import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveWindowPace,
  shouldCountGpsSegment,
  weightedRecentPace,
  type GpsSample,
} from '../gpsPace';

const M_PER_DEG_LAT = 111_195;
const T0 = 1_700_000_000_000;

/** Segment de vitesse constante vers le nord, 1 fix/s. */
function fixes(speeds: number[], accuracy = 5): GpsSample[] {
  let lat = 0;
  const out: GpsSample[] = [{ lat, lng: 0, accuracy, timestamp: T0 }];
  speeds.forEach((v, i) => {
    lat += v / M_PER_DEG_LAT;
    out.push({ lat, lng: 0, accuracy, timestamp: T0 + (i + 1) * 1000 });
  });
  return out;
}

describe('weightedRecentPace', () => {
  it('vide ⇒ null', () => {
    expect(weightedRecentPace([])).toBeNull();
  });

  it('valeur unique ⇒ elle-même', () => {
    expect(weightedRecentPace([300])).toBe(300);
  });

  it('le dernier échantillon pèse le plus', () => {
    const v = weightedRecentPace([400, 300])!; // poids 1 et 4
    expect(v).toBeCloseTo((400 * 1 + 300 * 4) / 5, 9);
    expect(v).toBeLessThan(350);
  });
});

describe('computeAdaptiveWindowPace', () => {
  it('vitesse constante 3,333 m/s ⇒ 300 s/km', () => {
    const pace = computeAdaptiveWindowPace(fixes(Array(30).fill(10 / 3)));
    expect(pace).toBeCloseTo(300, 0);
  });

  it('trop peu de données ⇒ null', () => {
    expect(computeAdaptiveWindowPace(fixes([3, 3]))).toBeNull();
    expect(computeAdaptiveWindowPace([])).toBeNull();
  });

  it('réagit à une accélération récente : les segments récents comptent PLUS que les anciens', () => {
    // 20 s à 3 m/s (5'33"/km) puis 6 s à 5 m/s (3'20"/km).
    const pts = fixes([...Array(20).fill(3), ...Array(6).fill(5)]);
    const pace = computeAdaptiveWindowPace(pts)!;
    // Moyenne non pondérée sur la fenêtre (~25 s : 6 s à 5 m/s + 19 s à 3 m/s) ≈ 3,5 m/s ≈ 286 s/km.
    // Avec poids décroissant avec l'âge, on doit être plus rapide que cette moyenne brute.
    const rawWindow = (6 + 19) / ((6 * 5 + 19 * 3) / 1000);
    expect(pace).toBeLessThan(rawWindow);
  });

  it('réagit à un ralentissement récent (poids décroissant avec l’âge)', () => {
    const pts = fixes([...Array(20).fill(4), ...Array(6).fill(2)]);
    const pace = computeAdaptiveWindowPace(pts)!;
    const rawWindow = (6 + 19) / ((6 * 2 + 19 * 4) / 1000);
    expect(pace).toBeGreaterThan(rawWindow);
  });

  it('ignore les fixes flous (> 25 m)', () => {
    const blurry = fixes(Array(30).fill(3), 60);
    expect(computeAdaptiveWindowPace(blurry)).toBeNull();
  });

  it('un signal net donne la même allure qu’un signal moyen sur un rythme constant', () => {
    const good = computeAdaptiveWindowPace(fixes(Array(30).fill(3), 5))!;
    const ok = computeAdaptiveWindowPace(fixes(Array(30).fill(3), 18))!;
    expect(good).toBeCloseTo(ok, 0);
  });

  it('allure disponible dès ~5 s de course (pas de retard dû à la pondération)', () => {
    expect(computeAdaptiveWindowPace(fixes(Array(5).fill(3), 18))).not.toBeNull();
  });
});

describe('shouldCountGpsSegment', () => {
  const base = { dtSec: 1, accuracyPrevM: 5, accuracyNextM: 5, nativeSpeedMps: 3 };

  it('foulée normale (3 m en 1 s, bon signal) : comptée', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 3 })).toBe(true);
  });

  it('sous 2,5 m avec un bon signal : ignoré (jitter)', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 1.8 })).toBe(false);
  });

  it('immobile avec un GPS flou (±35 m) : un « déplacement » de 10 m n’est pas de la distance', () => {
    expect(
      shouldCountGpsSegment({ distanceM: 10, dtSec: 1, accuracyPrevM: 35, accuracyNextM: 35, nativeSpeedMps: null }),
    ).toBe(false);
  });

  it('avec un GPS flou, un vrai déplacement (au-delà de l’incertitude) est compté', () => {
    expect(
      shouldCountGpsSegment({ distanceM: 40, dtSec: 10, accuracyPrevM: 35, accuracyNextM: 35, nativeSpeedMps: null }),
    ).toBe(true);
  });

  it('saut GPS irréaliste (> 28 m/s) : rejeté', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 200, dtSec: 1 })).toBe(false);
  });

  it('vitesse native quasi nulle + petit déplacement : rejeté', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 4, nativeSpeedMps: 0.1 })).toBe(false);
  });

  it('vitesse native quasi nulle mais gros déplacement : compté', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 30, dtSec: 20, nativeSpeedMps: 0.1 })).toBe(true);
  });

  it('distance nulle, NaN ou négative : rejetée', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 0 })).toBe(false);
    expect(shouldCountGpsSegment({ ...base, distanceM: NaN })).toBe(false);
    expect(shouldCountGpsSegment({ ...base, distanceM: -3 })).toBe(false);
  });

  it('horodatages dupliqués (dt = 0) : vitesse calculée sur 0,4 s minimum', () => {
    expect(shouldCountGpsSegment({ ...base, distanceM: 3, dtSec: 0 })).toBe(true);
    expect(shouldCountGpsSegment({ ...base, distanceM: 50, dtSec: 0 })).toBe(false);
  });

  it('précisions inconnues : comportement historique', () => {
    expect(shouldCountGpsSegment({ distanceM: 3, dtSec: 1 })).toBe(true);
    expect(shouldCountGpsSegment({ distanceM: 2, dtSec: 1 })).toBe(false);
  });
});

describe('simulation : immobile avec GPS bruité ⇒ pas de distance fantôme', () => {
  it('30 fixes autour d’un point fixe (bruit ±12 m, précision 30 m)', () => {
    // Bruit déterministe autour de (0,0).
    const noise = (i: number) => ({
      dLat: (Math.sin(i * 12.9898) * 12) / M_PER_DEG_LAT,
      dLng: (Math.cos(i * 78.233) * 12) / M_PER_DEG_LAT,
    });
    let counted = 0;
    let prev = { lat: 0, lng: 0, acc: 30 };
    for (let i = 1; i <= 30; i++) {
      const n = noise(i);
      const next = { lat: n.dLat, lng: n.dLng, acc: 30 };
      const d =
        Math.hypot((next.lat - prev.lat) * M_PER_DEG_LAT, (next.lng - prev.lng) * M_PER_DEG_LAT);
      if (
        shouldCountGpsSegment({
          distanceM: d,
          dtSec: 1,
          accuracyPrevM: prev.acc,
          accuracyNextM: next.acc,
          nativeSpeedMps: null,
        })
      ) {
        counted += d;
        prev = next;
      }
    }
    // Ancienne règle (seuil 2,5 m) : ~ des centaines de mètres fantômes. Nouvelle : ≤ quelques dizaines.
    expect(counted).toBeLessThan(60);
  });
});
