import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';
import { PressableScale, SoftPulse } from '../motion/softMotion';
import { paceGaugeLayout } from '../../engines/liveWorkout';

/** Barres signal GPS (style Record Strava, couleurs Mova). */
export function GpsSignalBars({
  accuracyM,
  denied,
}: {
  accuracyM: number | null;
  denied?: boolean;
}) {
  const level = denied
    ? 0
    : accuracyM == null
      ? 1
      : accuracyM < 12
        ? 4
        : accuracyM < 25
          ? 3
          : accuracyM < 50
            ? 2
            : 1;
  const color =
    level >= 3 ? BRAND.accent : level === 2 ? '#F59E0B' : level === 1 ? '#F97316' : '#E11D48';
  return (
    <View style={styles.signalWrap} accessibilityLabel={`GPS ${level}/4`}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 6 + i * 4,
              backgroundColor: i < level ? color : 'rgba(15,23,42,0.15)',
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Double anneau expansif autour du Start — façon « Record ready » Strava. */
export function StartPulseRing({ color, children }: { color: string; children: ReactNode }) {
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1.06,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const a = pulse(ringA, 0);
    const b = pulse(ringB, 800);
    a.start();
    b.start();
    breathLoop.start();
    return () => {
      a.stop();
      b.stop();
      breathLoop.stop();
    };
  }, [ringA, ringB, breath]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [
      {
        scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.42] }),
      },
    ],
  });

  return (
    <View style={styles.ringHost}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: color }, ringStyle(ringA)]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: color }, ringStyle(ringB)]}
      />
      <Animated.View style={{ transform: [{ scale: breath }] }}>{children}</Animated.View>
    </View>
  );
}

export function LiveGlyph({
  kind,
  color,
}: {
  kind: 'play' | 'pause' | 'stop';
  color: string;
}) {
  if (kind === 'play') {
    return (
      <View style={styles.glyphPlay}>
        <View style={[styles.glyphPlayTri, { borderLeftColor: color }]} />
      </View>
    );
  }
  if (kind === 'pause') {
    return (
      <View style={styles.glyphPause}>
        <View style={[styles.glyphBar, { backgroundColor: color }]} />
        <View style={[styles.glyphBar, { backgroundColor: color }]} />
      </View>
    );
  }
  return <View style={[styles.glyphStop, { backgroundColor: color }]} />;
}

export function LiveMetricCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <SoftPulse intensity={emphasize ? 0.03 : 0}>
        <Text style={[styles.metricValue, emphasize && styles.metricValueHot]}>{value}</Text>
      </SoftPulse>
    </View>
  );
}

/** Terminer — orange discret, pas l’accent sport. */
export const LIVE_FINISH_COLOR = '#E85D04';
const LIVE_FINISH_COLOR_ENTER = '#FB923C';

