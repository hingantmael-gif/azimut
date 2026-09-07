import { DEMO_DIRECTORY } from '../data/demoDirectory';
import type { RankTier, RankedProgress } from '../types/domain';
import {
  divisionFromLevel,
  formatRankLabel,
  normalizeTier,
  type RankDivision,
} from './rankedLadder';
import {
  clampXp,
  levelFromXp,
  maxCareerXp,
  tierFromLevel,
  totalXpToReachLevel,
} from './core';
import { kmOdysseyFromTotalKm } from './kmOdyssey';

export type WorldBoardId =
  | 'xp_total'
  | 'xp_week'
  | 'km'
  | 'country'
  | 'champions';

export type WorldBoardMeta = {
  id: WorldBoardId;
  label: string;
  subtitle: string;
};

export const WORLD_BOARDS: WorldBoardMeta[] = [
  {
    id: 'xp_total',
    label: 'XP mondial',
    subtitle: 'Classement mondial par XP de profil (carrière).',
  },
  {
    id: 'xp_week',
    label: 'XP semaine',
    subtitle: 'Compétition mondiale de la semaine — reset lundi.',
  },
  {
    id: 'km',
    label: 'Km mondiaux',
    subtitle: 'Distance cumulée — Odyssée km.',
  },
  {
    id: 'country',
    label: 'National',
    subtitle: 'Classement dans ton pays (XP profil).',
  },
  {
    id: 'champions',
    label: 'Champions',
    subtitle: 'Peloton mondial du rang Champion.',
  },
];

