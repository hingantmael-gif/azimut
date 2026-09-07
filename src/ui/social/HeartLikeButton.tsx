import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii } from '../../theme/tokens';

type Props = {
  liked: boolean;
  disabled?: boolean;
  xpLabel?: string;
  onPress: () => void;
  /** Alignement du bouton dans la carte */
  align?: 'left' | 'right';
};

/** Petit cœur pour liker un programme ou une séance (+ XP). */
export function HeartLikeButton({
  liked,
  disabled,
  xpLabel,
  onPress,
  align = 'right',
}: Props) {
  const { colors } = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || liked}
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Déjà aimé' : 'Aimer'}
      style={[
        styles.btn,
        {
          alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
          backgroundColor: liked ? '#FEE2E2' : colors.bgSecondary,
          borderColor: liked ? '#FECACA' : colors.border,
          opacity: disabled && !liked ? 0.45 : 1,
        },
      ]}
    >
      <Text style={[styles.heart, { color: liked ? '#DC2626' : colors.textMuted }]}>
        {liked ? '♥' : '♡'}
      </Text>
      {xpLabel && !liked ? (
        <Text style={[styles.xp, { color: colors.textMuted }]}>{xpLabel}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  heart: { fontSize: 16, fontWeight: '800' },
  xp: { fontSize: 11, fontWeight: '800' },
});
