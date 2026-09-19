import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@azimut/feed-likes-v1';

type Store = {
  counts: Record<string, number>;
  liked: Record<string, boolean>;
  reactions: Record<string, string>;
  /** Dernière sync serveur (dev / détection divergence). */
  syncedAt?: string | null;
};

async function read(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { counts: {}, liked: {}, reactions: {}, syncedAt: null };
    return {
      counts: {},
      liked: {},
      reactions: {},
      syncedAt: null,
      ...JSON.parse(raw),
    };
  } catch {
    return { counts: {}, liked: {}, reactions: {}, syncedAt: null };
  }
}

async function write(s: Store) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

/** Likes persistés localement (cache / hors-ligne). */
export async function loadFeedLikeState(): Promise<Store> {
  return read();
}

/**
 * Serveur = source de vérité : remplace le cache local par l’état API.
 * Ne pas appeler hors ligne — réservé aux réponses `fromApi`.
 */
export async function applyServerFeedLikes(
  posts: Array<{
    id: string;
    likeCount: number;
    likedByMe: boolean;
    myReaction?: string | null;
  }>,
): Promise<void> {
  const s = await read();
  const next: Store = {
    counts: { ...s.counts },
    liked: { ...s.liked },
    reactions: { ...s.reactions },
    syncedAt: new Date().toISOString(),
  };
  for (const p of posts) {
    next.counts[p.id] = p.likeCount;
    next.liked[p.id] = p.likedByMe;
    if (p.myReaction) next.reactions[p.id] = p.myReaction;
    else delete next.reactions[p.id];
  }
  if (__DEV__ && s.syncedAt) {
    for (const p of posts) {
      const localLiked = s.liked[p.id];
      if (localLiked != null && localLiked !== p.likedByMe) {
        console.debug(
          '[feedLikes] divergence écrasée par serveur',
          p.id,
          { local: localLiked, server: p.likedByMe },
        );
      }
    }
  }
  await write(next);
}

export async function toggleLocalFeedLike(
  postId: string,
  baseCount: number,
): Promise<{ count: number; liked: boolean }> {
  const s = await read();
  const was = !!s.liked[postId];
  const base = postId in s.counts ? s.counts[postId]! : baseCount;
  const liked = !was;
  const count = liked ? base + 1 : Math.max(0, base - 1);
  s.liked[postId] = liked;
  s.counts[postId] = count;
  await write(s);
  return { count, liked };
}

export async function setLocalReaction(postId: string, kind: string) {
  const s = await read();
  s.reactions[postId] = kind;
  await write(s);
}
