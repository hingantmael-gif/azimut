import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProgramsForSport, sortProgramsNatural } from '../../constants/programs';

describe('ordre des programmes', () => {
  it('course : distance croissante, VMA & vitesse en dernier', () => {
    const ids = sortProgramsNatural(getProgramsForSport('run')).map((p) => p.id);
    expect(ids.slice(0, 4)).toEqual(['prog-5k', 'prog-10k', 'prog-semi', 'prog-marathon']);
    expect(ids[ids.length - 1]).toBe('prog-vma');
  });
});

describe('suggestions de villes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ne garde que les villes du pays dont le nom commence par la saisie (5 max)', async () => {
    const feat = (name: string, cc: string, state = 'Région') => ({ properties: { name, countrycode: cc, state, country: 'France' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('ipwho.is')) {
          return { json: async () => ({ success: true, country_code: 'FR', country: 'France', latitude: 48, longitude: 2 }) };
        }
        return {
          ok: true,
          json: async () => ({
            features: [
              feat('Lille', 'FR'),
              feat('Lyon', 'FR'),
              feat('Élancourt', 'FR'),
              feat('Elche', 'ES'),
              feat('Saint-Élie', 'FR'),
              feat('Elbeuf', 'FR'),
              feat('Elne', 'FR'),
              feat('Eloyes', 'FR'),
              feat('Elven', 'FR'),
              feat('Elbeuf', 'FR'),
            ],
          }),
        };
      }),
    );
    const { searchCities } = await import('../../services/geoCities');
    const r = await searchCities('el');
    expect(r.map((c) => c.name)).toEqual(['Élancourt', 'Elbeuf', 'Elne', 'Eloyes', 'Elven']);
    expect(r).toHaveLength(5);
    const one = await searchCities('ly');
    expect(one.map((c) => c.name)).toEqual(['Lyon']);
  });
});
