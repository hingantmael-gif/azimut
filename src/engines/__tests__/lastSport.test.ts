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
import type { PlannedWorkout } from '../../types/domain';

const w = (over: Partial<PlannedWorkout>): PlannedWorkout => ({ id: 'w-quick-1', title: 'Séance', date: '2026-09-21', discipline: 'run', steps: [], ...over }) as PlannedWorkout;

describe('fond ambiant : dernière discipline choisie', () => {
  it('séance lancée : la discipline devient la dernière choisie ; le repos ne compte pas', async () => {
    const { lastSportAfter } = await import('../../store/AppContext');
    const s = buildFreshAccountState('t', { onboardingCompleted: true });
    expect(lastSportAfter(s, { type: 'ADD_WORKOUT', workout: w({ discipline: 'swim' }) })).toBe('swim');
    expect(lastSportAfter(s, { type: 'ADD_WORKOUT', workout: w({ discipline: 'bike' }) })).toBe('bike');
    expect(lastSportAfter(s, { type: 'ADD_WORKOUT', workout: w({ discipline: 'rest' }) })).toBeUndefined();
  });

  it('callisthénie et musculation ont chacune leur fond', async () => {
    const { lastSportAfter } = await import('../../store/AppContext');
    const s = buildFreshAccountState('t', { onboardingCompleted: true });
    expect(lastSportAfter(s, { type: 'ADD_WORKOUT', workout: w({ discipline: 'strength', title: 'Callisthénie · Abdos · muscle' }) })).toBe('calisthenics');
    expect(lastSportAfter(s, { type: 'ADD_WORKOUT', workout: w({ discipline: 'strength', title: 'Musculation · Haut du corps' }) })).toBe('strength');
  });

  it('autres actions : aucun changement', async () => {
    const { lastSportAfter } = await import('../../store/AppContext');
    const s = buildFreshAccountState('t', { onboardingCompleted: true });
    expect(lastSportAfter(s, { type: 'REMOVE_WORKOUT', id: 'x' })).toBeUndefined();
  });
});
