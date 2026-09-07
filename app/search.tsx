import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import { suggestProfiles, type RegistryUser } from '../src/storage/userRegistry';
import { formatUsernameDisplay, limitUsernameInput } from '../src/utils/username';
import { ProfileAvatar } from '../src/ui/profile/ProfileAvatar';
import { AppFlatList } from '../src/ui/scrolling';

const SUGGEST_LIMIT = 10;
const DEBOUNCE_MS = 120;

function sportLabelFromProfile(goal?: string): string | undefined {
  if (!goal) return undefined;
  if (goal.includes('tri')) return 'Triathlon';
  if (goal.includes('trail')) return 'Trail';
  if (goal.includes('bike') || goal.includes('velo')) return 'Vélo';
  if (goal.includes('swim') || goal.includes('nata')) return 'Natation';
  return 'Course';
}

/** Recherche d’amis — suggestions live → profil */
export default function SearchScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegistryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const city = state.profile.city;
  const sport =
    state.profile.activeProgram?.sportCategory === 'bike'
      ? 'Vélo'
      : state.profile.activeProgram?.sportCategory === 'swim'
        ? 'Natation'
        : state.profile.activeProgram?.sportCategory === 'triathlon'
          ? 'Triathlon'
          : sportLabelFromProfile(state.profile.onboarding?.goal);

  const runSuggest = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      const id = ++reqId.current;
      if (!trimmed) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const found = await suggestProfiles(trimmed, {
        city,
        sport,
        limit: SUGGEST_LIMIT,
        excludeId: state.profile.id,
      });
      if (id !== reqId.current) return;
      setResults(found);
      setLoading(false);
    },
    [city, sport, state.profile.id],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runSuggest(query);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, runSuggest]);

  const showEmpty = query.trim().length > 0 && !loading && results.length === 0;
  const following = new Set(state.profile.followingUsernames ?? []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.searchBox, { backgroundColor: colors.bg }]}>
        <Text style={[styles.loupe, { color: colors.textMuted }]}>⌕</Text>
        <AppTextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Chercher un athlète (@identifiant)"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(t) => setQuery(limitUsernameInput(t))}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
          underlineColorAndroid="transparent"
        />
      </View>

      {query.trim().length > 0 ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {loading
            ? 'Recherche…'
            : `${results.length} suggestion${results.length > 1 ? 's' : ''}`}
        </Text>
      ) : (
        <View style={styles.idle}>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tape le début d’un identifiant pour trouver des athlètes. Les profils
            publics s’ouvrent tout de suite ; les privés suivent leurs réglages.
          </Text>
          <Pressable
            style={[styles.idleCta, { backgroundColor: colors.bg }]}
            onPress={() =>
              router.push({ pathname: '/connections', params: { tab: 'following' } })
            }
          >
            <Text style={[styles.idleCtaText, { color: colors.text }]}>
              Voir mes abonnements
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
      )}

      {showEmpty ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Aucun profil ne commence par « {query.trim()} ».
        </Text>
      ) : null}

      <AppFlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          const sameCity =
            city && item.city && city.toLowerCase() === item.city.toLowerCase();
          const sameSport =
            sport && item.sport && sport.toLowerCase() === item.sport.toLowerCase();
          const isFollowing = following.has(item.username);
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
                uri={item.avatarUri}
                initials={`${item.firstName?.[0] || '?'}${item.lastName?.[0] || ''}`}
                size={44}
                borderColor={colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={[styles.handle, { color: colors.textMuted }]}>
                  {formatUsernameDisplay(item.username)}
                  {isFollowing ? ' · Abonné' : ''}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {[item.city, item.sport].filter(Boolean).join(' · ')}
                </Text>
                {sameCity || sameSport ? (
                  <Text style={[styles.badge, { color: colors.accentDark }]}>
                    {sameCity && sameSport
                      ? 'Même ville · même sport'
                      : sameCity
                        ? 'Proche de vous'
                        : 'Sport en commun'}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBox: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 0,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  loupe: { fontSize: 20, marginRight: 8, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    borderWidth: 0,
    // Web : enlève le contour focus noir du navigateur
    outlineWidth: 0,
    outlineStyle: 'none',
  } as object,
  hint: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  idle: { paddingBottom: spacing.sm },
  idleCta: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idleCtaText: { fontWeight: '700', fontSize: 15 },
  empty: { textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', fontSize: 15 },
  name: { fontWeight: '700', fontSize: 16 },
  handle: { fontSize: 14, marginTop: 1 },
  meta: { fontSize: 13, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});
