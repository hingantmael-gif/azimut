import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export type GoogleProfile = {
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  picture?: string;
};

const webClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();
const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? webClientId).trim();
const androidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? webClientId).trim();

/** Placeholder valide pour éviter un crash AuthSession si rien n’est configuré */
const SAFE_PLACEHOLDER = '000000000000-azimut.apps.googleusercontent.com';

export function isGoogleAuthConfigured(): boolean {
  return Boolean(webClientId);
}

/**
 * Hook Google OAuth (AuthSession) — ouvre le compte Google réel.
 * Configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (client OAuth « Web » Google Cloud).
 */
export function useGoogleAuth(
  onSuccess: (profile: GoogleProfile) => void,
  onError?: (msg: string) => void,
) {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: webClientId || SAFE_PLACEHOLDER,
    iosClientId: iosClientId || SAFE_PLACEHOLDER,
    androidClientId: androidClientId || SAFE_PLACEHOLDER,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) {
        onErrorRef.current?.('Jeton Google manquant');
        return;
      }
      void (async () => {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) throw new Error('Profil Google inaccessible');
          const g = (await res.json()) as {
            email?: string;
            given_name?: string;
            family_name?: string;
            picture?: string;
          };
          if (!g.email) throw new Error('E-mail Google introuvable');
          onSuccessRef.current({
            email: g.email,
            firstName: g.given_name || '',
            lastName: g.family_name || '',
            accessToken,
            picture: g.picture,
          });
        } catch (e) {
          onErrorRef.current?.(e instanceof Error ? e.message : 'Connexion Google échouée');
        }
      })();
    } else if (response.type === 'error') {
      onErrorRef.current?.(response.error?.message || 'Connexion Google annulée');
    }
  }, [response]);

  const signIn = useCallback(async () => {
    if (!isGoogleAuthConfigured()) {
      onErrorRef.current?.(
        'Connexion Google indisponible pour le moment. Utilise l’e-mail, ou réessaie plus tard.',
      );
      return;
    }
    if (!request) {
      onErrorRef.current?.('Initialisation Google en cours… réessaie.');
      return;
    }
    await promptAsync();
  }, [request, promptAsync]);

  return {
    signIn,
    ready: Boolean(request) && isGoogleAuthConfigured(),
    configured: isGoogleAuthConfigured(),
    platform: Platform.OS,
  };
}
