import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useThemeColors } from '../theme/ThemeContext';
import { elevation, fonts, radii, rgba, spacing, typography } from '../theme/tokens';
import type { ColorPalette } from '../theme/palettes';
import { stripBidiMarks } from '../constants/authLabels';
import { PressableScale, ScreenEnter } from './motion/softMotion';
import { ScreenAtmosphere } from './atmosphere/ScreenAtmosphere';
import { Text } from './Text';

/**
 * Écran de base : fond aurore animé + entrée douce. Un écran qui impose son propre
 * `backgroundColor` garde son fond (pas d'aurore par-dessus).
 */
export function Screen({
  style,
  children,
  atmosphere = true,
  ...props
}: ViewProps & { atmosphere?: boolean }) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors, false);
  const pathname = usePathname();
  const ownBg = Boolean(StyleSheet.flatten(style)?.backgroundColor);
  return (
    <ScreenEnter resetKey={pathname} intensity="md">
      <View style={[styles.screen, { flex: 1 }, style]} {...props}>
        {atmosphere && !ownBg ? <ScreenAtmosphere intensity={0.9} /> : null}
        {children}
      </View>
    </ScreenEnter>
  );
}

export function Title({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors, false).title, style]} {...props} />;
}

export function Subtitle({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors, false).subtitle, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors, false).body, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors, false).muted, style]} {...props} />;
}

/** Petit libellé de section en capitales espacées (« AUJOURD'HUI »). */
export function Overline({ style, ...props }: TextProps) {
  const { colors } = useThemeColors();
  return <Text style={[makeStyles(colors, false).overline, style]} {...props} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Élément placé avant le libellé (icône). */
  icon?: ReactNode;
}) {
  const { colors, isDark } = useThemeColors();
  const styles = makeStyles(colors, isDark);
  const plain = stripBidiMarks(label);
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      variant="nav"
      accessibilityLabel={plain}
      style={[styles.btn, disabled && styles.btnDisabled]}
      contentStyle={styles.btnContentFill}
    >
      <LinearGradient
        colors={colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btnGradient}
      >
        {icon}
        <Text style={styles.btnText}>{plain}</Text>
      </LinearGradient>
    </PressableScale>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
}) {
  const { colors, isDark } = useThemeColors();
  const styles = makeStyles(colors, isDark);
  const plain = stripBidiMarks(label);
  return (
    <PressableScale
      onPress={onPress}
      variant="pop"
      accessibilityLabel={plain}
      style={styles.btnSecondary}
      contentStyle={styles.btnContent}
    >
      <View style={styles.btnRow}>
        {icon}
        <Text style={styles.btnSecondaryText}>{plain}</Text>
      </View>
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
  const { colors, isDark } = useThemeColors();
  const styles = makeStyles(colors, isDark);
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

/**
 * Carte Mova : `solid` (fond plein + ombre douce), `glass` (translucide, bordure claire)
 * ou `outline` (bordure seule). Les coins et paddings suivent les jetons.
 */
export function Card({
  variant = 'solid',
  level = 1,
  padded = true,
  style,
  children,
  ...props
}: ViewProps & {
  variant?: 'solid' | 'glass' | 'outline';
  level?: 0 | 1 | 2 | 3;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useThemeColors();
  const base: ViewStyle = {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    ...(padded ? { padding: spacing.md } : null),
    ...(variant === 'solid'
      ? { backgroundColor: colors.bgCard, borderColor: colors.border }
      : variant === 'glass'
        ? { backgroundColor: colors.glass, borderColor: colors.glassBorder }
        : { backgroundColor: 'transparent', borderColor: colors.borderStrong }),
  };
  return (
    <View
      style={[base, variant === 'outline' ? null : (elevation(level, colors.shadow, isDark) as ViewStyle), style]}
      {...props}
    >
      {children}
    </View>
  );
}

/** Pastille compacte (statut, tag, compteur). `tone` colore fond + texte. */
export function Pill({
  label,
  tone = 'accent',
  icon,
  style,
}: {
  label: string;
  tone?: 'accent' | 'warn' | 'danger' | 'success' | 'neutral' | 'premium' | 'ranked';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useThemeColors();
  const fg =
    tone === 'neutral'
      ? colors.textSecondary
      : tone === 'accent'
        ? colors.accent
        : colors[tone];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radii.pill,
          backgroundColor: tone === 'neutral' ? colors.bgSecondary : rgba(fg, 0.14),
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ ...typography.caption, fontFamily: fonts.bold, color: fg }}>{stripBidiMarks(label)}</Text>
    </View>
  );
}

/** Tuile de chiffre clé : valeur en grand + libellé (accueil, profil, bilans). */
export function StatTile({
  value,
  label,
  tone = 'accent',
  style,
}: {
  value: string;
  label: string;
  tone?: 'accent' | 'warn' | 'success' | 'sleep' | 'xp' | 'ranked';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useThemeColors();
  const fg = colors[tone];
  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 0,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: radii.lg,
          backgroundColor: rgba(fg, isDark ? 0.14 : 0.1),
          borderWidth: StyleSheet.hairlineWidth * 1.5,
          borderColor: rgba(fg, isDark ? 0.28 : 0.2),
        },
        style,
      ]}
    >
      <Text style={{ ...typography.title, color: fg }} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={{ ...typography.overline, color: colors.textMuted, marginTop: 2 }}
        numberOfLines={1}
      >
        {stripBidiMarks(label).toUpperCase()}
      </Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette, isDark: boolean) {
  const glow = Platform.OS === 'web' ? { boxShadow: `0px 8px 20px ${rgba(colors.accent, isDark ? 0.28 : 0.3)}` } : null;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    title: {
      ...typography.hero,
      color: colors.text,
      writingDirection: 'ltr',
    },
    subtitle: {
      ...typography.headline,
      color: colors.text,
      marginTop: spacing.sm,
      writingDirection: 'ltr',
    },
    body: {
      ...typography.body,
      color: colors.text,
      writingDirection: 'ltr',
    },
    muted: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      writingDirection: 'ltr',
    },
    overline: {
      ...typography.overline,
      color: colors.textMuted,
      writingDirection: 'ltr',
    },
    btn: {
      marginTop: spacing.sm,
      borderRadius: radii.lg,
      overflow: 'hidden',
      ...(glow as object),
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
    },
    btnContentFill: {
      width: '100%',
    },
    btnGradient: {
      minHeight: 52,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnContent: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    btnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnDisabled: {
      opacity: 0.45,
      ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as object) : null),
    },
    btnText: {
      ...typography.button,
      color: colors.onAccent,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    btnSecondary: {
      marginTop: spacing.sm,
      minHeight: 52,
      justifyContent: 'center',
      backgroundColor: colors.glass,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    btnSecondaryText: {
      ...typography.button,
      color: colors.text,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    chip: {
      borderColor: colors.borderStrong,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radii.pill,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.glass,
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      ...typography.label,
      color: colors.textSecondary,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    chipTextSelected: {
      ...typography.label,
      fontFamily: fonts.bold,
      color: colors.onAccent,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
  });
}
