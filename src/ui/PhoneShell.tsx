import { Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from 'react-native';
import { usePathname } from 'expo-router';
import { colors } from '../theme/tokens';

const PHONE_MAX = 480;
const TABLET_MAX = 1024;

/**
 * Sur web :
 * - page /install : plein écran responsive (PC / tablette / téléphone)
 * - téléphone (≤480) : plein écran, tactile
 * - tablette (≤1024) : cadre large adapté à l’écran
 * - PC : cadre centré type app mobile
 */
export function PhoneShell({ children, style, ...props }: ViewProps) {
  const { width, height } = useWindowDimensions();
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
        <View style={[{ flex: 1, width: '100%', height: '100%' }, style]}>{children}</View>
      </View>
    );
  }

  const phoneLike = width <= PHONE_MAX;
  const tabletLike = !phoneLike && width <= TABLET_MAX;

  let frameWidth: number;
  let frameHeight: number;
  if (phoneLike) {
    frameWidth = width;
    frameHeight = height;
  } else if (tabletLike) {
    frameWidth = Math.min(width - 24, Math.max(520, Math.round(width * 0.92)));
    frameHeight = Math.min(height - 24, Math.max(680, Math.round(height * 0.96)));
  } else {
    frameWidth = Math.min(430, width - 48);
    frameHeight = Math.min(900, Math.max(680, height - 40));
  }

  return (
    <View
      style={[
        styles.desktop,
        phoneLike && styles.desktopTight,
        tabletLike && styles.desktopTablet,
      ]}
    >
      <View
        style={[
          styles.phone,
          phoneLike && styles.phoneFlush,
          tabletLike && styles.phoneTablet,
          {
            width: frameWidth,
            height: frameHeight,
            maxHeight: frameHeight,
            flex: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    borderRadius: 20,
  },
  installBleed: {
    backgroundColor: '#07111F',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
