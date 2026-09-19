import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Chip, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { resolveDigitalTwin, todayWorkout, useApp } from '../../src/store/AppContext';
import type { MentalEnergy, MuscleSensation } from '../../src/types/domain';
import {
  hasRpeFeedbackForSession,
  isPremium,
  withPremiumXpBonus,
} from '../../src/engines/subscription';
import { RPE_SUBMIT_XP } from '../../src/engines/core';
import { predictSessionRpe } from '../../src/engines/sessionPrediction';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { safeGoBack } from '../../src/ui/navigation/AlwaysBackButton';

/** CDC §2.B — Feedback 3 clics (une fois par séance) */
export default function RpeScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { sessionId: paramSessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const workout = todayWorkout(state.plan);
  const sessionId =
    paramSessionId ??
    state.pendingRpeActivityId ??
    state.analyses[0]?.activityId ??
    workout?.id ??
    'unknown';
  const alreadyDone = hasRpeFeedbackForSession(state.feedbacks, sessionId);
  const [rpe, setRpe] = useState(5);
  const [muscle, setMuscle] = useState<MuscleSensation>('aucune_gene');
  const [mental, setMental] = useState<MentalEnergy>('neutre');
  const rpeXp = withPremiumXpBonus(RPE_SUBMIT_XP, isPremium(state.profile.plan));

  const twin = useMemo(() => resolveDigitalTwin(state), [state.profile]);
  const plannedForPred =
    state.plan.find((p) => p.id === sessionId) ??
    (() => {
      const an = state.analyses.find(
        (a) => a.activityId === sessionId || a.plannedWorkoutId === sessionId,
      );
      return an ? state.plan.find((p) => p.id === an.plannedWorkoutId) : workout;
    })();

  const predictedRpe = useMemo(() => {
    if (state.pendingPredictedRpe != null) return state.pendingPredictedRpe;
    if (!plannedForPred || plannedForPred.discipline === 'rest') return null;
    const ready = state.health.sleep?.score ?? 65;
    return predictSessionRpe(plannedForPred, ready, twin.response.rpeBias);
  }, [
    state.pendingPredictedRpe,
    plannedForPred,
    state.health.sleep?.score,
    twin.response.rpeBias,
  ]);

  if (alreadyDone) {
    const existing = state.feedbacks.find((f) => f.sessionId === sessionId);
    return (
      <Screen>
        <Title>Feedback déjà envoyé</Title>
        <Muted style={{ marginTop: spacing.sm, lineHeight: 20 }}>
          Tu as déjà renseigné l’effort ressenti pour cette séance
          {existing ? ` (RPE ${existing.rpe}/10)` : ''}. Pas de nouvel XP — un seul retour par
          séance.
        </Muted>
        <PrimaryButton
          label="Retour"
          onPress={() => safeGoBack(router, '/(tabs)')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Feedback post-séance</Title>
      <Muted>
        Interface à 3 clics — RPE, sensations, énergie. Le coach personnalise la suite.
        (+{rpeXp} XP une seule fois)
      </Muted>

      {predictedRpe != null ? (
        <View style={styles.predBox}>
          <Text style={styles.predLabel}>RPE prédit par le coach</Text>
          <Text style={styles.predValue}>~{predictedRpe}/10</Text>
          <Muted style={{ marginTop: 4 }}>
            Compare avec ton ressenti — l’écart affine ton jumeau numérique.
          </Muted>
        </View>
      ) : null}

      <Body style={{ marginTop: spacing.lg }}>RPE (Borg 1–10) : {rpe}</Body>
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Chip key={n} label={String(n)} selected={rpe === n} onPress={() => setRpe(n)} />
        ))}
      </View>
      <Muted>1 Tranquille → 10 Effort maximal</Muted>

      <Body style={{ marginTop: spacing.lg }}>Sensations musculaires</Body>
      <View style={styles.row}>
        <Chip
          label="Aucune gêne"
          selected={muscle === 'aucune_gene'}
          onPress={() => setMuscle('aucune_gene')}
        />
        <Chip
          label="Courbatures normales"
          selected={muscle === 'courbatures'}
          onPress={() => setMuscle('courbatures')}
        />
        <Chip
          label="Douleur ciblée"
          selected={muscle === 'douleur_ciblee'}
          onPress={() => setMuscle('douleur_ciblee')}
        />
      </View>

      <Body style={{ marginTop: spacing.lg }}>Plaisir & énergie mentale</Body>
      <View style={styles.row}>
        <Chip label="Excellent" selected={mental === 'excellent'} onPress={() => setMental('excellent')} />
        <Chip label="Neutre" selected={mental === 'neutre'} onPress={() => setMental('neutre')} />
        <Chip label="Épuisé/Pénible" selected={mental === 'epuise'} onPress={() => setMental('epuise')} />
      </View>

      <PrimaryButton
        label="Valider mon feedback"
        onPress={() => {
          dispatch({
            type: 'SUBMIT_RPE',
            feedback: {
              sessionId,
              rpe,
              muscle,
              mental,
              submittedAt: new Date().toISOString(),
            },
          });
          safeGoBack(router, '/(tabs)');
        }}
      />
      {muscle === 'douleur_ciblee' ? (
        <Text style={styles.warn}>
          Cas 3 : la prochaine séance pourra être remplacée par repos/mobilité.
        </Text>
      ) : null}
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
    predBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    predLabel: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: colors.accentDark,
    },
    predValue: {
      marginTop: 4,
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
    },
    warn: {
      marginTop: spacing.md,
      color: colors.warn,
      backgroundColor: colors.bgElevated,
      padding: spacing.md,
      borderRadius: radii.md,
    },
  });
}
