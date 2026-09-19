import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useRouter } from 'expo-router';
import { PrimaryButton, Screen } from '../src/ui/primitives';
import { ComingSoonLock } from '../src/ui/ComingSoon';
import { useThemeColors } from '../src/theme/ThemeContext';
import { spacing } from '../src/theme/tokens';

/**
 * Coach vocal — retiré du produit.
 * Deep link éventuel : écran verrouillé + retour.
 */
export default function CoachVokalScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();

  useEffect(() => {
    // Pas d’entrée produit : on renvoie vers l’entraînement
    const t = setTimeout(() => {
      router.replace('/(tabs)/training');
    }, 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <Screen>
      <ComingSoonLock
        label="Coach vocal"
        caption="Fonctionnalité retirée"
        style={styles.lock}
      >
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <Text style={[styles.title, { color: colors.text }]}>Coach vocal</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Cette fonctionnalité n’est plus proposée dans Mova. Le cockpit du
            jour et la Sentinelle restent disponibles.
          </Text>
        </View>
      </ComingSoonLock>
      <PrimaryButton
        label="Retour à l’entraînement"
        onPress={() => router.replace('/(tabs)/training')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lock: { marginTop: spacing.md },
  card: {
    padding: spacing.lg,
    minHeight: 160,
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20 },
});
