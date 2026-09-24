import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SocialNotification } from '../types/domain';

const INBOX_KEY = '@azimut/social-inbox-v1';
const MAX_PER_RECIPIENT = 40;

export type SocialInboxEvent = {
  id: string;
  recipientUsername: string;
  createdAt: string;
  notification: SocialNotification;
};

type InboxStore = Record<string, SocialInboxEvent[]>;

function normalizeUser(u: string): string {
  return u.trim().toLowerCase().replace(/^@/, '');
}

async function loadStore(): Promise<InboxStore> {
  try {
    const raw = await AsyncStorage.getItem(INBOX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as InboxStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveStore(store: InboxStore): Promise<void> {
  await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(store));
}

/**
 * Dépose une notif pour le destinataire (autre compte / même appareil).
 * Plafond par destinataire pour éviter la surcharge.
 */
export async function enqueueSocialInboxEvent(input: {
  recipientUsername: string;
  notification: SocialNotification;
}): Promise<void> {
  const recipient = normalizeUser(input.recipientUsername);
  const from = normalizeUser(input.notification.fromUsername);
  if (!recipient || !from || recipient === from) return;

  const store = await loadStore();
  const list = store[recipient] ?? [];
  if (list.some((e) => e.id === input.notification.id)) {
    return;
  }
  // Anti-doublon métier : même type + même expéditeur encore non livré
  if (
    list.some(
      (e) =>
        e.notification.kind === input.notification.kind &&
        e.notification.fromUsername === from &&
        (input.notification.kind !== 'program_like' &&
        input.notification.kind !== 'session_like'
          ? true
          : e.notification.programTitle === input.notification.programTitle),
    )
  ) {
    return;
  }

  const event: SocialInboxEvent = {
    id: input.notification.id,
    recipientUsername: recipient,
    createdAt: input.notification.createdAt,
    notification: {
      ...input.notification,
      fromUsername: from,
    },
  };
  store[recipient] = [event, ...list].slice(0, MAX_PER_RECIPIENT);
  await saveStore(store);
}

/**
 * Récupère jusqu’à `limit` événements puis les retire (livraison at-most-once).
 */
export async function claimSocialInboxEvents(
  recipientUsername: string,
  limit = 5,
): Promise<SocialNotification[]> {
  const recipient = normalizeUser(recipientUsername);
  if (!recipient || limit <= 0) return [];

  const store = await loadStore();
  const list = store[recipient] ?? [];
  if (list.length === 0) return [];

  const claimed = list.slice(0, Math.min(limit, list.length));
  const rest = list.slice(claimed.length);
  if (rest.length === 0) {
    delete store[recipient];
  } else {
    store[recipient] = rest;
  }
  await saveStore(store);
  return claimed.map((e) => e.notification);
}

export async function peekSocialInboxCount(
  recipientUsername: string,
): Promise<number> {
  const recipient = normalizeUser(recipientUsername);
  if (!recipient) return 0;
  const store = await loadStore();
  return (store[recipient] ?? []).length;
}

/** Purge totale des notifs locales (démo / test). */
export async function clearAllSocialInbox(): Promise<void> {
  await AsyncStorage.removeItem(INBOX_KEY);
}
