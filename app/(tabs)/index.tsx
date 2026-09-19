import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  daysBetweenIso,
  nextTrainingWorkout,
  resolveDigitalTwin,
  todayWorkout,
  useApp,
} from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { DISCIPLINE_META, supportsActivityImport } from '../../src/constants/disciplines';
import { summarizeWorkout } from '../../src/engines/workoutPresentation';
import { canStartLiveWorkout } from '../../src/engines/liveWorkout';
import { canStartGuidedStrengthSession } from '../../src/engines/guidedStrengthSession';
import {
  computeDailyAdjustment,
  scaleWorkoutVolume,
} from '../../src/engines/dailyAdjustment';
import { computeAthleteLoadSnapshot } from '../../src/engines/athleteLoadBridge';
import { FadeInUp, PressableScale, SoftPulse } from '../../src/ui/motion/softMotion';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { SportAtmosphereBanner } from '../../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../../src/constants/sportVisuals';
import { DayStatusBanner } from '../../src/ui/home/DayStatusBanner';
import { DayStateChip } from '../../src/ui/home/DayStateChip';
import { HomeStatusStack } from '../../src/ui/home/HomeStatusStack';
import { WhyCoachExpand } from '../../src/ui/home/WhyCoachExpand';
import { FloatingActionButton } from '../../src/ui/FloatingActionButton';

function daysUntilLabel(n: number): string {
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  return `dans ${n} jours`;
}

