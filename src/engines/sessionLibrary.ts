import type { AthleticLevel, PlannedWorkout, WorkoutStep } from '../types/domain';
import { computeSessionDurationSec, sessionBuilders as B } from './coachingEngine';
import {
  makeCruiseThreshold,
  makeFartlek,
  makeFiveKPaceIntervals,
  makeGoalPaceBlocks,
  makeLongRunEasy,
  makeProgressionLongRun,
  makeStridesSession,
  makeTempoContinuous,
  makeVmaIntervals,
  type RunSessionContext,
} from './runSessionLibrary';
import { paceBandForRunKind, warmupBandForMain, type PaceZones } from './paceZones';
import {
  CALIS_TARGET_OPTIONS,
  buildCalisthenicsSession,
  type CalisScope,
  type CalisTarget,
  type CalisthenicsGoalFocus,
} from './calisthenicsProgramming';
import {
  buildStrengthSession,
  type StrengthBodyFocus,
  type StrengthEquipment,
  type StrengthGoalFocus,
} from './strengthProgramming';

/**
 * Bibliothèque de séances : TOUTES les séances que l'app sait construire, prêtes à être faites tout de suite
 * (sans attendre le prochain jour du plan), plus le générateur de « séance rapide » selon le temps disponible.
 */
export type LibSport = 'run' | 'bike' | 'swim' | 'strength' | 'calisthenics';

export const LIB_SPORTS: Array<{ id: LibSport; label: string }> = [
  { id: 'run', label: 'Course' },
  { id: 'bike', label: 'Vélo' },
  { id: 'swim', label: 'Natation' },
  { id: 'strength', label: 'Musculation' },
  { id: 'calisthenics', label: 'Callisthénie' },
];

export type LibContext = {
  level: AthleticLevel;
  zones: PaceZones;
  ftp: number;
  swimPace100: number;
  equipment: StrengthEquipment[];
};

export type LibEntry = {
  /** Identifiant stable (sert de clé d'affichage). */
  key: string;
  sport: LibSport;
  /** Rubrique (Footing, Fractionné, Haut du corps…). */
  group: string;
  title: string;
  workout: PlannedWorkout;
  minutes: number;
};

export function defaultLibContext(level: AthleticLevel, zones: PaceZones, extras?: Partial<LibContext>): LibContext {
  return {
    level,
    zones,
    ftp: extras?.ftp ?? B.ftpFromLevel(level),
    swimPace100: extras?.swimPace100 ?? B.swimPaceFromLevel(level),
    equipment: extras?.equipment?.length ? extras.equipment : ['bodyweight'],
  };
}

function minutesOf(w: PlannedWorkout): number {
  const sec = w.plannedDurationSec && w.plannedDurationSec > 0 ? w.plannedDurationSec : computeSessionDurationSec(w.steps);
  return Math.max(5, Math.round(sec / 60));
}

const paceTarget = (b: { minSecPerKm: number; maxSecPerKm: number }) => ({
  type: 'pace' as const,
  minSecPerKm: b.minSecPerKm,
  maxSecPerKm: b.maxSecPerKm,
});

/** Footing facile à la durée voulue : échauffement lent, allure facile, retour au calme. */
export function quickEasyRun(ctx: LibContext, date: string, minutes: number): PlannedWorkout {
  const total = Math.max(15, minutes);
  const warm = total >= 30 ? 6 : 4;
  const cool = total >= 30 ? 4 : 3;
  const main = Math.max(6, total - warm - cool);
  const easy = paceBandForRunKind(ctx.zones, 'easy');
  const wu = warmupBandForMain(ctx.zones, 'easy');
  const steps: WorkoutStep[] = [
    { id: 'wu', type: 'warmup', label: 'Échauffement · footing lent', endCondition: 'duration', durationSec: warm * 60, target: paceTarget(wu) },
    { id: 'main', type: 'active', label: `Footing facile · ${main} min`, endCondition: 'duration', durationSec: main * 60, target: paceTarget(easy) },
    { id: 'cd', type: 'cooldown', label: 'Retour au calme · marche ou trot', endCondition: 'duration', durationSec: cool * 60 },
  ];
  const secPerKm = (easy.minSecPerKm + easy.maxSecPerKm) / 2;
  return {
    id: `w-${date}-run-easy-${total}`,
    title: `Footing facile ${total} min`,
    date,
    discipline: 'run',
    plannedDurationSec: total * 60,
    plannedDistanceM: Math.round(((main * 60) / secPerKm) * 1000),
    expectedRpe: 3,
    periodization: 'developpement_general',
    steps,
  };
}

