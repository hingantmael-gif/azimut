import { Linking, Platform, Share, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type {
  ActivityStream,
  PlannedWorkout,
  SessionAnalysis,
  SportDiscipline,
  StravaActivity,
} from '../types/domain';
import { summarizeWorkout } from './workoutPresentation';
import { formatDuration } from './core';

/**
 * URLs Strava stables.
 * Upload fichier : https://www.strava.com/upload/select
 * (GPX / TCX / FIT avec horodatage sur chaque point — obligatoire.)
 */
export const STRAVA_WEB_HOME = 'https://www.strava.com/';
export const STRAVA_WEB_DASHBOARD = 'https://www.strava.com/dashboard';
export const STRAVA_WEB_ACTIVITIES = 'https://www.strava.com/athlete/training';
export const STRAVA_WEB_UPLOAD_FILE = 'https://www.strava.com/upload/select';
export const STRAVA_APP_SCHEME = 'strava://';

const STRAVA_WEB_FALLBACKS = [
  STRAVA_WEB_ACTIVITIES,
  STRAVA_WEB_DASHBOARD,
  STRAVA_WEB_HOME,
] as const;

export type StravaUploadFile = {
  filename: string;
  mime: string;
  content: string;
  dataType: 'gpx' | 'tcx';
};

async function openStravaUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (opened) return;
    }
    await Linking.openURL(url);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      enableBarCollapsing: true,
      showInRecents: true,
      createTask: Platform.OS === 'android',
    });
  } catch {
    await Linking.openURL(url);
  }
}

/** Ouvre Strava pour une entrée manuelle — app si dispo, sinon dashboard web. */
export async function openStravaManualEntry(): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      const can = await Linking.canOpenURL(STRAVA_APP_SCHEME);
      if (can) {
        await Linking.openURL(STRAVA_APP_SCHEME);
        return;
      }
    }
    await openStravaUrl(STRAVA_WEB_DASHBOARD);
  } catch {
    await openStravaUrl(STRAVA_WEB_HOME);
  }
}

/**
 * Ouvre le site Strava (pas l’app) pour exporter un GPX/TCX.
 * Sur téléphone : demander le « site pour ordinateur » dans le navigateur.
 */
