import { describe, expect, it } from 'vitest';
import { mixHex, readableOn, rgba } from './tokens';

describe('utilitaires couleur', () => {
  it('rgba convertit un hex 6 chiffres, sinon renvoie la valeur telle quelle', () => {
    expect(rgba('#0B8262', 0.5)).toBe('rgba(11, 130, 98, 0.5)');
    expect(rgba('rgba(1,2,3,0.4)', 0.5)).toBe('rgba(1,2,3,0.4)');
  });

  it('mixHex : bornes et milieu', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#000000', '#ffffff', 9)).toBe('#ffffff');
    expect(mixHex('nope', '#ffffff', 0.5)).toBe('nope');
  });

  it('readableOn : blanc sur fonds sombres, encre sur fonds clairs', () => {
    expect(readableOn('#0B8262')).toBe('#FFFFFF');
    expect(readableOn('#1D4ED8')).toBe('#FFFFFF');
    expect(readableOn('#3DFF9A')).toBe('#0B1B2B');
    expect(readableOn('#FFD166')).toBe('#0B1B2B');
    expect(readableOn('#F59E0B')).toBe('#0B1B2B');
  });
});
