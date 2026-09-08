import type { AthleticLevel, GoalType, SportDiscipline } from '../types/domain';
import { guideForDistanceKm, recommendedWeeks } from '../data/programDurationDb';

export type ProgramSportCategory =
  | 'run'
  | 'bike'
  | 'swim'
  | 'triathlon'
  | 'strength'
  | 'ironman'
  | 'other';

export interface TrainingProgramTemplate {
  id: string;
  title: string;
  subtitle: string;
  weeks: number;
  disciplines: SportDiscipline[];
  level: AthleticLevel;
  sportCategory: ProgramSportCategory;
  goal: GoalType;
  keywords: string[];
  distanceKm?: number;
  /** Natation : filtre piscine vs eau libre */
  swimVenue?: 'pool' | 'open_water';
}

/** Sports les plus pratiqués — Ironman juste au-dessus du duathlon */
export const POPULAR_SPORT_CATEGORIES: Array<{
  id: ProgramSportCategory;
  label: string;
  desc: string;
}> = [
  { id: 'run', label: 'Course', desc: 'Course à pied, trail, ultra' },
  { id: 'bike', label: 'Cyclisme', desc: 'Route, home trainer, cyclo' },
  { id: 'swim', label: 'Natation', desc: 'Piscine, eau libre' },
  { id: 'triathlon', label: 'Triathlon', desc: 'Natation · vélo · course' },
  { id: 'strength', label: 'Musculation', desc: 'Renforcement, salle' },
  { id: 'ironman', label: 'Ironman', desc: '5150 · 70.3 · 140.6' },
];

