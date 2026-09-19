import { Platform, type ImageSourcePropType, type ImageStyle } from 'react-native';
import type { ProgramSportCategory } from './programs';

/** Crop `cover` centré : même quantité rognée à gauche/droite et haut/bas. */
export const COVER_CROP_CENTER = '50% 50%';

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
  other: require('../../assets/sports/sport-calisthenics.png'),
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
  'prog-calisthenics-base': require('../../assets/sports/prog-calisthenics-base.png'),
  'prog-calisthenics-strength': require('../../assets/sports/prog-calisthenics-strength.png'),
  'prog-calisthenics-endurance': require('../../assets/sports/prog-calisthenics-endurance.png'),
};

/**
 * Point focal pour le crop `cover` (bannières).
 * Par défaut : centre exact — sur téléphone l’image se réduit en rognant
 * également à gauche/droite et haut/bas (pas d’étirement).
 */
export const PROGRAM_IMAGE_FOCUS: Record<string, string> = {
  'prog-5k': COVER_CROP_CENTER,
  'prog-semi': COVER_CROP_CENTER,
};

export function programImageFocus(catalogId?: string | null): string {
  if (catalogId && PROGRAM_IMAGE_FOCUS[catalogId]) return PROGRAM_IMAGE_FOCUS[catalogId]!;
  return COVER_CROP_CENTER;
}

/**
 * Style image pour `Image` / `ImageBackground` : cover + cadrage centré.
 * Sur web, `objectFit` évite la déformation — ne force PAS width/height
 * (sinon les thumbs 56×56 s’étirent et masquent le texte).
 */
export function coverCropImageStyle(objectPosition: string = COVER_CROP_CENTER): ImageStyle {
  if (Platform.OS !== 'web') {
    // Native : resizeMode="cover" centre déjà le sujet
    return {};
  }
  return {
    objectFit: 'cover',
    objectPosition,
  } as ImageStyle;
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
  other: require('../../assets/sports/sport-calisthenics.png'),
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

/** Démos callisthénie (comment faire l’exercice). */
export const CALISTHENICS_DEMO_IMAGES: Record<string, ImageSourcePropType> = {
  pushup: require('../../assets/sports/calis-pushup.png'),
  pike_pushup: require('../../assets/sports/calis-pushup.png'),
  pullup: require('../../assets/sports/calis-pullup.png'),
  scapular: require('../../assets/sports/calis-pullup.png'),
  squat: require('../../assets/sports/calis-squat.png'),
  dip: require('../../assets/sports/calis-dip.png'),
  plank: require('../../assets/sports/calis-plank.png'),
  hollow: require('../../assets/sports/exercises/ex-hollow.png'),
  lunge: require('../../assets/sports/calis-lunge.png'),
  row: require('../../assets/sports/calis-row.png'),
};

/** Visuels player guidé (muscu + callis) — clés GuidedVisualKey */
export const GUIDED_EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {
  warmup: require('../../assets/sports/exercises/ex-warmup.png'),
  pushup: require('../../assets/sports/calis-pushup.png'),
  pullup: require('../../assets/sports/calis-pullup.png'),
  squat: require('../../assets/sports/calis-squat.png'),
  lunge: require('../../assets/sports/calis-lunge.png'),
  dip: require('../../assets/sports/calis-dip.png'),
  plank: require('../../assets/sports/calis-plank.png'),
  row: require('../../assets/sports/calis-row.png'),
  hollow: require('../../assets/sports/exercises/ex-hollow.png'),
  wallsit: require('../../assets/sports/exercises/ex-wallsit.png'),
  press: require('../../assets/sports/exercises/ex-db-press.png'),
  shoulder: require('../../assets/sports/exercises/ex-shoulder-press.png'),
  curl: require('../../assets/sports/exercises/ex-curl.png'),
  hinge: require('../../assets/sports/exercises/ex-hinge.png'),
  generic: require('../../assets/sports/sport-strength.png'),
};

export function guidedExerciseImage(key?: string | null): ImageSourcePropType {
  if (!key) return GUIDED_EXERCISE_IMAGES.generic;
  return GUIDED_EXERCISE_IMAGES[key] ?? GUIDED_EXERCISE_IMAGES.generic;
}

export function calisthenicsDemoImage(exerciseId?: string | null): ImageSourcePropType | undefined {
  if (!exerciseId) return undefined;
  return CALISTHENICS_DEMO_IMAGES[exerciseId];
}

/** Focus carte — toujours centré pour un crop symétrique. */
export function sportImageFocus(
  _sportCategory: ProgramSportCategory,
  _catalogId?: string,
): 'athlete' | 'upper' | 'center' {
  return 'center';
}

/** Style ImageBackground — cover centré (alias). */
export function sportCoverImageStyle(
  _focus: 'athlete' | 'upper' | 'center' = 'center',
): ImageStyle {
  return coverCropImageStyle(COVER_CROP_CENTER);
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
