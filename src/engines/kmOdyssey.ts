import { DEMO_DIRECTORY, type DemoDirectoryMember } from '../data/demoDirectory';
import type { RankedProgress } from '../types/domain';
import { formatCompactNumber } from '../utils/formatCompactNumber';

/** Familles Odyssée — paliers constants par discipline (équité volume). */
export type OdysseySport = 'run' | 'bike' | 'swim';

export const KM_ODYSSEY_BADGE_ID = 'km-odyssey';
export const KM_ODYSSEY_XP_PER_LEVEL = 40;

/** @deprecated — alias course (rétrocompat) */
export const KM_ODYSSEY_TITLE = 'Odyssée course';
export const KM_ODYSSEY_EMOJI = '🏃';
/** @deprecated — utiliser ODYSSEY_KM_PER_LEVEL.run */
export const KM_PER_LEVEL = 10;

/** Km (ou km nage) pour gagner +1 niveau — fixe à chaque palier */
export const ODYSSEY_KM_PER_LEVEL: Record<OdysseySport, number> = {
  run: 10,
  bike: 25,
  swim: 1, // 1 km de nage (~20–40 longueurs bassin 25 m)
};

export const ODYSSEY_SPORT_META: Record<
  OdysseySport,
  { title: string; emoji: string; short: string; unitHint: string }
> = {
  run: {
    title: 'Odyssée course',
    emoji: '🏃',
    short: 'Course',
    unitHint: '10 km par niveau',
  },
  bike: {
    title: 'Odyssée vélo',
    emoji: '🚴',
    short: 'Vélo',
    unitHint: '25 km par niveau',
  },
  swim: {
    title: 'Odyssée natation',
    emoji: '🏊',
    short: 'Natation',
    unitHint: '1 km de nage par niveau',
  },
};

export type KmOdysseyProgress = {
  sport: OdysseySport;
  level: number;
  kmIntoLevel: number;
  kmToNext: number;
  progress: number;
  totalKm: number;
  kmPerLevel: number;
};

export function kmOdysseyFromTotalKm(
  totalKm: number,
  sport: OdysseySport = 'run',
): KmOdysseyProgress {
  const per = ODYSSEY_KM_PER_LEVEL[sport];
  const safe = Math.max(0, totalKm);
  const level = Math.floor(safe / per);
  const kmIntoLevel = safe - level * per;
  return {
    sport,
    level,
    kmIntoLevel,
    kmToNext: Math.max(0, per - kmIntoLevel),
    progress: kmIntoLevel / per,
    totalKm: safe,
    kmPerLevel: per,
  };
}

