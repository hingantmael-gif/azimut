import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { badgeViewModels } from '../src/engines/achievements';
import { computeSleepStreak } from '../src/engines/sleepCalendar';
import {
  allRankSteps,
  buildDivisionLeaderboard,
  formatRankLabel,
  isSameRankStep,
  normalizeTier,
  representativeXpForRankStep,
  tierMeta,
  xpProgressInLevel,
  type RankStep,
} from '../src/engines/rankedLadder';
import {
  ladderOutcomeLabel,
  ladderZoneForPlace,
  ladderZoneSummary,
  ladderWeekKey,
  PREMIUM_RELEGATION_SHIELDS,
} from '../src/engines/rankedSeason';
import {
  KM_ODYSSEY_XP_PER_LEVEL,
  ODYSSEY_SPORT_META,
  type OdysseySport,
  buildKmOdysseyBoards,
  compactKmBoard,
  formatOdysseyDistance,
  kmOdysseyFromTotalKm,
} from '../src/engines/kmOdyssey';
import {
  WORLD_BOARDS,
  buildWorldRankings,
  compactWorldBoard,
  worldBoardTitle,
  type WorldBoardId,
} from '../src/engines/worldRankings';
import { podiumRewardCard } from '../src/engines/rankingRewards';
import { formatUsernameDisplay } from '../src/utils/username';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppScrollView } from '../src/ui/scrolling';
import { useHorizontalDragScroll } from '../src/ui/scrolling/useHorizontalDragScroll';
import { RankBadge } from '../src/ui/ranked/RankBadge';
import { ProfileAvatar } from '../src/ui/profile/ProfileAvatar';
import { ScreenAtmosphere } from '../src/ui/atmosphere/ScreenAtmosphere';
import { FadeInUp } from '../src/ui/motion/softMotion';
import {
  DAILY_PRESENCE_XP,
  FIRST_SESSION_OF_DAY_XP,
  PROGRAM_LIKE_XP,
  RPE_SUBMIT_XP,
  SESSION_LIKE_XP,
  XP_EARN_GUIDE_LINES,
} from '../src/engines/core';

const LIVE_REFRESH_MS = 12_000;
type RankedSection = 'league' | 'world' | 'odyssey';

