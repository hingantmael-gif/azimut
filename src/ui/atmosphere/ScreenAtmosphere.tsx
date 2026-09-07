import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useThemeColors } from '../../theme/ThemeContext';

/** Fond atmosphérique discret — moins de plat blanc / noir. */
export function ScreenAtmosphere({ intensity = 1 }: { intensity?: number }) {
  const { colors, isDark } = useThemeColors();
  const breath = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 0.9,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0.45,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const accent = colors.accent;
  const soft = isDark ? 'rgba(61,255,154,0.12)' : 'rgba(14,143,111,0.10)';
  const wash = isDark ? 'rgba(18,40,70,0.55)' : 'rgba(225,240,234,0.85)';

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: intensity }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="atmWash" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={isDark ? '#0A1628' : '#E8F3EF'} stopOpacity="1" />
            <Stop offset="55%" stopColor={isDark ? '#0C1A2E' : '#F4FAF7'} stopOpacity="1" />
            <Stop offset="100%" stopColor={isDark ? '#07111F' : '#EEF6F2'} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#atmWash)" />
        <Circle cx="18%" cy="12%" r="120" fill={soft} />
        <Circle cx="92%" cy="28%" r="90" fill={wash} />
        <Circle cx="70%" cy="88%" r="140" fill={soft} />
      </Svg>
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: accent,
            opacity: breath.interpolate({
              inputRange: [0.45, 0.9],
              outputRange: [0.04, 0.11],
            }),
            transform: [
              {
                scale: breath.interpolate({
                  inputRange: [0.45, 0.9],
                  outputRange: [1, 1.15],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    right: -50,
  },
});
