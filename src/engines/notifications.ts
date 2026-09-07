import type { NotificationPrefs } from '../types/domain';

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
): ScheduledReminder[] {
  const today = new Date().toISOString().slice(0, 10);
  const out: ScheduledReminder[] = [];

  if (prefs.preSession && hasSessionToday) {
    out.push({
      id: 'pre-1h',
      type: 'pre_session',
      title: 'Prépare-toi pour ta séance',
      body: 'Ta séance du jour t’attend — consulte le détail et envoie-la à ta montre.',
      at: `${today}T07:00:00`,
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
