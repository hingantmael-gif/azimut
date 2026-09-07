import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandMark } from '../../src/ui/strava/BrandMark';
import { OrangeButton } from '../../src/ui/strava/AuthScreen';
import { BRAND } from '../../src/constants/brand';
import { AUTH_LABELS } from '../../src/constants/authLabels';
import { spacing } from '../../src/theme/tokens';

/** Accueil Azimut — identité propre (hors look Strava) */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.wash} />
        <View style={styles.orbitA} />
        <View style={styles.orbitB} />
        <View style={styles.orbitC} />
        <View style={styles.heroContent}>
          <Text style={styles.eyebrow}>MULTI-SPORT · COACHING</Text>
          <BrandMark size="lg" ink surfaceColor={BRAND.ink} />
          <Text style={styles.tagline}>{BRAND.taglineLines}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <OrangeButton
          label="Inscription"
          onPress={() => router.push('/(auth)/register')}
        />
        <OrangeButton
          label={AUTH_LABELS.signIn}
          variant="outline"
          onPress={() => router.push('/(auth)/login')}
        />
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
});
