import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Préférence « réduire les animations » (photosensibilité, confort visuel).
 * - Suit par défaut le réglage du système (prefers-reduced-motion).
 * - L'utilisateur peut la forcer dans Réglages → Unités et carte / Affichage.
 */
const KEY = 'mova-reduce-motion'; // 'on' | 'off' | absent = suit le système

type Listener = () => void;
const listeners = new Set<Listener>();

function readOverride(): 'on' | 'off' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

function systemPrefersReduced(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isReducedMotion(): boolean {
  const o = readOverride();
  return o ? o === 'on' : systemPrefersReduced();
}

export function setReducedMotion(value: boolean | null): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (value == null) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, value ? 'on' : 'off');
    } catch {
      /* stockage indisponible */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** true si les animations décoratives doivent être figées. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, isReducedMotion, () => false);
}
