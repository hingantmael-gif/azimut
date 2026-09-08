import type { ImageSourcePropType } from 'react-native';
import type { GoalType, AthleticLevel } from '../../types/domain';
import type { ProgramSportCategory } from '../../constants/programs';
import { buildOnboardingSteps } from './sportOnboardingConfig';

/** Intention course (parcours Azimut — textes originaux). */
export type RunIntent =
  | 'race_road'
  | 'race_trail'
  | 'start'
  | 'progress'
  | 'return_injury';

export type TerrainFocus = 'route' | 'trail';
export type TrainingTerrain = 'hills' | 'mixed' | 'flat';
export type RunningExperience = 'lt1' | '1_3' | '3_5' | '5plus';
export type UsualVolumeBand = '0_20' | '15_35' | '30_50' | '40_60' | '60plus';
export type WeeklySessionsTarget = 3 | 4 | 5 | 6 | 7;

export type CampusIntakeStepId =
  | 'relay'
  | 'identity'
  | 'run_goal'
  | 'terrain'
  | 'training_type'
  | 'experience'
  | 'injury'
  | 'usual_volume'
  | 'weekly_rhythm'
  | 'reference_time'
  | 'plan_preview'
  | 'program_pick'
  | 'program_weeks';

export const ONBOARDING_IMAGES = {
  heroRelay: require('../../../assets/onboarding/onboarding-hero-relay.png') as ImageSourcePropType,
  goalRoad: require('../../../assets/onboarding/onboarding-goal-road.png') as ImageSourcePropType,
  goalTrail: require('../../../assets/onboarding/onboarding-goal-trail.png') as ImageSourcePropType,
  goalStart: require('../../../assets/onboarding/onboarding-goal-start.png') as ImageSourcePropType,
  goalProgress: require('../../../assets/onboarding/onboarding-goal-progress.png') as ImageSourcePropType,
  goalReturn: require('../../../assets/onboarding/onboarding-goal-return.png') as ImageSourcePropType,
  planTeaser: require('../../../assets/onboarding/onboarding-plan-teaser.png') as ImageSourcePropType,
};

export const RELAY_COPY = {
  headline: 'TON CAP COMMENCE ICI',
  body: 'Un plan clair, à ton rythme.',
  cta: 'Démarrer',
} as const;

export const IDENTITY_COPY = {
  title: 'Qui es-tu ?',
  subtitle: '',
  genderWoman: 'Femme',
  genderMan: 'Homme',
  firstName: 'PRÉNOM',
  lastName: 'NOM',
  birthDate: 'NAISSANCE',
  city: 'VILLE',
  cta: 'Continuer',
} as const;

export const RUN_GOAL_OPTIONS: ReadonlyArray<{
  id: RunIntent;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  goal: GoalType;
}> = [
  {
    id: 'race_road',
    title: 'Course sur route',
    subtitle: '5 km → marathon',
    image: ONBOARDING_IMAGES.goalRoad,
    goal: '10k',
  },
  {
    id: 'race_trail',
    title: 'Trail',
    subtitle: 'Sentier & dénivelé',
    image: ONBOARDING_IMAGES.goalTrail,
    goal: 'trail',
  },
  {
    id: 'start',
    title: 'Se mettre à courir',
    subtitle: 'Bases solides',
    image: ONBOARDING_IMAGES.goalStart,
    goal: 'forme',
  },
  {
    id: 'progress',
    title: 'Progresser',
    subtitle: 'Allure & régularité',
    image: ONBOARDING_IMAGES.goalProgress,
    goal: 'forme',
  },
  {
    id: 'return_injury',
    title: 'Reprise',
    subtitle: 'Après une pause',
    image: ONBOARDING_IMAGES.goalReturn,
    goal: 'forme',
  },
];

export const TERRAIN_COPY = {
  title: 'Où t’entraînes-tu ?',
  prompt: '',
} as const;

