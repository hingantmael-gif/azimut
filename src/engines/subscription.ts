import type { SubscriptionPlan, WatchBrandId } from '../types/domain';
import { watchResendLabel, watchSendLabel } from './watchExport';

export function isPremium(plan?: SubscriptionPlan): boolean {
  return plan === 'premium_monthly' || plan === 'premium_yearly';
}

/** Bonus XP Premium : désactivé sur le compétitif (anti pay-to-win — brief §5). */
export const PREMIUM_XP_BONUS_RATIO = 0;

/**
 * Gains d’XP compétitifs (ladder, sessions, RPE, likes…) : même rythme Free/Premium.
 * Ne pas réintroduire un bonus invisible sur le classement.
 */
export function withPremiumXpBonus(baseXp: number, _premium?: boolean): number {
  return Math.round(Math.max(0, baseXp));
}

/**
 * Réservé aux jalons non compétitifs (badges cosmétiques, etc.) si besoin plus tard.
 * Aujourd’hui : pas de bonus (parité éthique).
 */
export function withPremiumCosmeticXpBonus(
  baseXp: number,
  premium?: boolean,
): number {
  const n = Math.max(0, baseXp);
  if (!premium) return Math.round(n);
  return Math.round(n);
}

/** @deprecated — préférer watchSendLabel(brand) */
export const GARMIN_SEND_LABEL = watchSendLabel('garmin');
/** @deprecated — préférer watchResendLabel(brand) */
export const GARMIN_RESEND_LABEL = watchResendLabel('garmin');

export { watchSendLabel, watchResendLabel };

export function sendLabelForWatch(brandId?: WatchBrandId | null): string {
  return watchSendLabel(brandId);
}

export function resendLabelForWatch(brandId?: WatchBrandId | null): string {
  return watchResendLabel(brandId);
}

export const PREMIUM_GARMIN_LOCKED = '';

/**
 * RPE accessible dès J−3, le jour J, et indéfiniment après.
 * Bloqué seulement si la séance est à plus de 3 jours dans le futur.
 */
export function canAccessSessionRpe(
  workoutDateIso: string,
  todayIso: string = new Date().toISOString().slice(0, 10),
): boolean {
  const a = Date.parse(todayIso + 'T12:00:00');
  const b = Date.parse(workoutDateIso + 'T12:00:00');
  const daysUntil = Math.round((b - a) / (24 * 3600 * 1000));
  return daysUntil <= 3;
}

/** Feedback déjà enregistré pour cette séance (évite XP / RPE en boucle). */
export function hasRpeFeedbackForSession(
  feedbacks: Array<{ sessionId: string }>,
  sessionId: string | undefined | null,
): boolean {
  if (!sessionId) return false;
  return feedbacks.some((f) => f.sessionId === sessionId);
}
