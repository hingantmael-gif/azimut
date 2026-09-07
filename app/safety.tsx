import { StyleSheet, View } from 'react-native';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { colors, radii, spacing } from '../src/theme/tokens';

/** CDC §9.C — Live Tracking & Safety */
export default function SafetyScreen() {
  return (
    <Screen>
      <Title>Live Tracking & Sécurité</Title>
      <Muted>
        Lien sécurisé pour proches · alerte immobilité anormale (détection de chute).
      </Muted>
      <View style={styles.card}>
        <Body>Contact d&apos;urgence : non configuré</Body>
        <PrimaryButton label="Partager mon suivi en direct" onPress={() => undefined} />
        <PrimaryButton label="Ajouter un contact d'urgence" onPress={() => undefined} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