/** Classement compétitif — XP, ladder hebdo, badges */
export default function RankedScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { ranked, achievements, firstName, lastName, username, city, id, country, avatarUri } =
    state.profile;

  const [section, setSection] = useState<RankedSection>('league');
  const [liveTick, setLiveTick] = useState(0);
  const [odysseyScope, setOdysseyScope] = useState<'world' | 'national'>('world');
  const [howXpOpen, setHowXpOpen] = useState(false);

  useEffect(() => {
    const idTimer = setInterval(() => setLiveTick((t) => t + 1), LIVE_REFRESH_MS);
    return () => clearInterval(idTimer);
  }, []);

  /** Dès que ton XP change, on force un recalcul immédiat des classements. */
  useEffect(() => {
    setLiveTick((t) => t + 1);
  }, [ranked.xp, ranked.weekXp, ranked.level]);

  const tier = normalizeTier(ranked.tier);
  const division = ranked.division !== undefined ? ranked.division : 3;
  const meta = tierMeta(tier);
  const rankLabel = formatRankLabel(tier, division);
  const odysseyXp = KM_ODYSSEY_XP_PER_LEVEL;
  const [ladderExpanded, setLadderExpanded] = useState(false);
  const [worldBoardId, setWorldBoardId] = useState<WorldBoardId>('xp_total');
  const [worldExpanded, setWorldExpanded] = useState(false);
  const [odysseySport, setOdysseySport] = useState<OdysseySport>('run');
  const kmOdyssey = useMemo(() => {
    const km =
      odysseySport === 'bike'
        ? state.lifetime.bikeKm ?? 0
        : odysseySport === 'swim'
          ? state.lifetime.swimKm ?? 0
          : state.lifetime.runKm ?? state.lifetime.totalKm;
    return kmOdysseyFromTotalKm(km, odysseySport);
  }, [
    odysseySport,
    state.lifetime.bikeKm,
    state.lifetime.swimKm,
    state.lifetime.runKm,
    state.lifetime.totalKm,
  ]);
  const odysseyBoards = useMemo(
    () =>
      buildKmOdysseyBoards({
        you: {
          id,
          username,
          displayName:
            `${firstName} ${lastName}`.trim() || username || 'Vous',
          country,
          city,
          totalKm: kmOdyssey.totalKm,
        },
        sport: odysseySport,
        liveTick,
      }),
    [id, username, firstName, lastName, country, city, kmOdyssey.totalKm, odysseySport, liveTick],
  );
  const odysseyBoardFull =
    odysseyScope === 'national' ? odysseyBoards.national : odysseyBoards.world;
  const odysseyRows = useMemo(
    () => compactKmBoard(odysseyBoardFull, username),
    [odysseyBoardFull, username],
  );
  const odysseyYourRank =
    odysseyScope === 'national'
      ? odysseyBoards.yourNationalRank
      : odysseyBoards.yourWorldRank;
  const rankSteps = useMemo(() => allRankSteps(), []);
  const yourStep =
    rankSteps.find((s) => isSameRankStep(tier, division, s)) ?? rankSteps[0];
  const [selectedStep, setSelectedStep] = useState<RankStep>(yourStep);
  const [, startRankTransition] = useTransition();

  const pickStep = useCallback((step: RankStep) => {
    startRankTransition(() => {
      setSelectedStep((prev) =>
        isSameRankStep(prev.tier, prev.division, step) ? prev : step,
      );
    });
  }, [startRankTransition]);

  const ladderScrollRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Map<string, number>>(new Map());
  const [ladderContentWidth, setLadderContentWidth] = useState(0);
  const [ladderLayoutWidth, setLadderLayoutWidth] = useState(0);
  const ladderOffsetRef = useRef(0);

  const scrollLadderToX = useCallback((x: number, animated = false) => {
    ladderOffsetRef.current = x;
    ladderScrollRef.current?.scrollTo({ x, animated });
  }, []);

  const ladderDrag = useHorizontalDragScroll({
    getOffset: () => ladderOffsetRef.current,
    getMaxOffset: () => Math.max(0, ladderContentWidth - ladderLayoutWidth),
    scrollTo: scrollLadderToX,
  });

  const scrollLadderToStep = useCallback((step: RankStep) => {
    const key = `${step.tier}-${step.division ?? 'c'}`;
    const x = chipLayouts.current.get(key);
    if (x == null) return;
    scrollLadderToX(Math.max(0, x - spacing.md), true);
  }, [scrollLadderToX]);

  const onLadderScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    ladderOffsetRef.current = e.nativeEvent.contentOffset.x;
  }, []);

  useEffect(() => {
    scrollLadderToStep(selectedStep);
  }, [selectedStep, scrollLadderToStep]);

  const yourBoard = useMemo(
    () =>
      buildDivisionLeaderboard({
        you: { id, username, firstName, lastName, city, avatarUri },
        ranked,
        liveTick,
      }),
    [id, username, firstName, lastName, city, avatarUri, ranked, liveTick],
  );

  const board = useMemo(
    () =>
      buildDivisionLeaderboard({
        you: { id, username, firstName, lastName, city, avatarUri },
        ranked,
        viewTier: selectedStep.tier,
        viewDivision: selectedStep.division,
        expanded: ladderExpanded,
        liveTick,
      }),
    [
      id,
      username,
      firstName,
      lastName,
      city,
      avatarUri,
      ranked,
      selectedStep.tier,
      selectedStep.division,
      ladderExpanded,
      liveTick,
    ],
  );

  const worldRankings = useMemo(
    () =>
      buildWorldRankings({
        you: {
          id,
          username,
          displayName: `${firstName} ${lastName}`.trim() || username || 'Vous',
          country,
          city,
        },
        ranked,
        totalKm: state.lifetime.totalKm,
        liveTick,
      }),
    [id, username, firstName, lastName, country, city, ranked, state.lifetime.totalKm, liveTick],
  );

  const activeWorld = worldRankings[worldBoardId];
  const worldRows = useMemo(
    () =>
      worldExpanded
        ? activeWorld.entries
        : compactWorldBoard(activeWorld.entries, { topN: 15, neighbor: 2 }),
    [activeWorld.entries, worldExpanded],
  );

  const openAthleteProfile = useCallback(
    (athleteUsername: string, isYou?: boolean) => {
      if (isYou) {
        router.push('/(tabs)/profile');
        return;
      }
      const u = athleteUsername.trim().toLowerCase();
      if (!u) return;
      router.push({ pathname: '/user/[username]', params: { username: u } });
    },
    [router],
  );

  useEffect(() => {
    setLadderExpanded(false);
  }, [selectedStep.tier, selectedStep.division]);

  useEffect(() => {
    setSelectedStep(yourStep);
  }, [yourStep.tier, yourStep.division, yourStep.label]);

  const selectedZones = useMemo(
    () => ladderZoneSummary(selectedStep.tier, selectedStep.division, board.divisionSize),
    [selectedStep.tier, selectedStep.division, board.divisionSize],
  );
  const viewingYourRank = board.isYourDivision;
  const isViewingOwnRank = isSameRankStep(tier, division, selectedStep);
  const isChampionView = selectedStep.tier === 'champion';
  const displayMeta = tierMeta(selectedStep.tier);
  const displayLabel = selectedStep.label;
  const displayXp = useMemo(
    () =>
      isViewingOwnRank
        ? ranked.xp
        : representativeXpForRankStep(selectedStep.tier, selectedStep.division),
    [isViewingOwnRank, ranked.xp, selectedStep.tier, selectedStep.division],
  );
  const displayProgress = useMemo(
    () => xpProgressInLevel(displayXp),
    [displayXp],
  );

  useEffect(() => {
    dispatch({ type: 'SETTLE_LADDER_WEEK', place: yourBoard.yourRank });
  }, [dispatch, yourBoard.yourRank, ranked.ladderWeekKey]);

  const badgeStats = useMemo(() => {
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
    const unlocked = all.filter((b) => b.unlocked).length;
    const closest = all
      .filter((b) => !b.unlocked)
      .sort((a, b) => b.progress - a.progress)[0];
    return { total: all.length, unlocked, closest };
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

  const barWidth = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    barWidth.setValue(0);
    Animated.timing(barWidth, {
      toValue: displayProgress.ratio,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [displayProgress.ratio, selectedStep.tier, selectedStep.division, barWidth]);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fadeIn, pulse]);

  const fillWidth = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const ContentWrap = Platform.OS === 'web' ? View : Animated.View;
  const contentWrapProps =
    Platform.OS === 'web'
      ? {}
      : { style: { opacity: fadeIn } as ViewStyle };

  const renderRankChip = (step: RankStep) => {
    const chipKey = `${step.tier}-${step.division ?? 'c'}`;
    const isYours = isSameRankStep(tier, division, step);
    const selected = isSameRankStep(selectedStep.tier, selectedStep.division, step);
    return (
      <Pressable
        key={chipKey}
        onPress={() => pickStep(step)}
        onLayout={(e) => {
          chipLayouts.current.set(chipKey, e.nativeEvent.layout.x);
        }}
        style={[
          styles.tierChip,
          {
            backgroundColor: selected ? step.color : step.colorSoft,
            borderColor: selected ? step.color : colors.border,
            borderWidth: selected ? 2 : 1,
          },
        ]}
      >
        <View pointerEvents="none">
          <RankBadge tier={step.tier} division={step.division} size={52} compact />
        </View>
        <Text
          style={[styles.tierLabel, { color: selected ? '#fff' : step.color }]}
          numberOfLines={1}
        >
          {step.label}
        </Text>
        {isYours ? (
          <Text style={[styles.tierYou, !selected && { color: step.color }]}>toi</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <>
    <View style={styles.root}>
      <ScreenAtmosphere />
    <AppScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: 48 }}
      nestedScrollEnabled
    >
      <ContentWrap {...contentWrapProps}>
        <FadeInUp>
        <View style={styles.sectionTabs}>
          {(
            [
              { id: 'league' as const, label: 'Ligue' },
              { id: 'world' as const, label: 'Mondial' },
              { id: 'odyssey' as const, label: 'Odyssée' },
            ] as const
          ).map((tab) => {
            const on = section === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setSection(tab.id)}
                style={[
                  styles.sectionTab,
                  on && { backgroundColor: meta.color, borderColor: meta.color },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.sectionTabText, on && { color: '#fff' }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.liveHint}>
          Classements en direct · maj {LIVE_REFRESH_MS / 1000}s
          {country ? ` · ${country}` : ''}
          {state.profile.countryLocked ? ' (verrouillé)' : ''}
        </Text>
        </FadeInUp>

        {section === 'league' ? (
        <>
        <View style={[styles.hero, { backgroundColor: displayMeta.color }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.season}>Saison {ranked.seasonId}</Text>
          {Platform.OS === 'web' ? (
            <View style={{ marginTop: spacing.md }}>
              <RankBadge
                tier={selectedStep.tier}
                division={selectedStep.division}
                size={selectedStep.tier === 'champion' ? 128 : 112}
              />
            </View>
          ) : (
            <Animated.View
              style={{ marginTop: spacing.md, transform: [{ scale: pulse }] }}
            >
              <RankBadge
                tier={selectedStep.tier}
                division={selectedStep.division}
                size={selectedStep.tier === 'champion' ? 128 : 112}
              />
            </Animated.View>
          )}
          <Text style={styles.rankTitle}>{displayLabel}</Text>
          {!isViewingOwnRank ? (
            <Text style={styles.rankPreviewHint}>Ton rang actuel : {rankLabel}</Text>
          ) : null}
          <Text style={styles.rankSub}>
            Niveau {displayProgress.level} · {displayXp.toLocaleString('fr-FR')} XP profil
            {isViewingOwnRank ? (
              <>
                {' · '}
                {(ranked.weekXp ?? 0).toLocaleString('fr-FR')} XP semaine
              </>
            ) : null}
          </Text>
          {isViewingOwnRank ? (
            <>
              <Text style={styles.streak}>
                🔥 Série {ranked.streakWeeks} semaine
                {ranked.streakWeeks > 1 ? 's' : ''}
              </Text>
              <Text style={styles.shieldHero}>
                Boucliers anti-descente : {ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS}/
                {PREMIUM_RELEGATION_SHIELDS}
              </Text>
            </>
          ) : (
            <Text style={styles.rankPreviewHint}>
              Consultation libre — liste et XP des athlètes ci-dessous.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isViewingOwnRank
              ? `Progression vers le niveau ${displayProgress.level + 1}`
              : `Palier ${displayLabel} · niveau type ${displayProgress.level}`}
          </Text>
          <View style={styles.xpRow}>
            <Text style={styles.xpLeft}>
              {displayProgress.xpIntoLevel} / {displayProgress.xpForNext} XP
            </Text>
            <Text style={styles.xpRight}>
              Encore {displayProgress.remaining} XP
            </Text>
          </View>
          <View style={styles.track}>
            {Platform.OS === 'web' ? (
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round(displayProgress.ratio * 1000) / 10}%`,
                    backgroundColor: displayMeta.color,
                  },
                ]}
              />
            ) : (
              <Animated.View
                style={[
                  styles.fill,
                  { width: fillWidth, backgroundColor: displayMeta.color },
                ]}
              />
            )}
          </View>
        </View>

        <Pressable
          style={styles.howCard}
          onPress={() => setHowXpOpen((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={[styles.howTitle, { color: colors.text }]}>
            Comment gagner de l’XP {howXpOpen ? '▾' : '▸'}
          </Text>
          {howXpOpen ? (
            <>
              {XP_EARN_GUIDE_LINES.map((line) => (
                <Text key={line} style={[styles.howLine, { color: colors.textMuted }]}>
                  · {line}
                </Text>
              ))}
              <Text style={[styles.howLine, { color: colors.textSecondary, marginTop: 8 }]}>
                Exemples : +{DAILY_PRESENCE_XP} présence/jour · +{FIRST_SESSION_OF_DAY_XP} 1ʳᵉ séance ·
                +{RPE_SUBMIT_XP} RPE · +{PROGRAM_LIKE_XP}/{SESSION_LIKE_XP} likes.
              </Text>
            </>
          ) : null}
        </Pressable>

        {isViewingOwnRank ? (
          <View style={styles.howCard}>
            <Text style={styles.howPremiumOn}>
              {ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS} bouclier
              {(ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS) > 1 ? 's' : ''}{' '}
              anti-descente restant
              {(ranked.relegationShieldsLeft ?? PREMIUM_RELEGATION_SHIELDS) > 1 ? 's' : ''}.
            </Text>
          </View>
        ) : null}

        <Text style={styles.section}>Rangs</Text>
        <View
          style={[
            styles.ladderScrollWrap,
            Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
          ]}
          {...ladderDrag.panHandlers}
          // @ts-expect-error onWheel web-only
          onWheel={ladderDrag.onWheel}
        >
          <AppScrollView
            ref={ladderScrollRef}
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.ladderRow}
            style={styles.ladderScroll}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onLadderScroll}
            onContentSizeChange={(w) => setLadderContentWidth(w)}
            onLayout={(e) => setLadderLayoutWidth(e.nativeEvent.layout.width)}
          >
            {rankSteps.map(renderRankChip)}
          </AppScrollView>
        </View>

        <View style={styles.zoneCard}>
          <View style={styles.zoneCardHead}>
            <RankBadge
              tier={selectedStep.tier}
              division={selectedStep.division}
              size={48}
              compact
            />
            <Text style={styles.zoneCardTitle}>{selectedStep.label}</Text>
          </View>

          <View
            style={[
              styles.zoneLane,
              selectedZones.promote ? styles.zoneLaneUp : styles.zoneLaneMuted,
            ]}
          >
            <Text style={styles.zoneGlyph}>{selectedZones.promote ? '↑' : '—'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneLaneTitle}>
                {selectedZones.promote
                  ? `Places #${selectedZones.promote.from}–${selectedZones.promote.to}`
                  : 'Pas de montée'}
              </Text>
              <Text style={styles.zoneLaneDesc}>
                {selectedZones.promote
                  ? `Montée → ${selectedZones.promote.nextLabel}`
                  : 'Rang maximum atteint.'}
              </Text>
            </View>
            {viewingYourRank &&
            selectedZones.promote &&
            board.yourRank >= selectedZones.promote.from &&
            board.yourRank <= selectedZones.promote.to ? (
              <Text style={styles.zoneYouMark}>toi #{board.yourRank}</Text>
            ) : null}
          </View>

          <View style={[styles.zoneLane, styles.zoneLaneSafe]}>
            <Text style={styles.zoneGlyph}>·</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneLaneTitle}>
                Places #{selectedZones.safe.from}–{selectedZones.safe.to}
              </Text>
              <Text style={styles.zoneLaneDesc}>Tu restes à ce rang.</Text>
            </View>
            {viewingYourRank &&
            board.yourRank >= selectedZones.safe.from &&
            board.yourRank <= selectedZones.safe.to ? (
              <Text style={styles.zoneYouMark}>toi #{board.yourRank}</Text>
            ) : null}
          </View>

          <View
            style={[
              styles.zoneLane,
              selectedZones.relegate ? styles.zoneLaneDown : styles.zoneLaneMuted,
            ]}
          >
            <Text style={styles.zoneGlyph}>{selectedZones.relegate ? '↓' : '—'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneLaneTitle}>
                {selectedZones.relegate
                  ? `Places #${selectedZones.relegate.from}–${selectedZones.relegate.to}`
                  : 'Pas de descente'}
              </Text>
              <Text style={styles.zoneLaneDesc}>
                {selectedZones.relegate
                  ? `Descente → ${selectedZones.relegate.prevLabel}`
                  : 'Plancher de la ladder.'}
              </Text>
            </View>
            {viewingYourRank &&
            selectedZones.relegate &&
            board.yourRank >= selectedZones.relegate.from &&
            board.yourRank <= selectedZones.relegate.to ? (
              <Text style={styles.zoneYouMark}>toi #{board.yourRank}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.boardHead}>
          <Text style={styles.section}>Ladder {board.label}</Text>
          <Text style={board.isYourDivision ? styles.yourPlace : styles.yourPlaceMuted}>
            {board.isYourDivision
              ? `#${board.yourRank} / ${board.divisionSize}`
              : `${board.divisionSize} athlètes`}
          </Text>
        </View>
        {ranked.lastLadderOutcome && board.isYourDivision ? (
          <Text style={styles.ladderOutcomeInline}>
            {ladderOutcomeLabel(
              ranked.lastLadderOutcome,
              ranked.lastLadderPlace,
              ranked.relegationShieldsLeft,
            )}
          </Text>
        ) : null}

        <View style={styles.board}>
          {board.rows.length === 0 ? (
            <View style={styles.gapRow}>
              <Text style={styles.gapText}>Aucun athlète dans ce classement pour l’instant.</Text>
            </View>
          ) : (
            board.rows.map((row) => {
              if (row.type === 'gap') {
                return (
                  <View key={`gap-${row.fromPlace}-${row.toPlace}`} style={styles.gapRow}>
                    <Text style={styles.gapText}>
                      ··· {row.fromPlace === row.toPlace
                        ? `#${row.fromPlace}`
                        : `#${row.fromPlace} – #${row.toPlace}`}{' '}
                      ···
                    </Text>
                  </View>
                );
              }
              const { place, player: p } = row;
              const zone = ladderZoneForPlace(
                place,
                selectedStep.tier,
                selectedStep.division,
                board.divisionSize,
              );
              const medal =
                place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : null;
              const zoneMark =
                zone === 'promote' ? '↑' : zone === 'relegate' ? '↓' : null;
              return (
                <Pressable
                  key={`${p.id}-${place}`}
                  onPress={() => openAthleteProfile(p.username, p.isYou)}
                  style={[
                    styles.row,
                    zone === 'promote' && styles.rowPromote,
                    zone === 'relegate' && styles.rowRelegate,
                    p.isYou && {
                      backgroundColor: meta.colorSoft,
                      borderColor: meta.color,
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Profil de ${p.displayName}`}
                >
                  <Text style={[styles.place, p.isYou && { color: meta.color }]}>
                    {medal ?? place}
                  </Text>
                  <View style={styles.rowZoneSpacer}>
                    <Text
                      style={[
                        styles.rowZoneMark,
                        zone === 'promote' && styles.rowZoneUp,
                        zone === 'relegate' && styles.rowZoneDown,
                        !zoneMark && styles.rowZoneMarkHidden,
                      ]}
                    >
                      {zoneMark ?? '·'}
                    </Text>
                  </View>
                  <ProfileAvatar
                    uri={p.isYou ? avatarUri : p.avatarUri}
                    initials={p.displayName.slice(0, 1).toUpperCase()}
                    size={40}
                    borderColor={p.isYou ? meta.color : colors.border}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, p.isYou && { color: meta.color }]}>
                      {p.displayName}
                      {p.isYou ? ' (toi)' : ''}
                    </Text>
                    <Text style={styles.rowHandle}>
                      {formatUsernameDisplay(p.username)}
                      {p.city ? ` · ${p.city}` : ''}
                      {p.profileXp != null
                        ? ` · ${p.profileXp.toLocaleString('fr-FR')} XP profil`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.xpCol}>
                    <Text style={styles.rowXp}>{p.xp.toLocaleString('fr-FR')}</Text>
                    <Text style={styles.rowXpL}>XP sem.</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <Pressable
          style={styles.expandBtn}
          onPress={() => setLadderExpanded((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={[styles.expandBtnText, { color: displayMeta.color }]}>
            {ladderExpanded
              ? 'Réduire la liste'
              : isChampionView
                ? `Voir les meilleurs Champions (${board.divisionSize})`
                : `Voir tout le classement (${board.divisionSize})`}
          </Text>
        </Pressable>
        </>
        ) : null}

        {section === 'world' ? (
        <>
        <Text style={styles.section}>Classements mondiaux</Text>
        <View style={styles.worldChips}>
          {WORLD_BOARDS.map((b) => {
            const selected = worldBoardId === b.id;
            return (
              <Pressable
                key={b.id}
                onPress={() => {
                  setWorldBoardId(b.id);
                  setWorldExpanded(false);
                }}
                style={[
                  styles.worldChip,
                  selected && {
                    backgroundColor: meta.color,
                    borderColor: meta.color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.worldChipText,
                    selected && { color: '#fff' },
                  ]}
                >
                  {b.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {(() => {
          const reward = podiumRewardCard({
            kind:
              worldBoardId === 'country'
                ? { board: 'world', worldId: 'country', scope: 'national' }
                : { board: 'world', worldId: worldBoardId, scope: 'world' },
            yourPlace: activeWorld.yourPlace,
            claimed: ranked.rankingRewardsClaimed,
          });
          if (!reward) return null;
          return (
            <View style={styles.rewardCard}>
              <Text style={styles.rewardEmoji}>{reward.def.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>{reward.def.title}</Text>
                <Text style={styles.rewardSub}>
                  {reward.claimable
                    ? `+${reward.def.xp} XP · réclame ta couronne`
                    : 'Couronne déjà réclamée cette semaine'}
                </Text>
              </View>
              {reward.claimable ? (
                <Pressable
                  style={[styles.rewardBtn, { backgroundColor: meta.color }]}
                  onPress={() =>
                    dispatch({
                      type: 'CLAIM_RANKING_REWARD',
                      rewardId: reward.def.id,
                      xp: reward.def.xp,
                      profileTitle: reward.def.profileTitle,
                      shieldBonus: reward.def.shieldBonus,
                      weekKey: ladderWeekKey(),
                    })
                  }
                >
                  <Text style={styles.rewardBtnText}>Réclamer</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })()}
        <View style={styles.boardHead}>
          <Text style={[styles.section, { marginTop: spacing.sm }]}>
            {worldBoardTitle(worldBoardId, country)}
          </Text>
          <Text style={styles.yourPlaceMuted}>
            {activeWorld.yourPlace > 0
              ? `#${activeWorld.yourPlace}`
              : `${activeWorld.entries.length}`}
          </Text>
        </View>
        <View style={styles.board}>
          {worldRows.map((row, idx) => {
            const prev = worldRows[idx - 1];
            const showGap = prev && row.place > prev.place + 1;
            return (
              <View key={`world-${row.id}-${row.place}`}>
                {showGap ? (
                  <View style={styles.gapRow}>
                    <Text style={styles.gapText}>
                      ··· #{prev!.place + 1} – #{row.place - 1} ···
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => openAthleteProfile(row.username, row.isYou)}
                  style={[
                    styles.row,
                    row.isYou && {
                      backgroundColor: meta.colorSoft,
                      borderColor: meta.color,
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Profil de ${row.displayName}`}
                >
                  <Text style={[styles.place, row.isYou && { color: meta.color }]}>
                    {row.place <= 3
                      ? row.place === 1
                        ? '🥇'
                        : row.place === 2
                          ? '🥈'
                          : '🥉'
                      : row.place}
                  </Text>
                  <View style={styles.rowZoneSpacer} />
                  <ProfileAvatar
                    uri={row.isYou ? avatarUri : undefined}
                    initials={row.displayName.slice(0, 1).toUpperCase()}
                    size={40}
                    borderColor={row.isYou ? meta.color : colors.border}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.rowName, row.isYou && { color: meta.color }]}
                    >
                      {row.displayName}
                      {row.isYou ? ' (toi)' : ''}
                    </Text>
                    <Text style={styles.rowHandle}>
                      {formatUsernameDisplay(row.username)}
                      {row.country ? ` · ${row.country}` : ''}
                      {row.secondary ? ` · ${row.secondary}` : ''}
                    </Text>
                  </View>
                  <View style={styles.xpCol}>
                    <Text style={styles.rowXp}>
                      {row.value.toLocaleString('fr-FR')}
                    </Text>
                    <Text style={styles.rowXpL}>{row.valueLabel}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Pressable
          style={styles.expandBtn}
          onPress={() => setWorldExpanded((v) => !v)}
          accessibilityRole="button"
        >
          <Text style={[styles.expandBtnText, { color: meta.color }]}>
            {worldExpanded
              ? 'Réduire le classement mondial'
              : `Voir plus (${activeWorld.entries.length})`}
          </Text>
        </Pressable>
        </>
        ) : null}

        {section === 'odyssey' ? (
        <>
        <Text style={styles.section}>Odyssées km</Text>
        <View style={styles.worldChips}>
          {(['run', 'bike', 'swim'] as OdysseySport[]).map((s) => {
            const metaO = ODYSSEY_SPORT_META[s];
            const selected = odysseySport === s;
            return (
              <Pressable
                key={s}
                onPress={() => setOdysseySport(s)}
                style={[
                  styles.worldChip,
                  selected && {
                    backgroundColor: meta.color,
                    borderColor: meta.color,
                  },
                ]}
              >
                <Text style={[styles.worldChipText, selected && { color: '#fff' }]}>
                  {metaO.emoji} {metaO.short}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.worldChips}>
          {(
            [
              { id: 'world' as const, label: 'Mondial' },
              { id: 'national' as const, label: `National · ${country || '—'}` },
            ] as const
          ).map((s) => {
            const selected = odysseyScope === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setOdysseyScope(s.id)}
                style={[
                  styles.worldChip,
                  selected && {
                    backgroundColor: meta.color,
                    borderColor: meta.color,
                  },
                ]}
              >
                <Text style={[styles.worldChipText, selected && { color: '#fff' }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.odysseyCard}>
          <View style={styles.odysseyHead}>
            <Text style={styles.odysseyEmoji}>{ODYSSEY_SPORT_META[odysseySport].emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.odysseyTitle}>{ODYSSEY_SPORT_META[odysseySport].title}</Text>
              <Text style={styles.odysseyLevel}>Niveau {kmOdyssey.level}</Text>
            </View>
            <View style={styles.odysseyKmBox}>
              <Text style={styles.odysseyKm}>
                {formatOdysseyDistance(kmOdyssey.totalKm, odysseySport)}
              </Text>
              <Text style={styles.odysseyKmL}>cumul</Text>
            </View>
          </View>
          <Text style={styles.odysseyProgressLabel}>
            {formatOdysseyDistance(kmOdyssey.kmIntoLevel, odysseySport)} /{' '}
            {formatOdysseyDistance(kmOdyssey.kmPerLevel, odysseySport)} → niveau{' '}
            {kmOdyssey.level + 1}
          </Text>
          <View style={styles.odysseyTrack}>
            <View
              style={[
                styles.odysseyFill,
                { width: `${Math.round(kmOdyssey.progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.odysseyRanks}>
            Rang {odysseyScope === 'national' ? 'national' : 'mondial'} #{odysseyYourRank}
            {' · '}
            {ODYSSEY_SPORT_META[odysseySport].unitHint}
            {' · '}+{odysseyXp} XP / niveau
          </Text>
        </View>
        {(() => {
          const reward = podiumRewardCard({
            kind: {
              board: 'odyssey',
              sport: odysseySport,
              scope: odysseyScope,
            },
            yourPlace: odysseyYourRank,
            claimed: ranked.rankingRewardsClaimed,
          });
          if (!reward) return null;
          return (
            <View style={styles.rewardCard}>
              <Text style={styles.rewardEmoji}>{reward.def.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>{reward.def.title}</Text>
                <Text style={styles.rewardSub}>
                  {reward.claimable
                    ? `+${reward.def.xp} XP · #1 de la semaine`
                    : 'Déjà réclamée cette semaine'}
                </Text>
              </View>
              {reward.claimable ? (
                <Pressable
                  style={[styles.rewardBtn, { backgroundColor: meta.color }]}
                  onPress={() =>
                    dispatch({
                      type: 'CLAIM_RANKING_REWARD',
                      rewardId: reward.def.id,
                      xp: reward.def.xp,
                      profileTitle: reward.def.profileTitle,
                      shieldBonus: reward.def.shieldBonus,
                      weekKey: ladderWeekKey(),
                    })
                  }
                >
                  <Text style={styles.rewardBtnText}>Réclamer</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })()}
        <View style={styles.board}>
          {odysseyRows.map((row, idx) => {
            const prev = odysseyRows[idx - 1];
            const showGap = prev && row.place > prev.place + 1;
            return (
              <View key={`ody-${row.id}-${row.place}`}>
                {showGap ? (
                  <View style={styles.gapRow}>
                    <Text style={styles.gapText}>
                      ··· #{prev.place + 1} – #{row.place - 1} ···
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  key={`ody-${row.id}-${row.place}`}
                  onPress={() => openAthleteProfile(row.username, row.isYou)}
                  style={[
                    styles.row,
                    row.isYou && {
                      backgroundColor: meta.colorSoft,
                      borderColor: meta.color,
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Profil de ${row.displayName}`}
                >
                  <Text style={[styles.place, row.isYou && { color: meta.color }]}>
                    {row.place <= 3
                      ? row.place === 1
                        ? '🥇'
                        : row.place === 2
                          ? '🥈'
                          : '🥉'
                      : row.place}
                  </Text>
                  <View style={styles.rowZoneSpacer} />
                  <ProfileAvatar
                    uri={row.isYou ? avatarUri : undefined}
                    initials={row.displayName.slice(0, 1).toUpperCase()}
                    size={40}
                    borderColor={row.isYou ? meta.color : colors.border}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.rowName, row.isYou && { color: meta.color }]}
                    >
                      {row.displayName}
                      {row.isYou ? ' (toi)' : ''}
                    </Text>
                    <Text style={styles.rowHandle}>
                      {formatUsernameDisplay(row.username)}
                      {row.country ? ` · ${row.country}` : ''}
                    </Text>
                  </View>
                  <View style={styles.xpCol}>
                    <Text style={styles.rowXp}>Niv. {row.level}</Text>
                    <Text style={styles.rowXpL}>
                      {formatOdysseyDistance(row.totalKm, odysseySport)}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
        </>
        ) : null}

        <Text style={styles.section}>Badges</Text>
        <View style={styles.badgeSummary}>
          <Text style={styles.badgeSummaryStat}>
            {badgeStats.unlocked} / {badgeStats.total} débloqué
            {badgeStats.unlocked > 1 ? 's' : ''}
          </Text>
          {badgeStats.closest ? (
            <Text style={styles.badgeSummaryNext} numberOfLines={2}>
              Prochain : {badgeStats.closest.emoji} {badgeStats.closest.title} ·{' '}
              {Math.round(badgeStats.closest.progress * 100)} %
            </Text>
          ) : null}
          <Pressable
            style={[styles.badgeBtn, { borderColor: meta.color, backgroundColor: meta.colorSoft }]}
            onPress={() => router.push('/badges')}
            accessibilityRole="button"
            accessibilityLabel="Voir tous les badges"
          >
            <Text style={[styles.badgeBtnText, { color: meta.color }]}>
              Voir tous les badges
            </Text>
            <Text style={styles.badgeBtnChevron}>›</Text>
          </Pressable>
        </View>
      </ContentWrap>
    </AppScrollView>
    </View>
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    scroll: { flex: 1, backgroundColor: 'transparent' },
    sectionTabs: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: 8,
    },
    sectionTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      alignItems: 'center',
    },
    sectionTabText: {
      fontWeight: '800',
      fontSize: 14,
      color: colors.text,
    },
    liveHint: {
      marginHorizontal: spacing.md,
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    rewardCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.bgElevated,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rewardEmoji: { fontSize: 28 },
    rewardTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
    rewardSub: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    rewardBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.md,
    },
    rewardBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    hero: {
      margin: spacing.md,
      borderRadius: radii.lg,
      padding: spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
    },
    heroGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(255,255,255,0.18)',
      top: -60,
      right: -40,
    },
    season: {
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    rankTitle: {
      marginTop: spacing.md,
      fontSize: 28,
      fontWeight: '800',
      color: colors.white,
    },
    rankSub: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.92)',
    },
    rankPreviewHint: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.88)',
    },
    streak: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '700',
      color: colors.white,
    },
    shieldHero: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.95)',
      letterSpacing: 0.2,
    },
    card: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
    xpRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    xpLeft: { fontWeight: '700', color: colors.text, fontSize: 14 },
    xpRight: { fontWeight: '600', color: colors.textMuted, fontSize: 13 },
    track: {
      marginTop: 10,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.bgSecondary,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 7 },
    xpHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    howCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    howTitle: { fontWeight: '800', fontSize: 16, color: colors.text, marginBottom: 8 },
    howLine: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginTop: 4,
    },
    howPremium: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentDark,
      lineHeight: 18,
    },
    howPremiumOn: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '800',
      color: colors.accentDark,
      lineHeight: 18,
    },
    section: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    ladderScrollWrap: {
      marginTop: 2,
    },
    ladderScroll: {
      flexGrow: 0,
      ...(Platform.OS === 'web'
        ? ({
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
          } as object)
        : null),
    },
    ladderRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      paddingRight: spacing.xl,
      alignItems: 'stretch',
    },
    tierChip: {
      flexShrink: 0,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      minWidth: 108,
      gap: 4,
      ...(Platform.OS === 'web'
        ? ({ userSelect: 'none', WebkitUserSelect: 'none' } as object)
        : null),
    },
    tierLabel: { marginTop: 2, fontWeight: '800', fontSize: 13 },
    tierDivision: { marginTop: 0, fontWeight: '900', fontSize: 18, lineHeight: 22 },
    tierYou: {
      marginTop: 2,
      color: colors.white,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    boardHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginRight: spacing.md,
    },
    yourPlace: {
      marginTop: spacing.lg,
      fontWeight: '800',
      color: colors.accent,
      fontSize: 14,
    },
    yourPlaceMuted: {
      marginTop: spacing.lg,
      fontWeight: '700',
      color: colors.textMuted,
      fontSize: 13,
    },
    boardHintOther: {
      marginHorizontal: spacing.md,
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      fontWeight: '600',
    },
    boardHint: {
      marginHorizontal: spacing.md,
      marginTop: 4,
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    odysseyCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    odysseyHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    odysseyEmoji: { fontSize: 36 },
    odysseyTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
    odysseyLevel: {
      marginTop: 2,
      fontWeight: '800',
      fontSize: 22,
      color: colors.accent,
    },
    odysseyKmBox: { alignItems: 'flex-end' },
    odysseyKm: { fontWeight: '800', fontSize: 16, color: colors.text },
    odysseyKmL: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    odysseyProgressLabel: {
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    odysseyTrack: {
      marginTop: 6,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSecondary,
      overflow: 'hidden',
    },
    odysseyFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    odysseyRanks: {
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    zoneCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    zoneCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    zoneCardTitle: {
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    zoneCardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginBottom: 2,
    },
    zoneLane: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: radii.md,
    },
    zoneLaneUp: { backgroundColor: `${colors.success}26` },
    zoneLaneSafe: { backgroundColor: colors.bgSecondary },
    zoneLaneDown: { backgroundColor: `${colors.danger}26` },
    zoneLaneMuted: { backgroundColor: colors.bgSecondary, opacity: 0.85 },
    zoneGlyph: {
      width: 22,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.text,
    },
    zoneLaneTitle: {
      fontWeight: '800',
      fontSize: 13,
      color: colors.text,
    },
    zoneLaneDesc: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    zoneYouMark: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.accentDark,
    },
    ladderOutcomeInline: {
      marginHorizontal: spacing.md,
      marginTop: 6,
      fontSize: 13,
      fontWeight: '700',
      color: colors.accentDark,
    },
    board: {
      marginTop: spacing.sm,
      marginHorizontal: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    gapRow: {
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    gapText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    rowPromote: { backgroundColor: `${colors.success}18` },
    rowRelegate: { backgroundColor: `${colors.danger}18` },
    rowZoneMark: {
      width: 16,
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
    rowZoneMarkHidden: {
      opacity: 0,
    },
    rowZoneUp: { color: colors.success },
    rowZoneDown: { color: colors.danger },
    rowZoneSpacer: {
      width: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    place: {
      width: 28,
      fontWeight: '800',
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontWeight: '800', color: colors.accent },
    rowName: { fontWeight: '700', fontSize: 14, color: colors.text },
    rowHandle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    xpCol: { alignItems: 'flex-end' },
    rowXp: { fontWeight: '800', fontSize: 14, color: colors.text },
    rowXpL: { fontSize: 10, color: colors.textMuted },
    badgeSummary: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    badgeSummaryStat: {
      fontWeight: '800',
      fontSize: 15,
      color: colors.text,
    },
    badgeSummaryNext: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    badgeBtn: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
    },
    badgeBtnText: {
      fontWeight: '800',
      fontSize: 14,
    },
    badgeBtnChevron: {
      fontSize: 22,
      fontWeight: '300',
      color: colors.textMuted,
    },
    expandBtn: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    expandBtnText: {
      fontWeight: '800',
      fontSize: 14,
    },
    worldChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    worldChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    worldChipText: {
      fontWeight: '700',
      fontSize: 13,
      color: colors.text,
    },
  });
}
