import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActiveProgram } from '../types/domain';
import { computeProgramEvolution } from '../engines/programProgress';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import type { ColorPalette } from '../theme/palettes';

type Props = {
  program: ActiveProgram;
  compact?: boolean;
};

/** Carte évolution avant → actuel (temps gagné) */
export function ProgramEvolutionCard({ program, compact }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const evo = computeProgramEvolution(program);

  if (!evo.hasBaseline) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Text style={styles.kicker}>Évolution {evo.label}</Text>
        <Text style={styles.hint}>
          Indiquez votre temps de départ (ex. chrono {evo.label}) pour suivre vos progrès — ou
          importez une activité proche de cette distance.
        </Text>
      </View>
    );
  }

  const deltaPositive = evo.deltaSec != null && evo.deltaSec < 0;
  const deltaNeutral = evo.deltaSec === 0 || (!evo.hasCurrent && evo.hasBaseline);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.kicker}>Évolution {evo.label}</Text>

      {evo.hasCurrent && evo.deltaSec != null && evo.deltaSec !== 0 ? (
        <Text
          style={[
            styles.gain,
            deltaPositive ? styles.gainUp : styles.gainDown,
          ]}
        >
          {deltaPositive ? 'Temps gagné ' : 'Écart '}
          {evo.gainLabel}
        </Text>
      ) : (
        <Text style={styles.gainMuted}>
          {deltaNeutral ? 'Référence enregistrée — en attente d’un nouveau test' : '—'}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.colL}>Avant le programme</Text>
          <Text style={styles.colV}>{evo.baselineLabel}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={styles.col}>
          <Text style={styles.colL}>Meilleur actuel</Text>
          <Text style={styles.colV}>{evo.currentLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgElevated,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    cardCompact: {
      marginTop: spacing.sm,
    },
    kicker: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    hint: {
      marginTop: 8,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    gain: {
      marginTop: 8,
      fontSize: 22,
      fontWeight: '800',
    },
    gainUp: { color: colors.success },
    gainDown: { color: colors.danger },
    gainMuted: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    col: { flex: 1 },
    colL: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    colV: { marginTop: 4, fontSize: 20, fontWeight: '800', color: colors.text },
    arrow: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
  });
}
