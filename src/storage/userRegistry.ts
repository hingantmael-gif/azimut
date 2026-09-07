import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_DIRECTORY } from '../data/demoDirectory';
import { normalizeUsername, validateUsernameFormat } from '../utils/username';

const REGISTRY_KEY = '@training/user-registry';
const REGISTRY_SEED_VERSION_KEY = '@training/user-registry-seed-v';
/** Incrémenter pour forcer la fusion des nouveaux profils démo */
const SEED_VERSION = '4';

export type RegistryUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  city?: string;
  email: string;
  sport?: string;
  /** Photo durable (data URI) visible par les autres comptes locaux */
  avatarUri?: string;
  /** Bio publique (mentions @ et liens) */
  bio?: string;
};

/** Compte essai réservé (connexion silencieuse 1 / 1) — non réinscriptible. */
const TRIAL_REGISTRY_USER: RegistryUser = {
  id: 'demo-1',
  username: '1',
  firstName: '1',
  lastName: '1',
  email: '1@demo.local',
};

const SEED_USERS: RegistryUser[] = [
  TRIAL_REGISTRY_USER,
  ...DEMO_DIRECTORY.map((m) => ({
    id: m.id,
    username: m.username,
    firstName: m.name.split(' ')[0] ?? m.name,
    lastName: m.name.split(' ').slice(1).join(' ') || m.name,
    city: m.city,
    email: `${m.username}@demo.local`,
    sport: m.sport,
  })),
];

function isReservedIdentity(emailOrUsername: string): boolean {
  const v = emailOrUsername.trim().toLowerCase().replace(/^@+/, '');
  return v === '1' || v === '1@demo.local';
}

function mergeWithSeed(stored: RegistryUser[]): RegistryUser[] {
  const seedIds = new Set(SEED_USERS.map((s) => s.id));
  const byId = new Map<string, RegistryUser>();

  // Garder les comptes réels (hors seed démo)
  for (const u of stored) {
    if (!seedIds.has(u.id)) {
      byId.set(u.id, {
        ...u,
        username: normalizeUsername(u.username),
      });
    }
  }
  // Remplacer / ajouter les profils démo (identifiants à jour)
  for (const seed of SEED_USERS) {
    byId.set(seed.id, seed);
  }

  const byUsername = new Map<string, RegistryUser>();
  for (const u of byId.values()) {
    const key = normalizeUsername(u.username);
    if (!key) continue;
    if (!byUsername.has(key)) byUsername.set(key, { ...u, username: key });
  }
  return [...byUsername.values()];
}

export async function resetRegistryToSeedOnly(): Promise<void> {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(SEED_USERS));
  await AsyncStorage.setItem(REGISTRY_SEED_VERSION_KEY, SEED_VERSION);
}

export async function removeRegistryUser(userId: string): Promise<void> {
  const registry = await loadRegistry();
  const seedIds = new Set(SEED_USERS.map((s) => s.id));
  if (seedIds.has(userId)) return;
  const next = registry.filter((u) => u.id !== userId);
  await saveRegistry(next);
}

export async function loadRegistry(): Promise<RegistryUser[]> {
  const raw = await AsyncStorage.getItem(REGISTRY_KEY);
  const seedVer = await AsyncStorage.getItem(REGISTRY_SEED_VERSION_KEY);

  if (!raw) {
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(SEED_USERS));
    await AsyncStorage.setItem(REGISTRY_SEED_VERSION_KEY, SEED_VERSION);
    return [...SEED_USERS];
  }

  try {
    const parsed = JSON.parse(raw) as RegistryUser[];
    const base = Array.isArray(parsed) ? parsed : [...SEED_USERS];
    if (seedVer !== SEED_VERSION) {
      const merged = mergeWithSeed(base);
      await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));
      await AsyncStorage.setItem(REGISTRY_SEED_VERSION_KEY, SEED_VERSION);
      return merged;
    }
    return base;
  } catch {
    return [...SEED_USERS];
  }
}

async function saveRegistry(users: RegistryUser[]): Promise<void> {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
}

