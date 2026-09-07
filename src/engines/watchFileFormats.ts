import type { PlannedWorkout, SportDiscipline, WatchBrandId, WorkoutStep } from '../types/domain';
import { buildGarminWorkoutExport } from './garminWorkout';
import { buildWatchWorkoutBrief } from './watchExport';
import { summarizeWorkout } from './workoutPresentation';

export type WatchExportFile = {
  filename: string;
  mime: string;
  content: string;
  /** Extension affichée à l’utilisateur */
  formatLabel: string;
  /** Consigne courte après téléchargement */
  nextStep: string;
};

function slug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase() || 'seance';
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tcxSport(discipline: SportDiscipline): string {
  switch (discipline) {
    case 'bike':
      return 'Biking';
    case 'swim':
      return 'Other';
    case 'strength':
      return 'Other';
    default:
      return 'Running';
  }
}

function appleActivity(discipline: SportDiscipline): string {
  switch (discipline) {
    case 'bike':
      return 'cycling';
    case 'swim':
      return 'swimming';
    case 'strength':
      return 'traditionalStrengthTraining';
    default:
      return 'running';
  }
}

function fitbitActivity(discipline: SportDiscipline): string {
  switch (discipline) {
    case 'bike':
      return 'Bike';
    case 'swim':
      return 'Swim';
    case 'strength':
      return 'Weights';
    default:
      return 'Run';
  }
}

function stepGoal(step: WorkoutStep): Record<string, unknown> {
  if (step.endCondition === 'distance' && step.distanceMeters) {
    return { type: 'distance', value: step.distanceMeters, unit: 'meters' };
  }
  if (step.durationSec) {
    return { type: 'time', value: step.durationSec, unit: 'seconds' };
  }
  return { type: 'open' };
}

function stepTarget(step: WorkoutStep): Record<string, unknown> {
  if (step.target?.type === 'pace') {
    return {
      type: 'pace',
      minSecPerKm: step.target.minSecPerKm,
      maxSecPerKm: step.target.maxSecPerKm,
      unit: 'sec/km',
    };
  }
  if (step.target?.type === 'hr') {
    return {
      type: 'heartRate',
      minBpm: step.target.minBpm,
      maxBpm: step.target.maxBpm,
    };
  }
  return { type: 'open' };
}

/** TCX structuré (Garmin / Samsung / Fitbit / Huawei / Strava). */
export function buildStructuredTcx(workout: PlannedWorkout): string {
  const startIso = `${workout.date}T08:00:00.000Z`;
  const durationSec = Math.max(
    60,
    workout.plannedDurationSec ??
      workout.steps.reduce((acc, s) => acc + (s.durationSec ?? 0) * (s.repeat ?? 1), 0) ??
      1800,
  );
  const distanceM = workout.plannedDistanceM ?? 0;
  const sport = tcxSport(workout.discipline);

  const notes = [
    escapeXml(workout.title),
    ...workout.steps.map((s) => {
      const dur =
        s.durationSec != null
          ? `${Math.round(s.durationSec / 60)} min`
          : s.distanceMeters != null
            ? `${s.distanceMeters} m`
            : 'ouvert';
      const rep = s.repeat && s.repeat > 1 ? ` ×${s.repeat}` : '';
      return `${s.type}${rep}: ${s.label ?? s.type} (${dur})`;
    }),
    'Export Azimut → montre',
  ].join(' | ');

  const trackPoints = workout.steps
    .flatMap((s) => {
      const n = Math.max(1, s.repeat ?? 1);
      return Array.from({ length: n }, () => s);
    })
    .map((s, i) => {
      const t = new Date(Date.parse(startIso) + i * 60_000).toISOString();
      return `        <Trackpoint>
          <Time>${t}</Time>
          <Notes>${escapeXml(s.label ?? s.type)}</Notes>
        </Trackpoint>`;
    })
    .join('\n');

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
        <Track>
${trackPoints || `        <Trackpoint><Time>${startIso}</Time></Trackpoint>`}
        </Track>
      </Lap>
      <Notes>${notes}</Notes>
    </Activity>
  </Activities>
  <Workouts>
    <Workout Sport="${sport}">
      <Name>${escapeXml(workout.title)}</Name>
      <Notes>${escapeXml(buildWatchWorkoutBrief(workout))}</Notes>
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;
}

