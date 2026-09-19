import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Text } from '../../src/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  buildGuidedPhases,
  canStartGuidedStrengthSession,
  formatGuidedClock,
  type GuidedPhase,
} from '../../src/engines/guidedStrengthSession';
import { isCalisthenicsWorkout } from '../../src/engines/calisthenicsProgramming';
import {
  COVER_CROP_CENTER,
  coverCropImageStyle,
  guidedExerciseImage,
} from '../../src/constants/sportVisuals';
import { useThemeColors } from '../../src/theme/ThemeContext';
import type { ColorPalette } from '../../src/theme/palettes';
import { radii, spacing } from '../../src/theme/tokens';
import { PressableScale } from '../../src/ui/motion/softMotion';
import { safeGoBack } from '../../src/ui/navigation/AlwaysBackButton';

/**
 * Séance guidée musculation / callisthénie :
 * chrono sur échauffement, tenues et repos ; Suivant sur les séries en reps.
 */
export default function GuidedStrengthSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const workout = state.plan.find((w) => w.id === id);
  const phases = useMemo(
    () => (workout ? buildGuidedPhases(workout) : []),
    [workout],
  );

  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase: GuidedPhase | undefined = phases[index];
  const total = phases.length;
  const progress = total > 0 ? (index + 1) / total : 0;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const finishSession = useCallback(() => {
    if (!workout) return;
    const isCalis = isCalisthenicsWorkout(workout);
    if (isCalis) {
      dispatch({ type: 'COMPLETE_SESSION_DONE', sessionId: workout.id });
      router.replace('/(tabs)');
      return;
    }
    router.replace({
      pathname: '/session/rpe',
      params: { sessionId: workout.id },
    });
  }, [dispatch, router, workout]);

  const goNext = useCallback(() => {
    clearTick();
    setRemaining(null);
    if (index >= phases.length - 1) {
      finishSession();
      return;
    }
    setIndex((i) => i + 1);
    setPaused(false);
  }, [finishSession, index, phases.length]);

  // Init / reset chrono quand la phase change
  useEffect(() => {
    clearTick();
    if (!phase) return;
    if (
      phase.kind === 'warmup' ||
      phase.kind === 'work_hold' ||
      phase.kind === 'rest' ||
      phase.kind === 'cooldown'
    ) {
      setRemaining(phase.durationSec ?? 30);
    } else {
      setRemaining(null);
    }
    return clearTick;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on phase id only
  }, [phase?.id]);

  // Tick chrono
  useEffect(() => {
    clearTick();
    if (remaining == null || remaining <= 0 || paused) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => (r == null ? r : Math.max(0, r - 1)));
    }, 1000);
    return clearTick;
  }, [remaining == null, remaining === 0, paused, phase?.id]);

  // Auto-avance quand le chrono atteint 0
  useEffect(() => {
    if (remaining !== 0) return;
    if (
      !phase ||
      (phase.kind !== 'warmup' &&
        phase.kind !== 'work_hold' &&
        phase.kind !== 'rest' &&
        phase.kind !== 'cooldown')
    ) {
      return;
    }
    const t = setTimeout(() => goNext(), 120);
    return () => clearTimeout(t);
  }, [remaining, phase?.kind, goNext]);

  if (!workout || !canStartGuidedStrengthSession(workout)) {
    return (
      <View style={styles.root}>
        <Text style={styles.err}>Séance guidée indisponible.</Text>
        <Pressable onPress={() => safeGoBack(router)}>
          <Text style={styles.link}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  if (!phase || phases.length === 0) {
    return (
      <View style={styles.root}>
        <Text style={styles.err}>Aucun exercice à guider.</Text>
        <Pressable onPress={() => safeGoBack(router)}>
          <Text style={styles.link}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const image: ImageSourcePropType = guidedExerciseImage(phase.visualKey);
  const isTimed =
    phase.kind === 'warmup' ||
    phase.kind === 'work_hold' ||
    phase.kind === 'rest' ||
    phase.kind === 'cooldown';
  const isRest = phase.kind === 'rest';
  const isReps = phase.kind === 'work_reps';

  const metaLine = (() => {
    if (phase.kind === 'work_reps') {
      return `Série ${phase.setIndex}/${phase.setTotal} · ${phase.repsLabel} reps`;
    }
    if (phase.kind === 'work_hold') {
      const hold = phase.durationSec ?? 0;
      return `Série ${phase.setIndex}/${phase.setTotal} · ${hold} s de tenue`;
    }
    if (phase.kind === 'warmup') {
      return phase.durationSec ? `${phase.durationSec} s chronométrées` : 'Prépare le corps';
    }
    if (phase.kind === 'cooldown') {
      return phase.durationSec ? `${phase.durationSec} s chronométrées` : 'Étirements doux';
    }
    if (phase.kind === 'rest') {
      const rest = phase.durationSec ?? 0;
      return `Repos ${rest} s`;
    }
    return '';
  })();

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => safeGoBack(router)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.progressLabel}>
          {index + 1} / {total}
        </Text>
        <Pressable
          onPress={() => setPaused((p) => !p)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Reprendre' : 'Pause'}
        >
          <Text style={styles.pauseBtn}>{paused ? '▶' : '❚❚'}</Text>
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={[styles.heroWrap, isRest && styles.heroRest]}>
        <Image
          source={image}
          style={[styles.hero, coverCropImageStyle(COVER_CROP_CENTER)]}
          resizeMode="cover"
          accessibilityLabel={phase.title}
        />
        {isRest ? (
          <View style={styles.restOverlay}>
            <Text style={styles.restTag}>Repos</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.kind}>
          {phase.kind === 'warmup'
            ? 'Échauffement'
            : phase.kind === 'cooldown'
              ? 'Retour au calme'
              : phase.kind === 'rest'
                ? 'Pause'
                : phase.kind === 'work_hold'
                  ? 'Tenue'
                  : 'Série'}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {isRest ? 'Repos' : phase.title}
        </Text>
        <Text style={styles.meta}>{metaLine}</Text>
        {!isRest && phase.cue ? (
          <Text style={styles.cue} numberOfLines={2}>
            {phase.cue}
          </Text>
        ) : null}
        {isRest && phase.nextPreview ? (
          <>
            <Text style={styles.nextHint}>Ensuite</Text>
            <Text style={styles.nextDetail} numberOfLines={2}>
              {phase.nextPreview.title} · {phase.nextPreview.detail}
            </Text>
          </>
        ) : null}

        {isTimed && remaining != null ? (
          <Text style={[styles.clock, isRest && styles.clockRest]}>
            {formatGuidedClock(remaining)}
          </Text>
        ) : null}

        {isReps ? (
          <PressableScale
            variant="pop"
            style={styles.primary}
            contentStyle={styles.primaryInner}
            onPress={goNext}
            accessibilityLabel="Suivant"
          >
            <Text style={styles.primaryText}>Suivant</Text>
          </PressableScale>
        ) : (
          <PressableScale
            variant="subtle"
            style={styles.secondary}
            contentStyle={styles.secondaryInner}
            onPress={goNext}
            accessibilityLabel="Passer"
          >
            <Text style={styles.secondaryText}>Passer →</Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: '#07111F',
      paddingTop: spacing.md,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      marginBottom: 8,
    },
    close: { color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: '700' },
    progressLabel: {
      color: 'rgba(255,255,255,0.55)',
      fontWeight: '700',
      fontSize: 13,
    },
    pauseBtn: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },
    track: {
      height: 4,
      marginHorizontal: spacing.md,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.12)',
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    fill: { height: '100%', backgroundColor: '#3DFF9A' },
    heroWrap: {
      marginHorizontal: spacing.md,
      borderRadius: radii.lg,
      overflow: 'hidden',
      height: 280,
      backgroundColor: '#0E8F6F22',
    },
    heroRest: { opacity: 0.85 },
    hero: { width: '100%', height: '100%' },
    restOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(7,17,31,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    restTag: {
      color: '#3DFF9A',
      fontWeight: '900',
      fontSize: 18,
      letterSpacing: 2,
    },
    body: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      alignItems: 'center',
    },
    kind: {
      color: '#3DFF9A',
      fontWeight: '800',
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    title: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 24,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    meta: {
      marginTop: 8,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '700',
      fontSize: 15,
      textAlign: 'center',
    },
    cue: {
      marginTop: 10,
      color: 'rgba(255,255,255,0.5)',
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 320,
    },
    nextHint: {
      marginTop: 10,
      color: 'rgba(61,255,154,0.8)',
      fontSize: 12,
      fontWeight: '700',
    },
    nextDetail: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.75)',
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
      maxWidth: 320,
    },
    clock: {
      marginTop: spacing.lg,
      fontSize: 56,
      fontWeight: '900',
      color: '#fff',
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
    },
    clockRest: { color: '#3DFF9A' },
    primary: {
      marginTop: 'auto',
      marginBottom: spacing.lg,
      alignSelf: 'stretch',
      backgroundColor: '#0E8F6F',
      paddingVertical: 18,
      borderRadius: radii.pill,
      minHeight: 56,
    },
    primaryInner: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    primaryText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 17,
      textAlign: 'center',
      width: '100%',
    },
    secondary: {
      marginTop: 'auto',
      marginBottom: spacing.lg,
      alignSelf: 'stretch',
      paddingVertical: 14,
    },
    secondaryInner: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    secondaryText: {
      color: 'rgba(255,255,255,0.65)',
      fontWeight: '700',
      fontSize: 15,
      textAlign: 'center',
    },
    err: { color: '#fff', textAlign: 'center', marginTop: 80, fontWeight: '700' },
    link: {
      color: '#3DFF9A',
      textAlign: 'center',
      marginTop: 16,
      fontWeight: '700',
    },
  });
}