export async function isUsernameTaken(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const u = normalizeUsername(username);
  if (isReservedIdentity(u) && excludeUserId !== TRIAL_REGISTRY_USER.id) {
    return true;
  }
  const format = validateUsernameFormat(u);
  if (!format.ok) return true;
  const registry = await loadRegistry();
  return registry.some(
    (entry) => entry.username === u && (!excludeUserId || entry.id !== excludeUserId),
  );
}

/** E-mail déjà associé à un compte (hors seed démo optionnel). */
export async function isEmailTaken(
  email: string,
  excludeUserId?: string,
): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (!e) return false;
  if (isReservedIdentity(e) && excludeUserId !== TRIAL_REGISTRY_USER.id) {
    return true;
  }
  const registry = await loadRegistry();
  return registry.some(
    (entry) =>
      entry.email.trim().toLowerCase() === e &&
      (!excludeUserId || entry.id !== excludeUserId),
  );
}

export async function upsertRegistryUser(user: RegistryUser): Promise<void> {
  const u = normalizeUsername(user.username);
  if (!u) return;
  const registry = await loadRegistry();
  const next = registry.filter((e) => e.id !== user.id && e.username !== u);
  next.push({ ...user, username: u });
  await saveRegistry(next);
}

export type SuggestOpts = {
  city?: string;
  sport?: string;
  limit?: number;
  excludeId?: string;
};

function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^@/, '');
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Score de suggestion : préfixe d’abord, puis proximité / sport en commun */
function suggestScore(
  u: RegistryUser,
  q: string,
  opts?: SuggestOpts,
): number {
  if (!q) return -1;
  const username = fold(u.username);
  const first = fold(u.firstName);
  const last = fold(u.lastName);
  const full = `${first} ${last}`.trim();
  const city = fold(u.city ?? '');

  let score = -1;
  if (username.startsWith(q)) score = 100;
  else if (first.startsWith(q)) score = 90;
  else if (last.startsWith(q)) score = 85;
  else if (full.startsWith(q)) score = 88;
  else if (username.includes(q) || full.includes(q) || city.startsWith(q)) score = 25;
  else return -1;

  if (opts?.city && u.city && fold(u.city) === fold(opts.city)) score += 18;
  if (opts?.sport && u.sport && fold(u.sport) === fold(opts.sport)) score += 12;
  return score;
}

/**
 * Suggestions live (5–10) qui se rafraîchissent à chaque caractère :
 * préfixe username / prénom / nom, tri proximité ville puis sport.
 */
export async function suggestProfiles(
  query: string,
  opts?: SuggestOpts,
): Promise<RegistryUser[]> {
  const q = normalizeQuery(query);
  if (!q) return [];
  const registry = await loadRegistry();
  const limit = Math.min(Math.max(opts?.limit ?? 10, 5), 12);

  return registry
    .filter((u) => u.id !== opts?.excludeId)
    .map((u) => ({ u, score: suggestScore(u, q, opts) }))
    .filter((x) => x.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.u.username.localeCompare(b.u.username, 'fr'),
    )
    .slice(0, limit)
    .map((x) => x.u);
}

/** Recherche complète (bouton / validation) */
export async function searchRegistry(
  query: string,
  opts?: SuggestOpts,
): Promise<RegistryUser[]> {
  return suggestProfiles(query, { ...opts, limit: opts?.limit ?? 20 });
}

export function profileToRegistryUser(profile: {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  city?: string;
  email: string;
  sport?: string;
  avatarUri?: string;
  bio?: string;
}): RegistryUser {
  return {
    id: profile.id,
    username: normalizeUsername(profile.username),
    firstName: profile.firstName,
    lastName: profile.lastName,
    city: profile.city,
    email: profile.email,
    sport: profile.sport,
    avatarUri: profile.avatarUri,
    bio: profile.bio,
  };
}

export async function findRegistryUserByUsername(
  username: string,
): Promise<RegistryUser | null> {
  const u = normalizeUsername(username);
  if (!u) return null;
  const registry = await loadRegistry();
  return registry.find((entry) => entry.username === u) ?? null;
}