/** JSON type WorkoutKit (Apple Watch / Fitness). */
export function buildAppleWorkoutKitJson(workout: PlannedWorkout): string {
  const warmup = workout.steps.find((s) => s.type === 'warmup');
  const cooldown = workout.steps.find((s) => s.type === 'cooldown');
  const middle = workout.steps.filter((s) => s.type === 'active' || s.type === 'rest');

  const blocks: Record<string, unknown>[] = [];
  let i = 0;
  while (i < middle.length) {
    const a = middle[i]!;
    const b = middle[i + 1];
    if (
      b &&
      a.repeat &&
      a.repeat > 1 &&
      a.repeat === b.repeat &&
      ((a.type === 'active' && b.type === 'rest') || (a.type === 'rest' && b.type === 'active'))
    ) {
      const work = a.type === 'active' ? a : b;
      const recovery = a.type === 'rest' ? a : b;
      blocks.push({
        iterations: a.repeat,
        steps: [
          {
            purpose: 'work',
            goal: stepGoal(work),
            target: stepTarget(work),
            displayName: work.label ?? 'Travail',
          },
          {
            purpose: 'recovery',
            goal: stepGoal(recovery),
            target: stepTarget(recovery),
            displayName: recovery.label ?? 'Récup',
          },
        ],
      });
      i += 2;
      continue;
    }
    blocks.push({
      iterations: a.repeat && a.repeat > 1 ? a.repeat : 1,
      steps: [
        {
          purpose: a.type === 'rest' ? 'recovery' : 'work',
          goal: stepGoal(a),
          target: stepTarget(a),
          displayName: a.label ?? a.type,
        },
      ],
    });
    i += 1;
  }

  const payload = {
    kind: 'custom',
    source: 'azimut',
    displayName: workout.title,
    activity: appleActivity(workout.discipline),
    scheduledDate: workout.date,
    discipline: workout.discipline,
    warmup: warmup
      ? {
          purpose: 'warmup',
          goal: stepGoal(warmup),
          target: stepTarget(warmup),
          displayName: warmup.label ?? 'Échauffement',
        }
      : undefined,
    blocks,
    cooldown: cooldown
      ? {
          purpose: 'cooldown',
          goal: stepGoal(cooldown),
          target: stepTarget(cooldown),
          displayName: cooldown.label ?? 'Retour au calme',
        }
      : undefined,
    brief: buildWatchWorkoutBrief(workout),
    importHint:
      'iPhone : Fitness / Santé → importer ou planifier. Sur watchOS 10+, WorkoutKit peut planifier cette séance.',
  };

  return JSON.stringify(payload, null, 2);
}

/** Plan JSON Samsung Health / Health Connect. */
export function buildSamsungWorkoutJson(workout: PlannedWorkout): string {
  const summary = summarizeWorkout(workout);
  return JSON.stringify(
    {
      source: 'azimut',
      platform: 'samsung_health',
      title: workout.title,
      date: workout.date,
      discipline: workout.discipline,
      durationSec: workout.plannedDurationSec ?? null,
      distanceM: workout.plannedDistanceM ?? null,
      expectedRpe: workout.expectedRpe ?? null,
      durationLabel: summary.durationLabel,
      steps: workout.steps.map((s) => ({
        type: s.type,
        label: s.label ?? s.type,
        durationSec: s.durationSec ?? null,
        distanceMeters: s.distanceMeters ?? null,
        repeat: s.repeat ?? 1,
        target: s.target ?? null,
      })),
      brief: buildWatchWorkoutBrief(workout),
      importHint: 'Ouvre Samsung Health → importe le .tcx joint, ou crée la séance depuis le résumé.',
    },
    null,
    2,
  );
}

/** Plan JSON Fitbit / Pixel. */
export function buildFitbitWorkoutJson(workout: PlannedWorkout): string {
  return JSON.stringify(
    {
      source: 'azimut',
      platform: 'fitbit',
      name: workout.title,
      date: workout.date,
      activityName: fitbitActivity(workout.discipline),
      discipline: workout.discipline,
      durationSec: workout.plannedDurationSec ?? null,
      distanceM: workout.plannedDistanceM ?? null,
      steps: workout.steps.map((s) => ({
        name: s.label ?? s.type,
        type: s.type,
        durationSec: s.durationSec ?? null,
        distanceMeters: s.distanceMeters ?? null,
        repeat: s.repeat ?? 1,
        target: s.target ?? null,
      })),
      brief: buildWatchWorkoutBrief(workout),
      importHint: 'Fitbit App → Exercice → importer le .tcx, ou saisir depuis le résumé.',
    },
    null,
    2,
  );
}

/** Plan JSON Huawei Santé. */
export function buildHuaweiWorkoutJson(workout: PlannedWorkout): string {
  return JSON.stringify(
    {
      source: 'azimut',
      platform: 'huawei_health',
      title: workout.title,
      date: workout.date,
      discipline: workout.discipline,
      durationSec: workout.plannedDurationSec ?? null,
      distanceM: workout.plannedDistanceM ?? null,
      steps: workout.steps.map((s) => ({
        type: s.type,
        label: s.label ?? s.type,
        durationSec: s.durationSec ?? null,
        distanceMeters: s.distanceMeters ?? null,
        repeat: s.repeat ?? 1,
        target: s.target ?? null,
      })),
      brief: buildWatchWorkoutBrief(workout),
      importHint: 'Huawei Santé → Entraînement → importer le .tcx ou créer la séance manuellement.',
    },
    null,
    2,
  );
}

