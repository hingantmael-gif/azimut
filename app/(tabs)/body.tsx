import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp, resolveDigitalTwin } from '../../src/store/AppContext';
import {
  bodyAnalysisDigest,
  colorForRecoveryPct,
  computeMuscleStatesPersonalized,
  formatRecoveryEta,
  sortMusclesBySolicitation,
  type MuscleGroupId,
  type MuscleGroupState,
} from '../../src/engines/muscleRecovery';
import {
  estimateSlidingVmaKmh,
  personalizedZonesBadge,
} from '../../src/engines/slidingVma';
import { estimateCriticalPowerFromActivities } from '../../src/engines/criticalPower';
import { computeAthleteLoadSnapshot } from '../../src/engines/athleteLoadBridge';
import { formatVmaKmh } from '../../src/engines/athleteProfile';
import {
  formatRankLabel,
  normalizeTier,
  xpProgressInLevel,
} from '../../src/engines/rankedLadder';
import {
  PLAN_MATCH_TITLE,
  planMatchDetailLines,
  planMatchExplanation,
  planMatchHeadline,
} from '../../src/engines/compliancePresentation';
import { MuscleRecoveryDetail } from '../../src/ui/body/MuscleRecoveryDetail';
import {
  AnimatedFillBar,
  BreathingDot,
  FadeInUp,
  PressableScale,
  RevealPanel,
  SectionHeader,
  SoftPulse,
} from '../../src/ui/motion/softMotion';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatMinutes } from '../../src/engines/core';
import { AppScrollView } from '../../src/ui/scrolling';
import { getWatchEntry } from '../../src/constants/watches';
const TICK_MS = 15_000;

type ProgressTab = 'recuperation' | 'performance' | 'classement';

const SEGMENTS: { id: ProgressTab; label: string }[] = [
  { id: 'recuperation', label: 'Récupération' },
  { id: 'performance', label: 'Performance' },
  { id: 'classement', label: 'Classement' },
];

function normalizeProgressTab(raw: string | string[] | undefined): ProgressTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const key = (value ?? '').trim().toLowerCase();
  // Anciens liens Accueil : tab=performance | tab=classement
  if (key === 'performance' || key === 'analyse' || key === 'forme') return 'performance';
  if (key === 'classement' || key === 'ranked' || key === 'xp') return 'classement';
  if (key === 'recuperation' || key === 'recup' || key === 'corps' || key === 'body') {
    return 'recuperation';
  }
  return 'recuperation';
}

function ReadinessRing({
  score,
  color,
  track,
}: {
  score: number;
  color: string;
  track: string;
}) {
  const size = 92;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <SoftPulse intensity={0.045}>
        <Text style={{ fontSize: 26, fontWeight: '900', color }}>{score}%</Text>
      </SoftPulse>
    </View>
  );
}

