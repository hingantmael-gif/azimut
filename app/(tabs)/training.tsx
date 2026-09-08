import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { summarizeWorkout } from '../../src/engines/workoutPresentation';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import { useWatchWorkoutExport } from '../../src/hooks/useGarminWorkoutExport';
import { canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { shareWorkoutSession } from '../../src/engines/stravaExport';
import { hasRpeFeedbackForSession } from '../../src/engines/subscription';
import { useActionFocus } from '../../src/hooks/useActionFocus';
import { FocusTarget } from '../../src/ui/FocusTarget';
import { AppScrollView } from '../../src/ui/scrolling';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';

/** Entraînement — module coaching intégré */
export default function TrainingScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    exporting,
    autoSent,
    sendWorkout,
    todayWorkout: workout,
    sendLabel,
    resendLabel,
    hint,
    brandId,
    WatchPicker,
  } = useWatchWorkoutExport();
  const focusGarmin = useActionFocus('garmin');
  const focusStrava = useActionFocus('strava');
  const focusRpe = useActionFocus('rpe');
  const rpeDoneForToday = workout
    ? hasRpeFeedbackForSession(state.feedbacks, workout.id)
    : false;

  const onWatchSend = () => {
    if (!workout || !canSendWorkoutToWatch(workout.discipline)) return;
    void sendWorkout(workout.id, router);
  };

  const onStrava = async () => {
    if (!workout || workout.discipline === 'rest') {
      Alert.alert('Aucune séance', 'Pas de séance prévue aujourd’hui à partager.');
      return;
    }
    const result = await shareWorkoutSession(workout);
    if (result === 'shared') {
      dispatch({ type: 'EXPORT_STRAVA', workoutId: workout.id });
    }
  };

  const workoutSummary = workout ? summarizeWorkout(workout) : null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenAtmosphere intensity={0.7} />
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.greeting}>
        Bonjour {state.profile.firstName || 'athlète'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>AUJOURD&apos;HUI</Text>
        <Text style={styles.cardTitle}>{workout?.title ?? 'Repos'}</Text>
        {workout ? (
          <Text style={styles.cardMeta}>
            {workoutSummary?.durationLabel ?? '—'} ·{' '}
            {DISCIPLINE_META[workout.discipline]?.label ?? workout.discipline}
          </Text>
        ) : null}
        {workout && canSendWorkoutToWatch(workout.discipline) ? (
          <>
            <FocusTarget active={focusGarmin} style={{ marginBottom: 8 }}>
              <Pressable style={styles.primaryBtn} onPress={onWatchSend} disabled={exporting}>
                {exporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {workout.exportedToGarmin ? resendLabel : sendLabel}
                  </Text>
                )}
              </Pressable>
            </FocusTarget>
            {autoSent && workout.exportedToGarmin ? (
              <Text style={styles.autoHint}>
                Séance du jour envoyée
                {brandId === 'garmin' ? ' sur Garmin Connect' : ' vers ta montre'}
              </Text>
            ) : null}
            <Text style={styles.garminHint}>{hint}</Text>

            <FocusTarget active={focusStrava} style={{ marginTop: spacing.sm }}>
              <Pressable style={styles.secondaryBtn} onPress={() => void onStrava()}>
                <Text style={styles.secondaryBtnText}>
                  {workout.exportedToStrava
                    ? 'Renvoyer / partager vers Strava'
                    : 'Envoyer vers Strava'}
                </Text>
              </Pressable>
            </FocusTarget>

            <Pressable style={styles.linkBtn} onPress={() => router.push(`/session/${workout.id}`)}>
              <Text style={styles.linkBtnText}>Détails de la séance</Text>
            </Pressable>
          </>
        ) : workout && workout.discipline !== 'rest' ? (
          <>
            <FocusTarget active={focusStrava} style={{ marginTop: spacing.sm }}>
              <Pressable style={styles.secondaryBtn} onPress={() => void onStrava()}>
                <Text style={styles.secondaryBtnText}>
                  {workout.exportedToStrava
                    ? 'Renvoyer / partager vers Strava'
                    : 'Envoyer vers Strava'}
                </Text>
              </Pressable>
            </FocusTarget>
            <Pressable style={styles.linkBtn} onPress={() => router.push(`/session/${workout.id}`)}>
              <Text style={styles.linkBtnText}>Détails de la séance</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricV}>{state.health.sleep?.score ?? '—'}</Text>
          <Text style={styles.metricL}>Sommeil</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricV}>{state.profile.ranked.xp}</Text>
          <Text style={styles.metricL}>XP</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricV}>{state.banister.formTsb.toFixed(0)}</Text>
          <Text style={styles.metricL}>Forme</Text>
        </View>
      </View>

      {!rpeDoneForToday ? (
        <FocusTarget active={focusRpe} style={{ marginTop: spacing.sm }}>
          <Pressable style={styles.row} onPress={() => router.push('/session/rpe')}>
            <Text style={styles.rowText}>Effort ressenti (RPE)</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </FocusTarget>
      ) : null}
      <Pressable style={styles.row} onPress={() => router.push('/coach-vokal')}>
        <Text style={styles.rowText}>Coach</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </AppScrollView>
    {WatchPicker}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    greeting: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      padding: spacing.md,
      paddingBottom: spacing.sm,
    },
    card: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 },
    cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
    cardMeta: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    secondaryBtn: {
      backgroundColor: colors.bgElevated,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
    autoHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
      textAlign: 'center',
    },
    garminHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    linkBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
    linkBtnText: { color: colors.accent, fontWeight: '600' },
    metrics: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    metric: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: spacing.md,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    metricV: { fontSize: 18, fontWeight: '800', color: colors.text },
    metricL: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    row: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    chevron: { fontSize: 20, color: colors.textMuted },
  });
}