export async function openStravaWebForGpxExport(): Promise<void> {
  let lastError: unknown;
  for (const url of STRAVA_WEB_FALLBACKS) {
    try {
      await openStravaUrl(url);
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Impossible d’ouvrir Strava Web');
}

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

function activitySportToTcx(sport?: StravaActivity['sport']): string {
  switch (sport) {
    case 'bike':
      return 'Biking';
    case 'swim':
      return 'Swimming';
    case 'run':
      return 'Running';
    default:
      return 'Other';
  }
}

function disciplineToActivitySport(
  discipline: SportDiscipline,
): StravaActivity['sport'] {
  if (discipline === 'bike') return 'bike';
  if (discipline === 'swim') return 'swim';
  if (discipline === 'strength' || discipline === 'ppg' || discipline === 'mobility') {
    return 'strength';
  }
  if (discipline === 'run' || discipline === 'brick') return 'run';
  return 'other';
}

function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugFileBase(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return base || 'seance';
}

function parseStartMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

/** ISO 8601 avec Z — Strava exige un temps sur chaque point. */
function toIsoZ(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

function clampDurationSec(sec: number): number {
  return Math.max(60, Math.round(sec || 0));
}

function relativeTimeSec(stream: ActivityStream | undefined, index: number, n: number): number {
  const times = stream?.time;
  if (times && times.length === n && Number.isFinite(times[index])) {
    return Math.max(0, times[index]);
  }
  if (times && times.length > 1) {
    const last = times[times.length - 1] || n - 1;
    return Math.round((index / Math.max(1, n - 1)) * last);
  }
  return index;
}

/**
 * Points horodatés pour Strava.
 * Avec GPS : lat/lng + time.
 * Sans GPS : time seul (activité stationnaire / salle) — accepté en TCX.
 */
function buildTimedSamples(activity: StravaActivity): Array<{
  tMs: number;
  lat?: number;
  lng?: number;
  ele?: number;
  hr?: number;
  distM?: number;
}> {
  const startMs = parseStartMs(activity.startDate);
  const durationSec = clampDurationSec(activity.elapsedSec || activity.movingSec);
  const stream = activity.streams;
  const latlng = stream?.latlng ?? [];
  const nGps = latlng.length;

  if (nGps >= 2) {
    const samples: Array<{
      tMs: number;
      lat?: number;
      lng?: number;
      ele?: number;
      hr?: number;
      distM?: number;
    }> = [];
    for (let i = 0; i < nGps; i++) {
      const [lat, lng] = latlng[i];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const rel = relativeTimeSec(stream, i, nGps);
      const ele =
        stream?.altitude && stream.altitude.length === nGps
          ? stream.altitude[i]
          : undefined;
      const hr =
        stream?.heartrate && stream.heartrate.length === nGps
          ? stream.heartrate[i]
          : undefined;
      samples.push({
        tMs: startMs + Math.round(rel * 1000),
        lat,
        lng,
        ele: Number.isFinite(ele) ? ele : undefined,
        hr: Number.isFinite(hr) ? Math.round(hr!) : undefined,
      });
    }
    if (samples.length >= 2) {
      const last = samples[samples.length - 1];
      const minEnd = startMs + durationSec * 1000;
      if (last.tMs < minEnd) {
        samples[samples.length - 1] = { ...last, tMs: minEnd };
      }
      return samples;
    }
  }

  // Sans GPS : échantillons temporels (Strava exige un time par point)
  const step = Math.max(5, Math.ceil(durationSec / 360));
  const samples: Array<{
    tMs: number;
    lat?: number;
    lng?: number;
    ele?: number;
    hr?: number;
    distM?: number;
  }> = [];
  const dist = Math.max(0, activity.distanceM || 0);
  for (let t = 0; t <= durationSec; t += step) {
    const ratio = durationSec > 0 ? t / durationSec : 0;
    const hrSeries = stream?.heartrate;
    let hr: number | undefined;
    if (hrSeries && hrSeries.length > 0) {
      const idx = Math.min(
        hrSeries.length - 1,
        Math.round(ratio * (hrSeries.length - 1)),
      );
      hr = Math.round(hrSeries[idx]);
    } else if (activity.avgHr != null) {
      hr = activity.avgHr;
    }
    samples.push({
      tMs: startMs + t * 1000,
      distM: dist > 0 ? dist * ratio : undefined,
      hr,
    });
  }
  if (samples.length === 1) {
    samples.push({
      tMs: startMs + durationSec * 1000,
      distM: dist > 0 ? dist : undefined,
      hr: activity.avgHr,
    });
  }
  return samples;
}

/** GPX 1.1 — idéal dès qu’il y a un tracé GPS horodaté. */
export function toActivityGpx(activity: StravaActivity): string {
  const samples = buildTimedSamples(activity);
  const withPos = samples.filter((s) => s.lat != null && s.lng != null);
  const points = withPos.length >= 2 ? withPos : samples;
  const name = escapeXml(activity.name || 'Séance Mova');
  const desc = escapeXml(
    [
      `Export Mova`,
      activity.sport ? `Sport : ${activity.sport}` : null,
      `Durée : ${formatDuration(activity.movingSec || activity.elapsedSec)}`,
      activity.distanceM > 0
        ? `Distance : ${(activity.distanceM / 1000).toFixed(2)} km`
        : null,
    ]
      .filter(Boolean)
      .join(' · '),
  );

  const trkpts = points
    .map((p) => {
      if (p.lat == null || p.lng == null) return '';
      const ele =
        p.ele != null && Number.isFinite(p.ele)
          ? `\n        <ele>${p.ele.toFixed(1)}</ele>`
          : '';
      const hrExt =
        p.hr != null
          ? `
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${p.hr}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>`
          : '';
      return `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">
        <time>${toIsoZ(p.tMs)}</time>${ele}${hrExt}
      </trkpt>`;
    })
    .filter(Boolean)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mova"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <desc>${desc}</desc>
    <time>${toIsoZ(parseStartMs(activity.startDate))}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

/** TCX v2 — marche avec ou sans GPS (points Time obligatoires). */
export function toActivityTcx(activity: StravaActivity): string {
  const samples = buildTimedSamples(activity);
  const startMs = parseStartMs(activity.startDate);
  const startIso = toIsoZ(startMs);
  const durationSec = clampDurationSec(activity.elapsedSec || activity.movingSec);
  const distanceM = Math.max(0, Math.round(activity.distanceM || 0));
  const sport = activitySportToTcx(activity.sport);
  const notes = escapeXml(`${activity.name || 'Séance'} — export Mova`);

  const trackPoints = samples
    .map((p) => {
      const pos =
        p.lat != null && p.lng != null
          ? `
          <Position>
            <LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees>
            <LongitudeDegrees>${p.lng.toFixed(7)}</LongitudeDegrees>
          </Position>`
          : '';
      const alt =
        p.ele != null && Number.isFinite(p.ele)
          ? `
          <AltitudeMeters>${p.ele.toFixed(1)}</AltitudeMeters>`
          : '';
      const dist =
        p.distM != null
          ? `
          <DistanceMeters>${p.distM.toFixed(1)}</DistanceMeters>`
          : '';
      const hr =
        p.hr != null
          ? `
          <HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm>`
          : '';
      return `        <Trackpoint>
          <Time>${toIsoZ(p.tMs)}</Time>${pos}${alt}${dist}${hr}
        </Trackpoint>`;
    })
    .join('\n');

  const avgHr =
    activity.avgHr != null
      ? `
        <AverageHeartRateBpm><Value>${activity.avgHr}</Value></AverageHeartRateBpm>`
      : '';
  const maxHr =
    activity.maxHr != null
      ? `
        <MaximumHeartRateBpm><Value>${activity.maxHr}</Value></MaximumHeartRateBpm>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startIso}</Id>
      <Lap StartTime="${startIso}">
        <TotalTimeSeconds>${durationSec}</TotalTimeSeconds>
        <DistanceMeters>${distanceM}</DistanceMeters>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>${avgHr}${maxHr}
        <Track>
${trackPoints}
        </Track>
      </Lap>
      <Notes>${notes}</Notes>
      <Creator xsi:type="Device_t">
        <Name>Mova</Name>
        <UnitId>0</UnitId>
        <ProductID>0</ProductID>
      </Creator>
    </Activity>
  </Activities>
</TrainingCenterDatabase>
`;
}

/**
 * Choisit le format le plus fiable :
 * - GPX si tracé GPS (≥2 points)
 * - TCX sinon (salle / sans GPS / musculation)
 */
export function buildStravaUploadFile(activity: StravaActivity): StravaUploadFile {
  const gps = activity.streams?.latlng?.length ?? 0;
  const stamp = new Date(parseStartMs(activity.startDate))
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '');
  const base = `azimut_${slugFileBase(activity.name)}_${stamp}`;

  if (gps >= 2) {
    return {
      filename: `${base}.gpx`,
      mime: 'application/gpx+xml',
      content: toActivityGpx(activity),
      dataType: 'gpx',
    };
  }
  return {
    filename: `${base}.tcx`,
    mime: 'application/vnd.garmin.tcx+xml',
    content: toActivityTcx(activity),
    dataType: 'tcx',
  };
}

/** Activité synthétique à partir d’une séance plan (si pas encore de live GPS). */
export function activityFromPlannedWorkout(workout: PlannedWorkout): StravaActivity {
  const durationSec = clampDurationSec(workout.plannedDurationSec ?? 1800);
  const distanceM = Math.max(0, Math.round(workout.plannedDistanceM ?? 0));
  const startDate = `${workout.date}T08:00:00.000Z`;
  return {
    id: `azimut-plan-${workout.id}`,
    name: workout.title,
    distanceM,
    elapsedSec: durationSec,
    movingSec: durationSec,
    startDate,
    sport: disciplineToActivitySport(workout.discipline),
    avgPaceSecPerKm:
      distanceM > 20 ? Math.round(durationSec / (distanceM / 1000)) : undefined,
  };
}

/** Retrouve l’activité réelle liée à une séance planifiée. */
export function findActivityForWorkout(
  workout: PlannedWorkout,
  activities: StravaActivity[],
  analyses: SessionAnalysis[] = [],
): StravaActivity | undefined {
  const via = analyses.find((a) => a.plannedWorkoutId === workout.id);
  if (via) {
    const hit = activities.find((a) => a.id === via.activityId);
    if (hit) return hit;
  }
  const day = workout.date;
  const sameDay = activities.filter((a) => a.startDate.slice(0, 10) === day);
  if (sameDay.length === 1) return sameDay[0];
  const sport = disciplineToActivitySport(workout.discipline);
  return (
    sameDay.find((a) => a.sport === sport) ??
    sameDay.find((a) => a.name === workout.title) ??
    undefined
  );
}

/** Télécharge (web) ou partage (natif) le fichier Strava. */
export async function deliverStravaUploadFile(file: StravaUploadFile): Promise<boolean> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([file.content], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      /* fallback share */
    }
  }

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message: file.content, title: file.filename }
        : { message: `${file.filename}\n\n${file.content}`, title: file.filename },
    );
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

