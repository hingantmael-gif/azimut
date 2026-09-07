import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '../src/constants/brand';
import { spacing } from '../src/theme/tokens';
import { AppScrollView } from '../src/ui/scrolling';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Page publique d’installation Azimut — partageable avec des amis.
 * PWA sur Chrome/Edge/Android ; consignes Add to Home Screen sur iOS Safari.
 */
export default function InstallLandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    driftLoop.start();
    return () => {
      loop.stop();
      driftLoop.stop();
    };
  }, [fade, pulse, drift]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const isIos = useMemo(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  const onInstall = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    if (isIos) {
      setHint(
        'Sur iPhone / iPad : touche Partager puis « Sur l’écran d’accueil » pour installer Azimut.',
      );
      return;
    }
    if (Platform.OS === 'web') {
      setHint(
        'Utilise le menu du navigateur (⋮ ou ⊕) → « Installer Azimut » / « Ajouter à l’écran d’accueil ».',
      );
      return;
    }
    setHint('Ouvre ce lien dans Chrome ou Safari pour installer Azimut.');
  }, [deferred, isIos]);

  const openApp = useCallback(() => {
    router.push('/(auth)/welcome');
  }, [router]);

  const orbX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 24] });
  const orbY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbA,
          { transform: [{ translateX: orbX }, { translateY: orbY }, { scale: pulse }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbB,
          {
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
            ],
          },
        ]}
      />

      <AppScrollView contentContainerStyle={styles.scroll}>
        <Animated.View style={[styles.card, compact && styles.cardCompact, { opacity: fade }]}>
          <View style={styles.logoWrap}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Image
                source={require('../assets/azimut-mark.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logo Azimut"
              />
            </Animated.View>
          </View>

          <Text style={styles.brand}>Azimut</Text>
          <Text style={styles.tag}>{BRAND.tagline}</Text>
          <Text style={styles.pitch}>
            Ton coach multi-sport dans la poche — course, vélo, natation, triathlon.
            Installe l’app en un clic sur téléphone, tablette ou PC.
          </Text>

          {installed ? (
            <Pressable style={styles.primary} onPress={openApp} accessibilityRole="button">
              <Text style={styles.primaryText}>Ouvrir Azimut</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primary}
              onPress={onInstall}
              accessibilityRole="button"
              accessibilityLabel="Installer l’application Azimut"
            >
              <Text style={styles.primaryText}>Installer l’application</Text>
            </Pressable>
          )}

          <Pressable style={styles.secondary} onPress={openApp} accessibilityRole="button">
            <Text style={styles.secondaryText}>Continuer dans le navigateur</Text>
          </Pressable>

          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <View style={styles.metaRow}>
            <Text style={styles.meta}>Web · iOS · Android · PC</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>Gratuit</Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL('https://github.com/hingantmael-gif/azimut')}
            accessibilityRole="link"
          >
            <Text style={styles.github}>Code source sur GitHub</Text>
          </Pressable>
        </Animated.View>
      </AppScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.ink,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  orbA: {
    width: 340,
    height: 340,
    backgroundColor: 'rgba(14, 143, 111, 0.35)',
    top: -80,
    right: -100,
  },
  orbB: {
    width: 260,
    height: 260,
    backgroundColor: 'rgba(212, 255, 63, 0.12)',
    bottom: -60,
    left: -80,
  },
  card: {
    borderRadius: 28,
    padding: spacing.xl,
    backgroundColor: 'rgba(15, 28, 46, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(61, 255, 154, 0.18)',
    alignItems: 'center',
  },
  cardCompact: {
    padding: spacing.lg,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(61, 255, 154, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: { width: 72, height: 72 },
  brand: {
    color: '#F4F7FA',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  tag: {
    marginTop: 8,
    color: BRAND.signalMint,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  pitch: {
    marginTop: spacing.md,
    color: 'rgba(244,247,250,0.78)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  primary: {
    marginTop: spacing.xl,
    width: '100%',
    backgroundColor: BRAND.signalMint,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: BRAND.ink,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  secondary: {
    marginTop: spacing.sm,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  secondaryText: {
    color: '#F4F7FA',
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    marginTop: spacing.md,
    color: 'rgba(244,247,250,0.7)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  meta: {
    color: 'rgba(244,247,250,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDot: { color: 'rgba(244,247,250,0.3)' },
  github: {
    marginTop: spacing.md,
    color: 'rgba(61, 255, 154, 0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
});
