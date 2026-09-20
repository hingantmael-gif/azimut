import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ScheduledReminder } from '../engines/notifications';
import type { SocialNotification } from '../types/domain';
import { BRAND } from '../constants/brand';

let handlerReady = false;

/** PWA / web : alertes uniquement dans l’app (évite « hingantmael-gif.github.io » sur le téléphone). */
export function usesInAppNotificationsOnly(): boolean {
  return Platform.OS === 'web';
}

/** Affichage foreground — bannière + liste (natif uniquement). */
export function ensureNotificationHandler() {
  if (handlerReady || usesInAppNotificationsOnly()) return;
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

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/** API Notification du navigateur (Chrome/Edge/Android, Safari iOS 16.4+ en PWA installée). */
function webNotificationApi(): typeof Notification | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return 'Notification' in window ? window.Notification : null;
}

/** L'appareil sait afficher une demande d'autorisation système (natif, ou navigateur compatible). */
export function supportsSystemPermission(): boolean {
  return Platform.OS !== 'web' || webNotificationApi() !== null;
}

/** Autorisation système actuelle (web : `Notification.permission`). */
export async function getSystemPermissionStatus(): Promise<PermissionStatus> {
  const api = webNotificationApi();
  if (Platform.OS === 'web') {
    if (!api) return 'denied';
    return api.permission === 'default' ? 'undetermined' : api.permission;
  }
  return getPushPermissionStatus();
}

/**
 * Déclenche la vraie demande du téléphone / du navigateur. À appeler depuis un geste
 * de l'utilisateur (obligatoire sur iOS).
 */
export async function askSystemPermission(): Promise<boolean> {
  const api = webNotificationApi();
  if (Platform.OS === 'web') {
    if (!api) return false;
    try {
      return (await api.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return requestPushPermission();
}

/**
 * Notification système sur le web (via le service worker) quand l'app est en arrière-plan.
 * Sans effet si l'autorisation n'a pas été accordée ou si l'app est au premier plan
 * (les bannières in-app prennent alors le relais).
 */
export async function showSystemNotification(title: string, body: string, url = '/'): Promise<void> {
  const api = webNotificationApi();
  if (!api || api.permission !== 'granted') return;
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
    };
    if (reg) await reg.showNotification(title, options);
    else new api(title, options);
  } catch {
    /* ignore */
  }
}

export async function getPushPermissionStatus(): Promise<PermissionStatus> {
  if (usesInAppNotificationsOnly()) {
    // Web : les alertes in-app sont toujours actives ; l'autorisation système est distincte.
    return 'granted';
  }
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
 * Sur le web : active les alertes in-app sans permission navigateur.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (usesInAppNotificationsOnly()) {
    // Web : on demande aussi l'autorisation du navigateur, mais les alertes in-app restent actives.
    await askSystemPermission();
    return true;
  }
  try {
    ensureNotificationHandler();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('training', {
        name: BRAND.name,
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
    return false;
  }
}

function parseReminderDate(at: string): Date | null {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Planifie les rappels locaux du jour (natif). Sur web : no-op (bandeaux in-app). */
export async function syncLocalReminders(
  reminders: ScheduledReminder[],
  enabled: boolean,
): Promise<void> {
  if (usesInAppNotificationsOnly()) return;
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
          title: BRAND.name,
          body: `${r.title} — ${r.body}`,
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
    // ignore
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
    case 'session_like':
      return {
        title: 'Like sur votre séance',
        body: n.programTitle
          ? `${n.fromDisplayName} a aimé « ${n.programTitle} ».`
          : `${n.fromDisplayName} a aimé votre séance.`,
      };
    case 'product':
      return {
        title: 'Mise à jour Mova',
        body: n.programTitle ?? 'Nouvelle fonctionnalité disponible.',
      };
    default:
      return { title: 'Notification', body: 'Nouveau message social.' };
  }
}

/**
 * Push OS (natif, app en arrière-plan seulement).
 * Sur web / PWA : jamais — évite le badge « hingantmael-gif.github.io ».
 */
export async function presentSocialPush(n: SocialNotification): Promise<void> {
  const copy = socialPushCopy(n);
  await showSystemNotification(copy.title, copy.body, '/notifications');
}
