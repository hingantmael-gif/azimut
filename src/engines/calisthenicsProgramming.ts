import type { AthleticLevel, PeriodizationBlock, PlannedWorkout, WorkoutStep } from '../types/domain';

/**
 * Callisthénie — séances type Push / Pull / Legs / Full.
 * Tenues (planche, hollow…) = chronos ; mouvements dynamiques = reps + « Suivant ».
 * Pas de RPE : validation « séance faite ».
 */

export type CalisthenicsGoalFocus = 'endurance' | 'hypertrophy' | 'strength' | 'skill';

export const CALISTHENICS_GOAL_OPTIONS: Array<{
  id: CalisthenicsGoalFocus;
  label: string;
  desc: string;
}> = [
  {
    id: 'endurance',
    label: 'Endurance musculaire',
    desc: 'Beaucoup de répétitions, repos courts (30–45 s)',
  },
  {
    id: 'hypertrophy',
    // La prise de masse relève de la Musculation (charges additionnelles) ; ici : volume au poids du corps.
    label: 'Volume & maîtrise',
    desc: '8–12 reps propres, repos 45–60 s — pour la prise de masse, choisis Musculation',
  },
  {
    id: 'strength',
    label: 'Devenir plus fort',
    desc: 'Progressions difficiles, 3–6 reps, repos 1 min 15 à 1 min 30',
  },
  {
    id: 'skill',
    label: 'Contrôle & gainage',
    desc: 'Tenues, qualité du mouvement, repos courts',
  },
];

type MovementPattern = 'push' | 'pull' | 'legs' | 'core' | 'skill';

export type CalisExerciseId =
  | 'pushup'
  | 'pike_pushup'
  | 'dip'
  | 'pullup'
  | 'row'
  | 'squat'
  | 'lunge'
  | 'plank'
  | 'hollow'
  | 'scapular';

type CalisExercise = {
  id: CalisExerciseId;
  name: string;
  pattern: MovementPattern;
  /** true = séries chronométrées (jamais en « reps ») */
  isometric?: boolean;
  cue: string;
  beginnerName?: string;
  beginnerCue?: string;
};

/** Bibliothèque — mouvements classiques (pas de circuit aléatoire type « cardio gym »). */
const LIBRARY: CalisExercise[] = [
  {
    id: 'pushup',
    name: 'Pompes',
    pattern: 'push',
    cue: 'Corps gainé, coudes ~45°, poitrine près du sol, poussée contrôlée.',
    beginnerName: 'Pompes surélevées (mains sur un banc)',
    beginnerCue: 'Mains plus hautes que les pieds — ligne épaules-hanches-chevilles.',
  },
  {
    id: 'pike_pushup',
    name: 'Pompes pike',
    pattern: 'push',
    cue: 'Bassin haut, tête entre les mains — travail d’épaules type développé.',
    beginnerName: 'Pompes pike partielles',
    beginnerCue: 'Amplitude courte, bassin haut, coudes stables.',
  },
  {
    id: 'dip',
    name: 'Dips (barres ou banc)',
    pattern: 'push',
    cue: 'Épaules basses, descendre ~90° aux coudes, remonter sans se balancer.',
    beginnerName: 'Dips assistés (pieds au sol)',
    beginnerCue: 'Aide légère des jambes, descente en 2–3 s.',
  },
  {
    id: 'pullup',
    name: 'Tractions',
    pattern: 'pull',
    cue: 'Omoplates engagées, menton au-dessus de la barre, descente contrôlée.',
    beginnerName: 'Tractions négatives / australiennes',
    beginnerCue: 'Descente 3–5 s depuis le haut, ou tire sous une barre basse.',
  },
  {
    id: 'row',
    name: 'Rowings australiens',
    pattern: 'pull',
    cue: 'Corps gainé sous la barre, poitrine vers la barre, dos serré.',
  },
  {
    id: 'squat',
    name: 'Squats poids du corps',
    pattern: 'legs',
    cue: 'Pieds largeur d’épaules, genoux dans l’axe, hanches sous les genoux si mobilité OK.',
  },
  {
    id: 'lunge',
    name: 'Fentes arrière',
    pattern: 'legs',
    cue: 'Grand pas en arrière, genou avant stable, torse droit — alterne chaque jambe.',
  },
  {
    id: 'plank',
    name: 'Planche avant',
    pattern: 'core',
    isometric: true,
    cue: 'Avant-bras au sol, bassin neutre, ne creuse pas le dos.',
  },
  {
    id: 'hollow',
    name: 'Hollow body hold',
    pattern: 'core',
    isometric: true,
    cue: 'Bas du dos plaqué, bras et jambes légèrement décollés — gainage gymnastique.',
    beginnerName: 'Hollow tuck (genoux pliés)',
    beginnerCue: 'Bas du dos plaqué, genoux fléchis pour alléger.',
  },
  {
    id: 'scapular',
    name: 'Suspension active (scapular pulls)',
    pattern: 'skill',
    isometric: true,
    cue: 'Pendu bras tendus : baisse / lève les omoplates sans plier les coudes.',
  },
];

