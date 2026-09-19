/**
 * Noyau partagé de prédiction de performance.
 *
 * - Course : VMA glissante / Critical Speed (`slidingVma`)
 * - Vélo : Critical Power / W' (`criticalPower`)
 *
 * Les prédicteurs sport-spécifiques (`bikePrediction`, `swimPrediction`,
 * `raceTimePrediction`, `sessionPrediction`) s’appuient sur ce noyau ou sur
 * des modèles voisins ; importer depuis ici pour les helpers CP / VMA partagés.
 */

export {
  estimateCriticalPower,
  estimateCriticalPowerFromActivities,
  buildCurveFromActivities,
  inferRiderProfile,
  canTrustCriticalPower,
  getLastCurveBuildMeta,
  type PowerDurationCurve,
  type CriticalPowerEstimate,
  type RiderProfileKind,
} from './criticalPower';

export {
  estimateSlidingVmaKmh,
  dayAdjustedPaceZones,
  personalizedZonesBadge,
} from './slidingVma';
