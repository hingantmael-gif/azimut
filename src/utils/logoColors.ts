import { BRAND } from '../constants/brand';

type Rgb = { r: number; g: number; b: number; a: number };

/** Parse #RGB, #RRGGBB ou rgba(r,g,b,a) */
export function parseCssColor(input: string): Rgb {
  const t = input.trim();
  if (t.startsWith('rgba') || t.startsWith('rgb')) {
    const inner = t.replace(/^rgba?\(/, '').replace(/\)$/, '');
    const parts = inner.split(',').map((p) => p.trim());
    return {
      r: Number(parts[0]) || 0,
      g: Number(parts[1]) || 0,
      b: Number(parts[2]) || 0,
      a: parts[3] != null ? Number(parts[3]) : 1,
    };
  }
  let hex = t.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const linear = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** Fond du marqueur = surface parente ; glyphe clair ou sombre selon contraste. */
export function logoColorsForSurface(surfaceColor: string): { surface: string; mark: string } {
  const rgb = parseCssColor(surfaceColor);
  const lum = relativeLuminance(rgb);
  const lightSurface = lum > 0.52;
  return {
    surface: surfaceColor,
    mark: lightSurface ? BRAND.ink : '#FFFFFF',
  };
}

/** Fusionne deux couleurs (ex. hero ink + wash vert). */
export function blendColors(base: string, overlay: string): string {
  const a = parseCssColor(base);
  const b = parseCssColor(overlay);
  const t = Math.min(1, Math.max(0, b.a));
  const r = Math.round(a.r * (1 - t) + b.r * t);
  const g = Math.round(a.g * (1 - t) + b.g * t);
  const bl = Math.round(a.b * (1 - t) + b.b * t);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
