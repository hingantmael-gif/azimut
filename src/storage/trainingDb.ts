/**
 * Domaines lourds (activities / plan / banister) — AsyncStorage séparé (web / défaut).
 * Natif : `trainingDb.native.ts` (expo-sqlite, upsert incrémental).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from '../data/seed';
import type { PlannedWorkout, StravaActivity } from '../types/domain';

const ACTIVITIES_KEY = '@azimut/db-activities-v1';
const PLAN_KEY = '@azimut/db-plan-v1';
const BANISTER_KEY = '@azimut/db-banister-v1';

type BanisterState = AppState['banister'];

export async function saveActivities(activities: StravaActivity[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
}

export async function savePlan(plan: PlannedWorkout[]): Promise<void> {
  await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export async function saveBanister(banister: BanisterState): Promise<void> {
  await AsyncStorage.setItem(BANISTER_KEY, JSON.stringify(banister ?? {}));
}

export async function loadTrainingHeavy(): Promise<{
  activities: StravaActivity[];
  plan: PlannedWorkout[];
  banister: BanisterState;
}> {
  const [a, p, b] = await AsyncStorage.multiGet([
    ACTIVITIES_KEY,
    PLAN_KEY,
    BANISTER_KEY,
  ]);
  return {
    activities: a[1] ? JSON.parse(a[1]) : [],
    plan: p[1] ? JSON.parse(p[1]) : [],
    banister: b[1] ? JSON.parse(b[1]) : ({} as BanisterState),
  };
}

export async function clearTrainingDb(): Promise<void> {
  await AsyncStorage.multiRemove([ACTIVITIES_KEY, PLAN_KEY, BANISTER_KEY]);
}
