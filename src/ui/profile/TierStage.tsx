import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { tierStageParams } from './tierStageParams';

/**
 * « Scène » commune à tous les fonds de rang : rayons qui tournent, ondes qui partent du
 * logo, éclats en orbite. Même composition à chaque palier (harmonie), dont le nombre,
 * l'opacité et la vitesse montent avec le niveau (1 = Bronze … 7 = Champion).
 * Rendue DERRIÈRE le logo de rang, jamais par-dessus.
 */
function Ring({ delay, base, ms, color }: { delay: number; base: number; ms: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: base,
        height: base,
        borderRadius: base / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.8, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 2.1] }) }],
      }}
    />
  );
}

export function TierStage({
  color,
  level,
  height,
  compact = false,
}: {
  color: string;
  level: number;
  height: number;
  compact?: boolean;
}) {
  const p = useMemo(() => tierStageParams(level, compact), [level, compact]);
  // Identifiant SVG unique : la liste affiche des dizaines de fonds, chacun avec sa couleur.
  const gradId = useMemo(() => `rayFade${Math.random().toString(36).slice(2, 8)}`, []);
  const spin = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: p.rayRotateMs, easing: Easing.linear, useNativeDriver: true }),
    );
    const b = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: p.orbitMs, easing: Easing.linear, useNativeDriver: true }),
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [spin, orbit, p.rayRotateMs, p.orbitMs]);

  // Rayons : secteurs alternés (un sur deux) dans un cercle de rayon R, opacité dégradée vers l'extérieur.
  const R = Math.max(height * 3, 420);
  const wedges = useMemo(() => {
    const step = (Math.PI * 2) / p.rays;
    const paths: string[] = [];
    for (let i = 0; i < p.rays; i += 2) {
      const a0 = i * step;
      const a1 = a0 + step;
      const x0 = R + R * Math.cos(a0);
      const y0 = R + R * Math.sin(a0);
      const x1 = R + R * Math.cos(a1);
      const y1 = R + R * Math.sin(a1);
      paths.push(`M ${R} ${R} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`);
    }
    return paths;
  }, [p.rays, R]);

  const crest = height * 0.74;
  const orbitR = crest * 0.62;
  const dots = useMemo(
    () =>
      Array.from({ length: p.orbiters }, (_, i) => ({
        angle: (i / p.orbiters) * Math.PI * 2,
        size: 4 + (i % 3) * 1.5,
        alpha: 0.6 + (i % 4) * 0.1,
      })),
    [p.orbiters],
  );

  return (
    <View pointerEvents="none" style={styles.center}>
      <Animated.View
        style={{
          position: 'absolute',
          width: R * 2,
          height: R * 2,
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      >
        <Svg width={R * 2} height={R * 2}>
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={p.rayOpacity * 1.6} />
              <Stop offset="55%" stopColor={color} stopOpacity={p.rayOpacity * 0.6} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {wedges.map((d, i) => (
            <Path key={i} d={d} fill={`url(#${gradId})`} />
          ))}
        </Svg>
      </Animated.View>

      {Array.from({ length: p.rings }).map((_, i) => (
        <Ring key={i} delay={(p.ringMs / p.rings) * i} base={crest} ms={p.ringMs} color={color} />
      ))}

      <Animated.View
        style={{
          position: 'absolute',
          width: orbitR * 2,
          height: orbitR * 2,
          transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }}
      >
        {dots.map((d, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: orbitR + orbitR * Math.cos(d.angle) - d.size / 2,
              top: orbitR + orbitR * Math.sin(d.angle) - d.size / 2,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: '#FFFFFF',
              opacity: d.alpha,
              boxShadow: `0px 0px 10px 3px ${color}`,
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
