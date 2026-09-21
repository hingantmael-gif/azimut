import type { ColorPalette } from './palettes';
import { BRAND } from '../constants/brand';
import { mixHex, radii, readableOn, rgba } from './tokens';
import type { PatternKind } from '../ui/atmosphere/AuroraPatterns';

/**
 * Personnalisation de l'application (Premium). Sans personnalisation, l'app standard reste inchangée.
 * Tout est dérivé d'un petit jeu de choix : couleurs (accent + fond), motif et animation du fond,
 * boutons, cartes et texte. Les contrastes sont recalculés automatiquement pour rester lisibles.
 */
export type PatternId = PatternKind | 'none';
export type MotionLevel = 'off' | 'calm' | 'lively';
export type ButtonStyle = 'gradient' | 'solid' | 'outline' | 'glass';
export type ButtonShape = 'soft' | 'pill' | 'square';
export type ButtonPress = 'spring' | 'pulse' | 'sink' | 'none';
export type CardStyle = 'solid' | 'glass' | 'outline';
export type CardRadius = 'sharp' | 'soft' | 'round';
export type FontChoice = 'standard' | 'system' | 'serif' | 'mono';
export type TextScale = 'normal' | 'large' | 'xlarge';

export type CustomTheme = {
  active: boolean;
  /** Couleurs des boutons, icônes et éléments d'accent. */
  accent: string;
  accent2: string;
  /** Couleurs du dégradé de fond. */
  bg1: string;
  bg2: string;
  pattern: PatternId;
  motion: MotionLevel;
  buttonStyle: ButtonStyle;
  buttonShape: ButtonShape;
  buttonPress: ButtonPress;
  cardStyle: CardStyle;
  cardRadius: CardRadius;
  font: FontChoice;
  textScale: TextScale;
};

export const DEFAULT_CUSTOM: CustomTheme = {
  active: false,
  accent: '#C026D3',
  accent2: '#7C3AED',
  bg1: '#F472B6',
  bg2: '#8B5CF6',
  pattern: 'aurora',
  motion: 'calm',
  buttonStyle: 'gradient',
  buttonShape: 'soft',
  buttonPress: 'spring',
  cardStyle: 'solid',
  cardRadius: 'soft',
  font: 'standard',
  textScale: 'normal',
};

const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);

/** Valide une saisie libre (« #c026d3 », « C026D3 ») → « #C026D3 » (null si illisible). */
export function parseHexInput(v: string): string | null {
  const t = v.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(t)) return `#${t.split('').map((c) => c + c).join('')}`.toUpperCase();
  return /^[0-9a-f]{6}$/i.test(t) ? `#${t}`.toUpperCase() : null;
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Nettoie ce qui vient du stockage / du cloud : toute valeur invalide retombe sur le défaut. */
export function normalizeCustomTheme(raw: unknown): CustomTheme {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CUSTOM;
  return {
    active: r.active === true,
    accent: isHex(r.accent) ? r.accent : d.accent,
    accent2: isHex(r.accent2) ? r.accent2 : d.accent2,
    bg1: isHex(r.bg1) ? r.bg1 : d.bg1,
    bg2: isHex(r.bg2) ? r.bg2 : d.bg2,
    pattern: typeof r.pattern === 'string' && r.pattern.length < 24 ? (r.pattern as PatternId) : d.pattern,
    motion: pick(r.motion, ['off', 'calm', 'lively'] as const, d.motion),
    buttonStyle: pick(r.buttonStyle, ['gradient', 'solid', 'outline', 'glass'] as const, d.buttonStyle),
    buttonShape: pick(r.buttonShape, ['soft', 'pill', 'square'] as const, d.buttonShape),
    buttonPress: pick(r.buttonPress, ['spring', 'pulse', 'sink', 'none'] as const, d.buttonPress),
    cardStyle: pick(r.cardStyle, ['solid', 'glass', 'outline'] as const, d.cardStyle),
    cardRadius: pick(r.cardRadius, ['sharp', 'soft', 'round'] as const, d.cardRadius),
    font: pick(r.font, ['standard', 'system', 'serif', 'mono'] as const, d.font),
    textScale: pick(r.textScale, ['normal', 'large', 'xlarge'] as const, d.textScale),
  };
}

