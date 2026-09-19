import { describe, expect, it } from 'vitest';
import {
  buildCurveFromActivities,
  estimateCriticalPower,
  estimateCriticalPowerFromActivities,
  inferRiderProfile,
} from '../criticalPower';
import type { StravaActivity } from '../../types/domain';

/** Courbe théorique P(t) = CP + W'/t. */
const curveFor = (cp: number, w: number) => ({
  p1m: cp + w / 60,
  p5m: cp + w / 300,
  p20m: cp + w / 1200,
  p60m: cp + w / 3600,
});

const rideWithWatts = (watts: number[]): StravaActivity =>
  ({
    id: 'r',
    sport: 'bike',
    movingSec: watts.length,
    distanceM: watts.length * 8,
    streams: { watts },
  }) as unknown as StravaActivity;

const constant = (w: number, seconds: number) => Array.from({ length: seconds }, () => w);

describe('estimateCriticalPower', () => {
  it('retrouve CP et W’ d’une courbe théorique (5 min + 20 min)', () => {
    const c = curveFor(250, 20_000);
    const est = estimateCriticalPower({ p5m: c.p5m, p20m: c.p20m })!;
    expect(est.cp).toBe(250);
    expect(est.wPrime).toBe(20_000);
  });

  it('même résultat quelle que soit la paire de durées', () => {
    const c = curveFor(280, 18_000);
    const a = estimateCriticalPower({ p5m: c.p5m, p20m: c.p20m })!;
    const b = estimateCriticalPower({ p5m: c.p5m, p60m: c.p60m })!;
    const d = estimateCriticalPower({ p20m: c.p20m, p60m: c.p60m })!;
    expect(b.cp).toBe(a.cp);
    expect(d.cp).toBe(a.cp);
  });

  it('point unique 60 min ≈ CP', () => {
    expect(estimateCriticalPower({ p60m: 240 })!.cp).toBe(240);
  });

  it('point unique 20 min : CP = 95 % environ', () => {
    expect(estimateCriticalPower({ p20m: 300 })!.cp).toBe(286);
  });

  it('données insuffisantes ⇒ null', () => {
    expect(estimateCriticalPower({})).toBeNull();
    expect(estimateCriticalPower({ p5m: 300 })).toBeNull();
  });

  it('courbe incohérente (5 min < 20 min) ⇒ jamais de CP fantôme', () => {
    expect(estimateCriticalPower({ p5m: 200, p20m: 300 })).toBeNull();
  });

  it('CP toujours inférieure à la puissance 5 min et supérieure à 0', () => {
    const est = estimateCriticalPower({ p5m: 350, p20m: 290 })!;
    expect(est.cp).toBeLessThan(350);
    expect(est.cp).toBeGreaterThan(0);
  });
});

describe('inferRiderProfile', () => {
  it('unknown sans sprint ou sans durée longue', () => {
    expect(inferRiderProfile({})).toBe('unknown');
    expect(inferRiderProfile({ p5s: 900 })).toBe('unknown');
  });

  it('sprinter : gros pic 5 s', () => {
    expect(inferRiderProfile({ p5s: 1200, p5m: 330, p20m: 280 })).toBe('sprinter');
  });

  it('rouleur : courbe plate', () => {
    expect(inferRiderProfile({ p5s: 380, p5m: 300, p20m: 290 })).toBe('rouleur');
  });
});

describe('buildCurveFromActivities — puissance moyenne maximale', () => {
  it('trouve la meilleure fenêtre glissante (pas la moyenne globale)', () => {
    // 10 min à 150 W puis 5 min à 350 W : le meilleur 5 min = 350.
    const ride = rideWithWatts([...constant(150, 600), ...constant(350, 300)]);
    const curve = buildCurveFromActivities([ride]);
    expect(curve.p5m).toBe(350);
  });

  it('sortie plus courte que la fenêtre ⇒ pas de puissance pour cette durée', () => {
    // 25 min à 260 W : p60m ne doit PAS valoir 260 (ce n’est pas une puissance 60 min).
    const ride = rideWithWatts(constant(260, 25 * 60));
    const curve = buildCurveFromActivities([ride]);
    expect(curve.p20m).toBe(260);
    expect(curve.p60m).toBeUndefined();
  });

  it('une sortie de 10 min ne fabrique pas de p20m ni de p60m', () => {
    const curve = buildCurveFromActivities([rideWithWatts(constant(320, 600))]);
    expect(curve.p5m).toBe(320);
    expect(curve.p20m).toBeUndefined();
    expect(curve.p60m).toBeUndefined();
  });

  it('CP non gonflée par les sorties courtes', () => {
    // Athlète réel : 2 sorties de 30 min, l'une à 300 W.
    const short = rideWithWatts(constant(300, 30 * 60));
    const est = estimateCriticalPowerFromActivities([short]);
    // p5m = p20m = 300 W (courbe plate) : aucune CP fiable, et surtout jamais > 300 W.
    expect(est === null || est.cp <= 300).toBe(true);
  });

  it('sans watts : courbe vide et CP indisponible (pas de proxy implicite)', () => {
    const noPower = { id: 'x', sport: 'bike', movingSec: 3600, distanceM: 30_000 } as unknown as StravaActivity;
    expect(buildCurveFromActivities([noPower])).toEqual({});
    expect(estimateCriticalPowerFromActivities([noPower])).toBeNull();
  });

  it('ignore les sorties non vélo', () => {
    const run = { ...rideWithWatts(constant(300, 1800)), sport: 'run' } as StravaActivity;
    expect(buildCurveFromActivities([run])).toEqual({});
  });
});
