/**
 * Audit exhaustif : tous les programmes × profils athlètes simulés.
 * Vérifie cohérence allures, échauffements, libellés, planning.
 *
 * npx tsx scripts/audit-all-programs.ts
 */
import { PROGRAM_CATALOG } from '../src/constants/programs';
import { buildProgramPlan, type ProgramBuildInput } from '../src/engines/programBuilder';
import { resolveSportFamily } from '../src/engines/coachingEngine';
import { peakLongRunKmForGoal } from '../src/engines/sessionVolumePolicy';
import { deriveWarmupBand, paceBandForRunKind, resolvePaceZones } from '../src/engines/paceZones';
import { describeWorkoutStep } from '../src/engines/workoutPresentation';
import type { AthleticLevel, PlannedWorkout, WorkoutStep } from '../src/types/domain';

const ALLOWED: Record<string, Set<string>> = {
  run: new Set(['run', 'ppg', 'mobility', 'strength']),
  bike: new Set(['bike', 'ppg', 'mobility', 'strength']),
  swim: new Set(['swim', 'ppg', 'mobility', 'strength']),
  triathlon: new Set(['run', 'bike', 'swim', 'brick', 'ppg', 'mobility', 'strength']),
  strength: new Set(['strength', 'ppg', 'mobility']),
  other: new Set(['run', 'bike', 'brick', 'ppg', 'mobility', 'strength']),
};

const HARD_TITLE = /vma|seuil|fraction|tempo|fartlek|vo2|css|interval|crit|allure/i;

type Issue = {
  level: 'error' | 'warn';
  code: string;
  msg: string;
  workoutId?: string;
  date?: string;
};

type AthleteProfile = {
  name: string;
  weeklyKmAvg: number;
  recentDistanceKm?: number;
  recentTimeSec?: number;
  trainingDays: number[];
  longRunDay: number;
  level?: AthleticLevel;
};

const ATHLETE_PROFILES: AthleteProfile[] = [
  {
    name: '5 km · 30 min (débutant)',
    weeklyKmAvg: 12,
    recentDistanceKm: 5,
    recentTimeSec: 30 * 60,
    trainingDays: [2, 4, 6],
    longRunDay: 6,
  },
  {
    name: '10 km · 45 min (inter)',
    weeklyKmAvg: 32,
    recentDistanceKm: 10,
    recentTimeSec: 45 * 60,
    trainingDays: [1, 2, 4, 6],
    longRunDay: 6,
  },
  {
    name: 'Semi · 1h45 (confirmé)',
    weeklyKmAvg: 55,
    recentDistanceKm: 21.1,
    recentTimeSec: 105 * 60,
    trainingDays: [1, 2, 3, 5, 6],
    longRunDay: 6,
  },
  {
    name: 'Marathon · 3h30',
    weeklyKmAvg: 72,
    recentDistanceKm: 42.195,
    recentTimeSec: 210 * 60,
    trainingDays: [1, 2, 3, 4, 5, 6],
    longRunDay: 6,
  },
  {
    name: 'Sans chrono · 40 km/sem',
    weeklyKmAvg: 40,
    trainingDays: [1, 2, 4, 6],
    longRunDay: 6,
  },
  {
    name: 'Sans chrono · 15 km/sem',
    weeklyKmAvg: 15,
    trainingDays: [2, 4, 6],
    longRunDay: 6,
  },
];

const CUSTOM_DISTANCES = [3, 5, 8, 12, 21, 42, 63, 100];

function stepPaceCenter(step: WorkoutStep): number | null {
  if (step.target?.type !== 'pace') return null;
  const { minSecPerKm, maxSecPerKm } = step.target;
  if (minSecPerKm > maxSecPerKm) return null;
  return (minSecPerKm + maxSecPerKm) / 2;
}

function formatPaceSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function weekKey(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d);
  sunday.setDate(diff);
  return sunday.toISOString().slice(0, 10);
}

