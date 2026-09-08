import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTextInput } from '../src/ui/AppTextInput';
import { Body, Muted, PrimaryButton, Screen, Title } from '../src/ui/primitives';
import { nextTrainingWorkout, todayWorkout, useApp } from '../src/store/AppContext';
import { planMatchHeadline } from '../src/engines/compliancePresentation';
import { DISCIPLINE_META } from '../src/constants/disciplines';
import { colors, radii, spacing } from '../src/theme/tokens';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** CDC §11.B — Coach Vokal : réponses branchées sur le plan réel */
export default function CoachVokalScreen() {
  const { state } = useApp();
  const [q, setQ] = useState('Pourquoi ma séance a changé aujourd\'hui ?');
  const [answer, setAnswer] = useState('');
  const workout = todayWorkout(state.plan);
  const next = nextTrainingWorkout(state.plan);

  const reply = () => {
    const sleep = state.health.sleep?.score;
    const lastFb = state.feedbacks[state.feedbacks.length - 1];
    const lastAn = state.analyses[0];
    const adaptation = state.coachAdaptations?.[0];
    const qLower = q.toLowerCase();

    const lines: string[] = [];

    if (qLower.includes('chang') || qLower.includes('pourquoi') || qLower.includes('ajust')) {
      if (adaptation) {
        lines.push(`Dernier ajustement coach : ${adaptation}`);
      } else if (workout?.coachNote) {
        lines.push(`Note sur la séance du jour : ${workout.coachNote}`);
      } else {
        lines.push(
          'Pas d’ajustement récent — le plan suit la périodisation prévue. Un RPE élevé ou un mauvais sommeil peut alléger la séance suivante.',
        );
      }
    }

    lines.push(
      `Séance focus : ${workout?.title ?? 'repos'} (${DISCIPLINE_META[workout?.discipline ?? 'rest']?.label ?? 'Repos'}).`,
    );
    if (workout?.coachNote && !lines.some((l) => l.includes(workout.coachNote!))) {
      lines.push(workout.coachNote);
    }
    if (next && next.id !== workout?.id) {
      lines.push(
        `Prochaine séance : ${next.title}${next.coachNote ? ` — ${next.coachNote}` : ''}`,
      );
    }
    if (sleep != null) {
      lines.push(`Sommeil : ${sleep}/100.`);
    }
    if (lastFb) {
      lines.push(`Dernier RPE : ${lastFb.rpe}/10 · sensations : ${lastFb.muscle}.`);
    } else {
      lines.push('Pas encore de feedback RPE — valide une séance pour que j’adapte la suite.');
    }
    if (lastAn) {
      lines.push(
        `Fidélité au plan : ${lastAn.compliance.total}% (${planMatchHeadline(lastAn.compliance.total)}).`,
      );
    }
    if (workout?.lockedRest) {
      lines.push('Repos strict activé (prévention / métriques critiques).');
    }

    setAnswer(lines.join('\n\n'));
  };

  return (
    <Screen>
      <Title>Coach Vokal</Title>
      <Muted>Explications basées sur ton plan, tes notes coach, sommeil et RPE.</Muted>
      <View style={{ marginTop: spacing.md }}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.bike}
          title="Ton coach te répond"
          subtitle="Plan réel · adaptations · RPE"
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
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
