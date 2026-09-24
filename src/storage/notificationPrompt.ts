import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@training/notif-prompt-handled-v2';
/** Ancienne clé par profil — migrée à la lecture. */
const legacyKey = (profileId: string) => `@training/notif-prompt/${profileId}`;

function norm(id: string): string {
  return id.trim().toLowerCase();
}

function identitiesOf(
  ...ids: Array<string | undefined | null>
): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (!id?.trim()) continue;
    const k = norm(id);
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

async function loadSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.map(norm) : []);
  } catch {
    return new Set();
  }
}

async function saveSet(set: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
}

/**
 * L’utilisateur a déjà répondu (autoriser ou refuser) pour ce compte —
 * ne plus afficher la modale à la reconnexion.
 */
export async function loadNotificationPromptHandled(
  ...identities: Array<string | undefined | null>
): Promise<boolean> {
  const ids = identitiesOf(...identities);
  if (ids.length === 0) return false;

  const set = await loadSet();
  if (ids.some((id) => set.has(id))) return true;

  // Migration depuis l’ancienne clé par profileId
  for (const id of ids) {
    try {
      const legacy = await AsyncStorage.getItem(legacyKey(id));
      if (legacy === '1') {
        await markNotificationPromptHandled(...ids);
        return true;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** À appeler dès qu’on a répondu (Autoriser / Refuser) ou si l’OS a déjà tranché. */
export async function markNotificationPromptHandled(
  ...identities: Array<string | undefined | null>
): Promise<void> {
  const ids = identitiesOf(...identities);
  if (ids.length === 0) return;
  const set = await loadSet();
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (changed) await saveSet(set);
}

/** @deprecated alias — préfère markNotificationPromptHandled */
export async function saveNotificationPromptHandled(
  profileId: string,
): Promise<void> {
  await markNotificationPromptHandled(profileId);
}

/** Suppression de compte uniquement. */
export async function clearNotificationPromptHandled(
  ...identities: Array<string | undefined | null>
): Promise<void> {
  const ids = identitiesOf(...identities);
  if (ids.length === 0) return;
  const set = await loadSet();
  let changed = false;
  for (const id of ids) {
    if (set.delete(id)) changed = true;
    try {
      await AsyncStorage.removeItem(legacyKey(id));
    } catch {
      /* ignore */
    }
  }
  if (changed) await saveSet(set);
}
