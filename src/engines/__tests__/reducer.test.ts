import { describe, expect, it, vi } from 'vitest';

// Le reducer vit dans un fichier qui importe React Native : on neutralise ces modules pour le tester en Node.
vi.mock('react-native', () => ({ Platform: { OS: 'web', select: (o: Record<string, unknown>) => o.web ?? o.default }, AppState: { addEventListener: () => ({ remove() {} }) } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined, multiGet: async () => [], multiSet: async () => undefined, multiRemove: async () => undefined },
}));
vi.mock('expo-web-browser', () => ({}));
vi.mock('expo-modules-core', () => ({}));
vi.mock('expo-location', () => ({}));
vi.mock('expo-notifications', () => ({}));
vi.mock('expo-secure-store', () => ({}));
vi.mock('expo-sqlite', () => ({}));
vi.mock('expo-crypto', () => ({}));
vi.mock('expo-linking', () => ({}));
vi.mock('expo-auth-session', () => ({}));
vi.mock('expo-document-picker', () => ({}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({}));
vi.mock('expo-constants', () => ({ default: { expoConfig: {} } }));

import { buildFreshAccountState } from '../../data/seed';
import type { StravaActivity } from '../../types/domain';

const load = async () => (await import('../../store/AppContext')).reduceAppState;

const activity = (id: string): StravaActivity =>
  ({ id, name: 'Footing', distanceM: 8000, elapsedSec: 2700, movingSec: 2650, startDate: new Date().toISOString(), sport: 'run' }) as StravaActivity;

describe('reducer AppContext', () => {
  it('INGEST_STRAVA ajoute l’activité en tête et compte la séance', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const s1 = reduce(s0, { type: 'INGEST_STRAVA', activity: activity('a1'), linkPlan: false });
    expect(s1.activities[0]?.id).toBe('a1');
    expect(s1.lifetime.totalSessions).toBe(s0.lifetime.totalSessions + 1);
    expect(s1.lifetime.totalKm).toBeCloseTo(s0.lifetime.totalKm + 8, 1);
  });

  it('INGEST_STRAVA ignore un doublon', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const a = activity('dup');
    const s1 = reduce(s0, { type: 'INGEST_STRAVA', activity: a, linkPlan: false });
    const s2 = reduce(s1, { type: 'INGEST_STRAVA', activity: a, linkPlan: false });
    expect(s2.activities).toHaveLength(1);
  });

  it('APPLY_REMOTE_SYNC n’écrase jamais le jeton de session', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('mon-jeton', { onboardingCompleted: true });
    const s1 = reduce(s0, { type: 'APPLY_REMOTE_SYNC', patch: { authToken: 'pirate', activities: [activity('r1')] } });
    expect(s1.authToken).toBe('mon-jeton');
    expect(s1.activities.map((a) => a.id)).toEqual(['r1']);
  });

  it('REFRESH_TOKEN remplace le jeton seulement si connecté', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('ancien', { onboardingCompleted: true });
    expect(reduce(s0, { type: 'REFRESH_TOKEN', authToken: 'nouveau' }).authToken).toBe('nouveau');
    expect(reduce({ ...s0, authToken: null }, { type: 'REFRESH_TOKEN', authToken: 'x' }).authToken).toBeNull();
  });

  it('LOGOUT et DELETE_ACCOUNT vident l’état', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const s1 = reduce(reduce(s0, { type: 'INGEST_STRAVA', activity: activity('z'), linkPlan: false }), { type: 'DELETE_ACCOUNT' });
    expect(s1.authToken).toBeNull();
    expect(s1.activities).toHaveLength(0);
  });
});
