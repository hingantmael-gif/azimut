import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { colors, radii, spacing } from '../src/theme/tokens';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** CDC §7.B — Récupération active */
const ROUTINES = [
  { id: '1', title: 'Étirements ischio / mollets', min: 8 },
  { id: '2', title: 'Mobilité hanches', min: 10 },
  { id: '3', title: 'Foam rolling quadriceps', min: 12 },
];

export default function RecoveryScreen() {
  const [active, setActive] = useState<string | null>(null);
  const [sec, setSec] = useState(0);

  return (
    <Screen>
      <Title>Récupération</Title>
      <Muted>Étirements, mobilité, foam rolling — chronomètre intégré.</Muted>
      <View style={{ marginTop: spacing.md }}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.swim}
          title="Récupérer pour mieux performer"
          subtitle="Mobilité & retour au calme — corps prêt pour la suite"
        />
      </View>
      {ROUTINES.map((r) => (
        <View key={r.id} style={styles.card}>
          <Body>{r.title}</Body>
          <Muted>{r.min} min · vidéo / illustrations</Muted>
          <PrimaryButton
            label={active === r.id ? `Chrono ${sec}s` : 'Démarrer'}
            onPress={() => {
              setActive(r.id);
              setSec(0);
              const id = setInterval(() => setSec((s) => s + 1), 1000);
              setTimeout(() => clearInterval(id), r.min * 60 * 1000);
            }}
          />
        </View>
      ))}
      <Text style={styles.note}>
        Repos Strict possible si HRV bas / sommeil critique (Garmin).
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  note: { marginTop: spacing.lg, color: colors.warn },
});