const BY_ID = Object.fromEntries(LIBRARY.map((e) => [e.id, e])) as Record<
  CalisExerciseId,
  CalisExercise
>;

export type CalisGuidedMeta = {
  id: CalisExerciseId;
  sets: number;
  restSec: number;
  holdSec?: number;
  repsLabel?: string;
};

/** Tag machine : [calis:plank|s:3|h:30|r:60] ou [calis:pushup|s:3|rep:8-12|r:90] */
export function formatCalisStepTag(meta: CalisGuidedMeta): string {
  const parts = [`calis:${meta.id}`, `s:${meta.sets}`, `r:${meta.restSec}`];
  if (meta.holdSec != null) parts.push(`h:${meta.holdSec}`);
  if (meta.repsLabel) parts.push(`rep:${meta.repsLabel.replace(/\s+/g, '')}`);
  return `[${parts.join('|')}]`;
}

export function parseCalisGuidedMeta(label?: string): CalisGuidedMeta | null {
  if (!label) return null;
  const m = /^\[calis:([a-z_]+)((?:\|[^\]]+)*)\]/.exec(label);
  if (!m) return null;
  const id = m[1] as CalisExerciseId;
  const bag = m[2] ?? '';
  const num = (key: string) => {
    const hit = new RegExp(`\\|${key}:(\\d+)`).exec(bag);
    return hit ? Number(hit[1]) : undefined;
  };
  const rep = /\|rep:([^|\]]+)/.exec(bag)?.[1];
  const sets = num('s') ?? 3;
  const restSec = num('r') ?? 90;
  const holdSec = num('h');
  return {
    id,
    sets: Math.min(8, Math.max(1, sets)),
    restSec: Math.min(300, Math.max(20, restSec)),
    holdSec: holdSec != null ? Math.min(180, Math.max(5, holdSec)) : undefined,
    repsLabel: rep?.replace(/-/g, '–'),
  };
}

export function parseCalisExerciseIdFromStepLabel(label?: string): CalisExerciseId | null {
  const meta = parseCalisGuidedMeta(label);
  if (meta) return meta.id;
  if (!label) return null;
  const legacy = /^\[calis:([a-z_]+)\]\s*/.exec(label);
  return legacy ? (legacy[1] as CalisExerciseId) : null;
}

export function stripCalisStepLabel(label: string): string {
  return label
    .replace(/^\[calis:[a-z_]+(?:\|[^\]]+)*\]\s*/i, '')
    .replace(/^\[calis:[a-z_]+\]\s*/i, '');
}

type Scheme = {
  sets: number;
  repsLabel: string;
  restSec: number;
};

function baseScheme(goal: CalisthenicsGoalFocus, level: AthleticLevel): Scheme {
  switch (goal) {
    case 'strength':
      return {
        sets: level === 'debutant' ? 3 : 4,
        repsLabel: '3–6',
        restSec: level === 'debutant' ? 150 : 180,
      };
    case 'hypertrophy':
      return {
        sets: 3,
        repsLabel: level === 'debutant' ? '8–10' : '8–12',
        restSec: level === 'debutant' ? 90 : 105,
      };
    case 'skill':
      return {
        sets: 4,
        repsLabel: '5–8',
        restSec: 90,
      };
    case 'endurance':
    default:
      return {
        sets: 3,
        repsLabel: level === 'debutant' ? '12–15' : '15–20',
        restSec: level === 'debutant' ? 60 : 45,
      };
  }
}

/**
 * Repos entre séries selon le type d'exercice (physiologie du poids du corps) :
 * - tenues / gainage / isolation : 30–40 s ;
 * - poids du corps de base (pompes, squats, fentes, rowing) : 40–60 s ;
 * - mouvements intenses (tractions, dips) : 60–90 s (plus long seulement pour la force max).
 * Des repos de 1 min 45 après 8–12 pompes refroidissent le muscle et allongent la séance pour rien.
 */
