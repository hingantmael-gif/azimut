import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import {
  daysBetweenIso,
  nextTrainingWorkout,
  resolveDigitalTwin,
  todayWorkout,
  useApp,
} from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { mixHex, radii, readableOn, rgba, spacing } from '../../src/theme/tokens';
import { toLocalDateIso } from '../../src/engines/sleepCalendar';
import { FloatingActionButton } from '../../src/ui/FloatingActionButton';
import { TopProgramsStrip } from '../../src/ui/program/TopProgramsStrip';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatTile } from '../../src/ui/primitives';
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
import { HomeStatusStack } from '../../src/ui/home/HomeStatusStack';
import { WhyCoachExpand } from '../../src/ui/home/WhyCoachExpand';

function daysUntilLabel(n: number): string {
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  return `dans ${n} jours`;
}

/** Accueil — cockpit du jour (audit UX : une action prioritaire). */
export default function HomeDashboard() {
  const { state, dispatch } = useApp();
  const { colors, isDark } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const heroColors = isDark ? (['#0F2238', '#0B4A44'] as const) : (['#0B1B2B', '#0E3B3A'] as const);
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [timeModeOpen, setTimeModeOpen] = useState(false);
  const [learnPulse, setLearnPulse] = useState(false);
  /** Session-local — stress vie pour readiness (non persisté). */
  const [lifeStress01, setLifeStress01] = useState<number | null>(null);

  const todayIso = toLocalDateIso(new Date());
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
    'Mova vient d’apprendre',
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
      // Pas de séance aujourd'hui : on propose d'en faire une TOUT DE SUITE plutôt que d'attendre.
      return {
        label: 'Faire une séance maintenant',
        onPress: () => router.push('/library?quick=1'),
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
      onPress: () => router.navigate('/(tabs)/record'),
      color: colors.accent,
    };
  })();

  const sentinel = adjustment.sentinel;
  /** Libellé du hero : la couleur du sport éclaircie pour rester lisible sur fond sombre. */
  const heroLabel = discColor.startsWith('#') ? mixHex(discColor, '#FFFFFF', 0.45) : '#FFFFFF';

  return (
    <View style={styles.root}>
      <ScreenAtmosphere intensity={0.85} />
      <AppScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <FadeInUp>
          <View style={styles.helloBlock}>
            <Text style={styles.helloDate}>
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={styles.hello}>
              {hello}, {firstName}
            </Text>
          </View>
        </FadeInUp>

        <FadeInUp delay={100}>
          <LinearGradient
            colors={heroColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayCard}
          >
            <View
              pointerEvents="none"
              style={[styles.heroGlow, { backgroundColor: rgba(discColor.startsWith('#') ? discColor : colors.accent, 0.35) }]}
            />
            {isTodayTraining && focus ? (
              <>
                <PressableScale
                  variant="subtle"
                  onPress={() => router.push(`/session/${focus.id}`)}
                >
                  <Text style={[styles.todayLabel, { color: heroLabel }]}>
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
                    <Text style={[styles.primaryBtnText, { color: readableOn(primary.color) }]}>{primary.label}</Text>
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
                  </View>
                ) : null}
              </>
            ) : focus ? (
              <>
                <Text style={[styles.todayLabel, { color: heroLabel }]}>
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
                    <Text style={[styles.primaryBtnText, { color: readableOn(primary.color) }]}>{primary.label}</Text>
                  </PressableScale>
                </SoftPulse>
                <PressableScale variant="subtle" style={styles.secondaryLink} onPress={() => router.navigate('/calendar')}>
                  <Text style={styles.secondaryLinkText}>Voir le plan</Text>
                </PressableScale>
              </>
            ) : (
              <>
                <Text style={[styles.todayLabel, { color: heroLabel }]}>AUCUNE SÉANCE</Text>
                <Text style={styles.todayTitle}>Choisis ton cap</Text>
                <SoftPulse intensity={0.03} style={{ marginTop: spacing.md }}>
                  <PressableScale
                    variant="pop"
                    style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                    onPress={() => router.push('/program/new')}
                  >
                    <Text style={[styles.primaryBtnText, { color: readableOn(colors.accent) }]}>Créer mon programme</Text>
                  </PressableScale>
                </SoftPulse>
                <PressableScale
                  variant="subtle"
                  style={styles.secondaryLink}
                  onPress={() => router.push('/library?quick=1')}
                >
                  <Text style={styles.secondaryLinkText}>Ou faire une séance maintenant</Text>
                </PressableScale>
              </>
            )}
          </LinearGradient>
        </FadeInUp>

        {/* Faire une séance TOUT DE SUITE, sans attendre le prochain jour du plan. */}
        <View style={styles.quickRow}>
          {(
            [
              { label: 'Séance rapide', sub: 'Choisis ton temps', icon: 'flash', href: '/library' },
              { label: 'Sortie libre', sub: 'Tracker GPS', icon: 'navigate', href: '/(tabs)/record' },
            ] as const
          ).map((q) => (
            <PressableScale
              key={q.label}
              variant="pop"
              style={styles.quickTileWrap}
              contentStyle={[styles.quickTile, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => router.push(q.href as never)}
              accessibilityLabel={q.label}
            >
              <View style={[styles.quickIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name={q.icon} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>{q.label}</Text>
              <Text style={[styles.quickSub, { color: colors.textMuted }]} numberOfLines={1}>{q.sub}</Text>
            </PressableScale>
          ))}
        </View>

        <DayStatusBanner
          adjustment={adjustment}
          onPress={() => router.navigate('/(tabs)/body')}
        />

        {adjustment.whyLine ? <WhyCoachExpand whyLine={adjustment.whyLine} /> : null}

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
                    onPress: () => router.navigate('/calendar'),
                    pulse: learnPulse,
                  }
                : null
          }
        />

        <View style={{ paddingHorizontal: spacing.md }}>
          <TopProgramsStrip
            countedTemplateIds={state.profile.programUsageCountedIds ?? state.profile.programUsageCountedId}
          />
        </View>

        <View style={styles.metricsRow}>
          <PressableScale
            variant="nav"
            style={styles.metricPress}
            onPress={() => router.push('/sleep')}
          >
            <StatTile tone="sleep" value={String(state.health.sleep?.score ?? '—')} label="Sommeil" />
          </PressableScale>
          <PressableScale
            variant="nav"
            style={styles.metricPress}
            onPress={() =>
              router.push({ pathname: '/(tabs)/body', params: { tab: 'classement' } })
            }
          >
            <StatTile tone="xp" value={String(state.profile.ranked.xp)} label="XP" />
          </PressableScale>
          <PressableScale
            variant="nav"
            style={styles.metricPress}
            onPress={() =>
              router.push({ pathname: '/(tabs)/body', params: { tab: 'performance' } })
            }
          >
            <StatTile tone="accent" value={state.banister.formTsb.toFixed(0)} label="Forme" />
          </PressableScale>
        </View>

        <View style={styles.feedHead}>
          <Text style={[styles.feedSection, { marginBottom: 0 }]}>Activités récentes</Text>
          <PressableScale variant="subtle" onPress={() => router.push('/week-review')}>
            <Text style={styles.feedLink}>Bilan de la semaine ›</Text>
          </PressableScale>
        </View>
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
          state.activities.slice(0, 5).map((a) => {
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
                style={styles.feedPress}
                onPress={() =>
                  router.push({
                    pathname: '/activity/[id]',
                    params: { id: a.id },
                  })
                }
              >
               <Card level={1} style={styles.feedCard}>
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
               </Card>
              </PressableScale>
            );
          })
        )}
        {state.activities.length > 5 ? (
          <PressableScale variant="subtle" style={styles.secondaryLink} onPress={() => router.push('/activities')}>
            <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Voir toutes les activités</Text>
          </PressableScale>
        ) : null}
      </AppScrollView>
      <FloatingActionButton />
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
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
    helloDate: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 2,
    },
    hello: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.7,
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
    feedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
    feedLink: { fontSize: 13, fontWeight: '700', color: colors.accent },
    quickRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.sm },
    quickTileWrap: { flex: 1 },
    quickTile: { borderRadius: radii.lg, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'flex-start', gap: 2 },
    quickIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    quickLabel: { fontSize: 12.5, fontWeight: '800' },
    quickSub: { fontSize: 10.5 },
    sectionKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginHorizontal: spacing.md, marginTop: spacing.md },
    todayCard: {
      borderRadius: radii.xxl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
      boxShadow: `0px 14px 36px ${rgba(colors.shadow, 0.28)}`,
    },
    heroGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      top: -90,
      right: -70,
    },
    todayLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    todayTitle: {
      marginTop: 8,
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.6,
      lineHeight: 31,
    },
    todayMeta: {
      marginTop: 8,
      color: 'rgba(255,255,255,0.74)',
      fontSize: 14,
      fontWeight: '600',
    },
    sessionCue: {
      marginTop: 10,
      color: 'rgba(255,255,255,0.66)',
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 19,
    },
    primaryBtn: {
      borderRadius: radii.lg,
      paddingVertical: 16,
      alignItems: 'center',
      minHeight: 54,
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontWeight: '800',
      fontSize: 16,
      letterSpacing: 0.1,
      textAlign: 'center',
      width: '100%',
    },
    secondaryLink: {
      alignSelf: 'center',
      paddingVertical: 10,
    },
    secondaryLinkText: {
      color: 'rgba(255,255,255,0.9)',
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      minHeight: 36,
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    timeBox: {
      marginTop: spacing.md,
      gap: 8,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    timeTitle: {
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    timeBtn: {
      backgroundColor: '#FFFFFF',
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    timeBtnMuted: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    timeBtnText: { color: '#0B1B2B', fontWeight: '800' },
    moreBox: { marginTop: spacing.sm, gap: 10 },
    moreLink: { color: '#8FF0CB', fontWeight: '700', fontSize: 14 },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: spacing.md,
    },
    metricPress: { flex: 1 },
    weekPress: { marginBottom: spacing.lg },
    weekCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    weekTitle: { fontWeight: '800', color: colors.text, fontSize: 16 },
    weekSub: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
    weekChevron: { fontSize: 26, color: colors.textMuted, marginTop: -2 },
    feedSection: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.1,
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
    feedPress: { marginBottom: spacing.sm },
    feedCard: {},
    feedTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    feedMeta: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  });
}
