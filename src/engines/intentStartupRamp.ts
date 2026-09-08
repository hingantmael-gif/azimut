import type { PlannedWorkout } from '../types/domain';
import {
  applyStartupFactorsToPlan,
  firstTrainingSessions,
} from './startupSoftening';

export type SoftStartRunIntent = 'start' | 'return_injury';

export type IntentStartupRampResult = {
  plan: PlannedWorkout[];
  applied: boolean;
  sessionsSoftened: number;
  message: string | null;
};

/**
 * Démarrage doux selon l’objectif onboarding :
 * - se mettre à courir / reprise → allège les premières séances
 * - progresser / course route / trail → aucun changement
 */
export function applyIntentStartupRamp(
  plan: PlannedWorkout[],
  runIntent: string | undefined | null,
  opts: { programId?: string } = {},
): IntentStartupRampResult {
  if (runIntent !== 'start' && runIntent !== 'return_injury') {
    return { plan, applied: false, sessionsSoftened: 0, message: null };
  }

  const soft: SoftStartRunIntent = runIntent;
  const startFactor = soft === 'return_injury' ? 0.5 : 0.58;
  const rampCount = soft === 'return_injury' ? 8 : 6;
  const reason =
    soft === 'return_injury'
      ? 'reprise après pause'
      : 'premiers pas en course';

  const targets = firstTrainingSessions(plan, {
    programId: opts.programId,
    count: rampCount,
  });
  if (targets.length === 0) {
    return { plan, applied: false, sessionsSoftened: 0, message: null };
  }

  const softenIds = new Map<string, number>();
  targets.forEach((w, i) => {
    const t = targets.length <= 1 ? 1 : i / (targets.length - 1);
    // Dernière séance encore un peu douce (~0.92), puis programme classique
    softenIds.set(w.id, startFactor + (0.92 - startFactor) * t);
  });

  const pctStart = Math.round((1 - startFactor) * 100);
  const nextPlan = applyStartupFactorsToPlan(plan, softenIds, (factor) => {
    const pct = Math.round((1 - factor) * 100);
    return `Démarrage doux (${reason}) — volume / intensité −${pct} %, puis montée progressive.`;
  });

  const message =
    soft === 'return_injury'
      ? `Reprise en douceur : les ${softenIds.size} premières séances sont allégées (jusqu’à −${pctStart} %), puis le volume remonte.`
      : `Premiers pas : les ${softenIds.size} premières séances démarrent en douceur (jusqu’à −${pctStart} %), puis l’intensité remonte.`;

  return {
    plan: nextPlan,
    applied: true,
    sessionsSoftened: softenIds.size,
    message,
  };
}
