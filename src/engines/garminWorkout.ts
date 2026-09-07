import type { PlannedWorkout, WorkoutStep, WorkoutStepType } from '../types/domain';

import { formatMinutes } from './core';



export type GarminWorkoutExport = {

  workout: Record<string, unknown>;

  scheduleDate: string;

  summary: string;

};



const SPORT: Record<string, string> = {
  run: 'RUNNING',
  bike: 'CYCLING',
  swim: 'SWIMMING',
  /** Garmin workouts : strength_training (id 5) — pas fitness_equipment */
  strength: 'STRENGTH_TRAINING',
};



const STEP_TYPE: Record<WorkoutStepType, string> = {

  warmup: 'WARMUP',

  active: 'ACTIVE',

  rest: 'REST',

  cooldown: 'COOLDOWN',

};



function mapSingleStep(step: WorkoutStep): Record<string, unknown> {

  const stepType = STEP_TYPE[step.type] ?? 'ACTIVE';

  const base: Record<string, unknown> = {

    type: 'WorkoutStep',

    stepType,

    intensity: stepType,

  };



  if (step.label) base.description = step.label;



  if (step.endCondition === 'distance' && step.distanceMeters) {

    base.durationType = 'DISTANCE';

    base.durationValue = step.distanceMeters;

  } else if (step.durationSec) {

    base.durationType = 'TIME';

    base.durationValue = step.durationSec;

  } else {

    base.durationType = 'OPEN';

  }



  if (step.target?.type === 'pace') {

    base.targetType = 'PACE';

    base.targetValueLow = step.target.minSecPerKm;

    base.targetValueHigh = step.target.maxSecPerKm;

  } else if (step.target?.type === 'hr') {

    base.targetType = 'HEART_RATE';

    base.targetValueLow = step.target.minBpm;

    base.targetValueHigh = step.target.maxBpm;

  }



  return base;

}



function isIntervalPair(a: WorkoutStep, b: WorkoutStep): boolean {

  if (!a.repeat || a.repeat <= 1 || b.repeat !== a.repeat) return false;

  const types = new Set([a.type, b.type]);

  return types.has('active') && types.has('rest');

}



/** Regroupe work+rest avec le même repeat en un seul WorkoutRepeatStep (format Garmin). */

function mapSteps(steps: WorkoutStep[]): Record<string, unknown>[] {

  const out: Record<string, unknown>[] = [];

  let i = 0;



  while (i < steps.length) {

    const step = steps[i];

    const next = steps[i + 1];



    if (next && isIntervalPair(step, next)) {

      const work = step.type === 'active' ? step : next;

      const rest = step.type === 'rest' ? step : next;

      out.push({

        type: 'WorkoutRepeatStep',

        stepOrder: out.length + 1,

        repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',

        repeatValue: step.repeat,

        steps: [mapSingleStep(work), mapSingleStep(rest)],

      });

      i += 2;

      continue;

    }



    if (step.repeat && step.repeat > 1) {

      out.push({

        type: 'WorkoutRepeatStep',

        stepOrder: out.length + 1,

        repeatType: 'REPEAT_UNTIL_STEPS_CMPLT',

        repeatValue: step.repeat,

        steps: [mapSingleStep(step)],

      });

    } else {

      out.push({ ...mapSingleStep(step), stepOrder: out.length + 1 });

    }

    i += 1;

  }



  return out;

}



/** Payload Garmin Training API + date calendrier (sync montre via Garmin Connect). */

export function buildGarminWorkoutExport(workout: PlannedWorkout): GarminWorkoutExport {
  const sport = SPORT[workout.discipline];
  if (!sport) {
    throw new Error(
      `Export Garmin non supporté pour la discipline « ${workout.discipline} ».`,
    );
  }
  const durationMin =

    workout.plannedDurationSec != null

      ? Math.round(workout.plannedDurationSec / 60)

      : workout.steps.reduce((acc, s) => acc + (s.durationSec ?? 0), 0) / 60;



  const steps = workout.steps.length

    ? mapSteps(workout.steps)

    : [

        {

          type: 'WorkoutStep',

          stepOrder: 1,

          stepType: 'ACTIVE',

          intensity: 'ACTIVE',

          durationType: 'OPEN',

          description: workout.title,

        },

      ];



  return {

    scheduleDate: workout.date,

    summary: `${workout.title} · ${formatMinutes(Math.max(1, Math.round(durationMin)))}`,

    workout: {

      workoutName: workout.title,

      description: `Azimut · ${workout.date}`,

      sport,

      steps,

    },

  };

}



/** @deprecated — utiliser buildGarminWorkoutExport */

export function toGarminWorkoutPayload(workout: PlannedWorkout) {

  return buildGarminWorkoutExport(workout).workout;

}



export const GARMIN_FLOW_HINT =

  'Ta montre se synchronise via l’app Garmin Connect (Bluetooth). Azimut envoie la séance sur ton calendrier Garmin — un sync Garmin Connect suffit pour la retrouver sur ta montre.';



export const GARMIN_SUCCESS_MESSAGE =

  'Séance ajoutée à ton calendrier Garmin Connect. Ouvre l’app Garmin Connect et synchronise ta montre : la séance apparaîtra prête à démarrer.';



export const GARMIN_AUTO_SENT_MESSAGE =

  'Séance du jour envoyée automatiquement sur Garmin Connect. Synchronise ta montre dans l’app Garmin.';


