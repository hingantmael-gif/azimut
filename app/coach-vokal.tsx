import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTextInput } from '../src/ui/AppTextInput';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { useApp, todayWorkout } from '../src/store/AppContext';
import { planMatchHeadline } from '../src/engines/compliancePresentation';
import { colors, radii, spacing } from '../src/theme/tokens';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** CDC §11.B — Coach Vokal */
export default function CoachVokalScreen() {
  const { state } = useApp();
  const [q, setQ] = useState('Pourquoi ma séance a changé aujourd\'hui ?');
  const [answer, setAnswer] = useState('');
  const workout = todayWorkout(state.plan);

  const reply = () => {
    const sleep = state.health.sleep?.score ?? 0;
    const lastFb = state.feedbacks[state.feedbacks.length - 1];
    const lastAn = state.analyses[0];
    setAnswer(
      [
        `Séance du jour : ${workout?.title ?? 'repos'}.`,
        `Sommeil Garmin : ${sleep}/100.`,
        lastFb
          ? `Dernier RPE : ${lastFb.rpe}/10 · sensations : ${lastFb.muscle}.`
          : 'Pas encore de feedback RPE.',
        lastAn
          ? `Dernière fidélité au plan : ${lastAn.compliance.total}% (${planMatchHeadline(lastAn.compliance.total)}).`
          : 'Pas encore d’analyse prévu / réalisé.',
        workout?.lockedRest
          ? 'Repos Strict activé (prévention / métriques critiques).'
          : 'Plan maintenu ou ajusté selon les cas 1–4 du moteur adaptatif.',
      ].join('\n'),
    );
  };

  return (
    <Screen>
      <Title>Coach Vokal</Title>
      <Muted>Assistant vocal/IA — explications basées sommeil Garmin + RPE.</Muted>
      <View style={{ marginTop: spacing.md }}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.bike}
          title="Ton coach te répond"
          subtitle="Sommeil, RPE et plan — en langage clair"
          height={140}
        />
      </View>
      <AppTextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <PrimaryButton label="Poser la question" onPress={reply} />
      {answer ? (
        <View style={styles.card}>
          <Body>{answer}</Body>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: spacing.md,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radii.md,
    padding: 12,
    textAlignVertical: 'top',
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
});