function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function auditWarmupVsMain(w: PlannedWorkout): Issue[] {
  if (w.discipline !== 'run') return [];
  const warmup = w.steps.find((s) => s.type === 'warmup');
  const actives = w.steps.filter((s) => s.type === 'active');
  if (!warmup || actives.length === 0) return [];

  const wuCenter = stepPaceCenter(warmup);
  if (wuCenter == null) {
    return [{ level: 'warn', code: 'warmup_no_pace', msg: 'Échauffement course sans allure cible', workoutId: w.id, date: w.date }];
  }

  const mainCenters = actives.map(stepPaceCenter).filter((x): x is number => x != null);
  if (mainCenters.length === 0) return [];

  const hardestMain = Math.min(...mainCenters);
  if (wuCenter < hardestMain - 8) {
    return [{
      level: 'error',
      code: 'warmup_too_fast',
      msg: `Échauffement trop rapide: ~${formatPaceSec(wuCenter)}/km vs corps ~${formatPaceSec(hardestMain)}/km (${w.title})`,
      workoutId: w.id,
      date: w.date,
    }];
  }
  return [];
}

function auditStepLabels(w: PlannedWorkout): Issue[] {
  const issues: Issue[] = [];
  for (const step of w.steps) {
    const { title, detail } = describeWorkoutStep(step);
    if (!title.trim() || title === '—') {
      issues.push({ level: 'error', code: 'empty_step_label', msg: 'Étape sans libellé', workoutId: w.id, date: w.date });
    }
    if (step.endCondition !== 'lap_button' && !step.durationSec && !step.distanceMeters) {
      issues.push({
        level: 'error',
        code: 'step_no_measure',
        msg: `Étape « ${title} » sans durée ni distance`,
        workoutId: w.id,
        date: w.date,
      });
    }
    if (step.target?.type === 'pace' && step.target.minSecPerKm > step.target.maxSecPerKm) {
      issues.push({
        level: 'error',
        code: 'pace_inverted',
        msg: `Allures inversées sur « ${title} » (${detail})`,
        workoutId: w.id,
        date: w.date,
      });
    }
  }
  if (w.steps.length === 0 && w.discipline !== 'rest') {
    issues.push({ level: 'warn', code: 'no_steps', msg: `Séance sans étapes structurées: ${w.title}`, workoutId: w.id, date: w.date });
  }
  return issues;
}

function auditScheduling(plan: PlannedWorkout[], trainingDays: number[]): Issue[] {
  const issues: Issue[] = [];
  const byDate = new Map<string, PlannedWorkout[]>();

  for (const w of plan) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date)) {
      issues.push({ level: 'error', code: 'bad_date', msg: `Date invalide: ${w.date}`, workoutId: w.id });
    }
    const dow = dayOfWeek(w.date);
    if (!trainingDays.includes(dow)) {
      issues.push({
        level: 'warn',
        code: 'off_training_day',
        msg: `Séance hors jours choisis (jour ${dow}): ${w.title} le ${w.date}`,
        workoutId: w.id,
        date: w.date,
      });
    }
    const list = byDate.get(w.date) ?? [];
    list.push(w);
    byDate.set(w.date, list);
  }

  for (const [date, sessions] of byDate) {
    if (sessions.length > 1) {
      const sameDisc = sessions.every((s) => s.discipline === sessions[0].discipline);
      if (sameDisc) {
        issues.push({
          level: 'error',
          code: 'double_same_day',
          msg: `${sessions.length} séances ${sessions[0].discipline} le ${date}`,
          date,
        });
      }
    }
  }

  const byWeek = new Map<string, PlannedWorkout[]>();
  for (const w of plan) {
    const wk = weekKey(w.date);
    const list = byWeek.get(wk) ?? [];
    list.push(w);
    byWeek.set(wk, list);
  }

  for (const [wk, sessions] of byWeek) {
    const hard = sessions.filter((s) => HARD_TITLE.test(s.title) || (s.expectedRpe ?? 0) >= 7);
    if (hard.length < 2) continue;
    const dows = hard.map((s) => dayOfWeek(s.date)).sort((a, b) => a - b);
    for (let i = 1; i < dows.length; i++) {
      const gap = Math.min(Math.abs(dows[i] - dows[i - 1]), 7 - Math.abs(dows[i] - dows[i - 1]));
      if (gap < 2 && gap >= 1 && hard.length >= 2) {
        // Toléré si ≤ 3 jours dispos (relaxation assignRoles) — warn seulement si ≥ 4 séances/sem
        if (sessions.length >= 4) {
          issues.push({
            level: 'warn',
            code: 'hard_sessions_close',
            msg: `Semaine ${wk}: séances dures espacées de ${gap} j (${hard.map((h) => h.title).join(' · ')})`,
          });
        }
      }
    }
  }

  return issues;
}

