import { describe, expect, it } from 'vitest';
import {
  bikeSecForDistanceKm,
  estimateFtpFromBikeTime,
  estimateFtpFromProfile,
  ftpIntensityForDurationMin,
  powerFromSpeedMps,
  predictBikeCatalog,
  predictBikeTimesSecMap,
  speedMpsFromPower,
} from '../bikePrediction';
import {
  cssPaceSecPer100,
  criticalSwimSpeedMps,
  estimateCssPaceFromRace,
  predictSwimCatalog,
  predictSwimTimesSecMap,
  swimSecForDistanceKm,
} from '../swimPrediction';

const MIN = 60;

describe('ftpIntensityForDurationMin', () => {
  it('décroît avec la durée (jamais de remontée)', () => {
    let prev = Infinity;
    for (let t = 1; t <= 600; t += 0.5) {
      const p = ftpIntensityForDurationMin(t);
      expect(p).toBeLessThanOrEqual(prev + 1e-12);
      prev = p;
    }
  });

  it('continue : pente ≤ 1 % de FTP par minute (l’ancien escalier sautait de 4 % d’un coup)', () => {
    for (let t = 1; t < 600; t += 1) {
      const d = Math.abs(ftpIntensityForDurationMin(t) - ftpIntensityForDurationMin(t + 1));
      expect(d).toBeLessThanOrEqual(0.0101);
    }
  });

  it('~1 h ≈ FTP (94–98 %), efforts courts > FTP, longs < FTP', () => {
    expect(ftpIntensityForDurationMin(60)).toBeGreaterThan(0.94);
    expect(ftpIntensityForDurationMin(60)).toBeLessThan(0.98);
    expect(ftpIntensityForDurationMin(5)).toBeGreaterThan(1.1);
    expect(ftpIntensityForDurationMin(400)).toBeCloseTo(0.7, 6);
  });

  it('entrée invalide ⇒ valeur par défaut, pas NaN', () => {
    expect(Number.isFinite(ftpIntensityForDurationMin(NaN))).toBe(true);
  });
});

describe('physique vélo (P = ½ρCdA v³ + Crr m g v)', () => {
  it('aller-retour puissance ↔ vitesse', () => {
    for (const w of [120, 200, 300, 450]) {
      const v = speedMpsFromPower(w, 84);
      expect(powerFromSpeedMps(v, 84)).toBeCloseTo(w, 1);
    }
  });

  it('plus de puissance ⇒ plus vite ; plus de masse ⇒ moins vite', () => {
    expect(speedMpsFromPower(300, 84)).toBeGreaterThan(speedMpsFromPower(200, 84));
    expect(speedMpsFromPower(250, 70)).toBeGreaterThan(speedMpsFromPower(250, 95));
  });

  it('250 W sur plat ≈ 35–40 km/h', () => {
    const kmh = speedMpsFromPower(250, 84) * 3.6;
    expect(kmh).toBeGreaterThan(34);
    expect(kmh).toBeLessThan(40);
  });

  it('entrées invalides ⇒ 0', () => {
    expect(speedMpsFromPower(0, 84)).toBe(0);
    expect(speedMpsFromPower(200, 0)).toBe(0);
    expect(powerFromSpeedMps(-3, 84)).toBe(0);
  });
});

