import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';

/** Le bandeau reste présent (invisible) un instant après sa fermeture : le « clic » qui suit le geste tombe dessus, pas sur ce qu'il cache. */
const SHIELD_MS = 450;

/**
 * Bannière in-app fermable de DEUX façons fiables :
 * - la croix (bouton indépendant, cible de 44 px) ;
 * - un glissement vers le haut (swipe up).
 * Un appui sur le bandeau lui-même ouvre l'écran voulu ET ferme le bandeau.
 * Fermer ne déclenche jamais un bouton situé derrière.
 */
export function DismissibleBanner({
  children,
  onPress,
  onDismiss,
  closeColor,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  onDismiss: () => void;
  closeColor: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => y.setValue(0));
    timer.current = setTimeout(() => dismissRef.current(), SHIELD_MS);
  }, [opacity, y]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // On ne capte que les glissements verticaux : un simple appui reste un appui.
        onMoveShouldSetPanResponder: (_e, g) => !closing.current && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          if (g.dy < 0) y.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -30 || g.vy < -0.5) close();
          else Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [y, close],
  );

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: y }] }]} {...pan.panHandlers}>
      <Pressable
        onPress={() => {
          if (closing.current) return;
          onPress?.();
          close();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.content}
      >
        {children}
      </Pressable>
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Fermer la notification"
        hitSlop={8}
        style={styles.close}
      >
        <View style={styles.closeInner}>
          <Text style={[styles.closeText, { color: closeColor }]}>✕</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { paddingRight: 36 },
  close: { position: 'absolute', top: 0, right: 0, width: 44, height: 44, zIndex: 5 },
  closeInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '800' },
});
