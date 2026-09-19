import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import { spacing } from '../../theme/tokens';
import { PhoneModal } from '../PhoneModal';
import { PressableScale } from '../motion/softMotion';

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
  const ring = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 17) % 84),
        delay: i * 55,
        size: 5 + (i % 4) * 2,
        drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6),
        color: i % 3 === 0 ? BRAND.signal : i % 2 ? BRAND.signalMint : '#FFFFFF',
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.5);
    opacity.setValue(0);
    check.setValue(0);
    ring.setValue(0);
    shimmer.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 88,
        useNativeDriver: true,
      }),
      Animated.timing(check, {
        toValue: 1,
        duration: 560,
        delay: 100,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.timing(ring, {
        toValue: 1,
        duration: 900,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [visible, scale, opacity, check, ring, shimmer]);

  return (
    <PhoneModal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        {sparks.map((s) => (
          <CelebrationSpark key={s.id} {...s} active={visible} />
        ))}
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ring.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0.55, 0.35, 0],
                }),
                transform: [
                  {
                    scale: ring.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 2.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.badge,
              {
                opacity: check,
                transform: [
                  {
                    scale: check.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.35, 1],
                    }),
                  },
                  {
                    rotate: check.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-25deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.check}>✓</Text>
          </Animated.View>
          <Animated.Text
            style={[
              styles.eyebrow,
              {
                opacity: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1],
                }),
              },
            ]}
          >
            PROGRAMME GÉNÉRÉ
          </Animated.Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          <PressableScale variant="nav" onPress={onDone} contentStyle={styles.cta}>
            <Text style={styles.ctaText}>Voir mon calendrier</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </PhoneModal>
  );
}

function CelebrationSpark({
  left,
  delay,
  size,
  drift,
  color,
  active,
}: {
  left: number;
  delay: number;
  size: number;
  drift: number;
  color: string;
  active: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    t.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 1600 + (delay % 400),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, t, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: '18%',
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: color,
        opacity: t.interpolate({
          inputRange: [0, 0.15, 0.8, 1],
          outputRange: [0, 1, 0.55, 0],
        }),
        transform: [
          {
            translateY: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 420],
            }),
          },
          {
            translateX: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0, drift],
            }),
          },
          {
            rotate: t.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            }),
          },
          {
            scale: t.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.4, 1.15, 0.7],
            }),
          },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: BRAND.inkSoft,
    borderWidth: 1,
    borderColor: 'rgba(61, 255, 154, 0.4)',
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: BRAND.signalMint,
    top: 28,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BRAND.signalMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  check: { color: BRAND.ink, fontSize: 34, fontWeight: '900' },
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
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
