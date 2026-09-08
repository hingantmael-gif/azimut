import type { ImageSourcePropType } from 'react-native';
import type { ProgramSportCategory, TrainingProgramTemplate } from '../../constants/programs';
import { getProgramsForSport } from '../../constants/programs';
import {
  SWIM_VENUE_IMAGES,
  imageForProgram,
} from '../../constants/sportVisuals';
import type { GoalType } from '../../types/domain';

export type OnboardingStepId =
  | 'sport'
  | 'level'
  | 'goal'
  | 'equipment'
  | 'strength_goal'
  | 'days'
  | 'days_with_long'
  | 'weekly_volume'
  | 'swim_volume'
  | 'ppg'
  | 'references'
  | 'devices';

/** Carte objectif (même pattern que la course). */
export type SportGoalCard = {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  goal: GoalType;
  /** Ordre / filtre du catalogue à `program_pick`. */
  preferProgramIds?: string[];
};

export const GOAL_OPTIONS: Record<ProgramSportCategory, ReadonlyArray<SportGoalCard>> = {
  /** Non utilisé : parcours Campus `run_goal`. */
  run: [
    {
      id: 'road',
      title: 'Course sur route',
      subtitle: '5 km → marathon',
      image: imageForProgram('run', 'prog-10k'),
      goal: '10k',
      preferProgramIds: ['prog-5k', 'prog-10k', 'prog-semi', 'prog-marathon', 'prog-vma'],
    },
  ],
  bike: [
    {
      id: 'start',
      title: 'Se mettre au vélo',
      subtitle: 'Bases, endurance & régularité',
      image: imageForProgram('bike', 'prog-bike-40'),
      goal: 'forme',
      preferProgramIds: ['prog-bike-40', 'prog-bike-80'],
    },
    {
      id: 'cyclo',
      title: 'Cyclosportive',
      subtitle: '80 à 120 km · medio / gran fondo',
      image: imageForProgram('bike', 'prog-bike-80'),
      goal: 'forme',
      preferProgramIds: ['prog-bike-80', 'prog-bike-120', 'prog-bike-fondo'],
    },
    {
      id: 'long',
      title: 'Longue distance',
      subtitle: '160–200 km · century & brevets',
      image: imageForProgram('bike', 'prog-bike-200'),
      goal: 'semi',
      preferProgramIds: ['prog-bike-fondo', 'prog-bike-200', 'prog-bike-120'],
    },
    {
      id: 'power',
      title: 'Puissance & côtes',
      subtitle: 'Critérium, relances, dénivelé',
      image: imageForProgram('bike', 'prog-bike-crit'),
      goal: 'vma',
      preferProgramIds: ['prog-bike-crit', 'prog-bike-80', 'prog-bike-120'],
    },
    {
      id: 'tri',
      title: 'Prépa triathlon',
      subtitle: 'Volume vélo pour le multi-sport',
      image: imageForProgram('bike', 'prog-bike-120'),
      goal: 'triathlon_sprint',
      preferProgramIds: ['prog-bike-80', 'prog-bike-120', 'prog-bike-fondo'],
    },
  ],
  swim: [
    {
      id: 'start',
      title: 'Se mettre à nager',
      subtitle: 'Technique & aisance en bassin',
      image: imageForProgram('swim', 'prog-swim-50'),
      goal: 'forme',
      preferProgramIds: ['prog-swim-50', 'prog-swim-100', 'prog-swim-200'],
    },
    {
      id: 'pool_speed',
      title: 'Vitesse piscine',
      subtitle: '50 à 200 m · chrono & relances',
      image: SWIM_VENUE_IMAGES.pool,
      goal: 'vma',
      preferProgramIds: ['prog-swim-50', 'prog-swim-100', 'prog-swim-200'],
    },
    {
      id: 'pool_endurance',
      title: 'Demi-fond bassin',
      subtitle: '400 à 1500 m · endurance nage',
      image: imageForProgram('swim', 'prog-swim-1500'),
      goal: 'forme',
      preferProgramIds: ['prog-swim-400', 'prog-swim-800', 'prog-swim-1500'],
    },
    {
      id: 'open_water',
      title: 'Eau libre',
      subtitle: '1 à 5 km · open water',
      image: SWIM_VENUE_IMAGES.open_water,
      goal: 'triathlon_olympique',
      preferProgramIds: [
        'prog-swim-eau-libre-1k',
        'prog-swim-eau-libre',
        'prog-swim-eau-libre-5k',
      ],
    },
    {
      id: 'tri',
      title: 'Prépa triathlon',
      subtitle: 'Nage pour le multi-sport',
      image: imageForProgram('swim', 'prog-swim-1500'),
      goal: 'triathlon_sprint',
      preferProgramIds: [
        'prog-swim-400',
        'prog-swim-800',
        'prog-swim-1500',
        'prog-swim-eau-libre-1k',
      ],
    },
  ],
  triathlon: [
    {
      id: 'first',
      title: 'Première course',
      subtitle: 'Découvrir le triathlon · format XS',
      image: imageForProgram('triathlon', 'prog-tri-super-sprint'),
      goal: 'triathlon_sprint',
      preferProgramIds: ['prog-tri-super-sprint', 'prog-tri-sprint'],
    },
    {
      id: 'sprint',
      title: 'Format Sprint',
      subtitle: '0,75 / 20 / 5 km',
      image: imageForProgram('triathlon', 'prog-tri-sprint'),
      goal: 'triathlon_sprint',
      preferProgramIds: ['prog-tri-sprint', 'prog-tri-super-sprint', 'prog-tri-olympique'],
    },
    {
      id: 'olympic',
      title: 'Format Olympique',
      subtitle: '1,5 / 40 / 10 km',
      image: imageForProgram('triathlon', 'prog-tri-olympique'),
      goal: 'triathlon_olympique',
      preferProgramIds: ['prog-tri-olympique', 'prog-tri-sprint'],
    },
    {
      id: 'progress',
      title: 'Progresser',
      subtitle: 'Enchaînements & régularité',
      image: imageForProgram('triathlon'),
      goal: 'triathlon_olympique',
      preferProgramIds: [
        'prog-tri-sprint',
        'prog-tri-olympique',
        'prog-tri-super-sprint',
      ],
    },
  ],
  ironman: [
    {
      id: '5150',
      title: 'IRONMAN 5150',
      subtitle: 'Format M · 1,5 / 40 / 10 km',
      image: imageForProgram('ironman', 'prog-ironman-5150'),
      goal: 'triathlon_olympique',
      preferProgramIds: ['prog-ironman-5150'],
    },
    {
      id: '70_3_first',
      title: 'Premier 70.3',
      subtitle: 'Half · construction progressive',
      image: imageForProgram('ironman', 'prog-ironman-70-3-debut'),
      goal: 'ironman_70_3',
      preferProgramIds: ['prog-ironman-70-3-debut', 'prog-ironman-70-3'],
    },
    {
      id: '70_3',
      title: 'IRONMAN 70.3',
      subtitle: '1,9 / 90 / 21,1 km',
      image: imageForProgram('ironman', 'prog-ironman-70-3'),
      goal: 'ironman_70_3',
      preferProgramIds: ['prog-ironman-70-3', 'prog-ironman-70-3-debut'],
    },
    {
      id: '140_6_first',
      title: 'Premier 140.6',
      subtitle: 'Full · volume long & affûtage',
      image: imageForProgram('ironman', 'prog-ironman-140-6-debut'),
      goal: 'ironman',
      preferProgramIds: ['prog-ironman-140-6-debut', 'prog-ironman'],
    },
    {
      id: '140_6',
      title: 'IRONMAN 140.6',
      subtitle: '3,8 / 180 / 42,2 km',
      image: imageForProgram('ironman', 'prog-ironman'),
      goal: 'ironman',
      preferProgramIds: [
        'prog-ironman',
        'prog-ironman-performance',
        'prog-ironman-bridge',
      ],
    },
    {
      id: 'bridge',
      title: 'Passer au full',
      subtitle: '70.3 → 140.6',
      image: imageForProgram('ironman', 'prog-ironman-bridge'),
      goal: 'ironman',
      preferProgramIds: ['prog-ironman-bridge', 'prog-ironman-140-6-debut'],
    },
  ],
  strength: [
    {
      id: 'fitness',
      title: 'Me sentir mieux',
      subtitle: 'Tonifier · séances accessibles',
      image: imageForProgram('strength', 'prog-strength-base'),
      goal: 'forme',
      preferProgramIds: ['prog-strength-base'],
    },
    {
      id: 'hypertrophy',
      title: 'Prendre du muscle',
      subtitle: 'Volume · 8 à 12 répétitions',
      image: imageForProgram('strength', 'prog-strength-base'),
      goal: 'forme',
      preferProgramIds: ['prog-strength-base'],
    },
    {
      id: 'power',
      title: 'Devenir plus fort',
      subtitle: 'Charges lourdes · 3 à 6 reps',
      image: imageForProgram('strength', 'prog-strength-tri'),
      goal: 'forme',
      preferProgramIds: ['prog-strength-tri', 'prog-strength-base'],
    },
    {
      id: 'tri',
      title: 'Force pour le sport',
      subtitle: 'Prévention & transfert triathlon',
      image: imageForProgram('strength', 'prog-strength-tri'),
      goal: 'forme',
      preferProgramIds: ['prog-strength-tri', 'prog-strength-base'],
    },
  ],
  other: [
    {
      id: 'duathlon',
      title: 'Duathlon',
      subtitle: 'Course · vélo · course',
      image: imageForProgram('other', 'prog-duathlon-sprint'),
      goal: 'forme',
      preferProgramIds: ['prog-duathlon-sprint', 'prog-biathlon'],
    },
    {
      id: 'biathlon',
      title: 'Biathlon run / bike',
      subtitle: 'Enchaînement course & vélo',
      image: imageForProgram('other', 'prog-biathlon'),
      goal: 'forme',
      preferProgramIds: ['prog-biathlon', 'prog-duathlon-sprint'],
    },
    {
      id: 'progress',
      title: 'Progresser en multi-sport',
      subtitle: 'Régularité & enchaînements',
      image: imageForProgram('other'),
      goal: 'forme',
      preferProgramIds: ['prog-duathlon-sprint', 'prog-biathlon'],
    },
  ],
};