describe('FTP', () => {
  it('estimateFtpFromBikeTime : aller-retour avec la prédiction depuis FTP', () => {
    const ftp = estimateFtpFromBikeTime(40, 65 * MIN, 75)!;
    expect(ftp).toBeGreaterThan(150);
    const sec = bikeSecForDistanceKm({}, 40, { ftpWatts: ftp, weightKg: 75 })!;
    // La prédiction reproduit le chrono d’origine (±2 %).
    expect(Math.abs(sec - 65 * MIN) / (65 * MIN)).toBeLessThan(0.02);
  });

  it('un chrono plus rapide ⇒ un FTP plus élevé', () => {
    expect(estimateFtpFromBikeTime(40, 55 * MIN, 75)!).toBeGreaterThan(estimateFtpFromBikeTime(40, 70 * MIN, 75)!);
  });

  it('valeurs hors plage (< 80 W ou > 500 W) ou invalides ⇒ null', () => {
    expect(estimateFtpFromBikeTime(0, 3600)).toBeNull();
    expect(estimateFtpFromBikeTime(40, 0)).toBeNull();
    expect(estimateFtpFromBikeTime(40, 10 * MIN, 75)).toBeNull(); // 240 km/h
    expect(estimateFtpFromBikeTime(10, 5 * 3600, 75)).toBeNull(); // 2 km/h
  });

  it('estimateFtpFromProfile : bornée et croissante avec le niveau', () => {
    const d = estimateFtpFromProfile({ level: 'debutant' });
    const c = estimateFtpFromProfile({ level: 'confirme' });
    expect(c).toBeGreaterThan(d);
    expect(estimateFtpFromProfile({ level: 'confirme', weightKg: 300 })).toBeLessThanOrEqual(380);
    expect(estimateFtpFromProfile({ level: 'debutant', weightKg: 45 })).toBeGreaterThanOrEqual(120);
  });
});

describe('predictBikeCatalog', () => {
  it('sans donnée ⇒ aucune prédiction', () => {
    expect(predictBikeCatalog({})).toEqual([]);
  });

  it('un chrono mesuré est renvoyé tel quel', () => {
    const rows = predictBikeCatalog({ '40k': 3900 }, { weightKg: 75 });
    const r40 = rows.find((r) => r.key === '40k')!;
    expect(r40.isMeasured).toBe(true);
    expect(r40.predictedSec).toBe(3900);
    expect(r40.method).toBe('measured');
  });

  it('avec un seul chrono : durées croissantes et vitesse moyenne décroissante avec la distance', () => {
    const rows = predictBikeCatalog({ '40k': 65 * MIN }, { weightKg: 75 });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.predictedSec).toBeGreaterThan(rows[i - 1]!.predictedSec);
      expect(rows[i]!.avgKmh).toBeLessThanOrEqual(rows[i - 1]!.avgKmh + 0.1);
    }
  });

  it('FTP seul : prédit tout le catalogue', () => {
    const rows = predictBikeCatalog({}, { ftpWatts: 250, weightKg: 75 });
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.every((r) => r.predictedSec > 0)).toBe(true);
  });

  it('plus de FTP ⇒ chronos plus courts sur toutes les distances', () => {
    const lo = predictBikeCatalog({}, { ftpWatts: 200, weightKg: 75 });
    const hi = predictBikeCatalog({}, { ftpWatts: 300, weightKg: 75 });
    for (let i = 0; i < lo.length; i++) expect(hi[i]!.predictedSec).toBeLessThan(lo[i]!.predictedSec);
  });

  it('predictBikeTimesSecMap conserve les chronos saisis', () => {
    const out = predictBikeTimesSecMap({ '40k': 3900 }, { weightKg: 75 });
    expect(out['40k']).toBe(3900);
    expect(out['80k']!).toBeGreaterThan(3900 * 1.9);
  });

  it('bikeSecForDistanceKm : distance personnalisée cohérente avec le catalogue', () => {
    const times = { '40k': 65 * MIN };
    const t50 = bikeSecForDistanceKm(times, 50, { weightKg: 75 })!;
    expect(t50).toBeGreaterThan(65 * MIN);
    expect(t50).toBeLessThan(65 * MIN * 1.4);
    expect(bikeSecForDistanceKm({}, 50)).toBeNull();
  });
});

describe('natation — CSS', () => {
  it('CSS = (400 − 200) m / (t400 − t200) ; exemple 200 m en 2:40, 400 m en 5:40 ⇒ 1,11 m/s', () => {
    const css = criticalSwimSpeedMps(160, 340)!;
    expect(css).toBeCloseTo(200 / 180, 9);
    expect(cssPaceSecPer100(css)).toBeCloseTo(90, 6); // 1'30"/100 m
  });

  it('chronos incohérents ⇒ null', () => {
    expect(criticalSwimSpeedMps(300, 250)).toBeNull();
    expect(criticalSwimSpeedMps(0, 300)).toBeNull();
    expect(criticalSwimSpeedMps(200, 200)).toBeNull();
  });

  it('cssPaceSecPer100 : 0 pour une vitesse invalide', () => {
    expect(cssPaceSecPer100(0)).toBe(0);
    expect(cssPaceSecPer100(-1)).toBe(0);
  });

  it('estimateCssPaceFromRace : un 400 m à 1\'35"/100 ⇒ CSS plus lent que l’allure 400 m', () => {
    const css = estimateCssPaceFromRace('400m', 380, 0.4)!;
    expect(css).toBeGreaterThan(95); // seuil plus lent que l’allure d’un 400 m
    expect(estimateCssPaceFromRace('inconnu', 380, 0.4)).toBeNull();
  });
});

