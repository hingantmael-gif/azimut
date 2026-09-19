/**
 * Domaines lourds (activities / plan / banister) — SQLite natif.
 * Web : `trainingDb.web.ts` (AsyncStorage séparé, sans expo-sqlite).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import type { AppState } from '../data/seed';
import type { PlannedWorkout, StravaActivity } from '../types/domain';

const ACTIVITIES_KEY = '@azimut/db-activities-v1';
const PLAN_KEY = '@azimut/db-plan-v1';
const BANISTER_KEY = '@azimut/db-banister-v1';

type BanisterState = AppState['banister'];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('azimut_training.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plan (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS banister (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          json TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function saveActivities(activities: StravaActivity[]): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.getAllAsync<{ id: string }>('SELECT id FROM activities');
    const nextIds = new Set(activities.map((a) => a.id));
    await db.withTransactionAsync(async () => {
      for (const row of existing) {
        if (!nextIds.has(row.id)) {
          await db.runAsync('DELETE FROM activities WHERE id = ?', [row.id]);
        }
      }
      for (const a of activities) {
        await db.runAsync(
          'INSERT OR REPLACE INTO activities (id, json) VALUES (?, ?)',
          [a.id, JSON.stringify(a)],
        );
      }
    });
  } catch {
    await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  }
}

export async function savePlan(plan: PlannedWorkout[]): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.getAllAsync<{ id: string }>('SELECT id FROM plan');
    const nextIds = new Set(plan.map((w) => w.id));
    await db.withTransactionAsync(async () => {
      for (const row of existing) {
        if (!nextIds.has(row.id)) {
          await db.runAsync('DELETE FROM plan WHERE id = ?', [row.id]);
        }
      }
      for (const w of plan) {
        await db.runAsync(
          'INSERT OR REPLACE INTO plan (id, json) VALUES (?, ?)',
          [w.id, JSON.stringify(w)],
        );
      }
    });
  } catch {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }
}

export async function saveBanister(banister: BanisterState): Promise<void> {
  const json = JSON.stringify(banister ?? {});
  try {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO banister (id, json) VALUES (1, ?)',
      [json],
    );
  } catch {
    await AsyncStorage.setItem(BANISTER_KEY, json);
  }
}

export async function loadTrainingHeavy(): Promise<{
  activities: StravaActivity[];
  plan: PlannedWorkout[];
  banister: BanisterState;
}> {
  try {
    const db = await getDb();
    const acts = await db.getAllAsync<{ json: string }>(
      'SELECT json FROM activities',
    );
    const plans = await db.getAllAsync<{ json: string }>('SELECT json FROM plan');
    const ban = await db.getFirstAsync<{ json: string }>(
      'SELECT json FROM banister WHERE id = 1',
    );
    return {
      activities: acts.map((r) => JSON.parse(r.json)),
      plan: plans.map((r) => JSON.parse(r.json)),
      banister: ban?.json ? JSON.parse(ban.json) : ({} as BanisterState),
    };
  } catch {
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
}

export async function clearTrainingDb(): Promise<void> {
  try {
    const db = await getDb();
    await db.execAsync(
      'DELETE FROM activities; DELETE FROM plan; DELETE FROM banister;',
    );
  } catch {
    /* ignore */
  }
  await AsyncStorage.multiRemove([ACTIVITIES_KEY, PLAN_KEY, BANISTER_KEY]);
}
