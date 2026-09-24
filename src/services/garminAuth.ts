import { AuthRequest, ResponseType, makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiGarminExchange } from './integrationsApi';

WebBrowser.maybeCompleteAuthSession();

const GARMIN_CLIENT_ID = (process.env.EXPO_PUBLIC_GARMIN_CLIENT_ID ?? '').trim();

const GARMIN_DISCOVERY = {
  authorizationEndpoint: 'https://connect.garmin.com/oauth2Confirm',
};

export function isGarminAuthConfigured(): boolean {
  return Boolean(GARMIN_CLIENT_ID);
}

export function garminRedirectUri(): string {
  return makeRedirectUri({ scheme: 'mova', path: 'oauth/garmin' });
}

/**
 * OAuth 2.0 PKCE Garmin Connect — ouvre la page de connexion Garmin (pop-up sur le web,
 * navigateur intégré sur mobile), puis échange le code côté serveur (secret jamais sur le client).
 * Même parcours sur téléphone, tablette et ordinateur.
 */
export async function connectGarminAccount(authToken: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isGarminAuthConfigured()) {
    return {
      ok: false,
      error:
        'Garmin non configuré. Ajoute EXPO_PUBLIC_GARMIN_CLIENT_ID et les clés GARMIN_* dans backend/.env (programme développeur Garmin requis).',
    };
  }

  const redirectUri = garminRedirectUri();
  const request = new AuthRequest({
    clientId: GARMIN_CLIENT_ID,
    redirectUri,
    responseType: ResponseType.Code,
    usePKCE: true,
  });

  let result;
  try {
    result = await request.promptAsync(GARMIN_DISCOVERY);
  } catch {
    return {
      ok: false,
      error:
        Platform.OS === 'web'
          ? 'La fenêtre Garmin a été bloquée. Autorise les pop-ups pour ce site puis réessaie.'
          : 'Impossible d’ouvrir la page d’autorisation Garmin Connect.',
    };
  }
  if (result.type !== 'success') {
    if (result.type === 'dismiss' || result.type === 'cancel') {
      return { ok: false, error: 'Connexion Garmin annulée' };
    }
    return { ok: false, error: 'Connexion Garmin échouée' };
  }

  const code = result.params.code;
  const codeVerifier = request.codeVerifier;
  if (!code || !codeVerifier) {
    return { ok: false, error: 'Autorisation Garmin incomplète' };
  }

  const exchanged = await apiGarminExchange(authToken, { code, codeVerifier, redirectUri });
  if (exchanged.error) {
    return { ok: false, error: exchanged.error };
  }
  return { ok: true };
}