export const DEFAULT_GOAL: Record<ProgramSportCategory, GoalType> = {
  run: '10k',
  bike: 'forme',
  swim: 'forme',
  triathlon: 'triathlon_olympique',
  ironman: 'ironman_70_3',
  strength: 'forme',
  other: 'forme',
};

/** Titre personnalisé — même formulation que la course. */
export function sportGoalTitle(firstName: string): string {
  const name = firstName.trim() || 'athlète';
  return `Salut ${name},\nquel est ton objectif ?`;
}

/** Catalogue ordonné / filtré selon la carte objectif choisie. */
export function getProgramsForSportGoal(
  sport: ProgramSportCategory,
  goalId: string | null | undefined,
): TrainingProgramTemplate[] {
  const all = getProgramsForSport(sport);
  if (!goalId) return all;
  const opt = GOAL_OPTIONS[sport].find((o) => o.id === goalId);
  if (!opt?.preferProgramIds?.length) return all;
  const ordered = opt.preferProgramIds
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is TrainingProgramTemplate => Boolean(p));
  return ordered.length > 0 ? ordered : all;
}

/** Étapes affichées selon la discipline choisie. */
export function buildOnboardingSteps(
  sport: ProgramSportCategory | null,
  includePpg: boolean,
): OnboardingStepId[] {
  if (!sport) return ['sport'];

  switch (sport) {
    case 'strength':
      // Objectif d’abord (comme la course), puis matériel
      return ['sport', 'strength_goal', 'equipment', 'level', 'days'];
    case 'swim':
      return ['sport', 'goal', 'level', 'days', 'swim_volume', 'references'];
    case 'bike':
      return ['sport', 'goal', 'level', 'days', 'weekly_volume', 'references'];
    case 'triathlon':
    case 'ironman': {
      const steps: OnboardingStepId[] = [
        'sport',
        'goal',
        'level',
        'days_with_long',
        'weekly_volume',
        'ppg',
      ];
      if (includePpg) steps.push('equipment');
      steps.push('references');
      return steps;
    }
    default:
      return [
        'sport',
        'goal',
        'level',
        'days_with_long',
        'weekly_volume',
        'references',
      ];
  }
}

