import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '../Text';
import { usePathname } from 'expo-router';
import { LoopView } from '../atmosphere/LoopView';

/** Respiration lente (échelle) — hypnotique, discret */
export function useBreathingScale(opts?: {
  min?: number;
  max?: number;
  durationMs?: number;
}) {
  const min = opts?.min ?? 1;
  const max = opts?.max ?? 1.045;
  const durationMs = opts?.durationMs ?? 2400;
  const v = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: max,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: min,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, min, max, durationMs]);

  return v;
}

/** Opacité respirante (halo / glow) */
export function useBreathingOpacity(opts?: {
  min?: number;
  max?: number;
  durationMs?: number;
}) {
  const min = opts?.min ?? 0.35;
  const max = opts?.max ?? 0.85;
  const durationMs = opts?.durationMs ?? 2800;
  const v = useRef(new Animated.Value(min)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: max,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: min,
          duration: durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, min, max, durationMs]);

  return v;
}

/** Entrée douce : fade + léger slide vers le haut */
export function FadeInUp({
  children,
  delay = 0,
  duration = 560,
  distance = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  /** Durée totale du mouvement (ms). */
  duration?: number;
  /** Décalage vertical de départ (px). */
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(distance);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: Math.max(280, duration * 0.92),
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, delay, duration, distance]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Panneau qui se révèle à chaque changement de clé (jour / muscle).
 * Fade + slide + léger scale — ~0,8–1,2 s, assez présent sans être long.
 */
export function RevealPanel({
  resetKey,
  children,
  style,
  duration = 900,
}: {
  resetKey: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    scale.setValue(0.97);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.85,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 68,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resetKey, opacity, translateY, scale, duration]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY }, { scale }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Élément en cascade dans un panneau (délai croissant). */
export function StaggerIn({
  index,
  children,
  baseDelay = 60,
  step = 75,
  duration = 620,
  style,
}: {
  index: number;
  children: ReactNode;
  baseDelay?: number;
  step?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <FadeInUp
      delay={baseDelay + index * step}
      duration={duration}
      distance={14}
      style={style}
    >
      {children}
    </FadeInUp>
  );
}

/** Point de statut qui « respire » (récupération musculaire) */
export function BreathingDot({
  color,
  size = 10,
}: {
  color: string;
  size?: number;
}) {
  // Animation CSS sur le web (aucun coût JavaScript) : la liste des muscles compte des dizaines de points.
  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <LoopView
        from={{ scale: 0.88, opacity: 0.2 }}
        to={{ scale: 1.18, opacity: 0.55 }}
        ms={1600}
        style={[
          styles.glow,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) / 2,
            backgroundColor: color,
          },
        ]}
      />
      <LoopView
        from={{ scale: 0.88 }}
        to={{ scale: 1.18 }}
        ms={1600}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Anneau / score avec pulsation très légère */
