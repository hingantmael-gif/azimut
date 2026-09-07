import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@training/onboarding-completed-v1';

function norm(id: string): string {
  return id.trim().toLowerCase();
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

/** L’utilisateur a déjà fini le parcours « On prend le relais » / questions. */
export async function hasCompletedOnboarding(
  ...identities: Array<string | undefined | null>
): Promise<boolean> {
  const set = await loadSet();
  return identities.some((id) => id && set.has(norm(id)));
}

/** À appeler quand l’onboarding est validé. */
export async function markOnboardingCompleted(
  ...identities: Array<string | undefined | null>
): Promise<void> {
  const set = await loadSet();
  let changed = false;
  for (const id of identities) {
    if (!id?.trim()) continue;
    const k = norm(id);
    if (!set.has(k)) {
      set.add(k);
      changed = true;
    }
  }
  if (changed) await saveSet(set);
}

/** Nouvelle inscription ou suppression de compte. */
export async function clearOnboardingCompleted(
  ...identities: Array<string | undefined | null>
): Promise<void> {
  const set = await loadSet();
  let changed = false;
  for (const id of identities) {
    if (!id?.trim()) continue;
    const k = norm(id);
    if (set.delete(k)) changed = true;
  }
  if (changed) await saveSet(set);
}
