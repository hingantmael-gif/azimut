import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { hardReload } from './RouteError';

/** Signatures d'un fichier de page introuvable / périmé (ancienne version en cache). */
const CHUNK_ERROR = /chunk|dynamically imported|fetchThenEval|Importing a module script failed|Failed to fetch|Requiring unknown module/i;
const RELOAD_FLAG = 'mova-chunk-reload';

const SW_URL = '/sw.js?v=48';

/** Identifiant du déploiement, injecté à l'export (voir scripts/deploy-install-site.mjs). */
const BUILD_ID = process.env.EXPO_PUBLIC_BUILD_ID ?? '';
const UPDATE_KEY = 'mova-update-try';

/** Petit bandeau « mise à jour » avant le rechargement. */
function showUpdateBanner() {
  if (document.getElementById('mova-update-banner')) return;
  const el = document.createElement('div');
  el.id = 'mova-update-banner';
  el.textContent = 'Mise à jour de Mova…';
  el.setAttribute(
    'style',
    'position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:99999;' +
      'padding:10px 18px;border-radius:999px;background:#0A1628;color:#fff;font:700 14px system-ui,sans-serif;' +
      'border:1.5px solid rgba(255,255,255,0.4);box-shadow:0 8px 24px rgba(0,0,0,0.4)',
  );
  document.body.appendChild(el);
}

/** Télécharge en douceur les pages de l'app (le service worker les garde) : onglets instantanés. */
async function prefetchPages() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;
  try {
    const res = await fetch('/chunks.json', { cache: 'no-store' });
    if (!res.ok) return;
    const list = (await res.json()) as { url: string; size: number }[];
    for (const c of list) {
      if (document.visibilityState !== 'visible') break;
      await fetch(c.url).catch(() => undefined);
      await new Promise((r) => setTimeout(r, 120));
    }
  } catch {
    /* facultatif */
  }
}

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
    const cleanups: Array<() => void> = [];
    const stopChunkWatch = () => {
      clearTimeout(clearFlag);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      cleanups.forEach((f) => f());
    };

    // ── Mise à jour automatique ────────────────────────────────────────────────────────────
    // À chaque ouverture / retour au premier plan, on compare la version de cette app avec celle
    // publiée (/version.json). Différente → l'app se met à jour toute seule (plus besoin de la
    // désinstaller / réinstaller).
    if (!isLocal && BUILD_ID) {
      const checkVersion = async () => {
        try {
          const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
          if (!res.ok) return;
          const { build } = (await res.json()) as { build?: string };
          if (!build || build === BUILD_ID) return;
          // Garde-fou : une tentative par version et par minute (le CDN peut servir l'ancienne page un instant).
          const raw = window.sessionStorage.getItem(UPDATE_KEY);
          const last = raw ? (JSON.parse(raw) as { build: string; at: number }) : null;
          if (last && last.build === build && Date.now() - last.at < 60_000) return;
          window.sessionStorage.setItem(UPDATE_KEY, JSON.stringify({ build, at: Date.now() }));
          showUpdateBanner();
          try {
            const reg = await navigator.serviceWorker?.getRegistration();
            await reg?.update();
          } catch {
            /* on recharge quand même */
          }
          setTimeout(() => window.location.reload(), 900);
        } catch {
          /* réseau indisponible : on réessaiera */
        }
      };
      const onVisibleVersion = () => {
        if (document.visibilityState === 'visible') void checkVersion();
      };
      const first = setTimeout(() => void checkVersion(), 1200);
      const every = setInterval(() => void checkVersion(), 5 * 60_000);
      document.addEventListener('visibilitychange', onVisibleVersion);
      window.addEventListener('focus', onVisibleVersion);
      cleanups.push(() => {
        clearTimeout(first);
        clearInterval(every);
        document.removeEventListener('visibilitychange', onVisibleVersion);
        window.removeEventListener('focus', onVisibleVersion);
      });

      // ── Préchargement des pages (Plan, Progrès, Profil…) pendant que l'accueil est affiché ──
      const prefetch = setTimeout(() => void prefetchPages(), 4000);
      cleanups.push(() => clearTimeout(prefetch));
    }

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
