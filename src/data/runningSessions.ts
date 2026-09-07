/**
 * Référentiel offline — zones & volumes par discipline (moteur coachingEngine).
 * Sources : polarisation 80/20 (Seiler), progressive overload, PPG runners.
 */

export const RUN_PACE_PCT = {
  easy: 70,
  long: 70,
  threshold: 88,
  vma: 100,
} as const;

export const BIKE_FTP_PCT = {
  endurance: 0.7,
  tempo: 0.85,
  vo2: 1.1,
} as const;

/** Volume force runners : 2×/sem base, 1× en pic */
export const STRENGTH_GUIDE = {
  setsDebutant: 2,
  setsConfirme: 3,
  reps: '8–12',
  exercisesPpg: [
    'Squats bulgares',
    'Soulevé de terre jambe tendue',
    'Mollets unipodal',
    'Hip thrust',
    'Gainage latéral',
  ],
} as const;
