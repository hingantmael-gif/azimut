import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { BRAND } from '../../constants/brand';
import { useThemeColors } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { AzimutMark, BrandMark } from '../strava/BrandMark';

/** En-tête Accueil — logo + nom (emplacement standard hub principal). */
export function HeaderBrand() {
  const { colors } = useThemeColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(tabs)')}
      style={styles.headerRow}
      accessibilityRole="header"
      accessibilityLabel="Azimut, accueil"
    >
      <AzimutMark size={30} surfaceColor={colors.bg} />
      <Text style={[styles.headerWord, { color: colors.text }]}>Azimut</Text>
    </Pressable>
  );
}

/** Bandeau marque en haut des Paramètres / À propos. */
export function SettingsBrandHeader({ subtitle }: { subtitle?: string }) {
  const { colors } = useThemeColors();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[styles.settingsBlock, { borderBottomColor: colors.border }]}>
      <BrandMark size="md" surfaceColor={colors.bgSecondary} showWordmark />
      <Text style={[styles.settingsSub, { color: colors.textMuted }]}>
        {subtitle ?? `Version ${version}`}
      </Text>
    </View>
  );
}

/** Logo centré — centre d’aide, CGU, confidentialité. */
export function AboutBrandMark({ compact }: { compact?: boolean }) {
  const { colors } = useThemeColors();

  return (
    <View style={styles.aboutWrap}>
      {compact ? (
        <AzimutMark size={40} surfaceColor={colors.bgSecondary} />
      ) : (
        <BrandMark size="sm" surfaceColor={colors.bgSecondary} showWordmark />
      )}
    </View>
  );
}

/** Petit logo auth (OTP, onboarding). */
export function AuthFlowMark() {
  const { colors } = useThemeColors();
  return (
    <View style={styles.authMark}>
      <AzimutMark size={36} surfaceColor={colors.bg} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  headerWord: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  settingsSub: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
  },
  aboutWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  authMark: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
});

export { BRAND };
