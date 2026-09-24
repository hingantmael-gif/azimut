import type { AppState } from '../data/seed';
import { enqueueSocialInboxEvent } from '../storage/socialInbox';
import type { SocialNotification } from '../types/domain';

/** Sous-ensemble d’actions qui génèrent une notif destinataire. */
export type SocialFanOutAction =
  | { type: 'FOLLOW_USER'; username: string; requiresApproval?: boolean }
  | { type: 'ACCEPT_FOLLOW_REQUEST'; notificationId: string }
  | {
      type: 'LIKE_PROGRAM';
      ownerUsername: string;
      programId: string;
      programTitle: string;
    }
  | {
      type: 'LIKE_SESSION';
      ownerUsername: string;
      sessionId: string;
      sessionTitle: string;
    };

function displayName(state: AppState): string {
  const p = state.profile;
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return full || p.username || 'Athlète';
}

function meUsername(state: AppState): string {
  return (state.profile.username ?? '').trim().toLowerCase().replace(/^@/, '');
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isFanOutAction(action: { type: string }): action is SocialFanOutAction {
  return (
    action.type === 'FOLLOW_USER' ||
    action.type === 'ACCEPT_FOLLOW_REQUEST' ||
    action.type === 'LIKE_PROGRAM' ||
    action.type === 'LIKE_SESSION'
  );
}

/**
 * Effet de bord après une action sociale : dépose la notif
 * dans la boîte du destinataire (livrée par SocialInboxBootstrap).
 */
export function fanOutSocialSideEffect(
  action: { type: string },
  prev: AppState,
): void {
  if (!isFanOutAction(action)) return;
  const from = meUsername(prev);
  if (!from || !prev.authToken) return;
  const fromDisplayName = displayName(prev);

  if (action.type === 'FOLLOW_USER') {
    const target = action.username.trim().toLowerCase().replace(/^@/, '');
    if (!target || target === from) return;
    const notification: SocialNotification = action.requiresApproval
      ? {
          id: newId('fr'),
          kind: 'follow_request',
          fromUsername: from,
          fromDisplayName,
          createdAt: new Date().toISOString(),
          read: false,
          requestStatus: 'pending',
        }
      : {
          id: newId('nf'),
          kind: 'new_follower',
          fromUsername: from,
          fromDisplayName,
          createdAt: new Date().toISOString(),
          read: false,
        };
    void enqueueSocialInboxEvent({
      recipientUsername: target,
      notification,
    });
    return;
  }

  if (action.type === 'ACCEPT_FOLLOW_REQUEST') {
    const notifs = prev.profile.socialNotifications ?? [];
    const n = notifs.find((x) => x.id === action.notificationId);
    if (!n || n.kind !== 'follow_request') return;
    void enqueueSocialInboxEvent({
      recipientUsername: n.fromUsername,
      notification: {
        id: newId('fa'),
        kind: 'follow_accepted',
        fromUsername: from,
        fromDisplayName,
        createdAt: new Date().toISOString(),
        read: false,
      },
    });
    return;
  }

  if (action.type === 'LIKE_PROGRAM') {
    const owner = action.ownerUsername.trim().toLowerCase().replace(/^@/, '');
    if (!owner || owner === from) return;
    void enqueueSocialInboxEvent({
      recipientUsername: owner,
      notification: {
        id: newId('pl'),
        kind: 'program_like',
        fromUsername: from,
        fromDisplayName,
        createdAt: new Date().toISOString(),
        read: false,
        programTitle: action.programTitle,
      },
    });
    return;
  }

  if (action.type === 'LIKE_SESSION') {
    const owner = action.ownerUsername.trim().toLowerCase().replace(/^@/, '');
    if (!owner || owner === from) return;
    void enqueueSocialInboxEvent({
      recipientUsername: owner,
      notification: {
        id: newId('sl'),
        kind: 'session_like',
        fromUsername: from,
        fromDisplayName,
        createdAt: new Date().toISOString(),
        read: false,
        programTitle: action.sessionTitle,
      },
    });
  }
}
