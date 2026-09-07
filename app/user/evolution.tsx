import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  demoAthleteEvolution,
  findDemoMember,
} from '../../src/data/demoDirectory';
import { formatRaceTime } from '../../src/engines/athleteProfile';
import {
  resolveContentFlags,
  resolveProfileAccess,
} from '../../src/engines/profilePrivacy';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatUsernameDisplay, normalizeUsername } from '../../src/utils/username';
import { AppScrollView } from '../../src/ui/scrolling';
import type { PrivacySettings, ProfileVisibility } from '../../src/types/domain';

function demoPrivacy(username: string): {
  visibility: ProfileVisibility;
  privacy: PrivacySettings;
} {
  const privateOnes = new Set(['nathpro', 'marcdupont', 'zoem']);
  const followersOnly = new Set(['naterun', 'noahpetit', 'nellyc']);
  const base = username.replace(/\d+$/, '');
  const visibility: ProfileVisibility =
    privateOnes.has(username) || privateOnes.has(base)
      ? 'private'
      : followersOnly.has(username) || followersOnly.has(base)
        ? 'followers_only'
        : 'public';
  return {
    visibility,
    privacy: {
      visibility,
      hideHr: true,
      hideWeight: true,
      hideCalories: false,
      hidePrograms: false,
      hideProgress: username === 'emmal' || base === 'emmal',
      hideStats: false,
      zones: [],
    },
  };
}

export default function UserEvolutionScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = normalizeUsername(raw ?? '');
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const member = useMemo(() => findDemoMember(username), [username]);
  const following = state.profile.followingUsernames ?? [];
  const viewerFollows = following.includes(username);

  const { visibility, privacy } = useMemo(
    () =>
      member
        ? demoPrivacy(username)
        : {
            visibility: 'public' as ProfileVisibility,
            privacy: {
              visibility: 'public' as ProfileVisibility,
              hideHr: false,
              hideWeight: true,
              hideCalories: false,
              hideProgress: false,
              zones: [],
            },
          },
    [member, username],
  );

  const access = resolveProfileAccess({
    isOwner: false,
    visibility,
    viewerFollows,
  });
  const flags = resolveContentFlags(access, privacy);
  const entries = useMemo(
    () => (member && flags.canSeeProgress ? demoAthleteEvolution(member) : []),
    [member, flags.canSeeProgress],
  );

  if (!member) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Profil introuvable.</Text>
      </View>
    );
  }

  if (!flags.canSeeProgress) {
    return (
      <View style={styles.root}>
        <Text style={styles.emptyTitle}>Évolution masquée</Text>
        <Text style={styles.empty}>
          {access === 'restricted'
            ? 'Compte privé — abonne-toi pour voir le temps et les progrès.'
            : 'Cette athlète a masqué temps & progression.'}
        </Text>
        <Text style={styles.back} onPress={() => router.back()}>
          ← Retour au profil
        </Text>
      </View>
    );
  }

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.hero}>{member.name}</Text>
      <Text style={styles.handle}>{formatUsernameDisplay(member.username)}</Text>
      <Text style={styles.sub}>Temps et progrès sur ce compte</Text>

      {entries.length === 0 ? (
        <Text style={styles.empty}>Pas encore de référence de temps enregistrée.</Text>
      ) : (
        entries.map((e) => {
          const improved = e.gainedSec > 0;
          return (
            <View key={e.id} style={styles.card}>
              <Text style={styles.kicker}>Évolution {e.label}</Text>
              <Text style={styles.programTitle}>{e.programTitle}</Text>
              {improved ? (
                <Text style={styles.gain}>Temps gagné −{formatRaceTime(e.gainedSec)}</Text>
              ) : (
                <Text style={styles.gainMuted}>Référence enregistrée</Text>
              )}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.colL}>Avant le programme</Text>
                  <Text style={styles.colV}>{formatRaceTime(e.baselineSec)}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.col}>
                  <Text style={styles.colL}>Meilleur actuel</Text>
                  <Text style={styles.colV}>{formatRaceTime(e.currentSec)}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      {!viewerFollows && visibility === 'public' ? (
        <Text style={styles.hint}>
          Abonne-toi pour voir aussi le détail des programmes et leurs complétions.
        </Text>
      ) : null}
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    hero: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    handle: {
      marginHorizontal: spacing.md,
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 14,
    },
    sub: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      color: colors.textSecondary,
      fontSize: 14,
    },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    programTitle: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    gain: {
      marginTop: 8,
      fontSize: 20,
      fontWeight: '800',
      color: colors.success,
    },
    gainMuted: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    col: { flex: 1 },
    colL: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    colV: { marginTop: 4, fontSize: 20, fontWeight: '800', color: colors.text },
    arrow: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
    hint: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    empty: {
      margin: spacing.lg,
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyTitle: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      fontWeight: '800',
      fontSize: 18,
      color: colors.text,
    },
    back: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      color: colors.accent,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}