/** Onglet Progrès — récupération · performance · classement */
export default function BodyScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string | string[] }>();
  const activeTab = normalizeProgressTab(tabParam);
  const { colors, isDark } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [expandedId, setExpandedId] = useState<MuscleGroupId | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const bumpNow = useCallback(() => setNowMs(Date.now()), []);

  useEffect(() => {
    bumpNow();
    const id = setInterval(bumpNow, TICK_MS);
    return () => clearInterval(id);
  }, [bumpNow]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') bumpNow();
    });
    return () => sub.remove();
  }, [bumpNow]);

  const setTab = useCallback(
    (next: ProgressTab) => {
      router.setParams({ tab: next });
    },
    [router],
  );

  const input = useMemo(
    () => ({
      activities: state.activities,
      feedbacks: state.feedbacks,
      plan: state.plan,
      onboarding: state.profile.onboarding,
    }),
    [state.activities, state.feedbacks, state.plan, state.profile.onboarding],
  );

  const twin = useMemo(() => resolveDigitalTwin(state), [
    state.profile.digitalTwin,
    state.profile.onboarding,
    state.profile.birthDate,
  ]);

  const sortedMuscles = useMemo(
    () =>
      sortMusclesBySolicitation(
        computeMuscleStatesPersonalized(
          input,
          nowMs,
          twin.response.recoveryRateMuscle as Partial<Record<MuscleGroupId, number>>,
        ),
      ),
    [input, nowMs, twin.response.recoveryRateMuscle],
  );

  const digest = useMemo(() => bodyAnalysisDigest(input, nowMs), [input, nowMs]);

  const loadSnap = useMemo(
    () =>
      computeAthleteLoadSnapshot({
        formTsb: state.banister.formTsb,
        health: state.health,
        activities: state.activities,
        feedbacks: state.feedbacks,
        plan: state.plan,
        onboarding: state.profile.onboarding,
        twin,
      }),
    [
      state.banister.formTsb,
      state.health,
      state.activities,
      state.feedbacks,
      state.plan,
      state.profile.onboarding,
      twin,
    ],
  );
  const readiness = loadSnap.readiness;
  const sentinel = loadSnap.sentinel;
  const slidingVma = useMemo(() => {
    const hasRun = state.activities.some((a) => !a.sport || a.sport === 'run');
    if (!hasRun) return null;
    return estimateSlidingVmaKmh(
      state.activities,
      state.profile.onboarding?.vmaKmh,
    );
  }, [state.activities, state.profile.onboarding?.vmaKmh]);

  const criticalPower = useMemo(
    () => estimateCriticalPowerFromActivities(state.activities),
    [state.activities],
  );

  const zonesBadge = personalizedZonesBadge(readiness.total);

  const watch = state.profile.watch;
  const sleep = state.health.sleep;
  const watchLabel = watch?.brandId ? getWatchEntry(watch.brandId).label : null;
  const readyCount = sortedMuscles.filter((m) => m.recoveryPct >= 90).length;

  const last = state.analyses[0];
  const ranked = state.profile.ranked;
  const tier = normalizeTier(ranked.tier);
  const division = ranked.division !== undefined ? ranked.division : 3;
  const xpBar = xpProgressInLevel(ranked.xp);
  const calibPct = Math.round(twin.modelConfidence * 100);

  return (
    <View style={styles.root}>
      <ScreenAtmosphere intensity={1} />
      <AppScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
        <FadeInUp>
          <View style={styles.segmentRow}>
            {SEGMENTS.map((seg) => {
              const selected = activeTab === seg.id;
              return (
                <PressableScale
                  key={seg.id}
                  variant="subtle"
                  onPress={() => setTab(seg.id)}
                  style={[styles.segmentPill, selected && styles.segmentPillOn]}
                  accessibilityRole="tab"
                  accessibilityLabel={seg.label}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>
                    {seg.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </FadeInUp>

        {activeTab === 'recuperation' ? (
          <>
            <FadeInUp delay={20}>
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Récupération</Text>
                <Text style={styles.heroSub}>
                  {readyCount}/{sortedMuscles.length} prêts
                </Text>
              </View>
            </FadeInUp>

            <FadeInUp delay={40}>
              <View style={styles.digest}>
                <ReadinessRing
                  score={digest.readiness.score}
                  color={colors.accent}
                  track={isDark ? 'rgba(61,255,154,0.15)' : 'rgba(14,143,111,0.15)'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.digestLabel}>{digest.readiness.label}</Text>
                  <View style={styles.digestBar}>
                    <AnimatedFillBar
                      ratio={digest.readiness.score / 100}
                      color={colors.accent}
                      trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'}
                      height={7}
                    />
                  </View>
                </View>
              </View>
            </FadeInUp>

            <FadeInUp delay={80}>
              <View style={styles.sleepCard}>
                <View style={styles.sleepGlow} pointerEvents="none" />
                <View style={styles.sleepHead}>
                  <Text style={styles.sleepTitle}>Sommeil</Text>
                  {watchLabel ? <Text style={styles.sleepSource}>{watchLabel}</Text> : null}
                </View>
                {sleep ? (
                  <View style={styles.sleepScoreRow}>
                    <Text style={[styles.sleepScore, { color: colors.sleep }]}>{sleep.score}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sleepScoreLabel}>Score</Text>
                      <Text style={styles.sleepDate}>
                        {new Date(sleep.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                        {sleep.totalMinutes > 0 ? ` · ${formatMinutes(sleep.totalMinutes)}` : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.sleepEmpty}>
                    {watch ? 'Pas encore saisi' : 'Configurer la montre'}
                  </Text>
                )}
                <PressableScale onPress={() => router.push('/sleep')}>
                  <View style={styles.sleepBtn}>
                    <Text style={styles.sleepBtnText}>
                      {watch ? (sleep ? 'Modifier' : 'Saisir') : 'Configurer'}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </FadeInUp>

            <SectionHeader title="Muscles" accentColor={colors.accent} delay={110} />

            <FadeInUp delay={130}>
              <View style={styles.listBlock}>
                {sortedMuscles.map((muscle, i) => (
                  <FadeInUp key={muscle.id} delay={Math.min(i * 30, 360)}>
                    <MuscleListRow
                      muscle={muscle}
                      expanded={expandedId === muscle.id}
                      onToggle={() =>
                        setExpandedId(expandedId === muscle.id ? null : muscle.id)
                      }
                      colors={colors}
                      isDark={isDark}
                    />
                  </FadeInUp>
                ))}
              </View>
            </FadeInUp>
          </>
        ) : null}

        {activeTab === 'performance' ? (
          <>
            <FadeInUp delay={20}>
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Progrès</Text>
                <Text style={styles.heroSub}>
                  Readiness, calibration et charge personnalisées
                </Text>
              </View>
            </FadeInUp>

            <FadeInUp delay={35}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Readiness</Text>
                <Text style={styles.cardHighlight}>{readiness.total}%</Text>
                <Text style={styles.cardMuted}>{readiness.dominantWhy}</Text>
                {zonesBadge ? (
                  <Text style={styles.badgeSoft}>{zonesBadge}</Text>
                ) : null}
                {readiness.components.map((c) => (
                  <View key={c.id} style={styles.compRow}>
                    <Text style={styles.compLabel}>{c.label}</Text>
                    <View style={styles.compBar}>
                      <AnimatedFillBar
                        ratio={c.score / 100}
                        color={colors.accent}
                        trackColor={
                          isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'
                        }
                        height={5}
                      />
                    </View>
                    <Text style={styles.compPct}>{Math.round(c.score)}</Text>
                  </View>
                ))}
              </View>
            </FadeInUp>

            <FadeInUp delay={50}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Calibration coach</Text>
                <Text style={styles.cardLine}>{calibPct}%</Text>
                <Text style={styles.cardMuted}>
                  {twin.response.calibrationSessions} séance(s) · τ fitness{' '}
                  {twin.response.tauFitnessDays.toFixed(0)} j · τ fatigue{' '}
                  {twin.response.tauFatigueDays.toFixed(0)} j
                </Text>
                <View style={styles.xpTrack}>
                  <AnimatedFillBar
                    ratio={twin.modelConfidence}
                    color={colors.accent}
                    trackColor={
                      isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'
                    }
                    height={7}
                  />
                </View>
              </View>
            </FadeInUp>

            <FadeInUp delay={55}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sentinelle</Text>
                <Text style={styles.cardHighlight}>
                  {sentinel.level === 'ok'
                    ? 'OK'
                    : sentinel.level === 'watch'
                      ? 'À surveiller'
                      : sentinel.level === 'adapt'
                        ? 'Adapter'
                        : 'Alléger'}
                </Text>
                <Text style={styles.cardMuted}>{sentinel.message}</Text>
                {sentinel.reasons.slice(0, 2).map((r) => (
                  <Text key={r} style={styles.cardMuted}>
                    · {r}
                  </Text>
                ))}
              </View>
            </FadeInUp>

            {slidingVma ? (
              <FadeInUp delay={60}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>VMA glissante</Text>
                  <Text style={styles.cardHighlight}>
                    {formatVmaKmh(slidingVma.vmaKmh)} km/h
                  </Text>
                  <Text style={styles.cardMuted}>
                    {slidingVma.source} · confiance{' '}
                    {Math.round(slidingVma.confidence * 100)} %
                  </Text>
                  {zonesBadge ? (
                    <Text style={styles.badgeSoft}>{zonesBadge}</Text>
                  ) : null}
                </View>
              </FadeInUp>
            ) : null}

            {criticalPower ? (
              <FadeInUp delay={65}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Critical Power</Text>
                  <Text style={styles.cardHighlight}>{criticalPower.cp} W</Text>
                  <Text style={styles.cardMuted}>
                    W′ {Math.round(criticalPower.wPrime / 1000)} kJ
                    {criticalPower.profile !== 'unknown'
                      ? ` · profil ${criticalPower.profile}`
                      : ''}
                  </Text>
                </View>
              </FadeInUp>
            ) : null}

            <FadeInUp delay={70}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Charge (Banister)</Text>
                <Text style={styles.cardLine}>
                  Fitness : {state.banister.fitness.toFixed(1)}
                </Text>
                <Text style={styles.cardLine}>
                  Fatigue : {state.banister.fatigue.toFixed(1)}
                </Text>
                <Text style={styles.cardLine}>
                  Forme / TSB : {state.banister.formTsb.toFixed(1)}
                </Text>
              </View>
            </FadeInUp>

            <FadeInUp delay={85}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{PLAN_MATCH_TITLE}</Text>
                {last ? (
                  <>
                    <Text style={styles.cardLine}>
                      {last.compliance.total}% — {planMatchHeadline(last.compliance.total)}
                    </Text>
                    <Text style={styles.cardMuted}>{planMatchExplanation(last.compliance)}</Text>
                    {planMatchDetailLines(last.compliance).map((line) => (
                      <Text key={line.label} style={styles.cardMuted}>
                        {line.label} : {line.pct}% — {line.hint}
                      </Text>
                    ))}
                  </>
                ) : (
                  <Text style={styles.cardMuted}>
                    Importez une activité (Strava ou simulation) pour comparer au plan.
                  </Text>
                )}
              </View>
            </FadeInUp>

            <FadeInUp delay={100}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Profil sportif</Text>
                <Text style={styles.cardLine}>
                  Volume :{' '}
                  {state.profile.onboarding?.weeklyKmAvg
                    ? `${state.profile.onboarding.weeklyKmAvg} km/sem`
                    : 'Non renseigné'}
                </Text>
                <PressableScale
                  onPress={() => router.push('/settings/athlete-profile')}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>Mettre à jour le profil</Text>
                </PressableScale>
              </View>
            </FadeInUp>

            <FadeInUp delay={130}>
              <View style={styles.toolsBlock}>
                <Text style={styles.cardTitle}>Outils</Text>
                {(
                  [
                    { label: 'Prédiction temps de course', href: '/race-predictor' },
                    { label: 'Nutrition & hydratation', href: '/nutrition' },
                    { label: 'Multi-sport / triathlon', href: '/multisport' },
                    { label: 'Récupération & mobilité', href: '/recovery' },
                    { label: 'Sécurité & alertes', href: '/safety' },
                  ] as const
                ).map((tool) => (
                  <PressableScale
                    key={tool.href}
                    onPress={() => router.push(tool.href)}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkBtnText}>{tool.label}</Text>
                  </PressableScale>
                ))}
              </View>
            </FadeInUp>
          </>
        ) : null}

        {activeTab === 'classement' ? (
          <>
            <FadeInUp delay={20}>
              <View style={styles.hero}>
                <Text style={styles.heroTitle}>Progrès</Text>
                <Text style={styles.heroSub}>Classement, XP et badges</Text>
              </View>
            </FadeInUp>

            <FadeInUp delay={40}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Classement</Text>
                <Text style={styles.cardHighlight}>
                  {formatRankLabel(tier, division)}
                </Text>
                <Text style={styles.cardLine}>
                  Niveau {ranked.level} · {ranked.xp.toLocaleString('fr-FR')} XP
                </Text>
                <Text style={styles.cardMuted}>
                  Progression niveau : {xpBar.xpIntoLevel}/{xpBar.xpForNext} XP
                </Text>
                <Text style={styles.cardLine}>
                  Série : {ranked.streakWeeks} semaine(s)
                </Text>
                <View style={styles.xpTrack}>
                  <AnimatedFillBar
                    ratio={
                      xpBar.xpForNext > 0
                        ? Math.min(1, xpBar.xpIntoLevel / xpBar.xpForNext)
                        : 0
                    }
                    color={colors.accent}
                    trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'}
                    height={7}
                  />
                </View>
                <PressableScale onPress={() => router.push('/ranked')} style={styles.linkBtn}>
                  <Text style={styles.linkBtnText}>Voir le classement</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => router.push('/badges')}
                  style={[styles.linkBtn, styles.linkBtnSecondary]}
                >
                  <Text style={[styles.linkBtnText, styles.linkBtnSecondaryText]}>
                    Voir les badges
                  </Text>
                </PressableScale>
              </View>
            </FadeInUp>
          </>
        ) : null}
      </AppScrollView>
    </View>
  );
}

function muscleReadyMeta(muscle: MuscleGroupState): string | null {
  if (muscle.hoursToFresh <= 0 || muscle.recoveryPct >= 100) return null;
  return `Prêt dans ${formatRecoveryEta(muscle.hoursToFresh)}`;
}

function MuscleListRow({
  muscle,
  expanded,
  onToggle,
  colors,
  isDark,
}: {
  muscle: MuscleGroupState;
  expanded: boolean;
  onToggle: () => void;
  colors: ColorPalette;
  isDark: boolean;
}) {
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const barColor = colorForRecoveryPct(muscle.recoveryPct);
  const meta = muscleReadyMeta(muscle);

  return (
    <View style={[styles.muscleCard, { borderLeftColor: barColor }]}>
      <Pressable onPress={onToggle} style={styles.muscleRow}>
        <BreathingDot color={barColor} size={10} />
        <View style={styles.muscleMain}>
          <View style={styles.muscleTitleRow}>
            <Text style={styles.muscleName}>{muscle.label}</Text>
            <View style={[styles.pctPill, { backgroundColor: `${barColor}22` }]}>
              <Text style={[styles.pctPillText, { color: barColor }]}>{muscle.recoveryPct}%</Text>
            </View>
          </View>
          {meta ? <Text style={styles.muscleMeta}>{meta}</Text> : null}
          <View style={styles.muscleBar}>
            {/* Récup rapide → anim courte ; lente → plus longue (audit §4.1) */}
            <AnimatedFillBar
              ratio={muscle.recoveryPct / 100}
              color={barColor}
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'}
              height={5}
              durationMs={
                muscle.hoursToFresh <= 12
                  ? 420
                  : muscle.hoursToFresh <= 36
                    ? 720
                    : 1100
              }
            />
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '›'}</Text>
      </Pressable>
      {expanded ? (
        <RevealPanel
          key={muscle.id}
          resetKey={muscle.id}
          duration={1050}
          style={styles.detailPad}
        >
          <MuscleRecoveryDetail muscle={muscle} />
        </RevealPanel>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorPalette, isDark: boolean) {
  const glass = isDark ? 'rgba(18,32,51,0.78)' : 'rgba(255,255,255,0.72)';
  const glassBorder = isDark ? 'rgba(61,255,154,0.14)' : 'rgba(14,143,111,0.18)';

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    scroll: { flex: 1, backgroundColor: 'transparent' },
    segmentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    segmentPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,26,22,0.1)',
    },
    segmentPillOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
    },
    segmentTextOn: {
      color: '#fff',
    },
    hero: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    heroEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.accent,
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
    },
    heroSub: {
      marginTop: 4,
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    digest: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: glassBorder,
    },
    digestLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
    digestSummary: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
    digestBar: { marginTop: 10 },
    sleepCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.28)' : 'rgba(37,99,235,0.18)',
      overflow: 'hidden',
    },
    sleepGlow: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.sleep,
      opacity: isDark ? 0.12 : 0.08,
      top: -50,
      right: -40,
    },
    sleepHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sleepTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    sleepSource: { fontSize: 13, fontWeight: '700', color: colors.sleep },
    sleepScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sleepScore: { fontSize: 42, fontWeight: '900' },
    sleepScoreLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    sleepDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    sleepEmpty: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    sleepBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.sleep,
      borderRadius: radii.md,
      paddingVertical: 13,
      alignItems: 'center',
    },
    sleepBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    sleepFoot: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    card: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: glassBorder,
      gap: 6,
    },
    toolsBlock: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: glass,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: glassBorder,
      gap: 4,
    },
    cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
    cardHighlight: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.accent,
      letterSpacing: -0.3,
    },
    cardLine: { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 22 },
    cardMuted: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
    badgeSoft: {
      marginTop: 8,
      alignSelf: 'flex-start',
      fontSize: 11,
      fontWeight: '800',
      color: colors.accentDark,
      backgroundColor: isDark ? 'rgba(61,255,154,0.12)' : 'rgba(14,143,111,0.12)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    compRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    compLabel: {
      width: 118,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    compBar: { flex: 1 },
    compPct: {
      width: 28,
      textAlign: 'right',
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
    },
    xpTrack: { marginTop: 8, marginBottom: 4 },
    linkBtn: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 13,
      alignItems: 'center',
    },
    linkBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    linkBtnSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: glassBorder,
    },
    linkBtnSecondaryText: { color: colors.text },
    listBlock: { marginTop: spacing.sm, marginHorizontal: spacing.md, gap: spacing.sm },
    muscleCard: {
      backgroundColor: glass,
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: glassBorder,
      borderLeftWidth: 4,
    },
    muscleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    muscleMain: { flex: 1, minWidth: 0 },
    muscleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    muscleName: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
    pctPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    pctPillText: { fontSize: 11, fontWeight: '800' },
    muscleMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
    muscleBar: { marginTop: 7, width: '100%', alignSelf: 'stretch' },
    chevron: { fontSize: 18, color: colors.textMuted, width: 18, textAlign: 'center' },
    detailPad: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  });
}
