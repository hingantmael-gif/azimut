import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
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
  SoftPulse,
  StaticFillBar,
} from '../../src/ui/motion/softMotion';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { formatMinutes } from '../../src/engines/core';
import { AppScrollView } from '../../src/ui/scrolling';
import { getWatchEntry } from '../../src/constants/watches';

const TICK_MS = 15_000;

/** Liste musculaire — récupération recalculée en continu (progression horaire) */
export default function BodyScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <FadeInUp>
        <View style={styles.digest}>
          <SoftPulse intensity={0.04}>
            <Text style={styles.digestScore}>{digest.readiness.score}%</Text>
          </SoftPulse>
          <View style={{ flex: 1 }}>
            <Text style={styles.digestLabel}>{digest.readiness.label}</Text>
            <Text style={styles.digestSummary}>{digest.readiness.summary}</Text>
            <View style={styles.digestBar}>
              <AnimatedFillBar
                ratio={digest.readiness.score / 100}
                color={colors.accent}
                trackColor={colors.bg}
                height={7}
              />
            </View>
          </View>
        </View>
      </FadeInUp>

      <FadeInUp delay={60}>
        <View style={styles.sleepCard}>
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
          <Pressable style={styles.sleepBtn} onPress={() => router.push('/sleep')}>
            <Text style={styles.sleepBtnText}>
              {watch
                ? sleep
                  ? 'Voir / importer manuellement'
                  : 'Importer manuellement'
                : 'Configurer le sommeil'}
            </Text>
          </Pressable>
          <Text style={styles.sleepFoot}>
            Choisis ta montre une fois, puis saisis le score et la durée affichés dessus.
          </Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={80}>
        <View style={styles.listBlock}>
          {sortedMuscles.map((muscle, i) => (
            <FadeInUp key={muscle.id} delay={Math.min(i * 35, 420)}>
              <MuscleListRow
                muscle={muscle}
                expanded={expandedId === muscle.id}
                onToggle={() =>
                  setExpandedId(expandedId === muscle.id ? null : muscle.id)
                }
                colors={colors}
              />
            </FadeInUp>
          ))}
        </View>
      </FadeInUp>
    </AppScrollView>
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
}: {
  muscle: MuscleGroupState;
  expanded: boolean;
  onToggle: () => void;
  colors: ColorPalette;
}) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const barColor = colorForRecoveryPct(muscle.recoveryPct);

  return (
    <View style={styles.muscleCard}>
      <Pressable onPress={onToggle} style={styles.muscleRow}>
        <BreathingDot color={barColor} size={10} />
        <View style={styles.muscleMain}>
          <Text style={styles.muscleName}>{muscle.label}</Text>
          <Text style={styles.muscleMeta}>{muscleReadyMeta(muscle)}</Text>
          <View style={styles.muscleBar}>
            <StaticFillBar
              ratio={muscle.recoveryPct / 100}
              color={barColor}
              trackColor={colors.bgSecondary}
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

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    digest: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
    },
    digestScore: { fontSize: 36, fontWeight: '800', color: colors.accent },
    digestLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
    digestSummary: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
    digestBar: { marginTop: 8 },
    sleepCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
    },
    sleepHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sleepTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    sleepSource: { fontSize: 13, fontWeight: '600', color: colors.sleep },
    sleepScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sleepScore: { fontSize: 42, fontWeight: '800' },
    sleepScoreLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    sleepDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    sleepEmpty: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
    sleepBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.sleep,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    sleepBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    sleepFoot: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    listBlock: { marginTop: spacing.md, marginHorizontal: spacing.md, gap: spacing.sm },
    muscleCard: {
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    muscleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    muscleMain: { flex: 1, minWidth: 0 },
    muscleName: { fontSize: 15, fontWeight: '600', color: colors.text },
    muscleMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    muscleBar: { marginTop: 6, width: '100%', alignSelf: 'stretch' },
    chevron: { fontSize: 18, color: colors.textMuted, width: 18, textAlign: 'center' },
    detailPad: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  });
}
