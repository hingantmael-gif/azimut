import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Vue animée en boucle, pensée pour les fonds.
 * - Web : animation CSS (keyframes) → tourne sur le processeur graphique, ZÉRO JavaScript par image.
 *   (Animated en JS coûtait ~90 rappels par image et gelait les téléphones.)
 * - Natif : Animated avec driver natif.
 */
export type Pose = {
  x?: number;
  y?: number;
  scale?: number;
  scaleY?: number;
  rotate?: number; // degrés
  opacity?: number;
};

export type Stop = { at: number; pose: Pose }; // at : 0..100

type Props = {
  /** Deux poses (début / fin) ou des étapes intermédiaires. */
  from?: Pose;
  to?: Pose;
  stops?: Stop[];
  ms: number;
  delay?: number;
  /** true : aller-retour ; false : recommence au début. */
  yoyo?: boolean;
  linear?: boolean;
  paused?: boolean;
  origin?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

function cssTransform(p: Pose): string {
  const parts: string[] = [];
  if (p.x != null || p.y != null) parts.push(`translate(${p.x ?? 0}px, ${p.y ?? 0}px)`);
  if (p.rotate != null) parts.push(`rotate(${p.rotate}deg)`);
  if (p.scale != null) parts.push(`scale(${p.scale})`);
  if (p.scaleY != null) parts.push(`scaleY(${p.scaleY})`);
  return parts.length ? parts.join(' ') : 'none';
}

function resolveStops({ from, to, stops }: Pick<Props, 'from' | 'to' | 'stops'>): Stop[] {
  return stops ?? [
    { at: 0, pose: from ?? {} },
    { at: 100, pose: to ?? {} },
  ];
}

export function LoopView({ from, to, stops, ms, delay = 0, yoyo = true, linear = false, paused = false, origin, style, children }: Props) {
  const resolved = useMemo(() => resolveStops({ from, to, stops }), [from, to, stops]);

  if (Platform.OS === 'web') {
    const keyframes: Record<string, Record<string, string | number>> = {};
    for (const s of resolved) {
      const frame: Record<string, string | number> = { transform: cssTransform(s.pose) };
      if (s.pose.opacity != null) frame.opacity = s.pose.opacity;
      keyframes[`${s.at}%`] = frame;
    }
    const css = {
      animationKeyframes: [keyframes],
      animationDuration: `${ms}ms`,
      animationDelay: `${delay}ms`,
      animationIterationCount: 'infinite',
      animationDirection: yoyo ? 'alternate' : 'normal',
      animationTimingFunction: linear ? 'linear' : 'ease-in-out',
      animationPlayState: paused ? 'paused' : 'running',
      animationFillMode: 'backwards',
      willChange: 'transform, opacity',
      ...(origin ? { transformOrigin: origin } : null),
    } as unknown as ViewStyle;
    return (
      <View pointerEvents="none" style={[style, css]}>
        {children}
      </View>
    );
  }

  return (
    <NativeLoop resolved={resolved} ms={ms} delay={delay} yoyo={yoyo} linear={linear} paused={paused} style={[style, origin ? ({ transformOrigin: origin } as object) : null]}>
      {children}
    </NativeLoop>
  );
}

function NativeLoop({
  resolved,
  ms,
  delay,
  yoyo,
  linear,
  paused,
  style,
  children,
}: Omit<Props, 'from' | 'to' | 'stops'> & { resolved: Stop[]; delay: number; yoyo: boolean; linear: boolean; paused: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (paused) return;
    const easing = linear ? Easing.linear : Easing.inOut(Easing.sin);
    const up = Animated.timing(v, { toValue: 1, duration: ms, delay, easing, useNativeDriver: true });
    const back = yoyo
      ? Animated.timing(v, { toValue: 0, duration: ms, easing, useNativeDriver: true })
      : Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([up, back]));
    loop.start();
    return () => loop.stop();
  }, [v, ms, delay, yoyo, linear, paused]);

  const inputRange = resolved.map((s) => s.at / 100);
  const channel = (key: keyof Pose, fallback: number) => resolved.map((s) => s.pose[key] ?? fallback);
  const interp = (key: keyof Pose, fallback: number) => v.interpolate({ inputRange, outputRange: channel(key, fallback) });
  const has = (key: keyof Pose) => resolved.some((s) => s.pose[key] != null);

  const transform: Record<string, unknown>[] = [];
  if (has('x')) transform.push({ translateX: interp('x', 0) });
  if (has('y')) transform.push({ translateY: interp('y', 0) });
  if (has('rotate')) transform.push({ rotate: v.interpolate({ inputRange, outputRange: channel('rotate', 0).map((d) => `${d}deg`) }) });
  if (has('scale')) transform.push({ scale: interp('scale', 1) });
  if (has('scaleY')) transform.push({ scaleY: interp('scaleY', 1) });

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, { transform: transform as never, ...(has('opacity') ? { opacity: interp('opacity', 1) } : null) }]}
    >
      {children}
    </Animated.View>
  );
}
