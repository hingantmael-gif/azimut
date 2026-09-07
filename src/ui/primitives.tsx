import {
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  type ViewProps,
  View,
} from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import type { ColorPalette } from '../theme/palettes';
import { stripBidiMarks } from '../constants/authLabels';

export function Screen({ style, ...props }: ViewProps) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  return <View style={[styles.screen, style]} {...props} />;
}

export function Title({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors).title, style]} {...props} />;
}

export function Subtitle({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors).subtitle, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors).body, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors).muted, style]} {...props} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  const plain = stripBidiMarks(label);
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.btn, disabled && styles.btnDisabled]}
      accessibilityLabel={plain}
    >
      <Text style={styles.btnText}>{plain}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  const plain = stripBidiMarks(label);
  return (
    <Pressable onPress={onPress} style={styles.btnSecondary} accessibilityLabel={plain}>
      <Text style={styles.btnSecondaryText}>{plain}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  const plain = stripBidiMarks(label);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityLabel={plain}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{plain}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      writingDirection: 'ltr',
    },
    subtitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '600',
      marginTop: spacing.sm,
      writingDirection: 'ltr',
    },
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
      writingDirection: 'ltr',
    },
    muted: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      writingDirection: 'ltr',
    },
    btn: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.45 },
    btnText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 15,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    btnSecondary: {
      marginTop: spacing.sm,
      backgroundColor: colors.bg,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    btnSecondaryText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    chip: {
      borderColor: colors.borderStrong,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.bg,
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.textSecondary,
      writingDirection: 'ltr',
    },
    chipTextSelected: {
      color: colors.white,
      fontWeight: '700',
      writingDirection: 'ltr',
    },
  });
}
