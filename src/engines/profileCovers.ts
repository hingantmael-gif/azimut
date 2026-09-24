import type { RankTier } from '../types/domain';
import { isPremiumUiVisible } from '../premium/featureFlags';

/** Suffixe des descriptions de fonds animés : le mot « Premium » n'apparaît que si Premium est activé. */
const PREM_TAG = isPremiumUiVisible() ? ' — Premium.' : '.';
import { formatRankLabel, type RankDivision } from './rankedLadder';
import { rankStepIndex } from './rankedSeason';

/** Sports avec fonds distance (km / séance) */
export type CoverDistanceSport = 'run' | 'bike' | 'swim';

export type ProfileCoverUnlock =
  | { type: 'free' }
  | { type: 'premium' }
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
    description: 'Braises discrètes — flammes ambre sombre.',
    unlock: { type: 'rank', tier: 'bronze', division: 3 },
    visual: 'flames',
    colors: ['#07111F', '#92400E', '#B45309'],
    watermark: 'Bronze 3',
  },
  {
    id: 'rank-bronze-2',
    title: 'Bronze 2',
    description: 'Le feu prend — étincelles montantes.',
    unlock: { type: 'rank', tier: 'bronze', division: 2 },
    visual: 'flames',
    colors: ['#07111F', '#B45309', '#D97706'],
    watermark: 'Bronze 2',
  },
  {
    id: 'rank-bronze-1',
    title: 'Bronze 1',
    description: 'Feu établi — pointes vives et halo net.',
    unlock: { type: 'rank', tier: 'bronze', division: 1 },
    visual: 'flames',
    colors: ['#07111F', '#B45309', '#D97706'],
    watermark: 'Bronze 1',
  },
  {
    id: 'rank-argent-3',
    title: 'Argent 3',
    description: 'Gouttes de mercure lentes.',
    unlock: { type: 'rank', tier: 'argent', division: 3 },
    visual: 'mercury',
    colors: ['#07111F', '#64748B', '#94A3B8'],
    watermark: 'Argent 3',
  },
  {
    id: 'rank-argent-2',
    title: 'Argent 2',
    description: 'Filets de mercure — tension de surface.',
    unlock: { type: 'rank', tier: 'argent', division: 2 },
    visual: 'mercury',
    colors: ['#07111F', '#64748B', '#E2E8F0'],
    watermark: 'Argent 2',
  },
  {
    id: 'rank-argent-1',
    title: 'Argent 1',
    description: 'Flaque mercurielle active.',
    unlock: { type: 'rank', tier: 'argent', division: 1 },
    visual: 'mercury',
    colors: ['#05080F', '#64748B', '#FFFFFF'],
    watermark: 'Argent 1',
  },
  {
    id: 'rank-or-3',
    title: 'Or 3',
    description: 'Coulées d’or fines.',
    unlock: { type: 'rank', tier: 'or', division: 3 },
    visual: 'liquid-gold',
    colors: ['#07111F', '#92400E', '#D97706'],
    watermark: 'Or 3',
  },
  {
    id: 'rank-or-2',
    title: 'Or 2',
    description: 'Or en fusion — poussière d’or animée.',
    unlock: { type: 'rank', tier: 'or', division: 2 },
    visual: 'liquid-gold',
    colors: ['#07111F', '#D97706', '#FBBF24'],
    watermark: 'Or 2',
  },
  {
    id: 'rank-or-1',
    title: 'Or 1',
    description: 'Cascade d’or + SoftPulse doré.',
    unlock: { type: 'rank', tier: 'or', division: 1 },
    visual: 'liquid-gold',
    colors: ['#05080A', '#D97706', '#FFF1A8'],
    watermark: 'Or 1',
  },
  {
    id: 'rank-diamant-3',
    title: 'Diamant 3',
    description: 'Cristaux bleu clair en chute lente.',
    unlock: { type: 'rank', tier: 'diamant', division: 3 },
    visual: 'crystals',
    colors: ['#04070F', '#1E3A8A', '#93C5FD'],
    watermark: 'Diamant 3',
  },
  {
    id: 'rank-diamant-2',
    title: 'Diamant 2',
    description: 'Cristaux en rotation — éclat au sol.',
    unlock: { type: 'rank', tier: 'diamant', division: 2 },
    visual: 'crystals',
    colors: ['#03060C', '#2563EB', '#BFDBFE'],
    watermark: 'Diamant 2',
  },
  {
    id: 'rank-diamant-1',
    title: 'Diamant 1',
    description: 'Pluie dense + flash bleu discret.',
    unlock: { type: 'rank', tier: 'diamant', division: 1 },
    visual: 'crystals',
    colors: ['#02040A', '#2563EB', '#DBEAFE'],
    watermark: 'Diamant 1',
  },
  {
    id: 'rank-platine-3',
    title: 'Platine 3',
    description: 'Anneaux concentriques lents.',
    unlock: { type: 'rank', tier: 'platine', division: 3 },
    visual: 'ripple',
    colors: ['#04100E', '#0F766E', '#5EEAD4'],
    watermark: 'Platine 3',
  },
  {
    id: 'rank-platine-2',
    title: 'Platine 2',
    description: 'Ondes plus larges et plus vives.',
    unlock: { type: 'rank', tier: 'platine', division: 2 },
    visual: 'ripple',
    colors: ['#030E0C', '#0D9488', '#99F6E4'],
    watermark: 'Platine 2',
  },
  {
    id: 'rank-platine-1',
    title: 'Platine 1',
    description: 'Champ d’ondulations + interférences.',
    unlock: { type: 'rank', tier: 'platine', division: 1 },
    visual: 'ripple',
    colors: ['#020A09', '#0D9488', '#CCFBF1'],
    watermark: 'Platine 1',
  },
  {
    id: 'rank-elite-3',
    title: 'Élite 3',
    description: 'Éclairs violets brefs.',
    unlock: { type: 'rank', tier: 'elite', division: 3 },
    visual: 'bolts',
    colors: ['#0A0614', '#6D28D9', '#8B5CF6'],
    watermark: 'Élite 3',
  },
  {
    id: 'rank-elite-2',
    title: 'Élite 2',
    description: 'Éclairs ramifiés + rémanence.',
    unlock: { type: 'rank', tier: 'elite', division: 2 },
    visual: 'bolts',
    colors: ['#070310', '#7C3AED', '#C4B5FD'],
    watermark: 'Élite 2',
  },
  {
    id: 'rank-elite-1',
    title: 'Élite 1',
    description: 'Réseau d’éclairs + glow violet.',
    unlock: { type: 'rank', tier: 'elite', division: 1 },
    visual: 'bolts',
    colors: ['#040208', '#7C3AED', '#F5F3FF'],
    watermark: 'Élite 1',
  },
  {
    id: 'rank-champion',
    title: 'Champion',
    description: 'Or liquide sublimé — synthèse de tous les paliers.',
    unlock: { type: 'rank', tier: 'champion', division: null },
    visual: 'liquid-gold',
    colors: ['#07111F', '#D97706', '#FBBF24'],
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
    description: `Aurore jade/mint à parallaxe${PREM_TAG}`,
    unlock: { type: 'premium' },
    visual: 'aurora-veil',
    colors: ['#07111F', '#0A6B54', '#3DFF9A'],
  },
  {
    id: 'prem-neon',
    title: 'Hex néon',
    description: `Grille hexagonale mint/lime${PREM_TAG}`,
    unlock: { type: 'premium' },
    visual: 'cyber-hex',
    colors: ['#07111F', '#0E8F6F', '#D4FF3F'],
  },
  {
    id: 'prem-ocean',
    title: 'Maelström',
    description: `Tourbillon océanique jade → turquoise${PREM_TAG}`,
    unlock: { type: 'premium' },
    visual: 'maelstrom',
    colors: ['#07111F', '#0A6B54', '#06B6D4'],
  },
  {
    id: 'prem-ember',
    title: 'Inferno',
    description: `Brasier + fumée + chaleur${PREM_TAG}`,
    unlock: { type: 'premium' },
    visual: 'inferno',
    colors: ['#07111F', '#7C2D12', '#F97316'],
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
    /** Abonnement Premium (covers prem-*) */
    premium?: boolean;
  },
): boolean {
  if (opts.unlockAll) return true;
  if (cover.unlock.type === 'free') return true;
  if (cover.unlock.type === 'premium') return Boolean(opts.premium);
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
  if (cover.unlock.type === 'premium') {
    return isPremiumUiVisible() ? 'Premium' : 'Animé';
  }
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
  /** Fonds de base (gratuits) + Premium en fin de liste */
  styles: ProfileCoverDef[];
  /** Fonds Premium uniquement */
  premium: ProfileCoverDef[];
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
  const styles = PROFILE_COVERS.filter(
    (c) => c.unlock.type === 'free' || c.unlock.type === 'premium',
  );
  const premium = PROFILE_COVERS.filter((c) => c.unlock.type === 'premium');
  const ranks = PROFILE_COVERS.filter((c) => c.unlock.type === 'rank');
  const run = [...pb('run'), ...dist('run')];
  const bike = [...pb('bike'), ...dist('bike')];
  const swim = [...pb('swim'), ...dist('swim')];
  const distance = PROFILE_COVERS.filter(
    (c) => c.unlock.type === 'distance' || c.unlock.type === 'personal_best',
  );
  return {
    styles,
    premium,
    ranks,
    run,
    bike,
    swim,
    free: styles.filter((c) => c.unlock.type === 'free' && !EXTREME_VISUALS.includes(c.visual)),
    extreme: styles.filter((c) => c.unlock.type === 'free' && EXTREME_VISUALS.includes(c.visual)),
    distancePb: distance.filter((c) => c.unlock.type === 'personal_best'),
    distanceRun: dist('run'),
    distanceBike: dist('bike'),
    distanceSwim: dist('swim'),
    distance,
  };
}
