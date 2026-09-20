import { useSyncExternalStore } from 'react';
import { API_URL } from './api';

/**
 * Réglages de la communauté pilotés par le propriétaire (voir backend/src/appConfig.js).
 * Le serveur est la source de vérité : les applis relisent régulièrement, donc un changement de seuil
 * s'applique à tous les utilisateurs presque immédiatement (au plus 5 min, ou dès le retour dans l'app).
 */
export type RemoteConfig = {
  groupMinFollowers: number;
  verifiedMinFollowers: number;
  verifiedPriceEur: number;
};

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  groupMinFollowers: 1000,
  verifiedMinFollowers: 10000,
  verifiedPriceEur: 1,
};

let current: RemoteConfig = DEFAULT_REMOTE_CONFIG;
const listeners = new Set<() => void>();

function set(next: RemoteConfig) {
  if (
    next.groupMinFollowers === current.groupMinFollowers &&
    next.verifiedMinFollowers === current.verifiedMinFollowers &&
    next.verifiedPriceEur === current.verifiedPriceEur
  ) {
    return;
  }
  current = next;
  listeners.forEach((l) => l());
}

export function getRemoteConfig(): RemoteConfig {
  return current;
}

export function useRemoteConfig(): RemoteConfig {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => DEFAULT_REMOTE_CONFIG,
  );
}

/** Relit la configuration publique. Silencieux en cas d'échec : on garde la dernière valeur connue. */
export async function refreshRemoteConfig(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/config`);
    if (!res.ok) return;
    const j = (await res.json()) as { config?: Partial<RemoteConfig> };
    if (!j.config) return;
    const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
    set({
      groupMinFollowers: n(j.config.groupMinFollowers, DEFAULT_REMOTE_CONFIG.groupMinFollowers),
      verifiedMinFollowers: n(j.config.verifiedMinFollowers, DEFAULT_REMOTE_CONFIG.verifiedMinFollowers),
      verifiedPriceEur: n(j.config.verifiedPriceEur, DEFAULT_REMOTE_CONFIG.verifiedPriceEur),
    });
  } catch {
    /* hors ligne */
  }
}

/** Propriétaire : enregistre les nouveaux seuils (appliqués à tous). */
export async function saveRemoteConfig(token: string, patch: Partial<RemoteConfig>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    const j = (await res.json().catch(() => null)) as { config?: RemoteConfig; error?: string } | null;
    if (res.ok && j?.config) {
      set(j.config);
      return { ok: true };
    }
    return { ok: false, error: j?.error ?? 'Enregistrement impossible.' };
  } catch {
    return { ok: false, error: 'Connexion impossible pour le moment.' };
  }
}

/** Statut communautaire du compte connecté (abonnés, certification, droit de créer un groupe). */
export async function fetchCommunityStatus(token: string) {
  try {
    const res = await fetch(`${API_URL}/community/me/status`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as { followers: number; verified: boolean; canCreateGroup: boolean };
  } catch {
    return null;
  }
}
