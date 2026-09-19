import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@azimut/community-blocks-v1';

type Store = {
  usernames: string[];
  syncedAt?: string | null;
};

async function read(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { usernames: [], syncedAt: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { usernames: parsed.map(String), syncedAt: null };
    }
    return {
      usernames: Array.isArray(parsed?.usernames)
        ? parsed.usernames.map(String)
        : [],
      syncedAt: parsed?.syncedAt ?? null,
    };
  } catch {
    return { usernames: [], syncedAt: null };
  }
}

async function write(store: Store) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      usernames: [...new Set(store.usernames)],
      syncedAt: store.syncedAt ?? null,
    }),
  );
}

export async function loadLocalBlocks(): Promise<string[]> {
  return (await read()).usernames;
}

/** Remplace le cache local par la liste serveur (source de vérité). */
export async function applyServerBlocks(usernames: string[]): Promise<void> {
  const prev = await read();
  const next = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
  if (__DEV__ && prev.syncedAt) {
    const localOnly = prev.usernames.filter((u) => !next.includes(u));
    if (localOnly.length) {
      console.debug('[communityBlocks] divergence écrasée par serveur', localOnly);
    }
  }
  await write({ usernames: next, syncedAt: new Date().toISOString() });
}

export async function addLocalBlock(username: string) {
  const u = username.trim().toLowerCase();
  if (!u) return;
  const store = await read();
  if (!store.usernames.includes(u)) {
    store.usernames.push(u);
    await write(store);
  }
}

export async function removeLocalBlock(username: string) {
  const u = username.trim().toLowerCase();
  const store = await read();
  await write({
    ...store,
    usernames: store.usernames.filter((x) => x !== u),
  });
}
