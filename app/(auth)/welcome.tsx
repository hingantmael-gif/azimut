import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import { BrandMark } from '../../src/ui/strava/BrandMark';
import { OrangeButton } from '../../src/ui/strava/AuthScreen';
import { BRAND } from '../../src/constants/brand';
import { useApp } from '../../src/store/AppContext';
import { spacing } from '../../src/theme/tokens';
import { useI18n } from '../../src/i18n/I18nContext';

/** Accueil Mova — entrée simple ; CGU à l’inscription. */
export default function WelcomeScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { t } = useI18n();

  useEffect(() => {
    if (!state.authToken || !state.profile.emailVerified) return;
    if (!state.profile.onboardingCompleted) {
      router.replace('/(auth)/onboarding');
      return;
    }
    router.replace('/(tabs)');
  }, [
    state.authToken,
    state.profile.emailVerified,
    state.profile.onboardingCompleted,
    router,
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.wash} />
        <View style={styles.orbitA} />
        <View style={styles.orbitB} />
        <View style={styles.orbitC} />
        <View style={styles.heroContent}>
          <Text style={styles.eyebrow}>{t('welcome.eyebrow')}</Text>
          <BrandMark size="lg" ink surfaceColor={BRAND.ink} />
          <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <OrangeButton
          label={t('welcome.signup')}
          onPress={() => router.push('/(auth)/register')}
        />
        <OrangeButton
          label={t('auth.signIn')}
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
        <Text style={styles.legal} onPress={() => router.push('/settings/terms')}>
          {t('settings.terms')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.ink,
  },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    minHeight: 440,
    overflow: 'hidden',
    backgroundColor: BRAND.ink,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 143, 111, 0.12)',
  },
  orbitA: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(61, 255, 154, 0.18)',
    top: -40,
    right: -80,
  },
  orbitB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 63, 0.12)',
    top: 40,
    right: -20,
  },
  orbitC: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(61, 255, 154, 0.28)',
    top: 90,
    right: 40,
  },
  heroContent: {
    zIndex: 2,
  },
  eyebrow: {
    color: BRAND.signalMint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginBottom: spacing.md,
    opacity: 0.9,
  },
  tagline: {
    color: '#F4F7FA',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginTop: spacing.md,
    maxWidth: 300,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: '#F3F7F5',
    gap: spacing.sm,
  },
  legal: {
    color: '#0E8F6F',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
