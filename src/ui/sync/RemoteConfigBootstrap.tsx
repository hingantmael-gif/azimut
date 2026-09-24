import { useEffect } from 'react';
import { AppState } from 'react-native';
import { refreshRemoteConfig } from '../../services/remoteConfig';

const EVERY_MS = 5 * 60_000;

/** Relit les réglages du propriétaire au démarrage, au retour dans l'app et toutes les 5 minutes. */
export function RemoteConfigBootstrap() {
  useEffect(() => {
    void refreshRemoteConfig();
    const timer = setInterval(() => void refreshRemoteConfig(), EVERY_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshRemoteConfig();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return null;
}
