import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Alert } from '../../src/utils/appAlert';
import { useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { WizardDayGrid } from '../../src/ui/program/WizardPickers';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';
import { coachPanelForDaySpacing } from '../../src/engines/sessionFrequencyCoach';

/** Modifier les jours dispo en cours de programme — décale les séances futures. */
export default function TrainingScheduleScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const o = state.profile.onboarding;

  const [trainingDays, setTrainingDays] = useState<number[]>(
    o?.trainingDays?.length ? [...o.trainingDays] : [1, 3, 5],
  );
  const [longRunDay, setLongRunDay] = useState(o?.longRunDay ?? 6);

  const spacingHint = useMemo(
    () => coachPanelForDaySpacing(trainingDays),
    [trainingDays],
  );

  const toggleDay = (i: number) => {
    setTrainingDays((prev) => {
      const next = prev.includes(i)
        ? prev.filter((d) => d !== i)
        : [...prev, i].sort((a, b) => a - b);
      if (next.length && !next.includes(longRunDay)) {
        setLongRunDay(next[next.length - 1]!);
      }
      return next;
    });
  };

  const save = () => {
    if (trainingDays.length < 1) {
      Alert.alert('Jours requis', "Sélectionnez au moins 1 jour d'entraînement.");
      return;
    }
    if (!trainingDays.includes(longRunDay)) {
      Alert.alert('Sortie longue', 'La sortie longue doit être un jour sélectionné.');
      return;
    }
    dispatch({
      type: 'RESCHEDULE_TRAINING_DAYS',
      trainingDays,
      longRunDay,
    });
    router.back();
  };

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Title>Disponibilités</Title>
        <Muted style={{ marginTop: 8, lineHeight: 20 }}>
          Changez vos disponibilités en cours de programme. Mova décale les séances futures
          sans tout écraser.
        </Muted>

        <Body style={{ marginTop: spacing.lg }}>Jours d&apos;entraînement</Body>
        <WizardDayGrid
          selected={trainingDays}
          onToggle={toggleDay}
          accent={colors.accent}
          tone="surface"
        />
        <Muted style={{ marginTop: 8 }}>
          {trainingDays.length} jour{trainingDays.length > 1 ? 's' : ''} · style Runna : décalage,
          pas de reset
        </Muted>
        {spacingHint ? (
          <Muted style={{ marginTop: 10, lineHeight: 18, color: colors.accent }}>
            {spacingHint.title} — {spacingHint.body}
          </Muted>
        ) : null}

        <Body style={{ marginTop: spacing.lg }}>Sortie longue</Body>
        <WizardDayGrid
          selected={[longRunDay]}
          mode="long"
          accent="#F59E0B"
          tone="surface"
          onToggle={(dow) => {
            if (!trainingDays.includes(dow)) {
              Alert.alert(
                'Jour indisponible',
                "Choisis d'abord ce jour dans les jours d'entraînement.",
              );
              return;
            }
            setLongRunDay(dow);
          }}
        />

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton label="Enregistrer" onPress={save} />
        </View>
      </AppScrollView>
    </Screen>
  );
}
