import { API_URL } from './api';

/** Messagerie de contact intégrée : envoi (visiteur ou connecté) et boîte de réception du propriétaire. */

export type ContactCategory = 'question' | 'bug' | 'compte' | 'donnees' | 'autre';

export type ContactMessage = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  category: ContactCategory;
  message: string;
  fromAccount: boolean;
  read: boolean;
};

type Reply<T> = { status: number; data: (T & { error?: string; refresh?: boolean }) | null };

async function call<T>(method: string, path: string, opts?: { token?: string | null; body?: unknown }): Promise<Reply<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : null),
      },
      body: opts?.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const data = (await res.json().catch(() => null)) as Reply<T>['data'];
    return { status: res.status, data };
  } catch {
    return { status: 0, data: null };
  }
}

export async function apiContactChallenge() {
  const r = await call<{ question: string; token: string }>('GET', '/contact/challenge');
  return r.data?.question && r.data.token ? { question: r.data.question, token: r.data.token } : null;
}

export async function apiSendContact(
  payload: {
    firstName: string;
    lastName: string;
    email?: string;
    category: ContactCategory;
    message: string;
    challengeToken?: string;
    challengeAnswer?: string;
    elapsedMs: number;
    /** Champ piège : doit rester vide. */
    website?: string;
  },
  token?: string | null,
) {
  const r = await call<{ ok?: boolean }>('POST', '/contact', { token, body: payload });
  if (r.status === 200 && r.data?.ok) return { ok: true as const };
  return {
    ok: false as const,
    refresh: Boolean(r.data?.refresh),
    error:
      r.data?.error ??
      (r.status === 0 ? 'Connexion impossible pour le moment. Vérifie ta connexion et réessaie.' : 'Envoi impossible, réessaie plus tard.'),
  };
}

export async function apiAdminMessages(token: string) {
  const r = await call<{ messages: ContactMessage[]; unread: number }>('GET', '/admin/messages', { token });
  return r.status === 200 && r.data?.messages
    ? { ok: true as const, messages: r.data.messages, unread: r.data.unread ?? 0 }
    : { ok: false as const, messages: [] as ContactMessage[], unread: 0 };
}

export async function apiAdminMarkRead(token: string, id: string, read: boolean) {
  const r = await call<{ ok: boolean }>('PATCH', `/admin/messages/${id}`, { token, body: { read } });
  return r.status === 200;
}

export async function apiAdminDeleteMessage(token: string, id: string) {
  const r = await call<{ ok: boolean }>('DELETE', `/admin/messages/${id}`, { token });
  return r.status === 200;
}

export const CONTACT_CATEGORIES: Array<{ id: ContactCategory; label: string }> = [
  { id: 'question', label: 'Question' },
  { id: 'bug', label: 'Problème' },
  { id: 'compte', label: 'Mon compte' },
  { id: 'donnees', label: 'Mes données' },
  { id: 'autre', label: 'Autre' },
];
