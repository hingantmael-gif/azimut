import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlannedWorkout } from '../../types/domain';
import { getMonthGrid } from '../../constants/disciplines';
import { computeSessionDurationSec } from '../../engines/coachingEngine';
import { computeTrimp } from '../../engines/sportsScience';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

type Props = {
  year: number;
  month: number;
  plan: PlannedWorkout[];
};

function workoutsByDate(plan: PlannedWorkout[]): Map<string, PlannedWorkout[]> {
  const map = new Map<string, PlannedWorkout[]>();
  for (const w of plan) {
    const list = map.get(w.date) ?? [];
    list.push(w);
    map.set(w.date, list);
  }
  return map;
}

/** TRIMP ≈ durée_min × RPE attendu (ou intensité estimée). */
function dayLoad(sessions: PlannedWorkout[]): number {
  let total = 0;
  for (const w of sessions) {
    if (w.discipline === 'rest') continue;
    const durationSec =
      w.plannedDurationSec && w.plannedDurationSec > 0
        ? w.plannedDurationSec
        : computeSessionDurationSec(w.steps);
    const durationMin = Math.max(0, durationSec / 60);
    const rpe = w.expectedRpe && w.expectedRpe > 0 ? w.expectedRpe : 5;
    total += computeTrimp(durationMin, rpe);
  }
  return total;
}

function accentWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
}

/** Mini heatmap charge (TRIMP) des semaines visibles du mois. */
export function LoadHeatmap({ year, month, plan }: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const byDate = useMemo(() => workoutsByDate(plan), [plan]);
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);

  const weeks = useMemo(() => {
    const rows: Array<Array<{ date: string | null; load: number }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      const slice = cells.slice(i, i + 7);
      rows.push(
        slice.map((c) => ({
          date: c.date,
          load: c.date ? dayLoad(byDate.get(c.date) ?? []) : 0,
        })),
      );
    }
    return rows;
  }, [cells, byDate]);

  const maxLoad = useMemo(() => {
    let max = 0;
    for (const week of weeks) {
      for (const day of week) {
        if (day.load > max) max = day.load;
      }
    }
    return max;
  }, [weeks]);

  if (maxLoad <= 0) return null;

  return (
    <View style={styles.wrap} accessibilityLabel="Charge d'entraînement du mois">
      <View style={styles.head}>
        <Text style={styles.label}>Charge</Text>
        <View style={styles.scale}>
          <View style={[styles.scaleSwatch, { backgroundColor: accentWithAlpha(colors.accent, 0.12) }]} />
          <View style={[styles.scaleSwatch, { backgroundColor: accentWithAlpha(colors.accent, 0.35) }]} />
          <View style={[styles.scaleSwatch, { backgroundColor: accentWithAlpha(colors.accent, 0.6) }]} />
          <View style={[styles.scaleSwatch, { backgroundColor: accentWithAlpha(colors.accent, 0.92) }]} />
        </View>
      </View>
      <View style={styles.grid}>
        {weeks.map((week, wi) => (
          <View key={`w-${wi}`} style={styles.weekRow}>
            {week.map((day, di) => {
              if (!day.date) {
                return <View key={`e-${wi}-${di}`} style={styles.cellEmpty} />;
              }
              const ratio = maxLoad > 0 ? day.load / maxLoad : 0;
              const bg =
                ratio <= 0
                  ? colors.bgSecondary
                  : accentWithAlpha(colors.accent, 0.1 + ratio * 0.82);
              return (
                <View
                  key={day.date}
                  style={[styles.cell, { backgroundColor: bg }]}
                  accessibilityLabel={`Charge ${Math.round(day.load)}`}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    scale: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    scaleSwatch: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    grid: { gap: 3 },
    weekRow: { flexDirection: 'row', gap: 3 },
    cell: {
      flex: 1,
      height: 8,
      borderRadius: radii.sm / 2,
      minWidth: 0,
    },
    cellEmpty: {
      flex: 1,
      height: 8,
      minWidth: 0,
      opacity: 0,
    },
  });
}
