import { Platform, StyleSheet, View, type ViewProps, useWindowDimensions } from 'react-native';
import { colors } from '../theme/tokens';

const PHONE_WIDTH = 390;
const PHONE_MAX_HEIGHT = 844;
const FRAME_BREAKPOINT = 520;

/**
 * Sur PC / grand écran web : même visuel que le téléphone (cadre ~Edge mobile).
 * Sur vrai téléphone (viewport étroit) : plein écran.
 */
export function PhoneShell({ children, style, ...props }: ViewProps) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]} {...props}>
        {children}
      </View>
    );
  }

  const framed = width > FRAME_BREAKPOINT;

  if (!framed) {
    return (
      <View style={[styles.mobileWeb, style]} {...props}>
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
    backgroundColor: colors.bg,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    // @ts-expect-error web shadow
    boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
  },
  mobileWeb: {
    flex: 1,
    width: '100%' as unknown as number,
    minHeight: '100dvh' as unknown as number,
    height: '100%' as unknown as number,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
