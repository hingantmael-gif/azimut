import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useApp } from '../store/AppContext';
import {
  apiDisconnectIntegration,
  apiFetchIntegrations,
  isRemoteAuthToken,
} from '../services/integrationsApi';
import {
  openIntegrationProvider,
  type SupportedIntegrationProvider,
} from '../services/integrationLinks';
import { connectGarminAccount, isGarminAuthConfigured } from '../services/garminAuth';
import { INTEGRATION_LABELS } from '../constants/integrations';
import type { IntegrationStatus } from '../types/domain';

const OAUTH_PROVIDERS = new Set<IntegrationStatus['provider']>(['garmin']);

export function isOAuthProvider(provider: IntegrationStatus['provider']): boolean {
  return OAUTH_PROVIDERS.has(provider);
}

export function useProviderIntegrations() {
  const { state, dispatch } = useApp();
  const [busy, setBusy] = useState<IntegrationStatus['provider'] | null>(null);

  const syncFromServer = useCallback(async () => {
    const token = state.authToken;
    if (!isRemoteAuthToken(token)) return;
    const res = await apiFetchIntegrations(token!);
    if (res.integrations) {
      dispatch({ type: 'SET_INTEGRATIONS', integrations: res.integrations });
    }
  }, [state.authToken, dispatch]);

  const connectGarminOAuth = useCallback(
    async (token: string) => {
      setBusy('garmin');
      try {
        const result = await connectGarminAccount(token);
        if (!result.ok) {
          if (result.error) Alert.alert('Connexion Garmin', result.error);
          return;
        }
        await syncFromServer();
        Alert.alert('Connecté', 'Ton compte Garmin Connect est lié à ce profil Azimut.');
      } finally {
        setBusy(null);
      }
    },
    [syncFromServer],
  );

  const disconnectGarmin = useCallback(
    async (token: string) => {
      setBusy('garmin');
      try {
        const res = await apiDisconnectIntegration(token, 'garmin');
        if (res.error) {
          Alert.alert('Déconnexion impossible', res.error);
          return;
        }
        if (res.integrations) {
          dispatch({ type: 'SET_INTEGRATIONS', integrations: res.integrations });
        }
      } finally {
        setBusy(null);
      }
    },
    [dispatch],
  );

  const connectHealthProvider = useCallback(
    (provider: 'apple_health' | 'health_connect') => {
      dispatch({ type: 'CONNECT_PROVIDER', provider });
    },
    [dispatch],
  );

  const disconnectHealthProvider = useCallback(
    (provider: 'apple_health' | 'health_connect') => {
      dispatch({ type: 'CONNECT_PROVIDER', provider });
    },
    [dispatch],
  );

  const onProviderPress = useCallback(
    (item: IntegrationStatus) => {
      const provider = item.provider as SupportedIntegrationProvider;
      const token = state.authToken;
      const remote = isRemoteAuthToken(token);
      const label = INTEGRATION_LABELS[item.provider] ?? item.provider;

      if (item.connected) {
        if (item.provider === 'garmin') {
          Alert.alert(label, 'Veux-tu déconnecter ce compte de ton profil Azimut ?', [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Déconnecter',
              style: 'destructive',
              onPress: () => {
                if (remote && token) void disconnectGarmin(token);
                else {
                  dispatch({ type: 'CONNECT_PROVIDER', provider: 'garmin' });
                }
              },
            },
          ]);
          return;
        }
        disconnectHealthProvider(provider as 'apple_health' | 'health_connect');
        return;
      }

      void (async () => {
        setBusy(item.provider);
        try {
          if (item.provider === 'garmin') {
            if (remote && isGarminAuthConfigured() && token) {
              await connectGarminOAuth(token);
            } else {
              const opened = await openIntegrationProvider('garmin');
              if (!opened.ok && opened.error) {
                Alert.alert('Garmin Connect', opened.error);
              }
            }
            return;
          }

          const opened = await openIntegrationProvider(provider);
          if (!opened.ok && opened.error) {
            Alert.alert(label, opened.error);
            return;
          }
          connectHealthProvider(provider as 'apple_health' | 'health_connect');
        } finally {
          setBusy(null);
        }
      })();
    },
    [
      state.authToken,
      connectGarminOAuth,
      disconnectGarmin,
      connectHealthProvider,
      disconnectHealthProvider,
      dispatch,
    ],
  );

  return {
    busy,
    syncFromServer,
    onProviderPress,
    garminConfigured: isGarminAuthConfigured(),
    remoteAuth: isRemoteAuthToken(state.authToken),
  };
}
