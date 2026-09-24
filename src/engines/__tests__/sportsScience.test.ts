import { describe, expect, it } from 'vitest';
import {
  classifySessionKind,
  computeAcwr,
  computeTrimp,
  minDayGapForKind,
  minRestHoursForKind,
  trimpToBanisterLoad,
} from '../sportsScience';

/** ISO date (UTC) `n` jours avant `base`. */
function daysBefore(base: string, n: number): string {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('computeTrimp', () => {
  it('= durée × RPE', () => {
    expect(computeTrimp(60, 5)).toBe(300);
  });

  it('borne le RPE entre 1 et 10', () => {
    expect(computeTrimp(10, 0)).toBe(10);
    expect(computeTrimp(10, 99)).toBe(100);
  });

  it('ignore les durées négatives', () => {
    expect(computeTrimp(-30, 5)).toBe(0);
  });
});

describe('trimpToBanisterLoad', () => {
  it('reste dans [0.5, 20]', () => {
    expect(trimpToBanisterLoad(0)).toBeGreaterThanOrEqual(0.5);
    expect(trimpToBanisterLoad(1e6)).toBe(20);
  });

  it('est monotone croissante', () => {
    expect(trimpToBanisterLoad(240)).toBeGreaterThan(trimpToBanisterLoad(120));
  });
});

describe('computeAcwr', () => {
  const asOf = '2026-03-15';

  it('charge constante ⇒ ratio ≈ 1 (fenêtres correctes)', () => {
    // 1 séance de charge 10 chaque jour sur 28 jours.
    const loads = Array.from({ length: 28 }, (_, i) => ({
      date: daysBefore(asOf, i),
      load: 10,
    }));
    const r = computeAcwr(loads, asOf);
    expect(r.acute7).toBeCloseTo(10, 1);
    expect(r.chronic28).toBeCloseTo(10, 1);
    expect(r.ratio).toBeCloseTo(1, 1);
    expect(r.forceRest).toBe(false);
  });

  it('une séance à J-7 ne compte pas dans la charge aiguë de 7 jours', () => {
    // Fenêtre aiguë = 7 jours : J0..J-6.
    const r = computeAcwr([{ date: daysBefore(asOf, 7), load: 70 }], asOf);
    expect(r.acute7).toBe(0);
  });

  it('une séance à J-28 ne compte pas dans la charge chronique de 28 jours', () => {
    const r = computeAcwr([{ date: daysBefore(asOf, 28), load: 280 }], asOf);
    expect(r.chronic28).toBe(0);
  });

  it('ignore les séances futures', () => {
    const r = computeAcwr([{ date: daysBefore(asOf, -1), load: 100 }], asOf);
    expect(r.acute7).toBe(0);
    expect(r.chronic28).toBe(0);
  });

  it('pic de charge récente ⇒ forceRest', () => {
    const loads = [
      ...Array.from({ length: 21 }, (_, i) => ({ date: daysBefore(asOf, i + 7), load: 4 })),
      ...Array.from({ length: 7 }, (_, i) => ({ date: daysBefore(asOf, i), load: 14 })),
    ];
    const r = computeAcwr(loads, asOf);
    expect(r.ratio).toBeGreaterThan(1.5);
    expect(r.forceRest).toBe(true);
  });

  it('aucune donnée ⇒ ratio neutre 1, pas de repos forcé', () => {
    const r = computeAcwr([], asOf);
    expect(r).toMatchObject({ acute7: 0, chronic28: 0, ratio: 1, forceRest: false });
  });

  it('résultat identique de part et d’autre d’un changement d’heure', () => {
    // 2026-03-29 : passage à l’heure d’été en Europe (journée de 23 h).
    const across = computeAcwr(
      Array.from({ length: 28 }, (_, i) => ({ date: daysBefore('2026-04-02', i), load: 10 })),
      '2026-04-02',
    );
    expect(across.acute7).toBeCloseTo(10, 1);
    expect(across.chronic28).toBeCloseTo(10, 1);
  });

  it('accepte des dates ISO complètes (avec heure)', () => {
    const r = computeAcwr([{ date: `${asOf}T18:30:00.000Z`, load: 7 }], `${asOf}T06:00:00.000Z`);
    expect(r.acute7).toBe(1);
  });
});

describe('classifySessionKind', () => {
  it('force max via objectif puissance ou RPE ≥ 9', () => {
    expect(classifySessionKind({ discipline: 'strength', strengthGoal: 'power' })).toBe('max_strength');
    expect(classifySessionKind({ discipline: 'strength', expectedRpe: 9 })).toBe('max_strength');
  });

  it('musculation standard = hypertrophie', () => {
    expect(classifySessionKind({ discipline: 'strength', expectedRpe: 6 })).toBe('hypertrophy');
  });

  it('détecte VMA / tempo / récupération par titre ou RPE', () => {
    expect(classifySessionKind({ title: 'Séance VMA 10×400' })).toBe('vma');
    expect(classifySessionKind({ expectedRpe: 8 })).toBe('vma');
    expect(classifySessionKind({ title: 'Tempo 3×10' })).toBe('tempo');
    expect(classifySessionKind({ expectedRpe: 7 })).toBe('tempo');
    expect(classifySessionKind({ title: 'Récup active' })).toBe('recovery');
    expect(classifySessionKind({ expectedRpe: 2 })).toBe('recovery');
  });

  it('défaut = endurance fondamentale', () => {
    expect(classifySessionKind({})).toBe('ef');
    expect(classifySessionKind({ expectedRpe: 5 })).toBe('ef');
  });
});

describe('fenêtres de récupération', () => {
  it('plus l’intensité monte, plus le repos minimal est long', () => {
    expect(minRestHoursForKind('vma')).toBeGreaterThan(minRestHoursForKind('tempo'));
    expect(minRestHoursForKind('tempo')).toBeGreaterThan(minRestHoursForKind('ef'));
    expect(minRestHoursForKind('max_strength')).toBeGreaterThanOrEqual(minRestHoursForKind('vma'));
  });

  it('écart en jours = ceil(h/24), au moins 1', () => {
    expect(minDayGapForKind('recovery')).toBe(1);
    expect(minDayGapForKind('vma')).toBe(2);
    expect(minDayGapForKind('max_strength')).toBe(3);
  });
});
