import type { RankTier } from '../types/domain';
import { formatRankLabel, type RankDivision } from './rankedLadder';
import { rankStepIndex } from './rankedSeason';

/** Sports avec fonds distance (km / séance) */
export type CoverDistanceSport = 'run' | 'bike' | 'swim';

export type ProfileCoverUnlock =
  | { type: 'free' }
  | { type: 'rank'; tier: RankTier; division: RankDivision | null }
  /** Palier fixe (ex. 10 km course, 100 km vélo) */
  | { type: 'distance'; sport: CoverDistanceSport; minKm: number }
  /** Affiche la plus longue séance réelle du sport (ex. « 8 kilomètres ») */
  | { type: 'personal_best'; sport: CoverDistanceSport };

const EXTREME_VISUALS: ProfileCoverVisual[] = [
  'aurora-veil',
  'cyber-hex',
  'maelstrom',
  'inferno',
];

/** Langages visuels distincts — pas de “points qui tombent” génériques */
export type ProfileCoverVisual =
  | 'breath'
  | 'dusk'
  | 'mist'
  | 'flames'
  | 'mercury'
  | 'liquid-gold'
  | 'crystals'
  | 'ripple'
  | 'bolts'
  | 'constellation'
  | 'aurora-veil'
  | 'cyber-hex'
  | 'maelstrom'
  | 'inferno'
  | 'run-km'
  | 'bike-km'
  | 'swim-km'
  | 'pb-run'
  | 'pb-bike'
  | 'pb-swim'
  /** Anciens ids (alias → run-km) */
  | 'lane-10'
  | 'night-21'
  | 'laurel-42'
  | 'ridge-50'
  | 'cosmos-100';

export type ProfileCoverDef = {
  id: string;
  title: string;
  description: string;
  unlock: ProfileCoverUnlock;
  visual: ProfileCoverVisual;
  colors: [string, string, string];
  watermark?: string;
  /** Libellé animé fixe (paliers) — ex. « 10K », « 40 km » */
  distanceBadge?: string;
};

export const COVER_SPORT_LABEL: Record<CoverDistanceSport, string> = {
  run: 'Course à pied',
  bike: 'Vélo',
  swim: 'Natation',
};

/** Anciens fonds distance (tous course) → nouveaux ids */
const LEGACY_DISTANCE_IDS: Record<string, string> = {
  'dist-10k': 'dist-run-10k',
  'dist-21k': 'dist-run-21k',
  'dist-42k': 'dist-run-42k',
  'dist-50k': 'dist-run-50k',
  'dist-100k': 'dist-run-100k',
};

