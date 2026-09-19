import {
  canUseFreeQuota,
  consumeUsageQuota,
  type UsageQuotaKind,
} from '../storage/usageQuotas';
import { shouldEnforceFreeLimits } from './entitlement';
import type { AthleteProfile } from '../types/domain';

/** Vérifie le quota Free ; si OK et non premium, consomme 1 unité. */
export async function takeUsageQuotaIfNeeded(
  kind: UsageQuotaKind,
  profile: Pick<AthleteProfile, 'plan' | 'subscription' | 'premiumSource'>,
): Promise<'ok' | 'paywall'> {
  if (
    !shouldEnforceFreeLimits({
      plan: profile.plan,
      subscription: profile.subscription,
      premiumSource: profile.premiumSource,
    })
  ) {
    return 'ok';
  }
  const allowed = await canUseFreeQuota(kind);
  if (!allowed) return 'paywall';
  await consumeUsageQuota(kind);
  return 'ok';
}

/** Pré-check sans consommer (pour afficher le paywall avant l’action). */
export async function peekUsageQuotaAllowed(
  kind: UsageQuotaKind,
  profile: Pick<AthleteProfile, 'plan' | 'subscription' | 'premiumSource'>,
): Promise<boolean> {
  if (
    !shouldEnforceFreeLimits({
      plan: profile.plan,
      subscription: profile.subscription,
      premiumSource: profile.premiumSource,
    })
  ) {
    return true;
  }
  return canUseFreeQuota(kind);
}
