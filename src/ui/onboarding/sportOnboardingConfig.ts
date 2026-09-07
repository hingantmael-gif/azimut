import type { ProgramSportCategory } from '../../constants/programs';
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

export const GOAL_OPTIONS: Record<
  ProgramSportCategory,
  ReadonlyArray<{ value: GoalType; label: string }>
> = {
  run: [
    { value: '5k', label: '5 km' },
    { value: '10k', label: '10 km' },
    { value: 'semi', label: 'Semi' },
    { value: 'marathon', label: 'Marathon' },
    { value: 'trail', label: 'Trail' },
    { value: 'vma', label: 'VMA / vitesse' },
    { value: 'forme', label: 'Forme / bien-être' },
  ],
  bike: [
    { value: 'forme', label: 'Forme / endurance' },
    { value: 'triathlon_sprint', label: 'Prépa triathlon' },
    { value: 'semi', label: 'Cyclosportive / longue distance' },
  ],
  swim: [
    { value: 'forme', label: 'Forme / technique' },
    { value: 'triathlon_sprint', label: 'Prépa triathlon' },
    { value: 'triathlon_olympique', label: 'Eau libre / distance' },
  ],
  triathlon: [
    { value: 'triathlon_sprint', label: 'Sprint' },
    { value: 'triathlon_olympique', label: 'Olympique' },
    { value: 'ironman_70_3', label: 'Half Ironman (70.3)' },
  ],
  ironman: [
    { value: 'ironman_70_3', label: 'Ironman 70.3' },
    { value: 'ironman', label: 'Ironman (140.6)' },
  ],
  strength: [{ value: 'forme', label: 'Renforcement / musculation' }],
  other: [
    { value: 'forme', label: 'Forme générale' },
    { value: '5k', label: 'Course à pied' },
    { value: 'triathlon_sprint', label: 'Triathlon / multi-sport' },
    { value: 'trail', label: 'Trail / outdoor' },
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

/** Étapes affichées selon la discipline choisie. */
export function buildOnboardingSteps(
  sport: ProgramSportCategory | null,
  includePpg: boolean,
): OnboardingStepId[] {
  if (!sport) return ['sport'];

  switch (sport) {
    case 'strength':
      return ['sport', 'equipment', 'strength_goal', 'level', 'days', 'devices'];
    case 'swim':
      return ['sport', 'level', 'goal', 'days', 'swim_volume', 'references', 'devices'];
    case 'bike':
      return ['sport', 'level', 'goal', 'days', 'weekly_volume', 'references', 'devices'];
    case 'triathlon':
    case 'ironman': {
      const steps: OnboardingStepId[] = [
        'sport',
        'level',
        'goal',
        'days_with_long',
        'weekly_volume',
        'ppg',
      ];
      if (includePpg) steps.push('equipment');
      steps.push('references', 'devices');
      return steps;
    }
    default:
      return [
        'sport',
        'level',
        'goal',
        'days_with_long',
        'weekly_volume',
        'references',
        'devices',
      ];
  }
}

export function stepTitle(id: OnboardingStepId, sport: ProgramSportCategory | null): string {
  switch (id) {
    case 'sport':
      return 'Quel sport pratiquez-vous ?';
    case 'level':
      return 'Votre niveau';
    case 'goal':
      return 'Votre objectif principal';
    case 'equipment':
      return 'Votre matériel';
    case 'strength_goal':
      return 'Quel est ton objectif principal ?';
    case 'days':
      return 'Vos disponibilités';
    case 'days_with_long':
      return 'Vos disponibilités';
    case 'weekly_volume':
      if (sport === 'bike') return 'Votre volume vélo hebdomadaire';
      return 'Votre volume hebdomadaire';
    case 'swim_volume':
      return 'Votre volume natation hebdomadaire';
    case 'ppg':
      return 'Renforcement musculaire';
    case 'references':
      return 'Vos repères (optionnel)';
    case 'devices':
      return 'Connexion du matériel';
    default:
      return 'Configuration';
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
  },
): boolean {
  switch (id) {
    case 'sport':
      return Boolean(opts.sport);
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
