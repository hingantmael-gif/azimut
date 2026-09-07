import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useApp } from '../../store/AppContext';
import { useThemeColors } from '../../theme/ThemeContext';

/**
 * Toast global : dès qu’une action ajoute de l’XP, feedback immédiat
 * (sans attendre un refresh manuel du Classement).
 */
export function XpGainToast() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const xp = state.profile.ranked.xp;
  const weekXp = state.profile.ranked.weekXp ?? 0;
  const prevXp = useRef<number | null>(null);
  const [amount, setAmount] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (prevXp.current == null) {
      prevXp.current = xp;
      return;
    }
    const delta = xp - prevXp.current;
    prevXp.current = xp;
    if (delta <= 0) return;

    setAmount(delta);
    opacity.setValue(0);
    translateY.setValue(16);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1600),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [xp, opacity, translateY]);

  if (amount <= 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: colors.accentDark,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.text}>+{amount} XP</Text>
      <Text style={styles.sub}>{weekXp.toLocaleString('fr-FR')} XP sem.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    zIndex: 80,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  sub: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
});