const RANK_COVERS: ProfileCoverDef[] = [
  {
    id: 'rank-bronze-3',
    title: 'Bronze 3',
    description: 'Flammes + emblème bronze.',
    unlock: { type: 'rank', tier: 'bronze', division: 3 },
    visual: 'flames',
    colors: ['#1A100A', '#6B3E26', '#C4A574'],
    watermark: 'Bronze 3',
  },
  {
    id: 'rank-bronze-2',
    title: 'Bronze 2',
    description: 'Forge + emblème animé.',
    unlock: { type: 'rank', tier: 'bronze', division: 2 },
    visual: 'flames',
    colors: ['#140C08', '#8B5A2B', '#D4AF7A'],
    watermark: 'Bronze 2',
  },
  {
    id: 'rank-bronze-1',
    title: 'Bronze 1',
    description: 'Braises + crest bronze.',
    unlock: { type: 'rank', tier: 'bronze', division: 1 },
    visual: 'flames',
    colors: ['#100804', '#9C6B3C', '#E8C99A'],
    watermark: 'Bronze 1',
  },
  {
    id: 'rank-argent-3',
    title: 'Argent 3',
    description: 'Mercure + lames chromées.',
    unlock: { type: 'rank', tier: 'argent', division: 3 },
    visual: 'mercury',
    colors: ['#0E1014', '#6B7280', '#E5E7EB'],
    watermark: 'Argent 3',
  },
  {
    id: 'rank-argent-2',
    title: 'Argent 2',
    description: 'Métal fluide.',
    unlock: { type: 'rank', tier: 'argent', division: 2 },
    visual: 'mercury',
    colors: ['#090A0C', '#9CA3AF', '#F9FAFB'],
    watermark: 'Argent 2',
  },
  {
    id: 'rank-argent-1',
    title: 'Argent 1',
    description: 'Éclat argenté.',
    unlock: { type: 'rank', tier: 'argent', division: 1 },
    visual: 'mercury',
    colors: ['#050506', '#D1D5DB', '#FFFFFF'],
    watermark: 'Argent 1',
  },
  {
    id: 'rank-or-3',
    title: 'Or 3',
    description: 'Coulées d’or.',
    unlock: { type: 'rank', tier: 'or', division: 3 },
    visual: 'liquid-gold',
    colors: ['#120E06', '#8B6914', '#E0C35A'],
    watermark: 'Or 3',
  },
  {
    id: 'rank-or-2',
    title: 'Or 2',
    description: 'Or en fusion.',
    unlock: { type: 'rank', tier: 'or', division: 2 },
    visual: 'liquid-gold',
    colors: ['#0E0A04', '#A67C00', '#F0D77B'],
    watermark: 'Or 2',
  },
  {
    id: 'rank-or-1',
    title: 'Or 1',
    description: 'Or brillant.',
    unlock: { type: 'rank', tier: 'or', division: 1 },
    visual: 'liquid-gold',
    colors: ['#0A0802', '#B8860B', '#FFF1A8'],
    watermark: 'Or 1',
  },
  {
    id: 'rank-diamant-3',
    title: 'Diamant 3',
    description: 'Cristaux tournants.',
    unlock: { type: 'rank', tier: 'diamant', division: 3 },
    visual: 'crystals',
    colors: ['#060B18', '#2B4C7E', '#C5D9F0'],
    watermark: 'Diamant 3',
  },
  {
    id: 'rank-diamant-2',
    title: 'Diamant 2',
    description: 'Prismes lumineux.',
    unlock: { type: 'rank', tier: 'diamant', division: 2 },
    visual: 'crystals',
    colors: ['#04070F', '#3D5A80', '#E8F1FA'],
    watermark: 'Diamant 2',
  },
  {
    id: 'rank-diamant-1',
    title: 'Diamant 1',
    description: 'Éclat diamant.',
    unlock: { type: 'rank', tier: 'diamant', division: 1 },
    visual: 'crystals',
    colors: ['#02040A', '#5B8DB8', '#FFFFFF'],
    watermark: 'Diamant 1',
  },
  {
    id: 'rank-platine-3',
    title: 'Platine 3',
    description: 'Ondes concentriques.',
    unlock: { type: 'rank', tier: 'platine', division: 3 },
    visual: 'ripple',
    colors: ['#070C0C', '#4A6B6B', '#C8E0E0'],
    watermark: 'Platine 3',
  },
  {
    id: 'rank-platine-2',
    title: 'Platine 2',
    description: 'Ondes plus larges.',
    unlock: { type: 'rank', tier: 'platine', division: 2 },
    visual: 'ripple',
    colors: ['#050909', '#5F8A8A', '#E0F4F4'],
    watermark: 'Platine 2',
  },
  {
    id: 'rank-platine-1',
    title: 'Platine 1',
    description: 'Résonance platine.',
    unlock: { type: 'rank', tier: 'platine', division: 1 },
    visual: 'ripple',
    colors: ['#030606', '#7AA3A3', '#F5FFFF'],
    watermark: 'Platine 1',
  },
  {
    id: 'rank-elite-3',
    title: 'Élite 3',
    description: 'Éclairs violets.',
    unlock: { type: 'rank', tier: 'elite', division: 3 },
    visual: 'bolts',
    colors: ['#0A0614', '#4C1D75', '#C4B5FD'],
    watermark: 'Élite 3',
  },
  {
    id: 'rank-elite-2',
    title: 'Élite 2',
    description: 'Éclairs intenses.',
    unlock: { type: 'rank', tier: 'elite', division: 2 },
    visual: 'bolts',
    colors: ['#070310', '#5B21B6', '#DDD6FE'],
    watermark: 'Élite 2',
  },
  {
    id: 'rank-elite-1',
    title: 'Élite 1',
    description: 'Orage élite.',
    unlock: { type: 'rank', tier: 'elite', division: 1 },
    visual: 'bolts',
    colors: ['#040208', '#6D28D9', '#F5F3FF'],
    watermark: 'Élite 1',
  },
  {
    id: 'rank-champion',
    title: 'Champion',
    description: 'Grand emblème Champion (or & rouge) — sans cadre.',
    unlock: { type: 'rank', tier: 'champion', division: null },
    visual: 'liquid-gold',
    colors: ['#0A0402', '#7F1D1D', '#FBBF24'],
    watermark: 'Champion',
  },
];

