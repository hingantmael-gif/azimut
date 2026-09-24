import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, Share: {} }));
vi.mock('../../utils/appAlert', () => ({ Alert: { alert: () => undefined } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));
vi.mock('expo-web-browser', () => ({}));
vi.mock('expo-modules-core', () => ({}));
vi.mock('expo-location', () => ({}));
vi.mock('expo-notifications', () => ({}));
vi.mock('expo-secure-store', () => ({}));
vi.mock('expo-sqlite', () => ({}));
vi.mock('expo-linking', () => ({}));
vi.mock('expo-sharing', () => ({}));
vi.mock('expo-file-system', () => ({}));

import { resolvePaceZones } from '../paceZones';
import { makeFartlek, makeVmaIntervals, type RunSessionContext } from '../runSessionLibrary';
import { buildAppleWorkoutPlan } from '../watchFileFormats';

const ctx = (over: Partial<RunSessionContext> = {}): RunSessionContext => ({
  date: '2026-09-25',
  zones: resolvePaceZones({ level: 'confirme', weeklyKmAvg: 40 }),
  level: 'confirme',
  load: 1,
  block: 'developpement_general',
  weekIndex: 0,
  goal: '10k',
  ...over,
});

describe('buildAppleWorkoutPlan — plan WorkoutKit', () => {
  it('un fartlek devient UN bloc de 8 répétitions (effort + récup), pas 16 blocs', () => {
    const plan = buildAppleWorkoutPlan(makeFartlek(ctx()));
    const rep = plan.blocks.find((b) => b.iterations === 8);
    expect(rep).toBeDefined();
    expect(rep!.steps.map((s) => s.purpose)).toEqual(['work', 'recovery']);
    expect(rep!.steps[0]!.displayName).toBe('Accélération · 1 min rapide');
    expect(plan.blocks.length).toBeLessThanOrEqual(3);
  });

  it('les étapes d’échauffement consécutives sont fusionnées en UNE étape (durées additionnées)', () => {
    const w = makeFartlek(ctx());
    const wuTotal = w.steps.filter((s) => s.type === 'warmup').reduce((n, s) => n + (s.durationSec ?? 0), 0);
    const plan = buildAppleWorkoutPlan(w);
    expect(plan.warmup?.goal).toEqual({ type: 'time', value: wuTotal, unit: 'seconds' });
    expect(plan.cooldown?.purpose).toBe('cooldown');
  });

  it('« N × effort » + sa récupération donne un bloc de N itérations', () => {
    const plan = buildAppleWorkoutPlan(makeVmaIntervals(ctx()));
    const rep = plan.blocks.find((b) => b.iterations > 1);
    expect(rep).toBeDefined();
    expect(rep!.steps).toHaveLength(2);
  });

  it('activité, date et titre sont repris pour la planification', () => {
    const w = makeVmaIntervals(ctx());
    const plan = buildAppleWorkoutPlan(w);
    expect(plan.activity).toBe('running');
    expect(plan.scheduledDate).toBe('2026-09-25');
    expect(plan.displayName).toBe(w.title);
    expect(plan.version).toBe(1);
  });
});
