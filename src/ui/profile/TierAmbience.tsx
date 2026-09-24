import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Particle = { x: number; size: number; duration: number; delay: number; drift: number; alpha: number };

/** Particules déterministes, réparties dans les flancs (jamais au centre, où vit le logo de rang). */
export function buildParticles(seed: number, count: number): Particle[] {
  const out: Particle[] = [];
  let r = (seed % 9973) + 7;
  const rand = () => {
    r = (r * 16807) % 2147483647;
    return (r % 10000) / 10000;
  };
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    // Flanc gauche : 4–27 % ; flanc droit : 73–96 % de la largeur.
    const x = left ? 0.04 + rand() * 0.23 : 0.73 + rand() * 0.23;
    out.push({
      x,
      size: 2.5 + rand() * 3.5,
      duration: 4200 + rand() * 3800,
      delay: rand() * 4000,
      drift: (rand() - 0.5) * 18,
      alpha: 0.5 + rand() * 0.4,
    });
  }
  return out;
}

function Spark({ p, color, height }: { p: Particle; color: string; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, p.duration, p.delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${p.x * 100}%`,
        bottom: 4,
        width: p.size,
        height: p.size,
        borderRadius: p.size / 2,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, p.alpha, p.alpha * 0.6, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -(height * 0.85)] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
        ],
      }}
    />
  );
}

/**
 * Ambiance des fonds de rang : lueur en pied + particules montantes sur les flancs.
 * Volontairement absente du centre : le logo de rang n'est jamais recouvert.
 */
export function TierAmbience({
  color,
  height,
  seed,
  count = 12,
}: {
  color: string;
  height: number;
  seed: number;
  count?: number;
}) {
  const particles = useMemo(() => buildParticles(seed, count), [seed, count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(0,0,0,0)', color + '40']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.4 }}
      />
      {particles.map((p, i) => (
        <Spark key={i} p={p} color={color} height={height} />
      ))}
    </View>
  );
}
