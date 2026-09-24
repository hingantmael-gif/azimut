import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web', select: (o: Record<string, unknown>) => o.web ?? o.default }, Share: {} }));
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
vi.mock('expo-constants', () => ({ default: { expoConfig: {} } }));
import { PREMIUM_GATES_ENABLED, PREMIUM_UI_ENABLED, isPremiumGateActive } from '../../premium/featureFlags';
import { canStackAnotherProgram, hasPremiumAccess, maxActiveProgramsAllowed, shouldEnforceFreeLimits } from '../../premium/entitlement';
import { hasPremiumPerks } from '../subscription';
import { PROFILE_COVERS, isProfileCoverUnlocked, profileCoverLockHint } from '../profileCovers';
import { searchSettings } from '../../constants/settingsSearch';

/**
 * Premium est désactivé (featureFlags.ts) : tout est gratuit et le mot « Premium » n'apparaît nulle part.
 * Ces tests garantissent que le code Premium reste en place mais inactif ; ils devront être adaptés
 * (ou ignorés) le jour où les deux drapeaux repassent à true.
 */
describe.skipIf(PREMIUM_UI_ENABLED || PREMIUM_GATES_ENABLED)('Premium désactivé', () => {
  const free = { plan: 'free' as const, subscription: null, premiumSource: null };

  it('les gates sont inactifs', () => {
    expect(isPremiumGateActive()).toBe(false);
  });

  it('un compte gratuit a accès à tout, sans quota ni limite de programmes', () => {
    expect(hasPremiumAccess(free)).toBe(true);
    expect(shouldEnforceFreeLimits(free)).toBe(false);
    expect(maxActiveProgramsAllowed(false)).toBe(99);
    expect(canStackAnotherProgram(5, false)).toBe(true);
    expect(hasPremiumPerks('free')).toBe(true);
  });

  it('tous les fonds animés sont débloqués, sans libellé « Premium »', () => {
    const prem = PROFILE_COVERS.filter((c) => c.unlock.type === 'premium');
    expect(prem.length).toBeGreaterThan(0);
    for (const c of prem) {
      expect(isProfileCoverUnlocked(c, { premium: hasPremiumAccess(free) } as never)).toBe(true);
      expect(c.description).not.toMatch(/premium/i);
      expect(profileCoverLockHint(c)).not.toMatch(/premium/i);
    }
  });

  it('la recherche dans les réglages ne renvoie plus rien sur Premium / abonnement', () => {
    expect(searchSettings('premium')).toEqual([]);
    expect(searchSettings('abonnement').some((r) => r.id === 'subscription' || r.id === 'premium-manage')).toBe(false);
  });
});
