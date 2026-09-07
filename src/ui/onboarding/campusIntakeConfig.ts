import type { ImageSourcePropType } from 'react-native';
import type { GoalType, AthleticLevel } from '../../types/domain';
import type { ProgramSportCategory } from '../../constants/programs';
import { BRAND } from '../../constants/brand';
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
  body: "Pas besoin d'attendre le jour J pour avancer. Azimut construit un plan clair, adapté à ton endurance et à ton rythme — pour progresser sans perdre le plaisir.",
  cta: 'Démarrer',
} as const;

export const IDENTITY_COPY = {
  title: `Bienvenue sur ${BRAND.name}.\nPrésente-toi en quelques mots.`,
  subtitle: 'Ces infos servent uniquement à personnaliser ton espace et tes plans.',
  genderWoman: 'Femme',
  genderMan: 'Homme',
  firstName: 'PRÉNOM',
  lastName: 'NOM DE FAMILLE',
  birthDate: 'DATE DE NAISSANCE',
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
    title: 'Viser une course sur route',
    subtitle: 'Un plan calé sur ta date et ta distance cible',
    image: ONBOARDING_IMAGES.goalRoad,
    goal: '10k',
  },
  {
    id: 'race_trail',
    title: 'Viser un trail',
    subtitle: 'Du sentier court à la longue distance, selon ton niveau',
    image: ONBOARDING_IMAGES.goalTrail,
    goal: 'trail',
  },
  {
    id: 'start',
    title: 'Se mettre à la course',
    subtitle: 'Des bases solides, sans précipitation',
    image: ONBOARDING_IMAGES.goalStart,
    goal: 'forme',
  },
  {
    id: 'progress',
    title: 'Monter en régime',
    subtitle: 'Gagner en aisance, en vitesse ou simplement en régularité',
    image: ONBOARDING_IMAGES.goalProgress,
    goal: 'forme',
  },
  {
    id: 'return_injury',
    title: 'Revenir après une pause forcée',
    subtitle: 'Une reprise progressive pour retrouver le rythme en sécurité',
    image: ONBOARDING_IMAGES.goalReturn,
    goal: 'forme',
  },
];

export const TERRAIN_COPY = {
  title: 'Où veux-tu surtout t’entraîner ?',
  prompt: 'Plutôt…',
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
  title: 'Quel profil de parcours te correspond ?',
  prompt: 'Je préfère…',
} as const;

export const TRAINING_TYPE_OPTIONS: ReadonlyArray<{
  id: TrainingTerrain;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'hills',
    title: 'Travailler le dénivelé',
    subtitle: 'Côtes et reliefs au cœur de ta prépa',
  },
  {
    id: 'mixed',
    title: 'Mélanger plat et relief',
    subtitle: 'Un peu de tout, comme en conditions réelles',
  },
  {
    id: 'flat',
    title: 'Rester sur le plat',
    subtitle: 'Parcours peu vallonnés, allure stable',
  },
];

export const EXPERIENCE_COPY = {
  title: 'Depuis combien de temps cours-tu ?',
  subtitle:
    'Débutant ou habitué : on calibre la charge pour que tu progresses sans te cramer.',
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
  title: 'As-tu eu une blessure ces 12 derniers mois ?',
  subtitle:
    'On en tient compte pour doser l’intensité et protéger ta reprise.',
  no: 'Non, rien à signaler',
  yes: 'Oui, au moins une fois',
} as const;

export const VOLUME_COPY = {
  title: 'Quel volume cours-tu en moyenne chaque semaine ?',
  subtitle:
    'Choisis la fourchette la plus proche de ton habitude actuelle — c’est ton point de départ.',
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
  title: 'Combien de séances par semaine veux-tu viser ?',
  subtitle:
    'Mise sur un rythme tenable sur la durée — mieux vaut régulier que trop ambitieux.',
  cta: 'Valider mon rythme',
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
  title: 'Indique ton temps de référence',
  duration: 'Durée',
  pace: 'Allure moyenne',
  cta: 'Continuer',
} as const;

export const PLAN_PREVIEW_COPY = {
  title: 'Un plan qui a du sens',
  body: 'Chaque séance a un rôle clair : endurance, qualité ou récup. Tu avances avec un fil conducteur, pas au hasard.',
  easy: 'Allure EF',
  easyDetail: '15 min à 6:25 - 6:55 /km',
  fast: 'Allure Rapide',
  fastDetail: '4 min à 5:20 /km',
  slow: 'Allure Lente',
  slowDetail: '1:30 min de récupération',
  cta: 'Voir mon plan',
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
      return PLAN_PREVIEW_COPY.title;
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