function auditDisciplines(plan: PlannedWorkout[], family: string, goal?: string, targetKm?: number): Issue[] {
  const issues: Issue[] = [];
  const allowed = ALLOWED[family] ?? ALLOWED.run;
  const disc = [...new Set(plan.map((w) => w.discipline))];

  for (const d of disc) {
    if (!allowed.has(d)) {
      issues.push({ level: 'error', code: 'bad_discipline', msg: `Discipline « ${d} » interdite pour ${family}` });
    }
  }

  if (plan.length === 0) {
    issues.push({ level: 'error', code: 'empty_plan', msg: 'Plan vide' });
  }

  if (family === 'run') {
    if (disc.some((d) => ['brick', 'swim', 'bike'].includes(d))) {
      issues.push({ level: 'error', code: 'run_polluted', msg: `Plan course avec multi-sport: ${disc.join(', ')}` });
    }
    const peak = goal ? peakLongRunKmForGoal(goal as never, targetKm) : 50;
    for (const w of plan.filter((x) => x.discipline === 'run' && x.plannedDistanceM)) {
      const km = (w.plannedDistanceM ?? 0) / 1000;
      const cap = /longue/i.test(w.title) ? peak * 1.08 : peak * 0.8;
      if (km > cap + 0.5) {
        issues.push({
          level: 'error',
          code: 'run_too_long',
          msg: `${w.title}: ${km.toFixed(1)} km > cap ${cap.toFixed(1)} km`,
          workoutId: w.id,
          date: w.date,
        });
      }
    }
  }

  if (family === 'triathlon') {
    if (!disc.includes('swim')) issues.push({ level: 'error', code: 'tri_no_swim', msg: 'Triathlon sans natation' });
    if (!disc.some((d) => d === 'bike' || d === 'brick')) {
      issues.push({ level: 'error', code: 'tri_no_bike', msg: 'Triathlon sans vélo/brick' });
    }
  }

  if (family === 'strength' && disc.some((d) => ['run', 'bike', 'swim', 'brick'].includes(d))) {
    issues.push({ level: 'error', code: 'strength_polluted', msg: `Musculation avec ${disc.join(', ')}` });
  }

  return issues;
}

function auditPaceCoherence(
  plan: PlannedWorkout[],
  profile: AthleteProfile,
  goal?: string,
): Issue[] {
  const issues: Issue[] = [];
  const zones = resolvePaceZones({
    level: profile.level ?? 'intermediaire',
    weeklyKmAvg: profile.weeklyKmAvg,
    recentDistanceKm: profile.recentDistanceKm,
    recentTimeSec: profile.recentTimeSec,
  });

  for (const w of plan.filter((x) => x.discipline === 'run')) {
    issues.push(...auditWarmupVsMain(w));
    issues.push(...auditStepLabels(w));

    if (/vma|fraction/i.test(w.title)) {
      const intervalSteps = w.steps.filter((s) => s.type === 'active' && s.target?.type === 'pace');
      for (const s of intervalSteps) {
        const c = stepPaceCenter(s)!;
        const zoneC = (zones.interval.minSecPerKm + zones.interval.maxSecPerKm) / 2;
        if (c > zoneC + 40) {
          issues.push({
            level: 'warn',
            code: 'vma_pace_mismatch',
            msg: `Fractionné ${w.title}: allure ${formatPaceSec(c)}/km vs zone VMA ~${formatPaceSec(zoneC)}/km`,
            date: w.date,
          });
        }
      }
    }
  }

  return issues;
}