/** Accueil — cockpit du jour (audit UX : une action prioritaire). */
export default function HomeDashboard() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [timeModeOpen, setTimeModeOpen] = useState(false);
  const [learnPulse, setLearnPulse] = useState(false);
  /** Session-local — stress vie pour readiness (non persisté). */
  const [lifeStress01, setLifeStress01] = useState<number | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const today = todayWorkout(state.plan);
  const isTodayTraining = Boolean(today && today.discipline !== 'rest');
  const focus = isTodayTraining
    ? today!
    : nextTrainingWorkout(state.plan, todayIso);
  const daysUntil = focus ? daysBetweenIso(todayIso, focus.date) : null;
  const summary =
    focus && focus.discipline !== 'rest' ? summarizeWorkout(focus) : null;
  const discColor = focus
    ? DISCIPLINE_META[focus.discipline]?.color ?? colors.accent
    : colors.accent;

  const activePrograms = resolveActivePrograms(state.profile);
  const twin = useMemo(
    () => resolveDigitalTwin(state),
    [state.profile.digitalTwin, state.profile.onboarding, state.profile.birthDate],
  );
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName =
    state.profile.firstName && state.profile.firstName !== '1'
      ? state.profile.firstName
      : 'athlète';

  const strengthOnlyPrograms =
    activePrograms.length > 0 &&
    activePrograms.every(
      (p) => p.sportCategory === 'strength' || p.sportCategory === 'other',
    );

  const learnInsight = state.coachAdaptations?.[0]?.startsWith(
    'Azimut vient d’apprendre',
  );
  useEffect(() => {
    if (!learnInsight) return;
    setLearnPulse(true);
    const t = setTimeout(() => setLearnPulse(false), 4200);
    return () => clearTimeout(t);
  }, [learnInsight, state.coachAdaptations?.[0]]);

  const adjustment = useMemo(() => {
    const snap = computeAthleteLoadSnapshot({
      formTsb: state.banister.formTsb,
      health: state.health,
      activities: state.activities,
      feedbacks: state.feedbacks,
      plan: state.plan,
      onboarding: state.profile.onboarding,
      twin,
      lifeStress01,
      asOfIso: todayIso,
    });
    return computeDailyAdjustment({
      todayWorkout: today,
      pendingRpe: Boolean(state.pendingRpeActivityId),
      hasActiveProgram: activePrograms.length > 0,
      formTsb: state.banister.formTsb,
      sleepScore: snap.sleepScore,
      twin,
      hrvRatio: snap.hrvRatio,
      acwr: snap.acwr,
      lifeStress01,
      sleepDebtHours3d: snap.sleepDebtHours3d,
      recentRpeDelta: snap.recentRpeDelta,
      hrvTrend14d: snap.hrvTrend14d,
      rpeCreep: snap.rpeCreep,
      weeklyVolumeIncreasePct: snap.weeklyVolumeIncreasePct,
      recoveryInput: {
        activities: state.activities,
        feedbacks: state.feedbacks,
        plan: state.plan,
        onboarding: state.profile.onboarding,
      },
    });
  }, [
    today,
    todayIso,
    state.pendingRpeActivityId,
    activePrograms.length,
    state.banister.formTsb,
    state.health,
    state.activities,
    state.feedbacks,
    state.plan,
    state.profile.onboarding,
    twin,
    lifeStress01,
  ]);

  const startLive = (sessionId: string) => {
    router.push({ pathname: '/session/live', params: { id: sessionId } });
  };

  const applyScaledAndGo = (factor: number) => {
    if (!focus || !isTodayTraining) return;
    const scaled = scaleWorkoutVolume(focus, factor);
    dispatch({ type: 'UPDATE_WORKOUT', id: focus.id, patch: scaled });
    setTimeModeOpen(false);
    if (canStartLiveWorkout(scaled.discipline)) {
      startLive(focus.id);
    } else {
      router.push(`/session/${focus.id}`);
    }
  };

  const primary = (() => {
    if (adjustment.kind === 'rpe_pending') {
      return {
        label: 'Donner mon ressenti (30 sec)',
        onPress: () => router.push('/session/rpe'),
        color: colors.accent,
      };
    }
    if (!isTodayTraining && !focus) {
      return {
        label: 'Créer mon programme',
        onPress: () => router.push('/program/new'),
        color: colors.accent,
      };
    }
    if (!isTodayTraining && focus) {
      return {
        label: 'Voir le plan',
        onPress: () => router.push('/(tabs)/calendar'),
        color: discColor,
      };
    }
    if (adjustment.kind === 'rest') {
      return {
        label: 'Ajuster ma séance',
        onPress: () => setTimeModeOpen(true),
        color: '#D97706',
      };
    }
    if (adjustment.kind === 'adapt') {
      return {
        label: 'Voir l’ajustement',
        onPress: () => applyScaledAndGo(adjustment.volumeFactor || 0.7),
        color: '#D97706',
        secondary: {
          label: 'Démarrer quand même',
          onPress: () => {
            if (focus && canStartLiveWorkout(focus.discipline)) startLive(focus.id);
            else if (focus) router.push(`/session/${focus.id}`);
          },
        },
      };
    }
    if (focus && canStartLiveWorkout(focus.discipline)) {
      return {
        label: 'Démarrer ma séance',
        onPress: () => startLive(focus.id),
        color: discColor,
      };
    }
    if (focus && canStartGuidedStrengthSession(focus)) {
      return {
        label: 'Démarrer la séance guidée',
        onPress: () =>
          router.push({ pathname: '/session/guided', params: { id: focus.id } }),
        color: discColor,
      };
    }
    if (focus && !supportsActivityImport(focus.discipline)) {
      return {
        label: 'Donner mon ressenti (30 sec)',
        onPress: () =>
          router.push({
            pathname: '/session/rpe',
            params: { sessionId: focus.id },
          }),
        color: discColor,
      };
    }
    if (focus && supportsActivityImport(focus.discipline)) {
      return {
        label: 'Démarrer ma séance',
        onPress: () => router.push(`/session/${focus.id}`),
        color: discColor,
      };
    }
    return {
      label: 'Sortie libre',
      onPress: () => router.push('/(tabs)/record'),
      color: colors.accent,
    };
  })();

  const sentinel = adjustment.sentinel;

  return (
    <View style={styles.root}>
      <ScreenAtmosphere intensity={0.85} />
      <AppScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <FadeInUp>
          <View style={styles.helloBlock}>
            <Text style={styles.hello}>
              {hello}, {firstName}
            </Text>
          </View>
        </FadeInUp>

        <DayStatusBanner
          adjustment={adjustment}
          onPress={() => router.push('/(tabs)/body')}
        />

        {adjustment.whyLine ? <WhyCoachExpand whyLine={adjustment.whyLine} /> : null}

        <View style={styles.homeChipRow}>
          <DayStateChip
            confidence={twin.modelConfidence}
            lifeStress01={lifeStress01}
            onToggleStress={() =>
              setLifeStress01((prev) => (prev == null ? 0.65 : null))
            }
          />
        </View>

        <HomeStatusStack
          sentinel={sentinel}
          coachBanner={
            (adjustment.kind === 'adapt' || adjustment.kind === 'rest') &&
            adjustment.coachMessage
              ? {
                  title: 'Ajustement coach',
                  body: adjustment.coachMessage,
                  onPress: () =>
                    adjustment.kind === 'adapt'
                      ? applyScaledAndGo(adjustment.volumeFactor || 0.7)
                      : setTimeModeOpen(true),
                }
              : state.coachAdaptations?.[0]
                ? {
                    title: learnInsight ? 'Apprentissage' : 'Ajustement coach',
                    body: state.coachAdaptations[0],
                    onPress: () => router.push('/(tabs)/calendar'),
                    pulse: learnPulse,
                  }
                : null
          }
        />

        <FadeInUp delay={100}>
          <View style={[styles.todayCard, { borderLeftColor: discColor }]}>
            {isTodayTraining && focus ? (
              <>
                <PressableScale
                  variant="subtle"
                  onPress={() => router.push(`/session/${focus.id}`)}
                >
                  <Text style={[styles.todayLabel, { color: discColor }]}>
                    SÉANCE DU JOUR
                  </Text>
                  <Text style={styles.todayTitle}>{focus.title}</Text>
                  <Text style={styles.todayMeta}>
                    {DISCIPLINE_META[focus.discipline]?.label ?? focus.discipline}
                    {summary ? ` · ${summary.durationLabel}` : ''}
                    {summary?.distanceLabel ? ` · ${summary.distanceLabel}` : ''}
                  </Text>
                  {adjustment.sessionCue ? (
                    <Text style={styles.sessionCue} numberOfLines={2}>
                      {adjustment.sessionCue}
                    </Text>
                  ) : null}
                </PressableScale>

                <SoftPulse intensity={0.035} style={{ marginTop: spacing.md }}>
                  <PressableScale
                    variant="pop"
                    style={[styles.primaryBtn, { backgroundColor: primary.color }]}
                    onPress={primary.onPress}
                  >
                    <Text style={styles.primaryBtnText}>{primary.label}</Text>
                  </PressableScale>
                </SoftPulse>

                {'secondary' in primary && primary.secondary ? (
                  <PressableScale
                    variant="subtle"
                    style={styles.secondaryLink}
                    onPress={primary.secondary.onPress}
                  >
                    <Text style={styles.secondaryLinkText}>
                      {primary.secondary.label}
                    </Text>
                  </PressableScale>
                ) : null}

                <View style={styles.chipRow}>
                  <PressableScale
                    variant="subtle"
                    contentStyle={styles.chip}
                    onPress={() => setShowMore((v) => !v)}
                  >
                    <Text style={styles.chipText}>···</Text>
                  </PressableScale>
                </View>

                {timeModeOpen ? (
                  <View style={styles.timeBox}>
                    <Text style={styles.timeTitle}>Je n’ai pas le temps</Text>
                    <PressableScale
                      variant="nav"
                      style={styles.timeBtn}
                      onPress={() => applyScaledAndGo(0.7)}
                    >
                      <Text style={styles.timeBtnText}>Version 70 %</Text>
                    </PressableScale>
                    <PressableScale
                      variant="nav"
                      style={styles.timeBtn}
                      onPress={() => applyScaledAndGo(0.5)}
                    >
                      <Text style={styles.timeBtnText}>Version 50 %</Text>
                    </PressableScale>
                    <PressableScale
                      variant="nav"
                      style={[styles.timeBtn, styles.timeBtnMuted]}
                      onPress={() => {
                        dispatch({
                          type: 'MOVE_WORKOUT',
                          id: focus.id,
                          newDate: new Date(Date.now() + 86400000)
                            .toISOString()
                            .slice(0, 10),
                        });
                        setTimeModeOpen(false);
                      }}
                    >
                      <Text style={styles.timeBtnText}>Reporter à demain</Text>
                    </PressableScale>
                  </View>
                ) : null}

                {showMore ? (
                  <View style={styles.moreBox}>
                    {supportsActivityImport(focus.discipline) ? (
                      <PressableScale
                        variant="subtle"
                        onPress={() => {
                          setShowMore(false);
                          router.push('/import-activity');
                        }}
                      >
                        <Text style={styles.moreLink}>Importer</Text>
                      </PressableScale>
                    ) : null}
                    <PressableScale
                      variant="subtle"
                      onPress={() => {
                        setShowMore(false);
                        router.push(`/session/${focus.id}`);
                      }}
                    >
                      <Text style={styles.moreLink}>Détails</Text>
                    </PressableScale>
                    <PressableScale
                      variant="subtle"
                      onPress={() => {
                        setShowMore(false);
                        setTimeModeOpen(true);
                      }}
                    >
                      <Text style={styles.moreLink}>Pas le temps</Text>
                    </PressableScale>
                    <PressableScale
                      variant="subtle"
                      onPress={() => {
                        setShowMore(false);
                        router.push('/program/adjust');
                      }}
                    >
                      <Text style={styles.moreLink}>Ajuster allures & jours</Text>
                    </PressableScale>
                    <PressableScale
                      variant="subtle"
                      onPress={() => router.push('/(tabs)/calendar')}
                    >
                      <Text style={styles.moreLink}>Voir le plan</Text>
                    </PressableScale>
                    <PressableScale
                      variant="subtle"
                      onPress={() => router.push('/(tabs)/record')}
                    >
                      <Text style={styles.moreLink}>Enregistrer une sortie libre</Text>
                    </PressableScale>
                  </View>
                ) : null}
              </>
            ) : focus ? (
              <>
                <Text style={[styles.todayLabel, { color: discColor }]}>
                  PROCHAINE · {daysUntilLabel(daysUntil ?? 0).toUpperCase()}
                </Text>
                <Text style={styles.todayTitle}>{focus.title}</Text>
                <Text style={styles.todayMeta}>
                  {new Date(focus.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                <SoftPulse intensity={0.03} style={{ marginTop: spacing.md }}>
                  <PressableScale
                    variant="pop"
                    style={[styles.primaryBtn, { backgroundColor: primary.color }]}
                    onPress={primary.onPress}
                  >
                    <Text style={styles.primaryBtnText}>{primary.label}</Text>
                  </PressableScale>
                </SoftPulse>
              </>
            ) : (
              <>
                <Text style={styles.todayLabel}>AUCUNE SÉANCE</Text>
                <Text style={styles.todayTitle}>Choisis ton cap</Text>
                <SoftPulse intensity={0.03} style={{ marginTop: spacing.md }}>
                  <PressableScale
                    variant="pop"
                    style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                    onPress={() => router.push('/program/new')}
                  >
                    <Text style={styles.primaryBtnText}>Créer mon programme</Text>
                  </PressableScale>
                </SoftPulse>
                <PressableScale
                  variant="subtle"
                  style={styles.secondaryLink}
                  onPress={() => router.push('/(tabs)/record')}
                >
                  <Text style={styles.secondaryLinkText}>Ou sortie libre</Text>
                </PressableScale>
              </>
            )}
          </View>
        </FadeInUp>

        <View style={styles.metricsRow}>
          <PressableScale
            variant="nav"
            style={[styles.metric, { backgroundColor: '#EFF6FF' }]}
            onPress={() => router.push('/sleep')}
          >
            <Text style={[styles.metricV, { color: '#2563EB' }]}>
              {state.health.sleep?.score ?? '—'}
            </Text>
            <Text style={styles.metricL}>Sommeil</Text>
          </PressableScale>
          <PressableScale
            variant="nav"
            style={[styles.metric, { backgroundColor: colors.accentLight }]}
            onPress={() =>
              router.push({ pathname: '/(tabs)/body', params: { tab: 'classement' } })
            }
          >
            <Text style={styles.metricV}>{state.profile.ranked.xp}</Text>
            <Text style={styles.metricL}>XP</Text>
          </PressableScale>
          <PressableScale
            variant="nav"
            style={[styles.metric, { backgroundColor: '#FEF3C7' }]}
            onPress={() =>
              router.push({ pathname: '/(tabs)/body', params: { tab: 'performance' } })
            }
          >
            <Text style={[styles.metricV, { color: '#D97706' }]}>
              {state.banister.formTsb.toFixed(0)}
            </Text>
            <Text style={styles.metricL}>Forme</Text>
          </PressableScale>
        </View>

        <PressableScale
          variant="nav"
          style={styles.weekCard}
          onPress={() => router.push('/week-review')}
        >
          <Text style={styles.weekTitle}>Bilan de la semaine</Text>
          <Text style={styles.weekSub}>Charge, forme, tendance ›</Text>
        </PressableScale>

        <Text style={styles.feedSection}>Activités récentes</Text>
        {state.activities.length === 0 ? (
          <View style={styles.emptyFeed}>
            {!strengthOnlyPrograms ? (
              <SportAtmosphereBanner
                source={ATMOSPHERE_IMAGES.run}
                title="Importe ta première sortie"
                subtitle="Touche ici · Strava Web → export GPX / TCX"
                height={132}
                onPress={() => router.push('/import-activity')}
              />
            ) : null}
            <SoftPulse intensity={0.035}>
              <View>
                <Text style={styles.emptyTitle}>Aucune activité récente</Text>
                <Text style={styles.emptySub}>
                  {strengthOnlyPrograms
                    ? 'Valide ta séance du jour avec le bouton principal.'
                    : `Le jour d'une séance, démarre le tracker ou importe une sortie.`}
                </Text>
              </View>
            </SoftPulse>
          </View>
        ) : (
          state.activities.map((a) => {
            const analysis = state.analyses.find((x) => x.activityId === a.id);
            const date = new Date(a.startDate);
            const dateStr = date.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <PressableScale
                variant="nav"
                key={a.id}
                style={styles.feedCard}
                onPress={() =>
                  router.push({
                    pathname: '/activity/[id]',
                    params: { id: a.id },
                  })
                }
              >
                <Text style={styles.feedTitle}>{a.name}</Text>
                <Text style={styles.feedMeta}>
                  {dateStr}
                  {a.distanceM
                    ? ` · ${(a.distanceM / 1000).toFixed(1).replace('.', ',')} km`
                    : ''}
                  {a.movingSec
                    ? ` · ${Math.round(a.movingSec / 60)} min`
                    : ''}
                  {analysis ? ` · ${analysis.compliance.total}%` : ''}
                </Text>
              </PressableScale>
            );
          })
        )}
      </AppScrollView>
      <FloatingActionButton />
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1, paddingHorizontal: spacing.lg },
    helloBlock: { paddingTop: spacing.md, marginBottom: spacing.sm },
    homeChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginBottom: spacing.sm,
    },
    stressChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    stressChipText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    hello: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.5,
    },
    sentinelBanner: {
      backgroundColor: 'rgba(217, 119, 6, 0.12)',
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(217, 119, 6, 0.35)',
    },
    sentinelTitle: {
      fontWeight: '800',
      color: '#B45309',
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sentinelSub: {
      marginTop: 4,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    coachBanner: {
      backgroundColor: 'rgba(14,143,111,0.1)',
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(14,143,111,0.25)',
    },
    coachBannerTitle: {
      fontWeight: '800',
      color: colors.accentDark,
      fontSize: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    coachBannerSub: {
      marginTop: 4,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    coachLink: {
      marginTop: 8,
      fontWeight: '800',
      color: colors.accent,
      fontSize: 13,
    },
    todayCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderLeftWidth: 4,
      marginBottom: spacing.md,
    },
    todayLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    todayTitle: {
      marginTop: 6,
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -0.4,
    },
    todayMeta: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    sessionCue: {
      marginTop: 8,
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
      fontStyle: 'italic',
      lineHeight: 18,
    },
    primaryBtn: {
      borderRadius: radii.pill,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 52,
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 16,
      letterSpacing: 0.2,
      textAlign: 'center',
      width: '100%',
    },
    secondaryLink: {
      alignSelf: 'center',
      paddingVertical: 10,
    },
    secondaryLinkText: {
      color: colors.accent,
      fontWeight: '700',
      fontSize: 14,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: spacing.md,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.bgSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    timeBox: {
      marginTop: spacing.md,
      gap: 8,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.bgSecondary,
    },
    timeTitle: {
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    timeBtn: {
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    timeBtnMuted: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeBtnText: { color: colors.text, fontWeight: '800' },
    moreBox: { marginTop: spacing.sm, gap: 8 },
    moreLink: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: spacing.md,
    },
    metric: {
      flex: 1,
      borderRadius: radii.lg,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 72,
      justifyContent: 'center',
    },
    metricV: { fontSize: 20, fontWeight: '900', color: colors.accentDark },
    metricL: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    weekCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weekTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    weekSub: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
    feedSection: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    emptyFeed: { paddingVertical: spacing.md },
    emptyTitle: {
      marginTop: spacing.sm,
      fontWeight: '800',
      color: colors.text,
      fontSize: 16,
    },
    emptySub: {
      marginTop: 4,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    feedCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    feedTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    feedMeta: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  });
}
