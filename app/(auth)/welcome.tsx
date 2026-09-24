import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { isStandaloneDisplay } from '../../src/services/pwaInstall';
import { Text } from '../../src/ui/Text';
import { useRouter, type Href } from 'expo-router';
import { BrandMark } from '../../src/ui/strava/BrandMark';
import { OrangeButton } from '../../src/ui/strava/AuthScreen';
import { BRAND } from '../../src/constants/brand';
import { useApp } from '../../src/store/AppContext';
import { spacing } from '../../src/theme/tokens';
import { useI18n } from '../../src/i18n/I18nContext';
import { WizardBackdrop } from '../../src/ui/program/WizardBackdrop';

/** Accueil Mova — entrée simple ; CGU à l’inscription. */
function useCanInstall(): boolean {
  // Navigateur (pas l'app installée) : on propose le guide d'installation dès l'accueil — utile surtout sur iPhone.
  return Platform.OS === 'web' && typeof window !== 'undefined' && !isStandaloneDisplay();
}

export default function WelcomeScreen() {
  const router = useRouter();
  const canInstall = useCanInstall();
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
      <WizardBackdrop sport="run" />
      <View pointerEvents="none" style={styles.scrim} />
      <View style={styles.hero}>
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
        {canInstall ? (
          <Text style={styles.legal} onPress={() => router.push('/install' as Href)}>
            Installer Mova sur mon téléphone
          </Text>
        ) : null}
        <Text style={styles.legal} onPress={() => router.push('/settings/legal/terms' as Href)}>
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
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,8,16,0.5)' },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    minHeight: 440,
    overflow: 'hidden',
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
    gap: spacing.sm,
  },
  legal: {
    color: '#3DFF9A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
