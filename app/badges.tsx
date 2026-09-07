import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../src/store/AppContext';
import {
  badgeViewModels,
  sortBadgesByProgress,
} from '../src/engines/achievements';
import { computeSleepStreak } from '../src/engines/sleepCalendar';
import { normalizeTier, tierMeta } from '../src/engines/rankedLadder';
import { useThemeColors } from '../src/theme/ThemeContext';
import type { ColorPalette } from '../src/theme/palettes';
import { spacing } from '../src/theme/tokens';
import { AppScrollView } from '../src/ui/scrolling';
import { BadgeGrid } from '../src/ui/badges/BadgeGrid';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** Catalogue badges — triés par proximité du déblocage. */
export default function BadgesScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { ranked, achievements } = state.profile;

  const meta = tierMeta(normalizeTier(ranked.tier));

  const badges = useMemo(() => {
    const likedPrograms = (state.profile.likedProgramKeys ?? []).length;
    const likedSessions = (state.profile.likedSessionKeys ?? []).length;
    const sleepHistory = state.health.sleepHistory;
    const all = badgeViewModels({
      achievements,
      lifetime: state.lifetime,
      feedbacks: state.feedbacks,
      ranked,
      likedPrograms,
      likedSessions,
      likesGiven: likedPrograms + likedSessions,
      following: (state.profile.followingUsernames ?? []).length,
      followers: (state.profile.followerUsernames ?? []).length,
      hasActiveProgram: Boolean(state.profile.activeProgram),
      programHistoryCount: (state.profile.programHistory ?? []).length,
      sleepNights: sleepHistory?.length ?? 0,
      sleepStreak: computeSleepStreak(sleepHistory),
    });
    return sortBadgesByProgress(all);
  }, [
    achievements,
    state.lifetime,
    state.feedbacks,
    ranked,
    state.profile.likedProgramKeys,
    state.profile.likedSessionKeys,
    state.profile.followingUsernames,
    state.profile.followerUsernames,
    state.profile.activeProgram,
    state.profile.programHistory,
    state.health.sleepHistory,
  ]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.bannerPad}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.run}
          title="Tes badges"
          subtitle="Progrès visibles — athlètes au premier plan"
          height={132}
        />
      </View>
      <Text style={styles.hint}>
        Facile → Légendaire — débloque un badge pour gagner de l’XP. Likes, nuits de
        sommeil importées et régularité montent progressivement. Les plus proches du
        déblocage apparaissent en premier ; les terminés sont en bas.
      </Text>
      <Text style={styles.stats}>
        {unlockedCount} / {badges.length} débloqué{unlockedCount > 1 ? 's' : ''}
      </Text>
      <BadgeGrid badges={badges} accentColor={meta.color} accentSoft={meta.colorSoft} />
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    bannerPad: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    hint: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    stats: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
    },
  });
}
