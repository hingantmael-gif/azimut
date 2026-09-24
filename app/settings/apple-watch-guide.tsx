import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../src/ui/Text';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { isAppleWatchSchedulingAvailable } from '../../src/services/appleWatch';

type Block = { title: string; icon: keyof typeof Ionicons.glyphMap; steps: string[] };

const BLOCKS: Block[] = [
  {
    title: 'Dans l’app Mova pour iPhone : un seul geste',
    icon: 'watch-outline',
    steps: [
      'Il faut un iPhone sous iOS 17 ou plus et une Apple Watch sous watchOS 10 ou plus.',
      'Ouvre une séance › « Envoyer à Apple Watch » › « Ajouter à l’Apple Watch ». Accepte l’autorisation la première fois.',
      'La séance apparaît dans l’app Exercice de la montre, à la date prévue : les répétitions (« Répéter 8 × ») sont déjà découpées.',
    ],
  },
  {
    title: 'Depuis la version web : copier la séance',
    icon: 'copy-outline',
    steps: [
      'Le web ne peut pas parler à l’Apple Watch : Apple réserve cet accès aux vraies apps iPhone.',
      'Ouvre une séance › « Envoyer à Apple Watch » › « Copier la séance » : le résumé (étapes, répétitions, allures) est prêt.',
      'Sur la montre : app Exercice › Ajouter une séance (+) › Personnalisé, puis ajoute les étapes du résumé (les intitulés peuvent varier selon la version).',
    ],
  },
  {
    title: 'Ça ne marche pas ?',
    icon: 'help-circle-outline',
    steps: [
      '« Ajouter à l’Apple Watch » n’apparaît pas : tu es sur la version web ou sur Android. Utilise « Copier la séance ».',
      'Autorisation refusée : Réglages › Mova › active l’accès, puis réessaie.',
      'La séance n’arrive pas sur la montre : ouvre l’app Exercice sur la montre, garde l’iPhone à proximité (Bluetooth activé).',
    ],
  },
];

/** Mode d'emploi Apple Watch — dit clairement ce qui marche dans la version web et ce qui demande l'app iPhone. */
export default function AppleWatchGuideScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const native = isAppleWatchSchedulingAvailable();

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
        <Text style={styles.lead}>
          Mova ajoute la séance directement à l’app Exercice de l’Apple Watch (fonction WorkoutKit d’Apple), sans
          câble ni fichier. Cette fonction n’existe que dans l’app iPhone Mova.
        </Text>

        <View style={styles.status}>
          <Ionicons
            name={native ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={native ? colors.accent : colors.textMuted}
          />
          <Text style={styles.statusText}>
            {native ? 'Ajout direct disponible sur cet appareil' : 'Ajout direct indisponible ici · utilise « Copier la séance »'}
          </Text>
        </View>

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
    statusText: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
    card: { backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: spacing.md, gap: 10 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1 },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
    stepText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  });
}
