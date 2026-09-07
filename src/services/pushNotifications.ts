import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ScheduledReminder } from '../engines/notifications';
import type { SocialNotification } from '../types/domain';

let handlerReady = false;

/** Affichage foreground — bannière + liste */
export function ensureNotificationHandler() {
  if (handlerReady) return;
  handlerReady = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function getPushPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    ensureNotificationHandler();
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Demande l’autorisation système (iOS / Android).
 * Sur le web Expo Go, peut être partiel — on gère les erreurs.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    ensureNotificationHandler();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('training', {
        name: 'Entraînement & social',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0E8F6F',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;

    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted';
  } catch {
    // Web / environnement sans support natif
    return false;
  }
}

function parseReminderDate(at: string): Date | null {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Planifie les rappels locaux du jour (annule les anciens d’abord). */
export async function syncLocalReminders(
  reminders: ScheduledReminder[],
  enabled: boolean,
): Promise<void> {
  try {
    ensureNotificationHandler();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    const now = Date.now();
    for (const r of reminders) {
      const when = parseReminderDate(r.at);
      if (!when || when.getTime() <= now + 5_000) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          sound: true,
          data: { type: r.type, reminderId: r.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: Platform.OS === 'android' ? 'training' : undefined,
        },
      });
    }
  } catch {
    // ignore — démo / web
  }
}

export function socialPushCopy(n: SocialNotification): { title: string; body: string } {
  switch (n.kind) {
    case 'new_follower':
      return {
        title: 'Nouvel abonné',
        body: `${n.fromDisplayName} s’est abonné à ton profil.`,
      };
    case 'follow_request':
      return {
        title: 'Demande d’abonnement',
        body: `${n.fromDisplayName} souhaite vous suivre.`,
      };
    case 'follow_accepted':
      return {
        title: 'Abonnement accepté',
        body: `${n.fromDisplayName} a accepté votre demande.`,
      };
    case 'program_like':
      return {
        title: 'Like sur votre programme',
        body: n.programTitle
          ? `${n.fromDisplayName} a aimé « ${n.programTitle} ».`
          : `${n.fromDisplayName} a aimé votre programme.`,
      };
    default:
      return { title: 'Notification', body: 'Nouveau message social.' };
  }
}

/** Notification immédiate (like, abonné, etc.) */
export async function presentSocialPush(n: SocialNotification): Promise<void> {
  try {
    ensureNotificationHandler();
    const { title, body } = socialPushCopy(n);
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { kind: n.kind, notificationId: n.id },
      },
      trigger: null,
    });
  } catch {
    // ignore
  }
}
