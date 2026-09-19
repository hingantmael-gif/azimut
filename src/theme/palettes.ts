/**
 * Palettes Mova v2 — « jade & ink ».
 * Clair : blanc froid aéré + jade profond. Sombre : encre nuit + jade néon.
 *
 * ⚠ Les couleurs sémantiques (accent, warn, danger, success, sleep) restent en hex
 * à 6 chiffres : le code construit des variantes alpha par suffixe (`${c}22`).
 */

export type ColorPalette = {
  bg: string;
  bgSecondary: string;
  bgElevated: string;
  bgCard: string;
  surface: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  /** Texte / icône posés SUR l'accent (blanc en clair, encre en sombre : contraste AA). */
  onAccent: string;
  white: string;
  black: string;
  warn: string;
  danger: string;
  success: string;
  sleep: string;
  xp: string;
  ranked: string;
  tabInactive: string;
  premium: string;
  socialFacebook: string;
  socialApple: string;
  mapBg: string;
  mapRoute: string;
  /** Accents secondaires pour dégradés et illustrations de données. */
  accent2: string;
  accent3: string;
  /** Verre dépoli (barres flottantes, cartes translucides). */
  glass: string;
  glassBorder: string;
  /** Couleur d'ombre portée. */
  shadow: string;
  /** Voile derrière modales / feuilles. */
  overlay: string;
  /** Dégradés de marque (2 à 3 arrêts). */
  gradientBrand: readonly [string, string, string];
  gradientHero: readonly [string, string];
  gradientPremium: readonly [string, string];
};

export const lightPalette: ColorPalette = {
  bg: '#F5F8F7',
  bgSecondary: '#ECF2F0',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#E0E9E5',
  borderStrong: '#C5D5CE',
  text: '#0A1712',
  textSecondary: '#3D544B',
  textMuted: '#5B7168',
  accent: '#0B8262',
  accentDark: '#096B52',
  accentLight: 'rgba(11, 130, 98, 0.12)',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
  black: '#0A1712',
  warn: '#D97706',
  danger: '#DC2626',
  success: '#059669',
  sleep: '#2563EB',
  xp: '#B87400',
  ranked: '#6D4CFF',
  tabInactive: '#7A8F86',
  premium: '#B8860B',
  socialFacebook: '#1877F2',
  socialApple: '#000000',
  mapBg: '#E4E9E7',
  mapRoute: '#0B8262',
  accent2: '#0891B2',
  accent3: '#6D4CFF',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  shadow: '#0A2A20',
  overlay: 'rgba(8, 20, 16, 0.48)',
  gradientBrand: ['#096B52', '#0B8262', '#0891B2'],
  gradientHero: ['#0B8262', '#0891B2'],
  gradientPremium: ['#B8860B', '#E0A82E'],
};

export const darkPalette: ColorPalette = {
  bg: '#060D18',
  bgSecondary: '#0A1322',
  bgElevated: '#101B2E',
  bgCard: '#111D31',
  surface: '#111D31',
  border: '#1C2B42',
  borderStrong: '#2B405D',
  text: '#F3F7FB',
  textSecondary: '#A9B9C9',
  textMuted: '#7C8FA3',
  accent: '#3DFF9A',
  accentDark: '#12B87A',
  accentLight: 'rgba(61, 255, 154, 0.14)',
  onAccent: '#04140D',
  white: '#FFFFFF',
  black: '#060D18',
  warn: '#FBBF24',
  danger: '#F87171',
  success: '#34D399',
  sleep: '#60A5FA',
  xp: '#FFC53D',
  ranked: '#A78BFA',
  tabInactive: '#6E8197',
  premium: '#FFD166',
  socialFacebook: '#1877F2',
  socialApple: '#000000',
  mapBg: '#0C1828',
  mapRoute: '#3DFF9A',
  accent2: '#22D3EE',
  accent3: '#A78BFA',
  glass: 'rgba(17, 29, 49, 0.74)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  shadow: '#000000',
  overlay: 'rgba(2, 6, 14, 0.66)',
  gradientBrand: ['#12B87A', '#3DFF9A', '#22D3EE'],
  gradientHero: ['#12B87A', '#22D3EE'],
  gradientPremium: ['#FFC53D', '#FFD166'],
};