/** Mini-timeline des phases (guidage) — passé rempli, courant accent, futur atténué. */
export function LivePhaseTimeline({
  total,
  currentIndex,
  color,
}: {
  total: number;
  currentIndex: number;
  color?: string;
}) {
  const accent = color ?? BRAND.accent;
  const n = Math.max(1, total);
  return (
    <View
      style={styles.timelineRow}
      accessibilityLabel={`Étape ${Math.min(currentIndex + 1, n)} sur ${n}`}
    >
      {Array.from({ length: n }, (_, i) => {
        const past = i < currentIndex;
        const current = i === currentIndex;
        return (
          <View
            key={`phase-seg-${i}`}
            style={[
              styles.timelineSeg,
              {
                backgroundColor: past || current ? accent : 'rgba(15,23,42,0.12)',
                opacity: current ? 1 : past ? 0.72 : 1,
                height: current ? 6 : 4,
                flex: current ? 1.35 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Phase Garmin : échauffement / effort / récup / retour. */
export function LiveStepPhaseBadge({
  phase,
  index,
  total,
  color,
}: {
  phase: string;
  index: number;
  total: number;
  color?: string;
}) {
  const accent = color ?? BRAND.accent;
  return (
    <View style={[styles.phaseBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
      <Text style={[styles.phaseBadgeText, { color: accent }]}>
        {phase.toUpperCase()} · {index + 1}/{total}
      </Text>
    </View>
  );
}

/** Flash de fin — chrono figé + ✓ (600–800 ms). */
export function LiveFinishCelebration({ visible }: { visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.72);
      return;
    }
    opacity.setValue(0);
    scale.setValue(0.72);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacity, scale]);

  if (!visible) return null;

  return (
    <View style={styles.celeOverlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.celeCard,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.celeCheck}>✓</Text>
        <Text style={styles.celeLabel}>Séance terminée</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Jauge d’allure type Garmin — aiguille dans la zone verte cible.
 * Gauche = trop rapide, droite = trop lent.
 */
export function LivePaceGauge({
  currentSecPerKm,
  minSecPerKm,
  maxSecPerKm,
  status,
  currentLabel,
  bandLabel,
}: {
  currentSecPerKm: number | null;
  minSecPerKm: number;
  maxSecPerKm: number;
  status: 'too_fast' | 'in_zone' | 'too_slow' | 'none';
  currentLabel: string;
  bandLabel: string;
}) {
  const layout = paceGaugeLayout(currentSecPerKm, minSecPerKm, maxSecPerKm);
  const needleAnim = useRef(new Animated.Value(layout.needle)).current;

  useEffect(() => {
    Animated.timing(needleAnim, {
      toValue: layout.needle,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [layout.needle, needleAnim]);

  const rotate = needleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-110deg', '110deg'],
  });

  const zoneColor =
    status === 'in_zone'
      ? BRAND.accent
      : status === 'too_fast'
        ? '#F59E0B'
        : status === 'too_slow'
          ? '#EF4444'
          : BRAND.accent;

  const zoneLeftPct = layout.zoneStart * 100;
  const zoneWidthPct = Math.max(4, (layout.zoneEnd - layout.zoneStart) * 100);

  return (
    <View style={styles.gaugeWrap} accessibilityLabel={`Allure ${currentLabel}, cible ${bandLabel}`}>
      <View style={styles.gaugeDial}>
        <View style={styles.gaugeTrack} />
        <View
          style={[
            styles.gaugeZone,
            {
              left: `${zoneLeftPct}%`,
              width: `${zoneWidthPct}%`,
              backgroundColor: `${BRAND.accent}55`,
              borderColor: BRAND.accent,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.gaugeNeedlePivot,
            { transform: [{ rotate }] },
          ]}
        >
          <View style={[styles.gaugeNeedle, { backgroundColor: zoneColor }]} />
          <View style={[styles.gaugeHub, { borderColor: zoneColor }]} />
        </Animated.View>
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeEdge}>Rapide</Text>
        <Text style={styles.gaugeEdge}>Lent</Text>
      </View>
      <Text style={[styles.gaugePace, { color: zoneColor }]}>{currentLabel}</Text>
      <Text style={styles.gaugeBand}>Cible {bandLabel}</Text>
    </View>
  );
}

/** Barre de progression de l’étape courante. */
export function LiveStepProgressBar({
  ratio,
  color,
}: {
  ratio: number;
  color?: string;
}) {
  const accent = color ?? BRAND.accent;
  const w = Math.min(100, Math.max(0, ratio * 100));
  return (
    <View style={styles.stepProgressTrack}>
      <View style={[styles.stepProgressFill, { width: `${w}%`, backgroundColor: accent }]} />
    </View>
  );
}

const MIN_TOUCH = 48;

/** Contrôle rond façon Strava Record — glyphe + libellé dessous. */
export function LiveRoundButton({
  label,
  onPress,
  variant,
  color,
  disabled,
  size = 78,
  animatedBackground,
}: {
  label: string;
  onPress: () => void;
  variant: 'start' | 'pause' | 'resume' | 'finish' | 'ghost';
  color?: string;
  disabled?: boolean;
  /** Cible tactile ≥ 48×48 (76/88 en usage). */
  size?: number;
  /** Teinte animée (ex. Terminer pendant l’écartement pause). */
  animatedBackground?: Animated.AnimatedInterpolation<string | number>;
}) {
  const safeSize = Math.max(MIN_TOUCH, size);
  const accent = color ?? BRAND.accent;
  const bg =
    variant === 'start' || variant === 'resume'
      ? accent
      : variant === 'finish'
        ? color ?? LIVE_FINISH_COLOR
        : variant === 'pause'
          ? accent
          : 'rgba(255,255,255,0.92)';
  const fg = variant === 'ghost' ? '#0F172A' : '#fff';
  const glyph: 'play' | 'pause' | 'stop' =
    variant === 'start' || variant === 'resume'
      ? 'play'
      : variant === 'pause'
        ? 'pause'
        : 'stop';
  const shadowBase =
    typeof bg === 'string' ? bg : LIVE_FINISH_COLOR;

  const circleInner = (
    <PressableScale
      variant="nav"
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={label}
      contentStyle={[
        styles.roundBtn,
        {
          width: safeSize,
          height: safeSize,
          borderRadius: safeSize / 2,
          backgroundColor: animatedBackground ? 'transparent' : bg,
          opacity: disabled ? 0.55 : 1,
          ...(variant === 'ghost'
            ? {
                borderWidth: 1.5,
                borderColor: 'rgba(15,23,42,0.12)',
              }
            : Platform.OS === 'web'
              ? ({
                  boxShadow: `0 12px 32px ${shadowBase}66`,
                } as object)
              : {
                  shadowColor: shadowBase,
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 10,
                }),
        },
      ]}
    >
      <LiveGlyph kind={glyph} color={fg} />
    </PressableScale>
  );

  const circle = animatedBackground ? (
    <Animated.View
      style={[
        {
          width: safeSize,
          height: safeSize,
          borderRadius: safeSize / 2,
          backgroundColor: animatedBackground,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        Platform.OS === 'web'
          ? ({ boxShadow: `0 12px 32px ${LIVE_FINISH_COLOR}66` } as object)
          : {
              shadowColor: LIVE_FINISH_COLOR,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            },
      ]}
    >
      <PressableScale
        variant="nav"
        disabled={disabled}
        onPress={onPress}
        accessibilityLabel={label}
        contentStyle={[
          styles.roundBtn,
          {
            width: safeSize,
            height: safeSize,
            borderRadius: safeSize / 2,
            backgroundColor: 'transparent',
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <LiveGlyph kind={glyph} color={fg} />
      </PressableScale>
    </Animated.View>
  ) : (
    circleInner
  );

  const stack = (
    <View style={styles.roundStack}>
      {variant === 'start' ? (
        <StartPulseRing color={accent}>{circle}</StartPulseRing>
      ) : (
        circle
      )}
      <Text style={[styles.roundCaption, disabled && { opacity: 0.5 }]}>{label}</Text>
    </View>
  );

  return stack;
}

/**
 * Machine d’états contrôles Record (Strava) :
 * ready → Start (pulse) · running → Pause seul · paused → Finish + Reprendre (écartement).
 */
export function LiveRecordControls({
  phase,
  color,
  startLabel = 'Démarrer',
  onStart,
  onPause,
  onResume,
  onFinish,
  saving,
}: {
  phase: 'ready' | 'running' | 'paused' | 'saving';
  color?: string;
  startLabel?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  saving?: boolean;
}) {
  const accent = color ?? BRAND.accent;
  const spread = useRef(new Animated.Value(phase === 'paused' ? 1 : 0)).current;
  /** JS driver — teinte Terminer (incompatible native driver sur le même value). */
  const finishTint = useRef(new Animated.Value(phase === 'paused' ? 1 : 0)).current;
  const mode = phase === 'saving' ? 'paused' : phase;

  useEffect(() => {
    const to = mode === 'paused' ? 1 : 0;
    Animated.parallel([
      Animated.timing(spread, {
        toValue: to,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(finishTint, {
        toValue: to,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [mode, spread, finishTint]);

  if (mode === 'ready') {
    return (
      <View style={styles.controlsRow}>
        <LiveRoundButton
          variant="start"
          label={startLabel}
          color={accent}
          onPress={onStart}
          size={88}
        />
      </View>
    );
  }

  if (mode === 'running') {
    return (
      <View style={styles.controlsRow}>
        <LiveRoundButton
          variant="pause"
          label="Pause"
          color={accent}
          onPress={onPause}
          size={88}
        />
      </View>
    );
  }

  const finishX = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
  });
  const resumeX = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [-36, 0],
  });
  const fade = spread.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  const finishBg = finishTint.interpolate({
    inputRange: [0, 1],
    outputRange: [LIVE_FINISH_COLOR_ENTER, LIVE_FINISH_COLOR],
  });

  return (
    <View style={styles.controlsRow}>
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ translateX: finishX }],
        }}
      >
        <LiveRoundButton
          variant="finish"
          label={saving ? '…' : 'Terminer'}
          color={LIVE_FINISH_COLOR}
          animatedBackground={finishBg}
          disabled={saving}
          onPress={onFinish}
          size={76}
        />
      </Animated.View>
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ translateX: resumeX }],
        }}
      >
        <LiveRoundButton
          variant="resume"
          label="Reprendre"
          color={accent}
          disabled={saving}
          onPress={onResume}
          size={76}
        />
      </Animated.View>
    </View>
  );
}

export function liveTrackerStyles(colors: ColorPalette) {
  return StyleSheet.create({
    // userSelect none : en tirant la feuille à la souris, le texte de la barre du haut ne se sélectionne plus.
    root: { flex: 1, backgroundColor: '#0B1220', ...(Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null) },
    mapFill: {
      ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
      // Contient les z-index Leaflet (sinon les panes volent les clics UI)
      zIndex: 0,
      ...(Platform.OS === 'web' ? ({ isolation: 'isolate' } as object) : null),
    },
    topFade: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 120,
      backgroundColor: 'transparent',
      // soft scrim via stacked views
    },
    topScrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 110,
      zIndex: 1,
      backgroundColor: 'rgba(7,17,31,0.28)',
    },
    topBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 30,
      elevation: 30,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      gap: 10,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(15,23,42,0.08)',
    },
    iconBtnText: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginTop: -2 },
    sportPill: {
      flex: 1,
      borderRadius: radii.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(15,23,42,0.06)',
    },
    sportKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      color: BRAND.accent,
    },
    sportTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      elevation: 30,
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: 'rgba(15,23,42,0.06)',
      ...(Platform.OS === 'web'
        ? ({
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 -12px 40px rgba(7,17,31,0.18)',
          } as object)
        : {
            shadowColor: '#07111F',
            shadowOpacity: 0.18,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
          }),
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(15,23,42,0.14)',
      marginBottom: 10,
    },
    clock: {
      fontSize: 56,
      fontWeight: '900',
      color: '#0F172A',
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      lineHeight: 60,
    },
    clockSub: {
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: 'rgba(15,23,42,0.45)',
      marginTop: 2,
      marginBottom: 12,
    },
    metricRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    statusLine: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    statusWarn: { color: '#D97706' },
    statusDanger: { color: '#E11D48' },
    statusOk: { color: BRAND.accent },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 28,
      marginTop: 10,
      minHeight: 120,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 10,
      paddingHorizontal: 8,
    },
    laterLink: {
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    laterLinkText: {
      color: BRAND.accent,
      fontWeight: '800',
      fontSize: 14,
    },
    phaseBadge: {
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      marginBottom: 8,
    },
    phaseBadgeText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.1,
    },
    stepProgressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(15,23,42,0.1)',
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 4,
    },
    stepProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    gaugeWrap: {
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    gaugeDial: {
      width: 220,
      height: 118,
      alignItems: 'center',
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    gaugeTrack: {
      position: 'absolute',
      bottom: 0,
      width: 200,
      height: 100,
      borderTopLeftRadius: 100,
      borderTopRightRadius: 100,
      borderWidth: 14,
      borderBottomWidth: 0,
      borderColor: 'rgba(15,23,42,0.1)',
      backgroundColor: 'transparent',
    },
    gaugeZone: {
      position: 'absolute',
      bottom: 8,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
    },
    gaugeNeedlePivot: {
      position: 'absolute',
      bottom: 4,
      width: 4,
      height: 92,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    gaugeNeedle: {
      width: 4,
      height: 78,
      borderRadius: 2,
    },
    gaugeHub: {
      position: 'absolute',
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#fff',
      borderWidth: 3,
    },
    gaugeLabels: {
      width: 220,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      marginTop: 2,
    },
    gaugeEdge: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(15,23,42,0.4)',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    gaugePace: {
      marginTop: 6,
      fontSize: 36,
      fontWeight: '900',
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    gaugeBand: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '700',
      color: 'rgba(15,23,42,0.55)',
    },
    guidedRoot: {
      flex: 1,
      backgroundColor: '#0B1220',
    },
    guidedBody: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    guidedSheet: {
      flex: 1,
      marginTop: 8,
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.lg,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: 'rgba(15,23,42,0.06)',
    },
    stepTitle: {
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
    },
    skipStep: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)' },
    skipStepText: { color: '#334155', fontSize: 13, fontWeight: '700' },
    stepRemaining: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: 'rgba(15,23,42,0.5)',
      marginTop: 2,
    },
    splitStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    splitChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(14,143,111,0.1)',
    },
    splitChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: BRAND.accentDark,
      fontVariant: ['tabular-nums'],
    },
    // error screens
    errorRoot: { flex: 1, backgroundColor: colors.bg, paddingTop: 48 },
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
    secondaryBtn: {
      marginTop: spacing.md,
      alignSelf: 'flex-start',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radii.md,
      backgroundColor: colors.bgElevated,
      marginLeft: 20,
    },
    secondaryBtnText: { fontWeight: '800', color: colors.text },
  });
}