export type WorldRankEntry = {
  place: number;
  id: string;
  username: string;
  displayName: string;
  country: string;
  city?: string;
  value: number;
  valueLabel: string;
  secondary?: string;
  tier?: RankTier;
  division?: RankDivision | null;
  isYou?: boolean;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function normalizeCountry(country?: string | null): string {
  const c = (country ?? '').trim();
  return c.length > 0 ? c : 'France';
}

const EXTRA_COUNTRIES = [
  'France',
  'Belgique',
  'Suisse',
  'Canada',
  'Espagne',
  'Italie',
  'Allemagne',
  'Maroc',
  'Portugal',
  'Royaume-Uni',
];

type AthleteSeed = {
  id: string;
  username: string;
  displayName: string;
  country: string;
  city?: string;
  totalXp: number;
  weekXp: number;
  totalKm: number;
  tier: RankTier;
  division: RankDivision | null;
  isYou?: boolean;
};

function buildWorldPool(opts: {
  you: {
    id: string;
    username: string;
    displayName: string;
    country?: string;
    city?: string;
  };
  ranked: RankedProgress;
  totalKm: number;
  liveTick?: number;
}): AthleteSeed[] {
  const yourCountry = normalizeCountry(opts.you.country);
  const yourTier = normalizeTier(opts.ranked.tier);
  const yourDivision =
    opts.ranked.division !== undefined
      ? opts.ranked.division
      : divisionFromLevel(opts.ranked.level);
  const liveTick = Math.max(0, Math.floor(opts.liveTick ?? 0));

  const you: AthleteSeed = {
    id: opts.you.id,
    username: opts.you.username || 'vous',
    displayName: opts.you.displayName || 'Vous',
    country: yourCountry,
    city: opts.you.city,
    totalXp: clampXp(opts.ranked.xp),
    weekXp: clampXp(opts.ranked.weekXp ?? 0),
    totalKm: Math.max(0, opts.totalKm),
    tier: yourTier,
    division: yourDivision,
    isYou: true,
  };

  const demo = DEMO_DIRECTORY.filter(
    (m) => m.username.toLowerCase() !== you.username.toLowerCase(),
  );
  const rivals: AthleteSeed[] = [];
  const WORLD_SIZE = 120;
  /**
   * Distribution type apps ranked (Duolingo / ligues fitness) :
   * continuum soft (pas d’explosion), rang dérivé du niveau XP.
   * Plafond ~L70 (~Champion mid) — top lisible face au peloton.
   */
  const xpCeiling = Math.min(maxCareerXp(), totalXpToReachLevel(70));
  const xpFloor = totalXpToReachLevel(3);

  for (let i = 0; i < WORLD_SIZE; i++) {
    const m = demo[i % Math.max(1, demo.length)];
    const seed = `world-${opts.you.id}-${i}-${m?.username ?? i}`;
    const h = hashSeed(seed);
    // Place 0 = sommet : courbe douce (exposant ~1.35), jitter faible
    const placeT = i / Math.max(1, WORLD_SIZE - 1);
    const curve = Math.pow(1 - placeT, 1.35);
    const pace = 1 + (h % 3);
    const liveBump = liveTick * pace + (hashSeed(`${seed}-live-${liveTick}`) % 4);
    const totalXp = clampXp(
      Math.round(
        xpFloor + (xpCeiling - xpFloor) * curve + ((h % 90) - 45) + liveBump * 2,
      ),
    );
    const level = levelFromXp(totalXp);
    const tier = tierFromLevel(level);
    const division = divisionFromLevel(level);
    // Semaine : activité réaliste + tick live (indépendant de ton XP)
    const weekXp = clampXp(
      40 +
        (h % 120) +
        Math.round((1 - placeT) * 60) +
        (tier === 'champion' ? 25 : 0) +
        liveBump,
    );
    const totalKm = Math.max(5, (m?.km ?? 200) + (h % 400) - 80 + liveTick * 0.05);
    const country =
      i % 5 === 0
        ? yourCountry
        : EXTRA_COUNTRIES[(h + i) % EXTRA_COUNTRIES.length]!;

    rivals.push({
      id: `world-${i}`,
      username: m
        ? `${m.username}${i >= demo.length ? String(Math.floor(i / demo.length)) : ''}`.slice(
            0,
            20,
          )
        : `athlete${i + 1}`,
      displayName: m
        ? i >= demo.length
          ? `${m.name} ${Math.floor(i / demo.length) + 1}`
          : m.name
        : `Athlète ${i + 1}`,
      country,
      city: m?.city,
      totalXp,
      weekXp,
      totalKm,
      tier,
      division,
    });
  }

  return [...rivals, you];
}

function placeOf(entries: WorldRankEntry[]): number {
  return entries.find((e) => e.isYou)?.place ?? 0;
}

export function buildWorldRankings(opts: {
  you: {
    id: string;
    username: string;
    displayName: string;
    country?: string;
    city?: string;
  };
  ranked: RankedProgress;
  totalKm: number;
  liveTick?: number;
}): Record<WorldBoardId, { entries: WorldRankEntry[]; yourPlace: number }> {
  const pool = buildWorldPool(opts);
  const yourCountry = normalizeCountry(opts.you.country);

  const mapPool = (
    sorted: AthleteSeed[],
    map: (a: AthleteSeed, place: number) => WorldRankEntry,
  ): WorldRankEntry[] => sorted.map((a, i) => map(a, i + 1));

  const xpTotal = mapPool(
    [...pool].sort((a, b) => b.totalXp - a.totalXp || a.username.localeCompare(b.username, 'fr')),
    (a, place) => ({
      place,
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      country: a.country,
      city: a.city,
      value: a.totalXp,
      valueLabel: 'XP',
      secondary: formatRankLabel(a.tier, a.division),
      tier: a.tier,
      division: a.division,
      isYou: Boolean(a.isYou),
    }),
  );

  const xpWeek = mapPool(
    [...pool].sort((a, b) => b.weekXp - a.weekXp || a.username.localeCompare(b.username, 'fr')),
    (a, place) => ({
      place,
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      country: a.country,
      city: a.city,
      value: a.weekXp,
      valueLabel: 'XP sem.',
      secondary: formatRankLabel(a.tier, a.division),
      tier: a.tier,
      division: a.division,
      isYou: Boolean(a.isYou),
    }),
  );

  const km = mapPool(
    [...pool].sort((a, b) => b.totalKm - a.totalKm || a.username.localeCompare(b.username, 'fr')),
    (a, place) => {
      const od = kmOdysseyFromTotalKm(a.totalKm);
      return {
        place,
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        country: a.country,
        city: a.city,
        value: Math.round(a.totalKm),
        valueLabel: 'km',
        secondary: `Niv. odyssée ${od.level}`,
        tier: a.tier,
        division: a.division,
        isYou: Boolean(a.isYou),
      };
    },
  );

  const countryPool = pool.filter((a) => a.country === yourCountry);
  const country = mapPool(
    [...countryPool].sort(
      (a, b) => b.totalXp - a.totalXp || a.username.localeCompare(b.username, 'fr'),
    ),
    (a, place) => ({
      place,
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      country: a.country,
      city: a.city,
      value: a.totalXp,
      valueLabel: 'XP',
      secondary: a.city ?? yourCountry,
      tier: a.tier,
      division: a.division,
      isYou: Boolean(a.isYou),
    }),
  );

  const champPool = pool.filter((a) => normalizeTier(a.tier) === 'champion');
  const champEnsured =
    champPool.length >= 16
      ? champPool
      : [
          ...champPool,
          ...pool
            .filter((a) => !a.isYou && normalizeTier(a.tier) !== 'champion')
            .slice(0, Math.max(0, 20 - champPool.length))
            .map((a, i) => ({
              ...a,
              id: `champ-fill-${i}`,
              tier: 'champion' as RankTier,
              division: null as RankDivision | null,
              totalXp: Math.max(
                a.totalXp,
                totalXpToReachLevel(55) + i * 40,
              ),
              weekXp: Math.max(a.weekXp, 120 + i * 5),
            })),
        ];
  // Si tu es Champion, tu restes dans la liste ; sinon tu n’y apparais pas
  const yourIsChamp = normalizeTier(opts.ranked.tier) === 'champion';
  const champList = yourIsChamp
    ? champEnsured
    : champEnsured.filter((a) => !a.isYou);

  const champions = mapPool(
    [...champList].sort(
      (a, b) => b.weekXp - a.weekXp || b.totalXp - a.totalXp || a.username.localeCompare(b.username, 'fr'),
    ),
    (a, place) => ({
      place,
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      country: a.country,
      city: a.city,
      value: a.weekXp,
      valueLabel: 'XP sem.',
      secondary: `${a.totalXp.toLocaleString('fr-FR')} XP profil`,
      tier: 'champion' as RankTier,
      division: null,
      isYou: Boolean(a.isYou),
    }),
  );

  return {
    xp_total: { entries: xpTotal, yourPlace: placeOf(xpTotal) },
    xp_week: { entries: xpWeek, yourPlace: placeOf(xpWeek) },
    km: { entries: km, yourPlace: placeOf(km) },
    country: { entries: country, yourPlace: placeOf(country) },
    champions: { entries: champions, yourPlace: placeOf(champions) },
  };
}

/** Vue compacte : top N + voisinage autour de toi */
export function compactWorldBoard(
  full: WorldRankEntry[],
  opts?: { topN?: number; neighbor?: number },
): WorldRankEntry[] {
  if (full.length === 0) return [];
  const topN = opts?.topN ?? 15;
  const neighbor = opts?.neighbor ?? 2;
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(topN, full.length); i++) keep.add(i);
  const youIdx = full.findIndex((e) => e.isYou);
  if (youIdx >= 0) {
    for (
      let i = Math.max(0, youIdx - neighbor);
      i <= Math.min(full.length - 1, youIdx + neighbor);
      i++
    ) {
      keep.add(i);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => full[i]!);
}

export function worldBoardTitle(id: WorldBoardId, country?: string): string {
  if (id === 'country') return `Classement ${normalizeCountry(country)}`;
  return WORLD_BOARDS.find((b) => b.id === id)?.label ?? 'Classement mondial';
}
