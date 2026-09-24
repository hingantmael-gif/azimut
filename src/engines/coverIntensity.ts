import { Platform } from 'react-native';
import type { RankTier } from '../types/domain';
import type { RankDivision } from './rankedLadder';
import { normalizeTier } from './rankedLadder';

/**
 * Courbe d’intensité Bronze 3 → Champion.
 * Trois curseurs : densité · vitesse · glow (brief fonds classement).
 */
export type CoverIntensity = {
  tier: RankTier;
  division: RankDivision | null;
  /** 0 = Bronze 3 … 18 = Champion */
  step: number;
  /** 0–1 */
  density: number;
  /** 0–1 (plus haut = plus rapide) */
  speed: number;
  /** 0–1 */
  glow: number;
  /** Durée de boucle principale (ms) */
  loopMs: number;
  flameCount: number;
  flameHeightRatio: number;
  sparkCount: number;
  crystalCount: number;
  mercuryDrops: number;
  goldStreams: number;
  rippleRings: number;
  boltCount: number;
  isChampion: boolean;
  isPremium: boolean;
  reducedMotion: boolean;
};

const TIER_ORDER: RankTier[] = [
  'bronze',
  'argent',
  'or',
  'diamant',
  'platine',
  'elite',
  'champion',
];

/** division 3 → 0, 2 → 1, 1 → 2 (progression dans le tier) */
function divisionBoost(division: RankDivision | null): number {
  if (division == null) return 2; // champion / apex
  if (division === 3) return 0;
  if (division === 2) return 1;
  return 2;
}

export function coverProgressStep(
  tier: RankTier,
  division: RankDivision | null,
): number {
  const t = normalizeTier(tier);
  const ti = TIER_ORDER.indexOf(t);
  if (ti < 0) return 0;
  if (t === 'champion') return 18;
  return ti * 3 + divisionBoost(division);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Prefers-reduced-motion (web) — version très ralentie côté FX. */
export function detectReducedMotion(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    } catch {
      return false;
    }
  }
  return false;
}

/** Cap perf devices bas de gamme (heuristique simple). */
export function detectLowPerfDevice(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const cores = (navigator as { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
    return cores <= 4 || mem <= 2;
  }
  return false;
}

export function resolveRankCoverIntensity(
  tier: RankTier,
  division: RankDivision | null,
  opts?: { compact?: boolean; forceReduced?: boolean },
): CoverIntensity {
  const t = normalizeTier(tier);
  const step = coverProgressStep(t, division);
  const progress = step / 18;
  const div = divisionBoost(division);
  const reduced = opts?.forceReduced ?? detectReducedMotion();
  const lowPerf = detectLowPerfDevice();
  const compact = Boolean(opts?.compact);

  const density = clamp(0.15 + progress * 0.85 + div * 0.05, 0, 1);
  const speed = clamp(0.2 + progress * 0.7 + div * 0.08, 0, 1);
  const glow = clamp(0.1 + progress * 0.9 + div * 0.06, 0, 1);

  const loopMs = Math.round(lerp(4500, 1800, speed));

  // Specs par tier (brief)
  let flameCount = 5;
  let flameHeightRatio = 0.15;
  let sparkCount = 0;
  let crystalCount = 3;
  let mercuryDrops = 2;
  let goldStreams = 2;
  let rippleRings = 2;
  let boltCount = 1;

  if (t === 'bronze') {
    if (div === 0) {
      flameCount = 5;
      flameHeightRatio = 0.15;
      sparkCount = 0;
    } else if (div === 1) {
      flameCount = 9;
      flameHeightRatio = 0.25;
      sparkCount = 3;
    } else {
      flameCount = 13;
      flameHeightRatio = 0.38;
      sparkCount = 7;
    }
  } else if (t === 'argent') {
    mercuryDrops = div === 0 ? 3 : div === 1 ? 6 : 10;
    sparkCount = div === 0 ? 0 : div === 1 ? 4 : 8;
  } else if (t === 'or') {
    goldStreams = div === 0 ? 3 : div === 1 ? 5 : 8;
    sparkCount = div === 0 ? 4 : div === 1 ? 10 : 18;
  } else if (t === 'diamant') {
    crystalCount = div === 0 ? 4 : div === 1 ? 7 : 13;
    sparkCount = div === 0 ? 2 : div === 1 ? 5 : 10;
  } else if (t === 'platine') {
    rippleRings = div === 0 ? 3 : div === 1 ? 5 : 9;
  } else if (t === 'elite') {
    boltCount = div === 0 ? 2 : div === 1 ? 4 : 7;
    sparkCount = div === 0 ? 2 : div === 1 ? 8 : 14;
  } else if (t === 'champion') {
    goldStreams = 10;
    sparkCount = 16;
    flameCount = 6;
    crystalCount = 5;
    rippleRings = 4;
    boltCount = 2;
    flameHeightRatio = 0.28;
  }

  const perfScale = lowPerf ? 0.55 : compact ? 0.7 : 1;
  const motionScale = reduced ? 0.35 : 1;

  return {
    tier: t,
    division,
    step,
    density,
    speed: reduced ? speed * 0.25 : speed,
    glow: reduced ? glow * 0.4 : glow,
    loopMs: reduced ? loopMs * 2.5 : loopMs,
    flameCount: Math.max(2, Math.round(flameCount * perfScale * motionScale)),
    flameHeightRatio,
    sparkCount: Math.max(0, Math.round(sparkCount * perfScale * motionScale)),
    crystalCount: Math.max(2, Math.round(crystalCount * perfScale * motionScale)),
    mercuryDrops: Math.max(2, Math.round(mercuryDrops * perfScale * motionScale)),
    goldStreams: Math.max(2, Math.round(goldStreams * perfScale * motionScale)),
    rippleRings: Math.max(2, Math.round(rippleRings * perfScale * motionScale)),
    boltCount: Math.max(1, Math.round(boltCount * perfScale * motionScale)),
    isChampion: t === 'champion',
    isPremium: false,
    reducedMotion: reduced,
  };
}

/** Fonds premium : animation max (brief §8). */
export function resolvePremiumCoverIntensity(opts?: {
  compact?: boolean;
  forceReduced?: boolean;
}): CoverIntensity {
  const reduced = opts?.forceReduced ?? detectReducedMotion();
  const lowPerf = detectLowPerfDevice();
  const compact = Boolean(opts?.compact);
  const perfScale = lowPerf ? 0.65 : compact ? 0.75 : 1;
  const motionScale = reduced ? 0.4 : 1;

  return {
    tier: 'champion',
    division: null,
    step: 18,
    density: 1,
    speed: reduced ? 0.25 : 0.95,
    glow: reduced ? 0.45 : 1,
    loopMs: reduced ? 12000 : 8000,
    flameCount: Math.round(16 * perfScale * motionScale),
    flameHeightRatio: 0.55,
    sparkCount: Math.round(22 * perfScale * motionScale),
    crystalCount: Math.round(14 * perfScale * motionScale),
    mercuryDrops: Math.round(12 * perfScale * motionScale),
    goldStreams: Math.round(10 * perfScale * motionScale),
    rippleRings: Math.round(8 * perfScale * motionScale),
    boltCount: Math.round(6 * perfScale * motionScale),
    isChampion: false,
    isPremium: true,
    reducedMotion: reduced,
  };
}
