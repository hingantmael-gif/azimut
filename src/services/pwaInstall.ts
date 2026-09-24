import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Installation de Mova comme application (PWA) — sans quitter l'app.
 * Le navigateur émet `beforeinstallprompt` UNE fois, tôt : on le garde ici pour l'écran « Installer Mova ».
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function isStandaloneDisplay(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** À appeler une fois au démarrage de l'app web. */
export function initPwaInstall() {
  if (started || Platform.OS !== 'web' || typeof window === 'undefined') return;
  started = true;
  installed = isStandaloneDisplay();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export type PlatformKind = 'ios' | 'android' | 'desktop' | 'native';

export function detectPlatform(): { kind: PlatformKind; inAppBrowser: boolean } {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return { kind: 'native', inAppBrowser: false };
  const sim = detectIos();
  if (sim) return { kind: 'ios', inAppBrowser: sim.browser === 'inapp' };
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const inAppBrowser = /FBAN|FBAV|Instagram|Snapchat|TikTok|MicroMessenger|Line\/|Twitter|LinkedInApp|GSA\/|; wv\)/i.test(ua);
  return { kind: ios ? 'ios' : android ? 'android' : 'desktop', inAppBrowser };
}

export function usePwaInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    initPwaInstall();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    /** Le navigateur propose l'installation en un appui. */
    canPrompt: deferred != null,
    installed: installed || isStandaloneDisplay(),
    /** Ouvre la boîte d'installation du navigateur. Renvoie le choix (ou null si indisponible). */
    async prompt(): Promise<'accepted' | 'dismissed' | null> {
      if (!deferred) return null;
      const ev = deferred;
      deferred = null;
      notify();
      await ev.prompt();
      const choice = await ev.userChoice;
      return choice.outcome;
    },
  };
}

export type IosInfo = {
  /** iPhone ou iPad (l'emplacement du bouton Partager change). */
  device: 'iphone' | 'ipad';
  /** Navigateur utilisé : seul Safari (ou Chrome récent) peut ajouter à l'écran d'accueil. */
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'inapp' | 'other';
  /** Version majeure d'iOS (0 si inconnue). */
  major: number;
};

/** Détails iOS utiles au guide d'installation (null hors iPhone / iPad). */
export function detectIos(): IosInfo | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  let ua = navigator.userAgent || '';
  let ipadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  // Simulation (localhost uniquement) pour vérifier l'écran sans iPhone : ?sim=ios-safari | ios-chrome | ios-inapp | ios-ipad
  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const sim = new URLSearchParams(location.search).get('sim');
    if (sim === 'ios-safari') ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    if (sim === 'ios-chrome') ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1';
    if (sim === 'ios-inapp') ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0';
    if (sim === 'ios-ipad') {
      ua = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      ipadOs = false;
    }
  }
  if (!/iphone|ipod|ipad/i.test(ua) && !ipadOs) return null;
  const device: IosInfo['device'] = /ipad/i.test(ua) || ipadOs ? 'ipad' : 'iphone';
  const major = Number(/OS (\d+)[_.]/.exec(ua)?.[1] ?? 0);
  const inapp = /FBAN|FBAV|Instagram|Snapchat|TikTok|MicroMessenger|Line\/|Twitter|LinkedInApp|GSA\/|Messenger|WhatsApp/i.test(ua);
  const browser: IosInfo['browser'] = inapp
    ? 'inapp'
    : /CriOS/i.test(ua)
      ? 'chrome'
      : /FxiOS/i.test(ua)
        ? 'firefox'
        : /EdgiOS/i.test(ua)
          ? 'edge'
          : /Safari/i.test(ua)
            ? 'safari'
            : 'other';
  return { device, browser, major };
}