export function restForExercise(ex: { id: string; isometric?: boolean }, goal: CalisthenicsGoalFocus): number {
  if (ex.isometric) return 35;
  if (ex.id === 'pullup' || ex.id === 'dip') {
    return goal === 'strength' ? 90 : goal === 'endurance' ? 60 : 75;
  }
  return goal === 'endurance' ? 40 : goal === 'hypertrophy' ? 50 : 60;
}

function holdSecondsFor(
  goal: CalisthenicsGoalFocus,
  level: AthleticLevel,
  exId: CalisExerciseId,
): number {
  const soft = level === 'debutant';
  if (exId === 'scapular') {
    return soft ? 20 : goal === 'endurance' ? 30 : 25;
  }
  switch (goal) {
    case 'endurance':
      return soft ? 30 : 45;
    case 'hypertrophy':
      return soft ? 30 : 40;
    case 'strength':
      return soft ? 20 : 30;
    case 'skill':
      return soft ? 25 : 40;
    default:
      return 30;
  }
}

function prescriptionFor(
  ex: CalisExercise,
  goal: CalisthenicsGoalFocus,
  level: AthleticLevel,
): CalisGuidedMeta {
  const base = baseScheme(goal, level);
  if (ex.isometric) {
    return {
      id: ex.id,
      sets: goal === 'skill' ? 4 : base.sets,
      holdSec: holdSecondsFor(goal, level, ex.id),
      restSec: restForExercise(ex, goal),
    };
  }
  // Force : un peu moins de volume, plus de repos
  if (goal === 'strength' && (ex.id === 'pullup' || ex.id === 'dip')) {
    return {
      id: ex.id,
      sets: level === 'debutant' ? 3 : 4,
      repsLabel: level === 'debutant' ? '3–5' : '3–6',
      restSec: restForExercise(ex, goal),
    };
  }
  return {
    id: ex.id,
    sets: base.sets,
    repsLabel: base.repsLabel,
    restSec: restForExercise(ex, goal),
  };
}

/** Ordre fixe type coach callisthénie — pas un tirage aléatoire. */
function sessionExerciseIds(
  trainingDaysCount: number,
  slotIndex: number,
  level: AthleticLevel,
): { title: string; ids: CalisExerciseId[] } {
  const trim = (ids: CalisExerciseId[]): CalisExerciseId[] => {
    if (level === 'debutant') return ids.slice(0, 4);
    if (level === 'intermediaire') return ids.slice(0, 5);
    return ids;
  };

  if (trainingDaysCount <= 2) {
    return {
      title: 'Full body',
      ids: trim(['pushup', 'row', 'squat', 'plank', 'lunge', 'hollow']),
    };
  }

  if (trainingDaysCount === 3) {
    const mod = slotIndex % 3;
    if (mod === 0) {
      return {
        title: 'Push + core',
        ids: trim(['pushup', 'dip', 'pike_pushup', 'plank', 'hollow']),
      };
    }
    if (mod === 1) {
      return {
        title: 'Pull + core',
        ids: trim(['pullup', 'row', 'scapular', 'hollow', 'plank']),
      };
    }
    return {
      title: 'Legs + core',
      ids: trim(['squat', 'lunge', 'plank', 'hollow', 'row']),
    };
  }

  const mod = slotIndex % 4;
  if (mod === 0) {
    return { title: 'Poussées', ids: trim(['pushup', 'dip', 'pike_pushup', 'plank', 'hollow']) };
  }
  if (mod === 1) {
    return { title: 'Tirages', ids: trim(['pullup', 'row', 'scapular', 'hollow', 'plank']) };
  }
  if (mod === 2) {
    return { title: 'Jambes', ids: trim(['squat', 'lunge', 'plank', 'hollow']) };
  }
  return {
    title: 'Technique & gainage',
    ids: trim(['scapular', 'pike_pushup', 'row', 'hollow', 'plank']),
  };
}

function resolveExercise(
  id: CalisExerciseId,
  level: AthleticLevel,
): CalisExercise & { displayName: string; displayCue: string } {
  const pick = BY_ID[id];
  const useBeginner = level === 'debutant' && pick.beginnerName;
  return {
    ...pick,
    displayName: useBeginner ? pick.beginnerName! : pick.name,
    displayCue: useBeginner && pick.beginnerCue ? pick.beginnerCue : pick.cue,
  };
}

