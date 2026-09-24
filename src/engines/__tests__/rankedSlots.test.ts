import { describe, expect, it } from 'vitest';
import {
  TIER_PROMOTE_SLOTS,
  TIER_RELEGATE_SLOTS,
  ladderZoneForPlace,
  promoteSlotsFor,
  relegateSlotsFor,
} from '../rankedSeason';
import { DIVISION_POOL_SIZE } from '../rankedLadder';

const TIERS = ['bronze', 'argent', 'or', 'diamant', 'platine', 'elite'] as const;

describe('places de promotion / rétrogradation', () => {
  it('la barre de promotion se resserre en montant de ligue', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIER_PROMOTE_SLOTS[TIERS[i]!]).toBeLessThan(TIER_PROMOTE_SLOTS[TIERS[i - 1]!]);
    }
  });

  it('paliers du milieu accessibles : Or → Diamant ≥ 30 places, Platine → Élite ≥ 20 places', () => {
    expect(TIER_PROMOTE_SLOTS.or).toBeGreaterThanOrEqual(30);
    expect(TIER_PROMOTE_SLOTS.platine).toBeGreaterThanOrEqual(20);
  });

  it('Élite → Champion reste exclusif (top 10)', () => {
    expect(TIER_PROMOTE_SLOTS.elite).toBe(10);
  });

  it('promotion et rétrogradation ne se chevauchent jamais (il reste une zone de sécurité)', () => {
    for (const t of TIERS) {
      expect(TIER_PROMOTE_SLOTS[t] + TIER_RELEGATE_SLOTS[t]).toBeLessThan(DIVISION_POOL_SIZE);
    }
  });

  it('Bronze 3 est un plancher (jamais rétrogradé) ; Champion n’est jamais promu', () => {
    expect(relegateSlotsFor('bronze', 3)).toBe(0);
    expect(promoteSlotsFor('champion')).toBe(0);
  });

  it('zones cohérentes autour des seuils (Or)', () => {
    const n = TIER_PROMOTE_SLOTS.or;
    expect(ladderZoneForPlace(n, 'or', 2)).toBe('promote');
    expect(ladderZoneForPlace(n + 1, 'or', 2)).toBe('safe');
    expect(ladderZoneForPlace(DIVISION_POOL_SIZE, 'or', 2)).toBe('relegate');
  });
});
