import { StyleSheet, View } from 'react-native';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { ComingSoonLock } from '../src/ui/ComingSoon';
import { colors, radii, spacing } from '../src/theme/tokens';

/** CDC §9.C — Live Tracking & Safety (en construction : visible, non cliquable). */
export default function SafetyScreen() {
  return (
    <Screen>
      <Title>Live Tracking & Sécurité</Title>
      <Muted>
        Lien sécurisé pour proches · alerte immobilité anormale (détection de chute).
      </Muted>
      <ComingSoonLock label="Suivi en direct et contact d'urgence" style={styles.lock}>
        <View style={styles.card}>
          <Body>Contact d&apos;urgence : non configuré</Body>
          <PrimaryButton label="Partager mon suivi en direct" onPress={() => undefined} />
          <PrimaryButton label="Ajouter un contact d'urgence" onPress={() => undefined} />
        </View>
      </ComingSoonLock>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lock: { marginTop: spacing.lg, borderRadius: radii.md },
  card: {
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
