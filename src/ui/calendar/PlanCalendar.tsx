import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlannedWorkout, SportDiscipline } from '../../types/domain';
import {
  DISCIPLINE_META,
  WEEKDAY_LABELS,
  disciplineColor,
  formatMonthYear,
  getMonthGrid,
} from '../../constants/disciplines';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';
import { PressableScale, SoftPulse } from '../motion/softMotion';

type Props = {
  year: number;
  month: number;
  plan: PlannedWorkout[];
  todayIso: string;
  moveMode: boolean;
  selectedWorkoutId: string | null;
  selectedDate?: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: string) => void;
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

function SportDot({ discipline, size = 7 }: { discipline: SportDiscipline; size?: number }) {
  const { colors } = useThemeColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: disciplineColor(discipline),
        borderWidth: discipline === 'rest' ? 1 : 0,
        borderColor: colors.borderStrong,
      }}
    />
  );
}

function disciplinesInMonth(plan: PlannedWorkout[], year: number, month: number): SportDiscipline[] {
  const mm = String(month + 1).padStart(2, '0');
  const prefix = `${year}-${mm}`;
  const set = new Set<SportDiscipline>();
  for (const w of plan) {
    if (w.date.startsWith(prefix) && w.discipline !== 'rest') {
      set.add(w.discipline);
    }
  }
  const order: SportDiscipline[] = [
    'run',
    'bike',
    'swim',
    'brick',
    'strength',
    'ppg',
    'mobility',
  ];
  return order.filter((d) => set.has(d));
}

export function PlanCalendar({
  year,
  month,
  plan,
  todayIso,
  moveMode,
  selectedWorkoutId,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onDayPress,
}: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const cells = getMonthGrid(year, month);
  const byDate = workoutsByDate(plan);
  const monthDisciplines = disciplinesInMonth(plan, year, month);
  const moveSourceDate = selectedWorkoutId
    ? plan.find((w) => w.id === selectedWorkoutId)?.date
    : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={styles.navBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonthYear(year, month)}</Text>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={8}>
          <Text style={styles.navBtnText}>›</Text>
        </Pressable>
      </View>

      {moveMode ? (
        <View style={styles.moveBanner}>
          <Text style={styles.moveBannerText}>Choisissez un jour pour déplacer la séance</Text>
        </View>
      ) : null}

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell.date || cell.day === null) {
            return <View key={`e-${idx}`} style={styles.cell} />;
          }

          const sessions = byDate.get(cell.date) ?? [];
          const isToday = cell.date === todayIso;
          const isMoveTarget = moveMode && cell.date !== moveSourceDate;
          const isDaySelected = !moveMode && cell.date === selectedDate;
          const isMoveSource = moveMode && cell.date === moveSourceDate;

          return (
            <PressableScale
              key={cell.date}
              style={[
                styles.cell,
                isToday && styles.cellToday,
                isDaySelected && styles.cellSelected,
                isMoveTarget && styles.cellMoveTarget,
                isMoveSource && styles.cellSelectedSource,
              ]}
              onPress={() => onDayPress(cell.date!)}
            >
              <SoftPulse intensity={isDaySelected ? 0.04 : 0}>
                <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{cell.day}</Text>
                <View style={styles.dots}>
                  {sessions.slice(0, 4).map((s) => (
                    <SportDot key={s.id} discipline={s.discipline} />
                  ))}
                </View>
              </SoftPulse>
            </PressableScale>
          );
        })}
      </View>

      {monthDisciplines.length > 0 ? (
        <View style={styles.legend}>
          {monthDisciplines.map((d) => (
            <View key={d} style={styles.legendItem}>
              <SportDot discipline={d} size={8} />
              <Text style={styles.legendText}>{DISCIPLINE_META[d].label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const CELL_WIDTH = '14.28%';

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnText: { fontSize: 22, color: colors.accent, fontWeight: '600', lineHeight: 24 },
    monthLabel: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'capitalize',
    },
    moveBanner: {
      backgroundColor: colors.accentLight,
      padding: spacing.sm,
      borderRadius: radii.sm,
      marginBottom: spacing.sm,
    },
    moveBannerText: { color: colors.accentDark, fontWeight: '600', fontSize: 13, textAlign: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekLabel: {
      width: CELL_WIDTH,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: CELL_WIDTH,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    cellToday: {
      backgroundColor: colors.accentLight,
    },
    cellSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    cellMoveTarget: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderStyle: 'dashed',
    },
    cellSelectedSource: {
      opacity: 0.5,
    },
    dayNum: { fontSize: 14, fontWeight: '600', color: colors.text },
    dayNumToday: { color: colors.accentDark, fontWeight: '800' },
    dots: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 3,
      justifyContent: 'center',
      marginTop: 4,
      minHeight: 10,
      maxWidth: 36,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
    legendText: { fontSize: 11, color: colors.textSecondary },
  });
}
