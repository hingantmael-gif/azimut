import { describe, expect, it } from 'vitest';
import { flowPercent } from '../liveWorkout';

describe('flowPercent', () => {
  it('pas de valeur avant 20 s mesurées', () => {
    expect(flowPercent(5, 19)).toBeNull();
  });
  it('part du temps dans la zone, arrondie et bornée', () => {
    expect(flowPercent(45, 60)).toBe(75);
    expect(flowPercent(60, 60)).toBe(100);
    expect(flowPercent(0, 60)).toBe(0);
    expect(flowPercent(90, 60)).toBe(100);
  });
  it('valeurs invalides ⇒ null', () => {
    expect(flowPercent(NaN, 60)).toBeNull();
    expect(flowPercent(10, Infinity)).toBeNull();
  });
});
