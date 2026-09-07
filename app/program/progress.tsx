import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { ProgramEvolutionCard } from '../../src/ui/ProgramEvolutionCard';
import { PrimaryButton, Screen, Title, Muted } from '../../src/ui/primitives';
import { parseRaceTime, formatRaceTime } from '../../src/engines/athleteProfile';
import { formatRaceClockInput } from '../../src/utils/dateInput';
import { distanceLabel } from '../../src/engines/programProgress';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { UI_PLAIN } from '../../src/constants/authLabels';

/** Suivi d’évolution du programme actif (temps avant / après) */
export default function ProgramProgressScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const prog = state.profile.activeProgram;
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const label = useMemo(
    () => distanceLabel(prog?.baselineDistanceKm ?? prog?.targetDistanceKm),
    [prog?.baselineDistanceKm, prog?.targetDistanceKm],
  );

  if (!prog) {
    return (
      <Screen>
        <Title>Aucun programme</Title>
        <Muted style={{ marginTop: 8 }}>Créez un programme pour suivre votre évolution.</Muted>
        <PrimaryButton
          label={UI_PLAIN.newProgram}
          onPress={() => router.push('/program/new')}
        />
      </Screen>
    );
  }

  const submitTest = () => {
    const sec = parseRaceTime(raw);
    if (!sec || sec < 60) {
      setErr('Format invalide — ex. 25:00 ou 1:22:30');
      return;
    }
    setErr(null);
    dispatch({
      type: 'RECORD_PROGRAM_TEST_TIME',
      timeSec: sec,
      distanceKm: prog.baselineDistanceKm ?? prog.targetDistanceKm,
    });
    setRaw('');
  };

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{prog.title}</Title>
        <Muted style={{ marginTop: 4 }}>{prog.subtitle}</Muted>

        <View style={{ marginTop: spacing.lg }}>
          <ProgramEvolutionCard program={prog} />
        </View>

        <Text style={styles.section}>Enregistrer un test {label}</Text>
        <Muted>
          Après une course chronométrée (compétition ou test), saisissez le temps pour mettre à
          jour l’évolution. Les imports Strava proches de {label} mettent aussi à jour le meilleur
          temps automatiquement.
        </Muted>
        <AppTextInput
          style={styles.input}
          placeholder="ex. 2230 → 22:30"
          placeholderTextColor={colors.textMuted}
          value={raw}
          onChangeText={(t) => setRaw(formatRaceClockInput(t))}
          keyboardType="number-pad"
        />
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <PrimaryButton label="Enregistrer ce temps" onPress={submitTest} />

        {prog.baselineTimeSec ? (
          <Text style={styles.ref}>
            Référence de départ : {formatRaceTime(prog.baselineTimeSec)}
            {prog.currentBestAt
              ? ` · dernier meilleur : ${new Date(prog.currentBestAt).toLocaleDateString('fr-FR')}`
              : ''}
          </Text>
        ) : null}

        <Pressable style={styles.link} onPress={() => router.push('/(tabs)/calendar')}>
          <Text style={styles.linkText}>Voir le planning →</Text>
        </Pressable>
      </AppScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    section: {
      marginTop: spacing.lg,
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
      marginBottom: 6,
    },
    input: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      backgroundColor: colors.bg,
    },
    error: { color: colors.danger, marginTop: 6, fontSize: 13 },
    ref: { marginTop: spacing.md, color: colors.textMuted, fontSize: 13 },
    link: { marginTop: spacing.lg, paddingVertical: 8 },
    linkText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  });
}
