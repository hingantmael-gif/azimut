import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alert } from '../../src/utils/appAlert';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { WizardDayGrid } from '../../src/ui/program/WizardPickers';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import type { ColorPalette } from '../../src/theme/palettes';
import { radii, spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';
import { coachPanelForDaySpacing } from '../../src/engines/sessionFrequencyCoach';
import {
  formatRaceTime,
  parseRaceTime,
  roundVmaKmh,
  vmaFromRaceTime,
} from '../../src/engines/athleteProfile';
import { predictRaceTimesSecMap } from '../../src/engines/core';
import { formatRaceClockInput } from '../../src/utils/dateInput';
import { resolveAthletePaceZones } from '../../src/engines/workoutPresentation';
import { describePaceZoneSource } from '../../src/engines/paceZones';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import type { OnboardingAnswers } from '../../src/types/domain';
import { PressableScale } from '../../src/ui/motion/softMotion';

type Tab = 'pace' | 'days';

/**
 * Ajuster un programme en cours : allures (chrono) + jours dispo.
 * Un seul CTA — pas de duplication avec sports-data / training-schedule.
 */
export default function AdjustProgramScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const o = state.profile.onboarding;
  const hasActive = resolveActivePrograms(state.profile).length > 0;

  const [tab, setTab] = useState<Tab>('pace');
  const initial5k =
    o?.raceTimesSec?.['5k'] ??
    (o?.recentDistanceKm === 5 ? o.recentTimeSec : undefined);
  const [fiveKRaw, setFiveKRaw] = useState(
    initial5k && initial5k > 0 ? formatRaceTime(initial5k) : '',
  );
  const [trainingDays, setTrainingDays] = useState<number[]>(
    o?.trainingDays?.length ? [...o.trainingDays] : [1, 3, 5],
  );
  const [longRunDay, setLongRunDay] = useState(o?.longRunDay ?? 6);

  const spacingHint = useMemo(
    () => coachPanelForDaySpacing(trainingDays),
    [trainingDays],
  );
  const zonesPreview = resolveAthletePaceZones(
    {
      ...(o ?? { level: 'intermediaire', goal: '10k', trainingDays, longRunDay }),
      recentTimeSec: parseRaceTime(fiveKRaw) ?? o?.recentTimeSec,
      recentDistanceKm: 5,
    },
    state.activities,
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
    if (!hasActive) {
      Alert.alert(
        'Aucun programme',
        'Crée d’abord un programme pour pouvoir l’ajuster.',
      );
      return;
    }
    if (trainingDays.length < 1) {
      Alert.alert('Jours requis', "Sélectionne au moins 1 jour d'entraînement.");
      return;
    }
    if (!trainingDays.includes(longRunDay)) {
      Alert.alert('Sortie longue', 'La sortie longue doit être un jour sélectionné.');
      return;
    }

    const prevDays = [...(o?.trainingDays ?? [])].sort((a, b) => a - b);
    const nextDays = [...trainingDays].sort((a, b) => a - b);
    const daysChanged =
      prevDays.join(',') !== nextDays.join(',') ||
      (o?.longRunDay ?? 6) !== longRunDay;

    const trimmed = fiveKRaw.trim();
    let paceSec: number | null = null;
    if (trimmed) {
      paceSec = parseRaceTime(trimmed);
      if (paceSec == null || paceSec <= 0) {
        Alert.alert('Chrono invalide', 'Format attendu : 22:30 ou 1:45:00');
        return;
      }
    }
    const paceChanged =
      paceSec != null &&
      (initial5k == null || Math.abs(paceSec - initial5k) >= 1);

    if (!daysChanged && !paceChanged) {
      Alert.alert('Aucun changement', 'Modifie le chrono ou les jours, puis enregistre.');
      return;
    }

    const patch: Partial<OnboardingAnswers> = {};
    if (daysChanged) {
      patch.trainingDays = nextDays;
      patch.longRunDay = longRunDay;
    }
    if (paceChanged && paceSec != null) {
      const predicted = predictRaceTimesSecMap(5, paceSec, {
        weeklyKmAvg: o?.weeklyKmAvg,
      });
      patch.recentTimeSec = paceSec;
      patch.recentDistanceKm = 5;
      patch.raceTimesSec = predicted;
      patch.vmaKmh = roundVmaKmh(vmaFromRaceTime(5, paceSec));
    }

    dispatch({ type: 'ADJUST_ACTIVE_PROGRAM', patch });
    Alert.alert(
      'Programme mis à jour',
      'Les séances à venir sont recalées. Le passé reste inchangé.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  if (!hasActive) {
    return (
      <Screen>
        <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <Title>Ajuster mon programme</Title>
          <Muted style={{ marginTop: 8, lineHeight: 20 }}>
            Aucun programme actif. Crée-en un pour pouvoir corriger allures ou
            jours sans tout recommencer.
          </Muted>
          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label="Créer un programme"
              onPress={() => router.push('/program/new')}
            />
          </View>
        </AppScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Title>Ajuster mon programme</Title>
        <Muted style={{ marginTop: 8, lineHeight: 20 }}>
          Corrige un chrono ou tes disponibilités — les séances futures se
          mettent à jour, sans tout supprimer.
        </Muted>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('pace')}
            style={[styles.tab, tab === 'pace' && styles.tabOn]}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, tab === 'pace' && styles.tabTextOn]}>
              Allures
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('days')}
            style={[styles.tab, tab === 'days' && styles.tabOn]}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, tab === 'days' && styles.tabTextOn]}>
              Jours
            </Text>
          </Pressable>
        </View>

        {tab === 'pace' ? (
          <View style={styles.section}>
            <Body>Chrono 5 km de référence</Body>
            <Muted style={{ marginTop: 4, marginBottom: spacing.sm }}>
              Ex. tu t’étais trompé de temps — entre le bon chrono, on recalcule
              VMA et allures des séances à venir.
            </Muted>
            <AppTextInput
              style={styles.input}
              value={fiveKRaw}
              onChangeText={(t) => setFiveKRaw(formatRaceClockInput(t))}
              placeholder="22:30"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
            {zonesPreview ? (
              <Muted style={{ marginTop: spacing.sm, lineHeight: 18 }}>
                VMA estimée ≈ {zonesPreview.vmaKmh.toFixed(1)} km/h (
                {describePaceZoneSource(zonesPreview.source)})
              </Muted>
            ) : null}
          </View>
        ) : (
          <View style={styles.section}>
            <Body>Jours d&apos;entraînement</Body>
            <WizardDayGrid
              selected={trainingDays}
              onToggle={toggleDay}
              accent={colors.accent}
              tone="surface"
            />
            <Muted style={{ marginTop: 8 }}>
              {trainingDays.length} jour{trainingDays.length > 1 ? 's' : ''} · les
              séances futures seront décalées
            </Muted>
            {spacingHint ? (
              <Muted
                style={{
                  marginTop: 10,
                  lineHeight: 18,
                  color: colors.accent,
                }}
              >
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
          </View>
        )}

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton label="Enregistrer les changements" onPress={save} />
        </View>
        <PressableScale
          variant="subtle"
          onPress={() => router.back()}
          contentStyle={{ marginTop: spacing.md, paddingVertical: 8 }}
        >
          <Text style={styles.cancelLink}>Annuler</Text>
        </PressableScale>
      </AppScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      marginTop: spacing.lg,
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
    },
    tabOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    tabText: {
      fontWeight: '700',
      fontSize: 14,
      color: colors.textMuted,
    },
    tabTextOn: { color: colors.accentDark },
    section: { marginTop: spacing.lg },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      color: colors.text,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 17,
      fontWeight: '700',
    },
    cancelLink: {
      textAlign: 'center',
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 14,
    },
  });
}