/**
 * Réduit une séance de force / callisthénie à la durée voulue : on garde l'échauffement et le retour au calme,
 * on retire les derniers exercices tant que la séance dépasse (jamais moins de 2 exercices).
 */
export function fitToDuration(w: PlannedWorkout, minutes: number): PlannedWorkout {
  const budget = minutes * 60;
  const steps = [...w.steps];
  const sum = (list: WorkoutStep[]) => list.reduce((t, s) => t + (s.durationSec ?? 0) * (s.repeat ?? 1), 0);
  const activeIdx = () => steps.map((s, i) => (s.type === 'active' ? i : -1)).filter((i) => i >= 0);
  while (sum(steps) > budget + 90 && activeIdx().length > 2) {
    const last = activeIdx().pop()!;
    steps.splice(last, 1);
  }
  const total = Math.max(10 * 60, sum(steps));
  return { ...w, steps, plannedDurationSec: total };
}

const STRENGTH_FOCUS_LABEL: Record<StrengthBodyFocus, string> = { full: 'Corps entier', upper: 'Haut du corps', lower: 'Bas du corps' };
const STRENGTH_GOAL_LABEL: Record<StrengthGoalFocus, string> = { fitness: 'Forme', hypertrophy: 'Volume', power: 'Force' };

export const CALIS_GOAL_LIB_LABEL: Record<CalisthenicsGoalFocus, string> = {
  endurance: 'Endurance',
  hypertrophy: 'Volume',
  strength: 'Force',
  skill: 'Contrôle',
};

/** Construit toute la bibliothèque. `calisGoal` : objectif des séances de callisthénie (modifiable à l'écran). */
export function buildLibrary(ctx: LibContext, date: string, opts?: { calisGoal?: CalisthenicsGoalFocus }): LibEntry[] {
  const out: LibEntry[] = [];
  const add = (sport: LibSport, group: string, key: string, workout: PlannedWorkout) =>
    out.push({ key: `${sport}:${key}`, sport, group, title: workout.title, workout, minutes: minutesOf(workout) });

  // ——— Course ———
  const rc: RunSessionContext = { date, zones: ctx.zones, level: ctx.level, load: 1, block: 'developpement_general', weekIndex: 0, goal: '10k' };
  for (const m of [20, 30, 45, 60]) add('run', 'Footing', `easy-${m}`, quickEasyRun(ctx, date, m));
  for (const km of [8, 12, 16]) add('run', 'Sorties longues', `long-${km}`, makeLongRunEasy(rc, km * 1000));
  add('run', 'Sorties longues', 'prog', makeProgressionLongRun(rc, 12000));
  add('run', 'Fractionné', 'vma', makeVmaIntervals(rc));
  add('run', 'Fractionné', 'fartlek', makeFartlek(rc));
  add('run', 'Fractionné', 'strides', makeStridesSession(rc));
  add('run', 'Seuil & tempo', 'cruise', makeCruiseThreshold(rc));
  add('run', 'Seuil & tempo', 'tempo', makeTempoContinuous(rc));
  add('run', 'Allure spécifique', '5k', makeFiveKPaceIntervals(rc));
  add('run', 'Allure spécifique', 'goal', makeGoalPaceBlocks(rc));

  // ——— Vélo ———
  for (const m of [45, 60, 90, 120]) add('bike', 'Endurance', `end-${m}`, B.bikeEndurance(date, m, ctx.ftp, 'developpement_general', `Sortie endurance ${m} min`));
  add('bike', 'Intensité', 'vo2', B.bikeVo2(date, ctx.ftp, ctx.level, 'developpement_general'));

  // ——— Natation ———
  for (const m of [800, 1200, 1600, 2000]) add('swim', 'Endurance', `aero-${m}`, B.swimAerobic(date, m, ctx.swimPace100, 'developpement_general', `Endurance ${m} m`));
  add('swim', 'Seuil', 'css', B.swimCss(date, ctx.swimPace100, ctx.level, 'developpement_general'));

  // ——— Musculation : zone × objectif ———
  for (const focus of ['full', 'upper', 'lower'] as StrengthBodyFocus[]) {
    for (const goal of ['fitness', 'hypertrophy', 'power'] as StrengthGoalFocus[]) {
      const slots = focus === 'full' ? 3 : 2;
      for (let slot = 0; slot < slots; slot++) {
        const w = buildStrengthSession({
          date,
          slotIndex: slot,
          trainingDaysCount: focus === 'full' ? 3 : 4,
          level: ctx.level,
          block: 'developpement_general',
          equipment: ctx.equipment,
          strengthGoal: goal,
          bodyFocus: focus,
        });
        add('strength', STRENGTH_FOCUS_LABEL[focus], `${focus}-${goal}-${slot}`, { ...w, title: `${w.title} · ${STRENGTH_GOAL_LABEL[goal]}` });
      }
    }
  }

  // ——— Callisthénie : zone et cibles ———
  const goal = opts?.calisGoal ?? 'hypertrophy';
  const calis = (group: string, key: string, o: { scope?: CalisScope; targets?: CalisTarget[]; slot: number }) =>
    add('calisthenics', group, key, buildCalisthenicsSession({ date, slotIndex: o.slot, trainingDaysCount: 3, level: ctx.level, block: 'developpement_general', goal, scope: o.scope, targets: o.targets }));
  for (let s = 0; s < 3; s++) calis('Ensemble du corps', `full-${s}`, { scope: 'full', slot: s });
  for (let s = 0; s < 3; s++) calis('Haut du corps', `upper-${s}`, { scope: 'upper', slot: s });
  for (let s = 0; s < 3; s++) calis('Bas du corps', `lower-${s}`, { scope: 'lower', slot: s });
  for (const t of CALIS_TARGET_OPTIONS) {
    for (let s = 0; s < 2; s++) calis(`Cible · ${t.label}`, `${t.id}-${s}`, { targets: [t.id], slot: s });
  }
  return out;
}

