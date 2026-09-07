/** Palettes Azimut — jade + ink (hors orange Strava / teal générique) */

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
};

export const lightPalette: ColorPalette = {
  bg: '#F3F8F6',
  bgSecondary: '#E7F1ED',
  bgElevated: '#FFFFFF',
  bgCard: '#FAFDFB',
  surface: '#FFFFFF',
  border: '#C9DDD5',
  borderStrong: '#A8C7BB',
  text: '#0B1A16',
  textSecondary: '#3A554C',
  textMuted: '#6A8278',
  accent: '#0E8F6F',
  accentDark: '#0A6B54',
  accentLight: 'rgba(14, 143, 111, 0.14)',
  white: '#FFFFFF',
  black: '#0B1A16',
  warn: '#D97706',
  danger: '#DC2626',
  success: '#059669',
  sleep: '#2563EB',
  xp: '#0E8F6F',
  ranked: '#0A6B54',
  tabInactive: '#6A8278',
  premium: '#0E8F6F',
  socialFacebook: '#1877F2',
  socialApple: '#000000',
  mapBg: '#E4E4E7',
  mapRoute: '#0E8F6F',
};

export const darkPalette: ColorPalette = {
  bg: '#081421',
  bgSecondary: '#0A1626',
  bgElevated: '#122033',
  bgCard: '#15263B',
  surface: '#122033',
  border: '#1E3348',
  borderStrong: '#2A4560',
  text: '#F4F7FA',
  textSecondary: '#A8B8C6',
  textMuted: '#7A8C9C',
  accent: '#3DFF9A',
  accentDark: '#0E8F6F',
  accentLight: 'rgba(61, 255, 154, 0.16)',
  white: '#FFFFFF',
  black: '#07111F',
  warn: '#FBBF24',
  danger: '#F87171',
  success: '#34D399',
  sleep: '#60A5FA',
  xp: '#D4FF3F',
  ranked: '#3DFF9A',
  tabInactive: '#7A8C9C',
  premium: '#3DFF9A',
  socialFacebook: '#1877F2',
  socialApple: '#000000',
  mapBg: '#0C1828',
  mapRoute: '#3DFF9A',
};
