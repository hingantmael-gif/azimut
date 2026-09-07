import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '../src/constants/brand';

const INSTALL_PAGE = 'https://hingantmael-gif.github.io/azimut/';
const APK_URL = 'https://github.com/hingantmael-gif/azimut/releases/latest/download/azimut.apk';

/** Dev / deep-link : renvoie vers la page install isolée (pas l’app web). */
export default function InstallLandingScreen() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace(INSTALL_PAGE);
      return;
    }
    Linking.openURL(APK_URL).catch(() => router.replace('/(auth)/welcome'));
  }, [router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={BRAND.signalMint} size="large" />
      <Text style={styles.text}>Ouverture du téléchargement de l’application…</Text>
      <Pressable onPress={() => Linking.openURL(APK_URL)} style={styles.linkWrap}>
        <Text style={styles.link}>Télécharger l’APK</Text>
      </Pressable>
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
  linkWrap: { marginTop: 8 },
  link: { color: BRAND.signalMint, fontWeight: '800', fontSize: 15 },
});
