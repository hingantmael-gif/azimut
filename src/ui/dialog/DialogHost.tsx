import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { registerDialogHost, type DialogButton, type DialogRequest } from '../../utils/appAlert';
import { useThemeColors } from '../../theme/ThemeContext';
import { elevation, radii, spacing, typography } from '../../theme/tokens';
import { Text } from '../Text';

/**
 * Affiche les dialogues `Alert` / `appAlert` / `appConfirm` dans l'app (file d'attente :
 * un à la fois). Fond voilé = annuler ; le dernier bouton « normal » est le bouton
 * principal (dégradé Mova), « destructif » en rouge, « annuler » en contour.
 */
export function DialogHost() {
  const { colors, isDark } = useThemeColors();
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0] ?? null;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => registerDialogHost((req) => setQueue((q) => [...q, req])), []);

  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [current, progress]);

  const choose = useCallback(
    (button: DialogButton) => {
      setQueue((q) => q.slice(1));
      button.onPress?.();
    },
    [],
  );

  const dismiss = useCallback(() => {
    if (!current) return;
    setQueue((q) => q.slice(1));
    current.onDismiss?.();
  }, [current]);

  if (!current) return null;
  const stacked = current.buttons.length > 2;
  const primaryIndex = (() => {
    for (let i = current.buttons.length - 1; i >= 0; i--) {
      if (current.buttons[i]!.style !== 'cancel') return i;
    }
    return current.buttons.length - 1;
  })();

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={dismiss}
        accessibilityLabel="Fermer"
      >
        <Animated.View
          style={{
            opacity: progress,
            transform: [
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            ],
            width: '100%',
            maxWidth: 380,
          }}
        >
          {/* Pressable interne : un clic sur la carte ne ferme pas le dialogue. */}
          <Pressable
            onPress={() => undefined}
            accessibilityRole="alert"
            style={[
              styles.card,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.border,
                ...(elevation(3, colors.shadow, isDark) as object),
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
            {current.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{current.message}</Text>
            ) : null}
            <View style={stacked ? styles.actionsStacked : styles.actionsRow}>
              {current.buttons.map((b, i) => {
                const isPrimary = i === primaryIndex && b.style !== 'destructive';
                const isDestructive = b.style === 'destructive';
                return (
                  <Pressable
                    key={`${b.text}-${i}`}
                    onPress={() => choose(b)}
                    accessibilityRole="button"
                    style={[
                      styles.btn,
                      !stacked && { flex: 1 },
                      !isPrimary && {
                        borderWidth: 1,
                        borderColor: isDestructive ? colors.danger : colors.borderStrong,
                        backgroundColor: isDestructive ? `${colors.danger}14` : 'transparent',
                      },
                    ]}
                  >
                    {isPrimary ? (
                      <LinearGradient
                        colors={colors.gradientHero}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.btnInner}
                      >
                        <Text style={[styles.btnText, { color: colors.onAccent }]}>{b.text}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.btnInner}>
                        <Text style={[styles.btnText, { color: isDestructive ? colors.danger : colors.text }]}>
                          {b.text}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  title: { ...typography.title, marginBottom: spacing.sm },
  message: { ...typography.body, marginBottom: spacing.lg },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionsStacked: { flexDirection: 'column', gap: spacing.sm },
  btn: { borderRadius: radii.lg, overflow: 'hidden', minHeight: 48 },
  btnInner: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnText: { ...typography.button, textAlign: 'center' },
});
