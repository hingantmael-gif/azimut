import type { AthleticLevel, PeriodizationBlock, PlannedWorkout, WorkoutStep } from '../types/domain';
import {
  dumbbellOneRmFactor,
  dumbbellRestSec,
  formatDumbbellLoadHint,
} from './sportsScience';

/**
 * Programmation musculation — Schoenfeld + référentiel haltères Azimut.
 */

export type StrengthEquipment =
  | 'gym'
  | 'home_dumbbells'
  | 'home_machines'
  | 'bodyweight'
  | 'bands';

export type StrengthGoalFocus = 'fitness' | 'hypertrophy' | 'power';

/** Zones musculaires ciblées par le programme */
export type StrengthBodyFocus = 'upper' | 'lower' | 'full';

export const STRENGTH_EQUIPMENT_OPTIONS: Array<{
  id: StrengthEquipment;
  label: string;
  desc: string;
}> = [
  {
    id: 'gym',
    label: 'Salle de sport',
    desc: 'Tu as accès à une salle (machines, barres, haltères…)',
  },
  {
    id: 'home_dumbbells',
    label: 'Haltères à la maison',
    desc: 'Quelques haltères ou kettlebells, sans grosse salle',
  },
  {
    id: 'home_machines',
    label: 'Quelques machines à la maison',
    desc: 'Banc, presse ou poulie — matériel limité',
  },
  {
    id: 'bodyweight',
    label: 'Sans matériel',
    desc: 'Uniquement ton poids du corps (sol, chaise…)',
  },
  {
    id: 'bands',
    label: 'Élastiques',
    desc: 'Bandes de résistance (éventuellement + petits haltères)',
  },
];

export const STRENGTH_GOAL_OPTIONS: Array<{
  id: StrengthGoalFocus;
  label: string;
  desc: string;
}> = [
  {
    id: 'fitness',
    label: 'Me sentir mieux / tonifier',
    desc: 'Séances accessibles, plus de répétitions, moins lourd',
  },
  {
    id: 'hypertrophy',
    label: 'Prendre du muscle',
    desc: 'Environ 8 à 12 répétitions par série — volume régulier',
  },
  {
    id: 'power',
    label: 'Devenir plus fort',
    desc: 'Charges plus lourdes, peu de répétitions (3 à 6), repos plus longs',
  },
];

export const STRENGTH_BODY_FOCUS_OPTIONS: Array<{
  id: StrengthBodyFocus;
  label: string;
  desc: string;
}> = [
  {
    id: 'upper',
    label: 'Haut du corps',
    desc: 'Poitrine, dos, épaules et bras',
  },
  {
    id: 'lower',
    label: 'Bas du corps',
    desc: 'Cuisses (devant et derrière), fessiers et mollets',
  },
  {
    id: 'full',
    label: 'Tout le corps',
    desc: 'On alterne haut et bas — programme complet',
  },
];

/** Normalise l'ancien format (string) ou le nouveau (tableau). */
export function normalizeStrengthEquipment(
  raw?: string | string[] | null,
): StrengthEquipment[] {
  if (!raw) return [];
  const ids = Array.isArray(raw) ? raw : [raw];
  const valid: StrengthEquipment[] = [];
  for (const id of ids) {
    if (
      id === 'gym' ||
      id === 'home_dumbbells' ||
      id === 'home_machines' ||
      id === 'bodyweight' ||
      id === 'bands'
    ) {
      if (!valid.includes(id)) valid.push(id);
    }
  }
  return valid;
}

type MuscleGroup =
  | 'quads'
  | 'hams'
  | 'glutes'
  | 'push'
  | 'pull'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'calves';

type ExerciseDef = {
  name: string;
  muscles: MuscleGroup[];
  equipment: StrengthEquipment[];
  /** Consigne courte pour l’athlète */
  cue?: string;
  /** % 1RM cible (avant ajustement haltères) */
  oneRmPct?: number;
};

