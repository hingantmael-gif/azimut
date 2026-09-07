import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import { Body, Chip, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { useApp } from '../../src/store/AppContext';
import type { AthleticLevel, GoalType } from '../../src/types/domain';
import { levelFromWeeklyKm } from '../../src/engines/athleteProfile';
import { GOAL_LABELS } from '../../src/constants/features';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';

const GOAL_OPTIONS = Object.keys(GOAL_LABELS) as GoalType[];

const LEVEL_OPTIONS: Array<[AthleticLevel, string]> = [
  ['debutant', 'Débutant'],
  ['intermediaire', 'Intermédiaire'],
  ['confirme', 'Confirmé'],
];

/**
 * Édition unique : objectif (quoi) + volume (combien) + niveau (ressenti).
 * Plus de doublons avec l’écran Objectifs.
 */
export default function AthleteProfileSettingsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const o = state.profile.onboarding;

  const [goal, setGoal] = useState<GoalType>(o?.goal ?? 'forme');
  const [weeklyKmInput, setWeeklyKmInput] = useState(
    o?.weeklyKmAvg != null && o.weeklyKmAvg > 0 ? String(o.weeklyKmAvg) : '',
  );
  const [levelOverride, setLevelOverride] = useState(false);
  const [level, setLevel] = useState<AthleticLevel>(o?.level ?? 'intermediaire');

  const weeklyKm = Number(weeklyKmInput.replace(',', '.')) || 0;
  const suggestedLevel = weeklyKm > 0 ? levelFromWeeklyKm(weeklyKm) : level;
  const effectiveLevel = levelOverride ? level : suggestedLevel;

  const save = () => {
    if (weeklyKm <= 0) return;
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        goal,
        weeklyKmAvg: Math.round(weeklyKm * 10) / 10,
        level: effectiveLevel,
      },
    });
    router.back();
  };

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <Title>Profil sportif</Title>
        <Muted style={{ marginTop: 6, lineHeight: 20 }}>
          Trois infos utiles pour caler les programmes — objectif, volume, niveau.
        </Muted>

        <Body style={{ marginTop: spacing.lg, fontWeight: '700' }}>Objectif principal</Body>
        <Muted style={{ marginTop: 4, lineHeight: 18 }}>
          La course ou le format que tu vises en priorité.
        </Muted>
        <View style={styles.row}>
          {GOAL_OPTIONS.map((g) => (
            <Chip
              key={g}
              label={GOAL_LABELS[g] ?? g}
              selected={goal === g}
              onPress={() => setGoal(g)}
            />
          ))}
        </View>

        <Body style={{ marginTop: spacing.lg, fontWeight: '700' }}>
          Volume hebdomadaire
        </Body>
        <Muted style={{ marginTop: 4, lineHeight: 18 }}>
          Kilomètres moyens par semaine (toutes disciplines confondues si tu mixes).
        </Muted>
        <AppTextInput
          style={styles.input}
          placeholder="Ex. 25"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={weeklyKmInput}
          onChangeText={setWeeklyKmInput}
        />
        {weeklyKm > 0 && !levelOverride ? (
          <Muted style={{ marginTop: 6 }}>
            Niveau suggéré d’après le volume :{' '}
            {LEVEL_OPTIONS.find(([v]) => v === suggestedLevel)?.[1] ?? suggestedLevel}
          </Muted>
        ) : null}

        <Body style={{ marginTop: spacing.lg, fontWeight: '700' }}>Niveau ressenti</Body>
        <Muted style={{ marginTop: 4, lineHeight: 18 }}>
          Ajuste si le volume ne reflète pas ton expérience (ex. reprise après pause).
        </Muted>
        <View style={styles.row}>
          {LEVEL_OPTIONS.map(([v, l]) => (
            <Chip
              key={v}
              label={l}
              selected={effectiveLevel === v}
              onPress={() => {
                setLevel(v);
                setLevelOverride(true);
              }}
            />
          ))}
        </View>
        {levelOverride ? (
          <Text
            style={[styles.link, { color: colors.accent }]}
            onPress={() => setLevelOverride(false)}
          >
            Revenir au niveau suggéré par le volume
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton
            label="Enregistrer"
            disabled={weeklyKm <= 0}
            onPress={save}
          />
        </View>
      </AppScrollView>
    </Screen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: 8 },
    input: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      color: colors.text,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
    },
    link: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
