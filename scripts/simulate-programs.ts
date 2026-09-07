/**
 * Simulation exhaustive : chaque template + distances sur mesure.
 * npx tsx scripts/simulate-programs.ts
 */
import { PROGRAM_CATALOG } from '../src/constants/programs';
import { buildProgramPlan, type ProgramBuildInput } from '../src/engines/programBuilder';
import { resolveSportFamily } from '../src/engines/coachingEngine';
import { peakLongRunKmForGoal } from '../src/engines/sessionVolumePolicy';
import type { PlannedWorkout } from '../src/types/domain';

const ALLOWED: Record<string, Set<string>> = {
  run: new Set(['run', 'ppg', 'mobility', 'strength']),
  bike: new Set(['bike', 'ppg', 'mobility', 'strength']),
  swim: new Set(['swim', 'ppg', 'mobility', 'strength']),
  triathlon: new Set(['run', 'bike', 'swim', 'brick', 'ppg', 'mobility', 'strength']),
  strength: new Set(['strength', 'ppg', 'mobility']),
  other: new Set(['run', 'bike', 'brick', 'ppg', 'mobility', 'strength']),
};

function baseInput(partial: Partial<ProgramBuildInput> & { templateId: string }): ProgramBuildInput {
  return {
    trainingDays: [1, 2, 4, 6],
    longRunDay: 6,
    weeklyKmAvg: 25,
    isPremium: true,
    includePpg: false,
    ...partial,
  };
}

function maxDistKm(plan: PlannedWorkout[]): number {
  return Math.max(0, ...plan.map((w) => (w.plannedDistanceM ?? 0) / 1000));
}

function disciplines(plan: PlannedWorkout[]): string[] {
  return [...new Set(plan.map((w) => w.discipline))];
}

type Issue = { level: 'error' | 'warn'; msg: string };

function audit(
  label: string,
  plan: PlannedWorkout[],
  family: string,
  targetKm?: number,
  goal?: string,
): Issue[] {
  const issues: Issue[] = [];
  const allowed = ALLOWED[family] ?? ALLOWED.run;
  const disc = disciplines(plan);

  for (const d of disc) {
    if (!allowed.has(d)) {
      issues.push({
        level: 'error',
        msg: `Discipline interdite « ${d} » pour famille ${family}`,
      });
    }
  }

  if (plan.length === 0) {
    issues.push({ level: 'error', msg: 'Aucune séance générée' });
  }

  const peak = goal
    ? peakLongRunKmForGoal(goal as never, targetKm)
    : targetKm
      ? targetKm * 2.5
      : 50;

  if (family === 'run') {
    const runs = plan.filter((w) => w.discipline === 'run' && w.plannedDistanceM);
    for (const w of runs) {
      const km = (w.plannedDistanceM ?? 0) / 1000;
      const cap = /longue/i.test(w.title) ? peak * 1.05 : peak * 0.75;
      if (km > cap + 0.5) {
        issues.push({
          level: 'error',
          msg: `Course trop longue: ${w.title} ${km.toFixed(1)} km (cap ~${cap.toFixed(1)})`,
        });
      }
    }
    if (disc.includes('brick') || disc.includes('swim') || disc.includes('bike')) {
      issues.push({
        level: 'error',
        msg: `Plan course contient du multi-sport: ${disc.join(', ')}`,
      });
    }
  }

  if (family === 'triathlon') {
    if (!disc.some((d) => d === 'swim')) {
      issues.push({ level: 'error', msg: 'Triathlon sans séance de natation' });
    }
    if (!disc.some((d) => d === 'bike' || d === 'brick')) {
      issues.push({ level: 'error', msg: 'Triathlon sans vélo / brick' });
    }
    const bricks = plan.filter((w) => w.discipline === 'brick');
    for (const w of bricks) {
      const km = (w.plannedDistanceM ?? 0) / 1000;
      const brickCap =
        goal === 'triathlon_sprint'
          ? 45
          : goal === 'ironman'
            ? 140
            : goal === 'ironman_70_3'
              ? 100
              : 70;
      if (km > brickCap) {
        issues.push({
          level: 'error',
          msg: `Brick trop long: ${km.toFixed(1)} km (cap ${brickCap})`,
        });
      }
    }
  }

  if (family === 'other') {
    if (!disc.includes('run') || !disc.includes('bike')) {
      issues.push({
        level: 'error',
        msg: `Biathlon incomplet: ${disc.join(',') || 'vide'}`,
      });
    }
  }

  if (family === 'strength') {
    const bad = disc.filter((d) => d === 'run' || d === 'bike' || d === 'swim' || d === 'brick');
    if (bad.length) {
      issues.push({ level: 'error', msg: `Musculation avec ${bad.join(', ')}` });
    }
  }

  if (family === 'swim' && targetKm && targetKm <= 3) {
    const max = maxDistKm(plan.filter((w) => w.discipline === 'swim'));
    if (max > targetKm * 4 + 2) {
      issues.push({
        level: 'warn',
        msg: `Nage max ${max.toFixed(1)} km vs objectif ${targetKm} km`,
      });
    }
  }

  return issues;
}

