import { StyleSheet, Text, View } from 'react-native';
import { PressableScale, SoftPulse } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { DailyAdjustment } from '../../engines/dailyAdjustment';

type Props = {
  adjustment: DailyAdjustment;
  onPress: () => void;
};

/** Bandeau statut du jour — une phrase, SoftPulse si à surveiller. */
export function DayStatusBanner({ adjustment, onPress }: Props) {
  const { colors } = useThemeColors();
  const warn = adjustment.watchOut;
  const inner = (
    <PressableScale
      variant="subtle"
      onPress={onPress}
      accessibilityLabel={adjustment.statusLine}
      contentStyle={[
        styles.banner,
        {
          backgroundColor: warn ? 'rgba(245, 158, 11, 0.14)' : colors.bgElevated,
          borderColor: warn ? 'rgba(245, 158, 11, 0.45)' : colors.border,
        },
      ]}
    >
      <Text style={styles.icon}>{warn ? '◎' : '●'}</Text>
      <Text
        style={[styles.text, { color: warn ? '#B45309' : colors.text }]}
        numberOfLines={2}
      >
        {adjustment.statusLine}
      </Text>
      <Text style={[styles.chev, { color: colors.textMuted }]}>›</Text>
    </PressableScale>
  );

  if (warn) {
    return <SoftPulse intensity={0.03}>{inner}</SoftPulse>;
  }
  return inner;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 12, fontWeight: '900' },
  text: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  chev: { fontSize: 22, fontWeight: '300', marginTop: -2 },
});
