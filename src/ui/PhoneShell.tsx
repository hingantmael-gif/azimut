import { Platform, StyleSheet, View, type ViewProps, useWindowDimensions } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';

const PHONE_WIDTH = 390;
const PHONE_MAX_HEIGHT = 844;
const FRAME_BREAKPOINT = 520;

/**
 * Sur PC / grand écran web : même visuel que le téléphone (cadre ~Edge mobile).
 * Sur vrai téléphone (viewport étroit) : plein écran.
 */
export function PhoneShell({ children, style, ...props }: ViewProps) {
  const { width, height } = useWindowDimensions();
  const { colors } = useThemeColors();

  if (Platform.OS !== 'web') {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]} {...props}>
        {children}
      </View>
    );
  }

  // Le cadre « téléphone » est réservé aux écrans à souris. Sur un vrai téléphone tourné en paysage la largeur
  // dépasse 520 px : encadrer démonterait toute l'app (séance en cours remise à zéro).
  const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  const framed = width > FRAME_BREAKPOINT && !touch;

  if (!framed) {
    return (
      <View style={[styles.mobileWeb, { backgroundColor: colors.bg }, style]} {...props}>
        {children}
      </View>
    );
  }

  const phoneH = Math.min(PHONE_MAX_HEIGHT, Math.max(640, height - 48));

  return (
    <View style={styles.desktop}>
      <View
        style={[
          styles.phone,
          {
            backgroundColor: colors.bg,
            width: Math.min(PHONE_WIDTH, width - 32),
            height: phoneH,
            maxHeight: phoneH,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    minHeight: '100dvh' as unknown as number,
    width: '100%' as unknown as number,
    backgroundColor: '#02060D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  phone: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
  },
  mobileWeb: {
    flex: 1,
    width: '100%' as unknown as number,
    minHeight: '100dvh' as unknown as number,
    height: '100%' as unknown as number,
    overflow: 'hidden',
  },
});
