import { describe, expect, it } from 'vitest';
import {
  compactActivity,
  downsampleTrack,
  extractSyncFields,
  fingerprint,
  isFreshLocal,
  mergeRemote,
  type SyncFields,
} from '../cloudSync';
import { buildFreshAccountState } from '../../data/seed';

const emptyState = () => buildFreshAccountState('t', { onboardingCompleted: false });
import type { StravaActivity } from '../../types/domain';

const act = (id: string, startDate: string, extra: Partial<StravaActivity> = {}): StravaActivity =>
  ({ id, name: id, startDate, distanceM: 5000, elapsedSec: 1800, movingSec: 1800, ...extra }) as StravaActivity;

describe('cloudSync', () => {
  it('sous-échantillonne un long tracé GPS en gardant début et fin', () => {
    const pts = Array.from({ length: 5000 }, (_, i) => i);
    const out = downsampleTrack(pts, 600)!;
    expect(out).toHaveLength(600);
    expect(out[0]).toBe(0);
    expect(out[599]).toBe(4999);
    expect(downsampleTrack([1, 2, 3], 600)).toEqual([1, 2, 3]);
  });

  it('compacte une activité : tracé réduit, flux détaillés retirés', () => {
    const latlng = Array.from({ length: 2000 }, (_, i) => [i, i] as [number, number]);
    const c = compactActivity(
      act('a', '2026-09-01T08:00:00Z', {
        streams: { time: latlng.map((_, i) => i), latlng, heartrate: latlng.map(() => 150) },
      }),
    );
    expect(c.streams?.latlng).toHaveLength(600);
    expect(c.streams?.heartrate).toBeUndefined();
  });

  it('détecte un compte local neuf', () => {
    const s = emptyState();
    expect(isFreshLocal(s)).toBe(true);
    expect(isFreshLocal({ ...s, activities: [act('a', '2026-09-01T08:00:00Z')] })).toBe(false);
  });

  it('fusion : les activités des deux appareils sont réunies, triées, sans doublon', () => {
    const local = { ...emptyState(), activities: [act('a', '2026-09-02T08:00:00Z'), act('b', '2026-09-01T08:00:00Z')] };
    const remote: SyncFields = {
      ...extractSyncFields(emptyState()),
      activities: [act('b', '2026-09-01T08:00:00Z'), act('c', '2026-09-03T08:00:00Z')],
    };
    const merged = mergeRemote(local, remote, false);
    expect(merged.activities!.map((a) => a.id)).toEqual(['c', 'a', 'b']);
  });

  it('fusion : identité locale conservée, données distantes adoptées si le local est neuf', () => {
    const local = emptyState();
    local.profile = { ...local.profile, id: 'me', email: 'me@x.fr', username: 'me' };
    const remoteState = emptyState();
    remoteState.profile = { ...remoteState.profile, id: 'other', email: 'o@x.fr', username: 'other', onboardingCompleted: true };
    remoteState.plan = [{ id: 'w1', date: '2026-09-20', discipline: 'run', title: 'Footing', steps: [] } as never];
    const merged = mergeRemote(local, extractSyncFields(remoteState), false);
    expect(merged.profile!.id).toBe('me');
    expect(merged.profile!.email).toBe('me@x.fr');
    expect(merged.profile!.onboardingCompleted).toBe(true);
    expect(merged.plan).toHaveLength(1);
  });

  it('fusion : le local non neuf garde son plan tant que le distant n’est pas plus récent', () => {
    const local = { ...emptyState(), activities: [act('a', '2026-09-02T08:00:00Z')] };
    local.plan = [{ id: 'mine', date: '2026-09-20', discipline: 'run', title: 'Local', steps: [] } as never];
    const remote = extractSyncFields({ ...emptyState(), plan: [{ id: 'theirs' } as never] });
    expect(mergeRemote(local, remote, false).plan).toBeUndefined();
    expect(mergeRemote(local, remote, true).plan).toEqual([{ id: 'theirs' }]);
  });

  it('empreinte : identique pour un même contenu, différente sinon', () => {
    const base = emptyState();
    const a = extractSyncFields(base);
    expect(fingerprint(a)).toBe(fingerprint(extractSyncFields({ ...base })));
    expect(fingerprint({ ...a, activities: [act('x', '2026-09-01T08:00:00Z')] })).not.toBe(fingerprint(a));
  });
});
