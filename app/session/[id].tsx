import { useAmbientSport } from '../../src/theme/AmbientSport';
import { useMemo, useState } from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { Text } from '../../src/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Body,
  Muted,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Title,
} from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import {
  formatPeriodization,
  formatVmaHint,
  summarizeWorkout,
} from '../../src/engines/workoutPresentation';
import {
  isCalisthenicsWorkout,
  parseCalisExerciseIdFromStepLabel,
  stripCalisStepLabel,
} from '../../src/engines/calisthenicsProgramming';
import { canStartGuidedStrengthSession, visualKeyFor } from '../../src/engines/guidedStrengthSession';
import {
  calisthenicsDemoImage,
  COVER_CROP_CENTER,
  coverCropImageStyle,
  guidedExerciseImage,
} from '../../src/constants/sportVisuals';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import {
  canAccessSessionRpe,
  hasRpeFeedbackForSession,
} from '../../src/engines/subscription';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { canSendWorkoutToStrava, canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { canStartLiveWorkout } from '../../src/engines/liveWorkout';
import { exportWorkoutToStrava } from '../../src/engines/stravaExport';
import { useWatchWorkoutExport } from '../../src/hooks/useGarminWorkoutExport';
import { useActionFocus } from '../../src/hooks/useActionFocus';
import { FocusTarget } from '../../src/ui/FocusTarget';
import { AppScrollView } from '../../src/ui/scrolling';
import { appConfirm } from '../../src/utils/appAlert';
import { safeGoBack } from '../../src/ui/navigation/AlwaysBackButton';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors, custom: customTheme } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const workout = state.plan.find((w) => w.id === id);
  useAmbientSport(workout?.discipline);
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
  const [showFullSteps, setShowFullSteps] = useState(false);

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
  const isCalis = isCalisthenicsWorkout(workout);
  const isShortSession =
    workout.discipline === 'mobility' ||
    workout.discipline === 'ppg' ||
    /gainage/i.test(workout.title);
  const canWatchSend = canSendWorkoutToWatch(workout.discipline);
  const canStravaSend = canSendWorkoutToStrava(workout.discipline);
  const rpeAlreadyDone = hasRpeFeedbackForSession(state.feedbacks, workout.id);
  const canMarkDone =
    !isRest && !rpeAlreadyDone && (isCalis || isShortSession);
  const canGuided =
    !isRest && !rpeAlreadyDone && canStartGuidedStrengthSession(workout);
  const canRpe =
    !isCalis &&
    !isShortSession &&
    !isRest &&
    !rpeAlreadyDone &&
    canAccessSessionRpe(workout.date, todayIso);
  const discColor = (customTheme ? undefined : DISCIPLINE_META[workout.discipline]?.color) ?? colors.accent;

  const dateLabel = new Date(workout.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let watchHint = '';
  if (!canWatchSend) {
    watchHint = isRest
      ? 'Pas d’export pour un jour de repos.'
      : isShortSession
        ? 'Séance courte (gainage / mobilité) — pas besoin d’envoyer à la montre. Marque-la comme faite ou retire-la du plan.'
        : '';
  } else if (workout.exportedToGarmin) {
    watchHint = 'Séance déjà envoyée vers ta montre — tu peux renvoyer si besoin.';
  } else {
    watchHint = hint;
  }

  const markSessionDone = () => {
    dispatch({ type: 'COMPLETE_SESSION_DONE', sessionId: workout.id });
    safeGoBack(router, '/(tabs)');
  };

  const removeFromPlan = async () => {
    const ok = await appConfirm(
      'Retirer du plan',
      `Retirer « ${workout.title} » du plan ?`,
      'Retirer',
      'Annuler',
    );
    if (!ok) return;
    dispatch({ type: 'REMOVE_WORKOUT', id: workout.id });
    safeGoBack(router, '/(tabs)/calendar');
  };

  const onWatchPress = () => {
    if (!canWatchSend || exporting) return;
    void sendWorkout(workout.id, router);
  };

  const onStravaPress = async () => {
    if (isRest) return;
    const result = await exportWorkoutToStrava(
      workout,
      state.activities,
      state.analyses,
      state.profile,
    );
    if (result === 'ok') {
      dispatch({ type: 'EXPORT_STRAVA', workoutId: workout.id });
    } else if (result === 'paywall') {
      router.push('/settings/subscription');
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

        {canGuided ? (
          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              label="Commencer la séance guidée"
              onPress={() => router.push({ pathname: '/session/guided', params: { id: workout.id } })}
            />
          </View>
        ) : null}

        {vmaHint ? (
          <Muted style={{ marginTop: spacing.sm }}>{vmaHint} · allures offline</Muted>
        ) : null}

        {workout.coachNote && !canGuided ? (
          <View style={styles.coachBox}>
            <Text style={styles.coachLabel}>Note du coach</Text>
            <Body style={{ marginTop: 4 }}>{workout.coachNote}</Body>
          </View>
        ) : null}

        <Body style={{ marginTop: spacing.lg, fontWeight: '700' }}>Déroulé</Body>
        {canGuided ? (
          <Muted style={{ marginTop: 4, marginBottom: 4 }}>
            {workout.steps.filter((s) => s.type === 'active').length} exercices · séance guidée
            avec chrono et images
          </Muted>
        ) : null}
        {!canGuided && !isCalis
          ? (showFullSteps ? summary.fullStepLines : summary.stepLines).map((line, i) => (
              <View key={`${workout.id}-cline-${i}`} style={styles.step}>
                <View style={[styles.stepDot, { backgroundColor: discColor }]} />
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '700' }}>{line.title}</Body>
                  {line.detail ? <Muted>{line.detail}</Muted> : null}
                </View>
              </View>
            ))
          : null}
        {!canGuided && !isCalis && summary.fullStepLines.length > summary.stepLines.length ? (
          <Pressable
            onPress={() => setShowFullSteps((v) => !v)}
            accessibilityRole="button"
            style={{ marginTop: spacing.sm }}
          >
            <Body style={{ color: colors.accent, fontWeight: '700' }}>
              {showFullSteps ? 'Masquer le détail' : 'Voir le détail complet'}
            </Body>
          </Pressable>
        ) : null}
        {(canGuided || isCalis ? (canGuided ? workout.steps.filter((s) => s.type === 'active') : workout.steps) : []).map(
          (step, i) => {
            const calisId = parseCalisExerciseIdFromStepLabel(step.label);
            const raw = stripCalisStepLabel(step.label ?? '');
            const title = raw.split('·')[0].trim() || raw;
            const shortDetail = raw.includes('·')
              ? raw
                  .split('·')
                  .slice(1, 3)
                  .join(' · ')
                  .replace(/\s*[—–].*$/, '')
                  .trim()
              : summary.stepLines[i]?.detail;
            const demo =
              calisthenicsDemoImage(calisId) ??
              (canGuided ? guidedExerciseImage(visualKeyFor(title, calisId)) : undefined);
            return (
              <View key={`${workout.id}-line-${step.id}-${i}`} style={styles.step}>
                {demo ? (
                  <Image
                    source={demo}
                    style={[styles.demoThumb, coverCropImageStyle(COVER_CROP_CENTER)]}
                    resizeMode="cover"
                    accessibilityLabel="Démonstration"
                  />
                ) : (
                  <View style={[styles.stepDot, { backgroundColor: discColor }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: '700' }} numberOfLines={1}>
                    {title}
                  </Body>
                  {shortDetail ? (
                    <Muted numberOfLines={1}>{shortDetail}</Muted>
                  ) : null}
                </View>
              </View>
            );
          },
        )}


        {!isRest && canStartLiveWorkout(workout.discipline) ? (
          <>
            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton
                label="Démarrer la séance dans Mova"
                onPress={() =>
                  router.push({ pathname: '/session/live', params: { id: workout.id } })
                }
              />
            </View>
            <Muted style={{ marginTop: 6 }}>
              Tracker GPS : carte interactive, chrono, distance et allure — comme Strava, dans Mova.
            </Muted>
          </>
        ) : null}

        {canWatchSend ? (
          <>
            <FocusTarget active={focusGarmin} style={{ marginTop: spacing.sm }}>
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
        ) : watchHint ? (
          <Muted style={{ marginTop: spacing.md }}>{watchHint}</Muted>
        ) : null}

        {canStravaSend ? (
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
        ) : null}

        {canMarkDone && !canGuided ? (
          <View style={{ marginTop: spacing.sm }}>
            <PrimaryButton
              label="Marquer comme faite"
              onPress={markSessionDone}
            />
            <Muted style={{ marginTop: 6 }}>
              {isCalis
                ? 'Callisthénie : pas de feedback RPE — valide quand tu as terminé.'
                : 'Séance courte : valide dès que c’est fait — pas besoin de GPS ni de montre.'}
            </Muted>
          </View>
        ) : null}

        {(isCalis || isShortSession) && rpeAlreadyDone ? (
          <Muted style={{ marginTop: spacing.sm }}>Séance déjà validée.</Muted>
        ) : null}

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
        ) : !isCalis && !isShortSession && rpeAlreadyDone ? (
          <Muted style={{ marginTop: spacing.sm }}>
            Feedback RPE déjà enregistré pour cette séance.
          </Muted>
        ) : !isCalis && !isShortSession && !isRest ? (
          <Muted style={{ marginTop: spacing.sm }}>
            RPE dispo dès 3 jours avant la séance, le jour J, et après.
          </Muted>
        ) : null}

        {!isRest && !workout.lockedRest ? (
          <View style={{ marginTop: spacing.md }}>
            <SecondaryButton label="Retirer du plan" onPress={() => void removeFromPlan()} />
            <Muted style={{ marginTop: 6, color: colors.danger }}>
              Retire la séance du calendrier sans la marquer comme faite.
            </Muted>
          </View>
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
    demoThumb: {
      width: 72,
      height: 72,
      borderRadius: radii.md,
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
