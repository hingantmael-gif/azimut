import type { ImageSourcePropType } from 'react-native';
import type { ProgramSportCategory } from './programs';

/**
 * Visuels sportifs Azimut — athlètes au premier plan.
 * Parité femmes / hommes (~50/50) et mix dans chaque discipline
 * (course, vélo, natation, triathlon, muscu…), pas un sport « réservé » à un genre.
 */
export const SPORT_HERO_IMAGES: Record<ProgramSportCategory, ImageSourcePropType> = {
  run: require('../../assets/sports/sport-run.png'),
  bike: require('../../assets/sports/sport-bike.png'),
  swim: require('../../assets/sports/sport-swim.png'),
  triathlon: require('../../assets/sports/sport-triathlon.png'),
  strength: require('../../assets/sports/sport-strength.png'),
  ironman: require('../../assets/sports/sport-ironman.png'),
  other: require('../../assets/sports/sport-duathlon.png'),
};

/** Natation : choix d’environnement */
export const SWIM_VENUE_IMAGES = {
  pool: require('../../assets/sports/sport-swim-pool.png'),
  open_water: require('../../assets/sports/sport-swim-open.png'),
} as const;

/**
 * Bandeaux pour écrans « vides » (prédiction, progrès, nutrition…).
 * Mix femmes / hommes selon la discipline.
 */
export const ATMOSPHERE_IMAGES = {
  run: require('../../assets/sports/atmosphere-run.png'),
  bike: require('../../assets/sports/atmosphere-bike.png'),
  swim: require('../../assets/sports/atmosphere-swim.png'),
  triathlon: require('../../assets/sports/sport-triathlon.png'),
} as const;

export type AtmosphereKind = keyof typeof ATMOSPHERE_IMAGES;

/** Miniatures / fonds programmes — une image distincte par programme. */
const PROGRAM_IMAGES: Record<string, ImageSourcePropType> = {
  'prog-5k': require('../../assets/sports/prog-run-5k.png'),
  'prog-10k': require('../../assets/sports/prog-run-10k.png'),
  'prog-semi': require('../../assets/sports/prog-run-semi.png'),
  'prog-marathon': require('../../assets/sports/prog-run-marathon.png'),
  'prog-trail-50': require('../../assets/sports/prog-run-trail.png'),
  'prog-vma': require('../../assets/sports/prog-run-vma.png'),
  'prog-bike-40': require('../../assets/sports/prog-bike-40.png'),
  'prog-bike-80': require('../../assets/sports/prog-bike-80.png'),
  'prog-bike-120': require('../../assets/sports/prog-bike-120.png'),
  'prog-bike-fondo': require('../../assets/sports/prog-bike-fondo.png'),
  'prog-bike-200': require('../../assets/sports/prog-bike-200.png'),
  'prog-bike-crit': require('../../assets/sports/prog-bike-crit.png'),
  'prog-swim-50': require('../../assets/sports/prog-swim-50.png'),
  'prog-swim-100': require('../../assets/sports/sport-swim-pool.png'),
  'prog-swim-200': require('../../assets/sports/prog-swim-200.png'),
  'prog-swim-400': require('../../assets/sports/prog-swim-400.png'),
  'prog-swim-800': require('../../assets/sports/prog-swim-800.png'),
  'prog-swim-1500': require('../../assets/sports/prog-swim-1500.png'),
  'prog-swim-eau-libre-1k': require('../../assets/sports/prog-swim-eau-libre-1k.png'),
  'prog-swim-eau-libre': require('../../assets/sports/prog-swim-eau-libre-2k.png'),
  'prog-swim-eau-libre-5k': require('../../assets/sports/prog-swim-eau-libre-5k.png'),
  'prog-tri-super-sprint': require('../../assets/sports/prog-tri-super-sprint.png'),
  'prog-tri-sprint': require('../../assets/sports/prog-tri-sprint.png'),
  'prog-tri-olympique': require('../../assets/sports/prog-tri-olympique.png'),
  'prog-ironman-5150': require('../../assets/sports/prog-ironman-5150.png'),
  'prog-ironman-70-3': require('../../assets/sports/prog-ironman-70-3.png'),
  'prog-ironman-70-3-debut': require('../../assets/sports/prog-ironman-70-3-debut.png'),
  'prog-ironman': require('../../assets/sports/prog-ironman.png'),
  'prog-ironman-140-6-debut': require('../../assets/sports/prog-ironman-140-6-debut.png'),
  'prog-ironman-bridge': require('../../assets/sports/prog-ironman-bridge.png'),
  'prog-ironman-performance': require('../../assets/sports/prog-ironman-performance.png'),
  'prog-strength-base': require('../../assets/sports/prog-strength-base.png'),
  'prog-strength-tri': require('../../assets/sports/prog-strength-tri.png'),
  'prog-biathlon': require('../../assets/sports/prog-biathlon.png'),
  'prog-duathlon-sprint': require('../../assets/sports/sport-duathlon.png'),
};

