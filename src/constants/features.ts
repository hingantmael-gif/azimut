/** Liens fonctionnels CDC — menu profil / progrès */
export const COACHING_FEATURES = [
  { route: '/ranked', label: 'Classement & XP', icon: '🏅' },
  { route: '/recovery', label: 'Récupération & mobilité', icon: '🧘' },
  { route: '/nutrition', label: 'Nutrition & hydratation', icon: '💧' },
  { route: '/race-predictor', label: 'Prédiction temps de course', icon: '⏱' },
  { route: '/multisport', label: 'Multi-sport / triathlon', icon: '🏊' },
  { route: '/coach-vokal', label: 'Coach vocal', icon: '🎙' },
  { route: '/safety', label: 'Sécurité & alertes', icon: '🛡' },
] as const;

export const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const GOAL_LABELS: Record<string, string> = {
  '5k': '5 km',
  '10k': '10 km',
  semi: 'Semi marathon',
  marathon: 'Marathon',
  trail: 'Trail',
  triathlon_sprint: 'Triathlon sprint',
  triathlon_olympique: 'Triathlon olympique',
  ironman_70_3: 'IRONMAN 70.3',
  ironman: 'IRONMAN 140.6',
  forme: 'Forme générale',
  vma: 'VMA',
};
