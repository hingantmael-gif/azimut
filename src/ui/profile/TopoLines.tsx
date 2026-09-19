import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { buildTopoPaths } from '../../engines/topoLines';

/**
 * Courbes de niveau vivantes : la signature « mouvement » des fonds de profil Mova.
 * Les lignes dérivent lentement (aller-retour) ; ne capte aucun toucher.
 */
export function TopoLines({
  color,
  height,
  seed,
  lines = 12,
  opacity = 0.32,
  drift: driftScale = 1,
}: {
  color: string;
  height: number;
  seed: number;
  lines?: number;
  opacity?: number;
  /** Amplitude de la dérive : 1 = discret (fonds de profil), 2+ = nettement visible. */
  drift?: number;
}) {
  const OVERSCAN = Math.round(30 * Math.max(1, driftScale));
  const paths = useMemo(() => buildTopoPaths({ seed, lines, h: height, overscan: OVERSCAN }), [seed, lines, height]);
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000 + (seed % 3000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000 + (seed % 3000), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, seed]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: -OVERSCAN,
          right: -OVERSCAN,
          transform: [
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-OVERSCAN * 0.7, OVERSCAN * 0.7] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [2 * driftScale, -2 * driftScale] }) },
          ],
        }}
      >
        <Svg width="100%" height="100%" viewBox={`${-OVERSCAN} 0 ${400 + OVERSCAN * 2} ${height}`} preserveAspectRatio="none">
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              fill="none"
              stroke={color}
              strokeOpacity={p.major ? opacity * 1.5 : opacity * (0.55 + 0.45 * (1 - p.t))}
              strokeWidth={p.major ? 1.6 : 0.9}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
