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
    desc: 'Beaucoup de répétitions, repos courts (30 s)',
  },
  {
    id: 'hypertrophy',
    // La prise de masse relève de la Musculation (charges additionnelles) ; ici : volume au poids du corps.
    label: 'Volume & maîtrise',
    desc: '8–12 reps propres, repos ~30–45 s — pour la prise de masse, choisis Musculation',
  },
  {
    id: 'strength',
    label: 'Devenir plus fort',
    desc: 'Progressions difficiles, 3–6 reps, repos 45–60 s',
  },
  {
    id: 'skill',
    label: 'Contrôle & gainage',
    desc: 'Tenues, qualité du mouvement, repos courts',
  },
];

type MovementPattern = 'push' | 'pull' | 'legs' | 'core' | 'skill';

/** Zone du corps travaillée : tout le corps, le haut ou le bas. */
export type CalisScope = 'full' | 'upper' | 'lower';
/** Cible précise (plusieurs possibles) : quand elle est choisie, elle prime sur la zone. */
export type CalisTarget = 'abs' | 'back' | 'arms' | 'legs' | 'chest';

export const CALIS_SCOPE_OPTIONS: Array<{ id: CalisScope; label: string; desc: string }> = [
  { id: 'full', label: 'Ensemble du corps', desc: 'Pousser, tirer, jambes, abdos : tout est travaillé' },
  { id: 'upper', label: 'Haut du corps', desc: 'Pectoraux, épaules, dos, bras, abdos' },
  { id: 'lower', label: 'Bas du corps', desc: 'Cuisses, fessiers, mollets' },
];

export const CALIS_TARGET_OPTIONS: Array<{ id: CalisTarget; label: string }> = [
  { id: 'abs', label: 'Abdos' },
  { id: 'back', label: 'Dos' },
  { id: 'arms', label: 'Bras' },
  { id: 'legs', label: 'Jambes' },
  { id: 'chest', label: 'Pectoraux & épaules' },
];

export function parseCalisScope(raw?: string | null): CalisScope {
  return raw === 'upper' || raw === 'lower' ? raw : 'full';
}

export function parseCalisTargets(raw?: string[] | string | null): CalisTarget[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const ok = new Set<string>(CALIS_TARGET_OPTIONS.map((t) => t.id));
  return list.map((x) => x.trim()).filter((x): x is CalisTarget => ok.has(x));
}

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
  | 'scapular'
  | 'wide_pushup'
  | 'diamond_pushup'
  | 'chinup'
  | 'leg_raise'
  | 'crunch'
  | 'bicycle'
  | 'dead_bug'
  | 'mountain_climber'
  | 'side_plank'
  | 'superman'
  | 'bird_dog'
  | 'bulgarian'
  | 'glute_bridge'
  | 'calf_raise'
  | 'wall_sit'
  | 'jump_squat'
  | 'single_leg_rdl'
  | 'hanging_knee_raise';

