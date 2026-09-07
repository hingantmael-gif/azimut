import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { formatUsernameDisplay } from '../src/utils/username';
import type { SocialNotification } from '../src/types/domain';
import {
  hasMoreSocialNotifications,
  sortSocialNotificationsNewestFirst,
  visibleSocialNotifications,
} from '../src/engines/socialNotifications';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppFlatList } from '../src/ui/scrolling';

function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function notifTitle(n: SocialNotification): string {
  if (n.kind === 'program_like') {
    return `${n.fromDisplayName} a aimé votre programme`;
  }
  if (n.kind === 'follow_request') {
    if (n.requestStatus === 'accepted') return `${n.fromDisplayName} — demande acceptée`;
    if (n.requestStatus === 'declined') return `${n.fromDisplayName} — demande refusée`;
    return `${n.fromDisplayName} souhaite s’abonner`;
  }
  if (n.kind === 'new_follower') {
    return `${n.fromDisplayName} s’est abonné(e)`;
  }
  if (n.kind === 'follow_accepted') {
    return `${n.fromDisplayName} a accepté votre demande`;
  }
  return n.fromDisplayName;
}

function notifSub(n: SocialNotification): string {
  if (n.kind === 'program_like' && n.programTitle) return n.programTitle;
  return formatUsernameDisplay(n.fromUsername);
}

/** Cloche — style Instagram : pages + pull-to-refresh, stockage plafonné */
export default function NotificationsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loadedPages, setLoadedPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allSorted = useMemo(
    () => sortSocialNotificationsNewestFirst(state.profile.socialNotifications ?? []),
    [state.profile.socialNotifications],
  );

  const visible = useMemo(
    () => visibleSocialNotifications(allSorted, loadedPages),
    [allSorted, loadedPages],
  );

  const hasMore = hasMoreSocialNotifications(allSorted.length, loadedPages);
  const following = new Set(state.profile.followingUsernames ?? []);

  useEffect(() => {
    for (const n of allSorted) {
      if (!n.read && n.kind !== 'follow_request') {
        dispatch({ type: 'MARK_SOCIAL_READ', notificationId: n.id });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    // Délai court façon fil Instagram (pas tout d’un coup)
    setTimeout(() => {
      setLoadedPages((p) => p + 1);
      setLoadingMore(false);
    }, 450);
  }, [hasMore, loadingMore]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLoadedPages(1);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const openProfile = useCallback(
    (fromUsername: string) => {
      router.push({
        pathname: '/user/[username]',
        params: { username: fromUsername },
      });
    },
    [router],
  );

  const renderItem = ({ item: n }: { item: SocialNotification }) => {
    const pending = n.kind === 'follow_request' && n.requestStatus === 'pending';
    const accepted = n.kind === 'follow_request' && n.requestStatus === 'accepted';
    const canFollowBack =
      (accepted || n.kind === 'new_follower') && !following.has(n.fromUsername);

    return (
      <Pressable
        style={[styles.card, !n.read && pending ? styles.cardUnread : null]}
        onPress={() => openProfile(n.fromUsername)}
        accessibilityRole="button"
        accessibilityLabel={`Voir le profil de ${n.fromDisplayName}`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {n.fromDisplayName
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{notifTitle(n)}</Text>
          <Text style={styles.sub}>
            {notifSub(n)} · {timeAgo(n.createdAt)}
          </Text>

          {pending ? (
            <View style={styles.actions}>
              <Pressable
                style={styles.accept}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  dispatch({ type: 'ACCEPT_FOLLOW_REQUEST', notificationId: n.id });
                }}
              >
                <Text style={styles.acceptText}>Accepter</Text>
              </Pressable>
              <Pressable
                style={styles.decline}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  dispatch({ type: 'DECLINE_FOLLOW_REQUEST', notificationId: n.id });
                }}
              >
                <Text style={styles.declineText}>Refuser</Text>
              </Pressable>
            </View>
          ) : null}

          {canFollowBack ? (
            <Pressable
              style={styles.followBack}
              onPress={(e) => {
                e?.stopPropagation?.();
                dispatch({
                  type: 'FOLLOW_USER',
                  username: n.fromUsername,
                  requiresApproval: false,
                });
              }}
            >
              <Text style={styles.followBackText}>S’abonner en retour</Text>
            </Pressable>
          ) : null}

          {accepted && following.has(n.fromUsername) ? (
            <Text style={styles.done}>Vous vous suivez mutuellement</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <AppFlatList
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
      data={visible}
      keyExtractor={(n) => n.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucune notification pour le moment.</Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {loadingMore ? (
            <ActivityIndicator color={colors.accent} />
          ) : hasMore ? (
            <Pressable style={styles.loadMoreBtn} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Charger plus</Text>
            </Pressable>
          ) : null}
        </View>
      }
    />
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    empty: {
      textAlign: 'center',
      marginTop: spacing.xl,
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
    },
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontWeight: '800', color: colors.accent },
    title: { fontWeight: '700', color: colors.text, fontSize: 14, lineHeight: 20 },
    sub: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    accept: {
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
    },
    acceptText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    decline: {
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    declineText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    followBack: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
    },
    followBackText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    done: { marginTop: 6, fontSize: 12, fontWeight: '600', color: colors.accentDark },
    footer: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
      minHeight: 56,
    },
    loadMoreBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radii.pill,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: { fontWeight: '800', color: colors.accentDark, fontSize: 13 },
  });
}
