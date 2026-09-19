/**
 * Arbre de compétences callisthénie — 6 branches × 9 nœuds (Fondation→Élite).
 * Pure TS ; `unlocked` = tous les `requires` sont dans completedIds.
 */

export type CalisthenicsBranch =
  | 'push'
  | 'dipHandstand'
  | 'rowLever'
  | 'pullMuscleUp'
  | 'core'
  | 'legs';

export type CalisthenicsTier =
  | 'foundation'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite';

export type CalisthenicsLoadCategory =
  | 'dynamic'
  | 'isometricHighTension'
  | 'eccentricIntense'
  | 'technical';

export type CalisthenicsMoveDefinition = {
  id: string;
  title: string;
  branch: CalisthenicsBranch;
  tier: CalisthenicsTier;
  loadCategory: CalisthenicsLoadCategory;
  requires: string[];
  /** chest, deltoids, triceps, lats, biceps, forearms, abs, obliques, quads, hamstrings, glutes, hip_flexors, traps, erector */
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
  unlockCriteria: { type: 'reps' | 'holdSeconds'; threshold: number; perSide?: boolean };
  /** 1.0 dynamic · 1.5 isometric · 1.8 eccentric · 1.1 technical */
  recoveryMultiplier: number;
  cue: string;
  protocol: string;
};

export type CalisSkillDef = { id: string; title: string; requires: string[] };
export type CalisSkill = CalisSkillDef & { unlocked: boolean };

const DYN = 1.0;
const ISO = 1.5;
const ECC = 1.8;
const TEC = 1.1;

function move(
  def: Omit<CalisthenicsMoveDefinition, 'recoveryMultiplier'> & {
    recoveryMultiplier?: number;
  },
): CalisthenicsMoveDefinition {
  const byCat: Record<CalisthenicsLoadCategory, number> = {
    dynamic: DYN,
    isometricHighTension: ISO,
    eccentricIntense: ECC,
    technical: TEC,
  };
  return { ...def, recoveryMultiplier: def.recoveryMultiplier ?? byCat[def.loadCategory] };
}