function auditPlan(
  label: string,
  plan: PlannedWorkout[],
  family: string,
  profile: AthleteProfile,
  goal?: string,
  targetKm?: number,
  trainingDays?: number[],
): Issue[] {
  const days = trainingDays ?? profile.trainingDays;
  return [
    ...auditDisciplines(plan, family, goal, targetKm),
    ...auditScheduling(plan, days),
    ...auditPaceCoherence(plan, profile, goal),
  ];
}

function baseInput(
  partial: Partial<ProgramBuildInput> & { templateId: string },
  profile: AthleteProfile,
): ProgramBuildInput {
  return {
    trainingDays: profile.trainingDays,
    longRunDay: profile.longRunDay,
    weeklyKmAvg: profile.weeklyKmAvg,
    recentDistanceKm: profile.recentDistanceKm,
    recentTimeSec: profile.recentTimeSec,
    isPremium: true,
    includePpg: false,
    ...partial,
  };
}

type RunResult = { label: string; issues: Issue[]; sessions: number };

const allResults: RunResult[] = [];
const issueCounts = new Map<string, number>();

function record(label: string, issues: Issue[]) {
  allResults.push({ label, issues, sessions: 0 });
  for (const i of issues) {
    issueCounts.set(i.code, (issueCounts.get(i.code) ?? 0) + 1);
  }
}

console.log('=== AUDIT EXHAUSTIF — TOUS LES PROGRAMMES ===\n');

for (const template of PROGRAM_CATALOG) {
  for (const profile of ATHLETE_PROFILES) {
    const weekly =
      template.sportCategory === 'swim'
        ? Math.max(8, profile.weeklyKmAvg * 0.15)
        : template.sportCategory === 'bike'
          ? Math.max(40, profile.weeklyKmAvg * 1.5)
          : profile.weeklyKmAvg;

    const input = baseInput(
      {
        templateId: template.id,
        weeklyKmAvg: weekly,
        includePpg: template.sportCategory !== 'strength' && profile.trainingDays.length >= 4,
        strengthEquipment: template.sportCategory === 'strength' ? ['gym', 'dumbbells'] : undefined,
        strengthGoal: template.sportCategory === 'strength' ? 'hypertrophy' : undefined,
        ongoing: template.sportCategory === 'strength' ? false : undefined,
      },
      profile,
    );

    const { plan, answers } = buildProgramPlan(input);
    const family = resolveSportFamily(answers.sportCategory, answers.goal);
    const label = `${template.id} | ${profile.name}`;
    const issues = auditPlan(label, plan, family, profile, template.goal, template.distanceKm, answers.trainingDays);
    record(label, issues);
    allResults[allResults.length - 1].sessions = plan.length;

    const errs = issues.filter((i) => i.level === 'error').length;
    if (errs > 0) {
      console.log(`FAIL (${errs}) | ${label} | ${plan.length} séances`);
      for (const i of issues.filter((x) => x.level === 'error').slice(0, 5)) {
        console.log(`   ✗ [${i.code}] ${i.msg}`);
      }
    }
  }
}

console.log('\n=== DISTANCES SUR MESURE ===\n');

for (const km of CUSTOM_DISTANCES) {
  for (const profile of ATHLETE_PROFILES.slice(0, 3)) {
    const { plan, answers } = buildProgramPlan(
      baseInput(
        {
          templateId: 'custom',
          customDistanceKm: km,
          customTitle: `Objectif ${km} km`,
          customWeeks: km >= 42 ? 16 : km >= 21 ? 12 : 8,
        },
        profile,
      ),
    );
    const family = resolveSportFamily(answers.sportCategory, answers.goal);
    const label = `custom ${km} km | ${profile.name}`;
    const issues = auditPlan(label, plan, family, profile, answers.goal, km, answers.trainingDays);
    record(label, issues);
    allResults[allResults.length - 1].sessions = plan.length;
  }
}

