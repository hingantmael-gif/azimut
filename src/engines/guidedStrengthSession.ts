import type { PlannedWorkout, WorkoutStep } from '../types/domain';
import {
  isCalisthenicsWorkout,
  parseCalisExerciseIdFromStepLabel,
  parseCalisGuidedMeta,
  stripCalisStepLabel,
} from './calisthenicsProgramming';

/**
 * Player guidé musculation / callisthénie :
 * - holds (gainage, chaise, hollow…) → chrono = durée de tenue
 * - séries en reps → Suivant
 * - repos → chrono = repos prescrit (pas la durée de l’exo suivant)
 */

export type GuidedPhaseKind =
  | 'warmup'
  | 'work_reps'
  | 'work_hold'
  | 'rest'
  | 'cooldown'
  | 'done';

export type GuidedVisualKey =
  | 'warmup'
  | 'pushup'
  | 'pullup'
  | 'squat'
  | 'lunge'
  | 'dip'
  | 'plank'
  | 'row'
  | 'hollow'
  | 'wallsit'
  | 'press'
  | 'shoulder'
  | 'curl'
  | 'hinge'
  | 'generic';

export interface GuidedPhase {
  id: string;
  kind: GuidedPhaseKind;
  title: string;
  cue?: string;
  setIndex?: number;
  setTotal?: number;
  repsLabel?: string;
  /** Chrono (warmup / hold / rest / cooldown) — toujours aligné sur la prescription */
  durationSec?: number;
  visualKey: GuidedVisualKey;
  nextPreview?: { title: string; detail: string };
}

export function canStartGuidedStrengthSession(w: {
  discipline?: string;
  title?: string;
  id?: string;
  expectedRpe?: number;
}): boolean {
  if (w.discipline === 'strength' || w.discipline === 'ppg') return true;
  return isCalisthenicsWorkout(w);
}

type ParsedExercise = {
  name: string;
  cue?: string;
  sets: number;
  repsLabel?: string;
  holdSec?: number;
  restSec: number;
  visualKey: GuidedVisualKey;
  calisId?: string;
};

function isHoldExercise(name: string, calisId?: string | null): boolean {
  if (calisId === 'plank' || calisId === 'hollow' || calisId === 'scapular') return true;
  const n = name.toLowerCase();
  return (
    /planche|gainage|hollow|chaise|wall.?sit|isométr|tenue|hold|dead hang|suspension active|scapular/.test(
      n,
    ) && !/pompe|push.?up|traction|squat|fente|curl|développé|rowing|dip/.test(n)
  );
}

/**
 * Variantes de pompes / squats sans visuel exact : on préfère l'image neutre à une photo trompeuse
 * (une pompe pike n'est pas une pompe classique, une pompe déclinée non plus).
 */
const VARIANT_WITHOUT_IMAGE = /pike|d[ée]clin|sur[ée]lev|archer|diamant|hindou|pseudo|pistol|sissy|explosi|claquée|une main|à un bras/i;

export function visualKeyFor(name: string, calisId?: string | null): GuidedVisualKey {
  if (calisId === 'pike_pushup') return 'generic';
  if (calisId === 'pushup') return VARIANT_WITHOUT_IMAGE.test(name) ? 'generic' : 'pushup';
  if (calisId === 'pullup' || calisId === 'scapular') return 'pullup';
  if (calisId === 'squat') return 'squat';
  if (calisId === 'lunge') return 'lunge';
  if (calisId === 'dip') return 'dip';
  if (calisId === 'plank') return 'plank';
  if (calisId === 'hollow') return 'hollow';
  if (calisId === 'row') return 'row';

  const n = name.toLowerCase();
  if (/pompe|push.?up|squat|fente|lunge/.test(n) && VARIANT_WITHOUT_IMAGE.test(n)) return 'generic';
  if (/chaise|wall.?sit/.test(n)) return 'wallsit';
  if (/hollow/.test(n)) return 'hollow';
  if (/planche|gainage latéral|gainage/.test(n)) return 'plank';
  if (/chest press|pec deck|écarté|développé couché|développé incliné/.test(n)) return 'press';
  if (/pompe|push.?up/.test(n)) return 'pushup';
  if (/dip/.test(n)) return 'dip';
  if (/australien/.test(n)) return 'row';
  if (/traction|pull.?up|tirage|face pull|suspension/.test(n)) return 'pullup';
  if (/rowing|row /.test(n) || n.includes('rowing')) return 'row';
  if (/fente|lunge|step.?up|bulgare/.test(n)) return 'lunge';
  if (/squat|goblet|presse à cuisses|leg extension/.test(n)) return 'squat';
  if (/curl|biceps/.test(n)) return 'curl';
  if (/épaule|latéral|frontal|shoulder|développé assis|shrug|oiseau/.test(n)) return 'shoulder';
  if (/développé|press|kickback triceps|extension triceps|overhead/.test(n)) return 'press';
  if (
    /soulevé|hinge|hip thrust|good morning|leg curl|mollet|pont fessier|dead|roumain/.test(n)
  )
    return 'hinge';
  if (/échauff|warmup|mobilité|étirement|retour au calme/.test(n)) return 'warmup';
  return 'generic';
}

