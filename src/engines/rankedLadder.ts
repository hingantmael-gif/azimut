import type { RankTier, RankedProgress } from '../types/domain';
import { DEMO_DIRECTORY } from '../data/demoDirectory';
import {
  clampXp,
  levelFromXp,
  tierFromLevel,
  xpProgressFromTotal,
  totalXpToReachLevel,
} from './core';

/** Niveaux par palier (Bronze…Élite) : 3 divisions × 3 niveaux */
export const LEVELS_PER_TIER = 9;
export const LEVELS_PER_DIVISION = 3;

/** Taille du peloton de division (classement réaliste) */
export const DIVISION_POOL_SIZE = 100;

/** Divisions 3 (bas) → 1 (haut) ; null = Champion (rang unique) */
export type RankDivision = 1 | 2 | 3;

export type TierMeta = {
  id: RankTier;
  label: string;
  color: string;
  colorSoft: string;
  emoji: string;
  /** false = pas de Bronze 3 / 2 / 1, un seul palier */
  hasDivisions: boolean;
};

export const TIER_LADDER: TierMeta[] = [
  { id: 'bronze', label: 'Bronze', color: '#B45309', colorSoft: '#FEF3C7', emoji: '🥉', hasDivisions: true },
  { id: 'argent', label: 'Argent', color: '#64748B', colorSoft: '#F1F5F9', emoji: '🥈', hasDivisions: true },
  { id: 'or', label: 'Or', color: '#D97706', colorSoft: '#FEF3C7', emoji: '🥇', hasDivisions: true },
  { id: 'diamant', label: 'Diamant', color: '#2563EB', colorSoft: '#DBEAFE', emoji: '💎', hasDivisions: true },
  { id: 'platine', label: 'Platine', color: '#0D9488', colorSoft: '#CCFBF1', emoji: '💠', hasDivisions: true },
  { id: 'elite', label: 'Élite', color: '#7C3AED', colorSoft: '#EDE9FE', emoji: '⚡', hasDivisions: true },
  { id: 'champion', label: 'Champion', color: '#DC2626', colorSoft: '#FEE2E2', emoji: '🏆', hasDivisions: false },
];

export type RankStep = {
  tier: RankTier;
  division: RankDivision | null;
  label: string;
  emoji: string;
  color: string;
  colorSoft: string;
};

/** Échelle complète : Bronze 3 → … → Élite 1 → Champion */
export function allRankSteps(): RankStep[] {
  const steps: RankStep[] = [];
  for (const t of TIER_LADDER) {
    if (!t.hasDivisions) {
      steps.push({
        tier: t.id,
        division: null,
        label: t.label,
        emoji: t.emoji,
        color: t.color,
        colorSoft: t.colorSoft,
      });
      continue;
    }
    for (const d of [3, 2, 1] as const) {
      steps.push({
        tier: t.id,
        division: d,
        label: `${t.label} ${d}`,
        emoji: t.emoji,
        color: t.color,
        colorSoft: t.colorSoft,
      });
    }
  }
  return steps;
}

const TIER_INDEX = Object.fromEntries(
  TIER_LADDER.filter((t) => t.id !== 'champion').map((t, i) => [t.id, i]),
) as Record<Exclude<RankTier, 'champion' | 'master'>, number>;

export function normalizeTier(tier: RankTier): RankTier {
  return tier === 'master' ? 'champion' : tier;
}

export function tierMeta(tier: RankTier): TierMeta {
  const id = normalizeTier(tier);
  return TIER_LADDER.find((t) => t.id === id) ?? TIER_LADDER[0];
}

/** Division 3 (bas) → 1 (haut) ; null pour Champion */
export function divisionFromLevel(level: number): RankDivision | null {
  const tier = tierFromLevel(level);
  if (tier === 'champion') return null;
  const within = ((Math.max(1, level) - 1) % LEVELS_PER_TIER); // 0–8
  const band = Math.floor(within / LEVELS_PER_DIVISION); // 0, 1, 2
  return (3 - band) as RankDivision;
}

export function xpProgressInLevel(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  ratio: number;
  remaining: number;
} {
  return xpProgressFromTotal(xp);
}

export function formatRankLabel(
  tier: RankTier,
  division: RankDivision | null,
): string {
  const meta = tierMeta(tier);
  if (!meta.hasDivisions || division == null) return meta.label;
  return `${meta.label} ${division}`;
}

export function isSameRankStep(
  tier: RankTier,
  division: RankDivision | null,
  step: RankStep,
): boolean {
  return normalizeTier(tier) === step.tier && division === step.division;
}

export type LadderPlayer = {
  id: string;
  username: string;
  displayName: string;
  /** XP de la semaine (classement ladder) */
  xp: number;
  /** XP profil (carrière) — pour affichage dans le peloton */
  profileXp?: number;
  level: number;
  tier: RankTier;
  division: RankDivision | null;
  isYou: boolean;
  city?: string;
  avatarUri?: string;
};

