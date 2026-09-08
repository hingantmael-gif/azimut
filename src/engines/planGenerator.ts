import { generateWeekPlan } from './core';
import { periodizationForWeeks } from '../data/programDurationDb';
import { resolvePaceZones } from './paceZones';
import { pickBestRaceReference } from './athleteProfile';
import {
  buildLongRunCurve,
  buildWeeklyVolumeCurve,
} from './volumeProgression';
import type { OnboardingAnswers, PeriodizationBlock, PlannedWorkout } from '../types/domain';

/** Plan multi-semaines — périodisation + moteur multi-sports */
export function generateMultiWeekPlan(
  answers: OnboardingAnswers,
  startIso: string,
  weeks = 4,
  sportCategory?: string,
  opts?: { ongoing?: boolean },
): PlannedWorkout[] {
  const start = new Date(startIso + 'T12:00:00');
  const blocks = opts?.ongoing
    ? (Array.from({ length: weeks }, () => 'developpement_general') as PeriodizationBlock[])
    : periodizationForWeeks(weeks, {
        ironmanStyle:
          answers.goal === 'ironman' ||
          answers.goal === 'ironman_70_3' ||
          sportCategory === 'ironman' ||
          answers.sportCategory === 'ironman',
      });
  const raceRef = pickBestRaceReference(answers);
  const paceZones = resolvePaceZones({
    level: answers.level,
    weeklyKmAvg: answers.weeklyKmAvg,
    recentDistanceKm: raceRef?.km ?? answers.recentDistanceKm,
    recentTimeSec: raceRef?.timeSec ?? answers.recentTimeSec,
    vmaKmh: answers.vmaKmh,
  });

  const weeklyVolumes = buildWeeklyVolumeCurve({
    totalWeeks: weeks,
    goal: answers.goal,
    level: answers.level,
    targetDistanceKm: answers.targetDistanceKm,
    weeklyKmAvg: answers.weeklyKmAvg,
    vmaKmh: paceZones.vmaKmh,
    blocks,
  });

  const longRunVolumes = buildLongRunCurve({
    totalWeeks: weeks,
    goal: answers.goal,
    targetDistanceKm: answers.targetDistanceKm,
    weeklyVolumes,
    blocks,
  });

  const all: PlannedWorkout[] = [];
  const sport = sportCategory ?? answers.sportCategory;

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const block = blocks[w] ?? 'developpement_general';
    const weekPlan = generateWeekPlan(answers, weekStart.toISOString().slice(0, 10), {
      weekIndex: w,
      totalWeeks: weeks,
      periodization: block,
      sportCategory: sport,
      weeklyKmOverride: weeklyVolumes[w],
      longKmOverride: longRunVolumes[w],
    });
    weekPlan.forEach((session, i) => {
      all.push({
        ...session,
        id: `${session.id}-s${w}-${i}`,
        periodization: block,
      });
    });
  }
  return all;
}

export function shiftWorkoutDate(plan: PlannedWorkout[], id: string, newDate: string): PlannedWorkout[] {
  return plan.map((w) => (w.id === id ? { ...w, date: newDate } : w));
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
