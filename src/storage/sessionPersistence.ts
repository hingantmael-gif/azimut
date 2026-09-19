/**
 * Persistance session Azimut — domaines séparés + debounce.
 * Legacy `@training/session` migré une fois vers `@azimut/*`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from '../data/seed';
import { getCurrentRsid } from './deviceSession';
import {
  clearTrainingDb,
  loadTrainingHeavy,
  saveActivities,
  saveBanister,
  savePlan,
} from './trainingDb';

const LEGACY_SESSION_KEY = '@training/session';
const SESSION_VERSION = 4;

const KEYS = {
  meta: '@azimut/session-meta-v1',
  auth: '@azimut/auth-v1',
  health: '@azimut/health-v1',
  light: '@azimut/training-light-v1',
  ephemeral: '@azimut/ephemeral-v1',
} as const;

export type PersistedAppState = Pick<
  AppState,
  | 'authToken'
  | 'profile'
  | 'health'
  | 'plan'
  | 'activities'
  | 'analyses'
  | 'feedbacks'
  | 'banister'
  | 'lifetime'
  | 'progress'
  | 'pendingRpeActivityId'
  | 'reminders'
  | 'clubs'
>;

export type PersistedSession = {
  version: number;
  rsid: string;
  savedAt: string;
  deviceLabel: string;
  state: PersistedAppState;
};

const DEBOUNCE_MS = 800;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingArgs: {
  rsid: string;
  state: AppState;
  label: string;
} | null = null;

/** Migration une fois `@training/*` → `@azimut/*`. */
export async function migrateLegacyKeys(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return;
    const existing = await AsyncStorage.getItem(KEYS.meta);
    if (existing) {
      await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
      return;
    }
    const parsed = JSON.parse(legacy) as PersistedSession;
    if (!parsed?.state?.authToken || !parsed.rsid) return;
    await writeDomains(parsed.rsid, parsed.state as AppState, parsed.deviceLabel || 'Device');
    await AsyncStorage.removeItem(LEGACY_SESSION_KEY);

    // Autres clés legacy → azimut (copie si cible absente)
    const renames: Array<[string, string]> = [
      ['@training/rsid', '@azimut/rsid'],
      ['@training/user-registry', '@azimut/user-registry'],
      ['@training/onboarding-completed-v1', '@azimut/onboarding-completed-v1'],
      ['@training/notif-prompt-handled-v2', '@azimut/notif-prompt-handled-v2'],
    ];
    for (const [from, to] of renames) {
      const v = await AsyncStorage.getItem(from);
      if (v == null) continue;
      const dest = await AsyncStorage.getItem(to);
      if (dest == null) await AsyncStorage.setItem(to, v);
    }
  } catch {
    /* ignore */
  }
}

async function writeDomains(
  rsid: string,
  state: AppState,
  label: string,
): Promise<void> {
  if (!state.authToken) {
    await clearSession();
    return;
  }

  const savedAt = new Date().toISOString();
  await AsyncStorage.multiSet([
    [
      KEYS.meta,
      JSON.stringify({
        version: SESSION_VERSION,
        rsid,
        savedAt,
        deviceLabel: label,
      }),
    ],
    [
      KEYS.auth,
      JSON.stringify({
        authToken: state.authToken,
        profile: state.profile,
      }),
    ],
    [KEYS.health, JSON.stringify(state.health ?? {})],
    [
      KEYS.light,
      JSON.stringify({
        analyses: state.analyses ?? [],
        feedbacks: state.feedbacks ?? [],
        lifetime: state.lifetime,
        progress: state.progress,
        // clubs = cache lecture seule — on persiste pour offline-read, jamais source de vérité
        clubs: state.clubs ?? [],
      }),
    ],
    [
      KEYS.ephemeral,
      JSON.stringify({
        pendingRpeActivityId: state.pendingRpeActivityId ?? null,
        reminders: state.reminders ?? [],
      }),
    ],
  ]);

  // Domaines lourds — écritures incrémentales (SQLite natif / clés séparées web)
  await Promise.all([
    saveActivities(state.activities ?? []),
    savePlan(state.plan ?? []),
    saveBanister(state.banister),
  ]);
}

