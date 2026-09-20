import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { hardReload } from './RouteError';

/** Signatures d'un fichier de page introuvable / périmé (ancienne version en cache). */
const CHUNK_ERROR = /chunk|dynamically imported|fetchThenEval|Importing a module script failed|Failed to fetch|Requiring unknown module/i;
const RELOAD_FLAG = 'mova-chunk-reload';

const SW_URL = '/sw.js?v=48';

/**
 * PWA : à chaque ouverture / retour au premier plan, cherche une nouvelle
 * version et recharge l’app automatiquement (plus besoin de vider le cache).
 */
export function WebPwaBootstrap() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    // Ferme la popup OAuth Google même si la page de retour n’importe pas googleAuth
    WebBrowser.maybeCompleteAuthSession();

    // Une page qui ne se charge pas (fichier d'une ancienne version) : on vide le cache et on
    // recharge UNE fois, automatiquement — plus de page vide à réparer à la main.
    const isLocal = /^(localhost|127.0.0.1)$/.test(window.location.hostname);
    const onChunkFailure = (msg: unknown) => {
      if (isLocal || !CHUNK_ERROR.test(String(msg ?? ''))) return;
      try {
        if (window.sessionStorage.getItem(RELOAD_FLAG)) return;
        window.sessionStorage.setItem(RELOAD_FLAG, '1');
      } catch {
        return;
      }
      void hardReload();
    };
    const onError = (e: ErrorEvent) => onChunkFailure(e.message || e.error?.message);
    const onRejection = (e: PromiseRejectionEvent) => onChunkFailure(e.reason?.message ?? e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    const clearFlag = setTimeout(() => {
      try {
        window.sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
    }, 20000);
    const stopChunkWatch = () => {
      clearTimeout(clearFlag);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };

    if (!('serviceWorker' in navigator)) return stopChunkWatch;
    // Dev local : pas de service worker (il servirait un bundle périmé) — on nettoie l'existant.
    if (/^(localhost|127.0.0.1)$/.test(window.location.hostname)) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      return stopChunkWatch;
    }

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
      stopChunkWatch();
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