type CalisExercise = {
  id: CalisExerciseId;
  name: string;
  pattern: MovementPattern;
  /** Muscles ciblés (sert aux séances « abdos », « dos », « bras »…). */
  targets?: CalisTarget[];
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
    targets: ['chest', 'arms'],
    name: 'Pompes',
    pattern: 'push',
    cue: 'Corps gainé, coudes ~45°, poitrine près du sol, poussée contrôlée.',
    beginnerName: 'Pompes surélevées (mains sur un banc)',
    beginnerCue: 'Mains plus hautes que les pieds — ligne épaules-hanches-chevilles.',
  },
  {
    id: 'pike_pushup',
    targets: ['chest', 'arms'],
    name: 'Pompes pike',
    pattern: 'push',
    cue: 'Bassin haut, tête entre les mains — travail d’épaules type développé.',
    beginnerName: 'Pompes pike partielles',
    beginnerCue: 'Amplitude courte, bassin haut, coudes stables.',
  },
  {
    id: 'dip',
    targets: ['arms', 'chest'],
    name: 'Dips (barres ou banc)',
    pattern: 'push',
    cue: 'Épaules basses, descendre ~90° aux coudes, remonter sans se balancer.',
    beginnerName: 'Dips assistés (pieds au sol)',
    beginnerCue: 'Aide légère des jambes, descente en 2–3 s.',
  },
  {
    id: 'pullup',
    targets: ['back', 'arms'],
    name: 'Tractions',
    pattern: 'pull',
    cue: 'Omoplates engagées, menton au-dessus de la barre, descente contrôlée.',
    beginnerName: 'Tractions négatives / australiennes',
    beginnerCue: 'Descente 3–5 s depuis le haut, ou tire sous une barre basse.',
  },
  {
    id: 'row',
    targets: ['back'],
    name: 'Rowings australiens',
    pattern: 'pull',
    cue: 'Corps gainé sous la barre, poitrine vers la barre, dos serré.',
  },
  {
    id: 'squat',
    targets: ['legs'],
    name: 'Squats poids du corps',
    pattern: 'legs',
    cue: 'Pieds largeur d’épaules, genoux dans l’axe, hanches sous les genoux si mobilité OK.',
  },
  {
    id: 'lunge',
    targets: ['legs'],
    name: 'Fentes arrière',
    pattern: 'legs',
    cue: 'Grand pas en arrière, genou avant stable, torse droit — alterne chaque jambe.',
  },
  {
    id: 'plank',
    targets: ['abs'],
    name: 'Planche avant',
    pattern: 'core',
    isometric: true,
    cue: 'Avant-bras au sol, bassin neutre, ne creuse pas le dos.',
  },
  {
    id: 'hollow',
    targets: ['abs'],
    name: 'Hollow body hold',
    pattern: 'core',
    isometric: true,
    cue: 'Bas du dos plaqué, bras et jambes légèrement décollés — gainage gymnastique.',
    beginnerName: 'Hollow tuck (genoux pliés)',
    beginnerCue: 'Bas du dos plaqué, genoux fléchis pour alléger.',
  },
  {
    id: 'scapular',
    targets: ['back'],
    name: 'Suspension active (scapular pulls)',
    pattern: 'skill',
    isometric: true,
    cue: 'Pendu bras tendus : baisse / lève les omoplates sans plier les coudes.',
  },
  {
    id: 'wide_pushup',
    targets: ['chest'],
    name: 'Pompes larges',
    pattern: 'push',
    cue: 'Mains plus larges que les épaules, poitrine vers le sol, corps gainé.',
    beginnerName: 'Pompes larges sur les genoux',
    beginnerCue: 'Genoux au sol, dos droit, descente contrôlée.',
  },
  {
    id: 'diamond_pushup',
    targets: ['arms', 'chest'],
    name: 'Pompes diamant',
    pattern: 'push',
    cue: 'Mains rapprochées sous la poitrine, coudes le long du corps — triceps.',
    beginnerName: 'Pompes diamant sur les genoux',
    beginnerCue: 'Genoux au sol, mains rapprochées, amplitude courte.',
  },
  {
    id: 'chinup',
    targets: ['arms', 'back'],
    name: 'Tractions supination',
    pattern: 'pull',
    cue: 'Paumes vers toi, tire les coudes vers les hanches — biceps et dos.',
    beginnerName: 'Tractions supination négatives',
    beginnerCue: 'Monte en sautant, descends en 3–5 s.',
  },
  {
    id: 'leg_raise',
    targets: ['abs'],
    name: 'Relevés de jambes',
    pattern: 'core',
    cue: 'Allongé, bas du dos plaqué, monte les jambes tendues sans cambrer.',
    beginnerName: 'Relevés de genoux allongé',
    beginnerCue: 'Genoux pliés, bas du dos plaqué, mouvement lent.',
  },
  {
    id: 'crunch',
    targets: ['abs'],
    name: 'Crunchs',
    pattern: 'core',
    cue: 'Enroule le buste, menton neutre, expire en montant.',
  },
  {
    id: 'bicycle',
    targets: ['abs'],
    name: 'Crunchs bicyclette',
    pattern: 'core',
    cue: 'Coude vers le genou opposé, jambe tendue, rythme contrôlé.',
  },
  {
    id: 'dead_bug',
    targets: ['abs'],
    name: 'Dead bug',
    pattern: 'core',
    cue: 'Bras et jambe opposés descendent lentement, bas du dos collé au sol.',
  },
  {
    id: 'mountain_climber',
    targets: ['abs', 'legs'],
    name: 'Mountain climbers',
    pattern: 'core',
    cue: 'En appui sur les mains, ramène les genoux vers la poitrine, hanches basses.',
  },
  {
    id: 'side_plank',
    targets: ['abs'],
    name: 'Planche latérale',
    pattern: 'core',
    isometric: true,
    cue: 'Sur l’avant-bras, corps aligné, hanches hautes — change de côté à chaque série.',
  },
  {
    id: 'superman',
    targets: ['back'],
    name: 'Superman (extension du dos)',
    pattern: 'core',
    isometric: true,
    cue: 'À plat ventre, bras et jambes décollés, regard au sol — serre le dos et les fessiers.',
  },
  {
    id: 'bird_dog',
    targets: ['back', 'abs'],
    name: 'Bird dog',
    pattern: 'core',
    cue: 'À quatre pattes, tends bras et jambe opposés, dos plat, sans balancer.',
  },
  {
    id: 'bulgarian',
    targets: ['legs'],
    name: 'Fentes bulgares',
    pattern: 'legs',
    cue: 'Pied arrière sur un banc, descends verticalement, genou avant dans l’axe.',
    beginnerName: 'Fentes avant statiques',
    beginnerCue: 'Un grand pas, descends droit, remonte en poussant sur le talon.',
  },
  {
    id: 'glute_bridge',
    targets: ['legs'],
    name: 'Pont fessier',
    pattern: 'legs',
    cue: 'Allongé, pousse les hanches vers le haut, serre les fessiers 1 s en haut.',
  },
  {
    id: 'calf_raise',
    targets: ['legs'],
    name: 'Montées sur pointes',
    pattern: 'legs',
    cue: 'Monte haut sur la pointe des pieds, descends lentement, sur une marche si possible.',
  },
  {
    id: 'wall_sit',
    targets: ['legs'],
    name: 'Chaise contre le mur',
    pattern: 'legs',
    isometric: true,
    cue: 'Dos plaqué au mur, cuisses parallèles au sol, genoux à 90°.',
  },
  {
    id: 'jump_squat',
    targets: ['legs'],
    name: 'Squats sautés',
    pattern: 'legs',
    cue: 'Descends en squat, saute, réceptionne en souplesse.',
    beginnerName: 'Montées sur pointes dynamiques',
    beginnerCue: 'Petits rebonds sur les pointes, genoux souples.',
  },
  {
    id: 'single_leg_rdl',
    targets: ['legs', 'back'],
    name: 'Soulevé de terre une jambe',
    pattern: 'legs',
    cue: 'Bascule le buste en levant une jambe derrière, dos plat, hanches alignées.',
  },
  {
    id: 'hanging_knee_raise',
    targets: ['abs'],
    name: 'Relevés de genoux suspendu',
    pattern: 'core',
    cue: 'Pendu à la barre, monte les genoux vers la poitrine sans balancer.',
    beginnerName: 'Relevés de genoux allongé',
    beginnerCue: 'Genoux pliés, bas du dos plaqué, mouvement lent.',
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
 * - tenues / gainage / isolation : 30 s ;
 * - poids du corps de base (pompes, squats, fentes, rowing) : 30 s (45 s en force) ;
 * - mouvements intenses (tractions, dips) : 40–60 s.
 * 50 s après 12 pompes ou 1 min 15 après des dips, c'est trop : le muscle refroidit et la séance s'allonge pour rien.
 */
export function restForExercise(ex: { id: string; isometric?: boolean }, goal: CalisthenicsGoalFocus): number {
  if (ex.isometric) return 30;
  if (ex.id === 'pullup' || ex.id === 'dip') {
    return goal === 'endurance' ? 40 : goal === 'hypertrophy' ? 45 : 60;
  }
  return goal === 'strength' ? 45 : goal === 'skill' ? 40 : 30;
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

const REGION_OF_PATTERN: Record<MovementPattern, 'upper' | 'lower' | 'core'> = {
  push: 'upper',
  pull: 'upper',
  legs: 'lower',
  core: 'core',
  skill: 'upper',
};

/** Séances ciblées : exercices de la bibliothèque qui travaillent les cibles demandées, en alternant. */
function targetedSlot(
  scope: CalisScope,
  targets: CalisTarget[],
  slotIndex: number,
  level: AthleticLevel,
): { title: string; ids: CalisExerciseId[] } {
  const want = level === 'debutant' ? 4 : level === 'intermediaire' ? 5 : 6;
  const allowed = LIBRARY.filter((e) => {
    const region = REGION_OF_PATTERN[e.pattern];
    if (scope === 'upper') return region !== 'lower';
    if (scope === 'lower') return region !== 'upper';
    return true;
  });
  // Une liste par cible : les exercices dont c'est la cible PRINCIPALE d'abord.
  const lists = targets.map((t) => {
    const hits = allowed.filter((e) => e.targets?.includes(t));
    const primary = hits.filter((e) => e.targets![0] === t);
    const rest = hits.filter((e) => e.targets![0] !== t);
    return [...primary, ...rest].map((e) => e.id);
  });
  const chosen: CalisExerciseId[] = [];
  // Rotation : chaque séance de la semaine commence à un endroit différent de la liste.
  let round = 0;
  while (chosen.length < want && round < 12) {
    for (let t = 0; t < lists.length && chosen.length < want; t++) {
      const list = lists[t]!;
      if (list.length === 0) continue;
      const id = list[(slotIndex * 2 + round) % list.length]!;
      if (!chosen.includes(id)) chosen.push(id);
    }
    round += 1;
  }
  const label = targets.map((t) => CALIS_TARGET_OPTIONS.find((o) => o.id === t)!.label).join(' + ');
  return { title: label, ids: chosen };
}

/** Ordre fixe type coach callisthénie — pas un tirage aléatoire. */
function sessionExerciseIds(
  trainingDaysCount: number,
  slotIndex: number,
  level: AthleticLevel,
  scope: CalisScope = 'full',
  targets: CalisTarget[] = [],
  weekIndex = 0,
): { title: string; ids: CalisExerciseId[] } {
  const trim = (ids: CalisExerciseId[]): CalisExerciseId[] => {
    if (level === 'debutant') return ids.slice(0, 4);
    if (level === 'intermediaire') return ids.slice(0, 5);
    return ids;
  };
  // Gainage qui change d'une semaine à l'autre : les abdos ne se réduisent pas à la planche.
  const CORE_ROT: CalisExerciseId[] = ['plank', 'leg_raise', 'hollow', 'side_plank', 'dead_bug'];
  const core = (k = 0) => CORE_ROT[(weekIndex + slotIndex + k) % CORE_ROT.length]!;

  if (targets.length > 0) return targetedSlot(scope, targets, slotIndex, level);

  if (scope === 'upper') {
    const mod = slotIndex % 3;
    if (mod === 0) return { title: 'Haut du corps · poussée', ids: trim(['pushup', 'dip', 'pike_pushup', 'diamond_pushup', core()]) };
    if (mod === 1) return { title: 'Haut du corps · tirage', ids: trim(['pullup', 'row', 'chinup', 'scapular', 'superman']) };
    return { title: 'Haut du corps · bras & abdos', ids: trim(['diamond_pushup', 'chinup', 'dip', 'row', core(1)]) };
  }

  if (scope === 'lower') {
    const mod = slotIndex % 3;
    if (mod === 0) return { title: 'Jambes · force', ids: trim(['squat', 'bulgarian', 'lunge', 'calf_raise', 'wall_sit']) };
    if (mod === 1) return { title: 'Jambes · fessiers', ids: trim(['glute_bridge', 'single_leg_rdl', 'lunge', 'jump_squat', 'calf_raise']) };
    return { title: 'Jambes + gainage', ids: trim(['squat', 'glute_bridge', 'wall_sit', core(), 'leg_raise']) };
  }

  if (trainingDaysCount <= 2) {
    // Full body A / B : chaque séance couvre pousser, tirer, jambes ET abdos.
    return slotIndex % 2 === 0
      ? { title: 'Full body', ids: trim(['pushup', 'row', 'squat', core(), 'lunge', 'hollow']) }
      : { title: 'Full body', ids: trim(['pullup', 'dip', 'bulgarian', 'leg_raise', 'glute_bridge', 'superman']) };
  }

  if (trainingDaysCount === 3) {
    const mod = slotIndex % 3;
    if (mod === 0) {
      return { title: 'Push + core', ids: trim(['pushup', 'dip', 'pike_pushup', 'diamond_pushup', core()]) };
    }
    if (mod === 1) {
      return { title: 'Pull + core', ids: trim(['pullup', 'row', 'chinup', 'superman', core(1)]) };
    }
    return { title: 'Legs + core', ids: trim(['squat', 'lunge', 'glute_bridge', core(), 'calf_raise']) };
  }

  const mod = slotIndex % 4;
  if (mod === 0) {
    return { title: 'Poussées', ids: trim(['pushup', 'dip', 'pike_pushup', 'diamond_pushup', core()]) };
  }
  if (mod === 1) {
    return { title: 'Tirages', ids: trim(['pullup', 'row', 'chinup', 'scapular', 'superman']) };
  }
  if (mod === 2) {
    return { title: 'Jambes', ids: trim(['squat', 'bulgarian', 'glute_bridge', 'calf_raise', 'wall_sit']) };
  }
  return { title: 'Bras & abdos', ids: trim(['diamond_pushup', 'chinup', 'leg_raise', 'side_plank', 'crunch']) };
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
  /** Zone du corps (défaut : ensemble). */
  scope?: CalisScope;
  /** Cibles précises (abdos, dos, bras, jambes, pectoraux) : priment sur la zone. */
  targets?: CalisTarget[];
}): PlannedWorkout {
  const slot = sessionExerciseIds(
    opts.trainingDaysCount,
    opts.slotIndex,
    opts.level,
    opts.scope ?? 'full',
    opts.targets ?? [],
    opts.weekIndex ?? 0,
  );
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
