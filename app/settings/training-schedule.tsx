import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Chip, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/** Modifier les jours dispo en cours de programme — décale les séances futures. */
export default function TrainingScheduleScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const o = state.profile.onboarding;

  const [trainingDays, setTrainingDays] = useState<number[]>(
    o?.trainingDays?.length ? [...o.trainingDays] : [2, 4, 6],
  );
  const [longRunDay, setLongRunDay] = useState(o?.longRunDay ?? 6);

  const toggleDay = (i: number) => {
    setTrainingDays((prev) => {
      const next = prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort((a, b) => a - b);
      if (next.length && !next.includes(longRunDay)) {
        setLongRunDay(next[next.length - 1]);
      }
      return next;
    });
  };

  const save = () => {
    if (trainingDays.length < 2) {
      Alert.alert('Minimum 2 jours', 'Sélectionnez au moins 2 jours d\'entraînement.');
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
    Alert.alert(
      'Planning mis à jour',
      'Les séances futures ont été décalées sur vos nouveaux jours. Les séances déjà réalisées ne changent pas.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
      }),
    [],
  );

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <Title>Jours d'entraînement</Title>
        <Muted style={{ marginTop: 6, lineHeight: 20 }}>
          Changez vos disponibilités en cours de programme. Azimut décale les séances futures
          (sans regénérer tout le plan) et comble les gros trous par un footing récupération.
        </Muted>

        <Body style={{ marginTop: spacing.lg }}>Jours disponibles</Body>
        <View style={styles.row}>
          {DAYS.map((label, i) => (
            <Chip
              key={label}
              label={label}
              selected={trainingDays.includes(i)}
              onPress={() => toggleDay(i)}
            />
          ))}
        </View>
        <Muted style={{ marginTop: 4 }}>
          {trainingDays.length} jour{trainingDays.length > 1 ? 's' : ''} · style Runna : décalage,
          pas regénération complète
        </Muted>

        <Body style={{ marginTop: spacing.lg }}>Sortie longue (chaque semaine)</Body>
        <View style={styles.row}>
          {DAYS.map((label, i) => (
            <Chip
              key={`long-${label}`}
              label={label}
              selected={longRunDay === i}
              onPress={() => {
                if (!trainingDays.includes(i)) {
                  setTrainingDays((prev) => [...prev, i].sort((a, b) => a - b));
                }
                setLongRunDay(i);
              }}
            />
          ))}
        </View>

        {state.coachAdaptations?.[0] ? (
          <Muted style={{ marginTop: spacing.lg, color: colors.accent }}>
            Dernière adaptation : {state.coachAdaptations[0]}
          </Muted>
        ) : null}

        <PrimaryButton label="Appliquer et décaler le plan" onPress={save} />
      </AppScrollView>
    </Screen>
  );
}