function parseSetsRepsRest(label: string): {
  sets: number;
  repsLabel?: string;
  holdSec?: number;
  restSec: number;
} {
  let sets = 3;
  let repsLabel: string | undefined;
  let holdSec: number | undefined;
  let restSec = 90;

  const setsM =
    /(\d+)\s*séries?(?:\s*[×x*]\s*|\s+de\s+)/i.exec(label) ||
    /(\d+)\s*[×x*]\s*/i.exec(label);
  if (setsM) sets = Math.min(8, Math.max(1, Number(setsM[1])));

  // 3 × 30s | 3x30s | 3*30 s | 3 × 30 sec
  const holdM =
    /(\d+)\s*[×x*]\s*(\d+)\s*(?:s|sec|secs)\b/i.exec(label) ||
    /(\d+)\s*[×x*]\s*(\d+)\s*min(?:ute)?s?\b/i.exec(label) ||
    /tenu[e]?[^\d]*(\d+)\s*(?:s|sec)\b/i.exec(label) ||
    /(\d+)\s*(?:s|sec)\s*(?:de\s+)?tenu/i.exec(label) ||
    /(\d+)\s*min(?:ute)?s?\s*(?:de\s+)?tenu/i.exec(label);
  if (holdM) {
    const a = Number(holdM[1]);
    const b = holdM[2] != null ? Number(holdM[2]) : undefined;
    if (b != null && !Number.isNaN(b)) {
      sets = Math.min(8, Math.max(1, a));
      const raw = b;
      holdSec = /min/i.test(holdM[0])
        ? Math.min(180, Math.max(5, raw * 60))
        : Math.min(180, Math.max(5, raw));
    } else if (!Number.isNaN(a)) {
      holdSec = /min/i.test(holdM[0])
        ? Math.min(180, Math.max(5, a * 60))
        : Math.min(180, Math.max(5, a));
    }
  }

  const repsM =
    /séries?\s*[×x*]\s*([0-9]+(?:\s*[–\-−]\s*[0-9]+)?)/i.exec(label) ||
    /séries?\s+de\s+([0-9]+(?:\s*[–\-−]\s*[0-9]+)?)/i.exec(label) ||
    /(\d+)\s*[×x*]\s*([0-9]+(?:\s*[–\-−]\s*[0-9]+)?)\s*(?:reps?)?\b/i.exec(label);
  if (repsM && holdSec == null) {
    repsLabel = (repsM[2] ?? repsM[1]).replace(/\s+/g, '');
    if (repsM[2] && /^\d+$/.test(repsM[1])) {
      sets = Math.min(8, Math.max(1, Number(repsM[1])));
    }
  }

  const restM =
    /repos\s+(\d+)\s*(?:s|sec)\b/i.exec(label) ||
    /(\d+)\s*(?:s|sec)\s+de\s+repos/i.exec(label) ||
    /repos\s+(\d+)\s*min/i.exec(label) ||
    /(\d+)\s*min(?:ute)?s?\s+de\s+repos/i.exec(label);
  if (restM) {
    const n = Number(restM[1]);
    restSec = /min/i.test(restM[0]) ? n * 60 : n;
    restSec = Math.min(300, Math.max(20, restSec));
  }

  return { sets, repsLabel, holdSec, restSec };
}

function splitNameAndCue(raw: string): { name: string; cue?: string } {
  const cleaned = stripCalisStepLabel(raw).trim();
  const parts = cleaned.split(/\s+[—–]\s+/);
  if (parts.length >= 2) {
    const namePart = parts[0].split('·')[0].trim();
    const cue = parts.slice(1).join(' — ').trim();
    return { name: namePart || cleaned, cue: cue.slice(0, 120) };
  }
  const name = cleaned.split('·')[0].trim();
  const cueMatch = /·\s*([^·]+)$/.exec(cleaned);
  let cue: string | undefined;
  if (cueMatch && /[a-zàâäéèêëïîôùûüç]/i.test(cueMatch[1]) && cueMatch[1].length > 20) {
    cue = cueMatch[1].trim().slice(0, 120);
  }
  return { name: name || cleaned, cue };
}

