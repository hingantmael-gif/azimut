import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { LivePaceStatus } from '../../engines/liveWorkout';
import { Text } from '../Text';

/**
 * « Champ de Flow » — ambiance vivante du tracker.
 * L'écran entier réagit à l'effort par rapport à l'allure du plan :
 *  - dans la zone   → jade, respiration lente et régulière (le « flow »)
 *  - trop rapide    → ambre/rouge, pulsation plus vive
 *  - trop lent      → bleu froid, pulsation lente
 *  - pas de cible   → encre neutre
 * Les couleurs se fondent (pas de saut) ; rien ne capte le toucher.
 */
type Mood = 'none' | 'cold' | 'zone' | 'hot';

const MOODS: Record<Mood, { core: string; halo: string; periodMs: number }> = {
  none: { core: '#94A3B8', halo: '#334155', periodMs: 2600 },
  cold: { core: '#38BDF8', halo: '#1D4ED8', periodMs: 2200 },
  zone: { core: '#3DFF9A', halo: '#0E9F6E', periodMs: 1500 },
  hot: { core: '#FB923C', halo: '#DC2626', periodMs: 850 },
};

function moodFrom(status: LivePaceStatus): Mood {
  switch (status) {
    case 'in_zone':
      return 'zone';
    case 'too_fast':
      return 'hot';
    case 'too_slow':
      return 'cold';
    default:
      return 'none';
  }
}

const ORDER: Mood[] = ['none', 'cold', 'zone', 'hot'];

function MoodLayer({
  mood,
  opacity,
  pulse,
  drift,
  size,
}: {
  mood: Mood;
  opacity: Animated.Value;
  pulse: Animated.Value;
  drift: Animated.Value;
  size: { w: number; h: number };
}) {
  const { core, halo } = MOODS[mood];
  const id = useMemo(() => `${mood}${Math.random().toString(36).slice(2, 7)}`, [mood]);
  const d = Math.max(size.w, size.h);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`}>
        <Defs>
          <RadialGradient id={`c${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={core} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={core} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`h${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={halo} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={halo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size.w * 0.15} cy={size.h * 0.18} r={d * 0.62} fill={`url(#h${id})`} />
        <Circle cx={size.w * 0.92} cy={size.h * 0.72} r={d * 0.55} fill={`url(#h${id})`} />
        <Circle cx={size.w * 0.5} cy={size.h * 0.5} r={d * 0.36} fill={`url(#c${id})`} />
      </Svg>
      {/* Onde qui part du centre : sa cadence suit l'humeur (rapide = plus vive). */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: core,
            width: d * 0.5,
            height: d * 0.5,
            borderRadius: d * 0.25,
            left: size.w / 2 - d * 0.25,
            top: size.h / 2 - d * 0.25,
            opacity: pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] }) }],
          },
        ]}
      />
    </Animated.View>
  );
}

export function FlowField({
  status,
  size,
}: {
  status: LivePaceStatus;
  /** Dimensions de la zone (px). */
  size: { w: number; h: number };
}) {
  const target = moodFrom(status);
  const opacities = useRef(
    Object.fromEntries(ORDER.map((m) => [m, new Animated.Value(m === target ? 1 : 0)])) as Record<
      Mood,
      Animated.Value
    >,
  ).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  // Fondu enchaîné entre humeurs.
  useEffect(() => {
    ORDER.forEach((m) => {
      Animated.timing(opacities[m], {
        toValue: m === target ? 1 : 0,
        duration: 700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [target, opacities]);

  // Onde : période propre à l'humeur.
  useEffect(() => {
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: MOODS[target].periodMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [target, pulse]);

  // Dérive lente des halos.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  if (size.w <= 0 || size.h <= 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORDER.map((m) => (
        <MoodLayer key={m} mood={m} opacity={opacities[m]} pulse={pulse} drift={drift} size={size} />
      ))}
    </View>
  );
}

/** Pastille « FLOW 82 % » : anneau de progression + libellé. */
export function FlowBadge({ percent, status }: { percent: number | null; status: LivePaceStatus }) {
  if (percent == null) return null;
  const mood = MOODS[moodFrom(status)];
  const R = 11;
  const C = 2 * Math.PI * R;
  return (
    <View style={styles.badge} accessibilityLabel={`Flow ${percent} pour cent du temps dans la zone`}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Circle cx={14} cy={14} r={R} stroke="rgba(255,255,255,0.22)" strokeWidth={3} fill="none" />
        <Circle
          cx={14}
          cy={14}
          r={R}
          stroke={mood.core}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(C * percent) / 100} ${C}`}
          transform="rotate(-90 14 14)"
        />
      </Svg>
      <Text style={styles.badgeLabel}>FLOW</Text>
      <Text style={[styles.badgeValue, { color: mood.core }]}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(6,13,24,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  badgeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  badgeValue: { fontSize: 15, fontWeight: '800' },
});