export function formatOdysseyDistance(km: number, sport: OdysseySport): string {
  if (sport === 'swim') {
    const m = Math.round(km * 1000);
    if (m < 1000) return `${m} m`;
    // Au-delà de 1 km nage : compact (1,05 K km, etc.)
    if (km >= 1000) return `${formatCompactNumber(km)} km`;
    return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`;
  }
  if (km >= 1000) return `${formatCompactNumber(km)} km`;
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
}

type PaidMap = { run?: number; bike?: number; swim?: number };

function readPaid(ranked: RankedProgress): PaidMap {
  const legacy = ranked.kmOdysseyLevelsPaid ?? 0;
  return {
    run: ranked.kmOdysseyPaid?.run ?? legacy,
    bike: ranked.kmOdysseyPaid?.bike ?? 0,
    swim: ranked.kmOdysseyPaid?.swim ?? 0,
  };
}

/**
 * Crédite les paliers non payés pour une discipline.
 */
export function claimKmOdysseyLevelsForSport(
  ranked: RankedProgress,
  totalKm: number,
  sport: OdysseySport,
): { ranked: RankedProgress; baseXp: number; levelsGained: number } {
  const level = kmOdysseyFromTotalKm(totalKm, sport).level;
  const paid = readPaid(ranked);
  const prev = paid[sport] ?? 0;
  const levelsGained = Math.max(0, level - prev);
  const nextPaid: PaidMap = { ...paid, [sport]: Math.max(prev, level) };
  return {
    ranked: {
      ...ranked,
      kmOdysseyPaid: nextPaid,
      // Rétrocompat : miroir course
      kmOdysseyLevelsPaid: nextPaid.run ?? ranked.kmOdysseyLevelsPaid,
    },
    baseXp: levelsGained * KM_ODYSSEY_XP_PER_LEVEL,
    levelsGained,
  };
}

/** Crédite course + vélo + natation d’un coup (ingestion activité / sync). */
export function claimAllKmOdysseyLevels(
  ranked: RankedProgress,
  distances: { runKm: number; bikeKm: number; swimKm: number },
): { ranked: RankedProgress; baseXp: number; levelsGained: number } {
  let next = ranked;
  let baseXp = 0;
  let levelsGained = 0;
  (['run', 'bike', 'swim'] as const).forEach((sport) => {
    const km =
      sport === 'run' ? distances.runKm : sport === 'bike' ? distances.bikeKm : distances.swimKm;
    const r = claimKmOdysseyLevelsForSport(next, km, sport);
    next = r.ranked;
    baseXp += r.baseXp;
    levelsGained += r.levelsGained;
  });
  return { ranked: next, baseXp, levelsGained };
}

/**
 * @deprecated — préférer claimAllKmOdysseyLevels / claimKmOdysseyLevelsForSport
 * Conserve le comportement « total km → course » pour anciens appels.
 */
export function claimKmOdysseyLevels(
  ranked: RankedProgress,
  totalKm: number,
): { ranked: RankedProgress; baseXp: number; levelsGained: number } {
  return claimKmOdysseyLevelsForSport(ranked, totalKm, 'run');
}

export type KmOdysseyBoardEntry = {
  place: number;
  id: string;
  username: string;
  displayName: string;
  country: string;
  city?: string;
  level: number;
  totalKm: number;
  isYou?: boolean;
};

export type KmOdysseyBoards = {
  world: KmOdysseyBoardEntry[];
  national: KmOdysseyBoardEntry[];
  yourWorldRank: number;
  yourNationalRank: number;
};

function normalizeCountry(country?: string | null): string {
  const c = (country ?? '').trim();
  return c.length > 0 ? c : 'France';
}

function sportKmFromMember(m: DemoDirectoryMember, sport: OdysseySport): number {
  // Répartition démo selon le sport déclaré
  const s = (m.sport ?? '').toLowerCase();
  if (sport === 'swim') {
    if (s.includes('nata')) return Math.max(2, m.km * 0.04);
    return Math.max(1, m.km * 0.02);
  }
  if (sport === 'bike') {
    if (s.includes('vélo') || s.includes('velo') || s.includes('cyclo')) return m.km * 1.2;
    return m.km * 0.6;
  }
  // course
  if (s.includes('vélo') || s.includes('nata')) return m.km * 0.35;
  return m.km;
}

function entryFromMember(
  m: DemoDirectoryMember,
  sport: OdysseySport,
): Omit<KmOdysseyBoardEntry, 'place'> {
  const totalKm = sportKmFromMember(m, sport);
  const progress = kmOdysseyFromTotalKm(totalKm, sport);
  return {
    id: m.id,
    username: m.username,
    displayName: m.name,
    country: normalizeCountry(m.country),
    city: m.city,
    level: progress.level,
    totalKm: progress.totalKm,
  };
}

function rankEntries(
  raw: Omit<KmOdysseyBoardEntry, 'place'>[],
): KmOdysseyBoardEntry[] {
  const sorted = [...raw].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    if (b.totalKm !== a.totalKm) return b.totalKm - a.totalKm;
    return a.displayName.localeCompare(b.displayName, 'fr');
  });
  return sorted.map((e, i) => ({ ...e, place: i + 1 }));
}

export function compactKmBoard(
  full: KmOdysseyBoardEntry[],
  yourUsername: string,
): KmOdysseyBoardEntry[] {
  if (full.length === 0) return [];
  const youIdx = full.findIndex(
    (e) => e.username.toLowerCase() === yourUsername.trim().toLowerCase(),
  );
  const topN = 5;
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(topN, full.length); i++) keep.add(i);
  if (youIdx >= 0) {
    for (let i = Math.max(0, youIdx - 2); i <= Math.min(full.length - 1, youIdx + 1); i++) {
      keep.add(i);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => full[i]!);
}

export function buildKmOdysseyBoards(opts: {
  you: {
    id: string;
    username: string;
    displayName: string;
    country?: string;
    city?: string;
    totalKm: number;
  };
  sport?: OdysseySport;
  liveTick?: number;
}): KmOdysseyBoards {
  const sport = opts.sport ?? 'run';
  const country = normalizeCountry(opts.you.country);
  const liveTick = Math.max(0, Math.floor(opts.liveTick ?? 0));
  const youProgress = kmOdysseyFromTotalKm(opts.you.totalKm, sport);
  const youEntry: Omit<KmOdysseyBoardEntry, 'place'> = {
    id: opts.you.id,
    username: opts.you.username || 'vous',
    displayName: opts.you.displayName || 'Vous',
    country,
    city: opts.you.city,
    level: youProgress.level,
    totalKm: youProgress.totalKm,
    isYou: true,
  };

  const rivals = DEMO_DIRECTORY.filter(
    (m) => m.username.toLowerCase() !== youEntry.username.toLowerCase(),
  ).map((m) => {
    const base = entryFromMember(m, sport);
    if (liveTick <= 0) return base;
    // Micro-progression rivaux (peloton vivant) — ne touche pas ton cumul
    const bump = liveTick * (0.02 + (hashSeed(`${m.id}-${sport}`) % 5) * 0.01);
    const totalKm = base.totalKm + bump;
    const progress = kmOdysseyFromTotalKm(totalKm, sport);
    return { ...base, totalKm: progress.totalKm, level: progress.level };
  });

  const world = rankEntries([...rivals, youEntry]);
  const national = rankEntries(
    [...rivals, youEntry].filter((e) => normalizeCountry(e.country) === country),
  );

  const yourWorldRank =
    world.find((e) => e.isYou)?.place ??
    world.find((e) => e.username === youEntry.username)?.place ??
    world.length;
  const yourNationalRank =
    national.find((e) => e.isYou)?.place ??
    national.find((e) => e.username === youEntry.username)?.place ??
    national.length;

  return {
    world,
    national,
    yourWorldRank,
    yourNationalRank,
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
