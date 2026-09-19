/** Décision du jour + prochaine meilleure action (Accueil). */

export type DayDecision = 'go' | 'adapt' | 'rest';

export type NextBestAction =
  | { kind: 'start_session'; sessionId: string; label: string }
  | { kind: 'give_rpe'; label: string }
  | { kind: 'create_program'; label: string }
  | { kind: 'free_run'; label: string }
  | { kind: 'adjust_session'; sessionId: string; label: string }
  | { kind: 'rest_today'; label: string };

type DayOpts = {
  readyPct: number;
  sleepScore?: number | null;
  formTsb?: number | null;
  hasTodaySession: boolean;
  pendingRpe: boolean;
  hasActiveProgram: boolean;
};

type ActionOpts = DayOpts & {
  focusSessionId?: string;
};

function sleepOk(sleepScore?: number | null): boolean {
  if (sleepScore == null) return true;
  return sleepScore >= 55;
}

function sleepLabel(sleepScore?: number | null): string {
  if (sleepScore == null) return 'Sommeil inconnu';
  if (sleepScore >= 75) return 'Sommeil excellent';
  if (sleepScore >= 55) return 'Sommeil correct';
  return 'Sommeil faible';
}

function formHint(formTsb?: number | null): string | null {
  if (formTsb == null) return null;
  if (formTsb >= 10) return 'Forme haute';
  if (formTsb >= -10) return 'Forme stable';
  return 'Forme basse';
}

/** Décide go / adapt / rest + ligne de statut Accueil. */
export function decideDay(opts: DayOpts): {
  decision: DayDecision;
  statusLine: string;
  watch: boolean;
} {
  const { readyPct, sleepScore, formTsb, hasTodaySession } = opts;
  const sleepFine = sleepOk(sleepScore);
  const recup = `Récup ${Math.round(readyPct)}%`;
  const sleepPart = sleepLabel(sleepScore);
  const formPart = formHint(formTsb);

  if (readyPct < 35) {
    const parts = [recup, sleepPart, 'Priorité récupération'];
    if (formPart) parts.splice(2, 0, formPart);
    return {
      decision: 'rest',
      statusLine: parts.join(' · '),
      watch: true,
    };
  }

  if (hasTodaySession) {
    if (readyPct >= 55 && sleepFine) {
      const parts = [recup, sleepPart, 'Bon jour pour s’entraîner'];
      if (formPart) parts.splice(2, 0, formPart);
      return {
        decision: 'go',
        statusLine: parts.join(' · '),
        watch: false,
      };
    }
    const parts = [recup, sleepPart, 'Séance à ajuster'];
    if (formPart) parts.splice(2, 0, formPart);
    return {
      decision: 'adapt',
      statusLine: parts.join(' · '),
      watch: true,
    };
  }

  const parts = [recup, sleepPart, 'Jour libre — course ou vélo ?'];
  if (formPart) parts.splice(2, 0, formPart);
  return {
    decision: readyPct < 55 || !sleepFine ? 'adapt' : 'go',
    statusLine: parts.join(' · '),
    watch: readyPct < 55 || !sleepFine,
  };
}

/** Une seule CTA primaire pour l’Accueil. */
export function nextBestAction(opts: ActionOpts): NextBestAction {
  const {
    readyPct,
    sleepScore,
    hasTodaySession,
    pendingRpe,
    hasActiveProgram,
    focusSessionId,
  } = opts;
  const sleepFine = sleepOk(sleepScore);

  if (pendingRpe) {
    return { kind: 'give_rpe', label: 'Donner mon RPE' };
  }

  if (!hasActiveProgram) {
    return { kind: 'create_program', label: 'Créer mon programme' };
  }

  if (readyPct < 35) {
    return { kind: 'rest_today', label: 'Repos aujourd’hui' };
  }

  if (hasTodaySession && focusSessionId) {
    if (readyPct >= 55 && sleepFine) {
      return {
        kind: 'start_session',
        sessionId: focusSessionId,
        label: 'Démarrer ma séance',
      };
    }
    return {
      kind: 'adjust_session',
      sessionId: focusSessionId,
      label: 'Ajuster ma séance',
    };
  }

  if (hasTodaySession) {
    return { kind: 'free_run', label: 'Séance libre' };
  }

  return { kind: 'free_run', label: 'Partir en course libre' };
}
