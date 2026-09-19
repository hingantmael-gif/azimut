import { lightPalette } from './palettes';

/** Défaut clair — préférer useThemeColors() pour l'UI dynamique */
export const colors = lightPalette;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
};

/**
 * Polices Manrope (chargées dans app/_layout). Sur natif, `fontWeight` n'agit pas sur
 * une police personnalisée : chaque graisse est une famille distincte.
 */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/** Échelle typographique (les graisses passent par `fontFamily`). */
export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  hero: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
};

/**
 * Élévations : `boxShadow` (RN 0.86 natif + RN-web) — remplace `shadow*` déprécié.
 * `shadowColor` vient de la palette (teinté jade en clair, noir en sombre).
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

export function elevation(level: ElevationLevel, shadowColor: string, isDark: boolean) {
  if (level === 0) return {};
  const a = isDark ? [0, 0.35, 0.45, 0.55] : [0, 0.08, 0.12, 0.18];
  const spec: Record<Exclude<ElevationLevel, 0>, string> = {
    1: `0px 1px 2px ${rgba(shadowColor, a[1]!)}, 0px 2px 8px ${rgba(shadowColor, a[1]! * 0.6)}`,
    2: `0px 2px 6px ${rgba(shadowColor, a[2]! * 0.8)}, 0px 10px 24px ${rgba(shadowColor, a[2]!)}`,
    3: `0px 4px 10px ${rgba(shadowColor, a[3]! * 0.7)}, 0px 18px 40px ${rgba(shadowColor, a[3]!)}`,
  };
  return { boxShadow: spec[level] };
}

/** `#RRGGBB` + alpha → `rgba()`. */
export function rgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Durées / courbes d'animation communes. */
export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  screen: 360,
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mélange `a` vers `b` (t = 0 → a, t = 1 → b). Repli sur `a` si un hex est invalide. */
export function mixHex(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return a;
  const k = Math.max(0, Math.min(1, t));
  const c = ra.map((v, i) => Math.round(v + (rb[i]! - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Encre ou blanc, selon le meilleur contraste (WCAG) sur le fond `bg`. */
export function readableOn(bg: string, ink = '#0B1B2B'): string {
  const rgb = hexToRgb(bg);
  if (!rgb) return '#FFFFFF';
  const lin = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
  // Blanc si le contraste avec le blanc dépasse celui avec l'encre (seuil ≈ 0,18 de luminance).
  return L > 0.18 ? ink : '#FFFFFF';
}