function estimateDurationSec(steps: WorkoutStep[]): number {
  return steps.reduce((sum, st) => {
    if (st.durationSec) return sum + st.durationSec * (st.repeat ?? 1);
    return sum + 90;
  }, 0);
}

export function parseCalisthenicsGoal(raw?: string | null): CalisthenicsGoalFocus {
  if (raw === 'strength' || raw === 'hypertrophy' || raw === 'skill' || raw === 'endurance') {
    return raw;
  }
  if (raw === 'duathlon' || raw === 'biathlon' || raw === 'progress') return 'endurance';
  return 'hypertrophy';
}

export function buildCalisthenicsSession(opts: {
  date: string;
  slotIndex: number;
  trainingDaysCount: number;
  level: AthleticLevel;
  block: PeriodizationBlock;
  goal: CalisthenicsGoalFocus;
  weekIndex?: number;
}): PlannedWorkout {
  const slot = sessionExerciseIds(opts.trainingDaysCount, opts.slotIndex, opts.level);
  // Légère rotation semaine : permute le 1er accessoire, garde le pattern
  const rotatedIds =
    (opts.weekIndex ?? 0) % 2 === 1 && slot.ids.length >= 3
      ? [slot.ids[0]!, slot.ids[2]!, slot.ids[1]!, ...slot.ids.slice(3)]
      : slot.ids;

  const exercises = rotatedIds.map((id) => resolveExercise(id, opts.level));
  const prescriptions = exercises.map((ex) => prescriptionFor(ex, opts.goal, opts.level));

  const warmupSec = 3 * 60;
  const cooldownSec = 3 * 60;

  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: `Échauffement · ${warmupSec / 60} min`,
      endCondition: 'duration',
      durationSec: warmupSec,
    },
    ...exercises.map((ex, i) => {
      const meta = prescriptions[i]!;
      const workLabel =
        meta.holdSec != null
          ? `${ex.displayName} · ${meta.sets} × ${meta.holdSec}s · repos ${meta.restSec}s`
          : `${ex.displayName} · ${meta.sets} × ${meta.repsLabel} · repos ${meta.restSec}s`;
      const workSec =
        meta.holdSec != null
          ? meta.sets * meta.holdSec + (meta.sets - 1) * meta.restSec
          : meta.sets * 35 + (meta.sets - 1) * meta.restSec;
      return {
        id: `ex-${i}`,
        type: 'active' as const,
        label: `${formatCalisStepTag(meta)} ${workLabel}`,
        endCondition: 'duration' as const,
        // Durée bloc pour le résumé plan (le player guidé utilise le tag)
        durationSec: Math.min(12 * 60, Math.max(2 * 60, workSec + 20)),
      };
    }),
    {
      id: 'cd',
      type: 'cooldown',
      label: `Retour au calme · ${cooldownSec / 60} min`,
      endCondition: 'duration',
      durationSec: cooldownSec,
    },
  ];

  const goalTag =
    opts.goal === 'strength'
      ? 'force'
      : opts.goal === 'hypertrophy'
        ? 'muscle'
        : opts.goal === 'skill'
          ? 'contrôle'
          : 'endurance';

  const sampleRest = prescriptions[0]?.restSec ?? 90;

  return {
    id: `w-${opts.date}-calis`,
    title: `Callisthénie · ${slot.title} · ${goalTag}`,
    date: opts.date,
    discipline: 'strength',
    periodization: opts.block,
    plannedDurationSec: Math.min(50 * 60, Math.max(20 * 60, estimateDurationSec(steps))),
    coachNote: `Séries droites, repos courts (~${sampleRest} s). Tenues chronométrées ; pompes et tractions : touche Suivant.`,
    steps,
  };
}

export function calisthenicsFrequencyHint(days: number, goal: CalisthenicsGoalFocus): string {
  const split =
    days <= 2 ? 'full body' : days === 3 ? 'push / pull / legs' : 'push · pull · legs · technique';
  return `${days} séances/sem. · ${split} · objectif ${CALISTHENICS_GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? goal}`;
}

