import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../../constants/brand';
import { spacing } from '../../theme/tokens';
import { PhoneModal } from '../PhoneModal';

type Props = {
  visible: boolean;
  level: number;
  onDone: () => void;
};

/** Animation unique : uniquement le niveau actuel (pas toute la cascade). */
export function LevelUpCelebration({ visible, level, onDone }: Props) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.4);
    opacity.setValue(0);
    ring.setValue(0.6);
    glow.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1.25,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      loop,
    ]).start();

    return () => {
      loop.stop();
    };
  }, [visible, level, scale, opacity, ring, glow]);

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }),
                transform: [{ scale: ring }],
              },
            ]}
          />
          <Text style={styles.eyebrow}>NIVEAU ATTEINT</Text>
          <Text style={styles.level}>Niveau {level}</Text>
          <Text style={styles.sub}>Continue — la suite demande plus d’XP.</Text>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Continuer</Text>
          </View>
        </Animated.View>
      </Pressable>
    </PhoneModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: BRAND.inkSoft,
    borderWidth: 1,
    borderColor: 'rgba(61, 255, 154, 0.35)',
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: BRAND.signalMint,
    top: 24,
  },
  eyebrow: {
    color: BRAND.signalMint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 10,
  },
  level: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  sub: {
    color: 'rgba(244,247,250,0.75)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  cta: {
    marginTop: 28,
    backgroundColor: BRAND.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
