import { Alert, Platform, Share } from 'react-native';
import type { PlannedWorkout, SportDiscipline, WatchBrandId } from '../types/domain';
import { getWatchEntry } from '../constants/watches';
import { summarizeWorkout } from './workoutPresentation';
import { buildWorkoutShareMessage } from './stravaExport';

/**
 * Sports que Garmin Connect accepte en séance structurée (Training / workouts) :
 * course, vélo, natation, musculation.
 * Pas de brick multi-sport ni repos — export peu fiable / inutile.
 */
export const WATCH_EXPORTABLE_DISCIPLINES: readonly SportDiscipline[] = [
  'run',
  'bike',
  'swim',
  'strength',
];

export function canSendWorkoutToWatch(
  discipline: SportDiscipline | undefined | null,
): boolean {
  if (!discipline) return false;
  return (WATCH_EXPORTABLE_DISCIPLINES as readonly string[]).includes(discipline);
}

/** Libellé court de la montre pour les boutons. */
export function watchBrandShortLabel(brandId?: WatchBrandId | null): string {
  if (!brandId) return 'ma montre';
  switch (brandId) {
    case 'garmin':
      return 'Garmin';
    case 'apple':
      return 'Apple Watch';
    case 'samsung':
      return 'Galaxy Watch';
    case 'google_fitbit':
      return 'Fitbit';
    case 'huawei':
      return 'Huawei Watch';
    default:
      return getWatchEntry(brandId).label;
  }
}

export function watchSendLabel(brandId?: WatchBrandId | null): string {
  if (!brandId) return 'Envoyer à ma montre';
  return `Envoyer à ${watchBrandShortLabel(brandId)}`;
}

export function watchResendLabel(brandId?: WatchBrandId | null): string {
  if (!brandId) return 'Renvoyer à ma montre';
  return `Renvoyer à ${watchBrandShortLabel(brandId)}`;
}

/**
 * Hint sous le bouton — explique le flux Bluetooth / app compagnon
 * (1–2 gestes après l’envoi Azimut).
 */
export function watchExportHint(brandId?: WatchBrandId | null): string {
  if (!brandId) {
    return 'Au premier envoi, Azimut te demande quelle montre tu as — puis exporte le bon fichier.';
  }
  switch (brandId) {
    case 'garmin':
      return 'Export JSON Garmin Training (+ TCX). Si ton compte est lié, Azimut pousse aussi sur Garmin Connect → sync Bluetooth.';
    case 'apple':
      return 'Export JSON WorkoutKit (+ TCX). Ouvre Fitness / Santé sur iPhone — l’Apple Watch récupère le plan.';
    case 'samsung':
      return 'Export TCX Samsung Health (+ JSON). Importe dans Samsung Health puis sync Bluetooth Galaxy Watch.';
    case 'google_fitbit':
      return 'Export TCX Fitbit (+ JSON). Importe dans l’app Fitbit puis sync Pixel Watch / Fitbit.';
    case 'huawei':
      return 'Export TCX Huawei Santé (+ JSON). Importe dans Huawei Santé puis sync ta montre.';
    default:
      return `Ouvre l’app ${getWatchEntry(brandId).subtitle} pour synchroniser ta montre en Bluetooth.`;
  }
}

export function watchExportSuccessMessage(brandId: WatchBrandId): string {
  const name = watchBrandShortLabel(brandId);
  switch (brandId) {
    case 'garmin':
      return 'Séance sur ton calendrier Garmin Connect. Si elle n’apparaît pas tout de suite sur la montre, ouvre Garmin Connect → sync (Bluetooth).';
    case 'apple':
      return `Séance prête pour ${name}. Dans Fitness / Santé, ajoute-la si demandé — la montre se met à jour via Bluetooth.`;
    default:
      return `Séance préparée pour ${name}. L’app compagnon s’occupe de la sync Bluetooth vers ta montre.`;
  }
}

/** Texte structuré de la séance pour partage / apps santé. */
export function buildWatchWorkoutBrief(workout: PlannedWorkout): string {
  const summary = summarizeWorkout(workout);
  const steps = summary.stepLines
    .map((l) => `• ${l.title} — ${l.detail}`)
    .join('\n');
  return [
    `⏱ ${workout.title}`,
    `Date : ${workout.date}`,
    `Durée prévue : ${summary.durationLabel}`,
    summary.distanceLabel ? `Distance : ${summary.distanceLabel}` : null,
    workout.expectedRpe ? `Effort visé : RPE ${workout.expectedRpe}/10` : null,
    '',
    'Déroulé :',
    steps,
    '',
    '— Export Azimut → montre',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function shareWorkoutForWatch(workout: PlannedWorkout): Promise<boolean> {
  try {
    const message = buildWatchWorkoutBrief(workout);
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message }
        : { message, title: workout.title },
    );
    return result.action === Share.sharedAction;
  } catch {
    // Fallback message Strava-style
    try {
      await Share.share({ message: buildWorkoutShareMessage(workout) });
      return true;
    } catch {
      return false;
    }
  }
}

/** Provider d’intégration lié à la marque de montre. */
export function integrationProviderForWatch(
  brandId: WatchBrandId,
): 'garmin' | 'apple_health' | 'health_connect' | null {
  switch (brandId) {
    case 'garmin':
      return 'garmin';
    case 'apple':
      return 'apple_health';
    case 'samsung':
    case 'google_fitbit':
      return 'health_connect';
    default:
      return null;
  }
}

export function watchNeedsGarminApi(brandId?: WatchBrandId | null): boolean {
  return brandId === 'garmin' || brandId == null;
}
