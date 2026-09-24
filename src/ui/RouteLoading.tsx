import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useColorScheme } from 'react-native';

/**
 * Écran d'attente affiché pendant qu'une page se charge : un squelette qui « respire »
 * (jamais une page blanche). Autonome : fonctionne même avant que les thèmes soient prêts.
 */
export function RouteLoading() {
  const dark = useColorScheme() === 'dark';
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bg = dark ? '#06121E' : '#EFFBF6';
  const block = dark ? 'rgba(255,255,255,0.09)' : 'rgba(11,130,98,0.10)';
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={[styles.root, { backgroundColor: bg }]} accessibilityRole="progressbar" accessibilityLabel="Chargement">
      <Animated.View style={{ opacity }}>
        <View style={[styles.line, { width: '38%', height: 22, backgroundColor: block }]} />
        <View style={[styles.line, { width: '64%', height: 14, backgroundColor: block, marginTop: 10 }]} />
        <View style={[styles.card, { backgroundColor: block, height: 168 }]} />
        <View style={styles.row}>
          <View style={[styles.card, styles.third, { backgroundColor: block }]} />
          <View style={[styles.card, styles.third, { backgroundColor: block }]} />
          <View style={[styles.card, styles.third, { backgroundColor: block }]} />
        </View>
        <View style={[styles.card, { backgroundColor: block, height: 96 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 76 : 96,
  },
  line: { borderRadius: 8 },
  card: { borderRadius: 20, marginTop: 18 },
  row: { flexDirection: 'row', gap: 12 },
  third: { flex: 1, height: 84 },
});