const styles = StyleSheet.create({
  signalWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 22,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
  ringHost: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
  },
  roundStack: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 96,
  },
  roundBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundCaption: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(15,23,42,0.55)',
    textAlign: 'center',
  },
  glyphPlay: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  glyphPlayTri: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  glyphPause: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  glyphBar: {
    width: 7,
    height: 24,
    borderRadius: 2,
  },
  glyphStop: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  roundBtnText: {
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  metricCell: { flex: 1, alignItems: 'center' },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(15,23,42,0.45)',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  metricValueHot: { color: BRAND.accentDark },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 28,
    marginTop: 10,
    minHeight: 120,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  timelineSeg: {
    borderRadius: 3,
    minHeight: 4,
  },
  celeOverlay: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    zIndex: 80,
    elevation: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.42)',
  },
  celeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  celeCheck: {
    fontSize: 56,
    fontWeight: '900',
    color: BRAND.accent,
    lineHeight: 60,
  },
  celeLabel: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: 'rgba(15,23,42,0.55)',
    textTransform: 'uppercase',
  },
  phaseBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: 8,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  stepProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15,23,42,0.1)',
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  stepProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  gaugeWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  gaugeDial: {
    width: 220,
    height: 118,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  gaugeTrack: {
    position: 'absolute',
    bottom: 0,
    width: 200,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderWidth: 14,
    borderBottomWidth: 0,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: 'transparent',
  },
  gaugeZone: {
    position: 'absolute',
    bottom: 8,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  gaugeNeedlePivot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 92,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  gaugeNeedle: {
    width: 4,
    height: 78,
    borderRadius: 2,
  },
  gaugeHub: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 3,
  },
  gaugeLabels: {
    width: 220,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  gaugeEdge: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(15,23,42,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gaugePace: {
    marginTop: 6,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  gaugeBand: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(15,23,42,0.55)',
  },
});
