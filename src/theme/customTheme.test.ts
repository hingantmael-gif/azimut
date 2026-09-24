import { describe, expect, it } from 'vitest';
import { darkPalette, lightPalette } from './palettes';
import {
  contrastRatio,
  DEFAULT_CUSTOM,
  ensureContrast,
  hexToHue,
  hslToHex,
  normalizeCustomTheme,
  parseHexInput,
  PATTERN_ORDER,
  resolveCustomPalette,
} from './customTheme';

describe('personnalisation — validation', () => {
  it('retombe sur les valeurs par défaut quand tout est invalide', () => {
    const t = normalizeCustomTheme({ accent: 'rouge', buttonStyle: 'xxx', motion: 42, active: 'oui' });
    expect(t.accent).toBe(DEFAULT_CUSTOM.accent);
    expect(t.buttonStyle).toBe('gradient');
    expect(t.motion).toBe('calm');
    expect(t.active).toBe(false);
  });
  it('accepte une saisie hexadécimale libre', () => {
    expect(parseHexInput('c026d3')).toBe('#C026D3');
    expect(parseHexInput('#f0a')).toBe('#FF00AA');
    expect(parseHexInput('zzz')).toBeNull();
  });
  it('teinte ↔ hex sont cohérents', () => {
    const h = hexToHue(hslToHex(200, 80, 50));
    expect(h).toBeGreaterThanOrEqual(198);
    expect(h).toBeLessThanOrEqual(202);
  });
  it('propose vingt fonds dont « aucun »', () => {
    expect(PATTERN_ORDER.length).toBe(20);
    expect(new Set(PATTERN_ORDER).size).toBe(20);
  });
});

describe('personnalisation — lisibilité automatique', () => {
  it('renforce une couleur trop pâle sur fond clair', () => {
    const pale = '#FDE047';
    expect(contrastRatio(pale, lightPalette.bg)).toBeLessThan(2);
    expect(contrastRatio(ensureContrast(pale, lightPalette.bg, 2.6), lightPalette.bg)).toBeGreaterThanOrEqual(2.6);
  });
  it('éclaircit une couleur trop sombre sur fond sombre', () => {
    const fixed = ensureContrast('#1E1B4B', darkPalette.bg, 4);
    expect(contrastRatio(fixed, darkPalette.bg)).toBeGreaterThanOrEqual(4);
  });
  it('le texte des boutons reste lisible sur toute couleur choisie', () => {
    for (const accent of ['#FDE047', '#0B1220', '#F8FAFC', '#EF4444', '#22C55E', '#6366F1']) {
      for (const [base, dark] of [[lightPalette, false], [darkPalette, true]] as const) {
        const p = resolveCustomPalette(base, { ...DEFAULT_CUSTOM, accent, accent2: accent }, dark);
        expect(contrastRatio(p.onAccent, p.gradientHero[0])).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('les cartes « verre » et « contour » sont prises en compte', () => {
    const glass = resolveCustomPalette(lightPalette, { ...DEFAULT_CUSTOM, cardStyle: 'glass' }, false);
    expect(glass.bgCard).toBe(lightPalette.glass);
    const outline = resolveCustomPalette(darkPalette, { ...DEFAULT_CUSTOM, cardStyle: 'outline' }, true);
    expect(outline.borderStrong).toBe(outline.accent);
  });
});
