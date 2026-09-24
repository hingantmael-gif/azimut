import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/Text';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AppScrollView } from '../../src/ui/scrolling';
import { PrimaryButton } from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import { useProviderIntegrations } from '../../src/hooks/useProviderIntegrations';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { IntegrationStatus } from '../../src/types/domain';

type Block = { title: string; icon: keyof typeof Ionicons.glyphMap; steps: string[] };

const BLOCKS: Block[] = [
  {
    title: '1. Lier Garmin (une seule fois)',
    icon: 'link',
    steps: [
      'Touche « Lier Garmin Connect » ci-dessous (ou : une séance › Envoyer à Garmin › Lier Garmin Connect et envoyer).',
      'Une fenêtre Garmin s’ouvre : connecte-toi avec ton compte Garmin Connect, puis touche Autoriser.',
      'Tu reviens dans Mova : « Garmin Connect · Connecté ». C’est fini pour toujours.',
    ],
  },
  {
    title: '2. Envoyer une séance',
    icon: 'send',
    steps: [
      'Ouvre une séance de course, vélo ou natation.',
      'Touche « Envoyer à Garmin ». Un message vert confirme : la séance est sur ton calendrier Garmin Connect.',
    ],
  },
  {
    title: '3. La récupérer sur ta montre',
    icon: 'watch-outline',
    steps: [
      'Ouvre l’app Garmin Connect sur ton téléphone, montre à proximité et Bluetooth activé sur le téléphone.',
      'Tire l’écran vers le bas pour synchroniser (ou attends la synchro automatique).',
      'Sur la montre : Entraînement › Séances, ou le calendrier du jour.',
    ],
  },
  {
    title: 'Ça ne marche pas ?',
    icon: 'help-circle-outline',
    steps: [
      'La fenêtre Garmin ne s’ouvre pas : autorise les pop-ups pour Mova dans ton navigateur, puis réessaie.',
      'Tu es en mode local (sans compte Mova) : connecte-toi avec ton compte Mova, la liaison en a besoin.',
      'La montre n’apparaît pas dans Garmin Connect : appaire-la d’abord dans l’app Garmin Connect (Bluetooth).',
      'Toujours rien : utilise le fichier (câble USB) proposé après « Envoyer à Garmin ».',
    ],
  },
];

/** Mode d'emploi Garmin — même parcours sur téléphone, tablette et ordinateur. */
export default function GarminGuideScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { busy, onProviderPress, garminConfigured, remoteAuth } = useProviderIntegrations();

  const garmin: IntegrationStatus =
    state.profile.integrations.find((i) => i.provider === 'garmin') ??
    ({ provider: 'garmin', connected: false } as IntegrationStatus);

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
        <Text style={styles.lead}>
          Mova envoie la séance à ton compte Garmin Connect ; Garmin Connect la transfère ensuite à ta montre par
          Bluetooth. Le Bluetooth de la montre, c’est l’app Garmin Connect qui s’en occupe : Mova n’y touche pas.
          Marche pareil sur téléphone, tablette et ordinateur.
        </Text>

        <View style={styles.status}>
          <Ionicons
            name={garmin.connected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={garmin.connected ? colors.accent : colors.textMuted}
          />
          <Text style={styles.statusText}>
            {garmin.connected ? 'Garmin Connect · Connecté' : 'Garmin Connect · Pas encore lié'}
          </Text>
        </View>

        {!garmin.connected ? (
          garminConfigured && remoteAuth ? (
            <PrimaryButton
              label={busy === 'garmin' ? 'Connexion…' : 'Lier Garmin Connect'}
              onPress={() => onProviderPress(garmin)}
            />
          ) : (
            <Text style={styles.warn}>
              {!remoteAuth
                ? 'Connecte-toi avec ton compte Mova pour lier Garmin.'
                : 'La liaison automatique Garmin n’est pas encore activée sur cette version de Mova : utilise le fichier (câble USB).'}
            </Text>
          )
        ) : null}

        {BLOCKS.map((b) => (
          <View key={b.title} style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name={b.icon} size={20} color={colors.accent} />
              <Text style={styles.cardTitle}>{b.title}</Text>
            </View>
            {b.steps.map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.dot} />
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        ))}
      </AppScrollView>
    </SettingsScreen>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    lead: { color: colors.textMuted, lineHeight: 21, fontSize: 14 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusText: { color: colors.text, fontWeight: '700', fontSize: 15 },
    warn: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
    card: { backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: spacing.md, gap: 10 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1 },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
    stepText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  });
}
