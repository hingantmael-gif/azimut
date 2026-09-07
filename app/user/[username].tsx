import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  demoAthletePublicStats,
  demoFinishedProgramsWithUsage,
  demoProgramsFor,
  demoRecentSessions,
  findDemoMember,
  programLikeKey,
  sessionLikeKey,
} from '../../src/data/demoDirectory';
import { PROGRAM_LIKE_XP, SESSION_LIKE_XP } from '../../src/engines/core';
import {
  isPremium,
  withPremiumXpBonus,
} from '../../src/engines/subscription';
import {
  resolveContentFlags,
  resolveProfileAccess,
  visibilityLabel,
} from '../../src/engines/profilePrivacy';
import { formatUsernameDisplay, normalizeUsername } from '../../src/utils/username';
import type { PrivacySettings, ProfileVisibility } from '../../src/types/domain';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { formatCompactNumber } from '../../src/utils/formatCompactNumber';
import { HeartLikeButton } from '../../src/ui/social/HeartLikeButton';
import {
  findRegistryUserByUsername,
  type RegistryUser,
} from '../../src/storage/userRegistry';
import { ProfileAvatar } from '../../src/ui/profile/ProfileAvatar';
import { BioRichText } from '../../src/ui/profile/BioRichText';

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

export default function UserProfileScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = normalizeUsername(raw ?? '');
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const member = useMemo(() => findDemoMember(username), [username]);
  const [registryUser, setRegistryUser] = useState<RegistryUser | null>(null);
  const [registryReady, setRegistryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRegistryReady(false);
    void findRegistryUserByUsername(username).then((u) => {
      if (!cancelled) {
        setRegistryUser(u);
        setRegistryReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isSelf = username === normalizeUsername(state.profile.username);

  useEffect(() => {
    if (isSelf) router.replace('/(tabs)/profile');
  }, [isSelf, router]);

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
              zones: [],
            },
          },
    [member, username],
  );

  const following = state.profile.followingUsernames ?? [];
  const outgoing = state.profile.outgoingFollowRequests ?? [];
  const likedKeys = state.profile.likedProgramKeys ?? [];
  const likedSessionKeys = state.profile.likedSessionKeys ?? [];
  const likeXp = withPremiumXpBonus(PROGRAM_LIKE_XP, isPremium(state.profile.plan));
  const sessionLikeXp = withPremiumXpBonus(SESSION_LIKE_XP, isPremium(state.profile.plan));
  const viewerFollows = following.includes(username);
  const requestPending = outgoing.includes(username);
  const theyFollowMe = (state.profile.followerUsernames ?? []).includes(username);
  const needsApproval = visibility === 'private' || visibility === 'followers_only';

  /** Demande d’abonnement reçue et encore en attente (ex. depuis une notif). */
  const incomingFollowRequest = useMemo(() => {
    const notifs = state.profile.socialNotifications ?? [];
    return (
      notifs.find(
        (n) =>
          n.kind === 'follow_request' &&
          n.requestStatus === 'pending' &&
          normalizeUsername(n.fromUsername) === username,
      ) ?? null
    );
  }, [state.profile.socialNotifications, username]);

  const programs = useMemo(
    () => (member ? demoProgramsFor(member) : []),
    [member],
  );
  const publicStats = useMemo(
    () => (member ? demoAthletePublicStats(member) : null),
    [member],
  );
  const finishedUsage = useMemo(
    () => (member ? demoFinishedProgramsWithUsage(member) : []),
    [member],
  );
  const recentSessions = useMemo(
    () => (member ? demoRecentSessions(member) : []),
    [member],
  );

  const followLabel = viewerFollows
    ? 'Abonné'
    : requestPending
      ? 'Demande envoyée'
      : theyFollowMe
        ? 'S’abonner en retour'
        : "S'abonner";

  const onFollowPress = () => {
    if (viewerFollows) {
      dispatch({ type: 'UNFOLLOW_USER', username });
      return;
    }
    if (requestPending) {
      dispatch({ type: 'CANCEL_FOLLOW_REQUEST', username });
      return;
    }
    dispatch({
      type: 'FOLLOW_USER',
      username,
      requiresApproval: needsApproval && !theyFollowMe,
    });
  };

  const onLikeProgram = (programId: string, programTitle: string) => {
    const key = programLikeKey(username, programId);
    if (likedKeys.includes(key)) return;
    dispatch({
      type: 'LIKE_PROGRAM',
      ownerUsername: username,
      programId,
      programTitle,
    });
    Alert.alert('Like envoyé', `+${likeXp} XP — merci de soutenir ${member?.name ?? 'cet athlète'} !`);
  };

  const onLikeSession = (sessionId: string, sessionTitle: string) => {
    const key = sessionLikeKey(username, sessionId);
    if (likedSessionKeys.includes(key)) return;
    dispatch({
      type: 'LIKE_SESSION',
      ownerUsername: username,
      sessionId,
      sessionTitle,
    });
    Alert.alert('Like envoyé', `+${sessionLikeXp} XP — séance « ${sessionTitle} »`);
  };

  const access = resolveProfileAccess({
    isOwner: isSelf,
    visibility,
    viewerFollows,
  });
  const flags = resolveContentFlags(access, privacy);

  if (isSelf) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Redirection…</Text>
      </View>
    );
  }

  if (!member && !registryReady) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Chargement…</Text>
      </View>
    );
  }

  if (!member && !registryUser) {
    return (
      <View style={styles.root}>
        <Text style={styles.empty}>Profil introuvable.</Text>
      </View>
    );
  }

  if (!member && registryUser) {
    const displayName =
      `${registryUser.firstName} ${registryUser.lastName}`.trim() ||
      registryUser.username;
    return (
      <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <ProfileAvatar
            uri={registryUser.avatarUri}
            initials={`${registryUser.firstName?.[0] || '?'}${registryUser.lastName?.[0] || ''}`}
            size={72}
            borderColor={colors.accent}
          />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.handle}>
            {formatUsernameDisplay(registryUser.username)}
          </Text>
          {registryUser.bio?.trim() ? (
            <BioRichText bio={registryUser.bio.trim()} style={styles.bio} />
          ) : null}
          <Text style={styles.visBadge}>{visibilityLabel(visibility)}</Text>
          {(registryUser.city || registryUser.sport) && (
            <Text style={styles.city}>
              {[registryUser.city, registryUser.sport].filter(Boolean).join(' · ')}
            </Text>
          )}
          <Pressable
            style={[
              styles.followBtn,
              (viewerFollows || requestPending) && styles.followingBtn,
            ]}
            onPress={onFollowPress}
          >
            <Text
              style={[
                styles.followText,
                (viewerFollows || requestPending) && styles.followingText,
              ]}
            >
              {followLabel}
            </Text>
          </Pressable>
        </View>
      </AppScrollView>
    );
  }

  // Profil démo (répertoire) — member est défini ici
  const demo = member!;

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      {incomingFollowRequest ? (
        <View style={styles.requestBanner}>
          <Text style={styles.requestBannerTitle}>
            {demo.name} a envoyé une demande pour vous suivre
          </Text>
          <Text style={styles.requestBannerSub}>
            Accepte pour qu’il ou elle voie ton profil selon tes réglages de confidentialité.
          </Text>
          <View style={styles.requestActions}>
            <Pressable
              style={styles.requestAccept}
              onPress={() =>
                dispatch({
                  type: 'ACCEPT_FOLLOW_REQUEST',
                  notificationId: incomingFollowRequest.id,
                })
              }
            >
              <Text style={styles.requestAcceptText}>Accepter</Text>
            </Pressable>
            <Pressable
              style={styles.requestDecline}
              onPress={() =>
                dispatch({
                  type: 'DECLINE_FOLLOW_REQUEST',
                  notificationId: incomingFollowRequest.id,
                })
              }
            >
              <Text style={styles.requestDeclineText}>Refuser</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <ProfileAvatar
          uri={registryUser?.avatarUri}
          initials={demo.name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)}
          size={72}
          borderColor={colors.accent}
        />
        <Text style={styles.name}>{demo.name}</Text>
        <Text style={styles.handle}>{formatUsernameDisplay(demo.username)}</Text>
        {registryUser?.bio?.trim() ? (
          <BioRichText bio={registryUser.bio.trim()} style={styles.bio} />
        ) : null}
        <Text style={styles.visBadge}>{visibilityLabel(visibility)}</Text>
        <Text style={styles.city}>
          {demo.city} · {demo.sport}
        </Text>
        <Pressable
          style={[
            styles.followBtn,
            (viewerFollows || requestPending) && styles.followingBtn,
          ]}
          onPress={onFollowPress}
        >
          <Text
            style={[
              styles.followText,
              (viewerFollows || requestPending) && styles.followingText,
            ]}
          >
            {followLabel}
          </Text>
        </Pressable>
      </View>

      {/* Volumes : visibles même en privé (sauf masquage stats) */}
      {flags.canSeeStats && publicStats ? (
        <View style={styles.statsBlock}>
          <Text style={styles.statsTitle}>Volumes & activité</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statN}>{formatCompactNumber(publicStats.runKm)}</Text>
              <Text style={styles.statL}>course à pied</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statN}>{formatCompactNumber(publicStats.bikeKm)}</Text>
              <Text style={styles.statL}>km vélo</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statN}>{formatCompactNumber(publicStats.swimKm)}</Text>
              <Text style={styles.statL}>km nage</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statN}>
                {formatCompactNumber(publicStats.strengthSessions)}
              </Text>
              <Text style={styles.statL}>séances muscu</Text>
            </View>
            {flags.canSeeProgramsPreview || flags.canSeeProgramsDetail ? (
              <Pressable
                style={styles.statCell}
                onPress={() =>
                  router.push({
                    pathname: '/user/programs',
                    params: {
                      username,
                      mode: flags.canSeeProgramsDetail ? 'detail' : 'preview',
                    },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Voir les programmes terminés"
              >
                <Text style={styles.statN}>
                  {formatCompactNumber(publicStats.completedPrograms)}
                </Text>
                <Text style={styles.statL}>programmes terminés</Text>
                <Text style={styles.statLink}>Voir →</Text>
              </Pressable>
            ) : (
              <View style={styles.statCell}>
                <Text style={styles.statN}>
                  {formatCompactNumber(publicStats.completedPrograms)}
                </Text>
                <Text style={styles.statL}>programmes terminés</Text>
              </View>
            )}
          </View>
          {access === 'restricted' ? (
            <Text style={styles.teaserHint}>
              Compte privé — abonne-toi pour l’évolution, les programmes et les séances.
            </Text>
          ) : !viewerFollows ? (
            <Text style={styles.teaserHint}>
              Abonne-toi pour le détail des programmes, les likes et les séances enregistrées.
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.hiddenNote}>Stats masquées par l’athlète.</Text>
      )}

      {access === 'restricted' ? (
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Profil privé</Text>
          <Text style={styles.lockBody}>
            Seuls les volumes & l’activité sont visibles. Évolution, programmes et séances
            restent réservés aux abonnés.
          </Text>
        </View>
      ) : (
        <>
          {flags.canSeeProgress ? (
            <Pressable
              style={styles.block}
              onPress={() =>
                router.push({
                  pathname: '/user/evolution',
                  params: { username },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Voir l’évolution temps et progrès"
            >
              <Text style={styles.blockTitle}>Évolution</Text>
              <Text style={styles.blockBody}>
                Temps et progrès visibles sur ce compte — appuie pour voir le détail.
              </Text>
              <Text style={styles.evoCta}>Voir les temps →</Text>
            </Pressable>
          ) : privacy.hideProgress ? (
            <Text style={styles.hiddenNote}>Temps & progression masqués.</Text>
          ) : null}

          {flags.canSeeProgramsPreview && !flags.canSeeProgramsDetail ? (
            <Pressable
              style={styles.block}
              onPress={() =>
                router.push({
                  pathname: '/user/programs',
                  params: { username, mode: 'preview' },
                })
              }
            >
              <Text style={styles.blockTitle}>Programmes lancés</Text>
              <Text style={styles.blockBody}>
                Aperçu des types de programmes (triathlon, semi, 10 km…). Abonne-toi pour le
                détail des complétions.
              </Text>
              <Text style={styles.evoCta}>Voir l’aperçu →</Text>
            </Pressable>
          ) : null}

          {flags.canSeeProgramsDetail ? (
            <>
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Programmes terminés</Text>
                <Text style={styles.likeHint}>
                  Du plus utilisé au moins utilisé — appuie pour le catalogue complet.
                </Text>
                {finishedUsage.map((prog) => {
                  const liked = likedKeys.includes(programLikeKey(username, prog.id));
                  return (
                  <View key={prog.id} style={styles.usageRowWrap}>
                    <View style={styles.usageRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programTitle}>{prog.title}</Text>
                        <Text style={styles.programSub}>
                          {prog.timesCompleted > 1
                            ? `×${prog.timesCompleted} · ${prog.catalogId}`
                            : `1 fois · ${prog.catalogId}`}
                        </Text>
                      </View>
                      <View style={styles.usageCol}>
                        <Text style={styles.usageN}>×{prog.timesCompleted}</Text>
                        <Text style={styles.usageL}>fois</Text>
                      </View>
                    </View>
                    <HeartLikeButton
                      liked={liked}
                      xpLabel={`+${likeXp} XP`}
                      align="right"
                      onPress={() => onLikeProgram(prog.id, prog.title)}
                    />
                  </View>
                  );
                })}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/user/programs',
                      params: { username, mode: 'detail' },
                    })
                  }
                >
                  <Text style={styles.evoCta}>Tous les programmes →</Text>
                </Pressable>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockTitle}>Tous les programmes</Text>
                <Text style={styles.likeHint}>
                  Like un programme : +{likeXp} XP — une fois par programme.
                </Text>
                {programs.map((prog) => {
                  const liked = likedKeys.includes(programLikeKey(username, prog.id));
                  return (
                    <View key={prog.id} style={styles.programCard}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.programTop}>
                          <Text style={styles.programTitle}>{prog.title}</Text>
                          <Text
                            style={[
                              styles.statusPill,
                              prog.status === 'active'
                                ? styles.statusActive
                                : styles.statusDone,
                            ]}
                          >
                            {prog.status === 'active' ? 'En cours' : 'Terminé'}
                          </Text>
                        </View>
                        <Text style={styles.programSub}>
                          {prog.timesCompleted != null
                            ? `Terminé ${prog.timesCompleted} fois`
                            : prog.subtitle}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.likeBtn, liked && styles.likeBtnOn]}
                        onPress={() => onLikeProgram(prog.id, prog.title)}
                        disabled={liked}
                      >
                        <Text style={[styles.likeEmoji, liked && styles.likeEmojiOn]}>
                          {liked ? '♥' : '♡'}
                        </Text>
                        <Text style={[styles.likeLabel, liked && styles.likeLabelOn]}>
                          {liked ? 'Aimé' : `+${likeXp} XP`}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {flags.canSeeSessions ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Séances du programme</Text>
              <Text style={styles.likeHint}>
                Séances enregistrées sur ses programmes — like pour soutenir (+{sessionLikeXp} XP).
              </Text>
              {recentSessions.map((sess) => {
                const liked = likedSessionKeys.includes(sessionLikeKey(username, sess.id));
                return (
                  <View key={sess.id} style={styles.sessionCard}>
                    <View style={styles.usageRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programTitle}>{sess.title}</Text>
                        <Text style={styles.programSub}>
                          {sess.sport} · {sess.dateLabel}
                        </Text>
                      </View>
                      <Text style={styles.usageN}>{sess.distanceLabel}</Text>
                    </View>
                    <HeartLikeButton
                      liked={liked}
                      xpLabel={`+${sessionLikeXp} XP`}
                      align="right"
                      onPress={() => onLikeSession(sess.id, sess.title)}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    requestBanner: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.accentLight,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    requestBannerTitle: {
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
      lineHeight: 21,
    },
    requestBannerSub: {
      marginTop: 6,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    requestActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    requestAccept: {
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.pill,
    },
    requestAcceptText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    requestDecline: {
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestDeclineText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    header: {
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontWeight: '800', fontSize: 22, color: colors.accent },
    name: { marginTop: spacing.sm, fontSize: 20, fontWeight: '800', color: colors.text },
    handle: { color: colors.textMuted, marginTop: 2 },
    bio: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    visBadge: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentDark,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    city: { marginTop: 8, color: colors.textSecondary, fontSize: 13 },
    followBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.accent,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: radii.pill,
    },
    followingBtn: {
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    followText: { color: '#fff', fontWeight: '800' },
    followingText: { color: colors.text },
    lockCard: {
      margin: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lockTitle: { fontWeight: '800', fontSize: 18, color: colors.text },
    lockBody: { marginTop: 8, color: colors.textSecondary, lineHeight: 20 },
    statsBlock: {
      margin: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsTitle: {
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    statCell: {
      width: '30%',
      flexGrow: 1,
      minWidth: 96,
      alignItems: 'center',
      paddingVertical: 8,
      backgroundColor: colors.bgSecondary,
      borderRadius: radii.md,
    },
    statN: { fontSize: 18, fontWeight: '800', color: colors.accentDark },
    statL: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    statLink: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: '800',
      color: colors.accent,
    },
    teaserHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    block: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
    },
    blockTitle: { fontWeight: '800', color: colors.text },
    blockBody: { marginTop: 4, color: colors.textSecondary, lineHeight: 20 },
    evoCta: {
      marginTop: spacing.sm,
      color: colors.accent,
      fontWeight: '800',
      fontSize: 14,
    },
    likeHint: {
      marginTop: 6,
      marginBottom: 10,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    usageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    usageRowWrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingBottom: 4,
    },
    sessionCard: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingBottom: 4,
    },
    usageCol: { alignItems: 'flex-end', minWidth: 52 },
    usageN: { fontWeight: '900', fontSize: 18, color: colors.accent },
    usageL: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    programCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    programTop: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    programTitle: { fontWeight: '800', fontSize: 15, color: colors.text, flexShrink: 1 },
    programSub: { marginTop: 3, fontSize: 12, color: colors.textSecondary },
    statusPill: {
      fontSize: 11,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    statusActive: { backgroundColor: '#DCFCE7', color: '#166534' },
    statusDone: { backgroundColor: colors.bgSecondary, color: colors.textMuted },
    likeBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 72,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radii.md,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    likeBtnOn: {
      backgroundColor: '#FEE2E2',
      borderColor: '#FECACA',
    },
    likeEmoji: { fontSize: 18, color: colors.textMuted },
    likeEmojiOn: { color: '#DC2626' },
    likeLabel: { marginTop: 2, fontSize: 10, fontWeight: '800', color: colors.textMuted },
    likeLabelOn: { color: '#DC2626' },
    hiddenNote: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      color: colors.textMuted,
      fontSize: 13,
    },
    empty: { padding: spacing.lg, color: colors.textMuted },
  });
}