export type LadderRow =
  | { type: 'player'; place: number; player: LadderPlayer }
  | { type: 'gap'; fromPlace: number; toPlace: number };

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function divisionXpRange(
  tier: RankTier,
  division: RankDivision | null,
): { min: number; max: number } {
  const t = normalizeTier(tier);
  if (t === 'champion' || division == null) {
    const startLevel = TIER_LADDER.filter((x) => x.hasDivisions).length * LEVELS_PER_TIER + 1;
    // Bande Champion serrée (~15 niveaux) — écarts lisibles, pas d’astronomie
    return {
      min: totalXpToReachLevel(startLevel),
      max: totalXpToReachLevel(startLevel + 15) - 1,
    };
  }
  const tierIdx = TIER_INDEX[t as Exclude<RankTier, 'champion' | 'master'>] ?? 0;
  const band = 3 - division; // 0, 1, 2
  const startLevel = tierIdx * LEVELS_PER_TIER + band * LEVELS_PER_DIVISION + 1;
  const endLevel = startLevel + LEVELS_PER_DIVISION;
  return {
    min: totalXpToReachLevel(startLevel),
    max: totalXpToReachLevel(endLevel) - 1,
  };
}

/** XP médian typique d'un palier (aperçu quand on consulte un autre rang). */
export function representativeXpForRankStep(
  tier: RankTier,
  division: RankDivision | null,
): number {
  const { min, max } = divisionXpRange(tier, division);
  return Math.floor((min + max) / 2);
}

export function levelForRankStep(
  tier: RankTier,
  division: RankDivision | null,
): number {
  return levelFromXp(representativeXpForRankStep(tier, division));
}

/**
 * Places visibles :
 * - Ta ligue : top 5 + voisinage autour de toi
 * - Autre ligue (ex. Champion alors que tu es Bronze) : top 25 pour toujours voir le peloton + XP
 * - Mode étendu : toutes les places
 */
export function visibleLeaderboardPlaces(
  yourRank: number,
  total: number,
  opts?: { expanded?: boolean; otherDivisionTop?: number },
): number[] {
  const set = new Set<number>();
  if (opts?.expanded) {
    for (let i = 1; i <= total; i++) set.add(i);
    return [...set].sort((a, b) => a - b);
  }
  // Vue d’une autre ligue (pas toi) : top N rempli
  if (yourRank <= 0) {
    const top = Math.min(opts?.otherDivisionTop ?? 25, total);
    for (let i = 1; i <= top; i++) set.add(i);
    return [...set].sort((a, b) => a - b);
  }
  for (let i = 1; i <= Math.min(5, total); i++) set.add(i);
  for (let p = yourRank - 3; p <= yourRank + 1; p++) {
    if (p >= 1 && p <= total) set.add(p);
  }
  return [...set].sort((a, b) => a - b);
}

export function buildLadderRows(
  playersSorted: LadderPlayer[],
  yourRank: number,
  opts?: { expanded?: boolean },
): LadderRow[] {
  const total = playersSorted.length;
  const places = visibleLeaderboardPlaces(yourRank, total, {
    expanded: opts?.expanded,
    otherDivisionTop: 25,
  });
  const rows: LadderRow[] = [];
  for (let i = 0; i < places.length; i++) {
    const place = places[i]!;
    if (i > 0 && place - places[i - 1]! > 1) {
      rows.push({ type: 'gap', fromPlace: places[i - 1]! + 1, toPlace: place - 1 });
    }
    const player = playersSorted[place - 1];
    if (!player) continue;
    rows.push({
      type: 'player',
      place,
      player,
    });
  }
  return rows;
}

/**
 * Classement division : peloton ~100, classé sur XP de la semaine (ladder).
 * `viewTier` / `viewDivision` = ligue consultée (chips) — peloton distinct par palier.
 */
