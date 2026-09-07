import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from '../data/seed';
import { getCurrentRsid } from './deviceSession';

const SESSION_KEY = '@training/session';
const SESSION_VERSION = 3;

export type PersistedSession = {
  version: number;
  rsid: string;
  savedAt: string;
  deviceLabel: string;
  state: PersistedAppState;
};

/** Sous-ensemble de l'état à conserver entre les rechargements */
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
>;

export async function saveSession(
  rsid: string,
  state: AppState,
  label: string,
): Promise<void> {
  if (!state.authToken) {
    await clearSession();
    return;
  }

  const payload: PersistedSession = {
    version: SESSION_VERSION,
    rsid,
    savedAt: new Date().toISOString(),
    deviceLabel: label,
    state: {
      authToken: state.authToken,
      profile: state.profile,
      health: state.health,
      plan: state.plan,
      activities: state.activities,
      analyses: state.analyses,
      feedbacks: state.feedbacks,
      banister: state.banister,
      lifetime: state.lifetime,
      progress: state.progress,
      pendingRpeActivityId: state.pendingRpeActivityId,
      reminders: state.reminders,
    },
  };

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export async function loadSession(): Promise<PersistedSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed.version !== SESSION_VERSION || !parsed.rsid || !parsed.state?.authToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Session valide uniquement si l'RSID correspond à cet appareil. */
export async function isSessionValidForDevice(session: PersistedSession): Promise<boolean> {
  const currentRsid = await getCurrentRsid();
  return Boolean(currentRsid && currentRsid === session.rsid && session.state.authToken);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
