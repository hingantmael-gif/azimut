import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import { plannedSessionsForProgram } from '../../src/engines/programSessions';
import { computeProgramEvolution } from '../../src/engines/programProgress';
import {
  formatRankLabel,
  normalizeTier,
  tierMeta,
} from '../../src/engines/rankedLadder';
import { formatUsernameDisplay } from '../../src/utils/username';
import { SoftPulse, FadeInUp, AnimatedFillBar, PressableScale, SectionHeader } from '../../src/ui/motion/softMotion';
import { ProfileCover } from '../../src/ui/profile/ProfileCover';
import { longestSessionKmBySport } from '../../src/engines/profileCovers';
import { AvatarPickerSheet } from '../../src/ui/profile/AvatarPickerSheet';
import { ProfileAvatar } from '../../src/ui/profile/ProfileAvatar';
import { BioRichText } from '../../src/ui/profile/BioRichText';
import { RankBadge } from '../../src/ui/ranked/RankBadge';
import { ProgramSportCover } from '../../src/ui/program/SportCover';
import { formatProgramDurationLabel } from '../../src/constants/programs';
import { AppScrollView } from '../../src/ui/scrolling';
import { summarizeSportsData } from '../../src/engines/athleteProfile';
import { GOAL_LABELS } from '../../src/constants/features';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';

function programProgressPct(opts: {
  nonRestCount: number;
  doneCount: number;
  startedAt?: string;
  weeks: number;
  ongoing?: boolean;
}): number {
  const bySessions =
    opts.nonRestCount > 0 ? opts.doneCount / opts.nonRestCount : 0;
  if (opts.ongoing) {
    return Math.min(100, Math.round(bySessions * 100));
  }
  let byTime = 0;
  if (opts.startedAt && opts.weeks > 0) {
    const start = Date.parse(opts.startedAt);
    const elapsedWeeks = (Date.now() - start) / (7 * 24 * 3600 * 1000);
    byTime = Math.min(1, Math.max(0, elapsedWeeks / opts.weeks));
  }
  const raw = Math.max(bySessions, byTime * 0.35 + bySessions * 0.65);
  return Math.min(100, Math.round(raw * 100));
}