export type QuickOptions = {
  sport: LibSport;
  minutes: number;
  /** Callisthénie / musculation : zone du corps et cibles. */
  scope?: CalisScope;
  targets?: CalisTarget[];
  calisGoal?: CalisthenicsGoalFocus;
  strengthFocus?: StrengthBodyFocus;
  strengthGoal?: StrengthGoalFocus;
};

/** « Séance rapide » : une séance adaptée au sport et au temps dont on dispose, prête à démarrer. */
export function buildQuickSession(ctx: LibContext, date: string, o: QuickOptions): PlannedWorkout {
  let w: PlannedWorkout;
  switch (o.sport) {
    case 'run':
      w = quickEasyRun(ctx, date, o.minutes);
      break;
    case 'bike':
      w = B.bikeEndurance(date, Math.max(30, o.minutes), ctx.ftp, 'developpement_general', `Sortie vélo ${Math.max(30, o.minutes)} min`);
      break;
    case 'swim': {
      const meters = Math.max(600, Math.round(((o.minutes * 60) / ctx.swimPace100) * 100 / 100) * 100);
      w = B.swimAerobic(date, meters, ctx.swimPace100, 'developpement_general', `Natation ${meters} m`);
      break;
    }
    case 'strength':
      w = fitToDuration(
        buildStrengthSession({
          date,
          slotIndex: 0,
          trainingDaysCount: 3,
          level: ctx.level,
          block: 'developpement_general',
          equipment: ctx.equipment,
          strengthGoal: o.strengthGoal ?? 'fitness',
          bodyFocus: o.strengthFocus ?? 'full',
        }),
        o.minutes,
      );
      break;
    case 'calisthenics':
    default:
      w = fitToDuration(
        buildCalisthenicsSession({
          date,
          slotIndex: 0,
          trainingDaysCount: 3,
          level: ctx.level,
          block: 'developpement_general',
          goal: o.calisGoal ?? 'hypertrophy',
          scope: o.scope,
          targets: o.targets,
        }),
        o.minutes,
      );
      break;
  }
  return { ...w, id: `w-quick-${Date.now().toString(36)}`, date, title: w.title, adHoc: true };
}

/** Copie d'une séance de la bibliothèque, datée d'aujourd'hui (ou d'un autre jour), avec un identifiant unique. */
export function instantiateWorkout(w: PlannedWorkout, date: string, adHoc = false): PlannedWorkout {
  return { ...w, adHoc, id: `w-quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, date, steps: w.steps.map((s) => ({ ...s })) };
}
