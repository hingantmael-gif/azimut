/**
 * Catalogue des fonctionnalités qui pourront être marquées Pro (couronne).
 * Non branché à l’UI tant que `PREMIUM_UI_ENABLED` est false.
 */
export type ProFeatureId =
  | 'profile_covers_animated'
  | 'garmin_auto_send'
  | 'ladder_shields'
  | 'advanced_analytics'
  | 'multi_program'
  | 'long_term_plan'
  | 'performance_fitness';

export type ProFeatureDef = {
  id: ProFeatureId;
  /** Libellé court pour pastille / tooltip */
  label: string;
  /** Où l’afficher plus tard */
  surface: 'settings' | 'profile' | 'ranked' | 'export' | 'program';
};

export const PRO_FEATURES: ProFeatureDef[] = [
  {
    id: 'profile_covers_animated',
    label: 'Fonds animés',
    surface: 'profile',
  },
  {
    id: 'garmin_auto_send',
    label: 'Envoi Garmin',
    surface: 'export',
  },
  {
    id: 'ladder_shields',
    label: 'Boucliers ladder',
    surface: 'ranked',
  },
  {
    id: 'advanced_analytics',
    label: 'Analyses avancées',
    surface: 'settings',
  },
  {
    id: 'multi_program',
    label: 'Multi-programmes',
    surface: 'program',
  },
  {
    id: 'long_term_plan',
    label: 'Plan long terme',
    surface: 'program',
  },
  {
    id: 'performance_fitness',
    label: 'Forme / Fatigue',
    surface: 'settings',
  },
];

export function getProFeature(id: ProFeatureId): ProFeatureDef | undefined {
  return PRO_FEATURES.find((f) => f.id === id);
}