const DISTANCE_COVERS: ProfileCoverDef[] = [
  /* ——— Records personnels (chiffre = ta plus longue séance) ——— */
  {
    id: 'dist-pb-run',
    title: 'Course à pied · record',
    description: 'Affiche ta plus longue course (ex. 8 kilomètres).',
    unlock: { type: 'personal_best', sport: 'run' },
    visual: 'pb-run',
    colors: ['#0A1628', '#1D4ED8', '#93C5FD'],
  },
  {
    id: 'dist-pb-bike',
    title: 'Record vélo',
    description: 'Affiche ta plus longue sortie vélo.',
    unlock: { type: 'personal_best', sport: 'bike' },
    visual: 'pb-bike',
    colors: ['#0A1208', '#15803D', '#86EFAC'],
  },
  {
    id: 'dist-pb-swim',
    title: 'Record natation',
    description: 'Affiche ta plus longue séance en bassin / eau libre.',
    unlock: { type: 'personal_best', sport: 'swim' },
    visual: 'pb-swim',
    colors: ['#021824', '#0369A1', '#7DD3FC'],
  },

  /* ——— Course à pied (paliers course) ——— */
  {
    id: 'dist-run-5k',
    title: '5 km',
    description: 'Course — séance ≥ 5 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 5 },
    visual: 'run-km',
    colors: ['#0B1220', '#1E3A8A', '#60A5FA'],
    distanceBadge: '5K',
  },
  {
    id: 'dist-run-10k',
    title: '10 km',
    description: 'Course — séance ≥ 10 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 10 },
    visual: 'run-km',
    colors: ['#0A1628', '#1D4ED8', '#93C5FD'],
    distanceBadge: '10K',
  },
  {
    id: 'dist-run-21k',
    title: 'Semi',
    description: 'Course — séance ≥ 21,1 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 21.1 },
    visual: 'run-km',
    colors: ['#050510', '#312E81', '#FBBF24'],
    distanceBadge: '21K',
  },
  {
    id: 'dist-run-42k',
    title: 'Marathon',
    description: 'Course — séance ≥ 42,2 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 42.195 },
    visual: 'run-km',
    colors: ['#0C0A04', '#854D0E', '#FDE68A'],
    distanceBadge: '42K',
  },
  {
    id: 'dist-run-50k',
    title: '50 km',
    description: 'Course — séance ≥ 50 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 50 },
    visual: 'run-km',
    colors: ['#061018', '#0F766E', '#99F6E4'],
    distanceBadge: '50K',
  },
  {
    id: 'dist-run-100k',
    title: '100 km',
    description: 'Course — séance ≥ 100 km.',
    unlock: { type: 'distance', sport: 'run', minKm: 100 },
    visual: 'run-km',
    colors: ['#02010A', '#4C1D95', '#F0ABFC'],
    distanceBadge: '100K',
  },

  /* ——— Vélo ——— */
  {
    id: 'dist-bike-40',
    title: '40 km vélo',
    description: 'Vélo — séance ≥ 40 km.',
    unlock: { type: 'distance', sport: 'bike', minKm: 40 },
    visual: 'bike-km',
    colors: ['#0A140C', '#166534', '#4ADE80'],
    distanceBadge: '40 km',
  },
  {
    id: 'dist-bike-100',
    title: '100 km vélo',
    description: 'Vélo — séance ≥ 100 km.',
    unlock: { type: 'distance', sport: 'bike', minKm: 100 },
    visual: 'bike-km',
    colors: ['#081018', '#0E7490', '#67E8F9'],
    distanceBadge: '100 km',
  },
  {
    id: 'dist-bike-160',
    title: '160 km vélo',
    description: 'Vélo — séance ≥ 160 km.',
    unlock: { type: 'distance', sport: 'bike', minKm: 160 },
    visual: 'bike-km',
    colors: ['#12080A', '#9A3412', '#FDBA74'],
    distanceBadge: '160 km',
  },
  {
    id: 'dist-bike-200',
    title: '200 km vélo',
    description: 'Vélo — séance ≥ 200 km.',
    unlock: { type: 'distance', sport: 'bike', minKm: 200 },
    visual: 'bike-km',
    colors: ['#0A0612', '#6D28D9', '#C4B5FD'],
    distanceBadge: '200 km',
  },

  /* ——— Natation (km en eau) ——— */
  {
    id: 'dist-swim-1',
    title: '1 km nage',
    description: 'Natation — séance ≥ 1 km.',
    unlock: { type: 'distance', sport: 'swim', minKm: 1 },
    visual: 'swim-km',
    colors: ['#021824', '#0284C7', '#7DD3FC'],
    distanceBadge: '1 km',
  },
  {
    id: 'dist-swim-2',
    title: '2 km nage',
    description: 'Natation — séance ≥ 2 km.',
    unlock: { type: 'distance', sport: 'swim', minKm: 2 },
    visual: 'swim-km',
    colors: ['#01141F', '#0369A1', '#38BDF8'],
    distanceBadge: '2 km',
  },
  {
    id: 'dist-swim-5',
    title: '5 km nage',
    description: 'Natation — séance ≥ 5 km.',
    unlock: { type: 'distance', sport: 'swim', minKm: 5 },
    visual: 'swim-km',
    colors: ['#020C18', '#0E7490', '#99F6E4'],
    distanceBadge: '5 km',
  },
  {
    id: 'dist-swim-10',
    title: '10 km nage',
    description: 'Natation — séance ≥ 10 km.',
    unlock: { type: 'distance', sport: 'swim', minKm: 10 },
    visual: 'swim-km',
    colors: ['#010810', '#1E3A8A', '#A5B4FC'],
    distanceBadge: '10 km',
  },
];

