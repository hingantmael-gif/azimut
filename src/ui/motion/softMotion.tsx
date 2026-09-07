import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Respiration lente (échelle) — hypnotique, discret */
export function useBreathingScale(opts?: {
  min?: number;
  max?: number;
  durationMs?: number;
}) {
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 1.045;
  const durationMs = opts?.durationMs ?? 2400;
  const v = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: max,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: min,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, min, max, durationMs]);

  return v;
}

/** Opacité respirante (halo / glow) */
export function useBreathingOpacity(opts?: {
  min?: number;
  max?: number;
  durationMs?: number;
}) {
  const min = opts?.min ?? 0.35;
  const max = opts?.max ?? 0.85;
  const durationMs = opts?.durationMs ?? 2800;
  const v = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: max,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: min,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, min, max, durationMs]);

  return v;
}

/** Entrée douce : fade + léger slide vers le haut */
export function FadeInUp({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 560,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/** Point de statut qui « respire » (récupération musculaire) */
export function BreathingDot({
  color,
  size = 10,
}: {
  color: string;
  size?: number;
}) {
  const scale = useBreathingScale({ min: 0.88, max: 1.18, durationMs: 1600 });
  const glow = useBreathingOpacity({ min: 0.2, max: 0.55, durationMs: 1600 });

  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) / 2,
            backgroundColor: color,
            opacity: glow,
            transform: [{ scale }],
          },
        ]}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}

/** Anneau / score avec pulsation très légère */
export function SoftPulse({
  children,
  style,
  intensity = 0.035,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  const scale = useBreathingScale({
    min: 1,
    max: 1 + intensity,
    durationMs: 2600,
  });
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
  );
}

/** Remplissage de barre — stable (pas de reset à l’ouverture / re-render) */
export function AnimatedFillBar({
  ratio,
  color,
  height = 6,
  trackColor,
}: {
  ratio: number;
  color: string;
  height?: number;
  trackColor: string;
}) {
  const target = Math.max(0, Math.min(1, ratio));
  const width = useRef(new Animated.Value(target)).current;
  const prev = useRef(target);

  useEffect(() => {
    const next = Math.max(0, Math.min(1, ratio));
    if (Math.abs(prev.current - next) < 0.005) return;
    prev.current = next;
    Animated.timing(width, {
      toValue: next,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, width]);

  const w = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={{
          height: '100%',
          width: w,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/** Barre de récupération musculaire — largeur fixe en %, sans animation (évite le « rétrécissement » à l’expand). */
export function StaticFillBar({
  ratio,
  color,
  height = 6,
  trackColor,
}: {
  ratio: number;
  color: string;
  height?: number;
  trackColor: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 1000) / 10;
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <View
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/** En-tête de section vivant — barre accent + titre */
export function SectionHeader({
  title,
  subtitle,
  accentColor,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  accentColor: string;
  delay?: number;
}) {
  return (
    <FadeInUp delay={delay} style={styles.sectionHead}>
      <View style={[styles.sectionBar, { backgroundColor: accentColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </FadeInUp>
  );
}

/** Press léger (scale) — feedback tactile sans flash */
export function PressableScale({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bump = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 28,
      bounciness: 5,
    }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => bump(0.97)}
      onPressOut={() => bump(1)}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12201C',
    letterSpacing: -0.2,
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B857C',
    lineHeight: 16,
  },
});