/** Écriture immédiate (fin de séance, logout, achat). */
export async function saveSessionImmediate(
  rsid: string,
  state: AppState,
  label: string,
): Promise<void> {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingArgs = null;
  }
  await writeDomains(rsid, state, label);
}

/**
 * Debounce 800 ms — interactions UI mineures ne réécrivent pas tout de suite.
 * Alias historique `saveSession` = schedule.
 */
export function saveSession(
  rsid: string,
  state: AppState,
  label: string,
): Promise<void> {
  pendingArgs = { rsid, state, label };
  if (pendingTimer) clearTimeout(pendingTimer);
  return new Promise((resolve) => {
    pendingTimer = setTimeout(() => {
      const args = pendingArgs;
      pendingTimer = null;
      pendingArgs = null;
      if (!args) {
        resolve();
        return;
      }
      void writeDomains(args.rsid, args.state, args.label).then(resolve);
    }, DEBOUNCE_MS);
  });
}

/** Flush sync du debounce en cours (avant unload / fin critique). */
export async function flushPendingSessionSave(): Promise<void> {
  if (!pendingArgs) return;
  const args = pendingArgs;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingArgs = null;
  await writeDomains(args.rsid, args.state, args.label);
}

export async function loadSession(): Promise<PersistedSession | null> {
  await migrateLegacyKeys();

  const metaRaw = await AsyncStorage.getItem(KEYS.meta);
  if (!metaRaw) {
    // Fallback legacy non migré
    const legacy = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    try {
      const parsed = JSON.parse(legacy) as PersistedSession;
      if (!parsed.state?.authToken || !parsed.rsid) return null;
      return { ...parsed, version: SESSION_VERSION };
    } catch {
      return null;
    }
  }

  try {
    const meta = JSON.parse(metaRaw) as {
      version: number;
      rsid: string;
      savedAt: string;
      deviceLabel: string;
    };
    const [authRaw, healthRaw, lightRaw, ephemeralRaw] = await AsyncStorage.multiGet([
      KEYS.auth,
      KEYS.health,
      KEYS.light,
      KEYS.ephemeral,
    ]).then((pairs) => pairs.map((p) => p[1]));

    if (!authRaw) return null;
    const auth = JSON.parse(authRaw) as {
      authToken: string;
      profile: AppState['profile'];
    };
    if (!auth.authToken) return null;

    const health = healthRaw ? JSON.parse(healthRaw) : {};
    const light = lightRaw
      ? JSON.parse(lightRaw)
      : {
          analyses: [],
          feedbacks: [],
          lifetime: undefined,
          progress: undefined,
          clubs: [],
        };
    const ephemeral = ephemeralRaw
      ? JSON.parse(ephemeralRaw)
      : { pendingRpeActivityId: null, reminders: [] };

    const heavy = await loadTrainingHeavy();

    return {
      version: meta.version || SESSION_VERSION,
      rsid: meta.rsid,
      savedAt: meta.savedAt,
      deviceLabel: meta.deviceLabel,
      state: {
        authToken: auth.authToken,
        profile: auth.profile,
        health,
        plan: heavy.plan,
        activities: heavy.activities,
        analyses: light.analyses ?? [],
        feedbacks: light.feedbacks ?? [],
        banister: heavy.banister,
        lifetime: light.lifetime,
        progress: light.progress,
        pendingRpeActivityId: ephemeral.pendingRpeActivityId ?? null,
        reminders: ephemeral.reminders ?? [],
        clubs: light.clubs ?? [],
      } as PersistedAppState,
    };
  } catch {
    return null;
  }
}

export async function isSessionValidForDevice(
  session: PersistedSession,
): Promise<boolean> {
  const currentRsid = await getCurrentRsid();
  return Boolean(
    currentRsid && currentRsid === session.rsid && session.state.authToken,
  );
}

export async function clearSession(): Promise<void> {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    pendingArgs = null;
  }
  await AsyncStorage.multiRemove([
    KEYS.meta,
    KEYS.auth,
    KEYS.health,
    KEYS.light,
    KEYS.ephemeral,
    LEGACY_SESSION_KEY,
  ]);
  await clearTrainingDb();
}