export const DEFAULT_PROFILE_COVER_ID = 'free-teal';

export const PROFILE_COVERS: ProfileCoverDef[] = [
  {
    id: 'free-teal',
    title: 'Souffle teal',
    description: 'Dégradé animé + taches teal.',
    unlock: { type: 'free' },
    visual: 'breath',
    colors: ['#06201C', '#0F766E', '#5EEAD4'],
  },
  {
    id: 'free-night',
    title: 'Crépuscule',
    description: 'Dégradé violet + taches qui dérivent.',
    unlock: { type: 'free' },
    visual: 'dusk',
    colors: ['#0C0C0E', '#1E1B4B', '#6366F1'],
  },
  {
    id: 'free-sky',
    title: 'Brume',
    description: 'Dégradé ciel + formes organiques.',
    unlock: { type: 'free' },
    visual: 'mist',
    colors: ['#0C4A6E', '#0284C7', '#BAE6FD'],
  },
  {
    id: 'free-forest',
    title: 'Canopée',
    description: 'Dégradé vert + taches qui se déforment.',
    unlock: { type: 'free' },
    visual: 'breath',
    colors: ['#052E16', '#166534', '#86EFAC'],
  },
  {
    id: 'prem-aurora',
    title: 'Voile d’aurore',
    description: 'Voiles doux animés.',
    unlock: { type: 'free' },
    visual: 'aurora-veil',
    colors: ['#020617', '#4C1D95', '#22D3EE'],
  },
  {
    id: 'prem-neon',
    title: 'Hex néon',
    description: 'Grille soft animée.',
    unlock: { type: 'free' },
    visual: 'cyber-hex',
    colors: ['#020617', '#0891B2', '#DB2777'],
  },
  {
    id: 'prem-ocean',
    title: 'Maelström',
    description: 'Anneaux lents en spirale.',
    unlock: { type: 'free' },
    visual: 'maelstrom',
    colors: ['#020617', '#0E4D6B', '#67E8F9'],
  },
  {
    id: 'prem-ember',
    title: 'Inferno',
    description: 'Chaleur douce animée.',
    unlock: { type: 'free' },
    visual: 'inferno',
    colors: ['#140505', '#9A3412', '#FBBF24'],
  },
  ...RANK_COVERS,
  ...DISTANCE_COVERS,
];

