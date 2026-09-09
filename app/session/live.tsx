import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import { ActivityRouteMap } from '../../src/ui/ActivityRouteMap';
import { useLiveGpsTrack } from '../../src/hooks/useLiveGpsTrack';
import {
  buildLiveActivity,
  canStartLiveWorkout,
  computeLiveStepProgress,
  flattenWorkoutSteps,
  formatLiveClock,
  formatLiveDistance,
  formatLivePace,
  formatPaceBand,
  paceStatus,
  paceStatusLabel,
} from '../../src/engines/liveWorkout';
import { BRAND } from '../../src/constants/brand';

type Phase = 'ready' | 'countdown' | 'running' | 'paused' | 'saving' | 'done';

/** Tracker GPS live guidé — allures du plan, style Strava/Campus. */
export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const workout = state.plan.find((w) => w.id === id);

  const gps = useLiveGpsTrack();
  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [movingSec, setMovingSec] = useState(0);
  const startIsoRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallStartRef = useRef<number | null>(null);
  const wallPausedAccumRef = useRef(0);
  const wallPauseAtRef = useRef<number | null>(null);

  const flatSteps = useMemo(
    () => (workout ? flattenWorkoutSteps(workout.steps) : []),
    [workout],
  );

  const progress = useMemo(
    () => computeLiveStepProgress(flatSteps, movingSec, gps.distanceM),
    [flatSteps, movingSec, gps.distanceM],
  );

  const status = paceStatus(gps.currentPaceSecPerKm, progress.step);
  const band = formatPaceBand(progress.step);
  const discColor =
    (workout && DISCIPLINE_META[workout.discipline]?.color) || colors.accent;

  useEffect(() => {
    if (phase !== 'countdown') return;
    let n = 3;
    setCountdown(3);
    let cancelled = false;
    const timer = setInterval(() => {
      n -= 1;
      setCountdown(Math.max(0, n));
      if (n > 0) return;
      clearInterval(timer);
      void (async () => {
        const ok = await gps.start();
        if (cancelled) return;
        if (!ok) {
          setPhase('ready');
          return;
        }
        startIsoRef.current = new Date().toISOString();
        wallStartRef.current = Date.now();
        wallPausedAccumRef.current = 0;
        setPhase('running');
      })();
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = setInterval(() => {
      if (wallStartRef.current) {
        const pausedExtra =
          wallPauseAtRef.current != null
            ? Date.now() - wallPauseAtRef.current
            : 0;
        const wall =
          (Date.now() -
            wallStartRef.current -
            wallPausedAccumRef.current -
            pausedExtra) /
          1000;
        setElapsedSec(Math.max(0, wall));
      }
      setMovingSec(gps.getMovingSec());
    }, 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, gps]);

  if (!workout) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorTitle}>Séance introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (!canStartLiveWorkout(workout.discipline)) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingHorizontal: 20 }]}>
        <Text style={styles.errorTitle}>GPS non disponible pour ce sport</Text>
        <Text style={styles.errorBody}>
          Le tracker live guide course et vélo (allure + GPS). Pour la musculation ou la
          natation, utilise l’export montre ou valide en RPE.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const latlng = gps.points.map((p) => [p.lat, p.lng] as [number, number]);
  const statusColor =
    status === 'in_zone'
      ? BRAND.accent
      : status === 'too_fast'
        ? '#E11D48'
        : status === 'too_slow'
          ? '#D97706'
          : colors.textMuted;

  const onFinish = () => {
    const finish = async () => {
      setPhase('saving');
      gps.stop();
      const moving = Math.max(gps.getMovingSec(), movingSec);
      const elapsed = Math.max(elapsedSec, moving);
      const timeStream: number[] = [];
      const velocity: number[] = [];
      const startTs = gps.points[0]?.timestamp ?? Date.now();
      for (let i = 0; i < gps.points.length; i++) {
        const p = gps.points[i]!;
        timeStream.push(Math.round((p.timestamp - startTs) / 1000));
        if (i === 0) velocity.push(0);
        else {
          const prev = gps.points[i - 1]!;
          const dt = Math.max(0.5, (p.timestamp - prev.timestamp) / 1000);
          // approx m/s from consecutive points handled in engine; store pace-ish
          velocity.push(dt > 0 ? 1 / dt : 0);
        }
      }
      const activity = buildLiveActivity({
        workout,
        distanceM: gps.distanceM,
        elapsedSec: elapsed,
        movingSec: moving,
        startIso: startIsoRef.current ?? new Date().toISOString(),
        latlng,
        timeStream,
        velocitySmooth: velocity,
      });
      dispatch({ type: 'INGEST_STRAVA', activity, plannedId: workout.id });
      setPhase('done');
      router.replace(`/activity/${activity.id}`);
    };

    if (Platform.OS === 'web') {
      const ok = window.confirm('Terminer et enregistrer cette séance dans Azimut ?');
      if (ok) void finish();
      return;
    }
    Alert.alert('Terminer la séance', 'Enregistrer l’activité GPS dans Azimut ?', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Enregistrer', style: 'destructive', onPress: () => void finish() },
    ]);
  };

  const onStart = () => setPhase('countdown');

  const onPauseToggle = () => {
    if (phase === 'running') {
      gps.pause();
      wallPauseAtRef.current = Date.now();
      setPhase('paused');
    } else if (phase === 'paused') {
      if (wallPauseAtRef.current != null) {
        wallPausedAccumRef.current += Date.now() - wallPauseAtRef.current;
        wallPauseAtRef.current = null;
      }
      gps.resume();
      setPhase('running');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (phase === 'running' || phase === 'paused') {
              const leave = () => {
                gps.stop();
                router.back();
              };
              if (Platform.OS === 'web') {
                if (window.confirm('Quitter sans enregistrer ?')) leave();
              } else {
                Alert.alert('Quitter', 'Abandonner la séance en cours ?', [
                  { text: 'Rester', style: 'cancel' },
                  { text: 'Quitter', style: 'destructive', onPress: leave },
                ]);
              }
              return;
            }
            router.back();
          }}
          hitSlop={12}
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTag} numberOfLines={1}>
            {DISCIPLINE_META[workout.discipline]?.label ?? 'Séance'}
          </Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {workout.title}
          </Text>
        </View>
        {gps.lastAccuracy != null ? (
          <Text style={styles.gpsAcc}>
            GPS {gps.lastAccuracy < 15 ? 'OK' : `±${Math.round(gps.lastAccuracy)}m`}
          </Text>
        ) : null}
      </View>

      {phase === 'countdown' ? (
        <View style={styles.countdownWrap}>
          <Text style={styles.countdownNum}>{countdown || 'GO'}</Text>
          <Text style={styles.countdownHint}>Prépare-toi — GPS en écoute</Text>
        </View>
      ) : (
        <>
          <View style={styles.heroMetrics}>
            <Text style={styles.clock}>{formatLiveClock(elapsedSec)}</Text>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue}>{formatLiveDistance(gps.distanceM)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Allure</Text>
                <Text style={styles.metricValue}>
                  {formatLivePace(gps.currentPaceSecPerKm)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Moyenne</Text>
                <Text style={styles.metricValue}>
                  {formatLivePace(gps.avgPaceSecPerKm)}
                </Text>
              </View>
            </View>
          </View>

          {(phase === 'running' || phase === 'paused' || phase === 'ready') && (
            <View style={[styles.guideCard, { borderColor: `${discColor}55` }]}>
              <Text style={[styles.guideStep, { color: discColor }]}>
                Étape {progress.stepIndex + 1}/{progress.totalSteps}
                {phase === 'paused' ? ' · EN PAUSE' : ''}
              </Text>
              <Text style={styles.guideTitle}>{progress.step.displayLabel}</Text>
              {band ? (
                <Text style={styles.guideBand}>Cible {band}</Text>
              ) : (
                <Text style={styles.guideBand}>Sans cible d’allure</Text>
              )}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(progress.ratio * 100)}%`,
                      backgroundColor: discColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.paceCue, { color: statusColor }]}>
                {phase === 'ready'
                  ? 'Appuie sur Démarrer pour lancer le guidage GPS'
                  : paceStatusLabel(status)}
              </Text>
              {progress.remainingSec != null ? (
                <Text style={styles.remaining}>
                  Reste {formatLiveClock(progress.remainingSec)} sur cette étape
                </Text>
              ) : null}
              {progress.remainingM != null ? (
                <Text style={styles.remaining}>
                  Reste {formatLiveDistance(progress.remainingM)} sur cette étape
                </Text>
              ) : null}
            </View>
          )}

          {latlng.length >= 2 ? (
            <View style={styles.mapWrap}>
              <ActivityRouteMap latlng={latlng} height={180} />
            </View>
          ) : phase !== 'ready' ? (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                En attente du signal GPS… marche quelques mètres.
              </Text>
            </View>
          ) : null}

          {gps.error ? <Text style={styles.errorInline}>{gps.error}</Text> : null}
        </>
      )}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {phase === 'ready' ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: discColor }]}
            onPress={onStart}
          >
            <Text style={styles.primaryBtnText}>Démarrer la séance</Text>
          </Pressable>
        ) : null}
        {phase === 'running' || phase === 'paused' || phase === 'saving' ? (
          <View style={styles.controlRow}>
            <Pressable
              style={styles.pauseBtn}
              onPress={onPauseToggle}
              disabled={phase === 'saving'}
            >
              <Text style={styles.pauseBtnText}>
                {phase === 'paused' ? 'Reprendre' : 'Pause'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.finishBtn, { backgroundColor: colors.text }]}
              onPress={onFinish}
              disabled={phase === 'saving'}
            >
              <Text style={styles.primaryBtnText}>
                {phase === 'saving' ? 'Enregistrement…' : 'Terminer'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    back: { fontSize: 28, fontWeight: '600', color: colors.text, width: 28 },
    topTag: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.accent,
    },
    topTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    gpsAcc: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    countdownWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countdownNum: {
      fontSize: 96,
      fontWeight: '900',
      color: colors.accent,
      letterSpacing: -2,
    },
    countdownHint: { marginTop: 8, color: colors.textMuted, fontWeight: '600' },
    heroMetrics: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    clock: {
      fontSize: 52,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    metricRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
    metric: { flex: 1 },
    metricLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    metricValue: {
      marginTop: 2,
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    guideCard: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      backgroundColor: colors.bgElevated,
    },
    guideStep: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
    guideTitle: {
      marginTop: 4,
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
    },
    guideBand: { marginTop: 4, fontSize: 14, fontWeight: '700', color: colors.textMuted },
    progressTrack: {
      marginTop: spacing.sm,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4 },
    paceCue: { marginTop: spacing.sm, fontSize: 15, fontWeight: '800' },
    remaining: { marginTop: 4, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    mapWrap: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapPlaceholder: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
    },
    mapPlaceholderText: { color: colors.textMuted, textAlign: 'center', fontWeight: '600' },
    errorInline: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      color: colors.danger ?? '#E11D48',
      fontWeight: '700',
    },
    controls: {
      marginTop: 'auto',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    controlRow: { flexDirection: 'row', gap: spacing.sm },
    primaryBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: radii.lg,
      alignItems: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
    },
    finishBtn: { flex: 1.2 },
    primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    pauseBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: radii.lg,
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pauseBtnText: { color: colors.text, fontWeight: '800', fontSize: 16 },
    secondaryBtn: {
      marginTop: spacing.md,
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radii.md,
      backgroundColor: colors.bgElevated,
    },
    secondaryBtnText: { fontWeight: '800', color: colors.text },
    errorTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      paddingHorizontal: 20,
    },
    errorBody: {
      marginTop: 8,
      paddingHorizontal: 20,
      color: colors.textMuted,
      lineHeight: 20,
    },
  });
}