/** Catalogue complet — 54 nœuds, titres FR. */
export const CALISTHENICS_MOVES: CalisthenicsMoveDefinition[] = [
  move({
    id: "push_knee",
    title: "Pompes sur genoux",
    branch: "push",
    tier: "foundation",
    loadCategory: "dynamic",
    requires: [],
    primaryMuscleGroups: ["chest", "triceps"],
    secondaryMuscleGroups: ["deltoids", "abs"],
    unlockCriteria: { type: "reps", threshold: 8 },
    cue: "Genoux au sol, ligne tête–hanches. Poitrine proche du sol, coudes ~45°.",
    protocol: "4×8–12 · repos 60–90 s · 3×/sem",
  }),
  move({
    id: "pushup_full",
    title: "Pompes complètes",
    branch: "push",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["push_knee"],
    primaryMuscleGroups: ["chest", "triceps"],
    secondaryMuscleGroups: ["deltoids", "abs"],
    unlockCriteria: { type: "reps", threshold: 15 },
    cue: "Ligne tête–talons. Descente poitrine au sol, coudes ~45°, poussée contrôlée.",
    protocol: "4×12–15 · repos 90 s · 3×/sem",
  }),
  move({
    id: "pike_pushup",
    title: "Pompes pike",
    branch: "push",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["pushup_full"],
    primaryMuscleGroups: ["deltoids", "triceps"],
    secondaryMuscleGroups: ["chest", "traps"],
    unlockCriteria: { type: "reps", threshold: 12 },
    cue: "Bassin haut, tête vers le sol entre les mains — poussée d’épaules.",
    protocol: "4×8–12 · repos 90–120 s · 3×/sem",
  }),
  move({
    id: "archer_pushup",
    title: "Pompes archer",
    branch: "push",
    tier: "intermediate",
    loadCategory: "dynamic",
    requires: ["pushup_full"],
    primaryMuscleGroups: ["chest", "triceps"],
    secondaryMuscleGroups: ["obliques", "deltoids"],
    unlockCriteria: { type: "reps", threshold: 6, perSide: true },
    cue: "Pompe large : un bras tendu, l’autre fléchit. Hanches basses, pas de rotation.",
    protocol: "3×6/côté · repos 2 min · 2–3×/sem",
  }),
  move({
    id: "planche_tuck",
    title: "Planche tuck",
    branch: "push",
    tier: "intermediate",
    loadCategory: "isometricHighTension",
    requires: ["pike_pushup"],
    primaryMuscleGroups: ["deltoids", "chest"],
    secondaryMuscleGroups: ["abs", "hip_flexors", "triceps"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Bras tendus, genoux à la poitrine, corps horizontal. Protraction scapulaire max.",
    protocol: "5× tenue max (viser 10–15 s) · repos 90 s · 3×/sem",
  }),
  move({
    id: "planche_advanced",
    title: "Planche avancée",
    branch: "push",
    tier: "advanced",
    loadCategory: "isometricHighTension",
    requires: ["planche_tuck"],
    primaryMuscleGroups: ["deltoids", "chest"],
    secondaryMuscleGroups: ["abs", "hip_flexors"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Jambes pliées, hanches ouvertes — allonge le levier vs tuck. Corps horizontal.",
    protocol: "5× tenue max · repos 2 min · 2–3×/sem",
  }),
  move({
    id: "planche_straddle",
    title: "Planche straddle",
    branch: "push",
    tier: "advanced",
    loadCategory: "isometricHighTension",
    requires: ["planche_advanced"],
    primaryMuscleGroups: ["deltoids", "chest"],
    secondaryMuscleGroups: ["abs", "hip_flexors"],
    unlockCriteria: { type: "holdSeconds", threshold: 8 },
    cue: "Jambes écartées tendues, corps horizontal. Protraction + gainage fort.",
    protocol: "5× tenue max · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "planche_full",
    title: "Planche complète",
    branch: "push",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["planche_straddle"],
    primaryMuscleGroups: ["deltoids", "chest"],
    secondaryMuscleGroups: ["abs", "triceps", "hip_flexors"],
    unlockCriteria: { type: "holdSeconds", threshold: 5 },
    cue: "Jambes jointes tendues, corps rigide horizontal. Tenues courtes de qualité.",
    protocol: "5× tenue max (5–8 s) · repos 2–3 min · 2–3×/sem max",
  }),
  move({
    id: "planche_pushup",
    title: "Pompes planche",
    branch: "push",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["planche_full"],
    primaryMuscleGroups: ["deltoids", "chest", "triceps"],
    secondaryMuscleGroups: ["abs"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Depuis full planche : flexion/extension des coudes sans perdre l’horizontale.",
    protocol: "5×2–3 · repos 3 min · 2×/sem",
  }),
  move({
    id: "dip_assisted",
    title: "Dips assistés",
    branch: "dipHandstand",
    tier: "foundation",
    loadCategory: "dynamic",
    requires: [],
    primaryMuscleGroups: ["triceps", "chest"],
    secondaryMuscleGroups: ["deltoids"],
    unlockCriteria: { type: "reps", threshold: 10 },
    cue: "Élastique ou pieds légers. Descente ~90° coudes, épaules basses.",
    protocol: "4×8–12 · repos 90 s · 3×/sem",
  }),
  move({
    id: "dip_full",
    title: "Dips complets",
    branch: "dipHandstand",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["dip_assisted"],
    primaryMuscleGroups: ["triceps", "chest"],
    secondaryMuscleGroups: ["deltoids"],
    unlockCriteria: { type: "reps", threshold: 12 },
    cue: "Barres parallèles, descente contrôlée ~90°, remontée sans balancier.",
    protocol: "4×8–12 · repos 2 min · 3×/sem",
  }),
  move({
    id: "hs_wall_face",
    title: "Poirier au mur (face)",
    branch: "dipHandstand",
    tier: "beginner",
    loadCategory: "technical",
    requires: ["dip_assisted"],
    primaryMuscleGroups: ["deltoids", "traps"],
    secondaryMuscleGroups: ["abs", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 45 },
    cue: "Face au mur, mains proches. Corps gainé, regard entre les mains.",
    protocol: "8–10 tenues · repos 60–90 s · 4×/sem",
  }),
  move({
    id: "hs_wall_back",
    title: "Poirier au mur (dos)",
    branch: "dipHandstand",
    tier: "intermediate",
    loadCategory: "technical",
    requires: ["hs_wall_face"],
    primaryMuscleGroups: ["deltoids", "traps"],
    secondaryMuscleGroups: ["abs", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 60 },
    cue: "Dos au mur, jambes tendues. Alignement vertical, micro-ajustements doigts.",
    protocol: "8–10 tenues · repos 60–90 s · 4×/sem",
  }),
  move({
    id: "hs_freestanding",
    title: "Poirier libre",
    branch: "dipHandstand",
    tier: "intermediate",
    loadCategory: "technical",
    requires: ["hs_wall_back"],
    primaryMuscleGroups: ["deltoids", "traps"],
    secondaryMuscleGroups: ["abs", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Équilibre libre : doigts actifs, corps droit. Fatigue neuromotrice > musculaire.",
    protocol: "8–10 tentatives · repos 60–90 s · 4×/sem",
  }),
  move({
    id: "hspu_wall",
    title: "Pompes poirier au mur",
    branch: "dipHandstand",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["hs_wall_back", "dip_full"],
    primaryMuscleGroups: ["deltoids", "triceps"],
    secondaryMuscleGroups: ["traps", "abs"],
    unlockCriteria: { type: "reps", threshold: 5 },
    cue: "Dos au mur : descente tête vers le sol, poussée complète. Contrôle total.",
    protocol: "5×3–5 · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "ring_dip",
    title: "Dips en anneaux",
    branch: "dipHandstand",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["dip_full"],
    primaryMuscleGroups: ["triceps", "chest"],
    secondaryMuscleGroups: ["deltoids", "abs"],
    unlockCriteria: { type: "reps", threshold: 10 },
    cue: "Anneaux stables, turn-out en haut. Descente contrôlée sans balancier.",
    protocol: "4×6–10 · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "hspu_free",
    title: "Pompes poirier libres",
    branch: "dipHandstand",
    tier: "elite",
    loadCategory: "dynamic",
    requires: ["hspu_wall", "hs_freestanding"],
    primaryMuscleGroups: ["deltoids", "triceps"],
    secondaryMuscleGroups: ["traps", "abs"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "HSPU sans mur : tête frôle le sol, poussée jusqu’à l’équilibre libre.",
    protocol: "5×2–3 · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "press_to_hs",
    title: "Presse au poirier",
    branch: "dipHandstand",
    tier: "elite",
    loadCategory: "technical",
    requires: ["hspu_free"],
    primaryMuscleGroups: ["deltoids", "triceps"],
    secondaryMuscleGroups: ["abs", "traps", "hip_flexors"],
    unlockCriteria: { type: "reps", threshold: 1 },
    cue: "Depuis appui ou straddle : presser jusqu’au poirier libre, contrôle total.",
    protocol: "5×1–2 · repos 3 min · 2×/sem",
  }),
  move({
    id: "row_horizontal",
    title: "Rowing horizontal",
    branch: "rowLever",
    tier: "foundation",
    loadCategory: "dynamic",
    requires: [],
    primaryMuscleGroups: ["lats", "traps"],
    secondaryMuscleGroups: ["biceps", "abs"],
    unlockCriteria: { type: "reps", threshold: 12 },
    cue: "Sous barre/anneaux bas : corps gainé, poitrine vers la barre, omoplates serrées.",
    protocol: "4×10–15 · repos 90 s · 3×/sem",
  }),
  move({
    id: "active_hang",
    title: "Suspension active",
    branch: "rowLever",
    tier: "beginner",
    loadCategory: "isometricHighTension",
    requires: ["row_horizontal"],
    primaryMuscleGroups: ["lats", "traps"],
    secondaryMuscleGroups: ["forearms", "abs"],
    unlockCriteria: { type: "holdSeconds", threshold: 30 },
    cue: "Pendu bras tendus : dépression + engagement scapulaire (pas de dead hang mou).",
    protocol: "4×20–40 s · repos 60 s · 3–4×/sem",
  }),
  move({
    id: "tuck_back_lever",
    title: "Back lever tuck",
    branch: "rowLever",
    tier: "beginner",
    loadCategory: "isometricHighTension",
    requires: ["active_hang"],
    primaryMuscleGroups: ["lats", "deltoids"],
    secondaryMuscleGroups: ["abs", "triceps", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Sous la barre, genoux repliés, corps horizontal face au sol. Bras verrouillés.",
    protocol: "5× tenue max · repos 90 s · 3×/sem",
  }),
  move({
    id: "tuck_front_lever",
    title: "Front lever tuck",
    branch: "rowLever",
    tier: "intermediate",
    loadCategory: "isometricHighTension",
    requires: ["active_hang"],
    primaryMuscleGroups: ["lats"],
    secondaryMuscleGroups: ["abs", "triceps", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Suspendu : genoux à la poitrine, corps horizontal, bras tendus verrouillés.",
    protocol: "5× tenue max (10–12 s) · repos 90 s · 3×/sem",
  }),
  move({
    id: "adv_tuck_front_lever",
    title: "Front lever advanced tuck",
    branch: "rowLever",
    tier: "intermediate",
    loadCategory: "isometricHighTension",
    requires: ["tuck_front_lever"],
    primaryMuscleGroups: ["lats"],
    secondaryMuscleGroups: ["abs", "triceps"],
    unlockCriteria: { type: "holdSeconds", threshold: 8 },
    cue: "Hanches plus ouvertes que le tuck — allonge le levier. Bras tendus.",
    protocol: "5× tenue max · repos 2 min · 3×/sem",
  }),
  move({
    id: "straddle_back_lever",
    title: "Back lever straddle",
    branch: "rowLever",
    tier: "advanced",
    loadCategory: "isometricHighTension",
    requires: ["tuck_back_lever"],
    primaryMuscleGroups: ["lats", "deltoids"],
    secondaryMuscleGroups: ["abs", "triceps", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 8 },
    cue: "Back lever jambes écartées tendues. Corps horizontal, bras verrouillés.",
    protocol: "5× tenue max · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "straddle_front_lever",
    title: "Front lever straddle",
    branch: "rowLever",
    tier: "advanced",
    loadCategory: "isometricHighTension",
    requires: ["adv_tuck_front_lever"],
    primaryMuscleGroups: ["lats"],
    secondaryMuscleGroups: ["abs", "triceps", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 8 },
    cue: "Front lever jambes écartées. Horizontal strict, pas de flexion de coudes.",
    protocol: "5× tenue max · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "front_lever_full",
    title: "Front lever complet",
    branch: "rowLever",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["straddle_front_lever"],
    primaryMuscleGroups: ["lats", "abs"],
    secondaryMuscleGroups: ["triceps", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 5 },
    cue: "Jambes jointes tendues, corps horizontal. Tenues courtes de qualité.",
    protocol: "5× tenue max (5–8 s) · repos 2–3 min · 2–3×/sem max",
  }),
  move({
    id: "front_lever_pullups",
    title: "Tractions en front lever",
    branch: "rowLever",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["front_lever_full"],
    primaryMuscleGroups: ["lats", "biceps"],
    secondaryMuscleGroups: ["abs", "forearms"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Depuis front lever : traction en gardant le corps horizontal.",
    protocol: "5×2–3 · repos 3 min · 2×/sem",
  }),
  move({
    id: "australian_row",
    title: "Tractions australiennes",
    branch: "pullMuscleUp",
    tier: "foundation",
    loadCategory: "dynamic",
    requires: [],
    primaryMuscleGroups: ["lats", "traps"],
    secondaryMuscleGroups: ["biceps", "abs"],
    unlockCriteria: { type: "reps", threshold: 12 },
    cue: "Corps rigide sous barre basse. Poitrine vers la barre, descente contrôlée.",
    protocol: "4×12 · repos 90 s · 3×/sem",
  }),
  move({
    id: "pullup_pronation",
    title: "Tractions en pronation",
    branch: "pullMuscleUp",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["australian_row"],
    primaryMuscleGroups: ["lats", "biceps"],
    secondaryMuscleGroups: ["traps", "forearms"],
    unlockCriteria: { type: "reps", threshold: 8 },
    cue: "Pronation largeur épaules. Menton au-dessus, descente contrôlée.",
    protocol: "4×6–8 · repos 2 min · 3×/sem",
  }),
  move({
    id: "chinup",
    title: "Tractions en supination",
    branch: "pullMuscleUp",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["australian_row"],
    primaryMuscleGroups: ["biceps", "lats"],
    secondaryMuscleGroups: ["forearms", "traps"],
    unlockCriteria: { type: "reps", threshold: 10 },
    cue: "Prise supination. Menton au-dessus, omoplates engagées.",
    protocol: "4×8–10 · repos 2 min · 3×/sem",
  }),
  move({
    id: "muscle_up_kip",
    title: "Muscle-up (kip)",
    branch: "pullMuscleUp",
    tier: "intermediate",
    loadCategory: "dynamic",
    requires: ["pullup_pronation"],
    primaryMuscleGroups: ["lats", "triceps"],
    secondaryMuscleGroups: ["biceps", "deltoids", "forearms"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Traction explosive + kip de hanches, transition puis dip haut.",
    protocol: "5×2–3 · repos 2–3 min · 2×/sem",
  }),
  move({
    id: "muscle_up_strict",
    title: "Muscle-up strict",
    branch: "pullMuscleUp",
    tier: "intermediate",
    loadCategory: "dynamic",
    requires: ["muscle_up_kip", "chinup"],
    primaryMuscleGroups: ["lats", "triceps"],
    secondaryMuscleGroups: ["biceps", "deltoids", "forearms"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Sans kip : traction haute poitrine, transition poignet, dip strict.",
    protocol: "5×3 · repos 2–3 min · 2×/sem",
  }),
  move({
    id: "archer_pullup",
    title: "Tractions archer",
    branch: "pullMuscleUp",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["pullup_pronation"],
    primaryMuscleGroups: ["lats", "biceps"],
    secondaryMuscleGroups: ["obliques", "forearms"],
    unlockCriteria: { type: "reps", threshold: 5, perSide: true },
    cue: "Un bras tire, l’autre reste tendu. Menton au-dessus côté porteur.",
    protocol: "4×5/côté · repos 2–3 min · 2–3×/sem",
  }),
  move({
    id: "oap_assisted",
    title: "Traction un bras assistée",
    branch: "pullMuscleUp",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["archer_pullup"],
    primaryMuscleGroups: ["lats", "biceps"],
    secondaryMuscleGroups: ["obliques", "forearms"],
    unlockCriteria: { type: "reps", threshold: 5 },
    cue: "Un bras tire, l’autre aide (élastique/serviette). Contrôle anti-rotation.",
    protocol: "4×4–6/côté · repos 3 min · 2×/sem",
  }),
  move({
    id: "oap_strict",
    title: "Traction à un bras",
    branch: "pullMuscleUp",
    tier: "elite",
    loadCategory: "dynamic",
    requires: ["oap_assisted"],
    primaryMuscleGroups: ["lats", "biceps"],
    secondaryMuscleGroups: ["obliques", "forearms"],
    unlockCriteria: { type: "reps", threshold: 1, perSide: true },
    cue: "Un seul bras. Menton au-dessus sans appui ni rotation excessive.",
    protocol: "4×1/côté · repos 3 min · 2×/sem",
  }),
  move({
    id: "one_arm_muscle_up",
    title: "Muscle-up à un bras",
    branch: "pullMuscleUp",
    tier: "elite",
    loadCategory: "dynamic",
    requires: ["oap_strict", "muscle_up_strict"],
    primaryMuscleGroups: ["lats", "triceps", "biceps"],
    secondaryMuscleGroups: ["obliques", "deltoids", "forearms"],
    unlockCriteria: { type: "reps", threshold: 1 },
    cue: "Traction un bras + transition puis dip un bras. Qualité avant volume.",
    protocol: "4×1 · repos 3–4 min · 1–2×/sem",
  }),
  move({
    id: "plank_hold",
    title: "Gainage planche ventrale",
    branch: "core",
    tier: "foundation",
    loadCategory: "isometricHighTension",
    requires: [],
    primaryMuscleGroups: ["abs"],
    secondaryMuscleGroups: ["deltoids", "glutes"],
    unlockCriteria: { type: "holdSeconds", threshold: 60 },
    cue: "Avant-bras au sol, bassin neutre, pas de dos creux ni fesses en l’air.",
    protocol: "4× tenue max · repos 60 s · 4×/sem",
  }),
  move({
    id: "hanging_knee_raise",
    title: "Relevés de genoux suspendu",
    branch: "core",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["plank_hold"],
    primaryMuscleGroups: ["abs", "hip_flexors"],
    secondaryMuscleGroups: ["forearms"],
    unlockCriteria: { type: "reps", threshold: 12 },
    cue: "Pendu : remonter genoux vers poitrine sans balancier, descente contrôlée.",
    protocol: "4×10–15 · repos 60–90 s · 3×/sem",
  }),
  move({
    id: "lsit_tuck",
    title: "L-sit tuck",
    branch: "core",
    tier: "beginner",
    loadCategory: "isometricHighTension",
    requires: ["plank_hold"],
    primaryMuscleGroups: ["hip_flexors", "abs"],
    secondaryMuscleGroups: ["triceps", "deltoids", "quads"],
    unlockCriteria: { type: "holdSeconds", threshold: 15 },
    cue: "Sur parallettes : genoux pliés, pieds décollés, épaules basses.",
    protocol: "5× tenue max · repos 60–90 s · 4×/sem",
  }),
  move({
    id: "lsit_full",
    title: "L-sit complet",
    branch: "core",
    tier: "intermediate",
    loadCategory: "isometricHighTension",
    requires: ["lsit_tuck"],
    primaryMuscleGroups: ["hip_flexors", "quads"],
    secondaryMuscleGroups: ["abs", "triceps", "deltoids"],
    unlockCriteria: { type: "holdSeconds", threshold: 10 },
    cue: "Jambes tendues à l’horizontale, dos droit, dépression scapulaire.",
    protocol: "5× tenue max (10–15 s) · repos 60–90 s · 4×/sem",
  }),
  move({
    id: "dragon_flag_neg",
    title: "Dragon flag négatif",
    branch: "core",
    tier: "intermediate",
    loadCategory: "eccentricIntense",
    requires: ["hanging_knee_raise", "lsit_full"],
    primaryMuscleGroups: ["abs", "erector"],
    secondaryMuscleGroups: ["lats", "glutes"],
    unlockCriteria: { type: "reps", threshold: 5 },
    cue: "Ancré au banc : descente lente corps rigide (3–4 s), seules omoplates au contact.",
    protocol: "4×5 · repos 2 min · 2–3×/sem",
  }),
  move({
    id: "dragon_flag_full",
    title: "Dragon flag complet",
    branch: "core",
    tier: "advanced",
    loadCategory: "eccentricIntense",
    requires: ["dragon_flag_neg"],
    primaryMuscleGroups: ["abs", "erector"],
    secondaryMuscleGroups: ["lats", "glutes"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Descente + remontée contrôlées, corps planche des épaules aux pieds.",
    protocol: "4×3 · repos 2 min · 2–3×/sem",
  }),
  move({
    id: "vsit",
    title: "V-sit",
    branch: "core",
    tier: "advanced",
    loadCategory: "isometricHighTension",
    requires: ["lsit_full"],
    primaryMuscleGroups: ["hip_flexors", "abs"],
    secondaryMuscleGroups: ["quads", "triceps"],
    unlockCriteria: { type: "holdSeconds", threshold: 5 },
    cue: "Appui bras tendus, jambes élevées en V. Dos droit, épaules basses.",
    protocol: "5× tenue max · repos 90–120 s · 3×/sem",
  }),
  move({
    id: "human_flag_assisted",
    title: "Drapeau humain assisté",
    branch: "core",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["dragon_flag_full", "vsit"],
    primaryMuscleGroups: ["obliques", "lats"],
    secondaryMuscleGroups: ["deltoids", "abs", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 5 },
    cue: "Poteau vertical, un pied au sol pour alléger. Corps vers l’horizontale.",
    protocol: "4× tenue max/côté · repos 2 min · 2×/sem",
  }),
  move({
    id: "human_flag_full",
    title: "Drapeau humain complet",
    branch: "core",
    tier: "elite",
    loadCategory: "isometricHighTension",
    requires: ["human_flag_assisted"],
    primaryMuscleGroups: ["obliques", "lats", "deltoids"],
    secondaryMuscleGroups: ["abs", "forearms"],
    unlockCriteria: { type: "holdSeconds", threshold: 3 },
    cue: "Corps horizontal perpendiculaire au poteau. Équilibre G/D obligatoire.",
    protocol: "4× tenue max/côté · repos 2–3 min · 2×/sem",
  }),
  move({
    id: "bulgarian_split",
    title: "Squats bulgares",
    branch: "legs",
    tier: "foundation",
    loadCategory: "dynamic",
    requires: [],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hamstrings"],
    unlockCriteria: { type: "reps", threshold: 12, perSide: true },
    cue: "Pied arrière surélevé. Genou avant stable, torse droit, profondeur contrôlée.",
    protocol: "4×10–12/jambe · repos 90 s · 3×/sem",
  }),
  move({
    id: "assisted_pistol",
    title: "Pistol squat assisté",
    branch: "legs",
    tier: "beginner",
    loadCategory: "dynamic",
    requires: ["bulgarian_split"],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hamstrings", "abs"],
    unlockCriteria: { type: "reps", threshold: 10, perSide: true },
    cue: "Une jambe, aide TRX/mur. Descente profonde, jambe libre tendue.",
    protocol: "4×8–10/jambe · repos 90–120 s · 3×/sem",
  }),
  move({
    id: "nordic_assisted",
    title: "Squat nordique assisté",
    branch: "legs",
    tier: "beginner",
    loadCategory: "eccentricIntense",
    requires: ["bulgarian_split"],
    primaryMuscleGroups: ["hamstrings"],
    secondaryMuscleGroups: ["glutes"],
    unlockCriteria: { type: "reps", threshold: 6 },
    cue: "Agenouillé, chevilles bloquées. Descente assistée (élastique/partenaire).",
    protocol: "3×5–8 · repos 2–3 min · 2×/sem",
  }),
  move({
    id: "assisted_pistol_adv",
    title: "Pistol squat semi-assisté",
    branch: "legs",
    tier: "intermediate",
    loadCategory: "dynamic",
    requires: ["assisted_pistol"],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hamstrings", "abs"],
    unlockCriteria: { type: "reps", threshold: 8, perSide: true },
    cue: "Aide minimale (bras devant ou appui léger). Amplitude complète.",
    protocol: "4×6–8/jambe · repos 2 min · 3×/sem",
  }),
  move({
    id: "nordic_ecc",
    title: "Squat nordique excentrique",
    branch: "legs",
    tier: "intermediate",
    loadCategory: "eccentricIntense",
    requires: ["nordic_assisted"],
    primaryMuscleGroups: ["hamstrings"],
    secondaryMuscleGroups: ["glutes"],
    unlockCriteria: { type: "reps", threshold: 6 },
    cue: "Descente complète sans remontée active. Résiste le plus longtemps possible.",
    protocol: "3×5–6 · repos 3 min · 1–2×/sem",
  }),
  move({
    id: "pistol_strict",
    title: "Pistol squat strict",
    branch: "legs",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["assisted_pistol_adv"],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hamstrings", "abs"],
    unlockCriteria: { type: "reps", threshold: 5, perSide: true },
    cue: "Sans appui. Cuisse–mollet en bas, remontée sans poser la jambe libre.",
    protocol: "4×5/jambe · repos 2 min · 3×/sem",
  }),
  move({
    id: "shrimp_squat",
    title: "Shrimp squat",
    branch: "legs",
    tier: "advanced",
    loadCategory: "dynamic",
    requires: ["assisted_pistol_adv"],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hip_flexors", "abs"],
    unlockCriteria: { type: "reps", threshold: 5, perSide: true },
    cue: "Jambe arrière tenue à la main. Genou arrière frôle le sol, remontée.",
    protocol: "4×5/jambe · repos 2 min · 2–3×/sem",
  }),
  move({
    id: "nordic_full",
    title: "Squat nordique complet",
    branch: "legs",
    tier: "elite",
    loadCategory: "eccentricIntense",
    requires: ["nordic_ecc"],
    primaryMuscleGroups: ["hamstrings"],
    secondaryMuscleGroups: ["glutes"],
    unlockCriteria: { type: "reps", threshold: 3 },
    cue: "Excentrique + remontée active sans les mains. Qualité >> volume.",
    protocol: "3×3 · repos 3 min · 1–2×/sem max",
  }),
  move({
    id: "dragon_squat",
    title: "Dragon squat",
    branch: "legs",
    tier: "elite",
    loadCategory: "dynamic",
    requires: ["pistol_strict", "shrimp_squat"],
    primaryMuscleGroups: ["quads", "glutes"],
    secondaryMuscleGroups: ["hamstrings", "hip_flexors", "abs"],
    unlockCriteria: { type: "reps", threshold: 3, perSide: true },
    cue: "Pistol avec jambe arrière tenue — mobilité + force unilatérale max.",
    protocol: "4×3/jambe · repos 2–3 min · 2×/sem",
  })
];

/** Compat : vue légère id/title/requires. */
export const CALIS_SKILLS: CalisSkillDef[] = CALISTHENICS_MOVES.map((m) => ({
  id: m.id,
  title: m.title,
  requires: m.requires,
}));

export function getMoveById(id: string): CalisthenicsMoveDefinition | undefined {
  return CALISTHENICS_MOVES.find((m) => m.id === id);
}

export function movesByBranch(branch: CalisthenicsBranch): CalisthenicsMoveDefinition[] {
  return CALISTHENICS_MOVES.filter((m) => m.branch === branch);
}

/**
 * Half-lives effectives pour les groupes primaires après une séance sur ce move.
 * `halfLifeHours[group] * recoveryMultiplier`.
 */
export function applyCalisthenicsRecoveryImpact(
  moveDef: CalisthenicsMoveDefinition,
  halfLifeHours: Record<string, number>,
): Partial<Record<string, number>> {
  const impact: Partial<Record<string, number>> = {};
  for (const group of moveDef.primaryMuscleGroups) {
    const base = halfLifeHours[group];
    if (typeof base === 'number') {
      impact[group] = base * moveDef.recoveryMultiplier;
    }
  }
  return impact;
}

/** Map librairie programmation → multiplicateur de récupération. */
const LIBRARY_EXERCISE_MULT: Record<string, number> = {
  pushup: DYN,
  pike_pushup: DYN,
  dip: DYN,
  pullup: DYN,
  row: DYN,
  squat: DYN,
  lunge: DYN,
  plank: ISO,
  hollow: ISO,
  scapular: TEC,
};

/**
 * Agrège les multiplicateurs de τ par muscle pour une séance callisthénie planifiée.
 * Prend le max entre tags `[calis:…]`, mots-clés titre/étapes, et nœuds de l’arbre.
 */
export function resolveCalisSessionRecovery(
  planned?: { title?: string; steps?: Array<{ label?: string }> } | null,
): Partial<Record<string, number>> {
  const byMuscle: Partial<Record<string, number>> = {};
  const bump = (groups: string[], mult: number) => {
    for (const g of groups) {
      byMuscle[g] = Math.max(byMuscle[g] ?? 1, mult);
    }
  };

  const hay = [
    planned?.title ?? '',
    ...(planned?.steps ?? []).map((s) => s.label ?? ''),
  ]
    .join(' ')
    .toLowerCase();

  for (const step of planned?.steps ?? []) {
    const m = /^\[calis:([a-z_]+)/.exec(step.label ?? '');
    if (!m) continue;
    const mult = LIBRARY_EXERCISE_MULT[m[1]] ?? DYN;
    if (m[1] === 'plank' || m[1] === 'hollow') {
      bump(['abs', 'deltoids', 'chest'], mult);
    } else if (m[1] === 'pushup' || m[1] === 'pike_pushup' || m[1] === 'dip') {
      bump(['chest', 'deltoids', 'triceps'], mult);
    } else if (m[1] === 'pullup' || m[1] === 'row') {
      bump(['lats', 'biceps', 'forearms'], mult);
    } else if (m[1] === 'squat' || m[1] === 'lunge') {
      bump(['quads', 'glutes', 'hamstrings'], mult);
    } else {
      bump(['deltoids', 'traps'], mult);
    }
  }

  for (const move of CALISTHENICS_MOVES) {
    const key = move.title.toLowerCase();
    const idKey = move.id.replace(/_/g, ' ');
    if (!hay.includes(key) && !hay.includes(idKey) && !hay.includes(move.id)) continue;
    bump(move.primaryMuscleGroups, move.recoveryMultiplier);
  }

  // Filets de sécurité par mots-clés élite / excentrique
  if (/nordique|nordic/.test(hay)) bump(['hamstrings'], ECC);
  if (/planche|front lever|drapeau|human flag/.test(hay)) {
    bump(['deltoids', 'chest', 'lats', 'abs', 'obliques'], ISO);
  }
  if (/dragon flag/.test(hay)) bump(['abs', 'erector'], ECC);

  return byMuscle;
}

/**
 * Arbre par défaut : débloqué si tous les prérequis sont dans `completedIds`
 * (sans prérequis → toujours unlocked).
 */
export function defaultCalisSkillTree(completedIds: string[]): CalisSkill[] {
  const done = new Set(completedIds);
  return CALIS_SKILLS.map((s) => ({
    ...s,
    unlocked: s.requires.every((r) => done.has(r)),
  }));
}

/** Skills disponibles (unlocked mais pas encore complétées). */
export function nextCalisSkills(completedIds: string[]): CalisSkill[] {
  const done = new Set(completedIds);
  return defaultCalisSkillTree(completedIds).filter((s) => s.unlocked && !done.has(s.id));
}
