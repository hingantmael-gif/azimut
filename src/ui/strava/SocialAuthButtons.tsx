import { Platform, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { PressableScale } from '../motion/softMotion';

/** Uniquement Google — Apple / Facebook retirés (pas de faux comptes). */
export function SocialAuthButtons({
  onGoogle,
  loading,
  label = 'Continuer avec Google',
  loadingLabel = 'Connexion Google…',
}: {
  onGoogle: () => void;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={onGoogle}
        disabled={loading}
        variant="pop"
        accessibilityLabel={loading ? loadingLabel : label}
        style={[styles.btn, styles.google, loading && styles.disabled]}
        contentStyle={styles.btnContent}
      >
        <Text style={[styles.label, styles.labelDark]}>
          {loading ? loadingLabel : label}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  btnContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  google: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
  },
  disabled: { opacity: 0.55 },
  label: {
    ...typography.button,
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
  },
  labelDark: { color: colors.text },
});
