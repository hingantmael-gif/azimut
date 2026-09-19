import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { CATALOG_CLUBS } from '../../src/constants/catalogClubs';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import {
  communityCreateClub,
  communityDiscoverClubs,
  communityJoinClub,
} from '../../src/api/community';

type CloudClub = {
  id: string;
  name: string;
  description?: string;
  city?: string;
  sport?: string;
  memberCount?: number;
};

/** Groupes / clubs — cloud quand connecté, sinon seed local (bêta). */
export default function GroupsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [sportLabel, setSportLabel] = useState('');
  const [cloudClubs, setCloudClubs] = useState<CloudClub[]>([]);
  const [cloudMode, setCloudMode] = useState(false);

  const myClubs = state.clubs ?? [];
  const joinedIds = useMemo(
    () => new Set(myClubs.map((c) => c.catalogId ?? c.id)),
    [myClubs],
  );

  useEffect(() => {
    let cancelled = false;
    void communityDiscoverClubs(state.authToken, {
      city: state.profile.city,
    }).then((res) => {
      if (cancelled || !res?.clubs) return;
      setCloudClubs(res.clubs);
      setCloudMode(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state.authToken, state.profile.city]);

  const discover = useMemo(() => {
    if (cloudMode && cloudClubs.length > 0) {
      return cloudClubs
        .filter((c) => !joinedIds.has(c.id))
        .map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          city: c.city,
          memberCount: c.memberCount ?? 1,
          sportLabel: c.sport,
          cloud: true as const,
        }));
    }
    return CATALOG_CLUBS.filter((c) => !joinedIds.has(c.id)).map((c) => ({
      ...c,
      cloud: false as const,
    }));
  }, [cloudMode, cloudClubs, joinedIds]);

  const openCreate = () => setCreating(true);

  const submitCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cloud = await communityCreateClub(state.authToken, {
      name: trimmed,
      description: description.trim(),
      city: city.trim(),
      sport: sportLabel.trim(),
    });
    const id =
      cloud?.club?.id ||
      `club-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    dispatch({
      type: 'CREATE_CLUB',
      id,
      name: trimmed,
      description: description.trim(),
      city: city.trim() || undefined,
      sportLabel: sportLabel.trim() || undefined,
      visibility: 'public',
    });
    setCreating(false);
    setName('');
    setDescription('');
    setCity('');
    setSportLabel('');
    router.push(`/group/${encodeURIComponent(id)}`);
  };

  const joinAndOpen = async (clubId: string, isCloud: boolean) => {
    if (isCloud) {
      await communityJoinClub(state.authToken, clubId);
      const found = cloudClubs.find((c) => c.id === clubId);
      if (found && !joinedIds.has(clubId)) {
        dispatch({
          type: 'CREATE_CLUB',
          id: clubId,
          name: found.name,
          description: found.description || '',
          city: found.city,
          sportLabel: found.sport,
          visibility: 'public',
        });
      }
    } else {
      dispatch({ type: 'JOIN_CATALOG_CLUB', catalogId: clubId });
    }
    router.push(`/group/${encodeURIComponent(clubId)}`);
  };

  return (
    <View style={styles.root}>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={styles.header}>Mes groupes et clubs</Text>
        <Text style={styles.sub}>
          {cloudMode
            ? 'Clubs synchronisés cloud — rejoignables entre appareils (bêta).'
            : 'Bêta locale : les clubs créés ici restent sur cet appareil tant que tu n’es pas connecté au cloud.'}
        </Text>

        <View style={{ paddingHorizontal: spacing.md }}>
          <PrimaryButton label="Créer un groupe" onPress={openCreate} />
        </View>

        <Text style={styles.section}>Mes clubs</Text>
        {myClubs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun club pour l’instant</Text>
            <Text style={styles.emptyBody}>
              Crée le tien (ex. « Runners Nantes ») ou rejoins un club ci-dessous.
            </Text>
          </View>
        ) : (
          myClubs.map((club) => (
            <Pressable
              key={club.id}
              style={styles.row}
              onPress={() => router.push(`/group/${encodeURIComponent(club.id)}`)}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir ${club.name}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{club.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{club.name}</Text>
                <Text style={styles.meta}>
                  {club.members.length} membre{club.members.length > 1 ? 's' : ''}
                  {club.city ? ` · ${club.city}` : ''}
                  {club.sportLabel ? ` · ${club.sportLabel}` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}

        {discover.length > 0 ? (
          <>
            <Text style={styles.section}>
              {cloudMode ? 'Découvrir (cloud)' : 'Découvrir'}
            </Text>
            {discover.map((club) => (
              <View key={club.id} style={styles.discoverCard}>
                <Pressable
                  style={styles.rowInner}
                  onPress={() => void joinAndOpen(club.id, club.cloud)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rejoindre ${club.name}`}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{club.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{club.name}</Text>
                    <Text style={styles.meta}>
                      {club.memberCount} membres
                      {club.city ? ` · ${club.city}` : ''}
                    </Text>
                    <Text style={styles.desc} numberOfLines={2}>
                      {club.description}
                    </Text>
                  </View>
                </Pressable>
                <SecondaryButton
                  label="Rejoindre"
                  onPress={() => void joinAndOpen(club.id, club.cloud)}
                />
              </View>
            ))}
          </>
        ) : null}
      </AppScrollView>

      <Modal visible={creating} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau groupe</Text>
            <Text style={styles.modalHint}>
              Les membres pourront y publier séances, programmes et messages.
            </Text>
            <AppTextInput
              placeholder="Nom du groupe"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <AppTextInput
              placeholder="Description (optionnel)"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, { minHeight: 72 }]}
            />
            <AppTextInput
              placeholder="Ville (optionnel)"
              value={city}
              onChangeText={setCity}
              style={styles.input}
            />
            <AppTextInput
              placeholder="Sport (ex. Course, Trail…)"
              value={sportLabel}
              onChangeText={setSportLabel}
              style={styles.input}
            />
            <PrimaryButton
              label="Créer"
              onPress={() => void submitCreate()}
              disabled={!name.trim()}
            />
            <SecondaryButton label="Annuler" onPress={() => setCreating(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    header: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    sub: {
      fontSize: 14,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingTop: 6,
      paddingBottom: spacing.md,
      lineHeight: 20,
    },
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    discoverCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '800' },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    desc: { fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 18 },
    chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
    empty: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    emptyTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
    emptyBody: { marginTop: 6, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
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
    modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    modalHint: { fontSize: 13, color: colors.textMuted, marginBottom: 4, lineHeight: 18 },
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.sm,
      color: colors.text,
      backgroundColor: colors.bgSecondary,
    },
  });
}