console.log('\n=== MUSCULATION RENOUVELLEMENT INFINI ===\n');

for (const profile of ATHLETE_PROFILES.slice(0, 2)) {
  const strengthDays = [1, 3, 5] as const;
  const strengthProfile = { ...profile, trainingDays: [...strengthDays], longRunDay: 5 };
  const { plan, answers } = buildProgramPlan(
    baseInput(
      {
        templateId: 'prog-strength-base',
        ongoing: true,
        strengthEquipment: ['gym'],
        strengthGoal: 'fitness',
        weeklyKmAvg: 8,
      },
      strengthProfile,
    ),
  );
  const family = resolveSportFamily(answers.sportCategory, answers.goal);
  const label = `strength ongoing | ${profile.name}`;
  record(label, auditPlan(label, plan, family, strengthProfile, 'forme', undefined, answers.trainingDays));
}

console.log('\n=== TEST ZONES ÉCHAUFFEMENT (math) ===\n');

const zoneTests = [
  { name: 'chrono 10k 45min', recentDistanceKm: 10, recentTimeSec: 45 * 60, weeklyKmAvg: 30 },
  { name: 'chrono semi 1h45', recentDistanceKm: 21.1, recentTimeSec: 105 * 60, weeklyKmAvg: 50 },
  { name: 'volume 40km', weeklyKmAvg: 40 },
];

for (const t of zoneTests) {
  const zones = resolvePaceZones({ level: 'intermediaire', ...t });
  const pairs: Array<[string, string]> = [
    ['long', 'long'],
    ['easy', 'easy'],
    ['interval', 'interval'],
    ['threshold', 'threshold'],
  ];
  for (const [mainKind] of pairs) {
    const main = paceBandForRunKind(zones, mainKind as 'long');
    const wu = deriveWarmupBand(paceBandForRunKind(zones, 'warmup'), main);
    const mainC = (main.minSecPerKm + main.maxSecPerKm) / 2;
    const wuC = (wu.minSecPerKm + wu.maxSecPerKm) / 2;
    const ok = wuC >= mainC + 8;
    console.log(`${ok ? 'OK' : 'FAIL'} | ${t.name} | main=${mainKind} ${formatPaceSec(mainC)} | wu ${formatPaceSec(wuC)}`);
    if (!ok) {
      record(`zone-math ${t.name} ${mainKind}`, [{
        level: 'error',
        code: 'warmup_math',
        msg: `deriveWarmupBand échoue: wu ${formatPaceSec(wuC)} < main ${formatPaceSec(mainC)}`,
      }]);
    }
  }
}

const errors = allResults.reduce((n, r) => n + r.issues.filter((i) => i.level === 'error').length, 0);
const warns = allResults.reduce((n, r) => n + r.issues.filter((i) => i.level === 'warn').length, 0);
const failedRuns = allResults.filter((r) => r.issues.some((i) => i.level === 'error')).length;

console.log('\n=== RÉSUMÉ ===');
console.log(`Scénarios testés : ${allResults.length}`);
console.log(`Scénarios en échec : ${failedRuns}`);
console.log(`Erreurs totales : ${errors}`);
console.log(`Avertissements : ${warns}`);
console.log('\nPar type :');
for (const [code, count] of [...issueCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${code}: ${count}`);
}

if (failedRuns > 0) {
  console.log('\n=== ÉCHECS DÉTAILLÉS (max 20) ===');
  let shown = 0;
  for (const r of allResults) {
    const errs = r.issues.filter((i) => i.level === 'error');
    if (errs.length === 0) continue;
    console.log(`\n${r.label}:`);
    for (const e of errs.slice(0, 3)) {
      console.log(`  ✗ [${e.code}] ${e.msg}`);
    }
    shown += 1;
    if (shown >= 20) break;
  }
}

process.exit(errors > 0 ? 1 : 0);
