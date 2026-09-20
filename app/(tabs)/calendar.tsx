import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
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
import { canStartGuidedStrengthSession } from '../../src/engines/guidedStrengthSession';
import { canStartLiveWorkout } from '../../src/engines/liveWorkout';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { FadeInUp, RevealPanel, SoftPulse, StaggerIn } from '../../src/ui/motion/softMotion';
import { FloatingActionButton } from '../../src/ui/FloatingActionButton';
import { appConfirm } from '../../src/utils/appAlert';

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
  const [dropPulse, setDropPulse] = useState(false);
  const dropScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    dispatch({ type: 'PRUNE_FINISHED_PROGRAM' });
  }, [dispatch, state.plan.length, state.profile.activeProgram?.id]);

  useEffect(() => {
    if (!dropPulse) return;
    dropScale.setValue(0.96);
    Animated.sequence([
      Animated.timing(dropScale, {
        toValue: 1.03,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dropScale, {
        toValue: 1,
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    const t = setTimeout(() => setDropPulse(false), 900);
    return () => clearTimeout(t);
  }, [dropPulse, dropScale]);

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
      setDropPulse(true);
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
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 100 }}>
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
          moveTargetPulse={0.05}
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
        <SoftPulse intensity={dropPulse ? 0.04 : 0}>
          <Animated.View style={{ transform: [{ scale: dropScale }] }}>
            <RevealPanel
              key={selectedDate}
              resetKey={selectedDate}
              duration={880}
              style={styles.dayPanel}
            >
              <FadeInUp delay={40} duration={700} distance={10}>
                <Text style={styles.dayPanelTitle}>{formatDayTitle(selectedDate)}</Text>
              </FadeInUp>
              {daySessions.length === 0 ? (
                <FadeInUp delay={120} duration={720} distance={12}>
                  <SoftPulse intensity={0.03}>
                    <Pressable
                      style={styles.emptyDayCta}
                      onPress={() => router.push('/program/new')}
                      accessibilityRole="button"
                      accessibilityLabel="Planifier une séance ce jour"
                    >
                      <Text style={styles.emptyDayCtaText}>Planifier une séance ce jour</Text>
                    </Pressable>
                  </SoftPulse>
                </FadeInUp>
              ) : (
                daySessions.map((workout, index) => {
                  const isActive = activeWorkoutId === workout.id;
                  const summary = summarizeWorkout(workout);
                  const dColor = disciplineColor(workout.discipline);
                  return (
                    <StaggerIn key={workout.id} index={index} baseDelay={90} step={80} duration={680}>
                      <View
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
                          <FadeInUp
                            key={`${workout.id}-open`}
                            delay={40}
                            duration={720}
                            distance={12}
                            style={styles.sessionEdit}
                          >
                            {workout.coachNote ? (
                              <Text style={[styles.coachNote, { color: colors.accent }]}>
                                {workout.coachNote}
                              </Text>
                            ) : null}
                            {summary.stepLines.map((line, i) => (
                              <FadeInUp
                                key={`${workout.id}-step-${i}`}
                                delay={70 + i * 55}
                                duration={560}
                                distance={8}
                              >
                                <View style={styles.stepLine}>
                                  <Text style={styles.stepTitle}>{line.title}</Text>
                                  <Text style={styles.stepDetail}>{line.detail}</Text>
                                </View>
                              </FadeInUp>
                            ))}
                            <FadeInUp delay={90 + summary.stepLines.length * 45} duration={600}>
                              <View style={styles.actionRow}>
                                {workout.discipline !== 'rest' && canStartGuidedStrengthSession(workout) ? (
                                  <Pressable
                                    style={[styles.actionBtn, styles.actionBtnAccent]}
                                    onPress={() =>
                                      router.push({ pathname: '/session/guided', params: { id: workout.id } })
                                    }
                                  >
                                    <Text style={[styles.actionBtnText, styles.actionBtnTextAccent]}>
                                      Commencer la séance guidée
                                    </Text>
                                  </Pressable>
                                ) : null}
                                {canStartLiveWorkout(workout.discipline) ? (
                                  <Pressable
                                    style={[styles.actionBtn, styles.actionBtnAccent]}
                                    onPress={() =>
                                      router.push({
                                        pathname: '/session/live',
                                        params: { id: workout.id },
                                      })
                                    }
                                  >
                                    <Text style={[styles.actionBtnText, styles.actionBtnTextAccent]}>
                                      Démarrer
                                    </Text>
                                  </Pressable>
                                ) : null}
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
                                {!workout.lockedRest ? (
                                  <Pressable
                                    style={[styles.actionBtn, styles.actionBtnDanger]}
                                    onPress={() => {
                                      void (async () => {
                                        const ok = await appConfirm(
                                          'Retirer du plan',
                                          `Retirer « ${workout.title} » du plan ?`,
                                          'Retirer',
                                          'Annuler',
                                        );
                                        if (!ok) return;
                                        dispatch({ type: 'REMOVE_WORKOUT', id: workout.id });
                                        setActiveWorkoutId(null);
                                      })();
                                    }}
                                  >
                                    <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                                      Retirer
                                    </Text>
                                  </Pressable>
                                ) : null}
                              </View>
                            </FadeInUp>
                          </FadeInUp>
                        ) : null}
                      </View>
                    </StaggerIn>
                  );
                })
              )}
            </RevealPanel>
          </Animated.View>
        </SoftPulse>
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
          <SoftPulse intensity={0.03}>
            <Text style={styles.emptyUpcoming}>
              Aucune séance à venir — créez un programme avec le bouton +.
            </Text>
          </SoftPulse>
        )}
      </View>
    </AppScrollView>
      <FloatingActionButton />
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    header: {
      padding: spacing.md,
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
    emptyDayCta: {
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
    },
    emptyDayCtaText: {
      color: colors.accentDark,
      fontWeight: '700',
      fontSize: 14,
    },
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
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    actionBtn: {
      flexGrow: 1,
      flexBasis: '40%',
      minWidth: 120,
      paddingVertical: 12,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
    actionBtnDanger: {
      backgroundColor: `${colors.danger}14`,
      borderColor: `${colors.danger}55`,
    },
    actionBtnText: { fontWeight: '700', color: colors.text, fontSize: 13 },
    actionBtnTextAccent: { color: colors.white },
    actionBtnTextDanger: { color: colors.danger },
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
