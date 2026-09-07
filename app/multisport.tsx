import { StyleSheet, View } from 'react-native';
import { Body, Muted, Screen, Subtitle, Title } from '../src/ui/primitives';
import { colors, radii, spacing } from '../src/theme/tokens';
import { AppScrollView } from '../src/ui/scrolling';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** CDC §7.A — Multi-sport */
export default function MultisportScreen() {
  return (
    <Screen>
      <AppScrollView>
        <Title>Hub Multi-Sport</Title>
        <Muted>Sprint → Ironman · Natation · Vélo · Brick</Muted>

        <View style={{ marginTop: spacing.md }}>
          <SportAtmosphereBanner
            source={ATMOSPHERE_IMAGES.triathlon}
            title="Enchaîner les disciplines"
            subtitle="Natation, vélo, course — le même plan, des athlètes au premier plan"
          />
        </View>

        <View style={styles.card}>
          <Subtitle>Natation</Subtitle>
          <Body>Échauffement · Éducatifs · Séries · Retour au calme</Body>
          <Muted>Export bassin : SWOLF, temps / 100 m</Muted>
        </View>
        <View style={styles.card}>
          <Subtitle>Vélo / Cyclisme</Subtitle>
          <Body>Zones Watts (FTP) ou FC</Body>
          <Muted>Garmin Edge, Wahoo, Zwift, Rouvy, fichiers .zwo</Muted>
        </View>
        <View style={styles.card}>
          <Subtitle>Brick Work</Subtitle>
          <Body>Vélo immédiatement suivi d&apos;un footing allure course</Body>
        </View>
      </AppScrollView>
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
    gap: 4,
  },
});
