import { Platform } from 'react-native';

/**
 * Détecte un vrai téléphone / tablette (pas seulement une fenêtre étroite sur PC).
 * Sur web : User-Agent mobile. Sur natif : iOS / Android.
 */
export function isPhoneDevice(): boolean {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return true;
  if (typeof navigator !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }
  return false;
}

export type DeviceKind = 'phone' | 'desktop';

export function getDeviceKind(): DeviceKind {
  return isPhoneDevice() ? 'phone' : 'desktop';
}
