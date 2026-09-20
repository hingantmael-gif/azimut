import { describe, expect, it } from 'vitest';
import { computeInstantPace, smoothPace, type GpsSample } from '../gpsPace';

/** Trace régulière : `n` points, un par seconde, à `mps` m/s vers le nord (1° de latitude ≈ 111 195 m). */
const track = (n: number, mps: number, acc = 5): GpsSample[] =>
  Array.from({ length: n }, (_, i) => ({ lat: 45 + (i * mps) / 111195, lng: 5, timestamp: 1_000_000 + i * 1000, accuracy: acc }) as GpsSample);

describe('allure instantanée', () => {
  it('lit 5:00/km à 3,33 m/s sur une fenêtre de 10 s', () => {
    const p = computeInstantPace(track(20, 1000 / 300))!;
    expect(p).toBeGreaterThan(295);
    expect(p).toBeLessThan(305);
  });

  it('préfère la vitesse GPS quand elle est fournie', () => {
    expect(computeInstantPace(track(5, 2), 4)!).toBeCloseTo(250, 0);
  });

  it('réagit vite à une accélération : après 8 s à 4:00/km, on est déjà proche de 4:00', () => {
    let pace: number | null = 360; // 6:00/km avant
    for (let i = 0; i < 8; i++) pace = smoothPace(pace, 240, 1);
    expect(pace!).toBeLessThan(270);
  });

  it('ignore les fixes flous', () => {
    expect(computeInstantPace(track(20, 3, 60))).toBeNull();
  });
});
