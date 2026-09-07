import { AuthRequest, ResponseType, makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { apiStravaExchange } from './integrationsApi';

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = (process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '').trim();

const STRAVA_DISCOVERY = {
  authorizationEndpoint: 'https://www.strava.com/oauth/authorize',
};

export function isStravaAuthConfigured(): boolean {
  return Boolean(STRAVA_CLIENT_ID);
}

export function stravaRedirectUri(): string {
  return makeRedirectUri({ scheme: 'endurancetraining', path: 'oauth/strava' });
}

/** OAuth Strava — consentement réel, jetons stockés par utilisateur côté serveur. */
export async function connectStravaAccount(authToken: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isStravaAuthConfigured()) {
    return {
      ok: false,
      error:
        'Strava non configuré. Ajoute EXPO_PUBLIC_STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans backend/.env.',
    };
  }

  const redirectUri = stravaRedirectUri();
  const request = new AuthRequest({
    clientId: STRAVA_CLIENT_ID,
    redirectUri,
    responseType: ResponseType.Code,
    scopes: ['activity:read', 'activity:write'],
  });

  const result = await request.promptAsync(STRAVA_DISCOVERY);
  if (result.type !== 'success') {
    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { ok: false, error: 'Connexion Strava annulée' };
    }
    return { ok: false, error: 'Connexion Strava échouée' };
  }

  const code = result.params.code;
  if (!code) {
    return { ok: false, error: 'Autorisation Strava incomplète' };
  }

  const exchanged = await apiStravaExchange(authToken, { code, redirectUri });
  if (exchanged.error) {
    return { ok: false, error: exchanged.error };
  }
  return { ok: true };
}
