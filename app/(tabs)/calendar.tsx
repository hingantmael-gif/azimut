import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { DISCIPLINE_META, disciplineColor } from '../../src/constants/disciplines';
import { PlanCalendar } from '../../src/ui/calendar/PlanCalendar';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import {
  formatPeriodization,
  formatVmaHint,
  summarizeWorkout,
} from '../../src/engines/workoutPresentation';
import { AppScrollView } from '../../src/ui/scrolling';
import { canSendWorkoutToWatch } from '../../src/engines/watchExport';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';

function formatDayTitle(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Plan — calendrier + séance du jour inline (sans modal) */
export default function PlanScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [moveMode, setMoveMode] = useState(false);

  useEffect(() => {
    dispatch({ type: 'PRUNE_FINISHED_PROGRAM' });
  }, [dispatch, state.plan.length, state.profile.activeProgram?.id]);

  const visiblePlan = state.plan;
  const vmaHint = formatVmaHint(state.profile.onboarding, state.activities);
  const daySessions = useMemo(() => {
    if (!selectedDate) return [];
    return visiblePlan.filter((w) => w.date === selectedDate);
  }, [selectedDate, visiblePlan]);
  const nextSession = useMemo(() => {
    return (
      visiblePlan
        .filter((w) => w.date >= todayIso && w.discipline !== 'rest')
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    );
  }, [visiblePlan, todayIso]);
  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function handleDayPress(date: string) {
    if (moveMode && activeWorkoutId) {
      dispatch({ type: 'MOVE_WORKOUT', id: activeWorkoutId, newDate: date });
      setMoveMode(false);
      setSelectedDate(date);
      return;
    }
    setSelectedDate((prev) => (prev === date ? null : date));
    setActiveWorkoutId(null);
    setMoveMode(false);
  }
  function openSession(date: string, workoutId?: string) {
    setSelectedDate(date);
    setActiveWorkoutId(workoutId ?? null);
    setMoveMode(false);
  }
  return (
    <View style={{ flex: 1 }}>
      <ScreenAtmosphere intensity={0.75} />
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon plan</Text>
        <Text style={styles.sub}>
          Touchez un jour pour afficher la séance ici — sans quitter le plan.
          {vmaHint ? ` · ${vmaHint}` : ''}
        </Text>
      </View>
      {state.coachAdaptations?.[0] ? (
        <View style={styles.adaptBanner}>
          <Text style={styles.adaptTitle}>Ajustement coach</Text>
          <Text style={styles.adaptBody}>{state.coachAdaptations[0]}</Text>
        </View>
      ) : null}
      <View style={styles.calendarPad}>
        <PlanCalendar
          year={year}
          month={month}
          plan={visiblePlan}
          todayIso={todayIso}
          moveMode={moveMode}
          selectedWorkoutId={activeWorkoutId}
          selectedDate={selectedDate}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          onDayPress={handleDayPress}
        />
      </View>
      {moveMode ? (
        <View style={styles.moveHint}>
          <Text style={styles.moveHintText}>Choisissez le nouveau jour sur le calendrier</Text>
          <Pressable
            onPress={() => {
              setMoveMode(false);
              setActiveWorkoutId(null);
            }}
          >
            <Text style={styles.moveCancel}>Annuler</Text>
          </Pressable>
        </View>
      ) : null}
      {selectedDate ? (
        <View style={styles.dayPanel}>
          <Text style={styles.dayPanelTitle}>{formatDayTitle(selectedDate)}</Text>
          {daySessions.length === 0 ? (
            <Text style={styles.emptyDay}>
              Aucune séance ce jour — déplacez-en une depuis une autre date.
            </Text>
          ) : (
            daySessions.map((workout) => {
              const isActive = activeWorkoutId === workout.id;
              const summary = summarizeWorkout(workout);
              const dColor = disciplineColor(workout.discipline);
              return (
                <View
                  key={workout.id}
                  style={[
                    styles.sessionCard,
                    { backgroundColor: `${dColor}12`, borderColor: `${dColor}40` },
                    isActive && { borderColor: dColor, borderWidth: 1.5 },
                  ]}
                >
                  <Pressable onPress={() => setActiveWorkoutId(isActive ? null : workout.id)}>
                    <View style={styles.sessionHead}>
                      <View
                        style={[
                          styles.sessionDot,
                          { backgroundColor: dColor },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle}>{workout.title}</Text>
                        <Text style={styles.sessionMeta}>
                          {DISCIPLINE_META[workout.discipline].label} · {summary.durationLabel}
                          {summary.distanceLabel ? ` · ${summary.distanceLabel}` : ''}
                          {workout.expectedRpe ? ` · RPE ~${workout.expectedRpe}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.chevron, { color: dColor }]}>
                        {isActive ? '▾' : '▸'}
                      </Text>
                    </View>
                  </Pressable>
                  {isActive ? (
                    <View style={styles.sessionEdit}>
                      {workout.coachNote ? (
                        <Text style={[styles.coachNote, { color: colors.accent }]}>
                          {workout.coachNote}
                        </Text>
                      ) : null}
                      {summary.stepLines.map((line, i) => (
                        <View key={`${workout.id}-step-${i}`} style={styles.stepLine}>
                          <Text style={styles.stepTitle}>{line.title}</Text>
                          <Text style={styles.stepDetail}>{line.detail}</Text>
                        </View>
                      ))}
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.actionBtn}
                          onPress={() => router.push(`/session/${workout.id}`)}
                        >
                          <Text style={styles.actionBtnText}>Détails complets</Text>
                        </Pressable>
                        {workout.discipline !== 'rest' &&
                        canSendWorkoutToWatch(workout.discipline) ? (
                          <Pressable
                            style={[styles.actionBtn, styles.actionBtnAccent]}
                            onPress={() => router.push(`/session/${workout.id}`)}
                          >
                            <Text style={[styles.actionBtnText, styles.actionBtnTextAccent]}>
                              Envoyer séance
                            </Text>
                          </Pressable>
                        ) : null}
                        {!workout.lockedRest ? (
                          <Pressable
                            style={[styles.actionBtn, styles.actionBtnAccent]}
                            onPress={() => {
                              setActiveWorkoutId(workout.id);
                              setMoveMode(true);
                            }}
                          >
                            <Text style={[styles.actionBtnText, styles.actionBtnTextAccent]}>
                              Déplacer
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      ) : null}
      <View style={styles.upcoming}>
        <Text style={styles.sectionTitle}>Prochaine séance</Text>
        {nextSession ? (
          <Pressable style={styles.row} onPress={() => openSession(nextSession.date, nextSession.id)}>
            <View
              style={[styles.rowDot, { backgroundColor: disciplineColor(nextSession.discipline) }]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{nextSession.title}</Text>
              <Text style={styles.rowMeta}>
                {formatDayTitle(nextSession.date)} · {DISCIPLINE_META[nextSession.discipline].label}{' '}
                · {summarizeWorkout(nextSession).durationLabel}
                {nextSession.plannedDistanceM
                  ? ` · ${(nextSession.plannedDistanceM / 1000).toFixed(1).replace('.', ',')} km`
                  : ''}
              </Text>
              {nextSession.periodization ? (
                <Text style={styles.rowPhase}>
                  Phase {formatPeriodization(nextSession.periodization)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ) : (
          <Text style={styles.emptyUpcoming}>
            Aucune séance à venir — créez un programme avec le bouton +.
          </Text>
        )}
      </View>
    </AppScrollView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    header: {
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    sub: { color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 18 },
    adaptBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    adaptTitle: { fontWeight: '800', color: colors.accent, fontSize: 14 },
    adaptBody: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
    calendarPad: { padding: spacing.md, paddingBottom: spacing.sm },
    evoPad: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
    moveHint: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.accentLight,
      borderRadius: radii.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    moveHintText: { color: colors.accentDark, fontWeight: '600', fontSize: 13, flex: 1 },
    moveCancel: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    dayPanel: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayPanelTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'capitalize',
      marginBottom: spacing.sm,
    },
    emptyDay: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    sessionCard: {
      borderWidth: 1,
      borderRadius: radii.lg,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    sessionCardActive: { borderColor: colors.accent },
    sessionHead: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
    sessionDot: { width: 12, height: 12, borderRadius: 6 },
    sessionTitle: { fontWeight: '800', color: colors.text, fontSize: 16 },
    sessionMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    chevron: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
    sessionEdit: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    coachNote: {
      marginTop: spacing.sm,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    stepLine: { marginTop: spacing.sm },
    stepTitle: { fontWeight: '700', color: colors.text, fontSize: 14 },
    stepDetail: { color: colors.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 },
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
    actionBtnText: { fontWeight: '700', color: colors.text, fontSize: 13 },
    actionBtnTextAccent: { color: colors.white },
    upcoming: { paddingHorizontal: spacing.md },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    emptyUpcoming: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
    rowTitle: { fontWeight: '700', color: colors.text, fontSize: 16 },
    rowMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
    rowPhase: { color: colors.accentDark, fontSize: 12, marginTop: 4, fontWeight: '600' },
  });
}
