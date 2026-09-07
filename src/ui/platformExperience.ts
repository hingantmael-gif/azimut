import { Platform, useWindowDimensions } from 'react-native';

const FRAME_BREAKPOINT = 520;

export type DeviceKind = 'phone' | 'tablet' | 'desktop';

/**
 * Expérience produit = téléphone partout sur le web (PC = même UI qu’Edge mobile).
 * Natif : tablette si largeur confortable.
 */
export function useDeviceKind(): DeviceKind {
  const { width: raw } = useWindowDimensions();
  const width = raw > 0 ? raw : Platform.OS === 'web' ? 1024 : 390;

  if (Platform.OS === 'web') {
    // PC / tablette web : on force le layout téléphone (cadre PhoneShell).
    return 'phone';
  }
  if (width >= 768) return 'tablet';
  return 'phone';
}

/** Natif ou web = expérience téléphone (plein écran ou cadre PC). */
export function useIsPhoneExperience(): boolean {
  return useDeviceKind() === 'phone';
}

export function useIsTabletExperience(): boolean {
  return useDeviceKind() === 'tablet';
}

export function useIsDesktopExperience(): boolean {
  // Plus de layout « desktop élargi » : PC web = téléphone dans PhoneShell.
  if (Platform.OS === 'web') return false;
  return false;
}

/** Viewport assez large pour afficher le cadre téléphone (PC). */
export function useIsWebPhoneFrame(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width > FRAME_BREAKPOINT;
}
