import type { SubscriptionPlan } from '../types/domain';
import { isPremium } from '../engines/subscription';
import { isPremiumGateActive } from './featureFlags';
import { FREE_QUOTAS } from './quotas';

export type EntitlementStatus =
  | 'none'
  | 'active'
  | 'grace_period'
  | 'on_hold'
  | 'canceled'
  | 'paused'
  | 'expired';

export type ProfileSubscription = {
  entitlement: 'free' | 'premium';
  status: EntitlementStatus;
  productId?: string | null;
  currentPeriodEnd?: string | null;
  autoRenewing?: boolean;
  platform?: 'android' | 'ios' | 'web' | null;
  lastSyncedAt?: string | null;
};

/** Accès Premium effectif (plan local OU statut store encore actif / grâce OU source gift/owner/paid). */
export function hasPremiumAccess(opts: {
  plan?: SubscriptionPlan | null;
  subscription?: ProfileSubscription | null;
  premiumSource?: 'owner' | 'gift' | 'paid' | null;
}): boolean {
  if (
    opts.premiumSource === 'owner' ||
    opts.premiumSource === 'gift' ||
    opts.premiumSource === 'paid'
  ) {
    return true;
  }
  if (isPremium(opts.plan ?? undefined)) return true;
  const st = opts.subscription?.status;
  if (st === 'active' || st === 'grace_period' || st === 'canceled') {
    // canceled = accès jusqu’à currentPeriodEnd (si passé → free côté sync)
    if (st === 'canceled' && opts.subscription?.currentPeriodEnd) {
      const end = Date.parse(opts.subscription.currentPeriodEnd);
      if (Number.isFinite(end) && end < Date.now()) return false;
    }
    return opts.subscription?.entitlement === 'premium' || isPremium(opts.plan ?? undefined);
  }
  return false;
}

/** Gates actifs ET utilisateur non premium → appliquer quotas / locks. */
export function shouldEnforceFreeLimits(opts: {
  plan?: SubscriptionPlan | null;
  subscription?: ProfileSubscription | null;
  premiumSource?: 'owner' | 'gift' | 'paid' | null;
}): boolean {
  if (!isPremiumGateActive()) return false;
  return !hasPremiumAccess(opts);
}

export function maxActiveProgramsAllowed(premium: boolean): number {
  if (!isPremiumGateActive()) return 99;
  return premium ? 99 : FREE_QUOTAS.maxActivePrograms;
}

export function canStackAnotherProgram(
  activeCount: number,
  premium: boolean,
): boolean {
  return activeCount < maxActiveProgramsAllowed(premium);
}
