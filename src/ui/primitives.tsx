import {
  Platform,
  StyleSheet,
  Text,
  type TextProps,
  type ViewProps,
  View,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import type { ColorPalette } from '../theme/palettes';
import { stripBidiMarks } from '../constants/authLabels';
import { PressableScale, ScreenEnter } from './motion/softMotion';

export function Screen({ style, ...props }: ViewProps) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  const pathname = usePathname();
  return (
    <ScreenEnter resetKey={pathname} intensity="md">
      <View style={[styles.screen, { flex: 1 }, style]} {...props} />
    </ScreenEnter>
  );
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
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      variant="nav"
      accessibilityLabel={plain}
      style={[styles.btn, disabled && styles.btnDisabled]}
      contentStyle={styles.btnContent}
    >
      <Text style={styles.btnText}>{plain}</Text>
    </PressableScale>
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
    <PressableScale
      onPress={onPress}
      variant="pop"
      accessibilityLabel={plain}
      style={styles.btnSecondary}
      contentStyle={styles.btnContent}
    >
      <Text style={styles.btnSecondaryText}>{plain}</Text>
    </PressableScale>
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
    <PressableScale
      onPress={onPress}
      variant="subtle"
      accessibilityLabel={plain}
      style={[styles.chip, selected && styles.chipSelected]}
      contentStyle={styles.btnContent}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{plain}</Text>
    </PressableScale>
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
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
    },
    btnContent: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    btnDisabled: {
      opacity: 0.45,
      ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as object) : null),
    },
    btnText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 15,
      writingDirection: 'ltr',
      textAlign: 'center',
      width: '100%',
    },
    btnSecondary: {
      marginTop: spacing.sm,
      backgroundColor: colors.bg,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    btnSecondaryText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
      writingDirection: 'ltr',
      textAlign: 'center',
      width: '100%',
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
      textAlign: 'center',
    },
    chipTextSelected: {
      color: colors.white,
      fontWeight: '700',
      writingDirection: 'ltr',
      textAlign: 'center',
    },
  });
}
