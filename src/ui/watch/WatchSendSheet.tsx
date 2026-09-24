import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Text } from '../Text';
import { PhoneModal } from '../PhoneModal';
import { PrimaryButton, SecondaryButton } from '../primitives';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { WatchSendOutcome } from '../../utils/watchWorkoutExport';

/**
 * Résultat d'un envoi vers la montre : UNE feuille, des étapes numérotées, un bouton par action possible.
 * Remplace la pile d'alertes système (souvent vides ou illisibles sur le web).
 */
export function WatchSendSheet({
  outcome,
  busy,
  linking = false,
  onLinkGarmin,
  onClose,
}: {
  outcome: WatchSendOutcome | null;
  busy: boolean;
  linking?: boolean;
  onLinkGarmin?: (workoutId: string) => void;
  onClose: () => void;
}) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [retrying, setRetrying] = useState(false);

  const visible = busy || (outcome != null && outcome.status !== 'cancelled');

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {busy || !outcome ? (
            <View style={styles.center}>
              <Ionicons name="watch-outline" size={40} color={colors.accent} />
              <Text style={styles.title}>Préparation de la séance…</Text>
            </View>
          ) : outcome.status === 'pushed' ? (
            <>
              <View style={styles.center}>
                <Ionicons name="checkmark-circle" size={44} color={colors.accent} />
                <Text style={styles.title}>{outcome.title}</Text>
                <Text style={styles.body}>{outcome.message}</Text>
              </View>
              <PrimaryButton label="OK" onPress={onClose} />
            </>
          ) : outcome.status === 'file' ? (
            <>
              <View style={styles.center}>
                <Ionicons name={outcome.delivered ? 'checkmark-circle' : 'download-outline'} size={44} color={colors.accent} />
                <Text style={styles.title}>{outcome.title}</Text>
                <Text style={styles.body}>
                  {outcome.note ?? 'Ta séance est prête. Voici comment la mettre sur ta montre :'}
                </Text>
              </View>
              {outcome.canLinkGarmin && onLinkGarmin ? (
                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton
                    label={linking ? 'Connexion à Garmin…' : 'Lier Garmin Connect et envoyer'}
                    onPress={() => onLinkGarmin(outcome.workoutId)}
                  />
                </View>
              ) : null}
              <Text style={[styles.body, { marginTop: spacing.md, fontWeight: '700', color: colors.text }]}>
                {outcome.brandId === 'garmin' ? 'Sans lier : par câble USB' : 'Étapes'}
              </Text>
              <View style={{ gap: 10, marginVertical: spacing.sm }}>
                {outcome.steps.map((s, i) => (
                  <View key={i} style={styles.step}>
                    <View style={styles.stepN}>
                      <Text style={styles.stepNText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{s}</Text>
                  </View>
                ))}
              </View>
              {!outcome.delivered ? (
                <SecondaryButton
                  label={retrying ? 'Téléchargement…' : 'Télécharger à nouveau'}
                  onPress={() => {
                    setRetrying(true);
                    void outcome.retry().finally(() => setRetrying(false));
                  }}
                />
              ) : null}
              {outcome.brandId === 'garmin' ? (
                <SecondaryButton
                  label="Mode d’emploi Garmin"
                  onPress={() => {
                    onClose();
                    router.push('/settings/garmin-guide' as Href);
                  }}
                />
              ) : null}
              <PrimaryButton label="Terminé" onPress={onClose} />
            </>
          ) : outcome.status === 'error' ? (
            <>
              <View style={styles.center}>
                <Ionicons name="alert-circle" size={44} color={colors.danger} />
                <Text style={styles.title}>{outcome.title}</Text>
                <Text style={styles.body}>{outcome.message}</Text>
              </View>
              <PrimaryButton label="OK" onPress={onClose} />
            </>
          ) : null}
        </View>
      </View>
    </PhoneModal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.md },
    card: { backgroundColor: colors.bgElevated, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.xs },
    center: { alignItems: 'center', gap: 8 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
    body: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    stepN: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepNText: { color: colors.onAccent, fontWeight: '800', fontSize: 13 },
    stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  });
}