/** Message d’aide après téléchargement du fichier. */
export function notifyStravaUploadReady(file: StravaUploadFile): void {
  const msg =
    Platform.OS === 'web'
      ? `Fichier « ${file.filename} » téléchargé.\n\nSur la page Strava : Importer un fichier → sélectionne ce fichier pour enregistrer l’activité.`
      : `Fichier « ${file.filename} » prêt.\n\nImporte-le sur Strava (upload fichier).`;
  Alert.alert('Strava', msg);
}

/**
 * Prépare le fichier compatible Strava, le télécharge, ouvre la page d’upload.
 * À utiliser après une séance complète (activité) ou depuis le plan.
 */
export async function exportActivityToStrava(
  activity: StravaActivity,
  opts?: {
    silent?: boolean;
    profile?: {
      plan?: import('../types/domain').SubscriptionPlan | null;
      subscription?: import('../types/domain').AthleteProfile['subscription'];
    };
  },
): Promise<'ok' | 'error' | 'paywall'> {
  if (opts?.profile) {
    const { takeUsageQuotaIfNeeded } = await import('../premium/guardQuota');
    const q = await takeUsageQuotaIfNeeded('stravaExport', {
      plan: opts.profile.plan ?? 'free',
      subscription: opts.profile.subscription,
    });
    if (q === 'paywall') return 'paywall';
  }
  const file = buildStravaUploadFile(activity);
  const delivered = await deliverStravaUploadFile(file);
  if (!delivered) return 'error';
  if (!opts?.silent) {
    notifyStravaUploadReady(file);
  }
  try {
    await openStravaUrl(STRAVA_WEB_UPLOAD_FILE);
  } catch {
    /* fichier déjà téléchargé */
  }
  return 'ok';
}