export function SoftPulse({
  children,
  style,
  intensity = 0.035,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  return (
    <LoopView from={{ scale: 1 }} to={{ scale: 1 + intensity }} ms={2600} style={style}>
      {children}
    </LoopView>
  );
}

/** Remplissage de barre — stable (pas de reset à l’ouverture / re-render) */
export function AnimatedFillBar({
  ratio,
  color,
  height = 6,
  trackColor,
  /** Durée anim (ms) — ex. récup rapide = court, lente = long (audit §4.1). */
  durationMs,
}: {
  ratio: number;
  color: string;
  height?: number;
  trackColor: string;
  durationMs?: number;
}) {
  const target = Math.max(0, Math.min(1, ratio));
  const width = useRef(new Animated.Value(target)).current;
  const prev = useRef(target);
  const duration = Math.max(280, Math.min(1600, durationMs ?? 650));

  useEffect(() => {
    const next = Math.max(0, Math.min(1, ratio));
    if (Math.abs(prev.current - next) < 0.005) return;
    prev.current = next;
    Animated.timing(width, {
      toValue: next,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, width, duration]);

  const w = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <Animated.View
        style={{
          height: '100%',
          width: w,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/** Barre de récupération musculaire — largeur fixe en %, sans animation (évite le « rétrécissement » à l’expand). */
export function StaticFillBar({
  ratio,
  color,
  height = 6,
  trackColor,
}: {
  ratio: number;
  color: string;
  height?: number;
  trackColor: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 1000) / 10;
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <View
        style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

/** En-tête de section vivant — barre accent + titre */
export function SectionHeader({
  title,
  subtitle,
  accentColor,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  accentColor: string;
  delay?: number;
}) {
  return (
    <FadeInUp delay={delay} style={styles.sectionHead}>
      <View style={[styles.sectionBar, { backgroundColor: accentColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </FadeInUp>
  );
}

export type PressableMotionVariant = 'subtle' | 'pop' | 'nav';

/**
 * Interaction sobre : survol = léger zoom (sans tilt / lift),
 * clic = scale court. `nav` = petit feedback avant navigation.
 */
export function PressableScale({
  children,
  onPress,
  style,
  contentStyle,
  disabled,
  variant = 'pop',
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: PressableMotionVariant;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const hovered = useRef(false);
  const pressed = useRef(false);
  const navLock = useRef(false);

  // Zoom discret uniquement — pas de déformation du texte
  const hoverScale = variant === 'subtle' ? 1.015 : 1.02;
  const pressScale = variant === 'subtle' ? 0.985 : variant === 'nav' ? 0.96 : 0.97;

  const sync = (opts?: { hover?: boolean; press?: boolean }) => {
    if (opts?.hover != null) hovered.current = opts.hover;
    if (opts?.press != null) pressed.current = opts.press;
    const toScale = pressed.current
      ? pressScale
      : hovered.current
        ? hoverScale
        : 1;
    Animated.timing(scale, {
      toValue: toScale,
      duration: pressed.current ? 90 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!onPress || disabled || navLock.current) return;
    if (variant !== 'nav') {
      onPress();
      return;
    }
    navLock.current = true;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: hovered.current ? hoverScale : 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress();
      navLock.current = false;
      sync();
    });
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => sync({ press: true })}
      onPressOut={() => sync({ press: false })}
      onHoverIn={() => sync({ hover: true })}
      onHoverOut={() => sync({ hover: false })}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[
        style,
        Platform.OS === 'web'
          ? ({ cursor: disabled ? 'not-allowed' : 'pointer' } as object)
          : null,
      ]}
    >
      <Animated.View
        style={[
          {
            // Cartes / listes : pleine largeur, hauteur stable
            alignSelf: 'stretch',
            width: '100%',
          },
          contentStyle,
          { transform: [{ scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Entrée de page : fade + slide + scale élastique.
 * Réutilise `resetKey` (ex. pathname) pour rejouer à chaque navigation.
 */
export function ScreenEnter({
  children,
  resetKey,
  style,
  intensity = 'md',
}: {
  children: ReactNode;
  resetKey?: string;
  style?: StyleProp<ViewStyle>;
  intensity?: 'sm' | 'md' | 'lg';
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  const dist = intensity === 'sm' ? 10 : intensity === 'lg' ? 28 : 18;
  const dur = intensity === 'sm' ? 420 : intensity === 'lg' ? 780 : 580;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(dist);
    translateX.setValue(intensity === 'lg' ? 14 : 0);
    scale.setValue(intensity === 'lg' ? 0.94 : 0.97);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: dur * 0.85,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 64,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resetKey, opacity, translateY, translateX, scale, dist, dur, intensity]);

  return (
    <Animated.View
      style={[
        { flex: 1, opacity, transform: [{ translateX }, { translateY }, { scale }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Anime tout le contenu à chaque changement de route (navigation globale). */
export function RouteEnter({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const pathname = usePathname();
  return (
    <ScreenEnter resetKey={pathname} intensity="md" style={style}>
      {children}
    </ScreenEnter>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    minHeight: 22,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12201C',
    letterSpacing: -0.2,
  },
  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B857C',
    lineHeight: 16,
  },
});