describe('predictSwimCatalog', () => {
  it('sans chrono ⇒ vide', () => {
    expect(predictSwimCatalog({})).toEqual([]);
    expect(swimSecForDistanceKm({}, 1)).toBeNull();
  });

  it('un chrono mesuré est renvoyé tel quel', () => {
    const rows = predictSwimCatalog({ '400m': 380 });
    const r = rows.find((x) => x.key === '400m')!;
    expect(r.isMeasured).toBe(true);
    expect(r.predictedSec).toBe(380);
  });

  it('200 + 400 m : les prédictions croissent avec la distance (bassin)', () => {
    const rows = predictSwimCatalog({ '200m': 160, '400m': 340 });
    const pool = ['50m', '100m', '200m', '400m', '800m', '1500m'].map((k) => rows.find((r) => r.key === k)!);
    for (let i = 1; i < pool.length; i++) {
      expect(pool[i]!.predictedSec).toBeGreaterThan(pool[i - 1]!.predictedSec);
    }
  });

  it('l’allure /100 m ralentit avec la distance (à partir de 200 m)', () => {
    const rows = predictSwimCatalog({ '200m': 160, '400m': 340 });
    const paces = ['200m', '400m', '800m', '1500m'].map((k) => rows.find((r) => r.key === k)!.paceSecPer100);
    for (let i = 1; i < paces.length; i++) expect(paces[i]!).toBeGreaterThanOrEqual(paces[i - 1]! - 1);
  });

  it('eau libre plus lente que le bassin à distance égale', () => {
    const rows = predictSwimCatalog({ '200m': 160, '400m': 340 });
    const pool1k = predictSwimCatalog({ '200m': 160, '400m': 340 }).find((r) => r.key === '1k-ow')!;
    const p800 = rows.find((r) => r.key === '800m')!;
    const p1500 = rows.find((r) => r.key === '1500m')!;
    // 1 km eau libre : entre 800 m et 1500 m en durée, avec une allure ≥ celle du 800 m bassin.
    expect(pool1k.predictedSec).toBeGreaterThan(p800.predictedSec);
    expect(pool1k.predictedSec).toBeLessThan(p1500.predictedSec);
    expect(pool1k.paceSecPer100).toBeGreaterThanOrEqual(p800.paceSecPer100 - 1);
  });

  it('predictSwimTimesSecMap conserve les chronos saisis et complète le reste', () => {
    const out = predictSwimTimesSecMap({ '400m': 380 });
    expect(out['400m']).toBe(380);
    expect(out['800m']!).toBeGreaterThan(380 * 1.9);
    expect(out['800m']!).toBeLessThan(380 * 2.4);
  });

  it('un meilleur chrono ⇒ de meilleures prédictions', () => {
    const fast = predictSwimCatalog({ '400m': 330 });
    const slow = predictSwimCatalog({ '400m': 450 });
    for (let i = 0; i < fast.length; i++) expect(fast[i]!.predictedSec).toBeLessThan(slow[i]!.predictedSec);
  });

  it('sorties finies et positives', () => {
    for (const row of predictSwimCatalog({ '100m': 80 })) {
      expect(Number.isFinite(row.predictedSec) && row.predictedSec > 0).toBe(true);
    }
  });

  it('swimSecForDistanceKm : distance intermédiaire encadrée par ses voisines', () => {
    const t = { '400m': 380, '800m': 790 };
    const a = swimSecForDistanceKm(t, 0.6)!;
    expect(a).toBeGreaterThan(380);
    expect(a).toBeLessThan(790);
  });
});
