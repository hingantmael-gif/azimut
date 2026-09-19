import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../theme/ThemeContext';

const AnimatedView = Animated.View;

/** Dérive lente et bouclée (aller-retour) d'un halo : x/y en px. */
function useDrift(durationMs: number, dx: number, dy: number, delayMs = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: durationMs,
          delay: delayMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, durationMs, delayMs]);
  return {
    translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }),
    translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-dy, dy] }),
  };
}

/** Halo flou = cercle à dégradé radial (pas de blur natif : fonctionne partout). */
function Blob({
  size,
  color,
  opacity,
  style,
}: {
  size: number;
  color: string;
  opacity: number;
  style: object;
}) {
  const id = useMemo(() => `b${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <AnimatedView pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </AnimatedView>
  );
}

/**
 * Fond « aurore » Mova : dégradé de base + trois halos (jade, cyan, violet) qui
 * dérivent lentement. Discret en clair, plus lumineux en sombre. Ne capte aucun toucher.
 */
export function ScreenAtmosphere({ intensity = 1 }: { intensity?: number }) {
  const { colors, isDark } = useThemeColors();

  const a = useDrift(9000, 26, 18);
  const b = useDrift(11000, 22, 26, 600);
  const c = useDrift(13000, 30, 20, 1200);

  const glow = isDark ? 1 : 0.62;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: intensity }]}>
      <LinearGradient
        colors={[colors.bg, colors.bgSecondary, colors.bg]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Blob
        size={340}
        color={colors.accent}
        opacity={0.2 * glow}
        style={{ top: -120, left: -110, transform: [{ translateX: a.translateX }, { translateY: a.translateY }] }}
      />
      <Blob
        size={300}
        color={colors.accent2}
        opacity={0.17 * glow}
        style={{ top: 160, right: -140, transform: [{ translateX: b.translateX }, { translateY: b.translateY }] }}
      />
      <Blob
        size={360}
        color={colors.accent3}
        opacity={0.13 * glow}
        style={{ bottom: -150, left: -60, transform: [{ translateX: c.translateX }, { translateY: c.translateY }] }}
      />
    </View>
  );
}
