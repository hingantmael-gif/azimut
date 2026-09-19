import { describe, expect, it } from 'vitest';

// Copie pure des paramètres (le composant importe React Native, non chargeable ici).
import { tierStageParams } from '../../ui/profile/tierStageParams';

describe('tierStageParams', () => {
  it('l’intensité monte avec le palier', () => {
    const b = tierStageParams(1, false);
    const c = tierStageParams(7, false);
    expect(c.rays).toBeGreaterThan(b.rays);
    expect(c.rayOpacity).toBeGreaterThan(b.rayOpacity);
    expect(c.rings).toBeGreaterThanOrEqual(b.rings);
    expect(c.orbiters).toBeGreaterThan(b.orbiters);
    expect(c.rayRotateMs).toBeLessThan(b.rayRotateMs); // tourne plus vite
  });

  it('valeurs toujours valides, même hors bornes', () => {
    for (const lv of [-3, 0, 1, 4, 7, 99, NaN]) {
      const p = tierStageParams(lv as number, false);
      expect(Number.isFinite(p.rays)).toBe(true);
      expect(p.rays % 2).toBe(0);
      expect(p.rayRotateMs).toBeGreaterThan(5000);
      expect(p.ringMs).toBeGreaterThan(1000);
    }
  });

  it('les aperçus compacts restent sobres', () => {
    const p = tierStageParams(7, true);
    expect(p.rings).toBe(1);
    expect(p.orbiters).toBe(4);
    expect(p.rays).toBe(8);
  });
});