export async function exportWorkoutToStrava(
  workout: PlannedWorkout,
  activities: StravaActivity[] = [],
  analyses: SessionAnalysis[] = [],
  profile?: {
    plan?: import('../types/domain').SubscriptionPlan | null;
    subscription?: import('../types/domain').AthleteProfile['subscription'];
  },
): Promise<'ok' | 'error' | 'paywall'> {
  if (workout.discipline === 'rest') return 'error';
  const activity =
    findActivityForWorkout(workout, activities, analyses) ??
    activityFromPlannedWorkout(workout);
  return exportActivityToStrava(activity, { profile });
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
      'Export depuis Mova',
    ]
      .filter(Boolean)
      .join('\n'),
    distance: workout.plannedDistanceM ?? 0,
    trainer: 0,
    commute: 0,
  };
}

/** @deprecated Préférer exportWorkoutToStrava (fichier GPX/TCX). */
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
    '→ Sur Strava : Importer un fichier (GPX/TCX) depuis Mova.',
    `→ Site : ${STRAVA_WEB_UPLOAD_FILE}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** TCX depuis une séance plan — compatible upload Strava. */
export function toStravaTcx(workout: PlannedWorkout): string {
  return toActivityTcx(activityFromPlannedWorkout(workout));
}

/**
 * @deprecated Utiliser exportWorkoutToStrava.
 * Conservé pour les anciens appels : génère maintenant le vrai fichier.
 */
export async function shareWorkoutSession(
  workout: PlannedWorkout,
): Promise<'shared' | 'dismissed'> {
  const result = await exportWorkoutToStrava(workout);
  return result === 'ok' ? 'shared' : 'dismissed';
}

function sportEmoji(sport?: StravaActivity['sport']): string {
  switch (sport) {
    case 'bike':
      return '🚴';
    case 'swim':
      return '🏊';
    case 'strength':
      return '💪';
    case 'run':
      return '🏃';
    default:
      return '⚡';
  }
}

function sportLabelFr(sport?: StravaActivity['sport']): string {
  switch (sport) {
    case 'bike':
      return 'Vélo';
    case 'swim':
      return 'Natation';
    case 'strength':
      return 'Musculation';
    case 'run':
      return 'Course';
    default:
      return 'Séance';
  }
}

/** Récap texte + emoji pour partage social (sans image). */
export function buildActivityShareMessage(activity: StravaActivity): string {
  const km =
    activity.distanceM > 0
      ? `${(activity.distanceM / 1000).toFixed(2).replace('.', ',')} km`
      : null;
  const duration = formatDuration(activity.movingSec || activity.elapsedSec);
  return [
    `${sportEmoji(activity.sport)} ${activity.name}`,
    `Sport : ${sportLabelFr(activity.sport)}`,
    km ? `Distance : ${km}` : null,
    `Durée : ${duration}`,
    '',
    'Séance terminée avec Mova 🧭',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Partage le récap d’une activité enregistrée (feuille système). */
export async function shareActivityRecap(
  activity: StravaActivity,
): Promise<'shared' | 'dismissed'> {
  const message = buildActivityShareMessage(activity);
  const result = await Share.share(
    Platform.OS === 'ios'
      ? { message }
      : { message, title: activity.name },
  );
  if (result.action === Share.sharedAction) return 'shared';
  return 'dismissed';
}