/**
 * Point focal pour le crop `cover` (bannières larges).
 * Valeurs CSS object-position — visage / athlète au centre du cadre.
 */
export const PROGRAM_IMAGE_FOCUS: Record<string, string> = {
  'prog-5k': '50% 38%',
  /** Visage + queueue bien visibles */
  'prog-semi': '45% 35%',
};

export function programImageFocus(catalogId?: string | null): string {
  if (catalogId && PROGRAM_IMAGE_FOCUS[catalogId]) return PROGRAM_IMAGE_FOCUS[catalogId]!;
  return '50% 40%';
}

/** Fond dédié « distance sur mesure » (différent du héros discipline). */
export const CUSTOM_DISTANCE_IMAGES: Partial<
  Record<ProgramSportCategory, ImageSourcePropType>
> = {
  swim: require('../../assets/sports/prog-swim-custom.png'),
  run: require('../../assets/sports/prog-run-trail.png'),
  bike: require('../../assets/sports/prog-bike-fondo.png'),
  triathlon: require('../../assets/sports/sport-triathlon.png'),
  ironman: require('../../assets/sports/sport-ironman.png'),
  strength: require('../../assets/sports/prog-strength-base.png'),
  other: require('../../assets/sports/sport-duathlon.png'),
};

export function imageForProgram(
  sportCategory: ProgramSportCategory,
  catalogId?: string,
): ImageSourcePropType {
  if (catalogId && PROGRAM_IMAGES[catalogId]) {
    return PROGRAM_IMAGES[catalogId]!;
  }
  return SPORT_HERO_IMAGES[sportCategory] ?? SPORT_HERO_IMAGES.run;
}

export function atmosphereImage(kind: AtmosphereKind): ImageSourcePropType {
  return ATMOSPHERE_IMAGES[kind];
}

/** Focus carte — léger zoom uniquement, image nette (pas de flou). */
export function sportImageFocus(
  _sportCategory: ProgramSportCategory,
  _catalogId?: string,
): 'athlete' | 'upper' | 'center' {
  return 'center';
}

/** Style ImageBackground — net, sans crop agressif qui grisait l’image. */
export function sportCoverImageStyle(
  _focus: 'athlete' | 'upper' | 'center' = 'center',
): object {
  return {};
}

/** Exemple de distance sur mesure réaliste par discipline. */
export function customDistanceExample(sport: ProgramSportCategory | null): string {
  switch (sport) {
    case 'swim':
      return 'Ex. 0,8 km (800 m) ou 3 km — saisie manuelle puis validation';
    case 'bike':
      return 'Ex. 47 km — saisie manuelle puis validation';
    case 'run':
      return 'Ex. 17 km — saisie manuelle puis validation';
    case 'triathlon':
      return 'Ex. 25 km (équivalent course) — saisie manuelle puis validation';
    case 'ironman':
      return 'Ex. 90 km (portion vélo) — saisie manuelle puis validation';
    case 'strength':
      return 'Ex. volume en séances — saisie manuelle puis validation';
    case 'other':
      return 'Ex. 10 km course + 40 km vélo — saisie manuelle puis validation';
    default:
      return 'Ex. 17 km — saisie manuelle puis validation';
  }
}

export function customDistancePlaceholder(sport: ProgramSportCategory | null): string {
  switch (sport) {
    case 'swim':
      return 'Distance cible (km) — ex. 0,8 ou 3';
    case 'bike':
      return 'Distance cible (km) — ex. 47';
    case 'run':
      return 'Distance cible (km) — ex. 17';
    case 'triathlon':
      return 'Distance cible (km) — ex. 25';
    case 'ironman':
      return 'Distance cible (km) — ex. 90';
    case 'other':
      return 'Distance cible (km) — ex. 20';
    default:
      return 'Distance cible (km)';
  }
}
