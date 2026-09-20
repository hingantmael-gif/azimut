import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { Alert, appConfirm } from '../../src/utils/appAlert';
import { Text } from '../../src/ui/Text';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { DISCIPLINE_META } from '../../src/constants/disciplines';
import { ActivityRouteMap } from '../../src/ui/ActivityRouteMap';
import { useLiveGpsTrack } from '../../src/hooks/useLiveGpsTrack';
import { FlowBadge, FlowField } from '../../src/ui/live/FlowField';
import { LiveIdleBackdrop } from '../../src/ui/live/LiveIdleBackdrop';
import {
  buildLiveActivity,
  canStartLiveWorkout,
  computeLiveKmSplits,
  advanceLiveStepCursor,
  flowPercent,
  INITIAL_LIVE_CURSOR,
  type LiveStepCursor,
  computeLiveStepProgress,
  detectPaceAnomaly,
  flattenWorkoutSteps,
  formatLiveClock,
  formatLiveClockLong,
  formatLiveDistance,
  formatLiveDistanceKmValue,
  formatLivePace,
  formatPaceBand,
  formatStepRemaining,
  freeLiveShell,
  haversineM,
  liveCueLabel,
  paceStatus,
  paceZone,
  stepPhaseTitle,
} from '../../src/engines/liveWorkout';
import { findPlannedForFreeActivity } from '../../src/engines/programSessions';
import { initialPaceCoach, nextPaceCue } from '../../src/engines/paceCoach';
import { isVoiceCoachOn, speak } from '../../src/services/voiceCoach';
import type { PlannedWorkout } from '../../src/types/domain';
import { PressableScale } from '../../src/ui/motion/softMotion';
import { safeGoBack } from '../../src/ui/navigation/AlwaysBackButton';
import {
  clearLiveDraft,
  liveDraftKey,
  loadLiveDraft,
  saveLiveDraft,
  type LiveSessionDraft,
} from '../../src/storage/liveSessionDraft';
import {
  GpsSignalBars,
  LiveFinishCelebration,
  LiveMetricCell,
  LivePaceGauge,
  LivePhaseTimeline,
  LiveRecordControls,
  LiveStepPhaseBadge,
  LiveStepProgressBar,
  liveTrackerStyles,
} from '../../src/ui/live/LiveTrackerChrome';
import {
  LIVE_INK,
  LIVE_MINT,
  LiveAzimutControls,
  LiveConfirmSheet,
  LiveFocusBoard,
  LiveMetricsCapsule,
  LivePreStartDock,
  LiveGpsSlot,
  LiveSportPickButton,
  type FreeRecordSport,
} from '../../src/ui/live/AzimutTrackerHud';
import { BRAND } from '../../src/constants/brand';
type Phase = 'ready' | 'running' | 'paused' | 'saving';

/** Séance vide utilisée tant qu'aucune séance n'est chargée (voir la garde plus bas). */
const NO_WORKOUT: PlannedWorkout = {
  id: 'none',
  date: '',
  title: '',
  discipline: 'rest',
  steps: [],
} as unknown as PlannedWorkout;