export function buildDivisionLeaderboard(opts: {
  you: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    city?: string;
    avatarUri?: string;
  };
  ranked: RankedProgress;
  /** Ligue affichée (défaut = ta ligue actuelle) */
  viewTier?: RankTier;
  viewDivision?: RankDivision | null;
  poolSize?: number;
  /** Afficher tout le peloton (sinon top compact) */
  expanded?: boolean;
  /**
   * Tick live (ex. toutes les 12 s) : les rivaux progressent un peu
   * pour simuler un peloton vivant — ton XP reste la source de vérité.
   */
  liveTick?: number;
}): {
  rows: LadderRow[];
  players: LadderPlayer[];
  yourRank: number;
  divisionSize: number;
  label: string;
  isYourDivision: boolean;
} {
  const yourTier = normalizeTier(opts.ranked.tier);
  const yourDivision =
    opts.ranked.division !== undefined
      ? opts.ranked.division
      : divisionFromLevel(opts.ranked.level);

  const tier = normalizeTier(opts.viewTier ?? yourTier);
  const division =
    opts.viewDivision !== undefined
      ? opts.viewDivision
      : opts.viewTier != null
        ? opts.viewDivision ?? null
        : yourDivision;

  const isYourDivision =
    tier === yourTier &&
    (tier === 'champion'
      ? true
      : (division ?? 3) === (yourDivision ?? 3));

  const poolSize = opts.poolSize ?? DIVISION_POOL_SIZE;
  const weekXp = clampXp(opts.ranked.weekXp ?? 0);
  const weekKey = opts.ranked.ladderWeekKey ?? 'W';
  const liveTick = Math.max(0, Math.floor(opts.liveTick ?? 0));
  const stepIdx = (() => {
    const steps = allRankSteps();
    const i = steps.findIndex(
      (s) =>
        s.tier === tier &&
        (tier === 'champion' ? true : s.division === (division ?? 3)),
    );
    return i >= 0 ? i : 0;
  })();

  const xpBand = divisionXpRange(tier, division);
  /** XP semaine rivaux : ancrée sur la ligue, PAS sur ton score (sinon tu ne montes jamais). */
  const leagueBase = 48 + stepIdx * 14;
  const weekSpan = 110 + stepIdx * 10;

  const you: LadderPlayer = {
    id: opts.you.id,
    username: opts.you.username || 'vous',
    displayName:
      `${opts.you.firstName} ${opts.you.lastName}`.trim() || opts.you.username || 'Vous',
    xp: weekXp,
    profileXp: clampXp(opts.ranked.xp),
    level: opts.ranked.level,
    tier: yourTier,
    division: yourDivision,
    isYou: true,
    city: opts.you.city,
    avatarUri: opts.you.avatarUri,
  };

  const demo = DEMO_DIRECTORY.filter((m) => m.username !== you.username);
  const rivals: LadderPlayer[] = [];
  const rivalCount = isYourDivision ? Math.max(0, poolSize - 1) : poolSize;

  for (let i = 0; i < rivalCount; i++) {
    const demoOffset =
      (stepIdx * 17 + hashSeed(`dir-${tier}-${division ?? 'c'}`) % 13) %
      Math.max(1, demo.length);
    const demoMember = demo[(demoOffset + i) % Math.max(1, demo.length)];
    const seed = `ladder-${weekKey}-${tier}-d${division ?? 'c'}-r${i}-u${opts.you.id}`;
    const t = rivalCount <= 1 ? 0 : i / (rivalCount - 1);
    const jitter = (hashSeed(seed) % 31) - 15;
    const pace = 1 + (hashSeed(seed + 'pace') % 4); // 1–4 XP / tick
    const liveBump =
      liveTick * pace + (hashSeed(`${seed}-t${liveTick}`) % 5);
    let xp = clampXp(Math.round(leagueBase + weekSpan * (0.5 - t) + jitter + liveBump));
    if (isYourDivision && xp === you.xp) {
      xp = clampXp(you.xp + (i % 2 === 0 ? 3 : -3));
    }
    const profileXp = clampXp(
      Math.round(xpBand.max - (xpBand.max - xpBand.min) * t + (hashSeed(seed + 'p') % 80)),
    );

    const suffix = i >= demo.length ? String(i + 1) : '';
    rivals.push({
      id: `rival-${tier}-${division ?? 'c'}-${i}`,
      username: demoMember
        ? `${demoMember.username}${suffix}`.slice(0, 20)
        : `athlete${i + 1}`,
      displayName: demoMember
        ? suffix
          ? `${demoMember.name} ${suffix}`
          : demoMember.name
        : `Athlète ${i + 1}`,
      xp,
      profileXp,
      level: levelFromXp(profileXp),
      tier,
      division,
      isYou: false,
      city: demoMember?.city,
    });
  }

  const players = (isYourDivision ? [...rivals, you] : rivals).sort(
    (a, b) => b.xp - a.xp || a.username.localeCompare(b.username, 'fr'),
  );
  const yourRank = isYourDivision ? players.findIndex((p) => p.isYou) + 1 : 0;
  const rows = buildLadderRows(players, yourRank, { expanded: opts?.expanded });

  return {
    rows,
    players: rows
      .filter((r): r is Extract<LadderRow, { type: 'player' }> => r.type === 'player')
      .map((r) => r.player),
    yourRank,
    divisionSize: players.length,
    label: formatRankLabel(tier, division),
    isYourDivision,
  };
}

function rankStepIndexLike(tier: RankTier, division: RankDivision | null | undefined): number {
  const steps = allRankSteps();
  const t = normalizeTier(tier);
  const idx = steps.findIndex(
    (s) => s.tier === t && (t === 'champion' ? true : s.division === (division ?? 3)),
  );
  return idx >= 0 ? idx : 0;
}

/** Exposé pour tests / debug */
export function tierFromLevelPublic(level: number): RankTier {
  return tierFromLevel(level);
}
