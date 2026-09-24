import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Alert } from '../../src/utils/appAlert';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import { Body, Chip, Muted, Screen, Title } from '../../src/ui/primitives';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppFlatList } from '../../src/ui/scrolling';
import { formatUsernameDisplay } from '../../src/utils/username';
import { findDemoMember } from '../../src/data/demoDirectory';
import { useApp } from '../../src/store/AppContext';
import {
  communityBlockUser,
  communityGetBlocks,
  communityGetFeed,
  communityLikePost,
  communityReactPost,
  communityReport,
  type CommunityFeedPost,
} from '../../src/api/community';
import {
  applyServerFeedLikes,
  loadFeedLikeState,
  setLocalReaction,
  toggleLocalFeedLike,
} from '../../src/storage/feedLikes';
import {
  addLocalBlock,
  applyServerBlocks,
  loadLocalBlocks,
} from '../../src/storage/communityBlocks';
import { RankBadge } from '../../src/ui/ranked/RankBadge';
import { VerifiedBadge } from '../../src/ui/brand/VerifiedBadge';
import type { RankTier } from '../../src/types/domain';
import { ReactionBar, type ReactionKind } from '../../src/ui/social/ReactionBar';
import { ReportSheet } from '../../src/ui/social/ReportSheet';
import { PressableScale, StaggerIn } from '../../src/ui/motion/softMotion';

function asTier(v?: string): RankTier {
  const t = (v || 'bronze') as RankTier;
  const ok = [
    'bronze',
    'argent',
    'or',
    'diamant',
    'platine',
    'elite',
    'champion',
  ] as RankTier[];
  return ok.includes(t) ? t : 'bronze';
}

