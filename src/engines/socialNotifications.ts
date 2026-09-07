import type { SocialNotification } from '../types/domain';

/**
 * Style Instagram / fil d’activité :
 * - stockage plafonné (les plus anciennes sautent)
 * - affichage par pages (pas tout d’un coup)
 */
export const SOCIAL_NOTIF_MAX_STORED = 20;
export const SOCIAL_NOTIF_PAGE_SIZE = 8;

function createdMs(n: SocialNotification): number {
  return Date.parse(n.createdAt) || 0;
}

export function sortSocialNotificationsNewestFirst(
  list: SocialNotification[],
): SocialNotification[] {
  return [...list].sort((a, b) => createdMs(b) - createdMs(a));
}

function isPendingFollowRequest(n: SocialNotification): boolean {
  return n.kind === 'follow_request' && n.requestStatus === 'pending';
}

/**
 * Garde au plus `max` notifs. Supprime d’abord les plus anciennes.
 * Les demandes d’abonnement en attente sont prioritaires (jamais évincées
 * tant qu’il y a de la place pour elles).
 */
export function trimSocialNotifications(
  list: SocialNotification[],
  max: number = SOCIAL_NOTIF_MAX_STORED,
): SocialNotification[] {
  if (list.length <= max) return sortSocialNotificationsNewestFirst(list);

  const sorted = sortSocialNotificationsNewestFirst(list);
  const pending = sorted.filter(isPendingFollowRequest);
  const others = sorted.filter((n) => !isPendingFollowRequest(n));

  // Si trop de demandes pending, on garde les plus récentes parmi elles
  const pendingKept = pending.slice(0, max);
  const room = Math.max(0, max - pendingKept.length);
  const othersKept = others.slice(0, room);

  return sortSocialNotificationsNewestFirst([...pendingKept, ...othersKept]);
}

/** Ajoute une notif en tête puis applique le plafond */
export function prependSocialNotification(
  list: SocialNotification[],
  notif: SocialNotification,
  max: number = SOCIAL_NOTIF_MAX_STORED,
): SocialNotification[] {
  const withoutDup = list.filter((n) => n.id !== notif.id);
  return trimSocialNotifications([notif, ...withoutDup], max);
}

/** Première page visible (0-based) → items [0 .. (page+1)*size) */
export function visibleSocialNotifications(
  sortedNewestFirst: SocialNotification[],
  loadedPages: number,
  pageSize: number = SOCIAL_NOTIF_PAGE_SIZE,
): SocialNotification[] {
  const pages = Math.max(1, loadedPages);
  return sortedNewestFirst.slice(0, pages * pageSize);
}

export function hasMoreSocialNotifications(
  total: number,
  loadedPages: number,
  pageSize: number = SOCIAL_NOTIF_PAGE_SIZE,
): boolean {
  return loadedPages * pageSize < total;
}
