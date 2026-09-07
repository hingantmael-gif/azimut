import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Chip, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { useApp, todayWorkout } from '../../src/store/AppContext';
import type { MentalEnergy, MuscleSensation } from '../../src/types/domain';
import {
  hasRpeFeedbackForSession,
  isPremium,
  withPremiumXpBonus,
} from '../../src/engines/subscription';
import { RPE_SUBMIT_XP } from '../../src/engines/core';
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
        Interface à 3 clics — RPE, sensations, énergie mentale. +{rpeXp} XP (une seule fois).
      </Muted>

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
        label={`Valider (+${rpeXp} XP)`}
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
    warn: {
      marginTop: spacing.md,
      color: colors.warn,
      backgroundColor: colors.bgElevated,
      padding: spacing.md,
      borderRadius: radii.md,
    },
  });
}
