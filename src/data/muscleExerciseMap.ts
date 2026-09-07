import type { MuscleGroupId } from '../engines/muscleRecovery';
import type { PlannedWorkout } from '../types/domain';

/** Sports détectés pour le moteur musculaire */
export type DetectedSport =
  | 'run'
  | 'trail'
  | 'bike'
  | 'swim'
  | 'strength'
  | 'brick'
  | 'ppg'
  | 'mobility'
  | 'other';

export type SessionIntensityBand = 'recovery' | 'easy' | 'tempo' | 'threshold' | 'vo2' | 'race';

/** Charge relative par muscle selon le type de séance (0–1) */
export type MuscleLoadWeights = Partial<Record<MuscleGroupId, number>>;

export const EXERCISE_MUSCLE_MAP: Record<
  NonNullable<PlannedWorkout['discipline']>,
  MuscleLoadWeights
> = {
  run: {
    quads: 1,
    hamstrings: 0.88,
    calves: 0.82,
    glutes: 0.85,
    hip_flexors: 0.62,
    abs: 0.48,
    erector: 0.55,
    obliques: 0.38,
    traps: 0.22,
  },
  bike: {
    quads: 0.98,
    glutes: 0.9,
    calves: 0.48,
    hamstrings: 0.62,
    erector: 0.58,
    abs: 0.42,
    hip_flexors: 0.5,
    traps: 0.28,
    forearms: 0.25,
  },
  swim: {
    deltoids: 0.95,
    lats: 0.92,
    traps: 0.78,
    chest: 0.72,
    triceps: 0.7,
    biceps: 0.58,
    abs: 0.68,
    erector: 0.55,
    forearms: 0.52,
    obliques: 0.55,
    hip_flexors: 0.35,
    quads: 0.28,
  },
  brick: {
    quads: 0.95,
    hamstrings: 0.82,
    calves: 0.7,
    glutes: 0.8,
    deltoids: 0.4,
    erector: 0.58,
    abs: 0.52,
    hip_flexors: 0.55,
    traps: 0.3,
  },
  strength: {
    chest: 0.92,
    deltoids: 0.88,
    triceps: 0.82,
    biceps: 0.8,
    lats: 0.78,
    traps: 0.72,
    quads: 0.75,
    glutes: 0.78,
    hamstrings: 0.68,
    abs: 0.62,
    erector: 0.6,
    calves: 0.4,
  },
  ppg: {
    abs: 0.9,
    obliques: 0.82,
    erector: 0.75,
    deltoids: 0.65,
    glutes: 0.6,
    quads: 0.55,
    chest: 0.48,
    hip_flexors: 0.5,
  },
  mobility: {
    erector: 0.55,
    hip_flexors: 0.72,
    hamstrings: 0.65,
    calves: 0.42,
    deltoids: 0.38,
    glutes: 0.45,
    traps: 0.35,
  },
  rest: {},
};

/** Profils enrichis par sport détecté (trail, etc.) */
const SPORT_BASE: Record<DetectedSport, MuscleLoadWeights> = {
  run: EXERCISE_MUSCLE_MAP.run,
  trail: {
    ...EXERCISE_MUSCLE_MAP.run,
    quads: 1,
    calves: 0.95,
    glutes: 0.95,
    hamstrings: 0.92,
    erector: 0.72,
    hip_flexors: 0.7,
    traps: 0.4,
  },
  bike: EXERCISE_MUSCLE_MAP.bike,
  swim: EXERCISE_MUSCLE_MAP.swim,
  strength: EXERCISE_MUSCLE_MAP.strength,
  brick: EXERCISE_MUSCLE_MAP.brick,
  ppg: EXERCISE_MUSCLE_MAP.ppg,
  mobility: EXERCISE_MUSCLE_MAP.mobility,
  other: EXERCISE_MUSCLE_MAP.run,
};

/** Modulateurs d'intensité : threshold/VO2 recrute plus ischio/mollets/haut du corps */
function intensityModulation(
  band: SessionIntensityBand,
): Partial<Record<MuscleGroupId, number>> {
  switch (band) {
    case 'recovery':
      return { quads: 0.85, hamstrings: 0.8, calves: 0.75, glutes: 0.8 };
    case 'easy':
      return {};
    case 'tempo':
      return { hamstrings: 1.08, glutes: 1.05, abs: 1.1, erector: 1.05 };
    case 'threshold':
      return {
        hamstrings: 1.15,
        calves: 1.12,
        glutes: 1.1,
        hip_flexors: 1.1,
        abs: 1.12,
      };
    case 'vo2':
    case 'race':
      return {
        hamstrings: 1.22,
        calves: 1.2,
        quads: 1.12,
        glutes: 1.15,
        hip_flexors: 1.15,
        abs: 1.18,
        traps: 1.1,
      };
    default:
      return {};
  }
}

export function muscleWeightsForSession(
  sport: DetectedSport,
  band: SessionIntensityBand,
): MuscleLoadWeights {
  const base = { ...SPORT_BASE[sport] };
  const mod = intensityModulation(band);
  for (const [id, m] of Object.entries(mod)) {
    const key = id as MuscleGroupId;
    if (base[key] != null && m != null) {
      base[key] = Math.min(1, (base[key] ?? 0) * m);
    }
  }
  return base;
}

export function musclesForDiscipline(
  discipline: PlannedWorkout['discipline'],
): Array<{ id: MuscleGroupId; weight: number }> {
  const map = EXERCISE_MUSCLE_MAP[discipline] ?? EXERCISE_MUSCLE_MAP.run;
  return Object.entries(map)
    .filter(([, w]) => (w ?? 0) > 0)
    .map(([id, weight]) => ({ id: id as MuscleGroupId, weight: weight ?? 0 }));
}
