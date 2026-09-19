import { describe, expect, it } from 'vitest';
import {
  applyXp,
  claimDailyPresenceXp,
  clampXp,
  computeCompliance,
  computeSessionXp,
  decideAdaptiveAction,
  levelFromXp,
  maxCareerXp,
  tierFromLevel,
  totalXpToReachLevel,
  xpPerKmFromCompliance,
  xpProgressFromTotal,
  xpRequiredForLevel,
} from '../core';
import type { PlannedWorkout, RankedProgress, StravaActivity } from '../../types/domain';

const ranked = (xp: number, extra: Partial<RankedProgress> = {}): RankedProgress =>
  ({ xp, level: levelFromXp(xp), weekXp: 0, ...extra }) as RankedProgress;

describe('courbe XP', () => {
  it('xpRequiredForLevel est strictement croissante', () => {
    for (let l = 1; l < 120; l++) {
      expect(xpRequiredForLevel(l + 1)).toBeGreaterThan(xpRequiredForLevel(l));
    }
  });

  it('niveaux ≤ 0 ou fractionnaires traités comme entiers ≥ 1', () => {
    expect(xpRequiredForLevel(0)).toBe(xpRequiredForLevel(1));
    expect(xpRequiredForLevel(-4)).toBe(xpRequiredForLevel(1));
    expect(xpRequiredForLevel(3.9)).toBe(xpRequiredForLevel(3));
  });

  it('levelFromXp est l’inverse de totalXpToReachLevel (bornes exactes)', () => {
    for (const lv of [1, 2, 5, 9, 10, 27, 54, 55, 99]) {
      const floor = totalXpToReachLevel(lv);
      expect(levelFromXp(floor)).toBe(lv);
      if (lv > 1) expect(levelFromXp(floor - 1)).toBe(lv - 1);
    }
  });

  it('XP négatif ou NaN ⇒ niveau 1', () => {
    expect(levelFromXp(-100)).toBe(1);
    expect(levelFromXp(0)).toBe(1);
  });

  it('xpProgressFromTotal : cohérence et ratio dans [0,1]', () => {
    for (const xp of [0, 1, 39, 100, 5000, 123456]) {
      const p = xpProgressFromTotal(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThanOrEqual(1);
      expect(p.xpIntoLevel + p.remaining).toBe(p.xpForNext);
      expect(totalXpToReachLevel(p.level) + p.xpIntoLevel).toBe(Math.floor(xp));
    }
  });

  it('maxCareerXp correspond au dernier XP du niveau 99', () => {
    expect(levelFromXp(maxCareerXp())).toBe(99);
    expect(levelFromXp(maxCareerXp() + 1)).toBe(100);
  });
});

describe('tierFromLevel', () => {
  it('9 niveaux par palier puis Champion dès 55', () => {
    expect(tierFromLevel(1)).toBe('bronze');
    expect(tierFromLevel(9)).toBe('bronze');
    expect(tierFromLevel(10)).toBe('argent');
    expect(tierFromLevel(19)).toBe('or');
    expect(tierFromLevel(28)).toBe('diamant');
    expect(tierFromLevel(37)).toBe('platine');
    expect(tierFromLevel(46)).toBe('elite');
    expect(tierFromLevel(54)).toBe('elite');
    expect(tierFromLevel(55)).toBe('champion');
    expect(tierFromLevel(500)).toBe('champion');
  });

  it('niveau ≤ 0 ⇒ bronze', () => {
    expect(tierFromLevel(0)).toBe('bronze');
    expect(tierFromLevel(-3)).toBe('bronze');
  });
});

describe('clampXp / applyXp', () => {
  it('clampXp : jamais négatif, fini, plafonné', () => {
    expect(clampXp(-5)).toBe(0);
    expect(clampXp(NaN)).toBe(0);
    expect(clampXp(Infinity)).toBe(0);
    expect(clampXp(1e12)).toBe(maxCareerXp());
    expect(clampXp(12.9)).toBe(12);
  });

  it('applyXp ajoute le gain et recalcule le niveau', () => {
    const r = applyXp(ranked(0), 500);
    expect(r.xp).toBe(500);
    expect(r.level).toBe(levelFromXp(500));
    expect(r.weekXp).toBe(500);
  });

  it('un gain négatif est ignoré', () => {
    expect(applyXp(ranked(300), -100).xp).toBe(300);
  });

  it('un gain NaN ou infini ne remet JAMAIS l’XP à zéro', () => {
    expect(applyXp(ranked(500, { weekXp: 80 }), NaN)).toMatchObject({ xp: 500, weekXp: 80 });
    expect(applyXp(ranked(500, { weekXp: 80 }), Infinity)).toMatchObject({ xp: 500, weekXp: 80 });
  });

  it('ne mute pas l’objet d’origine', () => {
    const original = ranked(100);
    applyXp(original, 50);
    expect(original.xp).toBe(100);
  });
});

describe('claimDailyPresenceXp', () => {
  it('1× par jour', () => {
    const first = claimDailyPresenceXp(ranked(0), '2026-03-01');
    expect(first.gained).toBe(15);
    const second = claimDailyPresenceXp(first.ranked, '2026-03-01');
    expect(second.gained).toBe(0);
    expect(second.ranked.xp).toBe(first.ranked.xp);
    expect(claimDailyPresenceXp(first.ranked, '2026-03-02').gained).toBe(15);
  });
});

describe('computeSessionXp', () => {
  const base = {
    durationSec: 3600,
    distanceM: 10_000,
    compliance: 100,
    streakMultiplier: 1,
    rpeSubmitted: false,
  };

  it('10 km à 100 % de conformité : 10 XP/km + 1 XP/3 min, bonus ×1.2', () => {
    const r = computeSessionXp(base);
    // 100 (distance) + 20 (durée) = 120 ; ×1.2 = 144
    expect(r.base).toBe(120);
    expect(r.total).toBe(144);
  });

  it('total = somme des composantes', () => {
    const r = computeSessionXp({ ...base, streakMultiplier: 1.2, rpeSubmitted: true, isFirstSessionOfDay: true });
    expect(r.total).toBe(r.base + r.complianceBonus + r.streakBonus + r.rpeBonus + r.firstSessionBonus);
    expect(r.rpeBonus).toBe(40);
    expect(r.firstSessionBonus).toBe(20);
  });

  it('bonus de série plafonné à ×1.25', () => {
    const capped = computeSessionXp({ ...base, streakMultiplier: 5 });
    const max = computeSessionXp({ ...base, streakMultiplier: 1.25 });
    expect(capped.total).toBe(max.total);
  });

  it('meilleure conformité ⇒ jamais moins d’XP', () => {
    let prev = -1;
    for (const c of [0, 40, 70, 85, 95, 100]) {
      const t = computeSessionXp({ ...base, compliance: c }).total;
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('entrées absurdes ⇒ total fini et ≥ 0', () => {
    for (const bad of [NaN, -1, Infinity]) {
      const r = computeSessionXp({
        durationSec: bad,
        distanceM: bad,
        compliance: bad,
        streakMultiplier: bad,
        rpeSubmitted: false,
      });
      expect(Number.isFinite(r.total)).toBe(true);
      expect(r.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('xpPerKmFromCompliance : 5 → 10, borné, NaN ⇒ 5', () => {
    expect(xpPerKmFromCompliance(0)).toBe(5);
    expect(xpPerKmFromCompliance(100)).toBe(10);
    expect(xpPerKmFromCompliance(500)).toBe(10);
    expect(xpPerKmFromCompliance(-20)).toBe(5);
    expect(xpPerKmFromCompliance(NaN)).toBe(5);
  });
});

describe('computeCompliance', () => {
  const planned = (over: Partial<PlannedWorkout> = {}): PlannedWorkout =>
    ({
      id: 'w1',
      date: '2026-03-01',
      title: 'EF',
      steps: [],
      plannedDistanceM: 10_000,
      plannedDurationSec: 3600,
      ...over,
    }) as PlannedWorkout;

  const activity = (over: Partial<StravaActivity> = {}): StravaActivity =>
    ({ id: 'a1', distanceM: 10_000, movingSec: 3600, ...over }) as StravaActivity;

  it('séance exécutée exactement comme prévu ⇒ volume 100', () => {
    const c = computeCompliance(planned(), activity());
    expect(c.volumeScore).toBe(100);
    expect(c.total).toBeGreaterThan(80);
  });

  it('volume : symétrique (10 % en moins = 10 % en plus)', () => {
    const under = computeCompliance(planned(), activity({ distanceM: 9_000, movingSec: 3240 }));
    const over = computeCompliance(planned(), activity({ distanceM: 11_000, movingSec: 3960 }));
    expect(under.volumeScore).toBe(over.volumeScore);
    expect(under.volumeScore).toBe(90);
  });

  it('volume ≥ 0 même si la séance fait plus de 2× le plan', () => {
    const c = computeCompliance(planned(), activity({ distanceM: 50_000, movingSec: 20_000 }));
    expect(c.volumeScore).toBe(0);
    expect(c.total).toBeGreaterThanOrEqual(0);
  });

  it('total toujours dans [0,100]', () => {
    for (const d of [0, 1, 5_000, 10_000, 30_000]) {
      const c = computeCompliance(planned(), activity({ distanceM: d, movingSec: d * 0.36 }));
      expect(c.total).toBeGreaterThanOrEqual(0);
      expect(c.total).toBeLessThanOrEqual(100);
    }
  });

  it('intensité : part du temps dans la zone d’allure cible', () => {
    const w = planned({
      steps: [
        { type: 'active', target: { type: 'pace', minSecPerKm: 300, maxSecPerKm: 330 } },
      ] as never,
    });
    // 3 points sur 4 dans la zone (v = 1000/p m/s)
    const inZone = 1000 / 315;
    const out = 1000 / 400;
    const c = computeCompliance(
      w,
      activity({ streams: { velocitySmooth: [inZone, inZone, inZone, out] } as never }),
    );
    expect(c.intensityScore).toBe(75);
  });

  it('régularité : allures de tours homogènes > tours irréguliers', () => {
    const steady = computeCompliance(
      planned(),
      activity({ laps: [{ avgPaceSecPerKm: 300 }, { avgPaceSecPerKm: 301 }, { avgPaceSecPerKm: 299 }] as never }),
    );
    const erratic = computeCompliance(
      planned(),
      activity({ laps: [{ avgPaceSecPerKm: 240 }, { avgPaceSecPerKm: 360 }, { avgPaceSecPerKm: 280 }] as never }),
    );
    expect(steady.regularityScore).toBeGreaterThan(erratic.regularityScore);
  });

  it('plan sans distance ni durée ⇒ pas de division par zéro', () => {
    const c = computeCompliance(
      planned({ plannedDistanceM: undefined, plannedDurationSec: undefined, steps: [] }),
      activity(),
    );
    expect(Number.isFinite(c.total)).toBe(true);
  });
});

describe('decideAdaptiveAction', () => {
  it('douleur ciblée : priorité absolue sur tout le reste', () => {
    const a = decideAdaptiveAction({ compliance: 100, muscle: 'douleur_ciblee', acwrForceRest: false });
    expect(a).toMatchObject({ case: 3, reason: 'injury' });
  });

  it('ACWR > 1.5 ⇒ récupération facile', () => {
    expect(decideAdaptiveAction({ compliance: 100, acwrForceRest: true })).toMatchObject({
      case: 2,
      type: 'easy_recovery',
    });
  });

  it('VFC en chute > 10 % ou RPE > 8 ⇒ volume −25 %', () => {
    expect(decideAdaptiveAction({ compliance: 90, hrvDeltaPct: -12 })).toMatchObject({
      type: 'reduce_volume',
      pct: 25,
    });
    expect(decideAdaptiveAction({ compliance: 90, rpe: 9 })).toMatchObject({
      type: 'reduce_volume',
      pct: 25,
    });
  });

  it('seuils stricts : VFC −10 % et RPE 8 ne déclenchent pas la réduction', () => {
    expect(decideAdaptiveAction({ compliance: 90, hrvDeltaPct: -10, rpe: 8 })).not.toMatchObject({
      type: 'reduce_volume',
    });
  });

  it('conformité < 50 ⇒ recalcul de la charge sans décalage', () => {
    expect(decideAdaptiveAction({ compliance: 30 })).toMatchObject({
      type: 'recalc_weekly_load_no_shift',
    });
  });

  it('bon sommeil + RPE sous l’attendu + conformité > 95 ⇒ +1.5 % d’allure', () => {
    const a = decideAdaptiveAction({
      compliance: 98,
      sleepScore: 92,
      rpe: 4,
      expectedRpe: 6,
    });
    expect(a).toMatchObject({ type: 'increase_pace', pct: 1.5 });
  });

  it('jamais d’augmentation d’allure sans donnée de sommeil', () => {
    const a = decideAdaptiveAction({ compliance: 100, rpe: 3, expectedRpe: 7 });
    expect(a.type).not.toBe('increase_pace');
  });

  it('aucun signal ⇒ défaut sûr', () => {
    expect(decideAdaptiveAction({ compliance: 80 })).toMatchObject({
      type: 'recalc_weekly_load_no_shift',
    });
  });
});
