import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

/** Uniquement Google — Apple / Facebook retirés (pas de faux comptes). */
export function SocialAuthButtons({
  onGoogle,
  loading,
}: {
  onGoogle: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onGoogle}
        disabled={loading}
        style={[styles.btn, styles.google, loading && styles.disabled]}
      >
        <Text style={[styles.label, styles.labelDark]}>
          {loading ? 'Connexion Google…' : 'Continuer avec Google'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  google: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
  },
  disabled: { opacity: 0.55 },
  label: {
    ...typography.button,
    fontSize: 15,
  },
  labelDark: { color: colors.text },
});
