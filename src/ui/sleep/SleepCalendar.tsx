import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buildMonthGrid,
  earliestSleepDateIso,
  isSleepDateAllowed,
  monthlySleepAverage,
  nightForDate,
  previousMonthsWithSleep,
  scoreForDate,
  toLocalDateIso,
} from '../../engines/sleepCalendar';
import { formatMinutes } from '../../engines/core';
import type { SleepMetrics } from '../../types/domain';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Props = {
  history?: SleepMetrics[];
  /** Date d’inscription du compte — pas de saisie avant ce jour */
  accountCreatedAt?: string | null;
  selectedDate?: string | null;
  onSelectDate?: (iso: string) => void;
};

export function SleepCalendar({
  history,
  accountCreatedAt,
  selectedDate,
  onSelectDate,
}: Props) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const todayIso = toLocalDateIso();
  const earliestIso = earliestSleepDateIso(accountCreatedAt);
  const earliestParts = earliestIso.split('-').map(Number);
  const earliestMonth = { y: earliestParts[0], m: earliestParts[1] - 1 };

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const cells = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);
  const avg = useMemo(
    () => monthlySleepAverage(history, cursor.y, cursor.m),
    [history, cursor],
  );
  const pastMonths = useMemo(
    () => previousMonthsWithSleep(history, cursor.y, cursor.m, 8),
    [history, cursor],
  );
  const monthLabel = useMemo(
    () =>
      new Date(cursor.y, cursor.m, 1).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      }),
    [cursor],
  );

  const canGoNext =
    cursor.y < now.getFullYear() ||
    (cursor.y === now.getFullYear() && cursor.m < now.getMonth());

  const canGoPrev =
    cursor.y > earliestMonth.y ||
    (cursor.y === earliestMonth.y && cursor.m > earliestMonth.m);

  const shift = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      const next = { y: d.getFullYear(), m: d.getMonth() };
      if (
        next.y > now.getFullYear() ||
        (next.y === now.getFullYear() && next.m > now.getMonth())
      ) {
        return c;
      }
      if (
        next.y < earliestMonth.y ||
        (next.y === earliestMonth.y && next.m < earliestMonth.m)
      ) {
        return c;
      }
      return next;
    });
  };

  const openMonth = (year: number, monthIndex: number) => {
    if (
      year < earliestMonth.y ||
      (year === earliestMonth.y && monthIndex < earliestMonth.m)
    ) {
      return;
    }
    setCursor({ y: year, m: monthIndex });
  };

  const onPressDay = (iso: string) => {
    const allowed = isSleepDateAllowed(iso, {
      accountCreatedAt,
      todayIso,
    });
    if (!allowed) {
      if (iso > todayIso) {
        Alert.alert('Jour futur', 'Tu ne peux pas saisir le sommeil d’un jour à venir.');
      } else {
        Alert.alert(
          'Avant ton inscription',
          'Tu ne peux pas enregistrer de sommeil avant la création de ton compte.',
        );
      }
      return;
    }
    onSelectDate?.(iso);
  };

  const selectedNight = selectedDate ? nightForDate(history, selectedDate) : undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable
          onPress={() => canGoPrev && shift(-1)}
          hitSlop={16}
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
          disabled={!canGoPrev}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
        >
          <Text style={[styles.nav, !canGoPrev && styles.navDisabled]}>‹</Text>
          <Text style={[styles.navCaption, !canGoPrev && styles.navDisabled]}>Préc.</Text>
        </Pressable>
        <Text style={styles.month} numberOfLines={1}>
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => canGoNext && shift(1)}
          hitSlop={16}
          style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
          disabled={!canGoNext}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
        >
          <Text style={[styles.nav, !canGoNext && styles.navDisabled]}>›</Text>
          <Text style={[styles.navCaption, !canGoNext && styles.navDisabled]}>Suiv.</Text>
        </Pressable>
      </View>

      {avg ? (
        <View style={styles.avgBox}>
          <Text style={styles.avgTitle}>Moyenne du mois</Text>
          <Text style={styles.avgLine}>
            Score · <Text style={styles.avgScore}>{avg.average}</Text>
            <Text style={styles.avgMeta}> / 100</Text>
          </Text>
          {avg.averageMinutes > 0 ? (
            <Text style={styles.avgLine}>
              Sommeil · <Text style={styles.avgScore}>{formatMinutes(avg.averageMinutes)}</Text>
            </Text>
          ) : null}
          <Text style={styles.avgMeta}>{avg.count} nuit{avg.count > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <Text style={styles.avgMuted}>Aucune nuit saisie ce mois-ci</Text>
      )}

      <Text style={styles.hint}>
        Touche un jour pour voir le détail ou compléter une nuit oubliée (depuis ton
        inscription).
      </Text>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((iso, i) => {
          if (!iso) {
            return <View key={`e-${i}`} style={styles.cell} />;
          }
          const day = Number(iso.slice(-2));
          const score = scoreForDate(history, iso);
          const isToday = iso === todayIso;
          const isSelected = selectedDate === iso;
          const allowed = isSleepDateAllowed(iso, {
            accountCreatedAt,
            todayIso,
          });
          return (
            <Pressable
              key={iso}
              disabled={!onSelectDate}
              onPress={() => onPressDay(iso)}
              style={[
                styles.cell,
                styles.dayCell,
                isToday && styles.today,
                isSelected && styles.selected,
                score != null && { backgroundColor: scoreBg(score, colors) },
                !allowed && styles.dayDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Jour ${day}${score != null ? `, score ${score}` : ''}`}
            >
              <Text
                style={[
                  styles.dayNum,
                  score != null && styles.dayNumOn,
                  !allowed && styles.dayNumDisabled,
                ]}
              >
                {day}
              </Text>
              {score != null ? (
                <Text style={styles.score}>{score}</Text>
              ) : (
                <Text style={[styles.emptyDash, !allowed && styles.dayNumDisabled]}>
                  {allowed ? '·' : '–'}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {selectedDate ? (
        <View style={styles.detailBox}>
          <Text style={styles.detailTitle}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          {selectedNight ? (
            <>
              <Text style={styles.detailLine}>
                Score · <Text style={styles.detailStrong}>{selectedNight.score}/100</Text>
              </Text>
              {selectedNight.totalMinutes > 0 ? (
                <Text style={styles.detailLine}>
                  Durée ·{' '}
                  <Text style={styles.detailStrong}>
                    {formatMinutes(selectedNight.totalMinutes)}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.detailMuted}>Durée non renseignée</Text>
              )}
            </>
          ) : (
            <Text style={styles.detailMuted}>
              Aucune nuit saisie — tu peux compléter ce jour.
            </Text>
          )}
        </View>
      ) : null}

      {pastMonths.length > 0 ? (
        <View style={styles.pastWrap}>
          <Text style={styles.pastTitle}>Mois précédents</Text>
          {pastMonths.map((m) => {
            const label = new Date(m.year, m.monthIndex, 1).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            });
            return (
              <Pressable
                key={`${m.year}-${m.monthIndex}`}
                style={styles.pastRow}
                onPress={() => openMonth(m.year, m.monthIndex)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir ${label}`}
              >
                <Text style={styles.pastMonth}>{label}</Text>
                <View style={styles.pastStats}>
                  <Text style={styles.pastScore}>{m.average}/100</Text>
                  {m.averageMinutes > 0 ? (
                    <Text style={styles.pastDur}>{formatMinutes(m.averageMinutes)}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function scoreBg(score: number, colors: ColorPalette): string {
  if (score >= 85) return colors.accent + '33';
  if (score >= 70) return colors.sleep + '28';
  return colors.warn + '22';
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    navBtn: {
      minWidth: 56,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    navBtnDisabled: { opacity: 0.35 },
    nav: { fontSize: 28, color: colors.text, fontWeight: '300', lineHeight: 30 },
    navDisabled: { color: colors.textMuted },
    navCaption: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: -2 },
    month: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'capitalize',
      textAlign: 'center',
    },
    avgBox: {
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.bgSecondary,
      gap: 2,
    },
    avgTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    avgLine: { fontSize: 15, color: colors.text },
    avgScore: { fontWeight: '800', color: colors.sleep, fontSize: 17 },
    avgMeta: { color: colors.textMuted, fontWeight: '400', fontSize: 13, marginTop: 2 },
    avgMuted: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.2857%',
      aspectRatio: 1,
      padding: 2,
    },
    dayCell: {
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSecondary,
    },
    today: { borderWidth: 1.5, borderColor: colors.accent },
    selected: {
      borderWidth: 2,
      borderColor: colors.sleep,
    },
    dayDisabled: { opacity: 0.4 },
    dayNum: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    dayNumOn: { color: colors.text },
    dayNumDisabled: { color: colors.borderStrong },
    score: { fontSize: 13, fontWeight: '800', color: colors.sleep, marginTop: 1 },
    emptyDash: { fontSize: 12, color: colors.borderStrong, marginTop: 2 },
    detailBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.bgSecondary,
      gap: 4,
    },
    detailTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'capitalize',
      marginBottom: 4,
    },
    detailLine: { fontSize: 15, color: colors.text },
    detailStrong: { fontWeight: '800', color: colors.sleep },
    detailMuted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    pastWrap: {
      marginTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    pastTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    pastRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pastMonth: { fontSize: 15, color: colors.text, textTransform: 'capitalize', flex: 1 },
    pastStats: { alignItems: 'flex-end', gap: 2 },
    pastScore: { fontSize: 15, fontWeight: '800', color: colors.sleep },
    pastDur: { fontSize: 12, color: colors.textMuted },
  });
}
