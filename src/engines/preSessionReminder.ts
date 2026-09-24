import type { PlannedWorkout } from '../types/domain';

export type ReminderCopy = {
  title: string;
  body: string;
  /** ISO datetime for local notification trigger */
  at: string;
};

function formAdvice(formTsb?: number): string {
  if (formTsb == null) return 'Échauffe-toi 8–10 min, hydrate-toi.';
  if (formTsb <= -18) return 'Forme en creux — réduis le volume ou privilégie Zone 1.';
  if (formTsb <= -8) return 'Récup encore fragile — écoute les sensations.';
  if (formTsb >= 10) return 'Bonne forme — garde la qualité technique.';
  return 'Forme stable — suis le plan sans forcer.';
}

function sleepAdvice(sleepScore?: number): string {
  if (sleepScore == null) return '';
  if (sleepScore < 55) return ' Sommeil faible : commence en douceur.';
  if (sleepScore >= 80) return ' Bon sommeil — tu peux viser l’intensité prévue.';
  return '';
}

/**
 * Copie rappel pré-séance (~2 h avant / créneau du jour).
 * Utilisé par les notifs locales et le bandeau in-app.
 */
export function generateReminderCopy(opts: {
  sessionTitle: string;
  formTsb?: number;
  sleepScore?: number;
  /** Heures approximatives avant la séance (défaut ~2) */
  hoursUntilApprox?: number;
  /** Date ISO YYYY-MM-DD de la séance */
  sessionDate?: string;
  now?: Date;
}): ReminderCopy {
  const now = opts.now ?? new Date();
  const hours = opts.hoursUntilApprox ?? 2;
  const title =
    hours <= 1
      ? `Bientôt · ${opts.sessionTitle}`
      : `Dans ~${Math.round(hours)}h · ${opts.sessionTitle}`;
  const body = `Récup / conseil : ${formAdvice(opts.formTsb)}${sleepAdvice(opts.sleepScore)}`;

  const atDate = new Date(now.getTime() + Math.max(0.25, hours) * 3600_000);
  // Si on a une date de séance et qu’on est déjà le jour J après 16h, pousse à demain matin
  const day = (opts.sessionDate ?? now.toISOString().slice(0, 10)).slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  let at = atDate.toISOString();
  if (day === today && now.getHours() >= 16) {
    at = `${day}T18:30:00`;
  } else if (atDate.toISOString().slice(0, 10) !== today && day === today) {
    // rester le jour J
    const local = new Date(now);
    local.setHours(Math.min(17, now.getHours() + Math.round(hours)), 0, 0, 0);
    at = local.toISOString();
  }

  return { title, body, at };
}

/** True si une séance du jour mérite un bandeau / rappel (pas encore faite). */
export function shouldShowPreSessionBanner(opts: {
  todayWorkout: PlannedWorkout | null | undefined;
  sessionDoneToday: boolean;
  now?: Date;
}): boolean {
  const w = opts.todayWorkout;
  if (!w || w.discipline === 'rest' || opts.sessionDoneToday) return false;
  const hour = (opts.now ?? new Date()).getHours();
  // Fenêtre utile : matin → fin d’après-midi
  return hour >= 6 && hour < 20;
}
