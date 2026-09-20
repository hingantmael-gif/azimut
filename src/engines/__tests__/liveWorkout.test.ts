import { describe, expect, it } from 'vitest';
import {
  INITIAL_LIVE_CURSOR,
  advanceLiveStepCursor,
  computeLiveKmSplits,
  computeLiveStepProgress,
  detectPaceAnomaly,
  flattenWorkoutSteps,
  formatLiveClock,
  formatLivePace,
  haversineM,
  paceGaugeLayout,
  paceStatus,
  type LiveStepCursor,
} from '../liveWorkout';
import { formatPace } from '../core';
import type { WorkoutStep } from '../../types/domain';

const step = (over: Partial<WorkoutStep> & Pick<WorkoutStep, 'id' | 'type'>): WorkoutStep =>
  ({ endCondition: 'duration', ...over }) as WorkoutStep;

/** Simule un tick par seconde à vitesse constante, en conservant le curseur (comme l'écran). */
function simulate(
  workout: WorkoutStep[],
  speedMps: number,
  totalSec: number,
): { index: number; cursor: LiveStepCursor; at: (sec: number) => number } {
  const flat = flattenWorkoutSteps(workout);
  let cursor: LiveStepCursor = INITIAL_LIVE_CURSOR;
  const indexAt: number[] = [];
  for (let t = 0; t <= totalSec; t++) {
    cursor = advanceLiveStepCursor(cursor, flat, t, t * speedMps);
    indexAt[t] = cursor.index;
  }
  return { index: cursor.index, cursor, at: (sec) => indexAt[sec]! };
}

