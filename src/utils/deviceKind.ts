import { Platform } from 'react-native';

export type DeviceKind = 'ios' | 'android' | 'desktop';

/** Appareil utilisé (natif ou navigateur) : sert à proposer les étapes qui existent VRAIMENT sur cet appareil. */
export function detectDeviceKind(): DeviceKind {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS se présente comme un Mac : on reconnaît l'écran tactile.
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isMobileDevice(kind: DeviceKind = detectDeviceKind()): boolean {
  return kind !== 'desktop';
}

/** Copie du texte : presse-papiers sur le web, feuille de partage (Copier…) sur mobile natif. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fallback ci-dessous */
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
  try {
    const { Share } = await import('react-native');
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}
