import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  DISCIPLINE_META,
  disciplineColor,
} from '../../src/constants/disciplines';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import type { SportDiscipline } from '../../src/types/domain';
import { hasRpeFeedbackForSession } from '../../src/engines/subscription';
import { canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { useWatchWorkoutExport } from '../../src/hooks/useGarminWorkoutExport';
import { useActionFocus } from '../../src/hooks/useActionFocus';
import { FocusTarget } from '../../src/ui/FocusTarget';
import { AppScrollView } from '../../src/ui/scrolling';

const RECORD_MODES: Array<{
  id: SportDiscipline;
  desc: string;
}> = [
  { id: 'run', desc: 'Course, piste, trail, VMA, sortie longue' },
  { id: 'bike', desc: 'Vélo route, home trainer, cyclo' },
  { id: 'swim', desc: 'Natation piscine ou eau libre' },
  { id: 'brick', desc: 'Natation + vélo + course (enchaînement)' },
  { id: 'strength', desc: 'Musculation, renforcement, salle' },
];

/** Enregistrer — choix du type de sport puis actions */
export default function RecordScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sport, setSport] = useState<SportDiscipline>('run');
  const { sendWorkout, sendLabel, WatchPicker, exporting } = useWatchWorkoutExport();
  const focusGarmin = useActionFocus('garmin');

  const workout = state.plan.find(
    (w) => w.date === new Date().toISOString().slice(0, 10) && w.discipline !== 'rest',
  );
  const rpeDone = workout
    ? hasRpeFeedbackForSession(state.feedbacks, workout.id)
    : false;
  const sendToWatch = () => {
    if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
      Alert.alert(
        'Envoi impossible',
        'Seules les séances course, vélo, natation et musculation peuvent être envoyées à la montre.',
      );
      return;
    }
    void sendWorkout(workout.id, router);
  };

  return (
    <>
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Enregistrer</Text>
      <Text style={styles.sub}>Choisissez le type d&apos;activité pour optimiser le suivi.</Text>

      <Text style={styles.sectionLabel}>Type de sport</Text>
      <View style={styles.grid}>
        {RECORD_MODES.map((m) => {
          const meta = DISCIPLINE_META[m.id];
          const selected = sport === m.id;
          return (
            <Pressable
              key={m.id}
              style={[
                styles.sportCard,
                selected && { borderColor: meta.color, backgroundColor: `${meta.color}18` },
              ]}
              onPress={() => setSport(m.id)}
            >
              <View style={[styles.dot, { backgroundColor: meta.color }]} />
              <Text style={styles.sportTitle}>{meta.label}</Text>
              <Text style={styles.sportDesc}>{m.desc}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Actions · {DISCIPLINE_META[sport].label}</Text>

      {workout && canSendWorkoutToWatch(workout.discipline) ? (
        <FocusTarget active={focusGarmin}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: disciplineColor(sport) }]}
            onPress={sendToWatch}
            disabled={exporting}
          >
            <Text style={styles.actionBtnText}>
              {exporting ? 'Préparation…' : sendLabel}
            </Text>
          </Pressable>
        </FocusTarget>
      ) : null}

      {!rpeDone ? (
        <Pressable style={styles.actionBtnOutline} onPress={() => router.push('/session/rpe')}>
          <Text style={styles.actionBtnOutlineText}>Feedback RPE post-séance</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.actionBtnOutline}
        onPress={() => router.push('/(tabs)/body')}
      >
        <Text style={styles.actionBtnOutlineText}>Voir impact sur le corps</Text>
      </Pressable>
    </AppScrollView>
    {WatchPicker}
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary, padding: spacing.md },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    sub: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg, lineHeight: 20 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    grid: { gap: spacing.sm },
    sportCard: {
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    dot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
    sportTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
    sportDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    actionBtn: {
      paddingVertical: 16,
      borderRadius: radii.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    actionBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    premiumNote: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    actionBtnOutline: {
      paddingVertical: 14,
      borderRadius: radii.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    actionBtnOutlineText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  });
}
