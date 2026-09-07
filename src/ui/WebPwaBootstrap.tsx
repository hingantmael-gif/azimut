import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Enregistre le SW PWA dès l’ouverture de l’app (comme BTP Pro). */
export function WebPwaBootstrap() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/azimut/manifest.webmanifest';
    if (!document.querySelector('link[rel="manifest"]')) {
      document.head.appendChild(link);
    }

    navigator.serviceWorker.register('/azimut/sw.js', { scope: '/azimut/' }).catch(() => {});
  }, []);

  return null;
}
