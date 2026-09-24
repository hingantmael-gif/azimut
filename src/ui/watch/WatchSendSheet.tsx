import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Text } from '../Text';
import { PhoneModal } from '../PhoneModal';
import { PrimaryButton, SecondaryButton } from '../primitives';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { WatchSendOutcome } from '../../utils/watchWorkoutExport';
import { copyTextToClipboard } from '../../utils/deviceKind';
import { openGarminConnect } from '../../services/integrationLinks';

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
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
            <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
              <FileOutcome outcome={outcome} linking={linking} onLinkGarmin={onLinkGarmin} onClose={onClose} />
            </ScrollView>
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

type FileOutcomeData = Extract<WatchSendOutcome, { status: 'file' }>;

/** Feuille « fichier / étapes » : rien ne se télécharge tout seul, chaque action est un bouton. */
function FileOutcome({
  outcome,
  linking,
  onLinkGarmin,
  onClose,
}: {
  outcome: FileOutcomeData;
  linking: boolean;
  onLinkGarmin?: (workoutId: string) => void;
  onClose: () => void;
}) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const mobileGarmin = outcome.brandId === 'garmin' && outcome.device !== 'desktop';

  const copy = async () => {
    const ok = await copyTextToClipboard(outcome.briefText);
    if (ok) {
      outcome.markPrepared();
      setCopied(true);
    }
  };
  const download = async () => {
    setDownloaded('busy');
    setDownloaded((await outcome.download()) ? 'done' : 'failed');
  };

  return (
    <>
      <View style={styles.center}>
        <Ionicons name="watch-outline" size={40} color={colors.accent} />
        <Text style={styles.title}>{outcome.title}</Text>
        <Text style={styles.body}>
          {outcome.note ??
            (mobileGarmin
              ? 'Depuis un téléphone, le plus rapide : copier la séance et la recréer dans Garmin Connect.'
              : 'Voici comment mettre la séance sur ta montre :')}
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

      <View style={{ gap: 10, marginVertical: spacing.md }}>
        {outcome.steps.map((st, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepN}>
              <Text style={styles.stepNText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{st}</Text>
          </View>
        ))}
      </View>

      {mobileGarmin ? (
        <View style={{ gap: 8 }}>
          <PrimaryButton label={copied ? 'Séance copiée ✓' : 'Copier la séance'} onPress={() => void copy()} />
          <SecondaryButton
            label="Ouvrir Garmin Connect"
            onPress={() => {
              void openGarminConnect();
            }}
          />
        </View>
      ) : null}

      <View style={{ gap: 8, marginTop: 8 }}>
        {mobileGarmin ? (
          <Text style={[styles.body, { textAlign: 'left', fontSize: 12 }]}>
            Un ordinateur avec câble USB ? Le fichier .fit se copie dans GARMIN › NewFiles.
          </Text>
        ) : null}
        {mobileGarmin ? (
          <SecondaryButton
            label={
              downloaded === 'busy'
                ? 'Préparation…'
                : downloaded === 'done'
                  ? 'Fichier téléchargé ✓'
                  : downloaded === 'failed'
                    ? 'Échec — réessayer le fichier'
                    : 'Télécharger le fichier (.fit)'
            }
            onPress={() => void download()}
          />
        ) : (
          <PrimaryButton
            label={
              downloaded === 'busy'
                ? 'Préparation…'
                : downloaded === 'done'
                  ? 'Fichier téléchargé ✓'
                  : downloaded === 'failed'
                    ? 'Échec — réessayer'
                    : 'Télécharger le fichier'
            }
            onPress={() => void download()}
          />
        )}
        {outcome.brandId === 'garmin' ? (
          <SecondaryButton
            label="Mode d’emploi Garmin"
            onPress={() => {
              onClose();
              router.push('/settings/garmin-guide' as Href);
            }}
          />
        ) : null}
        <SecondaryButton label="Terminé" onPress={onClose} />
      </View>
    </>
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