/** Vous — profil allégé (évolution uniquement dans le détail programme) */
export default function ProfileScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const p = state.profile;
  const ranked = p.ranked;
  const tier = normalizeTier(ranked.tier);
  const meta = tierMeta(tier);
  const division = ranked.division !== undefined ? ranked.division : 3;
  const rankLabel = formatRankLabel(tier, division);

  const activePrograms = resolveActivePrograms(p);
  const history = p.programHistory ?? [];
  const activityCount = state.activities.length;
  const programCount = activePrograms.length + history.length;
  const sportsFill = useMemo(
    () => summarizeSportsData(p.onboarding),
    [p.onboarding],
  );
  const goalLabel = p.onboarding?.goal
    ? GOAL_LABELS[p.onboarding.goal] ?? p.onboarding.goal
    : 'À définir';
  const sportsValue =
    sportsFill.disciplinesWithData > 0
      ? `${sportsFill.disciplinesWithData} discipline${sportsFill.disciplinesWithData > 1 ? 's' : ''}`
      : 'À compléter';
  const followersN = p.followerUsernames?.length ?? p.followers ?? 0;
  const followingN = p.followingUsernames?.length ?? p.following ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScreenAtmosphere intensity={0.55} />
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Pressable
        onPress={() => router.push('/settings/profile-cover')}
        accessibilityLabel="Modifier le fond de profil"
      >
        <ProfileCover
          coverId={p.profileCoverId}
          personalBestKm={longestSessionKmBySport(state.activities)}
        />
      </Pressable>
      <View style={styles.avatarWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => setAvatarSheetOpen(true)}
          accessibilityLabel="Changer la photo de profil"
          style={styles.avatarPress}
          hitSlop={12}
        >
          <ProfileAvatar
            uri={p.avatarUri}
            initials={`${p.firstName?.[0] || '?'}${p.lastName?.[0] || ''}`}
            size={88}
            borderColor={colors.accent}
            style={styles.avatar}
          />
          <View style={styles.avatarBadge} pointerEvents="none">
            <Text style={styles.avatarBadgeText}>✎</Text>
          </View>
        </Pressable>
      </View>

      <AvatarPickerSheet
        visible={avatarSheetOpen}
        hasAvatar={Boolean(p.avatarUri)}
        onClose={() => setAvatarSheetOpen(false)}
        onPicked={(uri) =>
          dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUri: uri } })
        }
        onCleared={() =>
          dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUri: undefined } })
        }
      />

      <Text style={styles.name}>
        {p.firstName} {p.lastName}
      </Text>
      <Text style={styles.handle}>
        {formatUsernameDisplay(p.username || 'athlete')}
      </Text>
      {p.bio?.trim() ? (
        <BioRichText bio={p.bio.trim()} style={styles.bio} />
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
          onPress={() => router.push('/settings/profile')}
          accessibilityRole="button"
          accessibilityLabel="Modifier le profil"
        >
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Modifier le profil</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="Trouver des athlètes"
        >
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Trouver des athlètes</Text>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statCell}
            onPress={() =>
              router.push({ pathname: '/connections', params: { tab: 'followers' } })
            }
            accessibilityRole="button"
            accessibilityLabel="Voir mes abonnés"
          >
            <Text style={styles.socialN}>{followersN}</Text>
            <Text style={styles.socialL}>Abonnés</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={styles.statCell}
            onPress={() =>
              router.push({ pathname: '/connections', params: { tab: 'following' } })
            }
            accessibilityRole="button"
            accessibilityLabel="Voir mes abonnements"
          >
            <Text style={styles.socialN}>{followingN}</Text>
            <Text style={styles.socialL}>Abonnements</Text>
          </Pressable>
        </View>
        <View style={styles.statsRule} />
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statCell}
            onPress={() => router.push('/activities')}
            accessibilityRole="button"
            accessibilityLabel="Voir mes activités"
          >
            <Text style={styles.socialN}>{activityCount}</Text>
            <Text style={styles.socialL}>Activité</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={styles.statCell}
            onPress={() => router.push('/programs')}
            accessibilityRole="button"
            accessibilityLabel="Voir mes programmes"
          >
            <Text style={styles.socialN}>{programCount}</Text>
            <Text style={styles.socialL}>Programme</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.rankCard, { borderColor: meta.color, backgroundColor: meta.colorSoft }]}
        onPress={() => router.push('/ranked')}
      >
        <SoftPulse intensity={0.05}>
          <RankBadge tier={tier} division={division} size={64} />
        </SoftPulse>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rankTitle, { color: meta.color }]}>{rankLabel}</Text>
          <Text style={styles.rankSub}>
            Niveau {ranked.level} · {ranked.xp.toLocaleString('fr-FR')} XP
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable
        style={[styles.linkRow, { backgroundColor: colors.bg, borderColor: colors.border }]}
        onPress={() => router.push('/badges')}
      >
        <Text style={[styles.linkRowLabel, { color: colors.text }]}>Badges</Text>
        <Text style={[styles.linkRowValue, { color: colors.textMuted }]}>Voir ›</Text>
      </Pressable>

      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
        <SectionHeader
          title="Athlète"
          subtitle="Objectifs, chronos et forme"
          accentColor={colors.accent}
          delay={40}
        />
      </View>
      <View style={[styles.linkGroup, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Pressable
          style={styles.linkRowInner}
          onPress={() => router.push('/settings/goals')}
        >
          <Text style={[styles.linkRowLabel, { color: colors.text }]}>Objectifs & niveau</Text>
          <Text style={[styles.linkRowValue, { color: colors.textMuted }]} numberOfLines={1}>
            {goalLabel} ›
          </Text>
        </Pressable>
        <View style={[styles.linkRule, { backgroundColor: colors.border }]} />
        <Pressable
          style={styles.linkRowInner}
          onPress={() => router.push('/settings/sports-data')}
        >
          <Text style={[styles.linkRowLabel, { color: colors.text }]}>Données sportives</Text>
          <Text style={[styles.linkRowValue, { color: colors.textMuted }]}>{sportsValue} ›</Text>
        </Pressable>
        <View style={[styles.linkRule, { backgroundColor: colors.border }]} />
        <Pressable
          style={styles.linkRowInner}
          onPress={() => router.push('/settings/performance')}
        >
          <Text style={[styles.linkRowLabel, { color: colors.text }]}>Ma forme</Text>
          <Text style={[styles.linkRowValue, { color: colors.textMuted }]}>Fitness ›</Text>
        </Pressable>
        <View style={[styles.linkRule, { backgroundColor: colors.border }]} />
        <Pressable
          style={styles.linkRowInner}
          onPress={() => router.push('/settings/privacy')}
        >
          <Text style={[styles.linkRowLabel, { color: colors.text }]}>Confidentialité du profil</Text>
          <Text style={[styles.linkRowValue, { color: colors.textMuted }]}>›</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.md }}>
        <SectionHeader
          title={activePrograms.length > 1 ? 'Programmes en cours' : 'Programme en cours'}
          subtitle="Tes abonnés peuvent liker ton programme"
          accentColor={colors.accent}
          delay={60}
        />
      </View>
      {activePrograms.length > 0 ? (
        activePrograms.map((prog, idx) => {
          const sessions = plannedSessionsForProgram(state.plan, prog, true);
          const trainable = sessions.filter(
            (w) => w.discipline !== 'rest' || w.sleepAdaptation?.creditedComplete,
          );
          const doneIds = new Set(state.analyses.map((a) => a.plannedWorkoutId));
          const doneByDate = new Set(state.activities.map((a) => a.startDate.slice(0, 10)));
          const doneCount = trainable.filter(
            (w) =>
              w.sleepAdaptation?.creditedComplete ||
              doneIds.has(w.id) ||
              doneByDate.has(w.date),
          ).length;
          const progressPct = programProgressPct({
            nonRestCount: trainable.length,
            doneCount,
            startedAt: prog.startedAt,
            weeks: prog.weeks,
            ongoing: prog.ongoing,
          });
          return (
            <FadeInUp key={prog.id} delay={100 + idx * 40}>
              <PressableScale
                style={styles.programCard}
                onPress={() =>
                  router.push(
                    `/program/detail?scope=active&id=${encodeURIComponent(prog.id)}`,
                  )
                }
              >
                <ProgramSportCover
                  sportCategory={prog.sportCategory}
                  catalogId={prog.catalogId}
                  minHeight={168}
                  borderRadius={radii.xl}
                  style={StyleSheet.absoluteFill}
                  scrim="rgba(7,17,31,0.55)"
                />
                <View style={styles.programCardInner}>
                  <Text style={styles.programTitle}>{prog.title}</Text>
                  <Text style={styles.programSub}>{prog.subtitle}</Text>
                  <View style={styles.progressWrap}>
                    <AnimatedFillBar
                      ratio={progressPct / 100}
                      color="#fff"
                      trackColor="rgba(255,255,255,0.25)"
                      height={10}
                    />
                    <Text style={styles.progressLabel}>
                      {progressPct} % · {doneCount} séances
                    </Text>
                  </View>
                  <Text style={styles.evoLink}>Ouvrir le programme →</Text>
                </View>
              </PressableScale>
            </FadeInUp>
          );
        })
      ) : (
        <Text style={styles.empty}>Aucun programme actif — créez-en un pour démarrer.</Text>
      )}

      <View style={{ paddingHorizontal: spacing.md }}>
        <SectionHeader
          title="Programmes terminés"
          subtitle={history.length === 0 ? undefined : `${history.length} terminé${history.length > 1 ? 's' : ''}`}
          accentColor={colors.accentDark}
          delay={140}
        />
      </View>
      {history.length === 0 ? (
        <Text style={styles.empty}>Pas encore de programme terminé.</Text>
      ) : (
        history.map((prog, i) => {
          const evo = computeProgramEvolution(prog);
          return (
            <FadeInUp key={`${prog.id}-${prog.completedAt ?? prog.startedAt}`} delay={160 + i * 50}>
              <PressableScale
                style={styles.programCard}
                onPress={() =>
                  router.push(
                    `/program/detail?scope=history&id=${encodeURIComponent(prog.id)}&at=${encodeURIComponent(prog.completedAt ?? prog.startedAt)}`,
                  )
                }
              >
                <ProgramSportCover
                  sportCategory={prog.sportCategory}
                  catalogId={prog.catalogId}
                  minHeight={140}
                  borderRadius={radii.xl}
                  style={StyleSheet.absoluteFill}
                  scrim="rgba(7,17,31,0.55)"
                />
                <View style={styles.programCardInner}>
                  <Text style={styles.programTitle}>{prog.title}</Text>
                  <Text style={styles.programSub}>{prog.subtitle}</Text>
                  {evo.hasBaseline && evo.hasCurrent && evo.gainLabel ? (
                    <Text
                      style={[
                        styles.historyGain,
                        evo.improved ? styles.historyGainUp : styles.historyGainDown,
                      ]}
                    >
                      Bilan : {evo.gainLabel} sur {evo.label}
                    </Text>
                  ) : null}
                  <Text style={styles.programMeta}>
                    {formatProgramDurationLabel(prog)}
                    {prog.completedAt
                      ? ` · ${new Date(prog.completedAt).toLocaleDateString('fr-FR')}`
                      : ''}
                    {' · ouvrir →'}
                  </Text>
                </View>
              </PressableScale>
            </FadeInUp>
          );
        })
      )}
    </AppScrollView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    avatarWrap: {
      alignItems: 'center',
      marginTop: -36,
      zIndex: 20,
      elevation: 20,
    },
    avatarPress: {
      position: 'relative',
      zIndex: 21,
      elevation: 21,
    },
    avatar: {
      borderWidth: 3,
      borderColor: colors.bg,
    },
    avatarBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
      zIndex: 22,
    },
    avatarBadgeText: { color: colors.white, fontSize: 12, fontWeight: '800' },
    name: {
      textAlign: 'center',
      marginTop: spacing.sm,
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    handle: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
    bio: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.sm,
      marginHorizontal: spacing.lg,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
    },
    actionBtnText: { fontWeight: '700', fontSize: 13 },
    statsGrid: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    statsRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 6,
    },
    socialN: { fontWeight: '800', fontSize: 16, color: colors.text },
    socialL: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    rankCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    rankTitle: { fontWeight: '800', fontSize: 16 },
    rankSub: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
    chevron: { fontSize: 22, color: colors.textMuted },
    linkRow: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    linkGroup: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    linkRowInner: {
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    linkRule: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md },
    linkRowLabel: { fontWeight: '600', fontSize: 15 },
    linkRowValue: { fontSize: 13, flexShrink: 1, maxWidth: '48%', textAlign: 'right' },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    programCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.xl,
      overflow: 'hidden',
      minHeight: 160,
      position: 'relative',
    },
    programCardInner: {
      padding: spacing.md,
      zIndex: 2,
    },
    programTitle: { fontWeight: '800', color: '#fff', fontSize: 16 },
    programSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
    programMeta: { color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 6, fontWeight: '700' },
    evoLink: {
      marginTop: spacing.sm,
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    historyGain: { marginTop: 8, fontSize: 14, fontWeight: '700' },
    historyGainUp: { color: '#86EFAC' },
    historyGainDown: { color: '#FCA5A5' },
    progressWrap: { marginTop: spacing.sm },
    progressLabel: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.95)',
    },
    empty: { paddingHorizontal: spacing.md, color: colors.textMuted, fontSize: 14 },
  });
}