export function buildGarminTrainingJson(workout: PlannedWorkout): string {
  const { workout: payload, scheduleDate, summary } = buildGarminWorkoutExport(workout);
  return JSON.stringify(
    {
      source: 'azimut',
      platform: 'garmin_connect',
      scheduleDate,
      summary,
      workout: payload,
      importHint:
        'Garmin Connect → Entraînement → Importer (JSON Training API) ou laisse Azimut pousser via le compte lié.',
    },
    null,
    2,
  );
}

/**
 * Fichiers exportables selon la montre + la discipline.
 * Primary = fichier principal à télécharger / partager.
 */
export function buildWatchExportFiles(
  workout: PlannedWorkout,
  brandId: WatchBrandId,
): { primary: WatchExportFile; extras: WatchExportFile[] } {
  const base = `azimut-${slug(workout.title)}-${workout.date}`;
  const tcx = buildStructuredTcx(workout);

  switch (brandId) {
    case 'garmin':
      return {
        primary: {
          filename: `${base}-garmin.json`,
          mime: 'application/json',
          content: buildGarminTrainingJson(workout),
          formatLabel: 'JSON Garmin Training',
          nextStep:
            'Si le compte Garmin est lié, Azimut pousse aussi sur Connect. Sinon : Garmin Connect → Entraînements → Importer.',
        },
        extras: [
          {
            filename: `${base}-garmin.tcx`,
            mime: 'application/vnd.garmin.tcx+xml',
            content: tcx,
            formatLabel: 'TCX',
            nextStep: 'Import TCX dans Garmin Connect (compatible course / vélo / natation).',
          },
        ],
      };
    case 'apple':
      return {
        primary: {
          filename: `${base}-apple-workoutkit.json`,
          mime: 'application/json',
          content: buildAppleWorkoutKitJson(workout),
          formatLabel: 'JSON WorkoutKit',
          nextStep:
            'Sur iPhone : Fitness / Santé. Le JSON décrit la séance structurée (warmup, blocs, cooldown) pour Apple Watch.',
        },
        extras: [
          {
            filename: `${base}-apple.tcx`,
            mime: 'application/vnd.garmin.tcx+xml',
            content: tcx,
            formatLabel: 'TCX',
            nextStep: 'Secours : import TCX via une app tierce ou Strava puis sync Santé.',
          },
        ],
      };
    case 'samsung':
      return {
        primary: {
          filename: `${base}-samsung.tcx`,
          mime: 'application/vnd.garmin.tcx+xml',
          content: tcx,
          formatLabel: 'TCX Samsung Health',
          nextStep: 'Samsung Health → importe le TCX, puis sync Bluetooth vers Galaxy Watch.',
        },
        extras: [
          {
            filename: `${base}-samsung.json`,
            mime: 'application/json',
            content: buildSamsungWorkoutJson(workout),
            formatLabel: 'JSON plan',
            nextStep: 'Résumé structuré pour ressaisir vite dans Samsung Health.',
          },
        ],
      };
    case 'google_fitbit':
      return {
        primary: {
          filename: `${base}-fitbit.tcx`,
          mime: 'application/vnd.garmin.tcx+xml',
          content: tcx,
          formatLabel: 'TCX Fitbit',
          nextStep: 'App Fitbit → Exercice → importer le TCX (Pixel Watch / Fitbit).',
        },
        extras: [
          {
            filename: `${base}-fitbit.json`,
            mime: 'application/json',
            content: buildFitbitWorkoutJson(workout),
            formatLabel: 'JSON Fitbit',
            nextStep: 'Plan détaillé si l’import TCX n’est pas proposé sur ton modèle.',
          },
        ],
      };
    case 'huawei':
      return {
        primary: {
          filename: `${base}-huawei.tcx`,
          mime: 'application/vnd.garmin.tcx+xml',
          content: tcx,
          formatLabel: 'TCX Huawei Santé',
          nextStep: 'Huawei Santé → Entraînement → importer le TCX, puis sync la montre.',
        },
        extras: [
          {
            filename: `${base}-huawei.json`,
            mime: 'application/json',
            content: buildHuaweiWorkoutJson(workout),
            formatLabel: 'JSON plan',
            nextStep: 'Résumé pour créer la séance rapidement dans Huawei Santé.',
          },
        ],
      };
    default:
      return {
        primary: {
          filename: `${base}.tcx`,
          mime: 'application/vnd.garmin.tcx+xml',
          content: tcx,
          formatLabel: 'TCX',
          nextStep: 'Importe le TCX dans l’app compagnon de ta montre.',
        },
        extras: [],
      };
  }
}
