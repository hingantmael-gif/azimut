import type {
  ActiveProgram,
  PlannedWorkout,
  SessionAnalysis,
  StravaActivity,
} from '../types/domain';
import { plannedSessionsForProgram } from './programSessions';

export type ProgramSeriesInfo = {
  hasProgram: boolean;
  programTitle?: string;
  /** Flammes gagnées = séances faites le jour exact prévu */
  flames: number;
  /** Séances d’entraînement du programme (hors repos) */
  totalSessions: number;
  /** Série actuelle : séances à l’heure d’affilée depuis la dernière ratée */
  currentStreak: number;
  /** Séance prévue aujourd’hui, pas encore validée */
  pendingToday: PlannedWorkout | null;
  /** Séance d’hier manquée — rattrapage possible aujourd’hui (sans flamme) */
  catchUp: PlannedWorkout | null;
  hint: string;
};

function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

function activityDay(activity: StravaActivity): string {
  return dayOf(activity.startDate);
}

/** Activité liée à une séance planifiée (analyse ou même jour) */
function findLinkedActivity(
  workout: PlannedWorkout,
  activities: StravaActivity[],
  analyses: SessionAnalysis[],
): StravaActivity | undefined {
  // Repos imposé (sommeil) = séance honorée sans activité GPS
  if (workout.sleepAdaptation?.creditedComplete) {
    return {
      id: `sleep-rest-${workout.id}`,
      name: workout.title,
      distanceM: 0,
      elapsedSec: 0,
      movingSec: 0,
      startDate: `${workout.date}T12:00:00.000Z`,
      sport: 'other',
    };
  }
  const viaAnalysis = analyses.find((a) => a.plannedWorkoutId === workout.id);
  if (viaAnalysis) {
    const hit = activities.find((a) => a.id === viaAnalysis.activityId);
    if (hit) return hit;
  }
  return activities.find((a) => activityDay(a) === workout.date);
}

function isOnTime(workout: PlannedWorkout, activity: StravaActivity): boolean {
  return activityDay(activity) === workout.date;
}

/**
 * Série programme : une flamme par séance faite le jour J.
 * Rate le jour → flamme perdue pour cette séance ; rattrapage possible le lendemain sans flamme.
 */
export function computeProgramSeries(opts: {
  plan: PlannedWorkout[];
  activities: StravaActivity[];
  analyses: SessionAnalysis[];
  program?: ActiveProgram;
  todayIso: string;
}): ProgramSeriesInfo {
  const { plan, activities, analyses, program, todayIso } = opts;
  if (!program) {
    return {
      hasProgram: false,
      flames: 0,
      totalSessions: 0,
      currentStreak: 0,
      pendingToday: null,
      catchUp: null,
      hint: 'Lance un programme : chaque séance faite le jour prévu ajoute une flamme.',
    };
  }

  const sessions = plannedSessionsForProgram(plan, program, true);
  const totalSessions = sessions.length;
  const yesterdayIso = shiftIsoDay(todayIso, -1);

  let flames = 0;

  for (const w of sessions) {
    const linked = findLinkedActivity(w, activities, analyses);
    if (linked && isOnTime(w, linked)) {
      flames += 1;
    }
  }

  // Série actuelle : depuis la fin, ignorer le futur ; compter à rebours les on-time
  // jusqu’à une séance passée manquée / rattrapée.
  let currentStreak = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const w = sessions[i];
    if (w.date > todayIso) continue;
    if (w.date === todayIso) {
      const linked = findLinkedActivity(w, activities, analyses);
      if (linked && isOnTime(w, linked)) currentStreak += 1;
      else break; // aujourd’hui pas encore validée → série en attente, on s’arrête
      continue;
    }
    const linked = findLinkedActivity(w, activities, analyses);
    if (linked && isOnTime(w, linked)) currentStreak += 1;
    else break;
  }

  const todaySession =
    sessions.find((w) => w.date === todayIso) ?? null;
  const pendingToday =
    todaySession && !findLinkedActivity(todaySession, activities, analyses)
      ? todaySession
      : null;

  const ySession = sessions.find((w) => w.date === yesterdayIso) ?? null;
  const catchUp =
    ySession && !findLinkedActivity(ySession, activities, analyses) ? ySession : null;

  let hint: string;
  if (totalSessions === 0) {
    hint = 'Ton programme n’a pas encore de séances planifiées.';
  } else if (pendingToday) {
    hint = `Séance du jour : valide-la aujourd’hui pour +1 flamme (${flames}/${totalSessions}).`;
  } else if (catchUp) {
    hint = `Tu peux rattraper la séance d’hier — la flamme de ce jour est perdue (${flames}/${totalSessions}).`;
  } else if (flames === 0) {
    hint = `Fais chaque séance le jour exact pour gagner une flamme (0/${totalSessions}).`;
  } else if (flames >= totalSessions) {
    hint = `Parfait — ${flames}/${totalSessions} séances à l’heure.`;
  } else {
    hint = `${flames}/${totalSessions} séances à l’heure · série en cours : ${currentStreak}.`;
  }

  return {
    hasProgram: true,
    programTitle: program.title,
    flames,
    totalSessions,
    currentStreak,
    pendingToday,
    catchUp,
    hint,
  };
}

function shiftIsoDay(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