export const TERRAIN_OPTIONS: ReadonlyArray<{
  id: TerrainFocus;
  label: string;
  image: ImageSourcePropType;
}> = [
  { id: 'route', label: 'Route', image: ONBOARDING_IMAGES.goalRoad },
  { id: 'trail', label: 'Trail', image: ONBOARDING_IMAGES.goalTrail },
];

export const TRAINING_TYPE_COPY = {
  title: 'Type de parcours ?',
  prompt: '',
} as const;

export const TRAINING_TYPE_OPTIONS: ReadonlyArray<{
  id: TrainingTerrain;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'hills',
    title: 'Dénivelé',
    subtitle: 'Côtes & relief',
  },
  {
    id: 'mixed',
    title: 'Mixte',
    subtitle: 'Plat et relief',
  },
  {
    id: 'flat',
    title: 'Plat',
    subtitle: 'Allure stable',
  },
];

export const EXPERIENCE_COPY = {
  title: 'Depuis combien de temps ?',
  subtitle: '',
} as const;

export const EXPERIENCE_OPTIONS: ReadonlyArray<{
  id: RunningExperience;
  label: string;
  level: AthleticLevel;
}> = [
  { id: 'lt1', label: "Moins d'un an", level: 'debutant' },
  { id: '1_3', label: '1 à 3 ans', level: 'intermediaire' },
  { id: '3_5', label: '3 à 5 ans', level: 'intermediaire' },
  { id: '5plus', label: '5 ans et plus', level: 'confirme' },
];

export const INJURY_COPY = {
  title: 'Blessure ces 12 derniers mois ?',
  subtitle: '',
  no: 'Non',
  yes: 'Oui',
} as const;

export const VOLUME_COPY = {
  title: 'Volume hebdo actuel ?',
  subtitle: '',
} as const;

export const VOLUME_OPTIONS: ReadonlyArray<{
  id: UsualVolumeBand;
  label: string;
  weeklyKm: number;
}> = [
  { id: '0_20', label: '0-20 km', weeklyKm: 12 },
  { id: '15_35', label: '15-35 km', weeklyKm: 25 },
  { id: '30_50', label: '30-50 km', weeklyKm: 40 },
  { id: '40_60', label: '40-60 km', weeklyKm: 50 },
  { id: '60plus', label: '>60 km', weeklyKm: 70 },
];

export const RHYTHM_COPY = {
  title: 'Séances par semaine ?',
  subtitle: '',
  cta: 'Continuer',
} as const;

export const RHYTHM_OPTIONS: ReadonlyArray<{
  sessions: WeeklySessionsTarget;
  kmLabel: string;
  recommended?: boolean;
}> = [
  { sessions: 3, kmLabel: '27 à 39 km par semaine' },
  { sessions: 4, kmLabel: '35 à 50 km par semaine' },
  { sessions: 5, kmLabel: '47 à 67 km par semaine' },
  { sessions: 6, kmLabel: '55 à 78 km par semaine', recommended: true },
  { sessions: 7, kmLabel: '62 à 88 km par semaine' },
];

export const REFERENCE_COPY = {
  title: 'Temps de référence',
  duration: 'Durée',
  pace: 'Allure',
  cta: 'Continuer',
} as const;

export const PLAN_PREVIEW_COPY = {
  title: 'Tes allures Azimut',
  body: 'Calculées à partir de ton chrono — pas des valeurs génériques.',
  easy: 'Endurance (EF)',
  fast: 'Qualité',
  recover: 'Récup entre séries',
  cta: 'Continuer',
} as const;

