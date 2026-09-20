import { describe, expect, it } from 'vitest';
import { buildCoachLines, computeSplits, elevationProfile, hrZoneShares } from '../activityAnalysis';
import type { StravaActivity } from '../../types/domain';

/** ~3,3 km le long d'un méridien (1° lat ≈ 111 195 m), allure donnée, altitude et FC optionnelles. */
function run(paceSecPerKm: (km: number) => number, opts: { alt?: boolean; hr?: (i: number) => number } = {}): StravaActivity {
  const latlng: [number, number][] = [];
  const time: number[] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  let t = 0;
  let distM = 0;
  for (let i = 0; i <= 330; i++) {
    latlng.push([45 + distM / 111195, 5]);
    time.push(Math.round(t));
    altitude.push(100 + i * 0.1);
    heartrate.push(opts.hr ? opts.hr(i) : 0);
    distM += 10;
    t += (paceSecPerKm(distM / 1000) / 1000) * 10;
  }
  return {
    id: 'a', name: 'Test', distanceM: 3300, elapsedSec: t, movingSec: t, startDate: '2026-01-01T08:00:00Z',
    streams: { time, latlng, altitude: opts.alt ? altitude : undefined, heartrate: opts.hr ? heartrate : undefined },
  };
}

describe('activityAnalysis', () => {
  it('découpe au km avec la bonne allure', () => {
    const s = computeSplits(run(() => 300));
    expect(s.filter((x) => x.fraction === 1)).toHaveLength(3);
    for (const x of s) expect(Math.abs(x.paceSecPerKm - 300)).toBeLessThan(3);
  });

  it('profil d’altitude seulement si la donnée existe', () => {
    expect(elevationProfile(run(() => 300))).toEqual([]);
    expect(elevationProfile(run(() => 300, { alt: true })).length).toBeGreaterThan(5);
  });

  it('zones FC : parts qui totalisent ~100 %', () => {
    const z = hrZoneShares(run(() => 300, { hr: () => 150 }), 190);
    expect(z.reduce((s, x) => s + x.pct, 0)).toBeGreaterThanOrEqual(99);
    expect(z[2]!.pct).toBeGreaterThan(95);
  });

  it('phrases courtes ; rien pour les données absentes', () => {
    expect(buildCoachLines(run(() => 300))).toEqual(['Allure stable']);
    const l = buildCoachLines(run((km) => (km < 1.6 ? 330 : 290)));
    expect(l).toContain('Fin de séance plus rapide');
    expect(buildCoachLines({ id: 'x', name: 'x', distanceM: 0, elapsedSec: 0, movingSec: 0, startDate: '' })).toEqual([]);
  });
});
