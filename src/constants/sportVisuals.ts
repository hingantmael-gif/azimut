import { Platform, type ImageSourcePropType, type ImageStyle } from 'react-native';
import type { ProgramSportCategory } from './programs';

/** Crop `cover` centré : même quantité rognée à gauche/droite et haut/bas. */
export const COVER_CROP_CENTER = '50% 50%';

/**
 * Visuels sportifs Mova — athlètes au premier plan.
 * Parité femmes / hommes (~50/50) et mix dans chaque discipline
 * (course, vélo, natation, triathlon, muscu…), pas un sport « réservé » à un genre.
 */
export const SPORT_HERO_IMAGES: Record<ProgramSportCategory, ImageSourcePropType> = {
  run: require('../../assets/sports/sport-run.jpg'),
  bike: require('../../assets/sports/sport-bike.jpg'),
  swim: require('../../assets/sports/sport-swim.jpg'),
  triathlon: require('../../assets/sports/sport-triathlon.jpg'),
  strength: require('../../assets/sports/sport-strength.jpg'),
  ironman: require('../../assets/sports/sport-ironman.jpg'),
  other: require('../../assets/sports/sport-calisthenics.jpg'),
};

/** Natation : choix d’environnement */
export const SWIM_VENUE_IMAGES = {
  pool: require('../../assets/sports/sport-swim-pool.jpg'),
  open_water: require('../../assets/sports/sport-swim-open.jpg'),
} as const;

/**
 * Bandeaux pour écrans « vides » (prédiction, progrès, nutrition…).
 * Mix femmes / hommes selon la discipline.
 */
export const ATMOSPHERE_IMAGES = {
  run: require('../../assets/sports/atmosphere-run.jpg'),
  bike: require('../../assets/sports/atmosphere-bike.jpg'),
  swim: require('../../assets/sports/atmosphere-swim.jpg'),
  triathlon: require('../../assets/sports/sport-triathlon.jpg'),
} as const;

export type AtmosphereKind = keyof typeof ATMOSPHERE_IMAGES;

