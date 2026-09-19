/**
 * Client API Communauté — écritures serveur quand token remote ;
 * fallback local / seed si API down (bêta).
 */
import { resolveApiUrl } from '../services/apiBase';

export type CommunityFeedPost = {
  id: string;
  authorUsername: string;
  authorName?: string;
  text: string;
  km?: number;
  insight?: string | null;
  rankTier?: string;
  rankDivision?: number | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  reactionCounts?: Record<string, number>;
  myReaction?: string | null;
  commentCount?: number;
};

export type HubSummary = {
  feedPosts: number;
  clubsJoined: number;
  unreadSocial: number;
};

const SEED_FEED: CommunityFeedPost[] = [
  {
    id: 'seed_1',
    authorUsername: 'leamartin',
    authorName: 'Léa Martin',
    text: '6×1000 m validés — merci pour les likes !',
    km: 12.4,
    insight: 'Negative split réussi — tu as bien géré l’allure.',
    rankTier: 'or',
    rankDivision: 2,
    createdAt: new Date().toISOString(),
    likeCount: 12,
    likedByMe: false,
    reactionCounts: {},
    commentCount: 0,
  },
  {
    id: 'seed_2',
    authorUsername: 'noahpetit',
    authorName: 'Noah Petit',
    text: 'Sortie longue 22 km · D+ 650',
    km: 22,
    insight: 'Bonne compliance au plan — rythme maîtrisé.',
    rankTier: 'argent',
    rankDivision: 1,
    createdAt: new Date().toISOString(),
    likeCount: 8,
    likedByMe: false,
    reactionCounts: {},
    commentCount: 0,
  },
  {
    id: 'seed_3',
    authorUsername: 'annap',
    authorName: 'Anna P.',
    text: 'Brick vélo + footing transition',
    km: 45,
    insight: null,
    rankTier: 'platine',
    rankDivision: 3,
    createdAt: new Date().toISOString(),
    likeCount: 5,
    likedByMe: false,
    reactionCounts: {},
    commentCount: 0,
  },
];

async function authGet<T>(
  path: string,
  token: string | null,
): Promise<(T & { ok?: boolean; error?: string }) | null> {
  if (!token || !token.startsWith('az_')) return null;
  try {
    const res = await fetch(`${resolveApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T & { ok?: boolean };
  } catch {
    return null;
  }
}

async function authPost<T>(
  path: string,
  token: string | null,
  body?: unknown,
): Promise<(T & { ok?: boolean; error?: string }) | null> {
  if (!token || !token.startsWith('az_')) return null;
  try {
    const res = await fetch(`${resolveApiUrl()}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok) return { ...data, error: data.error || `Erreur ${res.status}` };
    return data;
  } catch {
    return null;
  }
}

async function authDelete<T>(
  path: string,
  token: string | null,
): Promise<(T & { ok?: boolean; error?: string }) | null> {
  if (!token || !token.startsWith('az_')) return null;
  try {
    const res = await fetch(`${resolveApiUrl()}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T & { ok?: boolean };
  } catch {
    return null;
  }
}

export async function communityGetFeed(
  token: string | null,
  cursor?: string | null,
): Promise<{ posts: CommunityFeedPost[]; nextCursor: string | null; fromApi: boolean }> {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const res = await authGet<{ posts?: CommunityFeedPost[]; nextCursor?: string | null }>(
    `/community/feed${q}`,
    token,
  );
  if (res?.posts) {
    return {
      posts: res.posts,
      nextCursor: res.nextCursor ?? null,
      fromApi: true,
    };
  }
  return { posts: SEED_FEED, nextCursor: null, fromApi: false };
}

export async function communityLikePost(token: string | null, postId: string) {
  return authPost<{
    likeCount?: number;
    likedByMe?: boolean;
    insight?: string | null;
  }>(`/community/posts/${encodeURIComponent(postId)}/like`, token);
}

export async function communityReactPost(
  token: string | null,
  postId: string,
  kind: 'costaud' | 'regulier' | 'bravo',
) {
  return authPost<{
    reactionCounts?: Record<string, number>;
    myReaction?: string;
  }>(`/community/posts/${encodeURIComponent(postId)}/react`, token, { kind });
}

export async function communityReport(
  token: string | null,
  body: { targetType: string; targetId: string; reason: string },
) {
  return authPost<{ ok?: boolean }>('/community/reports', token, body);
}

export async function communityBlockUser(token: string | null, username: string) {
  return authPost<{ ok?: boolean }>('/community/blocks', token, { username });
}

export async function communityGetBlocks(token: string | null) {
  return authGet<{ blocked?: string[] }>('/community/blocks', token);
}

export async function communityUnblock(token: string | null, username: string) {
  return authDelete<{ ok?: boolean }>(
    `/community/blocks/${encodeURIComponent(username)}`,
    token,
  );
}

export async function communityHubSummary(token: string | null) {
  return authGet<HubSummary>('/community/hub-summary', token);
}

export async function communitySearchUsers(token: string | null, q: string) {
  return authGet<{ users?: Array<{ username: string; name: string }> }>(
    `/community/users/search?q=${encodeURIComponent(q)}`,
    token,
  );
}

export async function communityFollow(
  token: string | null,
  username: string,
  requireApproval?: boolean,
) {
  return authPost<{ status?: string }>(
    `/community/follow/${encodeURIComponent(username)}`,
    token,
    { requireApproval: !!requireApproval },
  );
}

export async function communityUnfollow(token: string | null, username: string) {
  return authDelete<{ ok?: boolean }>(
    `/community/follow/${encodeURIComponent(username)}`,
    token,
  );
}

export async function communityDiscoverClubs(
  token: string | null,
  opts?: { city?: string; sport?: string },
) {
  const q = new URLSearchParams();
  if (opts?.city) q.set('city', opts.city);
  if (opts?.sport) q.set('sport', opts.sport);
  const qs = q.toString() ? `?${q}` : '';
  return authGet<{
    clubs?: Array<{
      id: string;
      name: string;
      description?: string;
      city?: string;
      sport?: string;
      memberCount?: number;
    }>;
  }>(`/community/clubs/discover${qs}`, token);
}

export async function communityCreateClub(
  token: string | null,
  body: { name: string; description?: string; city?: string; sport?: string },
) {
  return authPost<{ club?: { id: string; name: string } }>(
    '/community/clubs',
    token,
    body,
  );
}

export async function communityJoinClub(token: string | null, clubId: string) {
  return authPost<{ ok?: boolean }>(
    `/community/clubs/${encodeURIComponent(clubId)}/join`,
    token,
  );
}

export async function communityPullNotifications(token: string | null) {
  return authGet<{
    notifications?: Array<{
      id: string;
      type: string;
      fromUsername?: string;
      postId?: string;
      createdAt?: string;
    }>;
  }>('/community/notifications', token);
}

export { SEED_FEED };
