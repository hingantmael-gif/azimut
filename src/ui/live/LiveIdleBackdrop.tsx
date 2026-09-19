import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { seedFromString } from '../../engines/topoLines';
import { TopoLines } from '../profile/TopoLines';
import { Text } from '../Text';

/** Anneau radar : grandit et s'efface, décalé dans le temps pour un effet d'ondes continues. */
function RadarRing({ delay, size }: { delay: number; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 3600,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: '#3DFF9A',
        opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1.6] }) }],
      }}
    />
  );
}

/**
 * Fond du tracker avant le premier signal GPS : radar qui balaie, courbes de niveau,
 * message clair. Remplace la carte du monde vide (sans intérêt tant qu'on n'est pas localisé).
 */
export function LiveIdleBackdrop({ message, denied }: { message: string; denied?: boolean }) {
  const { width, height } = useWindowDimensions();
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);
  const R = Math.min(width, 420) * 0.72;
  const accent = denied ? '#FB7185' : '#3DFF9A';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#050B16', '#0A1E2E', '#06121E']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <TopoLines color={accent} height={Math.max(560, height)} seed={seedFromString('mova-live-idle')} lines={16} opacity={0.22} />
      <View style={[styles.center, { top: height * 0.2 }]}>
        <RadarRing delay={0} size={R} />
        <RadarRing delay={1200} size={R} />
        <RadarRing delay={2400} size={R} />
        <Animated.View
          style={{
            position: 'absolute',
            width: R,
            height: R,
            transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
          }}
        >
          <LinearGradient
            colors={['rgba(61,255,154,0)', 'rgba(61,255,154,0.28)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', left: R / 2, top: R / 2 - 1, width: R / 2, height: 2 }}
          />
        </Animated.View>
        <View style={[styles.dot, { backgroundColor: accent }]}>
          <Ionicons name={denied ? 'location-outline' : 'navigate'} size={20} color="#04140D" />
        </View>
      </View>
      <Text style={[styles.message, { color: denied ? '#FDA4AF' : 'rgba(255,255,255,0.78)', top: height * 0.2 + R * 0.58 }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', height: 0 },
  dot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 28px rgba(61,255,154,0.6)',
  },
  message: {
    position: 'absolute',
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
