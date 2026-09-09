import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  daysBetweenIso,
  nextTrainingWorkout,
  todayWorkout,
  useApp,
} from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { formatDuration } from '../../src/engines/core';
import { DISCIPLINE_META, supportsActivityImport } from '../../src/constants/disciplines';
import { summarizeWorkout } from '../../src/engines/workoutPresentation';
import { canStartLiveWorkout } from '../../src/engines/liveWorkout';
import { FadeInUp } from '../../src/ui/motion/softMotion';
import { ScreenAtmosphere } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { resolveActivePrograms } from '../../src/engines/multiProgramPlan';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { NewProgramLabel } from '../../src/ui/brand/NewProgramLabel';
import { SportAtmosphereBanner } from '../../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../../src/constants/sportVisuals';

function daysUntilLabel(n: number): string {
  if (n <= 0) return 'aujourd’hui';
  if (n === 1) return 'demain';
  return `dans ${n} jours`;
}

/** Accueil — séance du jour / prochaine + activités cliquables */
export default function HomeDashboard() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
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

  const p = state.profile;
  const avatarLabel =
    p.firstName === '1' && p.lastName === '1'
      ? '1'
      : `${p.firstName?.[0] || '?'}${p.lastName?.[0] || ''}`;
  const hour = new Date().getHours();
  const hello =
    hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = p.firstName && p.firstName !== '1' ? p.firstName : 'athlète';
  const rpeXp = 50;
  const showStravaImport =
    isTodayTraining && focus && supportsActivityImport(focus.discipline);
  const strengthOnlyPrograms =
    activePrograms.length > 0 &&
    activePrograms.every((p) => p.sportCategory === 'strength');

  return (
    <View style={styles.root}>
      <ScreenAtmosphere intensity={0.85} />
    <AppScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 32 }}>
      <FadeInUp>
        <View style={styles.helloBlock}>
          <Text style={styles.hello}>
            {hello}, {firstName}
          </Text>
        </View>
      </FadeInUp>

      {state.coachAdaptations?.[0] ? (
        <Pressable
          style={styles.coachBanner}
          onPress={() => router.push('/(tabs)/calendar')}
        >
          <Text style={styles.coachBannerTitle}>Ajustement coach</Text>
          <Text style={styles.coachBannerSub} numberOfLines={3}>
            {state.coachAdaptations[0]}
          </Text>
        </Pressable>
      ) : null}

      {state.pendingRpeActivityId ? (
        <Pressable style={styles.rpeBanner} onPress={() => router.push('/session/rpe')}>
          <Text style={styles.rpeTitle}>Feedback RPE en attente</Text>
          <Text style={styles.rpeSub}>Aide le coach à ajuster ta prochaine séance</Text>
        </Pressable>
      ) : null}

      <FadeInUp delay={120}>
      <View style={[styles.todayCard, { borderLeftColor: discColor }]}>
        {isTodayTraining ? (
          <>
            <Pressable
              onPress={() => router.push(`/session/${focus!.id}`)}
              accessibilityRole="button"
              accessibilityLabel="Voir le détail de la séance"
            >
              <Text style={[styles.todayLabel, { color: discColor }]}>SÉANCE DU JOUR</Text>
              <Text style={styles.todayTitle}>{focus!.title}</Text>
              <Text style={styles.todayMeta}>
                {DISCIPLINE_META[focus!.discipline]?.label ?? focus!.discipline}
                {summary ? ` · ${summary.durationLabel}` : ''}
                {summary?.distanceLabel ? ` · ${summary.distanceLabel}` : ''}
                {focus!.expectedRpe ? ` · RPE ~${focus!.expectedRpe}` : ''}
              </Text>
              {summary?.stepLines.slice(0, 3).map((line, i) => (
                <Text key={`step-${i}`} style={styles.stepPreview}>
                  {line.title} — {line.detail}
                </Text>
              ))}
            </Pressable>
            {isTodayTraining &&
            focus &&
            canStartLiveWorkout(focus.discipline) ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: discColor, marginTop: spacing.md }]}
                onPress={() =>
                  router.push({ pathname: '/session/live', params: { id: focus.id } })
                }
                accessibilityRole="button"
                accessibilityLabel="Effectuer la séance dans Azimut"
              >
                <Text style={styles.primaryBtnText}>Effectuer la séance dans Azimut</Text>
              </Pressable>
            ) : null}
            {showStravaImport ? (
              <Pressable
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      isTodayTraining && focus && canStartLiveWorkout(focus.discipline)
                        ? colors.bgElevated
                        : discColor,
                    marginTop: spacing.sm,
                    borderWidth:
                      isTodayTraining && focus && canStartLiveWorkout(focus.discipline) ? 1 : 0,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => router.push('/import-activity')}
                accessibilityRole="button"
                accessibilityLabel="Importer depuis Strava"
              >
                <Text
                  style={[
                    styles.primaryBtnText,
                    isTodayTraining && focus && canStartLiveWorkout(focus.discipline)
                      ? { color: colors.text }
                      : null,
                  ]}
                >
                  Importer depuis Strava
                </Text>
              </Pressable>
            ) : isTodayTraining &&
              focus &&
              !supportsActivityImport(focus.discipline) ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: discColor, marginTop: spacing.md }]}
                onPress={() =>
                  router.push({
                    pathname: '/session/rpe',
                    params: { sessionId: focus.id },
                  })
                }
              >
                <Text style={styles.primaryBtnText}>Valider la séance (RPE)</Text>
              </Pressable>
            ) : null}
          </>
        ) : focus ? (
          <>
            <Pressable
              onPress={() => router.push(`/session/${focus.id}`)}
              accessibilityRole="button"
              accessibilityLabel="Voir le détail de la séance"
            >
              <Text style={[styles.todayLabel, { color: discColor }]}>
                PROCHAINE SÉANCE · {daysUntilLabel(daysUntil ?? 0).toUpperCase()}
              </Text>
              <Text style={styles.todayTitle}>{focus.title}</Text>
              <View style={[styles.typePill, { backgroundColor: `${discColor}22` }]}>
                <Text style={[styles.typePillText, { color: discColor }]}>
                  {DISCIPLINE_META[focus.discipline]?.label ?? focus.discipline}
                </Text>
              </View>
              <Text style={styles.todayMeta}>
                {new Date(focus.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {summary ? ` · ${summary.durationLabel}` : ''}
                {summary?.distanceLabel ? ` · ${summary.distanceLabel}` : ''}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.linkBtn, { marginTop: spacing.sm }]}
              onPress={() => router.push('/(tabs)/calendar')}
            >
              <Text style={styles.linkBtnMuted}>Voir le plan</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.todayLabel}>AUCUNE SÉANCE</Text>
            <Text style={styles.todayTitle}>Créer un programme</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.push('/program/new')}
            >
              <NewProgramLabel color="#fff" size={16} style={styles.primaryBtnText} />
            </Pressable>
          </>
        )}
      </View>
      </FadeInUp>

        <View style={styles.metricsRow}>
        <Pressable
          style={[styles.metric, { backgroundColor: '#EFF6FF' }]}
          onPress={() => router.push('/sleep')}
        >
          <Text style={[styles.metricV, { color: '#2563EB' }]}>
            {state.health.sleep?.score ?? '—'}
          </Text>
          <Text style={styles.metricL}>Sommeil</Text>
        </Pressable>
        <View style={[styles.metric, { backgroundColor: colors.accentLight }]}>
          <Text style={styles.metricV}>{state.profile.ranked.xp}</Text>
          <Text style={styles.metricL}>XP</Text>
        </View>
        <View style={[styles.metric, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.metricV, { color: '#D97706' }]}>
            {state.banister.formTsb.toFixed(0)}
          </Text>
          <Text style={styles.metricL}>Forme</Text>
        </View>
      </View>

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
          <Text style={styles.emptyTitle}>Aucune activité récente</Text>
          <Text style={styles.emptySub}>
            {strengthOnlyPrograms
              ? 'Valide tes séances de musculation avec le feedback RPE (bouton ci-dessus le jour J).'
              : `Le jour d'une séance du programme, importez votre sortie Strava pour l’enregistrer ici.`}
          </Text>
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
            <Pressable
              key={a.id}
              style={styles.feedCard}
              onPress={() =>
                router.push({
                  pathname: '/activity/[id]',
                  params: { id: a.id },
                })
              }
            >
              <View style={styles.feedAccent} />
              <View style={styles.feedHead}>
                <View style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>{avatarLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedName}>
                    {p.firstName} {p.lastName}
                  </Text>
                  <Text style={styles.feedMeta}>{dateStr}</Text>
                </View>
                <Text style={styles.feedOpen}>Détail ›</Text>
              </View>
              <Text style={styles.feedTitle}>{a.name}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statV}>
                    {(a.distanceM / 1000).toFixed(2).replace('.', ',')} km
                  </Text>
                  <Text style={styles.statL}>Distance</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statV}>{formatDuration(a.movingSec)}</Text>
                  <Text style={styles.statL}>Durée</Text>
                </View>
                {analysis ? (
                  <View style={styles.statCol}>
                    <Text style={styles.statV}>{analysis.compliance.total}%</Text>
                    <Text style={styles.statL}>vs plan</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </AppScrollView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    scroll: { flex: 1, backgroundColor: 'transparent' },
    helloBlock: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    hello: { fontSize: 24, fontWeight: '800', color: colors.text },
    helloSub: { marginTop: 2, fontSize: 14, color: colors.textMuted, fontWeight: '600' },
    rpeBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.accentLight,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    rpeTitle: { fontWeight: '800', color: colors.accent, fontSize: 15 },
    rpeSub: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
    coachBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    coachBannerTitle: { fontWeight: '800', color: colors.accent, fontSize: 15 },
    coachBannerSub: { color: colors.textSecondary, marginTop: 4, fontSize: 13, lineHeight: 18 },
    todayCard: {
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 5,
      shadowColor: '#0F766E',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      position: 'relative',
      zIndex: 2,
    },
    todayLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
    todayTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
    todayMeta: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 6,
      marginBottom: spacing.sm,
      textTransform: 'capitalize',
    },
    typePill: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radii.pill,
    },
    typePillText: { fontWeight: '800', fontSize: 13 },
    stepPreview: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
    actionCol: { marginTop: spacing.md, gap: spacing.xs },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    linkBtn: { paddingVertical: 8, alignItems: 'center' },
    linkBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
    linkBtnMuted: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
    metricsRow: {
      flexDirection: 'row',
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    metric: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricV: { fontSize: 20, fontWeight: '800', color: colors.accentDark },
    metricL: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    feedSection: {
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      fontWeight: '800',
      fontSize: 16,
      color: colors.text,
    },
    emptyFeed: {
      margin: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.bgCard,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
      zIndex: 0,
      overflow: 'hidden',
    },
    emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
    emptySub: { color: colors.textMuted, marginTop: 6, lineHeight: 20, fontSize: 14 },
    feedCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: colors.bgCard,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    feedAccent: { height: 4, backgroundColor: '#0E8F6F' },
    feedHead: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    feedAvatar: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedAvatarText: { color: colors.accent, fontWeight: '800', fontSize: 14 },
    feedName: { color: colors.text, fontWeight: '700', fontSize: 15 },
    feedMeta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
    feedOpen: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    feedTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 18,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.lg,
    },
    statCol: {},
    statV: { color: colors.text, fontWeight: '800', fontSize: 16 },
    statL: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  });
}