describe('haversineM', () => {
  it('0 pour deux points identiques', () => {
    expect(haversineM({ lat: 48.85, lng: 2.35 }, { lat: 48.85, lng: 2.35 })).toBe(0);
  });

  it('1° de latitude ≈ 111,2 km', () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('symétrique', () => {
    const a = { lat: 45.76, lng: 4.83 };
    const b = { lat: 48.85, lng: 2.35 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });

  it('Paris → Lyon ≈ 392 km', () => {
    const d = haversineM({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 });
    expect(d / 1000).toBeGreaterThan(388);
    expect(d / 1000).toBeLessThan(396);
  });

  it('points antipodaux : pas de NaN', () => {
    expect(Number.isFinite(haversineM({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }))).toBe(true);
  });
});

describe('flattenWorkoutSteps', () => {
  it('entrelace effort / récupération quand les répétitions correspondent', () => {
    const flat = flattenWorkoutSteps([
      step({ id: 'wu', type: 'warmup', durationSec: 600 }),
      step({ id: 'a', type: 'active', distanceMeters: 400, endCondition: 'distance', repeat: 3 }),
      step({ id: 'r', type: 'rest', durationSec: 90, repeat: 3 }),
      step({ id: 'cd', type: 'cooldown', durationSec: 300 }),
    ]);
    expect(flat.map((s) => s.type)).toEqual([
      'warmup',
      'active', 'rest', 'active', 'rest', 'active', 'rest',
      'cooldown',
    ]);
    expect(flat.map((s) => s.flatIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(flat[1]!.displayLabel).toBe('Effort (1/3)');
    expect(new Set(flat.map((s) => s.id)).size).toBe(flat.length);
  });

  it('plafonne les répétitions à 40', () => {
    const flat = flattenWorkoutSteps([step({ id: 'a', type: 'active', repeat: 500 })]);
    expect(flat).toHaveLength(40);
  });

  it('aucune étape ⇒ liste vide', () => {
    expect(flattenWorkoutSteps([])).toEqual([]);
  });
});

describe('computeLiveStepProgress — séances mixtes durée / distance', () => {
  const workout: WorkoutStep[] = [
    step({ id: 'wu', type: 'warmup', durationSec: 600 }), // 10 min
    step({ id: 'a', type: 'active', distanceMeters: 400, endCondition: 'distance', repeat: 3 }),
    step({ id: 'r', type: 'rest', durationSec: 90, repeat: 3 }),
    step({ id: 'cd', type: 'cooldown', durationSec: 300 }),
  ];

  it('échauffement 10 min à 3,3 m/s (≈ 2 km) : le 400 m suivant démarre à 0, pas « déjà fini »', () => {
    const sim = simulate(workout, 3.3, 601);
    // À t = 601 s : échauffement fini, on est dans le 1er effort (index 1)
    expect(sim.at(601)).toBe(1);
    const flat = flattenWorkoutSteps(workout);
    const p = computeLiveStepProgress(flat, 601, 601 * 3.3, sim.cursor);
    expect(p.stepIndex).toBe(1);
    expect(p.step.type).toBe('active');
    expect(p.ratio).toBeLessThan(0.05);
    expect(p.remainingM).toBeGreaterThan(390);
  });

  it('le 400 m se termine après ~400 m, et la récupération dure bien 90 s', () => {
    const speed = 4; // 4 m/s ⇒ 400 m = 100 s
    const sim = simulate(workout, speed, 900);
    // Effort 1 : de 600 s à ~700 s ; récup 1 : ~700 → ~790 s
    expect(sim.at(650)).toBe(1);
    expect(sim.at(705)).toBe(2);
    expect(sim.at(780)).toBe(2); // récup encore en cours (90 s complètes)
    expect(sim.at(795)).toBe(3); // 2e effort
  });

  it('parcours complet : les 8 étapes sont traversées dans l’ordre, sans saut', () => {
    const sim = simulate(workout, 4, 1500);
    const flat = flattenWorkoutSteps(workout);
    expect(flat).toHaveLength(8);
    let prev = 0;
    for (let t = 0; t <= 1500; t++) {
      const idx = sim.at(t);
      expect(idx - prev).toBeLessThanOrEqual(1); // jamais deux étapes d’un coup
      expect(idx).toBeGreaterThanOrEqual(prev); // jamais de retour en arrière
      prev = idx;
    }
    expect(sim.index).toBe(7); // retour au calme en cours (dernière étape, fin manuelle)
  });

  it('le temps passé sur un effort à distance n’est pas décompté de la récupération', () => {
    // Effort lent : 400 m à 2 m/s = 200 s ; la récup doit ensuite durer 90 s complètes.
    const sim = simulate(workout, 2, 1200);
    let restStart = -1;
    let restEnd = -1;
    for (let t = 0; t <= 1200; t++) {
      if (sim.at(t) === 2 && restStart < 0) restStart = t;
      if (sim.at(t) === 3 && restStart >= 0 && restEnd < 0) restEnd = t;
    }
    expect(restEnd - restStart).toBeGreaterThanOrEqual(89);
    expect(restEnd - restStart).toBeLessThanOrEqual(91);
  });

  it('appel sans curseur (sans état) : ne saute jamais d’étape à distance en bloc', () => {
    const flat = flattenWorkoutSteps(workout);
    const p = computeLiveStepProgress(flat, 610, 610 * 3.3);
    expect(p.step.type === 'active' || p.step.type === 'warmup').toBe(true);
    expect(p.ratio).toBeGreaterThanOrEqual(0);
    expect(p.ratio).toBeLessThanOrEqual(1);
  });
});

describe('computeLiveStepProgress — cas simples', () => {
  it('aucune étape ⇒ séance libre', () => {
    const p = computeLiveStepProgress([], 100, 500);
    expect(p.step.displayLabel).toBe('Séance libre');
    expect(p.totalSteps).toBe(1);
  });

  it('étape à durée : ratio et temps restant', () => {
    const flat = flattenWorkoutSteps([step({ id: 'a', type: 'active', durationSec: 600 })]);
    const p = computeLiveStepProgress(flat, 150, 0);
    expect(p.ratio).toBeCloseTo(0.25, 6);
    expect(p.remainingSec).toBe(450);
  });

  it('dernière étape : ne se termine jamais toute seule', () => {
    const flat = flattenWorkoutSteps([step({ id: 'a', type: 'active', durationSec: 60 })]);
    const p = computeLiveStepProgress(flat, 5000, 0);
    expect(p.stepIndex).toBe(0);
    expect(p.ratio).toBe(1);
    expect(p.remainingSec).toBe(0);
  });

  it('étape ouverte (bouton tour) non finale : passe à la suivante après 3 min', () => {
    const flat = flattenWorkoutSteps([
      step({ id: 'o', type: 'active', endCondition: 'lap_button' }),
      step({ id: 'b', type: 'active', durationSec: 600 }),
    ]);
    expect(computeLiveStepProgress(flat, 100, 0).stepIndex).toBe(0);
    expect(computeLiveStepProgress(flat, 200, 0).stepIndex).toBe(1);
  });

  it('compteurs remis à zéro ⇒ le curseur repart du début', () => {
    const flat = flattenWorkoutSteps([
      step({ id: 'a', type: 'active', durationSec: 60 }),
      step({ id: 'b', type: 'active', durationSec: 60 }),
    ]);
    const c = advanceLiveStepCursor(INITIAL_LIVE_CURSOR, flat, 90, 0);
    expect(c.index).toBe(1);
    expect(advanceLiveStepCursor(c, flat, 10, 0).index).toBe(0);
  });

  it('idempotent : rappeler avec le même instant ne change pas le curseur', () => {
    const flat = flattenWorkoutSteps([
      step({ id: 'a', type: 'active', durationSec: 60 }),
      step({ id: 'b', type: 'active', durationSec: 60 }),
    ]);
    const c1 = advanceLiveStepCursor(INITIAL_LIVE_CURSOR, flat, 90, 0);
    const c2 = advanceLiveStepCursor(c1, flat, 90, 0);
    expect(c2).toEqual(c1);
  });
});

describe('computeLiveKmSplits', () => {
  /** Points GPS à vitesse constante vers le nord (1° lat ≈ 111 195 m), 1 point / seconde. */
  const track = (speedMps: number, seconds: number, t0 = 1_700_000_000_000) =>
    Array.from({ length: seconds + 1 }, (_, i) => ({
      lat: (i * speedMps) / 111_195,
      lng: 0,
      timestamp: t0 + i * 1000,
    }));

  it('à 4 m/s, chaque km ≈ 250 s (4\'10")', () => {
    const splits = computeLiveKmSplits(track(4, 1300));
    expect(splits).toHaveLength(5);
    for (const s of splits) expect(s.paceLabel).toBe(`4'10"`);
  });

  it('renvoie TOUS les splits (le HUD affiche les 2 derniers : avant, figé après le km 8)', () => {
    const splits = computeLiveKmSplits(track(4, 12 * 250 + 10));
    expect(splits).toHaveLength(12);
    expect(splits.at(-1)!.km).toBe(12);
  });

  it('interpole l’instant de passage entre deux points espacés', () => {
    // 1 point toutes les 10 s à 3,3 m/s ⇒ 33 m entre points ; km à 303,03 s.
    const pts = Array.from({ length: 64 }, (_, i) => ({
      lat: (i * 10 * 3.3) / 111_195,
      lng: 0,
      timestamp: 1_700_000_000_000 + i * 10_000,
    }));
    const [s1] = computeLiveKmSplits(pts);
    // Sans interpolation : 310 s (5'10"). Avec : ≈ 303 s (5'03").
    expect(s1!.paceLabel).toBe(`5'03"`);
  });

  it('moins de 2 points ⇒ aucun split', () => {
    expect(computeLiveKmSplits([])).toEqual([]);
    expect(computeLiveKmSplits([{ lat: 0, lng: 0, timestamp: 0 }])).toEqual([]);
  });

  it('saut GPS franchissant plusieurs km : pas de split à 1 s fantôme', () => {
    const pts = [
      { lat: 0, lng: 0, timestamp: 0 },
      { lat: 2500 / 111_195, lng: 0, timestamp: 600_000 }, // 2,5 km en 10 min
    ];
    const splits = computeLiveKmSplits(pts);
    expect(splits.map((s) => s.km)).toEqual([1, 2]);
    // Interpolation : 240 s / km chacun (4'00")
    expect(splits.every((s) => s.paceLabel === `4'00"`)).toBe(true);
  });
});

describe('formats', () => {
  it('formatLivePace : arrondi propre, jamais « 60 » secondes', () => {
    expect(formatLivePace(359.6)).toBe(`6'00"`);
    expect(formatLivePace(299.5)).toBe(`5'00"`);
    expect(formatLivePace(330)).toBe(`5'30"`);
    expect(formatLivePace(65)).toBe('—'); // < 90 s/km : irréaliste
  });

  it('formatPace (core) : même correction', () => {
    expect(formatPace(359.6)).toBe(`6'00"`);
    expect(formatPace(300.4)).toBe(`5'00"`);
    expect(formatPace(285)).toBe(`4'45"`);
  });

  it('formatLivePace : valeurs invalides ⇒ tiret', () => {
    expect(formatLivePace(null)).toBe('—');
    expect(formatLivePace(NaN)).toBe('—');
    expect(formatLivePace(5000)).toBe('—');
  });

  it('formatLiveClock', () => {
    expect(formatLiveClock(59)).toBe('0:59');
    expect(formatLiveClock(3725)).toBe('1:02:05');
    expect(formatLiveClock(-4)).toBe('0:00');
  });
});

describe('paceStatus / paceGaugeLayout', () => {
  const s = step({
    id: 'a',
    type: 'active',
    target: { type: 'pace', minSecPerKm: 270, maxSecPerKm: 290 },
  });

  it('trop rapide / dans la zone / trop lent (zone élargie à ±10 s)', () => {
    // cible 4:30–4:50 (270–290) : zone verte = 270–290 (déjà ≥ ±10 s autour de 280)
    expect(paceStatus(250, s)).toBe('too_fast');
    expect(paceStatus(268, s)).toBe('too_fast');
    expect(paceStatus(270, s)).toBe('in_zone');
    expect(paceStatus(290, s)).toBe('in_zone');
    expect(paceStatus(292, s)).toBe('too_slow');
  });

  it('sans cible d’allure ou sans allure courante ⇒ none', () => {
    expect(paceStatus(280, null)).toBe('none');
    expect(paceStatus(null, s)).toBe('none');
    expect(paceStatus(280, step({ id: 'b', type: 'active' }))).toBe('none');
  });

  it('jauge : aiguille dans [0,1], zone centrée, bornes inversées tolérées', () => {
    const g = paceGaugeLayout(280, 270, 290);
    expect(g.needle).toBeGreaterThan(g.zoneStart);
    expect(g.needle).toBeLessThan(g.zoneEnd);
    expect(paceGaugeLayout(100, 270, 290).needle).toBe(0);
    expect(paceGaugeLayout(900, 270, 290).needle).toBe(1);
    expect(paceGaugeLayout(280, 290, 270)).toEqual(g);
    expect(paceGaugeLayout(null, 270, 290).needle).toBeCloseTo(0.5, 2);
  });
});

describe('detectPaceAnomaly', () => {
  const steady = [300, 302, 298, 301, 299];

  it('rien avant 75 s de course', () => {
    expect(
      detectPaceAnomaly({ currentPaceSecPerKm: 500, avgPaceSecPerKm: 300, recentPaces: steady, step: null, movingSec: 30 }),
    ).toBeNull();
  });

  it('allure stable ⇒ aucune anomalie', () => {
    expect(
      detectPaceAnomaly({ currentPaceSecPerKm: 301, avgPaceSecPerKm: 300, recentPaces: steady, step: null, movingSec: 600 }),
    ).toBeNull();
  });

  it('ralentissement brutal vs médiane récente', () => {
    const a = detectPaceAnomaly({
      currentPaceSecPerKm: 390,
      avgPaceSecPerKm: 305,
      recentPaces: [...steady, 390],
      step: null,
      movingSec: 600,
    });
    expect(a?.kind).toBe('sudden_slowdown');
    expect(a?.severity).toBe('strong');
  });

  it('dérive de fatigue vs moyenne de séance', () => {
    const a = detectPaceAnomaly({
      currentPaceSecPerKm: 345,
      avgPaceSecPerKm: 300,
      recentPaces: [340, 342, 344],
      step: null,
      movingSec: 900,
    });
    expect(a?.kind).toBe('fatigue_drift');
  });

  it('allure aberrante (GPS) ignorée', () => {
    expect(
      detectPaceAnomaly({ currentPaceSecPerKm: 1500, avgPaceSecPerKm: 300, recentPaces: steady, step: null, movingSec: 600 }),
    ).toBeNull();
    expect(
      detectPaceAnomaly({ currentPaceSecPerKm: null, avgPaceSecPerKm: 300, recentPaces: steady, step: null, movingSec: 600 }),
    ).toBeNull();
  });

  it('hors zone cible sur étape active', () => {
    const a = detectPaceAnomaly({
      currentPaceSecPerKm: 330,
      avgPaceSecPerKm: 325,
      recentPaces: [328, 329, 330],
      step: step({ id: 's', type: 'active', target: { type: 'pace', minSecPerKm: 270, maxSecPerKm: 290 } }),
      movingSec: 300,
    });
    expect(a?.kind).toBe('zone_collapse');
  });
});