export function getProfileCover(id: string | undefined): ProfileCoverDef {
  const resolved = id ? (LEGACY_DISTANCE_IDS[id] ?? id) : undefined;
  return (
    PROFILE_COVERS.find((c) => c.id === resolved) ??
    PROFILE_COVERS.find((c) => c.id === DEFAULT_PROFILE_COVER_ID)!
  );
}

export type ActivityDistanceInput = {
  distanceM: number;
  sport?: string | null;
};

/** Plus longue séance toutes disciplines (km) */
export function longestSessionKm(distancesM: number[]): number {
  if (!distancesM.length) return 0;
  return Math.max(...distancesM.map((m) => m / 1000));
}

function normalizeCoverSport(sport?: string | null): CoverDistanceSport {
  if (sport === 'bike' || sport === 'swim') return sport;
  // run, other, strength, undefined → course (imports / GPX sans sport)
  if (sport === 'run' || !sport || sport === 'other') return 'run';
  return 'run';
}

/** Plus longue séance (km) par sport — course / vélo / natation */
export function longestSessionKmBySport(
  activities: ActivityDistanceInput[],
): Record<CoverDistanceSport, number> {
  const out: Record<CoverDistanceSport, number> = { run: 0, bike: 0, swim: 0 };
  for (const a of activities) {
    if ((a.distanceM || 0) <= 0) continue;
    // Force / autre sans distance utile déjà filtrée ; swim/bike explicites
    const sport =
      a.sport === 'strength' ? null : normalizeCoverSport(a.sport);
    if (!sport) continue;
    const km = a.distanceM / 1000;
    if (km > out[sport]) out[sport] = km;
  }
  return out;
}

/** Libellé animé du record perso : « 8 » + « kilomètres » */
export function formatPersonalBestCoverLabel(km: number): {
  primary: string;
  secondary: string;
} {
  if (km < 0.05) {
    return { primary: '—', secondary: 'kilomètres' };
  }
  const rounded = km < 20 ? Math.round(km * 10) / 10 : Math.round(km);
  const primary =
    Number.isInteger(rounded) || Math.abs(rounded - Math.round(rounded)) < 0.05
      ? String(Math.round(rounded))
      : rounded.toFixed(1).replace('.', ',');
  return { primary, secondary: 'kilomètres' };
}