// ——— Couleur ———

export function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`.toUpperCase();
}

export function hexToHue(hex: string): number {
  if (!isHex(hex)) return 0;
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Rapproche `fg` de la lisibilité sur `bg` : on l'assombrit (fond clair) ou l'éclaircit (fond sombre)
 * jusqu'à atteindre `min`. Une couleur déjà lisible n'est pas touchée.
 */
export function ensureContrast(fg: string, bg: string, min: number): string {
  if (!isHex(fg) || !isHex(bg)) return fg;
  const toward = luminance(bg) > 0.4 ? '#000000' : '#FFFFFF';
  let out = fg;
  for (let i = 0; i < 24 && contrastRatio(out, bg) < min; i++) out = mixHex(out, toward, 0.07);
  return out;
}

// ——— Palette dérivée ———

/** Applique la personnalisation sur la palette de base (clair ou sombre). */
export function resolveCustomPalette(base: ColorPalette, ct: CustomTheme, isDark: boolean): ColorPalette {
  const accent = ensureContrast(ct.accent, base.bg, isDark ? 4 : 2.6);
  const accent2 = ensureContrast(ct.accent2, base.bg, isDark ? 3.5 : 2.3);
  const accentDark = mixHex(accent, '#000000', 0.2);
  const onAccent = readableOn(mixHex(accent, accent2, 0.5), isDark ? '#04140D' : '#0B1B2B');

  let bgCard = base.bgCard;
  let border = base.border;
  let borderStrong = base.borderStrong;
  if (ct.cardStyle === 'glass') {
    bgCard = base.glass;
    border = base.glassBorder;
  } else if (ct.cardStyle === 'outline') {
    bgCard = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.35)';
    border = rgba(accent, isDark ? 0.55 : 0.5);
    borderStrong = accent;
  }

  return {
    ...base,
    accent,
    accentDark,
    accentLight: rgba(accent, isDark ? 0.16 : 0.12),
    onAccent,
    accent2,
    accent3: mixHex(accent, accent2, 0.5),
    mapRoute: accent,
    bgCard,
    surface: ct.cardStyle === 'solid' ? base.surface : bgCard,
    border,
    borderStrong,
    gradientBrand: [accentDark, accent, accent2],
    gradientHero: [accent, accent2],
    tabInactive: base.tabInactive,
  };
}

// ——— Formes, police, taille ———

export const RADII_BY_SHAPE: Record<CardRadius, { sm: number; md: number; lg: number; xl: number; xxl: number }> = {
  sharp: { sm: 4, md: 6, lg: 8, xl: 10, xxl: 14 },
  soft: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  round: { sm: 12, md: 18, lg: 24, xl: 32, xxl: 40 },
};

const STANDARD_BRAND = { accent: BRAND.accent, accentDark: BRAND.accentDark };

/**
 * Met à jour les jetons partagés (arrondis, couleur de marque) pour que les écrans qui les lisent au rendu
 * reflètent la personnalisation. `brand = null` : retour aux valeurs standard.
 */
export function applyThemeTokens(shape: CardRadius, brand: { accent: string; accentDark: string } | null): void {
  Object.assign(radii, RADII_BY_SHAPE[shape]);
  const target = BRAND as unknown as { accent: string; accentDark: string };
  target.accent = brand ? brand.accent : STANDARD_BRAND.accent;
  target.accentDark = brand ? brand.accentDark : STANDARD_BRAND.accentDark;
}

export function buttonRadius(shape: ButtonShape, soft: number): number {
  return shape === 'pill' ? 999 : shape === 'square' ? 6 : soft;
}

export const TEXT_SCALE: Record<TextScale, number> = { normal: 1, large: 1.1, xlarge: 1.22 };

// ——— Catalogues proposés à l'écran ———

export const SWATCHES: string[] = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#64748B', '#0B1220', '#F8FAFC',
];

export const THEME_PRESETS: Array<{ id: string; label: string; patch: Partial<CustomTheme> }> = [
  { id: 'aurore', label: 'Aurore rose', patch: { accent: '#C026D3', accent2: '#7C3AED', bg1: '#F472B6', bg2: '#8B5CF6', pattern: 'aurora' } },
  { id: 'ocean', label: 'Océan', patch: { accent: '#0369A1', accent2: '#0EA5E9', bg1: '#38BDF8', bg2: '#6366F1', pattern: 'waves' } },
  { id: 'sunset', label: 'Coucher de soleil', patch: { accent: '#EA580C', accent2: '#DB2777', bg1: '#FB923C', bg2: '#F43F5E', pattern: 'dunes' } },
  { id: 'foret', label: 'Forêt', patch: { accent: '#15803D', accent2: '#65A30D', bg1: '#4ADE80', bg2: '#A3E635', pattern: 'topo' } },
  { id: 'neon', label: 'Néon', patch: { accent: '#0891B2', accent2: '#A855F7', bg1: '#22D3EE', bg2: '#A855F7', pattern: 'grid' } },
  { id: 'braise', label: 'Braise', patch: { accent: '#DC2626', accent2: '#F59E0B', bg1: '#F87171', bg2: '#FBBF24', pattern: 'embers' } },
  { id: 'minuit', label: 'Minuit', patch: { accent: '#4F46E5', accent2: '#0EA5E9', bg1: '#818CF8', bg2: '#38BDF8', pattern: 'stars' } },
  { id: 'sakura', label: 'Sakura', patch: { accent: '#DB2777', accent2: '#F472B6', bg1: '#F9A8D4', bg2: '#FDBA74', pattern: 'confetti' } },
  { id: 'glace', label: 'Glace', patch: { accent: '#0E7490', accent2: '#22D3EE', bg1: '#67E8F9', bg2: '#A5B4FC', pattern: 'ripples' } },
  { id: 'citron', label: 'Citron', patch: { accent: '#A16207', accent2: '#65A30D', bg1: '#FDE047', bg2: '#A3E635', pattern: 'rays' } },
  { id: 'graphite', label: 'Graphite', patch: { accent: '#334155', accent2: '#64748B', bg1: '#94A3B8', bg2: '#CBD5E1', pattern: 'triangles' } },
  { id: 'lavande', label: 'Lavande', patch: { accent: '#7C3AED', accent2: '#A78BFA', bg1: '#C4B5FD', bg2: '#F9A8D4', pattern: 'bubbles' } },
];

export const PATTERN_LABELS: Record<PatternId, string> = {
  none: 'Aucun',
  topo: 'Courbes',
  speed: 'Traînées',
  waves: 'Vagues',
  orbits: 'Orbites',
  embers: 'Braises',
  hex: 'Hexagones',
  bars: 'Colonnes',
  dots: 'Halos',
  rain: 'Pluie fine',
  ripples: 'Ondes',
  stars: 'Étoiles',
  bubbles: 'Bulles',
  grid: 'Grille',
  rays: 'Rayons',
  triangles: 'Facettes',
  dunes: 'Dunes',
  chevrons: 'Chevrons',
  confetti: 'Confettis',
  aurora: 'Aurore boréale',
};

export const PATTERN_ORDER: PatternId[] = [
  'aurora', 'topo', 'waves', 'dunes', 'ripples', 'stars', 'bubbles', 'rain', 'rays', 'grid',
  'triangles', 'chevrons', 'confetti', 'speed', 'orbits', 'embers', 'hex', 'bars', 'dots', 'none',
];