/** Tracker GPS live — guidage Garmin (allure / étapes) pour séances planifiées. */
export default function LiveSessionScreen() {
  const { id, mode, sport, resume, go } = useLocalSearchParams<{
    id?: string;
    mode?: string;
    sport?: string;
    resume?: string;
    go?: string;
  }>();
  const { state, dispatch } = useApp();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Écran du tracker : portrait uniquement (une rotation ne doit jamais perturber la séance).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const o = (typeof screen !== 'undefined' ? screen.orientation : undefined) as
      | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
      | undefined;
    void o?.lock?.('portrait').catch(() => undefined);
    return () => {
      try {
        o?.unlock?.();
      } catch {
        /* ignore */
      }
    };
  }, []);
  const { colors } = useThemeColors();
  const styles = useMemo(() => liveTrackerStyles(colors), [colors]);
  const screenH = Dimensions.get('window').height;

  const freeShell = useMemo(() => {
    if (mode !== 'free') return null;
    const s =
      sport === 'bike' ? 'bike' : sport === 'swim' ? 'swim' : 'run';
    return freeLiveShell({ sport: s });
  }, [mode, sport]);

  const planned = id ? state.plan.find((w) => w.id === id) : undefined;
  const [draftWorkout, setDraftWorkout] = useState<PlannedWorkout | null>(null);
  const workoutOrNull: PlannedWorkout | null = planned ?? draftWorkout ?? freeShell;
  // Les hooks doivent s'exécuter à chaque rendu, même sans séance (brouillon chargé de façon
  // asynchrone) : on travaille sur une séance vide et les gardes sont placées sous les hooks.
  const workout: PlannedWorkout = workoutOrNull ?? NO_WORKOUT;

  const sessionKey = liveDraftKey({
    plannedId: id,
    mode,
    sport,
  });

  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [movingSec, setMovingSec] = useState(0);
  const [pendingDraft, setPendingDraft] = useState<LiveSessionDraft | null>(null);
  const [restored, setRestored] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [autoPauseCue, setAutoPauseCue] = useState(false);
  /** Focus métriques plein écran (≠ carte compacte). */
  const [focusOpen, setFocusOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const startIsoRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wallStartRef = useRef<number | null>(null);
  const wallPausedAccumRef = useRef(0);
  const wallPauseAtRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  /** Une fois true, autorise la navigation (évite la boucle beforeRemove). */
  const allowLeaveRef = useRef(false);
  const restoredRef = useRef(false);
  const phaseRef = useRef<Phase>('ready');
  const onAutoPauseRef = useRef<() => void>(() => undefined);

  phaseRef.current = phase;
  activeRef.current = phase === 'running' || phase === 'paused';

  const gps = useLiveGpsTrack({
    autoPauseAfterSec: 50,
    onAutoPauseSuggested: () => onAutoPauseRef.current(),
  });

  const leaveScreen = useCallback(() => {
    allowLeaveRef.current = true;
    activeRef.current = false;
    safeGoBack(router, '/(tabs)');
  }, [router]);

  const buildDraftPayload = useCallback((): LiveSessionDraft | null => {
    if (!workout || !startIsoRef.current) return null;
    const snap = gps.getSnapshot();
    let pausedExtra = wallPausedAccumRef.current;
    if (wallPauseAtRef.current != null) {
      pausedExtra += Date.now() - wallPauseAtRef.current;
    }
    const wallElapsed =
      wallStartRef.current != null
        ? Math.max(
            0,
            (Date.now() - wallStartRef.current - pausedExtra) / 1000,
          )
        : elapsedSec;
    return {
      v: 1,
      key: sessionKey,
      plannedId: isFreeKey(sessionKey) ? undefined : workout.id,
        mode: mode === 'free' || isFreeKey(sessionKey) ? 'free' : undefined,
      sport:
        mode === 'free' || isFreeKey(sessionKey)
          ? sport === 'bike' || workout.discipline === 'bike'
            ? 'bike'
            : sport === 'swim' || workout.discipline === 'swim'
              ? 'swim'
              : 'run'
          : undefined,
      title: workout.title,
      discipline: workout.discipline,
      startIso: startIsoRef.current,
      savedAt: new Date().toISOString(),
      elapsedSec: Math.max(wallElapsed, elapsedSec),
      movingSec: Math.max(snap.movingSec, movingSec),
      distanceM: snap.distanceM,
      points: snap.points,
      wallPausedAccumMs: pausedExtra,
    };
  }, [workout, gps, sessionKey, mode, sport, elapsedSec, movingSec]);

  const saveForLater = useCallback(async () => {
    const draft = buildDraftPayload();
    if (!draft) return false;
    await saveLiveDraft(draft);
    gps.stop();
    return true;
  }, [buildDraftPayload, gps]);

  const abandon = useCallback(async () => {
    await clearLiveDraft();
    gps.stop();
  }, [gps]);

  const applyDraft = useCallback(
    async (draft: LiveSessionDraft) => {
      if (!planned && (draft.mode === 'free' || draft.key.startsWith('free:'))) {
        setDraftWorkout({
          id: draft.key,
          date: draft.startIso.slice(0, 10),
          title: draft.title,
          discipline: draft.discipline,
          steps: [
            {
              id: 'free-1',
              type: 'active',
              label: 'Libre',
              endCondition: 'lap_button',
            },
          ],
        });
      }
      startIsoRef.current = draft.startIso;
      wallPausedAccumRef.current = draft.wallPausedAccumMs;
      wallPauseAtRef.current = Date.now();
      wallStartRef.current = Date.now() - draft.elapsedSec * 1000 - draft.wallPausedAccumMs;
      setElapsedSec(draft.elapsedSec);
      setMovingSec(draft.movingSec);
      gps.hydrate({
        points: draft.points,
        distanceM: draft.distanceM,
        movingSec: draft.movingSec,
      });
      await gps.prepare();
      setPhase('paused');
      setRestored(true);
      setPendingDraft(null);
      setFocusOpen(true);
    },
    [gps, planned],
  );

  // GPS + éventuelle reprise
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await gps.prepare();
      const draft = await loadLiveDraft();
      if (cancelled || !draft) return;
      if (draft.key !== sessionKey) {
        // Autre séance en attente — on n’écrase pas ici
        return;
      }
      if (resume === '1' || resume === 'true') {
        if (!restoredRef.current) {
          restoredRef.current = true;
          await applyDraft(draft);
        }
      } else {
        setPendingDraft(draft);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, resume]);

  const confirmLeave = useCallback(
    (onLeave: () => void) => {
      const later = async () => {
        const ok = await saveForLater();
        if (ok) onLeave();
      };
      const discard = async () => {
        await abandon();
        onLeave();
      };
      // Dialogue intégré (identique web / mobile) : trois choix clairs, jamais bloqué par le navigateur.
      Alert.alert('Séance en cours', 'Que souhaites-tu faire ?', [
        { text: 'Rester', style: 'cancel' },
        { text: 'Reprendre plus tard', onPress: () => void later() },
        { text: 'Abandonner', style: 'destructive', onPress: () => void discard() },
      ]);
    },
    [saveForLater, abandon],
  );

  // Bloquer retour matériel / geste pendant la séance (sans re-bloquer après confirmation)
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeaveRef.current || !activeRef.current) return;
      e.preventDefault();
      confirmLeave(() => {
        allowLeaveRef.current = true;
        activeRef.current = false;
        navigation.dispatch(e.data.action);
      });
    });
    return sub;
  }, [navigation, confirmLeave]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowLeaveRef.current || !activeRef.current) return false;
      confirmLeave(leaveScreen);
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave, leaveScreen]);

  // Autosave périodique
  useEffect(() => {
    if (phase !== 'running' && phase !== 'paused') return;
    const t = setInterval(() => {
      const draft = buildDraftPayload();
      if (draft) void saveLiveDraft(draft);
    }, 15000);
    return () => clearInterval(t);
  }, [phase, buildDraftPayload]);

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

  const splits = useMemo(
    () => computeLiveKmSplits(gps.points),
    [gps.points],
  );

  const latlng: [number, number][] =
    gps.points.length > 0
      ? gps.points.map((p) => [p.lat, p.lng] as [number, number])
      : gps.lastPoint
        ? [[gps.lastPoint.lat, gps.lastPoint.lng]]
        : [];

  const discColor =
    DISCIPLINE_META[workout.discipline]?.color || BRAND.accent;
  const isFree =
    mode === 'free' ||
    workout.id.startsWith('free-') ||
    workout.id.startsWith('free:');

  const onStart = async () => {
    if (pendingDraft && pendingDraft.key === sessionKey) {
      await applyDraft(pendingDraft);
      return;
    }
    const ok = await gps.start();
    if (!ok) return;
    await clearLiveDraft();
    startIsoRef.current = new Date().toISOString();
    wallStartRef.current = Date.now();
    wallPausedAccumRef.current = 0;
    wallPauseAtRef.current = null;
    setElapsedSec(0);
    setMovingSec(0);
    setAutoPauseCue(false);
    setPhase('running');
    setPendingDraft(null);
    setFocusOpen(true);
  };

  const onPause = () => {
    if (phase !== 'running') return;
    gps.pause();
    wallPauseAtRef.current = Date.now();
    setAutoPauseCue(false);
    setPhase('paused');
    setFocusOpen(true);
    const draft = buildDraftPayload();
    if (draft) void saveLiveDraft(draft);
  };

  onAutoPauseRef.current = () => {
    if (phaseRef.current !== 'running') return;
    gps.pause();
    wallPauseAtRef.current = Date.now();
    setPhase('paused');
    setAutoPauseCue(true);
    setFocusOpen(true);
    const draft = buildDraftPayload();
    if (draft) void saveLiveDraft(draft);
  };

  const onResume = () => {
    if (phase !== 'paused') return;
    if (wallPauseAtRef.current != null) {
      wallPausedAccumRef.current += Date.now() - wallPauseAtRef.current;
      wallPauseAtRef.current = null;
    }
    setAutoPauseCue(false);
    gps.resume();
    setPhase('running');
    setFocusOpen(true);
  };

  const autoGoRef = useRef(false);
  useEffect(() => {
    if (autoGoRef.current) return;
    if (go !== '1' && go !== 'true') return;
    if (mode !== 'free') return;
    if (phase !== 'ready') return;
    if (pendingDraft) return;
    autoGoRef.current = true;
    void onStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, mode, phase, pendingDraft]);

  const onSaveLater = () => {
    void (async () => {
      const ok = await saveForLater();
      if (ok) leaveScreen();
    })();
  };

  const onFinish = () => {
    setFinishConfirmOpen(true);
  };

  const runFinishSave = () => {
    setFinishConfirmOpen(false);
    void (async () => {
      setCelebrating(true);
      setPhase('saving');
      await new Promise<void>((r) => setTimeout(r, 700));
      const moving = Math.max(gps.getMovingSec(), movingSec);
      const elapsed = Math.max(elapsedSec, moving);
      const pts = gps.points;
      const track: [number, number][] = pts.map((p) => [p.lat, p.lng]);
      const timeStream: number[] = [];
      const velocity: number[] = [];
      const startTs = pts[0]?.timestamp ?? Date.now();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        timeStream.push(Math.round((p.timestamp - startTs) / 1000));
        if (i === 0) velocity.push(0);
        else {
          const prev = pts[i - 1]!;
          const dt = Math.max(0.5, (p.timestamp - prev.timestamp) / 1000);
          const d = haversineM(
            { lat: prev.lat, lng: prev.lng },
            { lat: p.lat, lng: p.lng },
          );
          velocity.push(d / dt);
        }
      }
      gps.stop();
      await clearLiveDraft();
      allowLeaveRef.current = true;
      activeRef.current = false;
      const activity = buildLiveActivity({
        workout,
        distanceM: gps.distanceM,
        elapsedSec: elapsed,
        movingSec: moving,
        startIso: startIsoRef.current ?? new Date().toISOString(),
        latlng: track,
        timeStream,
        velocitySmooth: velocity,
      });
      // Sortie libre : si une séance du plan (même jour, même sport) reste à faire, elle compte
      // pour cette séance — donc pour le programme, la conformité et la progression.
      const freeMatch = isFree
        ? findPlannedForFreeActivity(
            state.plan,
            new Set(state.analyses.map((a) => a.plannedWorkoutId)),
            activity,
          )
        : undefined;
      dispatch({
        type: 'INGEST_STRAVA',
        activity,
        plannedId: isFree ? freeMatch?.id : workout.id,
        linkPlan: isFree ? Boolean(freeMatch) : true,
      });
      router.replace(`/activity/${encodeURIComponent(activity.id)}`);
    })();
  };

  const mapHeight = Math.max(280, Math.round(screenH * 0.62));
  const sportLabel = isFree
    ? 'Séance libre'
    : DISCIPLINE_META[workout.discipline]?.label ?? 'Séance';

  const isGuided =
    !isFree &&
    workout.steps.some(
      (s) =>
        s.type === 'warmup' ||
        s.type === 'cooldown' ||
        s.type === 'rest' ||
        (s.target && s.target.type === 'pace') ||
        (s.repeat != null && s.repeat > 1),
    );

  const flatSteps = useMemo(
    () => flattenWorkoutSteps(workout.steps),
    [workout.steps],
  );
  // Curseur d'étape : mémorise temps ET distance au départ de chaque étape (séances mixtes).
  const stepCursorRef = useRef<LiveStepCursor>(INITIAL_LIVE_CURSOR);
  const stepCursorStepsRef = useRef(flatSteps);
  const stepProgress = useMemo(() => {
    if (stepCursorStepsRef.current !== flatSteps) {
      stepCursorStepsRef.current = flatSteps;
      stepCursorRef.current = INITIAL_LIVE_CURSOR;
    }
    stepCursorRef.current = advanceLiveStepCursor(
      stepCursorRef.current,
      flatSteps,
      movingSec,
      gps.distanceM,
    );
    return computeLiveStepProgress(flatSteps, movingSec, gps.distanceM, stepCursorRef.current);
  }, [flatSteps, movingSec, gps.distanceM]);
  const currentStep = stepProgress.step;
  const paceSt = paceStatus(gps.currentPaceSecPerKm, currentStep);
  const paceBand = formatPaceBand(currentStep);

  // Coach vocal : « Accélère » / « Ralentis » / « Très bien, garde l'allure » selon l'aiguille.
  const paceCoachRef = useRef(initialPaceCoach(Date.now()));
  useEffect(() => {
    if (phase !== 'running' || !isVoiceCoachOn()) return;
    const r = nextPaceCue(paceCoachRef.current, paceSt, Date.now());
    paceCoachRef.current = r.state;
    if (r.say) speak(r.say);
  }, [phase, paceSt, movingSec]);

  // « Flow » : part du temps passé dans la zone d'allure cible (étapes avec cible d'allure).
  /** Bouton « Activer » : ouvre la demande d'autorisation du navigateur / du téléphone. */
  const onEnableLocation = useCallback(async () => {
    const ok = await gps.prepare();
    if (ok) return;
    const native = Platform.OS !== 'web';
    const openSettings = await appConfirm(
      'Localisation bloquée',
      native
        ? 'Autorise la localisation pour Mova dans les réglages de ton téléphone, puis reviens ici.'
        : 'Ton navigateur bloque la localisation pour ce site. Clique sur le cadenas à gauche de l’adresse, choisis « Autoriser » pour la localisation, puis touche à nouveau « Activer ».',
      native ? 'Ouvrir les réglages' : 'Compris',
      'Fermer',
    );
    if (openSettings && native) void Linking.openSettings();
  }, [gps]);

  const flowRef = useRef({ zoneSec: 0, measuredSec: 0, lastMoving: 0 });
  const [flowPct, setFlowPct] = useState<number | null>(null);
  useEffect(() => {
    const f = flowRef.current;
    const dt = movingSec - f.lastMoving;
    f.lastMoving = movingSec;
    // Un saut > 5 s (reprise après pause, hydratation) n'est pas du temps mesuré.
    if (phase !== 'running' || dt <= 0 || dt > 5 || paceSt === 'none') return;
    f.measuredSec += dt;
    if (paceSt === 'in_zone') f.zoneSec += dt;
    setFlowPct(flowPercent(f.zoneSec, f.measuredSec));
  }, [movingSec, phase, paceSt]);
  const [flowSize, setFlowSize] = useState({ w: 0, h: 0 });
  const anomaly = useMemo(
    () =>
      detectPaceAnomaly({
        currentPaceSecPerKm: gps.currentPaceSecPerKm,
        avgPaceSecPerKm: gps.avgPaceSecPerKm,
        recentPaces: gps.recentPaces,
        step: currentStep,
        movingSec,
      }),
    [
      gps.currentPaceSecPerKm,
      gps.avgPaceSecPerKm,
      gps.recentPaces,
      currentStep,
      movingSec,
    ],
  );
  const coachingCue =
    gps.error ??
    (autoPauseCue && phase === 'paused'
      ? 'Pause auto — arrêt détecté'
      : phase === 'paused'
        ? 'En pause — tu peux reprendre plus tard'
        : phase === 'ready' && pendingDraft
          ? `Sauvegardée · ${formatLiveDistance(pendingDraft.distanceM)} · ${formatLiveClock(pendingDraft.elapsedSec)}`
          : phase === 'ready'
            ? isGuided
              ? 'Suis les étapes — l’aiguille doit rester dans la zone'
              : null
            : liveCueLabel(paceSt, anomaly));
  const statusStyle = gps.error
    ? styles.statusDanger
    : autoPauseCue || paceSt === 'too_slow' || phase === 'paused' || pendingDraft
      ? styles.statusWarn
      : paceSt === 'too_fast'
        ? styles.statusWarn
        : styles.statusOk;

  const leave = () => {
    if (phase === 'ready' || phase === 'saving') {
      leaveScreen();
      return;
    }
    confirmLeave(leaveScreen);
  };

  const topBar = (
    <View style={[styles.topBar, { top: insets.top + 6 }]}>
      <PressableScale
        variant="pop"
        onPress={leave}
        accessibilityLabel="Fermer"
        contentStyle={styles.iconBtn}
      >
        <Text style={styles.iconBtnText}>⌄</Text>
      </PressableScale>
      <View style={styles.sportPill}>
        <Text style={styles.sportKicker} numberOfLines={1}>
          {sportLabel}
          {restored || phase === 'paused' ? ' · pause' : ''}
        </Text>
        <Text style={styles.sportTitle} numberOfLines={1}>
          {workout.title}
        </Text>
      </View>
      <GpsSignalBars
        accuracyM={gps.lastAccuracy}
        denied={gps.permission === 'denied'}
      />
    </View>
  );

  const controlsBlock = (
    <>
      <LiveRecordControls
        phase={phase}
        color={discColor}
        startLabel={pendingDraft ? 'Reprendre' : 'Démarrer'}
        onStart={() => void onStart()}
        onPause={onPause}
        onResume={onResume}
        onFinish={onFinish}
        saving={phase === 'saving'}
      />
      {phase === 'ready' && pendingDraft ? (
        <PressableScale
          variant="subtle"
          onPress={() => {
            void clearLiveDraft();
            setPendingDraft(null);
          }}
          contentStyle={styles.laterLink}
        >
          <Text style={styles.laterLinkText}>Recommencer à zéro</Text>
        </PressableScale>
      ) : null}
      {phase === 'running' || phase === 'paused' || phase === 'saving' ? (
        <PressableScale
          variant="subtle"
          onPress={onSaveLater}
          disabled={phase === 'saving'}
          contentStyle={styles.laterLink}
        >
          <Text style={styles.laterLinkText}>Reprendre plus tard</Text>
        </PressableScale>
      ) : null}
    </>
  );

  // ——— Séance planifiée : coaching Garmin (carte secondaire / absente) ———
  if (isGuided) {
    const paceTarget =
      currentStep.target?.type === 'pace' ? currentStep.target : null;

    return (
      <View style={styles.guidedRoot}>
        {topBar}
        <View
          style={[
            styles.guidedSheet,
            {
              marginTop: insets.top + 64,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <LivePhaseTimeline
            total={stepProgress.totalSteps}
            currentIndex={stepProgress.stepIndex}
            color={discColor}
          />
          <LiveStepPhaseBadge
            phase={stepPhaseTitle(currentStep)}
            index={stepProgress.stepIndex}
            total={stepProgress.totalSteps}
            color={discColor}
          />
          <Text style={styles.stepTitle} numberOfLines={2}>
            {currentStep.displayLabel}
          </Text>
          <Text style={styles.stepRemaining}>
            {phase === 'ready'
              ? 'Prêt à démarrer'
              : stepProgress.done
                ? 'Séance terminée — tu peux enregistrer'
                : formatStepRemaining(stepProgress)}
          </Text>
          <LiveStepProgressBar ratio={stepProgress.ratio} color={discColor} />

          {paceTarget ? (
            <LivePaceGauge
              currentSecPerKm={
                phase === 'ready' ? null : gps.currentPaceSecPerKm
              }
              minSecPerKm={paceZone(currentStep)?.min ?? paceTarget.minSecPerKm}
              maxSecPerKm={paceZone(currentStep)?.max ?? paceTarget.maxSecPerKm}
              status={phase === 'ready' ? 'none' : paceSt}
              currentLabel={formatLivePace(
                phase === 'ready' ? null : gps.currentPaceSecPerKm,
              )}
              bandLabel={paceBand ?? '—'}
            />
          ) : (
            <>
              <Text style={styles.clock}>{formatLiveClock(elapsedSec)}</Text>
              <Text style={styles.clockSub}>Temps</Text>
            </>
          )}

          {coachingCue ? (
            <Text style={[styles.statusLine, statusStyle]}>{coachingCue}</Text>
          ) : null}

          <View style={styles.metricRow}>
            <LiveMetricCell
              label="Temps"
              value={formatLiveClock(elapsedSec)}
              emphasize={phase === 'running'}
            />
            <LiveMetricCell
              label="Distance"
              value={formatLiveDistance(gps.distanceM)}
              emphasize={phase === 'running'}
            />
            <LiveMetricCell
              label="Moyenne"
              value={formatLivePace(gps.avgPaceSecPerKm)}
            />
          </View>

          {controlsBlock}
        </View>
        <LiveFinishCelebration visible={celebrating} />
        <LiveConfirmSheet
          visible={finishConfirmOpen}
          title="Terminer la séance ?"
          body="Enregistrer l’activité GPS dans Mova."
          confirmLabel="Enregistrer"
          cancelLabel="Continuer"
          onConfirm={runFinishSave}
          onCancel={() => setFinishConfirmOpen(false)}
        />
      </View>
    );
  }

  // ——— Séance libre : carte + HUD Mova (≠ Strava orange / timer-héros) ———
  const gpsOk =
    gps.permission !== 'denied' &&
    (gps.lastAccuracy == null || gps.lastAccuracy < 80);
  const gpsLabel =
    gps.permission === 'denied'
      ? 'Localisation désactivée'
      : gps.error
        ? gps.error
        : gps.lastAccuracy != null
          ? `GPS ±${Math.round(gps.lastAccuracy)} m`
          : 'Recherche GPS…';
  const clockLong = formatLiveClockLong(elapsedSec);
  const distKm = formatLiveDistanceKmValue(gps.distanceM);
  const paceAvg = formatLivePace(gps.avgPaceSecPerKm);
  const paceNow = formatLivePace(gps.currentPaceSecPerKm);
  const progressToNextKm = (gps.distanceM % 1000) / 1000;

  const freeControls = (
    <>
      <LiveAzimutControls
        phase={phase}
        color={discColor}
        startLabel={pendingDraft ? 'Reprendre' : 'Go'}
        onStart={() => void onStart()}
        onPause={onPause}
        onResume={onResume}
        onFinish={onFinish}
        saving={phase === 'saving'}
        sideLeft={
          phase === 'ready' ? (
            <LiveSportPickButton
              sport={
                (workout.discipline === 'bike' ||
                workout.discipline === 'swim'
                  ? workout.discipline
                  : 'run') as FreeRecordSport
              }
              onChange={(next) => {
                router.replace({
                  pathname: '/session/live',
                  params: { mode: 'free', sport: next },
                });
              }}
            />
          ) : undefined
        }
        sideRight={
          phase === 'ready' ? (
            <LiveGpsSlot
              state={
                gps.permission === 'denied'
                  ? 'denied'
                  : gps.lastAccuracy == null
                    ? 'searching'
                    : gps.lastAccuracy > 25
                      ? 'weak'
                      : 'ok'
              }
              accuracyM={gps.lastAccuracy}
              onPress={() => void onEnableLocation()}
            />
          ) : undefined
        }
      />
      {phase === 'ready' && pendingDraft ? (
        <PressableScale
          variant="subtle"
          onPress={() => {
            void clearLiveDraft();
            setPendingDraft(null);
          }}
          contentStyle={styles.laterLink}
        >
          <Text style={styles.laterLinkText}>Recommencer à zéro</Text>
        </PressableScale>
      ) : null}
      {phase === 'running' || phase === 'paused' || phase === 'saving' ? (
        <PressableScale
          variant="subtle"
          onPress={onSaveLater}
          disabled={phase === 'saving'}
          contentStyle={styles.laterLink}
        >
          <Text style={[styles.laterLinkText, { color: LIVE_MINT }]}>
            Reprendre plus tard
          </Text>
        </PressableScale>
      ) : null}
    </>
  );

  if (!workoutOrNull) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>Séance introuvable</Text>
        <Pressable onPress={() => safeGoBack(router, '/(tabs)')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (!canStartLiveWorkout(workout.discipline)) {
    return (
      <View style={styles.errorRoot}>
        <Text style={styles.errorTitle}>GPS non disponible pour ce sport</Text>
        <Text style={styles.errorBody}>
          Le tracker live guide course, vélo et natation. Pour la musculation,
          utilise l’export montre ou valide en RPE.
        </Text>
        <Pressable onPress={() => safeGoBack(router, '/(tabs)')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  // showFocus with map peek when running+collapsed
  if (phase === 'paused' || phase === 'saving' || (phase === 'running' && focusOpen)) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: LIVE_INK,
            paddingTop: insets.top + 4,
          },
        ]}
        onLayout={(e) =>
          setFlowSize({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })
        }
      >
        <FlowField status={phase === 'running' ? paceSt : 'none'} size={flowSize} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 4 }}>
          <PressableScale
            variant="pop"
            onPress={leave}
            accessibilityLabel="Fermer"
            contentStyle={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -2 }}>
              ⌄
            </Text>
          </PressableScale>
          <View style={{ flex: 1, alignItems: 'center' }} pointerEvents="none">
            <FlowBadge percent={flowPct} status={paceSt} />
          </View>
          <View style={{ width: 40 }} />
        </View>
        <LiveFocusBoard
          phase={
            phase === 'running'
              ? 'running'
              : phase === 'saving'
                ? 'saving'
                : 'paused'
          }
          clock={clockLong}
          distanceKm={distKm}
          paceAvg={paceAvg}
          paceNow={paceNow}
          splits={splits}
          progressToNextKm={progressToNextKm}
          cue={
            autoPauseCue
              ? 'Immobilité détectée — reprends quand tu es prêt'
              : coachingCue
          }
          autoPause={autoPauseCue}
          onCollapse={
            phase === 'running' ? () => setFocusOpen(false) : undefined
          }
        />
        <View style={{ flex: 1 }} />
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          {freeControls}
        </View>
        <LiveFinishCelebration visible={celebrating} />
        <LiveConfirmSheet
          visible={finishConfirmOpen}
          title="Terminer la séance ?"
          body="Enregistrer l’activité GPS dans Mova."
          confirmLabel="Enregistrer"
          cancelLabel="Continuer"
          onConfirm={runFinishSave}
          onCancel={() => setFinishConfirmOpen(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {phase === 'ready' && !gps.lastPoint ? (
        <LiveIdleBackdrop
          denied={gps.permission === 'denied'}
          message={
            gps.permission === 'denied'
              ? 'Localisation désactivée — touche le bouton GPS pour l’activer'
              : 'Recherche du signal GPS… sors à l’air libre pour aller plus vite'
          }
        />
      ) : null}
      <View style={[styles.mapFill, phase === 'ready' && !gps.lastPoint && { opacity: 0 }]}>
        <ActivityRouteMap
          latlng={latlng}
          height={mapHeight + Math.round(screenH * 0.28)}
          follow={phase === 'ready' || phase === 'running' || phase === 'paused'}
          zoomControl={false}
          accuracyM={gps.lastAccuracy}
          emptyLabel="Autorise le GPS pour centrer la carte"
        />
      </View>
      <View style={styles.topScrim} pointerEvents="none" />
      {phase === 'running' && flowPct != null ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, alignItems: 'center', zIndex: 5 }}
        >
          <FlowBadge percent={flowPct} status={paceSt} />
        </View>
      ) : null}

      {topBar}

      <LivePreStartDock
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
        <LiveMetricsCapsule
          time={phase === 'ready' ? '00:00' : formatLiveClock(elapsedSec)}
          pace={phase === 'ready' ? '—' : paceNow}
          distance={phase === 'ready' ? '0,00' : distKm}
          gpsLabel={gpsLabel}
          gpsOk={gpsOk}
          onExpand={
            phase === 'running' ? () => setFocusOpen(true) : undefined
          }
        />
        <View style={{ marginTop: 12 }}>{freeControls}</View>
      </LivePreStartDock>
      <LiveFinishCelebration visible={celebrating} />
      <LiveConfirmSheet
        visible={finishConfirmOpen}
        title="Terminer la séance ?"
        body="Enregistrer l’activité GPS dans Mova."
        confirmLabel="Enregistrer"
        cancelLabel="Continuer"
        onConfirm={runFinishSave}
        onCancel={() => setFinishConfirmOpen(false)}
      />
    </View>
  );
}

function isFreeKey(key: string) {
  return key.startsWith('free:');
}