export const PROGRAM_CATALOG: TrainingProgramTemplate[] = [
  {
    id: 'prog-5k',
    title: 'Programme 5 km',
    subtitle: '8 semaines · débuter en course',
    weeks: 8,
    disciplines: ['run'],
    level: 'debutant',
    sportCategory: 'run',
    goal: '5k',
    keywords: ['5k', '5 km', 'course', 'running', 'débutant'],
    distanceKm: 5,
  },
  {
    id: 'prog-10k',
    title: 'Programme 10 km',
    subtitle: '10 semaines · endurance + VMA',
    weeks: 10,
    disciplines: ['run'],
    level: 'intermediaire',
    sportCategory: 'run',
    goal: '10k',
    keywords: ['10k', '10 km', 'course', 'running'],
    distanceKm: 10,
  },
  {
    id: 'prog-semi',
    title: 'Semi',
    subtitle: '12 semaines · sortie longue progressive',
    weeks: 12,
    disciplines: ['run'],
    level: 'intermediaire',
    sportCategory: 'run',
    goal: 'semi',
    keywords: ['semi', 'semi-marathon', '21 km', '21.1'],
    distanceKm: 21.1,
  },
  {
    id: 'prog-marathon',
    title: 'Marathon',
    subtitle: '16 semaines · pic à 32 km',
    weeks: 16,
    disciplines: ['run'],
    level: 'confirme',
    sportCategory: 'run',
    goal: 'marathon',
    keywords: ['marathon', '42 km', '42.195', 'course'],
    distanceKm: 42.195,
  },
  {
    id: 'prog-trail-50',
    title: 'Trail 50 km',
    subtitle: '14 semaines · dénivelé & endurance',
    weeks: 14,
    disciplines: ['run'],
    level: 'confirme',
    sportCategory: 'run',
    goal: 'trail',
    keywords: ['trail', 'ultra', '50 km', 'montagne'],
    distanceKm: 50,
  },
  {
    id: 'prog-vma',
    title: 'VMA & vitesse',
    subtitle: '6 semaines · fractions & technique',
    weeks: 6,
    disciplines: ['run'],
    level: 'intermediaire',
    sportCategory: 'run',
    goal: 'vma',
    keywords: ['vma', 'vitesse', 'fractionné', 'piste'],
  },
  {
    id: 'prog-bike-40',
    title: 'Sortie 40 km',
    subtitle: '6 semaines · initiation route',
    weeks: 6,
    disciplines: ['bike'],
    level: 'debutant',
    sportCategory: 'bike',
    goal: 'forme',
    keywords: ['vélo', 'cyclisme', '40 km', 'débutant', 'sortie', 'club'],
    distanceKm: 40,
  },
  {
    id: 'prog-bike-80',
    title: 'Cyclosportive 80 km',
    subtitle: '8 semaines · medio fondo',
    weeks: 8,
    disciplines: ['bike'],
    level: 'debutant',
    sportCategory: 'bike',
    goal: 'forme',
    keywords: ['vélo', 'cyclisme', '80 km', 'cyclo', 'sportive', 'medio'],
    distanceKm: 80,
  },
  {
    id: 'prog-bike-120',
    title: 'Gran Fondo 120 km',
    subtitle: '10 semaines · endurance cyclo',
    weeks: 10,
    disciplines: ['bike'],
    level: 'intermediaire',
    sportCategory: 'bike',
    goal: 'forme',
    keywords: ['vélo', 'cyclisme', '120 km', 'gran fondo', 'fondo', 'sportive'],
    distanceKm: 120,
  },
  {
    id: 'prog-bike-fondo',
    title: 'Sanctuary Ride (160 km)',
    subtitle: '12 semaines · century / gran fondo',
    weeks: 12,
    disciplines: ['bike'],
    level: 'intermediaire',
    sportCategory: 'bike',
    goal: 'forme',
    keywords: ['vélo', 'cyclisme', 'fondo', '160 km', 'century', 'sanctuary', '100 miles'],
    distanceKm: 160,
  },
  {
    id: 'prog-bike-200',
    title: 'Brevet 200 km',
    subtitle: '14 semaines · longue distance',
    weeks: 14,
    disciplines: ['bike'],
    level: 'confirme',
    sportCategory: 'bike',
    goal: 'forme',
    keywords: ['vélo', 'cyclisme', '200 km', 'brevet', 'audax', 'randonnée'],
    distanceKm: 200,
  },
  {
    id: 'prog-bike-crit',
    title: 'Critérium & côte',
    subtitle: '8 semaines · puissance & répétitions',
    weeks: 8,
    disciplines: ['bike'],
    level: 'confirme',
    sportCategory: 'bike',
    goal: 'vma',
    keywords: ['vélo', 'critérium', 'côte', 'cyclisme', 'puissance'],
  },
  {
    id: 'prog-swim-50',
    title: '50 m nage libre',
    subtitle: '6 semaines · sprint piscine',
    weeks: 6,
    disciplines: ['swim'],
    level: 'debutant',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', '50', 'sprint', 'piscine', 'nage libre'],
    distanceKm: 0.05,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-100',
    title: '100 m nage libre',
    subtitle: '8 semaines · distance la plus courue en club',
    weeks: 8,
    disciplines: ['swim'],
    level: 'intermediaire',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', '100', 'piscine', 'nage libre', 'chrono'],
    distanceKm: 0.1,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-200',
    title: '200 m nage libre',
    subtitle: '8 semaines · vitesse & endurance',
    weeks: 8,
    disciplines: ['swim'],
    level: 'intermediaire',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', '200', 'piscine'],
    distanceKm: 0.2,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-400',
    title: '400 m nage libre',
    subtitle: '10 semaines · demi-fond bassin',
    weeks: 10,
    disciplines: ['swim'],
    level: 'intermediaire',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', '400', 'piscine'],
    distanceKm: 0.4,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-800',
    title: '800 m nage libre',
    subtitle: '10 semaines · fond technique',
    weeks: 10,
    disciplines: ['swim'],
    level: 'intermediaire',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', '800', 'piscine'],
    distanceKm: 0.8,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-1500',
    title: '1500 m nage libre',
    subtitle: '12 semaines · endurance bassin',
    weeks: 12,
    disciplines: ['swim'],
    level: 'confirme',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', 'nage', '1500', 'piscine', 'swim'],
    distanceKm: 1.5,
    swimVenue: 'pool',
  },
  {
    id: 'prog-swim-eau-libre-1k',
    title: 'Eau libre 1 km',
    subtitle: '8 semaines · open water initiation',
    weeks: 8,
    disciplines: ['swim'],
    level: 'debutant',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', 'eau libre', 'open water', '1 km'],
    distanceKm: 1,
    swimVenue: 'open_water',
  },
  {
    id: 'prog-swim-eau-libre',
    title: 'Eau libre 2 km',
    subtitle: '10 semaines · open water',
    weeks: 10,
    disciplines: ['swim'],
    level: 'confirme',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', 'eau libre', 'open water', 'triathlon'],
    distanceKm: 2,
    swimVenue: 'open_water',
  },
  {
    id: 'prog-swim-eau-libre-5k',
    title: 'Eau libre 5 km',
    subtitle: '14 semaines · longue distance',
    weeks: 14,
    disciplines: ['swim'],
    level: 'confirme',
    sportCategory: 'swim',
    goal: 'forme',
    keywords: ['natation', 'eau libre', '5 km', 'open water'],
    distanceKm: 5,
    swimVenue: 'open_water',
  },
  {
    id: 'prog-tri-super-sprint',
    title: 'Triathlon XS (super sprint)',
    subtitle: '8 sem · XS · 0,4 / 10 / 2,5 km',
    weeks: 8,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'debutant',
    sportCategory: 'triathlon',
    goal: 'triathlon_sprint',
    keywords: ['triathlon', 'xs', 'super sprint', 'débutant', 'initiation'],
    distanceKm: 12.9,
  },
  {
    id: 'prog-tri-sprint',
    title: 'Triathlon S (sprint)',
    subtitle: '10 sem · S · 0,75 / 20 / 5 km',
    weeks: 10,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'intermediaire',
    sportCategory: 'triathlon',
    goal: 'triathlon_sprint',
    keywords: ['triathlon', 's', 'sprint', 'natation', 'vélo', 'course'],
    distanceKm: 25.75,
  },
  {
    id: 'prog-tri-olympique',
    title: 'Triathlon M (olympique)',
    subtitle: '14 sem · M · 1,5 / 40 / 10 km',
    weeks: 14,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'confirme',
    sportCategory: 'triathlon',
    goal: 'triathlon_olympique',
    keywords: ['triathlon', 'm', 'olympique', 'natation', 'vélo', 'standard'],
    distanceKm: 51.5,
  },
  // ——— IRONMAN Group (formats officiels L / XXL) ———
  {
    id: 'prog-ironman-5150',
    title: 'IRONMAN 5150 (format M)',
    subtitle: '14 sem · M · 1,5 / 40 / 10 km',
    weeks: 14,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'intermediaire',
    sportCategory: 'ironman',
    goal: 'triathlon_olympique',
    keywords: ['ironman', '5150', 'm', 'olympique', 'triathlon', 'série'],
    distanceKm: 51.5,
  },
  {
    id: 'prog-ironman-70-3',
    title: 'IRONMAN 70.3 (format L)',
    subtitle: '16 sem · L · 1,9 / 90 / 21,1 km',
    weeks: 16,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'intermediaire',
    sportCategory: 'ironman',
    goal: 'ironman_70_3',
    keywords: ['ironman', '70.3', 'l', 'half', 'semi ironman', '113'],
    distanceKm: 113,
  },
  {
    id: 'prog-ironman-70-3-debut',
    title: 'Premier IRONMAN 70.3 (L)',
    subtitle: '18 sem · L · construction progressive débutant',
    weeks: 18,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'debutant',
    sportCategory: 'ironman',
    goal: 'ironman_70_3',
    keywords: ['ironman', '70.3', 'l', 'débutant', 'premier', 'half'],
    distanceKm: 113,
  },
  {
    id: 'prog-ironman',
    title: 'IRONMAN 140.6 (format XXL)',
    subtitle: '24 sem · XXL · 3,8 / 180 / 42,2 km · 4 phases',
    weeks: 24,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'confirme',
    sportCategory: 'ironman',
    goal: 'ironman',
    keywords: ['ironman', '140.6', 'xxl', 'full', 'complet', 'kona'],
    distanceKm: 226,
  },
  {
    id: 'prog-ironman-140-6-debut',
    title: 'Premier IRONMAN 140.6 (XXL)',
    subtitle: '28 sem · XXL · volume long & affûtage',
    weeks: 28,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'intermediaire',
    sportCategory: 'ironman',
    goal: 'ironman',
    keywords: ['ironman', '140.6', 'xxl', 'premier', 'débutant', 'full'],
    distanceKm: 226,
  },
  {
    id: 'prog-ironman-bridge',
    title: '70.3 → 140.6 (L → XXL)',
    subtitle: '21 sem · passer du half au full',
    weeks: 21,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'confirme',
    sportCategory: 'ironman',
    goal: 'ironman',
    keywords: ['ironman', 'bridge', '70.3', '140.6', 'l', 'xxl', 'passage'],
    distanceKm: 226,
  },
  {
    id: 'prog-ironman-performance',
    title: 'IRONMAN 140.6 Performance (XXL)',
    subtitle: '20 sem · polarisé 80/20 · pic vélo long',
    weeks: 20,
    disciplines: ['swim', 'bike', 'run', 'brick'],
    level: 'confirme',
    sportCategory: 'ironman',
    goal: 'ironman',
    keywords: ['ironman', 'performance', 'xxl', 'avancé', '140.6', 'polarisé'],
    distanceKm: 226,
  },
  {
    id: 'prog-biathlon',
    title: 'Biathlon (course + vélo)',
    subtitle: '12 semaines · enchaînement run / bike',
    weeks: 12,
    disciplines: ['run', 'bike'],
    level: 'intermediaire',
    sportCategory: 'other',
    goal: 'forme',
    keywords: ['biathlon', 'course', 'vélo', 'run bike', 'brick', 'enchaînement'],
  },
  {
    id: 'prog-duathlon-sprint',
    title: 'Duathlon sprint',
    subtitle: '8 semaines · course / vélo / course',
    weeks: 8,
    disciplines: ['run', 'bike'],
    level: 'debutant',
    sportCategory: 'other',
    goal: 'forme',
    keywords: ['duathlon', 'sprint', 'course', 'vélo', 'run bike run'],
  },
  {
    id: 'prog-strength-base',
    title: 'Musculation',
    subtitle: 'Force & prévention — selon ton matériel',
    weeks: 8,
    disciplines: ['strength'],
    level: 'debutant',
    sportCategory: 'strength',
    goal: 'forme',
    keywords: ['musculation', 'force', 'salle', 'renforcement', 'ppg'],
  },
  {
    id: 'prog-strength-tri',
    title: 'Renforcement triathlète',
    subtitle: '10 sem. · gainage & puissance',
    weeks: 10,
    disciplines: ['strength'],
    level: 'intermediaire',
    sportCategory: 'strength',
    goal: 'forme',
    keywords: ['musculation', 'triathlon', 'ironman', 'gainage', 'renforcement'],
  },
];

