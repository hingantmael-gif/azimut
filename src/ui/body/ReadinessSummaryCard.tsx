import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

type Props = {
  score: number;
  label: string;
  summary: string;
  listOpen: boolean;
  onPress: () => void;
};

export function ReadinessSummaryCard({ score, label, summary, listOpen, onPress }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, listOpen && styles.cardActive]}
      accessibilityRole="button"
      accessibilityHint="Afficher la liste des muscles par niveau de récupération"
    >
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={styles.label}>Indice de récupération</Text>
          <Text style={styles.title}>{label}</Text>
        </View>
        <View style={styles.scoreRing}>
          <Text style={styles.scoreN}>{score}</Text>
          <Text style={styles.scorePct}>%</Text>
        </View>
      </View>
      <Text style={styles.sub}>{summary}</Text>
      <Text style={styles.tap}>
        {listOpen ? 'Masquer la liste ▲' : 'Voir le détail par muscle ▼'}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      margin: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    left: { flex: 1, paddingRight: spacing.sm },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
    sub: { color: colors.textSecondary, marginTop: spacing.sm, fontSize: 14, lineHeight: 20 },
    tap: {
      marginTop: spacing.sm,
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentDark,
    },
    scoreRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentLight,
      borderWidth: 3,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    scoreN: { fontSize: 22, fontWeight: '900', color: colors.accentDark },
    scorePct: { fontSize: 12, fontWeight: '700', color: colors.accentDark, marginTop: 4 },
  });
}
