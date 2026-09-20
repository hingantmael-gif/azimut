import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextInputProps, type ViewProps } from 'react-native';
import { Text } from '../Text';
import { radii, spacing, typography } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { WizardBackdrop } from '../program/WizardBackdrop';
import { AppScrollView } from '../scrolling';
import { AppTextInput } from '../AppTextInput';
import { PressableScale } from '../motion/softMotion';

/** Palette des écrans d'authentification : toujours sombre (identité Mova), lisible partout. */
const A = {
  bg: '#050B16',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.74)',
  textMuted: 'rgba(255,255,255,0.5)',
  border: 'rgba(255,255,255,0.18)',
  borderStrong: 'rgba(255,255,255,0.4)',
  /** Surfaces OPAQUES (≈ 90 %) : le fond animé ne doit jamais transparaître sous le texte. */
  glass: 'rgba(6,14,28,0.88)',
  /** Simple ombre portée douce (pas de contour épais) : détache le bouton du fond animé. */
  halo: '0px 8px 22px rgba(0,0,0,0.42)',
  accent: '#3DFF9A',
  onAccent: '#04140D',
  gradient: ['#12B87A', '#22D3EE'] as const,
};

export function AuthScreen({ children, style, ...props }: ViewProps) {
  return (
    <View style={styles.shell}>
      <WizardBackdrop sport="run" />
      <View pointerEvents="none" style={styles.scrim} />
      <AppScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, style]}
        style={styles.root}
        {...props}
      >
        {children}
      </AppScrollView>
    </View>
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
        placeholderTextColor={A.textMuted}
        selectionColor={A.accent}
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
  const plain = String(label ?? '').replace(/[\u2066\u2069]/g, '');
  return (
    <PressableScale
      disabled={disabled}
      onPress={onPress}
      variant="nav"
      accessibilityLabel={plain}
      style={[
        styles.orangeBtn,
        variant === 'outline' && styles.orangeBtnOutline,
        disabled && styles.orangeBtnDisabled,
      ]}
      contentStyle={styles.orangeBtnContent}
    >
      {variant === 'outline' ? (
        <View style={styles.btnInner}>
          <Text style={[styles.orangeBtnText, styles.orangeBtnTextOutline]}>{plain}</Text>
        </View>
      ) : (
        <LinearGradient colors={A.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btnInner}>
          <Text style={styles.orangeBtnText}>{plain}</Text>
        </LinearGradient>
      )}
    </PressableScale>
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
  const plain = String(label ?? '').replace(/[\u2066\u2069]/g, '');
  return (
    <PressableScale
      onPress={onPress}
      variant="subtle"
      accessibilityRole="link"
      accessibilityLabel={plain}
      style={styles.textLinkWrap}
    >
      <Text style={[styles.textLink, accent && styles.textLinkAccent]}>{plain}</Text>
    </PressableScale>
  );
}

export function TermsCheckbox({
  checked,
  onToggle,
  onOpenTerms,
}: {
  checked: boolean;
  onToggle: () => void;
  onOpenTerms?: () => void;
}) {
  return (
    <View style={styles.termsRow}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={8}
      >
        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>
      <Text style={styles.termsText}>
        J&apos;accepte les{' '}
        <Text style={styles.termsLink} onPress={() => onOpenTerms?.()}>
          Conditions d&apos;utilisation
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: A.bg },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,8,16,0.5)' },
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.display,
    color: A.text,
    marginTop: spacing.md,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  subtitle: {
    ...typography.body,
    color: '#E6EEF7',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: A.border },
  dividerText: { color: A.textMuted, fontSize: 14 },
  field: { marginBottom: spacing.md },
  label: {
    color: A.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: A.borderStrong,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: A.text,
    backgroundColor: A.glass,
    ...(Platform.OS === 'web' ? ({ cursor: 'text' } as object) : null),
  },
  orangeBtn: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    boxShadow: A.halo,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  orangeBtnContent: { width: '100%' },
  btnInner: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  orangeBtnOutline: {
    backgroundColor: '#0A1628',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  orangeBtnDisabled: {
    opacity: 0.45,
    ...(Platform.OS === 'web' ? ({ cursor: 'not-allowed' } as object) : null),
  },
  orangeBtnText: {
    ...typography.button,
    color: A.onAccent,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  orangeBtnTextOutline: { color: '#FFFFFF' },
  textLinkWrap: { alignItems: 'center', paddingVertical: spacing.md },
  textLink: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 6,
  },
  textLinkAccent: { color: A.accent, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: A.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: A.accent,
    borderColor: A.accent,
  },
  checkmark: { color: A.onAccent, fontSize: 14, fontWeight: '800' },
  termsText: {
    flex: 1,
    color: A.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: A.accent,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
