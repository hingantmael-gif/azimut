import { API_URL } from './api';
import type { IntegrationStatus } from '../types/domain';

export type IntegrationDto = IntegrationStatus & {
  accountLabel?: string;
};

async function authFetch<T>(
  path: string,
  authToken: string,
  init?: RequestInit,
): Promise<T & { error?: string; ok?: boolean }> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; ok?: boolean };
  if (!res.ok) {
    return { ...data, error: data.error || `Erreur ${res.status}` };
  }
  return data;
}

export function isRemoteAuthToken(token: string | null | undefined): boolean {
  return Boolean(token && token !== 'local-demo-token' && token.startsWith('az_'));
}

export async function apiFetchIntegrations(authToken: string) {
  return authFetch<{ integrations?: IntegrationDto[] }>('/integrations', authToken);
}

export async function apiGarminExchange(
  authToken: string,
  body: { code: string; codeVerifier: string; redirectUri: string },
) {
  return authFetch<{ integrations?: IntegrationDto[] }>('/integrations/garmin/exchange', authToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiStravaExchange(
  authToken: string,
  body: { code: string; redirectUri?: string },
) {
  return authFetch<{ integrations?: IntegrationDto[] }>('/integrations/strava/exchange', authToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiDisconnectIntegration(
  authToken: string,
  provider: 'garmin',
) {
  return authFetch<{ integrations?: IntegrationDto[] }>(`/integrations/${provider}`, authToken, {
    method: 'DELETE',
  });
}

export async function apiExportGarminWorkout(
  authToken: string,
  payload: { workout: unknown; scheduleDate?: string; summary?: string },
) {
  return authFetch<{ garminWorkoutId?: string; message?: string }>(
    '/integrations/garmin/workout',
    authToken,
    {
      method: 'POST',
      body: JSON.stringify({ workout: payload }),
    },
  );
}
