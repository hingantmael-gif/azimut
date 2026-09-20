import { useCallback, useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../store/AppContext';
import { apiRefreshToken, apiSyncGet, apiSyncPut } from '../../services/cloudApi';
import { isRemoteAuthToken } from '../../services/integrationsApi';
import { getOrCreateRsid } from '../../storage/deviceSession';
import {
  extractSyncFields,
  fingerprint,
  isFreshLocal,
  mergeRemote,
  type SyncSnapshot,
} from '../../engines/cloudSync';

const PUSH_DELAY_MS = 8_000;
const PULL_EVERY_MS = 3 * 60_000;

/**
 * Synchronisation du compte entre appareils (invisible) :
 * - à l'ouverture : renouvelle le jeton, récupère les données du serveur et les fusionne ;
 * - à chaque modification : envoie l'état (avec 8 s de délai pour regrouper) ;
 * - au retour au premier plan et toutes les 3 minutes : récupère ce qu'un autre appareil a envoyé.
 * Sans compte (jeton local) ou hors ligne : ne fait rien, l'app reste 100 % locale.
 */
export function CloudSyncBootstrap() {
  const { state, dispatch, sessionReady } = useApp();
  const stateRef = useRef(state);
  stateRef.current = state;

  const token = state.authToken;
  const email = state.profile.email;
  const active = sessionReady && isRemoteAuthToken(token) && state.profile.emailVerified;

  const busy = useRef(false);
  const ready = useRef(false);
  const deviceId = useRef<string | null>(null);
  const base = useRef<string | null>(null);
  const lastFp = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseKey = `@mova/sync-base:${email}`;

  const saveBase = useCallback(
    (v: string | null) => {
      base.current = v;
      if (v) void AsyncStorage.setItem(baseKey, v).catch(() => undefined);
    },
    [baseKey],
  );

  const applySnapshot = useCallback(
    (snap: SyncSnapshot) => {
      const otherDeviceChanged = snap.deviceId !== deviceId.current && snap.savedAt !== base.current;
      const patch = mergeRemote(stateRef.current, snap.state, otherDeviceChanged);
      dispatch({ type: 'APPLY_REMOTE_SYNC', patch });
      saveBase(snap.savedAt);
      // Anti ping-pong : si le résultat de la fusion est identique au serveur, il n'y a rien à renvoyer.
      const merged = fingerprint(extractSyncFields({ ...stateRef.current, ...patch, profile: { ...stateRef.current.profile, ...patch.profile } } as typeof stateRef.current));
      lastFp.current = merged === fingerprint(snap.state) ? merged : null;
    },
    [dispatch, saveBase],
  );

  const push = useCallback(async () => {
    const tk = stateRef.current.authToken;
    if (!tk || !deviceId.current || busy.current) return;
    const fields = extractSyncFields(stateRef.current);
    const fp = fingerprint(fields);
    if (fp === lastFp.current) return;
    busy.current = true;
    try {
      const res = await apiSyncPut(tk, { state: fields, deviceId: deviceId.current, baseSavedAt: base.current });
      if (res.status === 409 && res.snapshot) {
        // Un autre appareil a écrit entre-temps : on fusionne, puis on renverra le résultat.
        applySnapshot(res.snapshot);
        lastFp.current = null;
        pushTimer.current = setTimeout(() => void push(), 1500);
      } else if (res.status === 200 && res.savedAt) {
        saveBase(res.savedAt);
        lastFp.current = fp;
      }
    } finally {
      busy.current = false;
    }
  }, [applySnapshot, saveBase]);

  const pull = useCallback(async () => {
    const tk = stateRef.current.authToken;
    if (!tk || busy.current) return;
    busy.current = true;
    try {
      const { status, snapshot } = await apiSyncGet(tk);
      if (status === 200 && snapshot && snapshot.deviceId !== deviceId.current && snapshot.savedAt !== base.current) {
        applySnapshot(snapshot);
      } else if (status === 200 && snapshot) {
        saveBase(snapshot.savedAt);
      }
      return status === 200 ? (snapshot ? 'has' : 'none') : 'error';
    } finally {
      busy.current = false;
    }
  }, [applySnapshot, saveBase]);

  // Démarrage : jeton renouvelé, puis récupération (ou premier envoi si le serveur n'a rien)
  useEffect(() => {
    if (!active || !token) return;
    let cancelled = false;
    void (async () => {
      deviceId.current = await getOrCreateRsid();
      base.current = (await AsyncStorage.getItem(baseKey).catch(() => null)) ?? null;
      const refreshed = await apiRefreshToken(token);
      if (cancelled) return;
      if (refreshed.token) dispatch({ type: 'REFRESH_TOKEN', authToken: refreshed.token });
      else if (refreshed.status === 401) {
        // Session expirée, révoquée ou compte introuvable côté serveur. Compte neuf : retour à l'accueil.
        // Compte avec des données locales : on NE les efface PAS (le serveur a pu perdre le compte) —
        // la synchronisation s'arrête simplement et l'app reste utilisable hors ligne.
        if (isFreshLocal(stateRef.current)) dispatch({ type: 'LOGOUT' });
        return;
      }
      const outcome = await pull();
      if (cancelled) return;
      ready.current = true;
      if (outcome === 'none') void push();
    })();
    return () => {
      cancelled = true;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, email]);

  // Modifications locales → envoi groupé
  useEffect(() => {
    if (!active || !ready.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => void push(), PUSH_DELAY_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [
    active,
    push,
    state.activities,
    state.plan,
    state.analyses,
    state.feedbacks,
    state.banister,
    state.lifetime,
    state.health,
    state.progress,
    state.profile,
  ]);

  // Retour au premier plan / rafraîchissement régulier
  useEffect(() => {
    if (!active) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active' && ready.current) void pull();
    });
    const timer = setInterval(() => {
      if (ready.current) void pull();
    }, PULL_EVERY_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [active, pull]);

  return null;
}
