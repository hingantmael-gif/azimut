import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (profileId: string) => `@training/notif-prompt/${profileId}`;

/** L’utilisateur a déjà répondu (autoriser ou refuser) — ne plus afficher la modale. */
export async function loadNotificationPromptHandled(profileId: string): Promise<boolean> {
  if (!profileId) return false;
  try {
    return (await AsyncStorage.getItem(key(profileId))) === '1';
  } catch {
    return false;
  }
}

export async function saveNotificationPromptHandled(profileId: string): Promise<void> {
  if (!profileId) return;
  try {
    await AsyncStorage.setItem(key(profileId), '1');
  } catch {
    /* ignore */
  }
}

export async function clearNotificationPromptHandled(profileId: string): Promise<void> {
  if (!profileId) return;
  try {
    await AsyncStorage.removeItem(key(profileId));
  } catch {
    /* ignore */
  }
}