/** Bibliothèque d’exercices — référentiel haltères + salle / poids du corps. */
const EXERCISE_LIBRARY: ExerciseDef[] = [
  // ——— Poitrine (haltères) ———
  {
    name: 'Développé couché avec haltères',
    muscles: ['push'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Allongé sur un banc, pousser les haltères verticalement en gardant les omoplates resserrées.',
    oneRmPct: 70,
  },
  {
    name: 'Développé incliné avec haltères',
    muscles: ['push'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Banc incliné, pousser les haltères vers le haut pour cibler le haut de la poitrine.',
    oneRmPct: 65,
  },
  {
    name: 'Écarté couché avec haltères',
    muscles: ['push'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Écarter les bras en arc avec les coudes légèrement fléchis, puis ramener au-dessus de la poitrine.',
    oneRmPct: 45,
  },
  {
    name: 'Pull-over avec haltère',
    muscles: ['push', 'pull'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Descendre un haltère tenu à deux mains derrière la tête puis le ramener au-dessus de la poitrine.',
    oneRmPct: 40,
  },
  {
    name: 'Pompes sur haltères',
    muscles: ['push'],
    equipment: ['home_dumbbells', 'bodyweight'],
    cue: 'En appui sur les haltères, fléchir jusqu’à frôler le sol puis repousser.',
  },
  // ——— Dos (haltères) ———
  {
    name: 'Rowing unilatéral avec haltère',
    muscles: ['pull'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Un genou sur le banc, tirer l’haltère vers la hanche en gardant le dos droit.',
    oneRmPct: 55,
  },
  {
    name: 'Rowing buste penché avec haltères',
    muscles: ['pull'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Buste penché, tirer les deux haltères vers le nombril en resserrant les omoplates.',
    oneRmPct: 50,
  },
  {
    name: 'Soulevé de terre jambes tendues avec haltères',
    muscles: ['hams', 'glutes'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Basculer le bassin en arrière en descendant les haltères le long des tibias.',
    oneRmPct: 55,
  },
  {
    name: 'Oiseau avec haltères',
    muscles: ['pull', 'shoulders'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Buste penché, élever les bras sur les côtés (arrière d’épaules / haut du dos).',
    oneRmPct: 30,
  },
  // ——— Épaules ———
  {
    name: 'Développé assis avec haltères',
    muscles: ['shoulders'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Assis dos droit, développer au-dessus de la tête sans creuser le bas du dos.',
    oneRmPct: 55,
  },
  {
    name: 'Élévations latérales avec haltères',
    muscles: ['shoulders'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Élever les bras sur les côtés jusqu’à la hauteur des épaules.',
    oneRmPct: 30,
  },
  {
    name: 'Élévations frontales avec haltères',
    muscles: ['shoulders'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Élever les haltères un à un devant soi jusqu’à la hauteur des yeux.',
    oneRmPct: 30,
  },
  {
    name: 'Shrugs avec haltères',
    muscles: ['shoulders'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Hausser les épaules vers les oreilles pour solliciter les trapèzes.',
    oneRmPct: 50,
  },
  // ——— Jambes & fessiers ———
  {
    name: 'Goblet Squat avec haltère',
    muscles: ['quads', 'glutes'],
    equipment: ['home_dumbbells', 'gym', 'home_machines'],
    cue: 'Haltère contre la poitrine, fléchir les genoux en gardant le dos droit.',
    oneRmPct: 50,
  },
  {
    name: 'Fentes marchées avec haltères',
    muscles: ['quads', 'glutes'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Pas en avant, haltère dans chaque main, genou arrière vers le sol.',
    oneRmPct: 40,
  },
  {
    name: 'Squat bulgare avec haltères',
    muscles: ['quads', 'glutes'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Un pied sur un banc derrière soi, fléchir la jambe avant en tenant les haltères.',
    oneRmPct: 40,
  },
  {
    name: 'Hip Thrust avec haltère',
    muscles: ['glutes'],
    equipment: ['home_dumbbells', 'home_machines', 'gym'],
    cue: 'Haut du dos sur un banc, haltère sur le bassin, pousser avec les talons.',
    oneRmPct: 55,
  },
  {
    name: 'Extension des mollets debout avec haltères',
    muscles: ['calves'],
    equipment: ['home_dumbbells', 'gym', 'bodyweight'],
    cue: 'Monter sur la pointe des pieds en tenant un haltère dans chaque main.',
    oneRmPct: 50,
  },
  // ——— Bras ———
  {
    name: 'Curl biceps avec haltères',
    muscles: ['arms'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Fléchir les coudes en tournant les paumes vers le haut sans bouger les épaules.',
    oneRmPct: 40,
  },
  {
    name: 'Curl marteau avec haltères',
    muscles: ['arms'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Fléchir les coudes paumes face à face pour cibler le brachial.',
    oneRmPct: 40,
  },
  {
    name: 'Curl concentré avec haltère',
    muscles: ['arms'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Assis, coude contre l’intérieur de la cuisse, fléchir le bras.',
    oneRmPct: 35,
  },
  {
    name: 'Extension triceps au-dessus de la tête',
    muscles: ['arms'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Haltère à deux mains derrière la tête, tendre les bras vers le haut.',
    oneRmPct: 40,
  },
  {
    name: 'Kickback triceps avec haltère',
    muscles: ['arms'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Buste penché, tendre le bras vers l’arrière en verrouillant le coude.',
    oneRmPct: 30,
  },
  {
    name: 'Développé couché prise serrée avec haltères',
    muscles: ['arms', 'push'],
    equipment: ['home_dumbbells', 'gym'],
    cue: 'Pousser deux haltères collés l’un contre l’autre pour solliciter les triceps.',
    oneRmPct: 55,
  },
  // ——— Salle / machines (complément) ———
  { name: 'Squat arrière (barre)', muscles: ['quads', 'glutes'], equipment: ['gym'], cue: 'Fléchir en poussant les fesses en arrière jusqu’à la parallèle.', oneRmPct: 70 },
  { name: 'Presse à cuisses', muscles: ['quads', 'glutes'], equipment: ['gym', 'home_machines'], cue: 'Pousser le plateau avec les talons sans verrouiller brutalement.', oneRmPct: 70 },
  { name: 'Leg extension', muscles: ['quads'], equipment: ['gym', 'home_machines'], oneRmPct: 50 },
  { name: 'Leg curl allongé', muscles: ['hams'], equipment: ['gym', 'home_machines'], cue: 'Ramener le boudin vers les fessiers.', oneRmPct: 50 },
  { name: 'Soulevé de terre roumain (barre)', muscles: ['hams', 'glutes'], equipment: ['gym'], oneRmPct: 60 },
  { name: 'Hip thrust (barre)', muscles: ['glutes'], equipment: ['gym'], oneRmPct: 70 },
  { name: 'Mollets debout (machine)', muscles: ['calves'], equipment: ['gym', 'home_machines'], oneRmPct: 60 },
  { name: 'Développé couché (barre)', muscles: ['push'], equipment: ['gym'], cue: 'Pousser verticalement, omoplates resserrées.', oneRmPct: 70 },
  { name: 'Développé machine / smith', muscles: ['push'], equipment: ['gym', 'home_machines'], oneRmPct: 65 },
  { name: 'Tirage vertical (poulie)', muscles: ['pull'], equipment: ['gym', 'home_machines'], oneRmPct: 55 },
  { name: 'Rowing barre', muscles: ['pull'], equipment: ['gym'], cue: 'Buste penché, tirer la barre contre le bas de la poitrine.', oneRmPct: 55 },
  { name: 'Tractions assistées / négatives', muscles: ['pull'], equipment: ['gym', 'bodyweight'], cue: 'Tirer les coudes vers le bas pour monter le menton.', oneRmPct: 0 },
  { name: 'Face pull (poulie / élastique)', muscles: ['pull', 'shoulders'], equipment: ['gym', 'bands', 'home_machines'], oneRmPct: 35 },
  // ——— Poids du corps / bandes ———
  { name: 'Pompes classiques', muscles: ['push'], equipment: ['bodyweight', 'bands'], cue: 'Gainage plat, fléchir jusqu’à frôler le sol puis repousser.' },
  { name: 'Pompes surélevées (mains sur chaise)', muscles: ['push'], equipment: ['bodyweight'] },
  { name: 'Fentes arrière au poids du corps', muscles: ['quads', 'glutes'], equipment: ['bodyweight', 'bands'] },
  { name: 'Squat au poids du corps', muscles: ['quads', 'glutes'], equipment: ['bodyweight', 'bands'] },
  { name: 'Pont fessier au sol', muscles: ['glutes'], equipment: ['bodyweight', 'bands'] },
  { name: 'Mollets unipodaux (poids du corps)', muscles: ['calves'], equipment: ['bodyweight', 'bands', 'home_dumbbells'] },
  { name: 'Good morning élastique', muscles: ['hams', 'glutes'], equipment: ['bands'] },
  { name: 'Développé élastique (chest press)', muscles: ['push'], equipment: ['bands'] },
  { name: 'Rowing élastique', muscles: ['pull'], equipment: ['bands', 'bodyweight'] },
  { name: 'Superman / Y-raise au sol', muscles: ['pull'], equipment: ['bodyweight'] },
  { name: 'Élévations latérales élastique', muscles: ['shoulders'], equipment: ['bands'] },
  { name: 'Pike push-ups', muscles: ['shoulders'], equipment: ['bodyweight'] },
  // ——— Core ———
  { name: 'Planche frontale', muscles: ['core'], equipment: ['bodyweight', 'bands', 'home_dumbbells', 'gym', 'home_machines'] },
  { name: 'Gainage latéral', muscles: ['core'], equipment: ['bodyweight', 'bands', 'home_dumbbells', 'gym', 'home_machines'] },
  { name: 'Dead bug', muscles: ['core'], equipment: ['bodyweight', 'bands', 'home_dumbbells', 'gym', 'home_machines'] },
  { name: 'Crunch machine / crunch au sol', muscles: ['core'], equipment: ['gym', 'bodyweight', 'home_machines'] },

  // ——— Variantes maison / poids du corps / bandes (plus de choix) ———
  { name: 'Pompes diamant', muscles: ['push', 'arms'], equipment: ['bodyweight'], cue: 'Mains sous la poitrine, coudes près du corps.' },
  { name: 'Pompes pieds surélevés', muscles: ['push'], equipment: ['bodyweight'] },
  { name: 'Dips sur chaise', muscles: ['push', 'arms'], equipment: ['bodyweight'], cue: 'Fessiers près de la chaise, descendre contrôlé.' },
  { name: 'Squat sumo au poids du corps', muscles: ['quads', 'glutes'], equipment: ['bodyweight', 'bands'] },
  { name: 'Fentes marchées', muscles: ['quads', 'glutes'], equipment: ['bodyweight', 'bands', 'home_dumbbells'] },
  { name: 'Step-up sur chaise', muscles: ['quads', 'glutes'], equipment: ['bodyweight', 'home_dumbbells'] },
  { name: 'Pont fessier une jambe', muscles: ['glutes', 'hams'], equipment: ['bodyweight', 'bands'] },
  { name: 'Bird-dog', muscles: ['core', 'pull'], equipment: ['bodyweight'] },
  { name: 'Mountain climbers contrôlés', muscles: ['core', 'push'], equipment: ['bodyweight'] },
  { name: 'Hollow hold', muscles: ['core'], equipment: ['bodyweight'] },
  { name: 'Traction australienne (table)', muscles: ['pull'], equipment: ['bodyweight'], cue: 'Corps gainé, tirer la poitrine vers le bord.' },
  { name: 'Squat + press élastique', muscles: ['quads', 'shoulders'], equipment: ['bands'] },
  { name: 'Pull-apart élastique', muscles: ['pull', 'shoulders'], equipment: ['bands'] },
  { name: 'Banded glute bridge', muscles: ['glutes'], equipment: ['bands', 'bodyweight'] },
  { name: 'Curl biceps élastique', muscles: ['arms'], equipment: ['bands'] },
  { name: 'Extension triceps élastique', muscles: ['arms'], equipment: ['bands'] },
  { name: 'Kick-back fessier élastique', muscles: ['glutes'], equipment: ['bands'] },
  { name: 'Presse unilatérale (machine)', muscles: ['quads', 'glutes'], equipment: ['home_machines', 'gym'], oneRmPct: 55 },
  { name: 'Pec deck / butterfly machine', muscles: ['push'], equipment: ['home_machines', 'gym'], oneRmPct: 50 },
  { name: 'Tirage horizontal machine', muscles: ['pull'], equipment: ['home_machines', 'gym'], oneRmPct: 55 },
  { name: 'Élévations latérales machine', muscles: ['shoulders'], equipment: ['home_machines', 'gym'], oneRmPct: 40 },
  { name: 'Curl pupitre / machine biceps', muscles: ['arms'], equipment: ['home_machines', 'gym'], oneRmPct: 45 },
];

type Scheme = {
  sets: number;
  repsLabel: string;
  restSec: number;
  loadHint: string;
  rpe: number;
  oneRmPct: number;
};

function schemeFor(
  goal: StrengthGoalFocus,
  level: AthleticLevel,
  equipment: StrengthEquipment[],
): Scheme {
  const baseSets = level === 'debutant' ? 2 : level === 'intermediaire' ? 3 : 4;
  const dumbbellOnly =
    equipment.includes('home_dumbbells') &&
    !equipment.includes('gym') &&
    !equipment.includes('home_machines');
  const restSec = dumbbellOnly ? dumbbellRestSec(goal) : goal === 'power' ? 180 : goal === 'hypertrophy' ? 90 : 60;

  if (goal === 'power') {
    const pct = 85;
    return {
      sets: Math.min(baseSets, 4),
      repsLabel: '3–5',
      restSec: Math.max(restSec, 150),
      loadHint: dumbbellOnly
        ? `${formatDumbbellLoadHint(pct, level)} · explosif · RIR 1–2`
        : 'Charge lourde · explosif · 2–3 reps en réserve (>85 % 1RM)',
      rpe: 9,
      oneRmPct: dumbbellOnly ? Math.round(pct * dumbbellOneRmFactor(level)) : pct,
    };
  }
  if (goal === 'hypertrophy') {
    const pct = 70;
    return {
      sets: baseSets,
      repsLabel: '8–12',
      restSec,
      loadHint: dumbbellOnly
        ? `${formatDumbbellLoadHint(pct, level)} · RIR 1–3 · repos 60–90 s`
        : '65–85 % 1RM · proche de l’échec (RIR 1–3)',
      rpe: 7,
      oneRmPct: dumbbellOnly ? Math.round(pct * dumbbellOneRmFactor(level)) : pct,
    };
  }
  const pct = 55;
  return {
    sets: baseSets,
    repsLabel: '12–15',
    restSec,
    loadHint: dumbbellOnly
      ? `${formatDumbbellLoadHint(pct, level)} · respiration contrôlée`
      : 'Charge confortable · respiration contrôlée',
    rpe: 5,
    oneRmPct: dumbbellOnly ? Math.round(pct * dumbbellOneRmFactor(level)) : pct,
  };
}

export type StrengthSplitKind =
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs'
  | 'upper_only'
  | 'lower_only';

export function resolveStrengthSplit(
  trainingDaysCount: number,
  bodyFocus: StrengthBodyFocus = 'full',
): StrengthSplitKind {
  if (bodyFocus === 'upper') return 'upper_only';
  if (bodyFocus === 'lower') return 'lower_only';
  if (trainingDaysCount >= 5) return 'push_pull_legs';
  if (trainingDaysCount >= 4) return 'upper_lower';
  return 'full_body';
}

function equipmentMatchScore(
  exercise: ExerciseDef,
  equipment: StrengthEquipment[],
): number {
  // Priorise les mouvements vraiment adaptés au matériel choisi
  const overlap = exercise.equipment.filter((eq) => equipment.includes(eq));
  if (overlap.length === 0) return -1;
  let score = overlap.length * 2;
  // Si uniquement poids du corps / bandes → favoriser ces tags exclusifs
  const homeOnly =
    !equipment.includes('gym') &&
    !equipment.includes('home_machines') &&
    (equipment.includes('bodyweight') ||
      equipment.includes('bands') ||
      equipment.includes('home_dumbbells'));
  if (homeOnly) {
    if (exercise.equipment.includes('gym') && exercise.equipment.length === 1) score -= 10;
    if (
      equipment.every((eq) => eq === 'bodyweight' || eq === 'bands') &&
      (exercise.equipment.includes('bodyweight') || exercise.equipment.includes('bands'))
    ) {
      score += 4;
    }
    if (equipment.includes('home_dumbbells') && exercise.equipment.includes('home_dumbbells')) {
      score += 3;
    }
  }
  if (equipment.includes('gym') && exercise.equipment.includes('gym')) score += 2;
  if (equipment.includes('home_machines') && exercise.equipment.includes('home_machines')) {
    score += 3;
  }
  return score;
}

function rotatePool<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) return items;
  const offset = ((seed % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function exercisesFor(
  equipment: StrengthEquipment[],
  muscles: MuscleGroup[],
  limit: number,
  rotationSeed = 0,
): ExerciseDef[] {
  const pool = EXERCISE_LIBRARY.filter((e) =>
    equipment.some((eq) => e.equipment.includes(eq)),
  )
    .map((e) => ({ e, score: equipmentMatchScore(e, equipment) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);

  const byMuscle = new Map<MuscleGroup, ExerciseDef[]>();
  for (const m of muscles) {
    const list = rotatePool(
      pool.filter((e) => e.muscles.includes(m)),
      rotationSeed + m.length * 3,
    );
    byMuscle.set(m, list);
  }

  const picked: ExerciseDef[] = [];
  // 1er passage : un exercice par groupe musculaire (varié selon la séance)
  for (const m of muscles) {
    if (picked.length >= limit) break;
    const list = byMuscle.get(m) ?? [];
    const hit = list.find((e) => !picked.some((p) => p.name === e.name));
    if (hit) picked.push(hit);
  }
  // 2e passage : compléter avec d’autres mouvements du pool (rotation)
  const filler = rotatePool(pool, rotationSeed * 7 + 11);
  for (const e of filler) {
    if (picked.length >= limit) break;
    if (!picked.some((p) => p.name === e.name)) picked.push(e);
  }
  return picked.slice(0, limit);
}

function slotMuscles(
  split: StrengthSplitKind,
  slotIndex: number,
): { title: string; muscles: MuscleGroup[] } {
  if (split === 'upper_only') {
    const mod = slotIndex % 3;
    if (mod === 0) {
      return { title: 'Poussées (haut)', muscles: ['push', 'shoulders', 'arms', 'core'] };
    }
    if (mod === 1) {
      return { title: 'Tirages (haut)', muscles: ['pull', 'arms', 'core'] };
    }
    return {
      title: 'Haut du corps',
      muscles: ['push', 'pull', 'shoulders', 'arms', 'core'],
    };
  }
  if (split === 'lower_only') {
    return slotIndex % 2 === 0
      ? { title: 'Jambes (séance A)', muscles: ['quads', 'glutes', 'calves', 'core'] }
      : { title: 'Jambes (séance B)', muscles: ['hams', 'glutes', 'quads', 'core'] };
  }
  if (split === 'full_body') {
    return {
      title: 'Tout le corps',
      muscles: ['quads', 'push', 'pull', 'glutes', 'arms', 'core'],
    };
  }
  if (split === 'upper_lower') {
    return slotIndex % 2 === 0
      ? { title: 'Haut du corps', muscles: ['push', 'pull', 'shoulders', 'arms', 'core'] }
      : { title: 'Bas du corps', muscles: ['quads', 'hams', 'glutes', 'calves', 'core'] };
  }
  const mod = slotIndex % 3;
  if (mod === 0) return { title: 'Poussées', muscles: ['push', 'shoulders', 'arms', 'core'] };
  if (mod === 1) return { title: 'Tirages', muscles: ['pull', 'hams', 'arms', 'core'] };
  return { title: 'Jambes', muscles: ['quads', 'glutes', 'hams', 'calves', 'core'] };
}

function estimateDurationSec(steps: WorkoutStep[]): number {
  return steps.reduce((sum, st) => {
    if (st.durationSec) return sum + st.durationSec * (st.repeat ?? 1);
    return sum + 90;
  }, 0);
}

export function buildStrengthSession(opts: {
  date: string;
  slotIndex: number;
  trainingDaysCount: number;
  level: AthleticLevel;
  block: PeriodizationBlock;
  equipment: StrengthEquipment[];
  strengthGoal: StrengthGoalFocus;
  bodyFocus?: StrengthBodyFocus;
  ppgLite?: boolean;
  /** Semaine du programme — fait tourner les exercices */
  weekIndex?: number;
}): PlannedWorkout {
  const equipment =
    opts.equipment.length > 0 ? opts.equipment : (['home_dumbbells'] as StrengthEquipment[]);
  const bodyFocus = opts.bodyFocus ?? 'full';
  const split = resolveStrengthSplit(opts.trainingDaysCount, bodyFocus);
  const slot = slotMuscles(split, opts.slotIndex);
  const scheme = schemeFor(opts.strengthGoal, opts.level, equipment);
  const exCount = opts.ppgLite ? 4 : opts.level === 'debutant' ? 5 : 6;
  const rotationSeed =
    (opts.weekIndex ?? 0) * 17 + opts.slotIndex * 5 + equipment.join(',').length;
  const exercises = exercisesFor(equipment, slot.muscles, exCount, rotationSeed);

  const gearLabel = equipmentLabelShort(equipment);

  const steps: WorkoutStep[] = [
    {
      id: 'wu',
      type: 'warmup',
      label: 'Échauffement (articulations + 2 séries très légères)',
      endCondition: 'duration',
      durationSec: 6 * 60,
    },
    ...exercises.map((ex, i) => {
      const workSec = scheme.sets * (45 + scheme.restSec);
      const pct = ex.oneRmPct
        ? equipment.includes('home_dumbbells') && !equipment.includes('gym')
          ? Math.round(ex.oneRmPct * dumbbellOneRmFactor(opts.level))
          : ex.oneRmPct
        : scheme.oneRmPct;
      const cue = ex.cue ? ` · ${ex.cue}` : '';
      return {
        id: `ex-${i}`,
        type: 'active' as const,
        label: `${ex.name} · ${scheme.sets} séries de ${scheme.repsLabel} · ${scheme.restSec}s de repos · charge ≈ ${pct}% de ton max · ${scheme.loadHint}${cue}`,
        endCondition: 'duration' as const,
        durationSec: Math.min(12 * 60, Math.max(3 * 60, workSec)),
      };
    }),
    {
      id: 'cd',
      type: 'cooldown',
      label: 'Étirements 5 min',
      endCondition: 'duration',
      durationSec: 5 * 60,
    },
  ];

  const goalTag =
    opts.strengthGoal === 'hypertrophy'
      ? 'prendre du muscle'
      : opts.strengthGoal === 'power'
        ? 'force'
        : 'tonifier';

  return {
    id: `w-${opts.date}-strength`,
    title: opts.ppgLite
      ? `Renforcement · ${slot.title}`
      : `Musculation · ${slot.title} · ${goalTag} · ${gearLabel}`,
    date: opts.date,
    discipline: opts.ppgLite ? 'ppg' : 'strength',
    expectedRpe: scheme.rpe,
    periodization: opts.block,
    plannedDurationSec: Math.min(90 * 60, Math.max(35 * 60, estimateDurationSec(steps))),
    steps,
  };
}

function equipmentLabelShort(equipment: StrengthEquipment[]): string {
  if (equipment.includes('gym')) return 'salle';
  if (equipment.includes('home_machines')) return 'machines maison';
  if (equipment.includes('home_dumbbells') && equipment.includes('bands')) {
    return 'haltères + bandes';
  }
  if (equipment.includes('home_dumbbells')) return 'haltères';
  if (equipment.includes('bands')) return 'élastiques';
  if (equipment.includes('bodyweight')) return 'poids du corps';
  return 'maison';
}

export function strengthFrequencyHint(
  days: number,
  goal: StrengthGoalFocus,
  bodyFocus: StrengthBodyFocus = 'full',
): string {
  const split = resolveStrengthSplit(days, bodyFocus);
  const splitLabel =
    split === 'upper_only'
      ? 'focus haut du corps'
      : split === 'lower_only'
        ? 'focus bas du corps'
        : split === 'full_body'
          ? 'full body (chaque muscle ~2–3×/sem.)'
          : split === 'upper_lower'
            ? 'haut / bas (chaque muscle ~2×/sem.)'
            : 'push / pull / legs (chaque muscle ~2×/sem.)';
  const vol =
    goal === 'hypertrophy'
      ? 'cible ~10–16 séries dures / muscle / semaine · récup 48 h / groupe'
      : goal === 'power'
        ? 'volume bas, intensité élevée · récup 72 h si force max'
        : 'volume modéré, récupération confortable';
  return `${splitLabel} · ${vol}`;
}
