import { Platform, useWindowDimensions } from 'react-native';

const PHONE_MAX = 480;
const TABLET_MAX = 1024;

export type DeviceKind = 'phone' | 'tablet' | 'desktop';

/** Détecte téléphone / tablette / PC pour adapter le design. */
export function useDeviceKind(): DeviceKind {
  const { width: raw } = useWindowDimensions();
  const width = raw > 0 ? raw : Platform.OS === 'web' ? 1024 : 390;

  if (Platform.OS !== 'web') {
    // Natif : tablette si largeur confortable
    if (width >= 768) return 'tablet';
    return 'phone';
  }
  if (width <= PHONE_MAX) return 'phone';
  if (width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

/** Natif ou web étroit = expérience téléphone (plein écran). */
export function useIsPhoneExperience(): boolean {
  return useDeviceKind() === 'phone';
}

export function useIsTabletExperience(): boolean {
  return useDeviceKind() === 'tablet';
}

export function useIsDesktopExperience(): boolean {
  return useDeviceKind() === 'desktop';
}
