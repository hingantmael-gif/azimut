import { useMemo, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

const webNoOutline =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object)
    : null;

export type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
};

function useSettingsStyles() {
  const { colors } = useThemeColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useSettingsStyles();
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  showChevron = true,
}: SettingsRowProps) {
  const styles = useSettingsStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.rowPressed,
        webNoOutline,
        onPress && Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress && showChevron ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </Pressable>
  );
}

export function SettingsToggleRow({
  label,
  subtitle,
  value,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
}) {
  const styles = useSettingsStyles();
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen({ children }: { children: ReactNode }) {
  const styles = useSettingsStyles();
  return <View style={styles.screen}>{children}</View>;
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgSecondary,
    },
    section: { marginTop: spacing.lg },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      letterSpacing: 0.5,
    },
    sectionBody: {
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      minHeight: 48,
    },
    rowPressed: { backgroundColor: colors.bgSecondary },
    rowLabel: { fontSize: 16, color: colors.text, flex: 1 },
    rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue: { fontSize: 15, color: colors.textMuted, maxWidth: 160 },
    chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
    destructive: { color: colors.danger },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.borderStrong,
      padding: 2,
      justifyContent: 'center',
    },
    toggleOn: { backgroundColor: colors.accent },
    knob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.white,
    },
    knobOn: { alignSelf: 'flex-end' },
  });
}
