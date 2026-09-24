import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
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
import { StaggerIn } from '../motion/softMotion';

const LOAD_LABELS: Record<string, string> = {
  normal: 'Normal',
  moderate: 'Modéré',
  light: 'Léger',
  rest: 'Repos',
};

type Props = {
  muscle: MuscleGroupState;
};

/** Détail récupération — métriques compactes, sans pavés de texte. */
export function MuscleRecoveryDetail({ muscle }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const gradientStops = recoveryGradientStops();

  return (
    <View style={styles.wrap}>
      <StaggerIn index={0} baseDelay={40} step={90} duration={700}>
        <View style={styles.metrics}>
          <View style={styles.metricBox}>
            <Text style={styles.metricN}>{muscle.recoveryPct}%</Text>
            <Text style={styles.metricL}>Récup.</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricN}>
              {muscle.minutesToFresh > 0
                ? formatRecoveryEta(muscle.minutesToFresh / 60)
                : '—'}
            </Text>
            <Text style={styles.metricL}>Délai</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricN}>{LOAD_LABELS[muscle.trainingLoad]}</Text>
            <Text style={styles.metricL}>Charge</Text>
          </View>
        </View>
      </StaggerIn>
      <StaggerIn index={1} baseDelay={40} step={90} duration={720}>
        <View
          style={[styles.badge, { backgroundColor: MUSCLE_RECOVERY_META[muscle.level].color }]}
        >
          <Text style={styles.badgeText}>{MUSCLE_RECOVERY_META[muscle.level].label}</Text>
        </View>
      </StaggerIn>
      <StaggerIn index={2} baseDelay={40} step={90} duration={740}>
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
            <Text style={styles.recoveryBarTick}>Fatigué</Text>
            <Text
              style={[styles.recoveryBarValue, { color: colorForRecoveryPct(muscle.recoveryPct) }]}
            >
              {muscle.recoveryPct}%
            </Text>
            <Text style={styles.recoveryBarTick}>Frais</Text>
          </View>
        </View>
      </StaggerIn>
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
      paddingVertical: 6,
      borderRadius: radii.pill,
      marginTop: spacing.sm,
    },
    badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    recoveryBarWrap: { marginTop: spacing.md },
    recoveryBar: {
      height: 10,
      borderRadius: 5,
      flexDirection: 'row',
      overflow: 'hidden',
      position: 'relative',
    },
    recoveryBarSeg: { flex: 1 },
    recoveryMarker: {
      position: 'absolute',
      top: -3,
      width: 4,
      height: 16,
      marginLeft: -2,
      borderRadius: 2,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.2)',
    },
    recoveryBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
      alignItems: 'center',
    },
    recoveryBarTick: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
    recoveryBarValue: { fontSize: 12, fontWeight: '800' },
  });
}
