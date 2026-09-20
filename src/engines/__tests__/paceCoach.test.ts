import { describe, expect, it } from 'vitest';
import { initialPaceCoach, nextPaceCue } from '../paceCoach';
import { paceStatus, paceZone } from '../liveWorkout';
import type { WorkoutStep } from '../../types/domain';

const step = (min: number, max: number) => ({ type: 'active', target: { type: 'pace', minSecPerKm: min, maxSecPerKm: max } }) as unknown as WorkoutStep;

describe('zone d’allure ±10 s', () => {
  it('élargit une cible étroite à au moins ±10 s autour du centre', () => {
    const z = paceZone(step(299, 301))!;
    expect(z.max - z.min).toBeGreaterThanOrEqual(20);
    expect((z.min + z.max) / 2).toBeCloseTo(300, 0);
  });

  it('5:00/km cible : 5:08 est dans la zone, 5:15 est trop lent, 4:45 trop rapide', () => {
    const s = step(300, 300);
    expect(paceStatus(308, s)).toBe('in_zone');
    expect(paceStatus(315, s)).toBe('too_slow');
    expect(paceStatus(285, s)).toBe('too_fast');
  });

  it('garde une zone large telle quelle', () => {
    const z = paceZone(step(270, 330))!;
    expect(z).toEqual({ min: 270, max: 330 });
  });
});

describe('coach vocal', () => {
  it('attend 5 s avant de dire « Accélère », puis répète toutes les 25 s', () => {
    let st = initialPaceCoach(0);
    let r = nextPaceCue(st, 'too_slow', 1000);
    expect(r.say).toBeNull();
    r = nextPaceCue(r.state, 'too_slow', 7000);
    expect(r.say).toBe('Accélère');
    r = nextPaceCue(r.state, 'too_slow', 15000);
    expect(r.say).toBeNull();
    r = nextPaceCue(r.state, 'too_slow', 33000);
    expect(r.say).toBe('Accélère');
  });

  it('félicite au retour dans la zone', () => {
    let r = nextPaceCue(initialPaceCoach(0), 'too_fast', 0);
    r = nextPaceCue(r.state, 'too_fast', 6000);
    expect(r.say).toBe('Ralentis');
    r = nextPaceCue(r.state, 'in_zone', 20000);
    r = nextPaceCue(r.state, 'in_zone', 23000);
    expect(r.say).toBe('Très bien, garde l’allure');
  });

  it('reste silencieux sans allure cible', () => {
    expect(nextPaceCue(initialPaceCoach(0), 'none', 100000).say).toBeNull();
  });
});
