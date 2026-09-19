import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Effets exclusifs des derniers rangs (Diamant, Platine, Élite, Champion), rendus DERRIÈRE
 * le logo de rang. Chaque palier a sa signature ; les aperçus compacts n'affichent que
 * les effets légers (balayage, rubans) pour rester fluides dans la liste.
 */

/** Valeur qui boucle de 0 à 1 (avec pause `rest` entre deux passages). */
function useLoop(ms: number, delay = 0, rest = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, delay: rest, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms, delay, rest]);
  return v;
}

/** Barre de lumière en biais qui traverse le fond (prisme). */
function ShineSweep({ height, delay, color }: { height: number; delay: number; color: string }) {
  const v = useLoop(2400, delay, 2600);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -height * 0.4,
        width: 70,
        height: height * 2,
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-160, 560] }) },
          { rotate: '22deg' },
        ],
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/** Rubans d'aurore ondulants. */
function Ribbons({ height, color, color2 }: { height: number; color: string; color2: string }) {
  const a = useLoop(9000, 0, 0);
  const b = useLoop(12000, 1500, 0);
  const wavePath = (y: number, amp: number, phase: number) => {
    let d = `M -40 ${y}`;
    for (let x = -40; x <= 560; x += 20) d += ` L ${x} ${(y + amp * Math.sin(x * 0.016 + phase)).toFixed(1)}`;
    return d;
  };
  const drift = (v: Animated.Value, r: number) => ({
    transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-r, r] }) }],
    opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.8, 0.35] }),
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, drift(a, 40)]}>
        <Svg width="100%" height="100%" viewBox={`0 0 520 ${height}`} preserveAspectRatio="none">
          <Path d={wavePath(height * 0.34, 16, 0)} stroke={color} strokeOpacity={0.45} strokeWidth={9} fill="none" strokeLinecap="round" />
          <Path d={wavePath(height * 0.66, 14, 2)} stroke={color2} strokeOpacity={0.4} strokeWidth={7} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, drift(b, -34)]}>
        <Svg width="100%" height="100%" viewBox={`0 0 520 ${height}`} preserveAspectRatio="none">
          <Path d={wavePath(height * 0.5, 20, 4)} stroke={color2} strokeOpacity={0.35} strokeWidth={12} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Éclairs violets qui claquent par salves irrégulières. */
function Lightning({ height, color }: { height: number; color: string }) {
  const v = useLoop(3400, 0, 0);
  const bolts = useMemo(() => {
    return [200, -20, 150, 28].map((deg) => {
      const a = (deg * Math.PI) / 180;
      const pts: string[] = [];
      let x = 260;
      let y = height / 2;
      for (let i = 0; i < 6; i++) {
        pts.push(`${x.toFixed(0)},${y.toFixed(0)}`);
        const step = 34 + (i % 3) * 8;
        x += Math.cos(a) * step + (i % 2 ? 9 : -9) * Math.sin(a);
        y += Math.sin(a) * step + (i % 2 ? -9 : 9) * Math.cos(a);
      }
      return pts.join(' ');
    });
  }, [height]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: v.interpolate({ inputRange: [0, 0.04, 0.08, 0.14, 0.5, 0.54, 0.58, 0.62, 1], outputRange: [0, 1, 0.1, 0.9, 0, 0.8, 0.05, 1, 0] }) },
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 520 ${height}`} preserveAspectRatio="xMidYMid slice">
        {bolts.map((pts, i) => (
          <Polyline key={`h${i}`} points={pts} stroke={color} strokeOpacity={0.55} strokeWidth={7} fill="none" strokeLinejoin="round" />
        ))}
        {bolts.map((pts, i) => (
          <Polyline key={`w${i}`} points={pts} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinejoin="round" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Feux d'artifice dorés : gerbes de particules qui partent du logo à intervalles décalés. */
function Burst({ color, delay, size, count }: { color: string; delay: number; size: number; count: number }) {
  const v = useLoop(2600, delay, 1800);
  const dots = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2, r: size * (0.85 + (i % 3) * 0.15) })),
    [count, size],
  );
  return (
    <View pointerEvents="none" style={styles.center}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: i % 2 ? '#FFFFFF' : color,
            boxShadow: `0px 0px 8px 2px ${color}`,
            opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.5, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(d.a) * d.r] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(d.a) * d.r + 18] }) },
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.3] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/** Étoile filante en diagonale. */
function ShootingStar({ delay, color, height }: { delay: number; color: string; height: number }) {
  const v = useLoop(1300, delay, 3600);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: height * 0.06,
        left: 0,
        width: 90,
        height: 2,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 0.8, 0] }),
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-100, 620] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
          { rotate: '24deg' },
        ],
      }}
    >
      <LinearGradient colors={['rgba(255,255,255,0)', color]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

export function TierPremiumFx({
  level,
  color,
  height,
  compact,
}: {
  level: number;
  color: string;
  height: number;
  compact: boolean;
}) {
  if (level < 4) return null;
  const crest = height * 0.74;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Diamant et plus : prismes qui balaient le fond. */}
      <View style={styles.clip}>
        <ShineSweep height={height} delay={0} color="rgba(255,255,255,0.32)" />
        {level >= 5 ? <ShineSweep height={height} delay={2600} color="rgba(190,240,255,0.26)" /> : null}
      </View>
      {/* Platine et plus : rubans d'aurore. */}
      {level >= 5 ? <Ribbons height={height} color={color} color2="#A5F3FC" /> : null}
      {/* Élite et plus : éclairs. */}
      {level >= 6 && !compact ? <Lightning height={height} color={color} /> : null}
      {/* Champion : feux d'artifice + étoiles filantes. */}
      {level >= 7 && !compact ? (
        <>
          <Burst color="#FBBF24" delay={0} size={crest * 0.95} count={12} />
          <Burst color="#FDE68A" delay={1400} size={crest * 1.15} count={12} />
          <ShootingStar delay={600} color="#FDE68A" height={height} />
          <ShootingStar delay={2600} color="#FFFFFF" height={height} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  clip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
});
