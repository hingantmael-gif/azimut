import { useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../Text';

/**
 * Bannière in-app fermable de DEUX façons fiables :
 * - la croix (bouton indépendant, cible de 44 px — plus imbriquée dans le bouton principal) ;
 * - un glissement vers le haut (swipe up).
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
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const pan = useMemo(
    () =>
      PanResponder.create({
        // On ne capte que les glissements verticaux : un simple appui reste un appui.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => {
          if (g.dy < 0) y.setValue(g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -30 || g.vy < -0.5) {
            Animated.timing(y, { toValue: -140, duration: 160, useNativeDriver: true }).start(() => dismissRef.current());
          } else {
            Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [y],
  );

  return (
    <Animated.View style={[style, { transform: [{ translateY: y }] }]} {...pan.panHandlers}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.content}>
        {children}
      </Pressable>
      <Pressable
        onPress={onDismiss}
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
