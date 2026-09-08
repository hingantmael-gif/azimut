import { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import {
  formatPeriodization,
  formatVmaHint,
  summarizeWorkout,
} from '../../src/engines/workoutPresentation';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import {
  canAccessSessionRpe,
  hasRpeFeedbackForSession,
} from '../../src/engines/subscription';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { shareWorkoutSession } from '../../src/engines/stravaExport';
import { useWatchWorkoutExport } from '../../src/hooks/useGarminWorkoutExport';
import { useActionFocus } from '../../src/hooks/useActionFocus';
import { FocusTarget } from '../../src/ui/FocusTarget';
import { AppScrollView } from '../../src/ui/scrolling';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const workout = state.plan.find((w) => w.id === id);
  const {
    exporting,
    sendWorkout,
    sendLabel,
    resendLabel,
    hint,
    WatchPicker,
  } = useWatchWorkoutExport();
  const focusGarmin = useActionFocus('garmin');
  const focusStrava = useActionFocus('strava');
  const focusRpe = useActionFocus('rpe');

  if (!workout) {
    return (
      <Screen>
        <Title>Séance introuvable</Title>
      </Screen>
    );
  }

  const summary = summarizeWorkout(workout);
  const vmaHint = formatVmaHint(state.profile.onboarding, state.activities);
  const todayIso = new Date().toISOString().slice(0, 10);
  const isRest = workout.discipline === 'rest';
  const canWatchSend = canSendWorkoutToWatch(workout.discipline);
  const rpeAlreadyDone = hasRpeFeedbackForSession(state.feedbacks, workout.id);
  const canRpe =
    !isRest && !rpeAlreadyDone && canAccessSessionRpe(workout.date, todayIso);
  const discColor = DISCIPLINE_META[workout.discipline]?.color ?? colors.accent;

  const dateLabel = new Date(workout.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let watchHint = '';
  if (!canWatchSend) {
    watchHint = isRest
      ? 'Pas d’export pour un jour de repos.'
      : 'Course, vélo, natation et musculation uniquement — cette séance ne peut pas être envoyée telle quelle.';
  } else if (workout.exportedToGarmin) {
    watchHint = 'Séance déjà envoyée vers ta montre — tu peux renvoyer si besoin.';
  } else {
    watchHint = hint;
  }

  const onWatchPress = () => {
    if (!canWatchSend || exporting) return;
    void sendWorkout(workout.id, router);
  };

  const onStravaPress = async () => {
    if (isRest) return;
    const result = await shareWorkoutSession(workout);
    if (result === 'shared') {
      dispatch({ type: 'EXPORT_STRAVA', workoutId: workout.id });
    }
  };

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.banner, { backgroundColor: `${discColor}18` }]}>
          <Text style={[styles.bannerTag, { color: discColor }]}>
            {DISCIPLINE_META[workout.discipline]?.label ?? workout.discipline}
          </Text>
          <Title>{workout.title}</Title>
          <Muted>
            {dateLabel}
            {workout.periodization
              ? ` · Phase ${formatPeriodization(workout.periodization)}`
              : ''}
          </Muted>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Durée</Text>
            <Text style={styles.summaryValue}>{summary.durationLabel}</Text>
          </View>
          {summary.distanceLabel ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Distance</Text>
              <Text style={styles.summaryValue}>{summary.distanceLabel}</Text>
            </View>
          ) : null}
          {workout.expectedRpe ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Effort visé</Text>
              <Text style={styles.summaryValue}>RPE {workout.expectedRpe}/10</Text>
            </View>
          ) : null}
        </View>

        {vmaHint ? (
          <Muted style={{ marginTop: spacing.sm }}>{vmaHint} · allures offline</Muted>
        ) : null}

        {workout.coachNote ? (
          <View style={styles.coachBox}>
            <Text style={styles.coachLabel}>Note du coach</Text>
            <Body style={{ marginTop: 4 }}>{workout.coachNote}</Body>
          </View>
        ) : null}

        <Body style={{ marginTop: spacing.lg, fontWeight: '700' }}>Déroulé</Body>
        {summary.stepLines.map((line, i) => (
          <View key={`${workout.id}-line-${i}`} style={styles.step}>
            <View style={[styles.stepDot, { backgroundColor: discColor }]} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '700' }}>{line.title}</Body>
              <Muted>{line.detail}</Muted>
            </View>
          </View>
        ))}

        {canWatchSend ? (
          <>
            <FocusTarget active={focusGarmin} style={{ marginTop: spacing.md }}>
              <PrimaryButton
                label={
                  exporting
                    ? 'Préparation…'
                    : workout.exportedToGarmin
                      ? resendLabel
                      : sendLabel
                }
                onPress={onWatchPress}
                disabled={exporting}
              />
            </FocusTarget>
            <Muted style={{ marginTop: 6 }}>{watchHint}</Muted>
          </>
        ) : (
          <Muted style={{ marginTop: spacing.md }}>{watchHint}</Muted>
        )}

        <FocusTarget active={focusStrava} style={{ marginTop: spacing.sm }}>
          <PrimaryButton
            label={
              workout.exportedToStrava
                ? 'Renvoyer / partager vers Strava'
                : 'Envoyer vers Strava'
            }
            disabled={isRest}
            onPress={() => void onStravaPress()}
          />
        </FocusTarget>

        {canRpe ? (
          <FocusTarget active={focusRpe} style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label="Feedback RPE"
              onPress={() =>
                router.push({
                  pathname: '/session/rpe',
                  params: { sessionId: workout.id },
                })
              }
            />
          </FocusTarget>
        ) : rpeAlreadyDone ? (
          <Muted style={{ marginTop: spacing.sm }}>
            Feedback RPE déjà enregistré pour cette séance.
          </Muted>
        ) : !isRest ? (
          <Muted style={{ marginTop: spacing.sm }}>
            RPE dispo dès 3 jours avant la séance, le jour J, et après.
          </Muted>
        ) : null}
      </AppScrollView>
      {WatchPicker}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    banner: {
      padding: spacing.md,
      borderRadius: radii.lg,
      marginBottom: spacing.sm,
    },
    bannerTag: { fontWeight: '800', fontSize: 12, marginBottom: 4 },
    summary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    summaryItem: {
      flexGrow: 1,
      minWidth: 100,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    summaryValue: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
    step: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 6,
    },
    coachBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}12`,
    },
    coachLabel: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });
}