/** @deprecated use PROGRAM_CATALOG */
export const PROGRAM_TEMPLATES = PROGRAM_CATALOG;

export function formatProgramDurationLabel(prog: {
  weeks: number;
  ongoing?: boolean;
}): string {
  if (prog.ongoing) return 'Renouvellement infini';
  return `${prog.weeks} sem.`;
}

export function getProgramsForSport(sport: ProgramSportCategory): TrainingProgramTemplate[] {
  if (sport === 'other') {
    return PROGRAM_CATALOG.filter((p) => p.sportCategory === 'other');
  }
  return PROGRAM_CATALOG.filter((p) => p.sportCategory === sport);
}

type RunIntentFilter =
  | 'race_road'
  | 'race_trail'
  | 'start'
  | 'progress'
  | 'return_injury';

/**
 * Catalogue course ordonné / filtré selon l’objectif onboarding
 * (le 1er item = suggestion principale).
 */
export function getProgramsForRunIntent(
  intent: RunIntentFilter | null | undefined,
): TrainingProgramTemplate[] {
  const all = getProgramsForSport('run');
  if (!intent) return all;

  const byId = (ids: string[]) =>
    ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is TrainingProgramTemplate => Boolean(p));

  switch (intent) {
    case 'race_road':
      return byId([
        'prog-5k',
        'prog-10k',
        'prog-semi',
        'prog-marathon',
        'prog-vma',
      ]);
    case 'race_trail':
      return byId(['prog-trail-50', 'prog-semi', 'prog-10k', 'prog-vma', 'prog-5k']);
    case 'start':
      // Premiers pas : uniquement formats courts / accessibles
      return byId(['prog-5k', 'prog-10k']);
    case 'return_injury':
      return byId(['prog-5k', 'prog-10k', 'prog-vma']);
    case 'progress':
      return byId([
        'prog-vma',
        'prog-10k',
        'prog-semi',
        'prog-5k',
        'prog-marathon',
        'prog-trail-50',
      ]);
    default:
      return all;
  }
}

