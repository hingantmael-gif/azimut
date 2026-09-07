import { lightPalette } from './palettes';

/** Défaut clair — préférer useThemeColors() pour l'UI dynamique */
export const colors = lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 24,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '800' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  button: { fontSize: 16, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};
