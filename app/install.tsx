import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '../src/constants/brand';

/**
 * Redirige vers la page d’install ultra-légère (HTML statique).
 * Évite de charger tout le bundle Expo juste pour installer.
 */
export default function InstallLandingScreen() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const base = window.location.pathname.startsWith('/azimut') ? '/azimut' : '';
      window.location.replace(`${window.location.origin}${base}/get.html`);
      return;
    }
    router.replace('/(auth)/welcome');
  }, [router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={BRAND.signalMint} size="large" />
      <Text style={styles.text}>Redirection vers l’installation…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  text: {
    color: 'rgba(244,247,250,0.75)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
