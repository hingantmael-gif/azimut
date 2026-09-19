import { describe, expect, it } from 'vitest';
import { buildTopoPaths, seedFromString } from '../topoLines';

describe('seedFromString', () => {
  it('stable et borné', () => {
    expect(seedFromString('free-teal')).toBe(seedFromString('free-teal'));
    expect(seedFromString('free-teal')).not.toBe(seedFromString('free-night'));
    for (const id of ['a', 'prem-aurora', 'dist-run-10k', '']) {
      const s = seedFromString(id);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(10_000);
    }
  });
});

describe('buildTopoPaths', () => {
  it('génère le nombre de lignes demandé, avec des chemins valides', () => {
    const paths = buildTopoPaths({ seed: 42, lines: 10, h: 160 });
    expect(paths).toHaveLength(10);
    for (const p of paths) {
      expect(p.d.startsWith('M ')).toBe(true);
      expect(p.d).not.toMatch(/NaN|Infinity/);
      expect(p.t).toBeGreaterThanOrEqual(0);
      expect(p.t).toBeLessThanOrEqual(1);
    }
  });

  it('déterministe : même graine ⇒ mêmes courbes', () => {
    expect(buildTopoPaths({ seed: 7, lines: 6 })).toEqual(buildTopoPaths({ seed: 7, lines: 6 }));
  });

  it('graines différentes ⇒ reliefs différents', () => {
    const a = buildTopoPaths({ seed: 7, lines: 6 })[2]!.d;
    const b = buildTopoPaths({ seed: 4321, lines: 6 })[2]!.d;
    expect(a).not.toBe(b);
  });

  it('les lignes restent dans la hauteur (marge pour l’amplitude)', () => {
    const h = 200;
    for (const p of buildTopoPaths({ seed: 999, lines: 12, h })) {
      const ys = [...p.d.matchAll(/ (-?\d+(?:\.\d+)?)(?= Q| T|$)/g)].map((m) => Number(m[1]));
      for (const y of ys) {
        expect(y).toBeGreaterThan(-40);
        expect(y).toBeLessThan(h + 40);
      }
    }
  });

  it('une ligne « maîtresse » toutes les 4 lignes', () => {
    const majors = buildTopoPaths({ seed: 1, lines: 9 }).filter((p) => p.major).length;
    expect(majors).toBe(3);
  });

  it('borne le nombre de lignes à 2 minimum', () => {
    expect(buildTopoPaths({ seed: 1, lines: 0 })).toHaveLength(2);
  });
});
