import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatUsernameDisplay } from '../../src/utils/username';

type Tab = 'fil' | 'membres' | 'partager';

/** Détail d’un club : fil, membres, partage séances / programmes. */
export default function GroupDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const clubId = decodeURIComponent(rawId ?? '');
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>('fil');
  const [message, setMessage] = useState('');
  const [shareOpen, setShareOpen] = useState<'activity' | 'program' | null>(null);

  const club = (state.clubs ?? []).find((c) => c.id === clubId);
  const me = state.profile.username.trim().toLowerCase();
  const isMember = club?.members.some((m) => m.username === me) ?? false;
  const isOwner =
    club?.members.some((m) => m.username === me && m.role === 'owner') ||
    club?.createdByUsername === me;

  const programs = resolveActivePrograms(state.profile);
  const recentActivities = useMemo(
    () =>
      [...state.activities]
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .slice(0, 12),
    [state.activities],
  );

  if (!club) {
    return (
      <View style={styles.root}>
        <Text style={styles.missing}>Ce groupe n’est plus disponible.</Text>
        <PrimaryButton label="Retour aux groupes" onPress={() => router.replace('/(tabs)/groups')} />
      </View>
    );
  }

  const leaveOrDelete = () => {
    if (isOwner) {
      Alert.alert('Supprimer le groupe ?', `« ${club.name} » sera retiré de ton appareil.`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'DELETE_CLUB', clubId: club.id });
            router.replace('/(tabs)/groups');
          },
        },
      ]);
      return;
    }
    Alert.alert('Quitter le groupe ?', club.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'LEAVE_CLUB', clubId: club.id });
          router.replace('/(tabs)/groups');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <AppScrollView contentContainerStyle={{ paddingBottom: 56 }}>
        <View style={styles.hero}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarLgText}>{club.name[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{club.name}</Text>
          <Text style={styles.meta}>
            {club.members.length} membre{club.members.length > 1 ? 's' : ''}
            {club.city ? ` · ${club.city}` : ''}
            {club.sportLabel ? ` · ${club.sportLabel}` : ''}
          </Text>
          <Text style={styles.desc}>{club.description}</Text>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['fil', 'Fil'],
              ['membres', 'Membres'],
              ['partager', 'Partager'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabOn]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'fil' ? (
          <View style={styles.pad}>
            {isMember ? (
              <View style={styles.composer}>
                <AppTextInput
                  placeholder="Écrire au groupe…"
                  value={message}
                  onChangeText={setMessage}
                  style={styles.input}
                />
                <PrimaryButton
                  label="Publier"
                  disabled={!message.trim()}
                  onPress={() => {
                    dispatch({
                      type: 'POST_CLUB_MESSAGE',
                      clubId: club.id,
                      text: message,
                    });
                    setMessage('');
                  }}
                />
              </View>
            ) : null}
            {club.posts.length === 0 ? (
              <Text style={styles.empty}>Pas encore de publication.</Text>
            ) : (
              club.posts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.post}
                  onPress={() => {
                    if (post.authorUsername) {
                      router.push(`/user/${encodeURIComponent(post.authorUsername)}`);
                    }
                  }}
                >
                  <Text style={styles.postAuthor}>
                    {post.authorDisplayName ?? formatUsernameDisplay(post.authorUsername)}
                  </Text>
                  <Text style={styles.postHandle}>
                    @{formatUsernameDisplay(post.authorUsername)}
                  </Text>
                  {post.kind === 'activity' ? (
                    <View style={styles.shareBadge}>
                      <Text style={styles.shareBadgeText}>Séance partagée</Text>
                      <Text style={styles.shareTitle}>
                        {post.activityTitle}
                        {post.activityDistanceKm != null
                          ? ` · ${post.activityDistanceKm} km`
                          : ''}
                      </Text>
                      {post.activityId ? (
                        <Pressable
                          onPress={() => router.push(`/activity/${post.activityId}`)}
                          hitSlop={8}
                        >
                          <Text style={styles.link}>Voir la séance ›</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {post.kind === 'program' ? (
                    <View style={styles.shareBadge}>
                      <Text style={styles.shareBadgeText}>Programme partagé</Text>
                      <Text style={styles.shareTitle}>{post.programTitle}</Text>
                    </View>
                  ) : null}
                  {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
                  <Text style={styles.postTime}>
                    {new Date(post.createdAt).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {tab === 'membres' ? (
          <View style={styles.pad}>
            {club.members.map((m) => (
              <Pressable
                key={m.username}
                style={styles.memberRow}
                onPress={() => router.push(`/user/${encodeURIComponent(m.username)}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(m.displayName ?? m.username)[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {m.displayName ?? formatUsernameDisplay(m.username)}
                  </Text>
                  <Text style={styles.meta}>
                    @{formatUsernameDisplay(m.username)}
                    {m.role === 'owner' ? ' · Créateur' : m.role === 'admin' ? ' · Admin' : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {tab === 'partager' ? (
          <View style={styles.pad}>
            <Text style={styles.hint}>
              Partage une séance GPS ou un programme actif avec les membres du club.
            </Text>
            <PrimaryButton
              label="Partager une séance"
              onPress={() => setShareOpen('activity')}
              disabled={!isMember || recentActivities.length === 0}
            />
            {recentActivities.length === 0 ? (
              <Text style={styles.empty}>Enregistre d’abord une séance pour la partager.</Text>
            ) : null}
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label="Partager un programme"
              onPress={() => setShareOpen('program')}
              disabled={!isMember || programs.length === 0}
            />
            {programs.length === 0 ? (
              <Text style={styles.empty}>Aucun programme actif à partager.</Text>
            ) : null}
            <View style={{ height: spacing.lg }} />
            <SecondaryButton
              label={isOwner ? 'Supprimer le groupe' : 'Quitter le groupe'}
              onPress={leaveOrDelete}
            />
          </View>
        ) : null}
      </AppScrollView>

      <Modal visible={shareOpen != null} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {shareOpen === 'activity' ? 'Choisir une séance' : 'Choisir un programme'}
            </Text>
            <AppScrollView style={{ maxHeight: 320 }}>
              {shareOpen === 'activity'
                ? recentActivities.map((a) => {
                    const km = a.distanceM
                      ? Math.round((a.distanceM / 1000) * 10) / 10
                      : null;
                    return (
                      <Pressable
                        key={a.id}
                        style={styles.pickRow}
                        onPress={() => {
                          dispatch({
                            type: 'SHARE_ACTIVITY_TO_CLUB',
                            clubId: club.id,
                            activityId: a.id,
                          });
                          setShareOpen(null);
                          setTab('fil');
                        }}
                      >
                        <Text style={styles.name}>{a.name}</Text>
                        <Text style={styles.meta}>
                          {km != null ? `${km} km · ` : ''}
                          {a.startDate.slice(0, 10)}
                        </Text>
                      </Pressable>
                    );
                  })
                : programs.map((p) => (
                    <Pressable
                      key={p.id}
                      style={styles.pickRow}
                      onPress={() => {
                        dispatch({
                          type: 'SHARE_PROGRAM_TO_CLUB',
                          clubId: club.id,
                          programId: p.id,
                          programTitle: p.title,
                        });
                        setShareOpen(null);
                        setTab('fil');
                      }}
                    >
                      <Text style={styles.name}>{p.title}</Text>
                      <Text style={styles.meta}>Programme actif</Text>
                    </Pressable>
                  ))}
            </AppScrollView>
            <SecondaryButton label="Annuler" onPress={() => setShareOpen(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary, padding: spacing.md },
    missing: { color: colors.text, marginBottom: spacing.md, fontWeight: '600' },
    hero: {
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
    },
    avatarLg: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    avatarLgText: { fontSize: 28, fontWeight: '800', color: colors.accent },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    desc: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
    tabs: {
      flexDirection: 'row',
      marginTop: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    tabOn: { backgroundColor: colors.accentLight },
    tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabLabelOn: { color: colors.accent },
    pad: { marginTop: spacing.md, gap: spacing.sm },
    composer: { gap: spacing.sm, marginBottom: spacing.sm },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.sm,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    post: {
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    postAuthor: { fontWeight: '700', color: colors.text },
    postHandle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    postText: { marginTop: 8, color: colors.text, lineHeight: 20 },
    postTime: { marginTop: 8, fontSize: 11, color: colors.textMuted },
    shareBadge: {
      marginTop: 8,
      padding: spacing.sm,
      borderRadius: radii.sm,
      backgroundColor: colors.bgSecondary,
    },
    shareBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'uppercase',
    },
    shareTitle: { marginTop: 4, fontWeight: '600', color: colors.text },
    link: { marginTop: 6, color: colors.accent, fontWeight: '600' },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '800' },
    name: { fontSize: 15, fontWeight: '600', color: colors.text },
    chevron: { fontSize: 22, color: colors.textMuted },
    hint: { color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
    empty: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
    pickRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
  });
}
