import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

const SW_URL = '/sw.js?v=23';

/**
 * PWA : à chaque ouverture / retour au premier plan, cherche une nouvelle
 * version et recharge l’app automatiquement (plus besoin de vider le cache).
 */
export function WebPwaBootstrap() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    if (!document.querySelector('link[rel="manifest"]')) {
      document.head.appendChild(link);
    }

    let reloading = false;
    let regRef: ServiceWorkerRegistration | null = null;

    const reloadOnce = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    };

    const watchInstalling = (reg: ServiceWorkerRegistration) => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          activateWaiting(reg);
          if (navigator.serviceWorker.controller) reloadOnce();
        }
      });
    };

    const checkUpdate = () => {
      const reg = regRef;
      if (!reg) return;
      void reg.update().catch(() => {});
      activateWaiting(reg);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkUpdate();
    };

    const onFocus = () => checkUpdate();

    const onPageShow = (ev: Event) => {
      if ((ev as PageTransitionEvent).persisted) reloadOnce();
      else checkUpdate();
    };

    const onControllerChange = () => reloadOnce();

    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AZIMUT_SW_ACTIVATED') reloadOnce();
    };

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkUpdate();
    });

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);

    void navigator.serviceWorker
      .register(SW_URL, { scope: '/' })
      .then((reg) => {
        regRef = reg;
        activateWaiting(reg);
        watchInstalling(reg);
        reg.addEventListener('updatefound', () => watchInstalling(reg));
        checkUpdate();
      })
      .catch(() => {});

    return () => {
      appSub.remove();
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return null;
}
