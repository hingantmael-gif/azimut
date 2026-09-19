import type { NotificationPrefs, PlannedWorkout } from '../types/domain';
import { generateReminderCopy } from './preSessionReminder';

/** Rappels intelligents §5 — planification locale */
export type ScheduledReminder = {
  id: string;
  type: 'pre_session' | 'evening' | 'morning_sleep' | 'inactivity' | 'rpe';
  title: string;
  body: string;
  at: string;
};

export function buildDailyReminders(
  prefs: NotificationPrefs,
  hasSessionToday: boolean,
  sessionDone: boolean,
  sleepScore?: number,
  opts?: {
    sessionTitle?: string;
    formTsb?: number;
    todayWorkout?: PlannedWorkout | null;
  },
): ScheduledReminder[] {
  const today = new Date().toISOString().slice(0, 10);
  const out: ScheduledReminder[] = [];

  if (prefs.preSession && hasSessionToday && !sessionDone) {
    const copy = generateReminderCopy({
      sessionTitle: opts?.sessionTitle ?? opts?.todayWorkout?.title ?? 'Séance du jour',
      formTsb: opts?.formTsb,
      sleepScore,
      hoursUntilApprox: 2,
      sessionDate: today,
    });
    out.push({
      id: 'pre-2h',
      type: 'pre_session',
      title: copy.title,
      body: copy.body,
      at: copy.at,
    });
  }
  if (prefs.morningSleep && sleepScore !== undefined) {
    out.push({
      id: 'morning',
      type: 'morning_sleep',
      title: 'Bonjour — sommeil analysé',
      body: `Score sommeil ${sleepScore}/100. Ta séance peut être adaptée si besoin.`,
      at: `${today}T08:00:00`,
    });
  }
  if (prefs.eveningReminder && hasSessionToday && !sessionDone) {
    out.push({
      id: 'evening',
      type: 'evening',
      title: 'Séance pas encore faite',
      body: 'Tu as une séance prévue aujourd’hui — il est encore temps de la faire.',
      at: `${today}T19:00:00`,
    });
  }
  if (prefs.rpe && sessionDone) {
    out.push({
      id: 'rpe',
      type: 'rpe',
      title: 'Feedback RPE',
      body: '3 clics pour noter ton effort et affiner ton plan.',
      at: `${today}T20:00:00`,
    });
  }
  return out;
}