export function searchPrograms(
  query: string,
  sport?: ProgramSportCategory,
  swimVenue?: 'pool' | 'open_water',
): TrainingProgramTemplate[] {
  const q = query.trim().toLowerCase();
  let pool = sport ? getProgramsForSport(sport) : PROGRAM_CATALOG;
  if (sport === 'swim' && swimVenue) {
    pool = pool.filter((p) => !p.swimVenue || p.swimVenue === swimVenue);
  }
  if (!q) return pool;
  return pool.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.subtitle.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.includes(q)),
  );
}

export function findProgramById(id: string): TrainingProgramTemplate | undefined {
  return PROGRAM_CATALOG.find((p) => p.id === id);
}

/** Estime la durée en semaines pour une distance personnalisée (base offline) */
export function estimateWeeksForDistance(distanceKm: number, level: AthleticLevel): number {
  return recommendedWeeks(guideForDistanceKm(distanceKm), level);
}

export const DEMO_GROUPS = [
  { id: 'g1', name: 'Runners Paris', members: 1240, sport: 'Course' },
  { id: 'g2', name: 'Triathlon Nantes', members: 456, sport: 'Triathlon' },
  { id: 'g3', name: 'Trail Bretagne', members: 890, sport: 'Trail' },
  { id: 'g4', name: 'Vélo Loire', members: 620, sport: 'Vélo' },
];
