import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type TextInputProps, type ViewProps } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { AppScrollView } from '../scrolling';
import { AppTextInput } from '../AppTextInput';

export function AuthScreen({ children, style, ...props }: ViewProps) {
  return (
    <AppScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scroll, style]}
      style={styles.root}
      {...props}
    >
      {children}
    </AppScrollView>
  );
}

export function AuthTitle({ children }: { children: string }) {
  const plain = children.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  return (
    <Text style={styles.title} accessibilityLabel={plain}>
      {plain}
    </Text>
  );
}

export function AuthSubtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function StravaInput({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <AppTextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function OrangeButton({
  label,
  onPress,
  disabled,
  variant = 'filled',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
}) {
  const plain = label.replace(/[\u2066\u2069]/g, '');
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={plain}
      style={[
        styles.orangeBtn,
        variant === 'outline' && styles.orangeBtnOutline,
        disabled && styles.orangeBtnDisabled,
      ]}
    >
      <Text
        style={[
          styles.orangeBtnText,
          variant === 'outline' && styles.orangeBtnTextOutline,
        ]}
      >
        {plain}
      </Text>
    </Pressable>
  );
}

export function TextLink({
  label,
  onPress,
  accent,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const plain = label.replace(/[\u2066\u2069]/g, '');
  return (
    <Pressable
      onPress={onPress}
      style={styles.textLinkWrap}
      accessibilityRole="link"
      accessibilityLabel={plain}
    >
      <Text style={[styles.textLink, accent && styles.textLinkAccent]}>{plain}</Text>
    </Pressable>
  );
}

export function TermsCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.termsRow}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={styles.termsText}>
        J&apos;accepte les Conditions d&apos;utilisation et la Politique de confidentialité.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.hero,
    color: colors.text,
    marginTop: spacing.md,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 14 },
  field: { marginBottom: spacing.md },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bgCard,
    ...(Platform.OS === 'web' ? ({ cursor: 'text' } as object) : null),
  },
  orangeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  orangeBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  orangeBtnDisabled: { opacity: 0.45 },
  orangeBtnText: {
    ...typography.button,
    color: colors.white,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  orangeBtnTextOutline: {
    color: colors.accent,
  },
  textLinkWrap: { alignItems: 'center', paddingVertical: spacing.md },
  textLink: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  textLinkAccent: { color: colors.accent },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
