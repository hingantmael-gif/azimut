import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import {
  findRegistryUserByUsername,
  type RegistryUser,
} from '../src/storage/userRegistry';
import { formatUsernameDisplay } from '../src/utils/username';
import { ProfileAvatar } from '../src/ui/profile/ProfileAvatar';
import { AppFlatList } from '../src/ui/scrolling';

type TabKey = 'followers' | 'following';

type Row = {
  username: string;
  user: RegistryUser | null;
};

/** Abonnés / abonnements — comme Strava / Instagram */
export default function ConnectionsScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initial: TabKey =
    params.tab === 'following' ? 'following' : 'followers';
  const [tab, setTab] = useState<TabKey>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const usernames = useMemo(() => {
    if (tab === 'following') return state.profile.followingUsernames ?? [];
    return state.profile.followerUsernames ?? [];
  }, [tab, state.profile.followerUsernames, state.profile.followingUsernames]);

  const load = useCallback(async () => {
    setLoading(true);
    const next: Row[] = [];
    for (const username of usernames) {
      const user = await findRegistryUserByUsername(username);
      next.push({ username, user });
    }
    setRows(next);
    setLoading(false);
  }, [usernames]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.tabs, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, tab === 'followers' && { borderBottomColor: colors.accent }]}
          onPress={() => setTab('followers')}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: tab === 'followers' ? colors.text : colors.textMuted },
            ]}
          >
            Abonnés ({state.profile.followerUsernames?.length ?? state.profile.followers ?? 0})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'following' && { borderBottomColor: colors.accent }]}
          onPress={() => setTab('following')}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: tab === 'following' ? colors.text : colors.textMuted },
            ]}
          >
            Abonnements ({state.profile.followingUsernames?.length ?? state.profile.following ?? 0})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Chargement…</Text>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {tab === 'followers'
              ? 'Pas encore d’abonnés.'
              : 'Tu ne suis personne pour le moment.'}
          </Text>
          <Pressable
            style={[styles.cta, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/search')}
          >
            <Text style={styles.ctaText}>Trouver des athlètes</Text>
          </Pressable>
        </View>
      ) : (
        <AppFlatList
          data={rows}
          keyExtractor={(item) => item.username}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: spacing.sm }}
          renderItem={({ item }) => {
            const u = item.user;
            const initials = u
              ? `${u.firstName?.[0] || '?'}${u.lastName?.[0] || ''}`
              : item.username.slice(0, 2).toUpperCase();
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.bg }]}
                onPress={() =>
                  router.push({
                    pathname: '/user/[username]',
                    params: { username: item.username },
                  })
                }
              >
                <ProfileAvatar
                  uri={u?.avatarUri}
                  initials={initials}
                  size={44}
                  borderColor={colors.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {u ? `${u.firstName} ${u.lastName}` : formatUsernameDisplay(item.username)}
                  </Text>
                  <Text style={[styles.handle, { color: colors.textMuted }]}>
                    {formatUsernameDisplay(item.username)}
                  </Text>
                  {u?.city || u?.sport ? (
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {[u.city, u.sport].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { paddingTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  empty: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    fontSize: 14,
    lineHeight: 20,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.lg,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  name: { fontWeight: '700', fontSize: 16 },
  handle: { fontSize: 14, marginTop: 1 },
  meta: { fontSize: 13, marginTop: 2 },
});
