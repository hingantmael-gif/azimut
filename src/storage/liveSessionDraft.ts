import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportDiscipline } from '../types/domain';
import type { GpsPoint } from '../hooks/useLiveGpsTrack';

const KEY = '@azimut/live-session-draft-v1';

export type LiveSessionDraft = {
  v: 1;
  /** Clé stable : planned id, ou `free:run` / `free:bike` */
  key: string;
  plannedId?: string;
  mode?: 'free';
  sport?: 'run' | 'bike' | 'swim';
  title: string;
  discipline: SportDiscipline;
  startIso: string;
  savedAt: string;
  elapsedSec: number;
  movingSec: number;
  distanceM: number;
  points: GpsPoint[];
  wallPausedAccumMs: number;
};

export function liveDraftKey(opts: {
  plannedId?: string;
  mode?: string;
  sport?: string;
}): string {
  if (opts.mode === 'free') {
    return `free:${opts.sport === 'bike' ? 'bike' : 'run'}`;
  }
  return opts.plannedId ?? 'unknown';
}

export async function loadLiveDraft(): Promise<LiveSessionDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveSessionDraft;
    if (parsed?.v !== 1 || !parsed.key || !Array.isArray(parsed.points)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveLiveDraft(draft: LiveSessionDraft): Promise<void> {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ ...draft, v: 1, savedAt: new Date().toISOString() }),
  );
}

export async function clearLiveDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function liveDraftResumeParams(draft: LiveSessionDraft): Record<string, string> {
  if (draft.mode === 'free' || draft.key.startsWith('free:')) {
    return {
      mode: 'free',
      sport: draft.sport === 'bike' ? 'bike' : 'run',
      resume: '1',
    };
  }
  return {
    id: draft.plannedId ?? draft.key,
    resume: '1',
  };
}
