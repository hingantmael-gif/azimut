import { beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_OWNER_EMAIL', 'Owner@Example.com');
  return import('../ownerAccess');
}

const base = (email: string, over = {}) => ({
  email, plan: 'free' as const, authProvider: 'email', premiumSource: null,
  ranked: { xp: 0, level: 1, tier: 'bronze', division: 3 },
  ...over,
});

describe('compte propriétaire', () => {
  beforeEach(() => vi.unstubAllEnvs());

  it('est TOUJOURS Premium, même si le fournisseur de connexion est perdu ou différent', async () => {
    const { applyOwnerPremiumPolicy } = await load();
    for (const provider of ['email', 'google', 'local', undefined]) {
      const p = applyOwnerPremiumPolicy(base('owner@example.com', { authProvider: provider }) as never) as never as { plan: string; premiumSource: string };
      expect(p.plan).toBe('premium_yearly');
      expect(p.premiumSource).toBe('owner');
    }
  });

  it('un autre compte n’est jamais modifié', async () => {
    const { applyOwnerPremiumPolicy, isOwnerPremiumEmail } = await load();
    const other = base('someone@example.com');
    expect(isOwnerPremiumEmail('someone@example.com')).toBe(false);
    expect(applyOwnerPremiumPolicy(other as never)).toBe(other);
  });

  it('sans e-mail propriétaire configuré, personne n’est propriétaire', async () => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_OWNER_EMAIL', '');
    const { isOwnerPremiumEmail } = await import('../ownerAccess');
    expect(isOwnerPremiumEmail('')).toBe(false);
    expect(isOwnerPremiumEmail('owner@example.com')).toBe(false);
  });
});