const customs = [3, 5, 8, 12, 21, 42, 63, 100];

let errors = 0;
let warns = 0;

console.log('=== TEMPLATES CATALOGUE ===\n');

for (const t of PROGRAM_CATALOG) {
  const { plan, meta, answers } = buildProgramPlan(
    baseInput({
      templateId: t.id,
      weeklyKmAvg: t.sportCategory === 'swim' ? 8 : t.sportCategory === 'bike' ? 80 : 25,
    }),
  );
  const family = resolveSportFamily(answers.sportCategory, answers.goal);
  const issues = audit(t.title, plan, family, t.distanceKm, t.goal);
  const maxKm = maxDistKm(plan);
  const ok = issues.filter((i) => i.level === 'error').length === 0;
  console.log(
    `${ok ? 'OK' : 'FAIL'} | ${t.id.padEnd(22)} | ${family.padEnd(10)} | ${plan.length} séances | max ${maxKm.toFixed(1)} km | ${disciplines(plan).join(',')}`,
  );
  for (const i of issues) {
    console.log(`   ${i.level.toUpperCase()}: ${i.msg}`);
    if (i.level === 'error') errors += 1;
    else warns += 1;
  }
}

console.log('\n=== DISTANCES SUR MESURE (custom run) ===\n');

for (const km of customs) {
  const { plan, answers } = buildProgramPlan(
    baseInput({
      templateId: 'custom',
      customDistanceKm: km,
      customTitle: `Objectif ${km} km`,
      customWeeks: km >= 42 ? 16 : km >= 21 ? 12 : 8,
      weeklyKmAvg: Math.min(100, km * 2), // stress-test volume déclaré élevé
    }),
  );
  const family = resolveSportFamily(answers.sportCategory, answers.goal);
  const issues = audit(`custom ${km}`, plan, family, km, answers.goal);
  const maxKm = maxDistKm(plan);
  const peak = peakLongRunKmForGoal(answers.goal, km);
  const ok = issues.filter((i) => i.level === 'error').length === 0;
  console.log(
    `${ok ? 'OK' : 'FAIL'} | custom ${String(km).padStart(3)} km | goal=${answers.goal.padEnd(10)} | peakLong=${peak} | maxSéance=${maxKm.toFixed(1)} | ${disciplines(plan).join(',')}`,
  );
  for (const i of issues) {
    console.log(`   ${i.level.toUpperCase()}: ${i.msg}`);
    if (i.level === 'error') errors += 1;
    else warns += 1;
  }
}

console.log('\n=== PROFILS UTILISATEURS (5 km) ===\n');

const profiles = [
  { name: 'débutant 3j', days: [2, 4, 6], weekly: 10 },
  { name: 'intermédiaire 4j', days: [1, 2, 4, 6], weekly: 30 },
  { name: 'confirmé volume fou', days: [1, 2, 3, 4, 5, 6], weekly: 120 },
];

for (const p of profiles) {
  const { plan, answers } = buildProgramPlan(
    baseInput({
      templateId: 'prog-5k',
      trainingDays: p.days,
      longRunDay: p.days[p.days.length - 1],
      weeklyKmAvg: p.weekly,
    }),
  );
  const family = resolveSportFamily(answers.sportCategory, answers.goal);
  const issues = audit(p.name, plan, family, 5, '5k');
  const maxKm = maxDistKm(plan);
  const ok = issues.filter((i) => i.level === 'error').length === 0;
  console.log(
    `${ok ? 'OK' : 'FAIL'} | ${p.name.padEnd(22)} | max=${maxKm.toFixed(1)} km | ${disciplines(plan).join(',')}`,
  );
  for (const i of issues) {
    console.log(`   ${i.level.toUpperCase()}: ${i.msg}`);
    if (i.level === 'error') errors += 1;
    else warns += 1;
  }
}

console.log(`\n=== RÉSUMÉ: ${errors} erreurs, ${warns} warnings ===`);
process.exit(errors > 0 ? 1 : 0);
