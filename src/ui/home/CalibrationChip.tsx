import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii } from '../../theme/tokens';

type Props = {
  /** Confiance modèle 0–1 */
  confidence: number;
  onPress: () => void;
};

/** Puce calibration coach → Progrès / Performance. */
export function CalibrationChip({ confidence, onPress }: Props) {
  const { colors } = useThemeColors();
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return (
    <PressableScale
      variant="subtle"
      onPress={onPress}
      accessibilityLabel={`Calibration coach ${pct} pourcent`}
      contentStyle={[
        styles.chip,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Calibration coach {pct}%
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
