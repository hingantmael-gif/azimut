import { describe, expect, it, vi } from 'vitest';
import { buildFitSteps, canEncodeFit, encodeFitWorkout, fitCrc } from '../fitWorkout';
import type { PlannedWorkout } from '../../types/domain';

vi.mock('react-native', () => ({ Platform: { OS: 'node' }, Share: {} }));

const step = (o: Record<string, unknown>) => ({ endCondition: 'duration', ...o }) as never;

const vma: PlannedWorkout = {
  id: 'w', title: 'Fractionné court · 400 m', date: '2026-09-21', discipline: 'run',
  steps: [
    step({ id: 'wu', type: 'warmup', label: 'Échauffement · footing', durationSec: 600 }),
    step({ id: 'a', type: 'active', label: '8 × 400 m', endCondition: 'distance', distanceMeters: 400, repeat: 8, target: { type: 'pace', minSecPerKm: 230, maxSecPerKm: 250 } }),
    step({ id: 'r', type: 'rest', label: 'Récup', durationSec: 60, repeat: 8 }),
    step({ id: 'cd', type: 'cooldown', label: 'Retour au calme', durationSec: 300 }),
  ],
} as PlannedWorkout;

describe('encodeFitWorkout', () => {
  const bytes = encodeFitWorkout(vma, new Date('2026-09-21T08:00:00Z'));

  it('en-tête FIT valide : taille, signature « .FIT », CRC d’en-tête', () => {
    expect(bytes[0]).toBe(14);
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('.FIT');
    const dataSize = bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);
    expect(bytes.length).toBe(14 + dataSize + 2);
    const headerCrc = bytes[12]! | (bytes[13]! << 8);
    expect(fitCrc(bytes, 0, 12)).toBe(headerCrc);
  });

  it('CRC de fichier : recalculer sur tout le fichier (CRC inclus) donne 0', () => {
    expect(fitCrc(bytes, 0, bytes.length)).toBe(0);
  });

  it('travail + récupération répétés → 2 étapes puis UN « répéter 8 fois »', () => {
    const steps = buildFitSteps(vma.steps);
    expect(steps).toHaveLength(5); // échauffement, travail, récup, répéter, retour au calme
    const rep = steps[3]!;
    expect(rep.durationType).toBe(6);
    expect(rep.durationValue).toBe(1); // reprend à l'étape « travail »
    expect(rep.targetValue).toBe(8);
  });

  it('allure cible → vitesse en m/s × 1000 (la plus rapide = borne haute)', () => {
    const work = buildFitSteps(vma.steps)[1]!;
    expect(work.targetType).toBe(0);
    expect(work.high).toBe(Math.round((1000 / 230) * 1000));
    expect(work.low).toBe(Math.round((1000 / 250) * 1000));
    expect(work.durationType).toBe(1); // distance
    expect(work.durationValue).toBe(40000); // centimètres
  });

  it('nom sans accents ni caractères spéciaux, borné à 31 caractères', () => {
    const text = String.fromCharCode(...bytes);
    expect(text).toContain('Fractionne court');
    expect(text).not.toContain('é');
  });

  it('musculation / callisthénie et repos non encodables en FIT', () => {
    expect(canEncodeFit({ ...vma, discipline: 'strength' } as PlannedWorkout)).toBe(true);
    expect(canEncodeFit({ ...vma, discipline: 'rest' } as PlannedWorkout)).toBe(false);
  });
});
