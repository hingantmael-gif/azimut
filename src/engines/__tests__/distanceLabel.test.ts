import { describe, expect, it } from 'vitest';
import { distanceLabelFromTitle } from '../../ui/program/distanceLabel';

describe('distanceLabelFromTitle', () => {
  it('extrait la distance des titres de programmes', () => {
    expect(distanceLabelFromTitle('Programme 5 km')).toBe('5K');
    expect(distanceLabelFromTitle('Programme 10 km')).toBe('10K');
    expect(distanceLabelFromTitle('Sortie 40 km')).toBe('40K');
    expect(distanceLabelFromTitle('Cyclosportive 80 km')).toBe('80K');
    expect(distanceLabelFromTitle('Natation 400 m')).toBe('400m');
  });
  it('semi et marathon', () => {
    expect(distanceLabelFromTitle('Semi')).toBe('21K');
    expect(distanceLabelFromTitle('Semi-marathon')).toBe('21K');
    expect(distanceLabelFromTitle('Marathon')).toBe('42K');
  });
  it('décimaux et titres sans distance', () => {
    expect(distanceLabelFromTitle('Objectif 12,5 km')).toBe('12.5K');
    expect(distanceLabelFromTitle('Force & mobilité')).toBeNull();
  });
});
