import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BRAND } from '../../constants/brand';
import { spacing } from '../../theme/tokens';
import { PhoneModal } from '../PhoneModal';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onDone: () => void;
};

/** Confirmation visuelle après génération d’un nouveau programme. */
export function ProgramCreatedCelebration({
  visible,
  title,
  subtitle,
  onDone,
}: Props) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.5);
    opacity.setValue(0);
    check.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(check, {
        toValue: 1,
        duration: 500,
        delay: 120,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity, check]);

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Animated.View
            style={[
              styles.badge,
              {
                opacity: check,
                transform: [
                  {
                    scale: check.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.check}>✓</Text>
          </Animated.View>
          <Text style={styles.eyebrow}>PROGRAMME GÉNÉRÉ</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Voir mon calendrier</Text>
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
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND.signalMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  check: { color: BRAND.ink, fontSize: 32, fontWeight: '900' },
  eyebrow: {
    color: BRAND.signalMint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    color: 'rgba(244,247,250,0.75)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  cta: {
    marginTop: 26,
    backgroundColor: BRAND.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
