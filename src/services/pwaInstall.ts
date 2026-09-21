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