export function isProfileCoverUnlocked(
  cover: ProfileCoverDef,
  opts: {
    tier: RankTier;
    division?: RankDivision | null;
    longestKm?: number;
    longestBySport?: Partial<Record<CoverDistanceSport, number>>;
    /** Compte essai : tous les fonds accessibles sans palier / record */
    unlockAll?: boolean;
  },
): boolean {
  if (opts.unlockAll) return true;
  if (cover.unlock.type === 'free') return true;
  if (cover.unlock.type === 'personal_best') {
    const km =
      opts.longestBySport?.[cover.unlock.sport] ??
      (cover.unlock.sport === 'run' ? opts.longestKm : undefined) ??
      0;
    return km >= 0.1;
  }
  if (cover.unlock.type === 'distance') {
    const km =
      opts.longestBySport?.[cover.unlock.sport] ??
      (cover.unlock.sport === 'run' ? opts.longestKm : undefined) ??
      0;
    return km >= cover.unlock.minKm - 0.05;
  }
  const need = rankStepIndex(cover.unlock.tier, cover.unlock.division);
  const have = rankStepIndex(opts.tier, opts.division ?? 3);
  return have >= need;
}

export function profileCoverLockHint(cover: ProfileCoverDef): string {
  if (cover.unlock.type === 'rank') {
    return formatRankLabel(cover.unlock.tier, cover.unlock.division);
  }
  if (cover.unlock.type === 'personal_best') {
    return `1 séance ${COVER_SPORT_LABEL[cover.unlock.sport].toLowerCase()}`;
  }
  if (cover.unlock.type === 'distance') {
    const sport = COVER_SPORT_LABEL[cover.unlock.sport];
    const km =
      cover.unlock.minKm % 1 === 0
        ? `${cover.unlock.minKm}`
        : cover.unlock.minKm.toFixed(1).replace('.', ',');
    return `${sport} ≥ ${km} km`;
  }
  return '';
}

export function coversBySection(): {
  /** Fonds de base (anciens gratuits + styles animés) */
  styles: ProfileCoverDef[];
  ranks: ProfileCoverDef[];
  /** Record perso en premier, puis paliers */
  run: ProfileCoverDef[];
  bike: ProfileCoverDef[];
  swim: ProfileCoverDef[];
  /** @deprecated — aliases pour anciens appels */
  free: ProfileCoverDef[];
  extreme: ProfileCoverDef[];
  distancePb: ProfileCoverDef[];
  distanceRun: ProfileCoverDef[];
  distanceBike: ProfileCoverDef[];
  distanceSwim: ProfileCoverDef[];
  distance: ProfileCoverDef[];
} {
  const pb = (sport: CoverDistanceSport) =>
    PROFILE_COVERS.filter(
      (c) => c.unlock.type === 'personal_best' && c.unlock.sport === sport,
    );
  const dist = (sport: CoverDistanceSport) =>
    PROFILE_COVERS.filter(
      (c) => c.unlock.type === 'distance' && c.unlock.sport === sport,
    );
  const styles = PROFILE_COVERS.filter((c) => c.unlock.type === 'free');
  const ranks = PROFILE_COVERS.filter((c) => c.unlock.type === 'rank');
  const run = [...pb('run'), ...dist('run')];
  const bike = [...pb('bike'), ...dist('bike')];
  const swim = [...pb('swim'), ...dist('swim')];
  const distance = PROFILE_COVERS.filter(
    (c) => c.unlock.type === 'distance' || c.unlock.type === 'personal_best',
  );
  return {
    styles,
    ranks,
    run,
    bike,
    swim,
    free: styles.filter((c) => !EXTREME_VISUALS.includes(c.visual)),
    extreme: styles.filter((c) => EXTREME_VISUALS.includes(c.visual)),
    distancePb: distance.filter((c) => c.unlock.type === 'personal_best'),
    distanceRun: dist('run'),
    distanceBike: dist('bike'),
    distanceSwim: dist('swim'),
    distance,
  };
}
