/**
 * Point d’entrée unifié — moteur sommeil Azimut.
 *
 * Réexporte les APIs publiques de :
 * - `sleepAdaptation` — score, bande, décision coach, application sur séance
 * - `sleepCalendar` — nuits, grille mensuelle, streak
 * - `sleepProgramRamp` — rampe de démarrage programme selon sommeil récent
 *
 * Les anciens imports directs (`./sleepAdaptation`, etc.) restent valides.
 */

export {
  clampSleepScore,
  normalizeSleepScore,
  sleepBandFromScore,
  sleepScoreLabel,
  sleepBrandCompareHint,
  buildManualSleepNight,
  coachingSleepScore,
  decideSleepAdaptiveAction,
  applySleepAdaptiveToWorkout,
  findWorkoutToAdaptForSleep,
  type SleepBand,
} from './sleepAdaptation';

export {
  MIN_NIGHTS_FOR_MONTHLY_AVG,
  upsertSleepNight,
  removeSleepNight,
  sleepNightsInMonth,
  monthlySleepAverage,
  previousMonthsWithSleep,
  scoreForDate,
  nightForDate,
  toLocalDateIso,
  addDaysIso,
  earliestSleepDateIso,
  isSleepDateAllowed,
  sleepNightsLogged,
  computeSleepStreak,
  buildMonthGrid,
  simulateWatchSleepNight,
  type MonthlySleepStats,
} from './sleepCalendar';

export {
  averageSleepScoreLastDays,
  applySleepStartupRamp,
  previewSleepStartupRamp,
  type SleepRecentAverage,
  type SleepStartupRampResult,
} from './sleepProgramRamp';