/** Miniatures / fonds programmes — une image distincte par programme. */
const PROGRAM_IMAGES: Record<string, ImageSourcePropType> = {
  'prog-5k': require('../../assets/sports/prog-run-5k.jpg'),
  'prog-10k': require('../../assets/sports/prog-run-10k.jpg'),
  'prog-semi': require('../../assets/sports/prog-run-semi.jpg'),
  'prog-marathon': require('../../assets/sports/prog-run-marathon.jpg'),
  'prog-trail-50': require('../../assets/sports/prog-run-trail.jpg'),
  'prog-vma': require('../../assets/sports/prog-run-vma.jpg'),
  'prog-bike-40': require('../../assets/sports/prog-bike-40.jpg'),
  'prog-bike-80': require('../../assets/sports/prog-bike-80.jpg'),
  'prog-bike-120': require('../../assets/sports/prog-bike-120.jpg'),
  'prog-bike-fondo': require('../../assets/sports/prog-bike-fondo.jpg'),
  'prog-bike-200': require('../../assets/sports/prog-bike-200.jpg'),
  'prog-bike-crit': require('../../assets/sports/prog-bike-crit.jpg'),
  'prog-swim-50': require('../../assets/sports/prog-swim-50.jpg'),
  'prog-swim-100': require('../../assets/sports/sport-swim-pool.jpg'),
  'prog-swim-200': require('../../assets/sports/prog-swim-200.jpg'),
  'prog-swim-400': require('../../assets/sports/prog-swim-400.jpg'),
  'prog-swim-800': require('../../assets/sports/prog-swim-800.jpg'),
  'prog-swim-1500': require('../../assets/sports/prog-swim-1500.jpg'),
  'prog-swim-eau-libre-1k': require('../../assets/sports/prog-swim-eau-libre-1k.jpg'),
  'prog-swim-eau-libre': require('../../assets/sports/prog-swim-eau-libre-2k.jpg'),
  'prog-swim-eau-libre-5k': require('../../assets/sports/prog-swim-eau-libre-5k.jpg'),
  'prog-tri-super-sprint': require('../../assets/sports/prog-tri-super-sprint.jpg'),
  'prog-tri-sprint': require('../../assets/sports/prog-tri-sprint.jpg'),
  'prog-tri-olympique': require('../../assets/sports/prog-tri-olympique.jpg'),
  'prog-ironman-5150': require('../../assets/sports/prog-ironman-5150.jpg'),
  'prog-ironman-70-3': require('../../assets/sports/prog-ironman-70-3.jpg'),
  'prog-ironman-70-3-debut': require('../../assets/sports/prog-ironman-70-3-debut.jpg'),
  'prog-ironman': require('../../assets/sports/prog-ironman.jpg'),
  'prog-ironman-140-6-debut': require('../../assets/sports/prog-ironman-140-6-debut.jpg'),
  'prog-ironman-bridge': require('../../assets/sports/prog-ironman-bridge.jpg'),
  'prog-ironman-performance': require('../../assets/sports/prog-ironman-performance.jpg'),
  'prog-strength-base': require('../../assets/sports/prog-strength-base.jpg'),
  'prog-strength-tri': require('../../assets/sports/prog-strength-tri.jpg'),
  'prog-calisthenics-base': require('../../assets/sports/prog-calisthenics-base.jpg'),
  'prog-calisthenics-strength': require('../../assets/sports/prog-calisthenics-strength.jpg'),
  'prog-calisthenics-endurance': require('../../assets/sports/prog-calisthenics-endurance.jpg'),
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
  swim: require('../../assets/sports/prog-swim-custom.jpg'),
  run: require('../../assets/sports/prog-run-trail.jpg'),
  bike: require('../../assets/sports/prog-bike-fondo.jpg'),
  triathlon: require('../../assets/sports/sport-triathlon.jpg'),
  ironman: require('../../assets/sports/sport-ironman.jpg'),
  strength: require('../../assets/sports/prog-strength-base.jpg'),
  other: require('../../assets/sports/sport-calisthenics.jpg'),
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
  pushup: require('../../assets/sports/calis-pushup.jpg'),
  pike_pushup: require('../../assets/sports/calis-pushup.jpg'),
  pullup: require('../../assets/sports/calis-pullup.jpg'),
  scapular: require('../../assets/sports/calis-pullup.jpg'),
  squat: require('../../assets/sports/calis-squat.jpg'),
  dip: require('../../assets/sports/calis-dip.jpg'),
  plank: require('../../assets/sports/calis-plank.jpg'),
  hollow: require('../../assets/sports/exercises/ex-hollow.jpg'),
  lunge: require('../../assets/sports/calis-lunge.jpg'),
  row: require('../../assets/sports/calis-row.jpg'),
};

/** Visuels player guidé (muscu + callis) — clés GuidedVisualKey */
export const GUIDED_EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {
  warmup: require('../../assets/sports/exercises/ex-warmup.jpg'),
  pushup: require('../../assets/sports/calis-pushup.jpg'),
  pullup: require('../../assets/sports/calis-pullup.jpg'),
  squat: require('../../assets/sports/calis-squat.jpg'),
  lunge: require('../../assets/sports/calis-lunge.jpg'),
  dip: require('../../assets/sports/calis-dip.jpg'),
  plank: require('../../assets/sports/calis-plank.jpg'),
  row: require('../../assets/sports/calis-row.jpg'),
  hollow: require('../../assets/sports/exercises/ex-hollow.jpg'),
  wallsit: require('../../assets/sports/exercises/ex-wallsit.jpg'),
  press: require('../../assets/sports/exercises/ex-db-press.jpg'),
  shoulder: require('../../assets/sports/exercises/ex-shoulder-press.jpg'),
  curl: require('../../assets/sports/exercises/ex-curl.jpg'),
  hinge: require('../../assets/sports/exercises/ex-hinge.jpg'),
  generic: require('../../assets/sports/sport-strength.jpg'),
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
