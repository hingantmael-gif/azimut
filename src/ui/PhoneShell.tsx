import { Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from 'react-native';
import { usePathname } from 'expo-router';
import { colors } from '../theme/tokens';
import { useDeviceKind } from './platformExperience';

/**
 * Cadre adaptatif :
 * - téléphone : plein écran
 * - tablette : grand cadre presque plein
 * - PC : fenêtre app centrée (plus large, lisible)
 * Évite width/height 0 au SSR (page blanche).
 */
export function PhoneShell({ children, style, ...props }: ViewProps) {
  const { width: rawW, height: rawH } = useWindowDimensions();
  const width = rawW > 0 ? rawW : 1024;
  const height = rawH > 0 ? rawH : 768;
  const kind = useDeviceKind();
  const pathname = usePathname();
  const installLanding =
    typeof pathname === 'string' &&
    (pathname === '/install' || pathname.endsWith('/install'));

  if (Platform.OS !== 'web') {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg }, style]} {...props}>
        {children}
      </View>
    );
  }

  if (installLanding) {
    return (
      <View style={[styles.desktop, styles.desktopTight, styles.installBleed]} {...props}>
        <View style={[{ flex: 1, width: '100%', height: '100%', minHeight: height }, style]}>
          {children}
        </View>
      </View>
    );
  }

  let frameWidth: number;
  let frameHeight: number;
  if (kind === 'phone') {
    frameWidth = width;
    frameHeight = height;
  } else if (kind === 'tablet') {
    frameWidth = Math.min(width - 20, Math.max(640, Math.round(width * 0.94)));
    frameHeight = Math.min(height - 20, Math.max(720, Math.round(height * 0.96)));
  } else {
    // PC : plus large qu’un “faux téléphone”, confort lecture / clavier
    frameWidth = Math.min(920, Math.max(720, width - 64));
    frameHeight = Math.min(height - 32, Math.max(700, height - 48));
  }

  return (
    <View
      style={[
        styles.desktop,
        kind === 'phone' && styles.desktopTight,
        kind === 'tablet' && styles.desktopTablet,
        kind === 'desktop' && styles.desktopPc,
      ]}
    >
      <View
        style={[
          styles.phone,
          kind === 'phone' && styles.phoneFlush,
          kind === 'tablet' && styles.phoneTablet,
          kind === 'desktop' && styles.phoneDesktop,
          {
            width: frameWidth,
            height: frameHeight,
            maxWidth: '100%' as unknown as number,
            maxHeight: frameHeight,
            flexGrow: 1,
            flexShrink: 1,
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
    minHeight: '100%' as unknown as number,
    width: '100%' as unknown as number,
    backgroundColor: '#ECECF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  desktopTight: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: colors.bg,
  },
  desktopTablet: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#E4E6EC',
  },
  desktopPc: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#DDE1E8',
  },
  phone: {
    position: 'relative',
    backgroundColor: colors.bg,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneFlush: {
    borderRadius: 0,
    borderWidth: 0,
  },
  phoneTablet: {
    borderRadius: 18,
  },
  phoneDesktop: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  installBleed: {
    backgroundColor: '#07111F',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
