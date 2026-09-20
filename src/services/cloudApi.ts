import { API_URL } from './api';
import type { SyncFields, SyncSnapshot } from '../engines/cloudSync';

/** Appels réseau du compte (synchronisation, jeton, suppression). Les erreurs ne lèvent jamais : on renvoie un statut. */
type Reply<T> = { status: number; data: (T & { error?: string; ok?: boolean }) | null };

async function call<T>(method: string, path: string, token: string, body?: unknown): Promise<Reply<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as Reply<T>['data'];
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

export async function apiSyncGet(token: string) {
  const r = await call<{ snapshot: SyncSnapshot | null }>('GET', '/sync/state', token);
  return { status: r.status, snapshot: r.data?.snapshot ?? null };
}

export async function apiSyncPut(
  token: string,
  payload: { state: SyncFields; deviceId: string; baseSavedAt: string | null },
) {
  const r = await call<{ savedAt?: string; snapshot?: SyncSnapshot }>('PUT', '/sync/state', token, payload);
  return { status: r.status, savedAt: r.data?.savedAt, snapshot: r.data?.snapshot };
}

/** Renouvelle le jeton de session. `token: null` + status 401 = session expirée ou révoquée. */
export async function apiRefreshToken(token: string) {
  const r = await call<{ token?: string }>('POST', '/auth/refresh', token);
  return { status: r.status, token: r.data?.token ?? null };
}

/** Suppression réelle du compte côté serveur (obligatoire pour les stores). */
export async function apiDeleteAccount(token: string) {
  const r = await call<Record<string, never>>('DELETE', '/account', token);
  return { ok: r.status === 200, status: r.status };
}