function parseActiveStep(step: WorkoutStep): ParsedExercise {
  const label = step.label ?? 'Exercice';
  const guidedMeta = parseCalisGuidedMeta(label);
  const calisId = guidedMeta?.id ?? parseCalisExerciseIdFromStepLabel(label);
  const { name, cue } = splitNameAndCue(label);

  if (guidedMeta) {
    const holdSec =
      guidedMeta.holdSec ??
      (isHoldExercise(name, calisId) ? 30 : undefined);
    return {
      name,
      cue,
      sets: guidedMeta.sets,
      repsLabel: holdSec != null ? undefined : guidedMeta.repsLabel ?? '8–12',
      holdSec,
      restSec: guidedMeta.restSec,
      visualKey: visualKeyFor(name, calisId),
      calisId: calisId ?? undefined,
    };
  }

  const parsed = parseSetsRepsRest(label);
  let holdSec = parsed.holdSec;
  if (holdSec == null && isHoldExercise(name, calisId)) {
    holdSec = 30;
  }
  return {
    name,
    cue,
    sets: parsed.sets,
    repsLabel: holdSec != null ? undefined : parsed.repsLabel ?? '8–12',
    holdSec,
    restSec: parsed.restSec,
    visualKey: visualKeyFor(name, calisId),
    calisId: calisId ?? undefined,
  };
}

function phasePreview(ex: ParsedExercise): { title: string; detail: string } {
  if (ex.holdSec != null) {
    return {
      title: ex.name,
      detail: `${ex.sets} × ${ex.holdSec} s`,
    };
  }
  return {
    title: ex.name,
    detail: `${ex.sets} × ${ex.repsLabel ?? 'reps'}`,
  };
}

/** Durée affichée = durée planifiée (plus de plafond 90 s déconnecté du libellé). */
function timedBlockSec(step: WorkoutStep, fallback: number, maxSec: number): number {
  const raw = step.durationSec ?? fallback;
  return Math.min(maxSec, Math.max(30, raw));
}

/**
 * Déroule la séance en phases jouables (séries + repos inter-séries).
 */
export function buildGuidedPhases(workout: PlannedWorkout): GuidedPhase[] {
  const phases: GuidedPhase[] = [];
  const steps = workout.steps ?? [];

  const activeParsed = steps
    .filter((s) => s.type === 'active')
    .map((s) => ({ step: s, ex: parseActiveStep(s) }));

  let activeCursor = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.type === 'warmup') {
      const dur = timedBlockSec(step, 180, 7 * 60);
      const next = activeParsed[0]?.ex;
      phases.push({
        id: `wu-${i}`,
        kind: 'warmup',
        title: 'Échauffement',
        cue: stripCalisStepLabel(step.label ?? '').slice(0, 90),
        durationSec: dur,
        visualKey: 'warmup',
        nextPreview: next ? phasePreview(next) : undefined,
      });
      continue;
    }

    if (step.type === 'cooldown') {
      const dur = timedBlockSec(step, 180, 7 * 60);
      phases.push({
        id: `cd-${i}`,
        kind: 'cooldown',
        title: 'Retour au calme',
        cue: stripCalisStepLabel(step.label ?? '').slice(0, 90),
        durationSec: dur,
        visualKey: 'warmup',
      });
      continue;
    }

    if (step.type === 'rest') {
      // Les repos inter-séries sont générés ci-dessous à partir de restSec prescrit.
      continue;
    }

    if (step.type === 'active') {
      const { ex } = activeParsed[activeCursor] ?? {
        ex: parseActiveStep(step),
      };
      activeCursor += 1;
      const nextEx = activeParsed[activeCursor]?.ex;

      for (let s = 1; s <= ex.sets; s++) {
        const isLastSet = s === ex.sets;
        if (ex.holdSec != null) {
          phases.push({
            id: `${step.id}-hold-${s}`,
            kind: 'work_hold',
            title: ex.name,
            cue: ex.cue,
            setIndex: s,
            setTotal: ex.sets,
            durationSec: ex.holdSec,
            visualKey: ex.visualKey,
          });
        } else {
          phases.push({
            id: `${step.id}-set-${s}`,
            kind: 'work_reps',
            title: ex.name,
            cue: ex.cue,
            setIndex: s,
            setTotal: ex.sets,
            repsLabel: ex.repsLabel,
            visualKey: ex.visualKey,
          });
        }

        if (!isLastSet) {
          phases.push({
            id: `${step.id}-rest-${s}`,
            kind: 'rest',
            title: 'Repos',
            durationSec: ex.restSec,
            visualKey: ex.visualKey,
            nextPreview: {
              title: ex.name,
              detail:
                ex.holdSec != null
                  ? `Série ${s + 1}/${ex.sets} · ${ex.holdSec} s`
                  : `Série ${s + 1}/${ex.sets} · ${ex.repsLabel}`,
            },
          });
        } else if (nextEx) {
          // Transition = repos prescrit de l’exo qui vient de finir (temps de setup)
          phases.push({
            id: `${step.id}-bridge`,
            kind: 'rest',
            title: 'Repos',
            durationSec: ex.restSec,
            visualKey: nextEx.visualKey,
            nextPreview: phasePreview(nextEx),
          });
        }
      }
    }
  }

  return phases;
}

export function formatGuidedClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
