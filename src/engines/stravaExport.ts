import { Linking, Platform, Share } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { PlannedWorkout, SportDiscipline } from '../types/domain';
import { summarizeWorkout } from './workoutPresentation';

/** Mapping discipline → sport_type Strava API */
export function stravaSportType(discipline: SportDiscipline): string {
  switch (discipline) {
    case 'run':
      return 'Run';
    case 'bike':
      return 'Ride';
    case 'swim':
      return 'Swim';
    case 'brick':
      return 'Workout';
    case 'strength':
    case 'ppg':
      return 'WeightTraining';
    case 'mobility':
      return 'Yoga';
    default:
      return 'Workout';
  }
}

/** Payload POST https://www.strava.com/api/v3/activities (activity:write) */
export function toStravaCreateActivityPayload(workout: PlannedWorkout) {
  const durationSec = Math.max(60, workout.plannedDurationSec ?? 1800);
  const start = `${workout.date}T08:00:00`;
  const summary = summarizeWorkout(workout);
  const stepsDesc = summary.stepLines
    .map((l) => `• ${l.title} : ${l.detail}`)
    .join('\n');

  return {
    name: workout.title,
    sport_type: stravaSportType(workout.discipline),
    type: stravaSportType(workout.discipline),
    start_date_local: start,
    elapsed_time: durationSec,
    description: [
      `Séance coachée — ${summary.durationLabel}`,
      summary.distanceLabel ? `Distance prévue : ${summary.distanceLabel}` : null,
      workout.expectedRpe ? `Effort visé (RPE) : ${workout.expectedRpe}/10` : null,
      '',
      'Déroulé :',
      stepsDesc,
      '',
      'Export depuis Azimut',
    ]
      .filter(Boolean)
      .join('\n'),
    distance: workout.plannedDistanceM ?? 0,
    trainer: 0,
    commute: 0,
  };
}

/** Texte prêt pour la feuille de partage (Strava / Notes / Messages…) */
export function buildWorkoutShareMessage(workout: PlannedWorkout): string {
  const payload = toStravaCreateActivityPayload(workout);
  const summary = summarizeWorkout(workout);
  return [
    `🏃 ${payload.name}`,
    `Date : ${workout.date}`,
    `Sport : ${payload.sport_type}`,
    `Durée : ${summary.durationLabel}`,
    summary.distanceLabel ? `Distance : ${summary.distanceLabel}` : null,
    '',
    payload.description,
    '',
    '→ Sur Strava : + → Activité manuelle, puis collez ces infos.',
    '→ Ou ouvrez https://www.strava.com/upload/manual',
  ]
    .filter(Boolean)
    .join('\n');
}

/** TCX minimal — compatible upload fichier Strava */
export function toStravaTcx(workout: PlannedWorkout): string {
  const durationSec = Math.max(60, workout.plannedDurationSec ?? 1800);
  const distanceM = workout.plannedDistanceM ?? 0;
  const startIso = `${workout.date}T08:00:00.000Z`;
  const sport =
    workout.discipline === 'bike'
      ? 'Biking'
      : workout.discipline === 'swim'
        ? 'Other'
        : 'Running';

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startIso}</Id>
      <Lap StartTime="${startIso}">
        <TotalTimeSeconds>${durationSec}</TotalTimeSeconds>
        <DistanceMeters>${distanceM}</DistanceMeters>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
      </Lap>
      <Notes>${escapeXml(workout.title)} — export Azimut</Notes>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Partage la séance via la feuille système.
 * Sur mobile, Strava apparaît s'il est installé et accepte le contenu partagé.
 */
export async function shareWorkoutSession(workout: PlannedWorkout): Promise<'shared' | 'dismissed'> {
  const message = buildWorkoutShareMessage(workout);
  const result = await Share.share(
    Platform.OS === 'ios'
      ? { message, url: 'https://www.strava.com/upload/manual' }
      : { message, title: workout.title },
  );
  if (result.action === Share.sharedAction) return 'shared';
  return 'dismissed';
}

/** Ouvre Strava (app) ou la page activité manuelle (web) */
export async function openStravaManualEntry(): Promise<void> {
  const appUrl = 'strava://';
  const webUrl = 'https://www.strava.com/upload/manual';
  try {
    const can = await Linking.canOpenURL(appUrl);
    await Linking.openURL(can ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

/**
 * Ouvre Strava dans le navigateur (pas l’app) pour exporter un GPX/TCX.
 * L’export fichier n’est fiable que sur le site web.
 */
export async function openStravaWebForGpxExport(): Promise<void> {
  const url = 'https://www.strava.com/athlete/training';
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
