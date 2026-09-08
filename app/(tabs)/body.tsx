import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  bodyAnalysisDigest,
  colorForRecoveryPct,
  computeMuscleStates,
  formatRecoveryEta,
  sortMusclesBySolicitation,
  type MuscleGroupId,
  type MuscleGroupState,
} from '../../src/engines/muscleRecovery';
import { MuscleRecoveryDetail } from '../../src/ui/body/MuscleRecoveryDetail';
import {
  AnimatedFillBar,
  BreathingDot,
  FadeInUp,
  PressableScale,
  SectionHeader,
  SoftPulse,
  StaticFillBar,
} from '../../src/ui/motion/softMotion';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatMinutes } from '../../src/engines/core';
import { AppScrollView } from '../../src/ui/scrolling';
import { getWatchEntry } from '../../src/constants/watches';

const TICK_MS = 15_000;

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

/** Liste musculaire — récupération recalculée en continu */
export default function BodyScreen() {
  const { state } = useApp();
  const router = useRouter();
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

  const input = useMemo(
    () => ({
      activities: state.activities,
      feedbacks: state.feedbacks,
      plan: state.plan,
      onboarding: state.profile.onboarding,
    }),
    [state.activities, state.feedbacks, state.plan, state.profile.onboarding],
  );

  const sortedMuscles = useMemo(
    () => sortMusclesBySolicitation(computeMuscleStates(input, nowMs)),
    [input, nowMs],
  );

  const digest = useMemo(() => bodyAnalysisDigest(input, nowMs), [input, nowMs]);

  const watch = state.profile.watch;
  const sleep = state.health.sleep;
  const watchLabel = watch?.brandId ? getWatchEntry(watch.brandId).label : null;
  const readyCount = sortedMuscles.filter((m) => m.recoveryPct >= 90).length;

  return (
    <View style={styles.root}>
      <ScreenAtmosphere intensity={1} />
      <AppScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
        <FadeInUp>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>Corps · récupération</Text>
            <Text style={styles.heroTitle}>Écoute ton corps</Text>
            <Text style={styles.heroSub}>
              Indice live · {readyCount}/{sortedMuscles.length} groupes prêts
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
              <Text style={styles.digestSummary}>{digest.readiness.summary}</Text>
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
              <>
                <View style={styles.sleepScoreRow}>
                  <Text style={[styles.sleepScore, { color: colors.sleep }]}>{sleep.score}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sleepScoreLabel}>Score nuit</Text>
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
                {sleep.totalMinutes > 0 ? (
                  <Text style={styles.sleepEmpty}>
                    Durée : {formatMinutes(sleep.totalMinutes)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.sleepEmpty}>
                {watch
                  ? 'Aucune nuit saisie. Importe manuellement ton score et ta durée.'
                  : 'Choisis ta montre puis saisis ton score sommeil manuellement.'}
              </Text>
            )}
            <PressableScale onPress={() => router.push('/sleep')}>
              <View style={styles.sleepBtn}>
                <Text style={styles.sleepBtnText}>
                  {watch
                    ? sleep
                      ? 'Voir / importer manuellement'
                      : 'Importer manuellement'
                    : 'Configurer le sommeil'}
                </Text>
              </View>
            </PressableScale>
            <Text style={styles.sleepFoot}>
              Choisis ta montre une fois, puis saisis le score et la durée affichés dessus.
            </Text>
          </View>
        </FadeInUp>

        <SectionHeader
          title="Groupes musculaires"
          subtitle="Touche une ligne pour le détail · couleur = fraîcheur"
          accentColor={colors.accent}
          delay={110}
        />

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
      </AppScrollView>
    </View>
  );
}

function muscleReadyMeta(muscle: MuscleGroupState): string {
  if (muscle.hoursToFresh <= 0 || muscle.recoveryPct >= 100) {
    return `${muscle.recoveryPct}% · prêt`;
  }
  return `${muscle.recoveryPct}% · prêt dans ${formatRecoveryEta(muscle.hoursToFresh)}`;
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
          <Text style={styles.muscleMeta}>{muscleReadyMeta(muscle)}</Text>
          <View style={styles.muscleBar}>
            <StaticFillBar
              ratio={muscle.recoveryPct / 100}
              color={barColor}
              trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,26,22,0.08)'}
              height={5}
            />
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '›'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.detailPad}>
          <MuscleRecoveryDetail muscle={muscle} />
        </View>
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