/** Fil social — API community + fallback seed, likes persistés, crest, signalement. */
export default function SocialScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [posts, setPosts] = useState<CommunityFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromApi, setFromApi] = useState(false);
  const [reportPost, setReportPost] = useState<CommunityFeedPost | null>(null);
  const [insightToast, setInsightToast] = useState<string | null>(null);

  const mergeLocalLikes = useCallback(
    async (list: CommunityFeedPost[], fromApi: boolean) => {
      const blocked = new Set(await loadLocalBlocks());
      const filtered = list.filter(
        (p) => !blocked.has(p.authorUsername.toLowerCase()),
      );
      // Serveur = vérité : écrase le cache local, pas l’inverse.
      if (fromApi) {
        await applyServerFeedLikes(filtered);
        return filtered;
      }
      const local = await loadFeedLikeState();
      return filtered.map((p) => ({
        ...p,
        likeCount: local.counts[p.id] ?? p.likeCount,
        likedByMe: local.liked[p.id] ?? p.likedByMe,
        myReaction: local.reactions[p.id] ?? p.myReaction,
      }));
    },
    [],
  );

  const load = useCallback(async () => {
    const token = state.authToken;
    const blocksRes = await communityGetBlocks(token);
    if (blocksRes?.blocked) {
      await applyServerBlocks(blocksRes.blocked);
    }
    const { posts: remote, fromApi: api } = await communityGetFeed(token);
    const merged = await mergeLocalLikes(remote, api);
    setPosts(merged);
    setFromApi(api);
  }, [state.authToken, mergeLocalLikes]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onLike = async (post: CommunityFeedPost) => {
    const token = state.authToken;
    const api = await communityLikePost(token, post.id);
    if (api && typeof api.likeCount === 'number') {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                likeCount: api.likeCount!,
                likedByMe: !!api.likedByMe,
              }
            : p,
        ),
      );
      if (api.insight) {
        setInsightToast(api.insight);
        setTimeout(() => setInsightToast(null), 3200);
      } else if (post.insight) {
        setInsightToast(post.insight);
        setTimeout(() => setInsightToast(null), 3200);
      }
      return;
    }
    const local = await toggleLocalFeedLike(post.id, post.likeCount);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likeCount: local.count, likedByMe: local.liked }
          : p,
      ),
    );
    if (post.insight && local.liked) {
      setInsightToast(post.insight);
      setTimeout(() => setInsightToast(null), 3200);
    }
  };

  const onReact = async (post: CommunityFeedPost, kind: ReactionKind) => {
    await setLocalReaction(post.id, kind);
    const api = await communityReactPost(state.authToken, post.id, kind);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              myReaction: kind,
              reactionCounts: api?.reactionCounts ?? {
                ...(p.reactionCounts || {}),
                [kind]: (p.reactionCounts?.[kind] ?? 0) + 1,
              },
            }
          : p,
      ),
    );
  };

  return (
    <Screen style={{ paddingTop: spacing.md }}>
      <Title>Fil social</Title>
      <Muted>
        {fromApi
          ? 'Fil synchronisé — touche un @pseudo pour le profil.'
          : 'Likes sauvegardés sur cet appareil. Connecte-toi pour les retrouver partout.'}
      </Muted>
      <View style={styles.row}>
        <Chip label="Trouver des athlètes" onPress={() => router.push('/search')} />
      </View>

      {insightToast ? (
        <View style={styles.insightBanner}>
          <Text style={styles.insightText}>💡 {insightToast}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} />
      ) : (
        <AppFlatList
          data={posts}
          keyExtractor={(i) => i.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Personne à suivre pour l’instant</Text>
              <Muted style={{ textAlign: 'center', marginTop: 6 }}>
                Trouve des athlètes et abonne-toi pour remplir ton fil.
              </Muted>
              <PressableScale
                variant="pop"
                onPress={() => router.push('/search')}
                contentStyle={styles.emptyCta}
              >
                <Text style={styles.emptyCtaText}>Trouver des athlètes</Text>
              </PressableScale>
            </View>
          }
          renderItem={({ item, index }) => {
            const member = findDemoMember(item.authorUsername);
            const display =
              item.authorName ||
              member?.name ||
              formatUsernameDisplay(item.authorUsername);
            return (
              <StaggerIn index={index} step={55} duration={420}>
                <View style={styles.itemWrap}>
                  <Pressable
                    style={styles.card}
                    onPress={() =>
                      router.push(
                        `/user/${encodeURIComponent(item.authorUsername)}`,
                      )
                    }
                    accessibilityRole="button"
                  >
                    <View style={styles.cardHead}>
                      <RankBadge
                        tier={asTier(item.rankTier)}
                        division={
                          (item.rankDivision as 1 | 2 | 3 | null | undefined) ??
                          null
                        }
                        size={36}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={styles.name} numberOfLines={1}>{display}</Text>
                          {item.authorVerified ? <VerifiedBadge size={16} /> : null}
                        </View>
                        <Text style={styles.handle}>
                          @{formatUsernameDisplay(item.authorUsername)}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                    <Body style={{ marginTop: 8 }}>{item.text}</Body>
                    {item.insight ? (
                      <Text style={styles.insightInline} numberOfLines={1}>
                        💡 {item.insight}
                      </Text>
                    ) : null}
                    <Muted style={{ marginTop: 4 }}>
                      {item.km != null ? `${item.km} km` : 'Séance'}
                      {member?.city ? ` · ${member.city}` : ''}
                    </Muted>
                  </Pressable>
                  <View style={styles.actions}>
                    <ReactionBar
                      likeCount={item.likeCount}
                      liked={item.likedByMe}
                      counts={item.reactionCounts}
                      selected={item.myReaction}
                      onLike={() => void onLike(item)}
                      onReact={(k) => void onReact(item, k)}
                      onMore={() => setReportPost(item)}
                    />
                    <Pressable
                      onPress={() =>
                        router.push(
                          `/user/${encodeURIComponent(item.authorUsername)}`,
                        )
                      }
                      hitSlop={8}
                    >
                      <Text style={styles.seeProfile}>Voir séances ›</Text>
                    </Pressable>
                  </View>
                </View>
              </StaggerIn>
            );
          }}
        />
      )}

      <ReportSheet
        visible={!!reportPost}
        targetLabel="ce post"
        onClose={() => setReportPost(null)}
        onReport={(reason) => {
          if (!reportPost) return;
          void communityReport(state.authToken, {
            targetType: 'post',
            targetId: reportPost.id,
            reason,
          }).then((r) => {
            Alert.alert(
              r?.ok ? 'Signalement envoyé' : 'Signalement enregistré',
              r?.ok
                ? 'Merci — notre équipe va regarder.'
                : 'Enregistré localement (API offline).',
            );
          });
        }}
        onBlock={() => {
          if (!reportPost) return;
          void communityBlockUser(state.authToken, reportPost.authorUsername);
          void addLocalBlock(reportPost.authorUsername);
          setPosts((prev) =>
            prev.filter((p) => p.authorUsername !== reportPost.authorUsername),
          );
          Alert.alert('Bloqué', `@${reportPost.authorUsername} ne pourra plus interagir.`);
        }}
      />
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.md },
    insightBanner: {
      backgroundColor: colors.accentLight,
      borderRadius: radii.md,
      padding: 12,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    insightText: { fontWeight: '700', color: colors.accent, fontSize: 13 },
    itemWrap: { marginBottom: spacing.sm },
    card: {
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    name: { fontWeight: '800', fontSize: 16, color: colors.text },
    handle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    chevron: { fontSize: 26, fontWeight: '300', color: colors.textMuted },
    insightInline: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
      lineHeight: 17,
    },
    actions: {
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: 10,
      gap: 10,
      backgroundColor: colors.bgElevated,
      borderBottomLeftRadius: radii.md,
      borderBottomRightRadius: radii.md,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.border,
    },
    seeProfile: {
      fontWeight: '800',
      fontSize: 14,
      color: colors.accent,
      paddingVertical: 4,
    },
    empty: {
      marginTop: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
    },
    emptyCta: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
    },
    emptyCtaText: { color: '#fff', fontWeight: '900' },
  });
}
