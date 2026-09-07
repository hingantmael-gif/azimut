import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MuscleGroupState } from '../../engines/muscleRecovery';
import {
  colorForRecoveryPct,
  formatRecoveryEta,
  MUSCLE_RECOVERY_META,
  recoveryGradientStops,
} from '../../engines/muscleRecovery';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

const LOAD_LABELS: Record<string, string> = {
  normal: 'Volume normal',
  moderate: 'Volume modéré',
  light: 'Séance légère',
  rest: 'Repos actif',
};

type Props = {
  muscle: MuscleGroupState;
};

/** Détail récupération d'un muscle (métriques, badge, barre, conseil) */
export function MuscleRecoveryDetail({ muscle }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const gradientStops = recoveryGradientStops();

  return (
    <View style={styles.wrap}>
      <View style={styles.metrics}>
        <View style={styles.metricBox}>
          <Text style={styles.metricN}>{muscle.recoveryPct}%</Text>
          <Text style={styles.metricL}>Récupération</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricN}>
            {muscle.minutesToFresh > 0
              ? formatRecoveryEta(muscle.minutesToFresh / 60)
              : '—'}
          </Text>
          <Text style={styles.metricL}>Avant fraîcheur</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricN}>{LOAD_LABELS[muscle.trainingLoad]}</Text>
          <Text style={styles.metricL}>Charge conseillée</Text>
        </View>
      </View>
      <View
        style={[styles.badge, { backgroundColor: MUSCLE_RECOVERY_META[muscle.level].color }]}
      >
        <Text style={styles.badgeText}>{MUSCLE_RECOVERY_META[muscle.level].label}</Text>
      </View>
      <View style={styles.recoveryBarWrap}>
        <View style={styles.recoveryBar}>
          {gradientStops.map((c) => (
            <View key={c} style={[styles.recoveryBarSeg, { backgroundColor: c }]} />
          ))}
          <View
            style={[
              styles.recoveryMarker,
              { left: `${Math.max(0, Math.min(100, muscle.recoveryPctExact))}%` },
            ]}
          />
        </View>
        <View style={styles.recoveryBarLabels}>
          <Text style={styles.recoveryBarTick}>Surcharge</Text>
          <Text style={[styles.recoveryBarValue, { color: colorForRecoveryPct(muscle.recoveryPct) }]}>
            {muscle.recoveryPct}% récupéré
          </Text>
          <Text style={styles.recoveryBarTick}>Fraîcheur</Text>
        </View>
      </View>
      <Text style={styles.hint}>{muscle.recommendation}</Text>
      {muscle.analysisDetail ? (
        <Text style={styles.analysis}>{muscle.analysisDetail}</Text>
      ) : null}
      {muscle.restHoursRecommended != null && muscle.restHoursRecommended > 0 ? (
        <Text style={styles.rest}>
          Repos ciblé recommandé : ~{muscle.restHoursRecommended} h avant une charge élevée sur ce
          groupe.
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: { paddingTop: spacing.sm },
    metrics: { flexDirection: 'row', gap: spacing.sm },
    metricBox: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      padding: spacing.sm,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    metricN: { fontWeight: '800', color: colors.text, fontSize: 13, textAlign: 'center' },
    metricL: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radii.pill,
      marginTop: spacing.md,
    },
    badgeText: { color: colors.white, fontWeight: '700', fontSize: 12 },
    recoveryBarWrap: { marginTop: spacing.md },
    recoveryBar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      position: 'relative',
    },
    recoveryBarSeg: { flex: 1 },
    recoveryMarker: {
      position: 'absolute',
      top: -2,
      width: 4,
      height: 14,
      marginLeft: -2,
      backgroundColor: colors.text,
      borderRadius: 2,
    },
    recoveryBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    recoveryBarTick: { fontSize: 10, color: colors.textMuted },
    recoveryBarValue: { fontSize: 12, fontWeight: '800' },
    hint: { color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20, fontSize: 14 },
    analysis: {
      color: colors.text,
      marginTop: spacing.sm,
      lineHeight: 19,
      fontSize: 13,
      fontWeight: '600',
    },
    rest: {
      color: colors.accentDark,
      marginTop: 6,
      lineHeight: 18,
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
