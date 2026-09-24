import { describe, expect, it } from 'vitest';
import { formatMinutes } from '../core';

describe('formatMinutes', () => {
  it('formate minutes et heures', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
    expect(formatMinutes(125.4)).toBe('2 h 5 min');
  });
  it('valeurs invalides ⇒ tiret', () => {
    expect(formatMinutes(0)).toBe('—');
    expect(formatMinutes(-5)).toBe('—');
    expect(formatMinutes(NaN)).toBe('—');
  });
});