export function buildCampusRunSteps(opts: {
  intent: RunIntent | null;
  terrain: TerrainFocus | null;
}): CampusIntakeStepId[] {
  const steps: CampusIntakeStepId[] = ['run_goal'];
  if (!opts.intent) return steps;

  const needsTerrain =
    opts.intent === 'progress' || opts.intent === 'start' || opts.intent === 'return_injury';
  if (needsTerrain) steps.push('terrain');

  const terrain =
    opts.intent === 'race_road'
      ? 'route'
      : opts.intent === 'race_trail'
        ? 'trail'
        : opts.terrain;

  const needsTrainingType =
    opts.intent !== 'start' &&
    (terrain === 'trail' ||
      terrain === 'route' ||
      opts.intent === 'race_road' ||
      opts.intent === 'race_trail' ||
      opts.intent === 'progress' ||
      opts.intent === 'return_injury');
  if (needsTrainingType) steps.push('training_type');

  steps.push('experience', 'injury');

  if (opts.intent !== 'start') {
    steps.push('usual_volume');
  }

  steps.push('weekly_rhythm');

  if (opts.intent !== 'start') {
    steps.push('reference_time');
  }

  steps.push('plan_preview');
  return steps;
}

export function resolveTerrainFromIntent(
  intent: RunIntent | null,
  terrain: TerrainFocus | null,
): TerrainFocus | null {
  if (intent === 'race_road') return 'route';
  if (intent === 'race_trail') return 'trail';
  return terrain;
}

export function goalTitleForName(firstName: string): string {
  const name = firstName.trim() || 'athlète';
  return `Salut ${name},\nquel est ton objectif ?`;
}

export function defaultTrainingDaysForSessions(n: WeeklySessionsTarget): number[] {
  const presets: Record<WeeklySessionsTarget, number[]> = {
    3: [2, 4, 6],
    4: [1, 3, 5, 6],
    5: [1, 2, 4, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return presets[n];
}

export function isCampusStep(id: string): id is CampusIntakeStepId {
  return (
    id === 'relay' ||
    id === 'identity' ||
    id === 'run_goal' ||
    id === 'terrain' ||
    id === 'training_type' ||
    id === 'experience' ||
    id === 'injury' ||
    id === 'usual_volume' ||
    id === 'weekly_rhythm' ||
    id === 'reference_time' ||
    id === 'plan_preview' ||
    id === 'program_pick' ||
    id === 'program_weeks'
  );
}

export function campusStepTitle(
  id: CampusIntakeStepId,
  firstName: string,
): string {
  switch (id) {
    case 'relay':
      return RELAY_COPY.headline;
    case 'identity':
      return IDENTITY_COPY.title;
    case 'run_goal':
      return goalTitleForName(firstName);
    case 'terrain':
      return TERRAIN_COPY.title;
    case 'training_type':
      return TRAINING_TYPE_COPY.title;
    case 'experience':
      return EXPERIENCE_COPY.title;
    case 'injury':
      return INJURY_COPY.title;
    case 'usual_volume':
      return VOLUME_COPY.title;
    case 'weekly_rhythm':
      return RHYTHM_COPY.title;
    case 'reference_time':
      return REFERENCE_COPY.title;
    case 'plan_preview':
      return 'Tes allures';
    case 'program_pick':
      return 'Quel programme souhaitez-vous suivre ?';
    case 'program_weeks':
      return 'Sur combien de semaines ?';
    default:
      return 'Profil';
  }
}

/** Préfixe commun + étapes sport + (si run) parcours Campus. */
export function buildFullOnboardingSteps(opts: {
  sport: ProgramSportCategory | null;
  includePpg: boolean;
  runIntent: RunIntent | null;
  terrain: TerrainFocus | null;
  hasUsualVolume: boolean;
}): string[] {
  const head = ['relay', 'identity', 'sport'];
  if (!opts.sport) return head;

  if (opts.sport === 'run') {
    if (!opts.runIntent) {
      return [...head, 'run_goal'];
    }
    const campus = buildCampusRunSteps({
      intent: opts.runIntent,
      terrain: opts.terrain,
    });
    const tail: string[] = ['days_with_long'];
    if (!opts.hasUsualVolume) tail.push('weekly_volume');
    tail.push('references', 'devices', 'program_pick', 'program_weeks');
    return [...head, ...campus, ...tail];
  }

  const sportSteps = buildOnboardingSteps(opts.sport, opts.includePpg).filter(
    (s) => s !== 'sport',
  );
  return [...head, ...sportSteps, 'program_pick', 'program_weeks'];
}