/** True si la séance planifiée est de la callisthénie (pas de RPE). */
export function isCalisthenicsWorkout(w: {
  title?: string;
  id?: string;
  expectedRpe?: number;
}): boolean {
  if (w.expectedRpe != null) return false;
  return Boolean(w.title?.startsWith('Callisthénie') || w.id?.includes('-calis'));
}

/** Microcycles type — labels coach / wizard. */
export type CalisProgramLevel = 'beginner' | 'intermediate' | 'advanced';

export const CALISTHENICS_PROGRAM_WEEKS: Record<
  CalisProgramLevel,
  { title: string; days: Array<{ dow: string; focus: string; detail: string }> }
> = {
  beginner: {
    title: 'Débutant 0–3 mois',
    days: [
      { dow: 'Lun', focus: 'Push + Core', detail: 'Pompes 4×12 · Gainage 3×30 s' },
      { dow: 'Mar', focus: 'Repos actif', detail: 'Mobilité épaules/hanches 15 min' },
      { dow: 'Mer', focus: 'Pull + Legs', detail: 'Australiennes 4×12 · Squats 3×15' },
      { dow: 'Jeu', focus: 'Repos', detail: 'Repos complet' },
      { dow: 'Ven', focus: 'Push + Pull', detail: 'Pompes 3×12 · Suspension active 3×20–30 s' },
      { dow: 'Sam', focus: 'Legs + Core', detail: 'Fentes 3×12 · Hollow 3×25 s' },
      { dow: 'Dim', focus: 'Repos', detail: 'Repos complet' },
    ],
  },
  intermediate: {
    title: 'Intermédiaire 3–12 mois',
    days: [
      { dow: 'Lun', focus: 'Push', detail: 'Pompes 4×10 · Dips 4×8 · Planche 3×40 s' },
      { dow: 'Mar', focus: 'Legs', detail: 'Squats 4×12 · Fentes 3×10 · Hollow 3×35 s' },
      { dow: 'Mer', focus: 'Repos', detail: 'Repos complet' },
      { dow: 'Jeu', focus: 'Pull', detail: 'Tractions 4×6 · Australiennes 3×10 · Scapular 3×25 s' },
      { dow: 'Ven', focus: 'Core', detail: 'Planche 4×40 s · Hollow 4×30 s' },
      { dow: 'Sam', focus: 'Full technique', detail: 'Pike 3×8 · Row 3×10 · Gainage' },
      { dow: 'Dim', focus: 'Repos', detail: 'Repos complet' },
    ],
  },
  advanced: {
    title: 'Avancé 12+ mois',
    days: [
      { dow: 'Lun', focus: 'Push force', detail: 'Dips 5×5 · Pike 4×6 · Planche 4×45 s' },
      { dow: 'Mar', focus: 'Legs', detail: 'Squats pistolet assistés · Nordic léger · Core' },
      { dow: 'Mer', focus: 'Repos', detail: 'Repos complet' },
      { dow: 'Jeu', focus: 'Pull force', detail: 'Tractions 5×5 · Rows · Scapular' },
      { dow: 'Ven', focus: 'Repos', detail: 'Repos complet' },
      { dow: 'Sam', focus: 'Core + skill', detail: 'Hollow · Planche · Suspension longue' },
      { dow: 'Dim', focus: 'Repos', detail: 'Repos complet' },
    ],
  },
};

export function calisProgramLevelFromTemplateId(
  templateId?: string | null,
): CalisProgramLevel {
  if (templateId === 'prog-calisthenics-strength') return 'intermediate';
  if (templateId === 'prog-calisthenics-endurance') return 'advanced';
  return 'beginner';
}

/** Séance de callisthénie du planning (id `w-<date>-calis`, éventuellement préfixé par le programme). */
export function isCalisPlanned(w: { id: string; title?: string }): boolean {
  return /-calis$/.test(w.id) || /^Callisthénie/i.test(w.title ?? '');
}

/**
 * Jamais deux séances de callisthénie le même jour : garde la première par date
 * (les séances déjà présentes dans `already` sont prioritaires).
 */
export function dedupeCalisthenicsPerDay<T extends { id: string; title?: string; date: string }>(
  workouts: T[],
  already: Array<{ id: string; title?: string; date: string }> = [],
): T[] {
  const taken = new Set(already.filter(isCalisPlanned).map((w) => w.date));
  return workouts.filter((w) => {
    if (!isCalisPlanned(w)) return true;
    if (taken.has(w.date)) return false;
    taken.add(w.date);
    return true;
  });
}