export function stepTitle(id: OnboardingStepId, sport: ProgramSportCategory | null): string {
  switch (id) {
    case 'sport':
      return 'Ton sport ?';
    case 'level':
      return 'Niveau';
    case 'goal':
      return 'Objectif';
    case 'equipment':
      return 'Matériel';
    case 'strength_goal':
      return 'Objectif';
    case 'days':
      return 'Jours dispo';
    case 'days_with_long':
      return 'Jours dispo';
    case 'weekly_volume':
      if (sport === 'bike') return 'Volume vélo / semaine';
      return 'Volume / semaine';
    case 'swim_volume':
      return 'Volume nage / semaine';
    case 'ppg':
      return 'Renforcement ?';
    case 'references':
      return 'Repères (optionnel)';
    case 'devices':
      return 'Ta montre (optionnel)';
    default:
      return 'Suite';
  }
}

export function stepCanContinue(
  id: OnboardingStepId,
  opts: {
    sport: ProgramSportCategory | null;
    trainingDays: number[];
    weeklyKm: number;
    weeklySwimM: number;
    strengthEquipment: string[];
    strengthGoal: string | null;
    includePpg: boolean | null;
    sportGoalId?: string | null;
  },
): boolean {
  switch (id) {
    case 'sport':
      return Boolean(opts.sport);
    case 'goal':
      return Boolean(opts.sportGoalId);
    case 'days':
    case 'days_with_long':
      return opts.trainingDays.length >= 2;
    case 'weekly_volume':
      return opts.weeklyKm > 0;
    case 'swim_volume':
      return opts.weeklySwimM > 0;
    case 'equipment':
      return opts.strengthEquipment.length >= 1;
    case 'strength_goal':
      return Boolean(opts.strengthGoal);
    case 'ppg':
      return opts.includePpg !== null;
    default:
      return true;
  }
}
