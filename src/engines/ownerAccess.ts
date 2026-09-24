import type { RankedProgress, SubscriptionPlan } from '../types/domain';
import { levelFromXp, totalXpToReachLevel } from './core';

/**
 * Compte propriétaire : Premium gratuit, connexion Google obligatoire.
 * (Client + backend — l’e-mail doit matcher exactement après normalisation.)
 */
export const OWNER_PREMIUM_EMAIL = String(process.env.EXPO_PUBLIC_OWNER_EMAIL ?? '')
  .trim()
  .toLowerCase();

export const OWNER_GOOGLE_ONLY_MESSAGE =
  'Ce compte ultra-sécurisé doit se connecter uniquement avec Google.';

export type AuthProviderId = 'google' | 'email' | 'apple' | 'local' | 'trial';

/** Origine du Premium — les abonnés payants ne sont pas gérables par l’owner. */
export type PremiumSource = 'owner' | 'gift' | 'paid';

export function normalizeAccountEmail(email: string | undefined | null): string {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

export function isOwnerPremiumEmail(email: string | undefined | null): boolean {
  return OWNER_PREMIUM_EMAIL !== '' && normalizeAccountEmail(email) === OWNER_PREMIUM_EMAIL;
}

/** Premium gratuit uniquement si e-mail propriétaire + Google. */
export function isOwnerGooglePremiumGrant(
  email: string | undefined | null,
  provider: AuthProviderId | string | undefined | null,
): boolean {
  return isOwnerPremiumEmail(email) && provider === 'google';
}

export function ownerPremiumPlan(): SubscriptionPlan {
  return 'premium_yearly';
}

/** Niveau Champion (tier compétitif) — XP plancher. */
export const OWNER_CHAMPION_LEVEL = 55;

export function forceOwnerChampionRank(ranked: RankedProgress): RankedProgress {
  const minXp = totalXpToReachLevel(OWNER_CHAMPION_LEVEL);
  const xp = Math.max(ranked.xp ?? 0, minXp);
  const level = Math.max(ranked.level ?? 1, levelFromXp(xp), OWNER_CHAMPION_LEVEL);
  return {
    ...ranked,
    xp,
    level,
    tier: 'champion',
    division: null,
  };
}

/**
 * Le compte propriétaire est toujours Premium (et Champion). Les autres comptes ne sont pas touchés ici
 * (les cadeaux Premium sont gérés à part, et seul le propriétaire peut en faire).
 */
export function applyOwnerPremiumPolicy<
  T extends {
    email: string;
    plan: SubscriptionPlan;
    authProvider?: AuthProviderId | string | null;
    premiumSource?: PremiumSource | null;
    ranked: RankedProgress;
  },
>(profile: T): T {
  if (!isOwnerPremiumEmail(profile.email)) return profile;
  // Le compte propriétaire est TOUJOURS Premium, sans exception (jamais « gratuit », même après une synchro
  // ou une reconnexion). La connexion Google obligatoire est vérifiée à l'ouverture de session (AUTH_WITH_PROVIDER),
  // pas ici : sinon un champ « fournisseur » perdu en route rétrogradait le compte.
  return {
    ...profile,
    plan: ownerPremiumPlan(),
    authProvider: 'google',
    premiumSource: 'owner',
    ranked: forceOwnerChampionRank(profile.ranked),
  };
}

/** True si l’abonnement ne peut pas être retiré par l’owner (paiement réel). */
export function isPaidPremiumSource(source?: PremiumSource | null): boolean {
  return source === 'paid';
}

export function canOwnerRevokePremium(source?: PremiumSource | null): boolean {
  return source === 'gift' || source == null || source === undefined;
}

/**
 * Compte ultra-sécurisé : reste Champion en privé, invisible dans les listes
 * de classement (ladder, mondial, odyssée) pour tout le monde — y compris soi.
 */
export function isOwnerHiddenFromPublicRankings(
  email: string | undefined | null,
): boolean {
  return isOwnerPremiumEmail(email);
}
