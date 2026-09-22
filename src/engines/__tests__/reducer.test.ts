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

  const night = (date: string) => ({
    totalMinutes: 420,
    lightMinutes: 220,
    deepMinutes: 100,
    remMinutes: 100,
    score: 72,
    date,
  });

  it('WITHDRAW_HEALTH_CONSENT purge le sommeil sans toucher au reste de l’état', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const s1 = reduce(s0, { type: 'UPSERT_SLEEP', night: night('2026-09-20') });
    expect(s1.health.sleep?.date).toBe('2026-09-20');
    const s2 = reduce(s1, { type: 'WITHDRAW_HEALTH_CONSENT' });
    expect(s2.health).toEqual({});
    expect(s2.profile.id).toBe(s1.profile.id);
    expect(s2.plan).toEqual(s1.plan);
  });

  it('healthDataConsent: false bloque toute nouvelle ingestion santé (UPSERT_SLEEP et INGEST_HEALTH)', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const withdrawn = {
      ...s0,
      profile: { ...s0.profile, healthDataConsent: false as const },
    };
    const s1 = reduce(withdrawn, { type: 'UPSERT_SLEEP', night: night('2026-09-20') });
    expect(s1.health.sleep).toBeUndefined();
    const s2 = reduce(withdrawn, {
      type: 'INGEST_HEALTH',
      health: { sleep: night('2026-09-21') },
    });
    expect(s2.health.sleep).toBeUndefined();
  });

  it('réactiver le consentement (healthDataConsent: true) laisse de nouveau l’ingestion passer', async () => {
    const reduce = await load();
    const s0 = buildFreshAccountState('tok', { onboardingCompleted: true });
    const reenabled = {
      ...s0,
      profile: { ...s0.profile, healthDataConsent: true as const },
    };
    const s1 = reduce(reenabled, { type: 'UPSERT_SLEEP', night: night('2026-09-22') });
    expect(s1.health.sleep?.date).toBe('2026-09-22');
  });
});
