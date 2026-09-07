import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  demoFinishedProgramsWithUsage,
  demoProgramsFor,
  findDemoMember,
  programLikeKey,
} from '../../src/data/demoDirectory';
import { PROGRAM_LIKE_XP } from '../../src/engines/core';
import {
  resolveContentFlags,
  resolveProfileAccess,
} from '../../src/engines/profilePrivacy';
import { isPremium, withPremiumXpBonus } from '../../src/engines/subscription';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatUsernameDisplay, normalizeUsername } from '../../src/utils/username';
import { AppScrollView } from '../../src/ui/scrolling';
import { HeartLikeButton } from '../../src/ui/social/HeartLikeButton';
import {
  programReviewEmoji,
  programReviewLabel,
} from '../../src/ui/program/ProgramReviewCard';
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

/** Liste programmes : aperçu (public) ou détail (abonné) + likes ♥ */
export default function UserProgramsScreen() {
  const { username: raw } = useLocalSearchParams<{
    username: string;
    mode?: string;
  }>();
  const username = normalizeUsername(raw ?? '');
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const member = useMemo(() => findDemoMember(username), [username]);
  const following = state.profile.followingUsernames ?? [];
  const viewerFollows = following.includes(username);
  const likedKeys = state.profile.likedProgramKeys ?? [];
  const likeXp = withPremiumXpBonus(PROGRAM_LIKE_XP, isPremium(state.profile.plan));

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
              hidePrograms: false,
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
  const detail = flags.canSeeProgramsDetail;
  const canBrowse = flags.canSeeProgramsPreview || flags.canSeeProgramsDetail;
  const canLike = canBrowse;

  const finished = useMemo(
    () => (member && canBrowse ? demoFinishedProgramsWithUsage(member) : []),
    [member, canBrowse],
  );
  const programs = useMemo(
    () => (member && detail ? demoProgramsFor(member) : []),
    [member, detail],
  );

  if (!member) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Profil introuvable.</Text>
      </View>
    );
  }

  if (!canBrowse) {
    return (
      <View style={styles.root}>
        <Text style={styles.emptyTitle}>Programmes masqués</Text>
        <Text style={styles.empty}>
          {access === 'restricted'
            ? 'Compte privé — abonne-toi pour voir les programmes lancés.'
            : 'Cette athlète a masqué ses programmes.'}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Retour au profil</Text>
        </Pressable>
      </View>
    );
  }

  const onLikeProgram = (programId: string, programTitle: string) => {
    if (!canLike) return;
    const key = programLikeKey(username, programId);
    if (likedKeys.includes(key)) return;
    dispatch({
      type: 'LIKE_PROGRAM',
      ownerUsername: username,
      programId,
      programTitle,
    });
    Alert.alert('Like envoyé', `+${likeXp} XP — merci pour ${programTitle} !`);
  };

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.hero}>{member.name}</Text>
      <Text style={styles.handle}>{formatUsernameDisplay(member.username)}</Text>
      <Text style={styles.sub}>
        {detail
          ? 'Programmes lancés — détail, avis et likes'
          : 'Programmes lancés — un programme = une ligne (×N si plusieurs fois)'}
      </Text>

      <Text style={styles.section}>Terminés</Text>
      {finished.map((prog) => {
        const liked = likedKeys.includes(programLikeKey(username, prog.id));
        const emoji = programReviewEmoji(prog.reviewFeeling);
        const label = programReviewLabel(prog.reviewFeeling);
        return (
          <View key={prog.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.title}>{prog.title}</Text>
              {prog.timesCompleted > 1 ? (
                <View style={styles.timesPill}>
                  <Text style={styles.timesPillText}>×{prog.timesCompleted}</Text>
                </View>
              ) : (
                <Text style={styles.timesOnce}>1 fois</Text>
              )}
            </View>
            {detail ? (
              <Text style={styles.meta}>Catalogue · {prog.catalogId}</Text>
            ) : (
              <Text style={styles.meta}>Type : {prog.title}</Text>
            )}
            {emoji && label ? (
              <Text style={styles.review}>
                {emoji} {label}
                {prog.reviewComment ? ` — « ${prog.reviewComment} »` : ''}
              </Text>
            ) : null}
            <HeartLikeButton
              liked={liked}
              xpLabel={`+${likeXp} XP`}
              align="right"
              onPress={() => onLikeProgram(prog.id, prog.title)}
            />
          </View>
        );
      })}

      {detail ? (
        <>
          <Text style={styles.section}>Tous les programmes</Text>
          {programs.map((prog) => {
            const liked = likedKeys.includes(programLikeKey(username, prog.id));
            return (
              <View key={prog.id} style={styles.card}>
                <Text style={styles.title}>{prog.title}</Text>
                <Text style={styles.meta}>{prog.subtitle}</Text>
                <HeartLikeButton
                  liked={liked}
                  xpLabel={`+${likeXp} XP`}
                  align="right"
                  onPress={() => onLikeProgram(prog.id, prog.title)}
                />
              </View>
            );
          })}
        </>
      ) : (
        <Text style={styles.hint}>
          Abonne-toi pour le détail des complétions et les séances. Tu peux déjà liker un
          programme (+{likeXp} XP).
        </Text>
      )}
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
    },
    sub: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    section: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
    },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    title: { fontWeight: '800', fontSize: 15, color: colors.text, flexShrink: 1 },
    timesPill: {
      backgroundColor: colors.accentLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    timesPillText: { fontWeight: '900', fontSize: 12, color: colors.accentDark },
    timesOnce: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    meta: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
    review: {
      marginTop: 8,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    hint: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    empty: { margin: spacing.lg, color: colors.textMuted, lineHeight: 20 },
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
    },
  });
}
