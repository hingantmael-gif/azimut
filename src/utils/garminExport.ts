import { Alert, Platform } from 'react-native';
import { buildGarminWorkoutExport, GARMIN_SUCCESS_MESSAGE } from '../engines/garminWorkout';
import { canSendWorkoutToWatch } from '../engines/watchExport';
import { connectGarminAccount, isGarminAuthConfigured } from '../services/garminAuth';
import { openGarminConnect } from '../services/integrationLinks';
import { apiExportGarminWorkout, isRemoteAuthToken } from '../services/integrationsApi';
import type { AppState } from '../data/seed';

type GarminExportDispatch = (
  action:
    | { type: 'MARK_GARMIN_EXPORTED'; workoutId: string }
    | { type: 'SET_INTEGRATIONS'; integrations: AppState['profile']['integrations'] },
) => void;

type GarminRouter = { push: (href: any) => void };

export type GarminExportOptions = {
  state: AppState;
  dispatch: GarminExportDispatch;
  workoutId: string;
  router?: GarminRouter;
  /** Ne pas afficher d’alerte succès (envoi auto silencieux) */
  silentSuccess?: boolean;
  /** Proposer la connexion Garmin inline avant abandon */
  offerInlineConnect?: boolean;
};

export async function exportWorkoutToGarmin(opts: GarminExportOptions): Promise<boolean> {
  const {
    state,
    dispatch,
    workoutId,
    router,
    silentSuccess = false,
    offerInlineConnect = true,
  } = opts;
  const token = state.authToken;

  if (!isRemoteAuthToken(token)) {
    Alert.alert(
      'Compte requis',
      'Connecte-toi avec un compte Azimut pour envoyer tes séances vers Garmin Connect.',
    );
    return false;
  }

  let garmin = state.profile.integrations.find((i) => i.provider === 'garmin');
  if (!garmin?.connected) {
    if (!offerInlineConnect) return false;

    const connectNow = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Lier Garmin Connect',
        'Une seule fois : autorise Azimut à publier tes séances sur ton compte Garmin Connect. Ta montre (déjà appairée dans Garmin Connect) recevra la séance au prochain sync.',
        [
          { text: 'Plus tard', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Lier maintenant', onPress: () => resolve(true) },
        ],
      );
    });

    if (!connectNow) {
      router?.push('/settings/devices');
      return false;
    }

    if (!isGarminAuthConfigured()) {
      const opened = await openGarminConnect();
      if (!opened.ok && opened.error) {
        Alert.alert('Garmin Connect', opened.error);
      } else {
        Alert.alert(
          'Garmin Connect',
          'Ouvre l’app Garmin Connect pour appairer ta montre en Bluetooth. La sync automatique des séances vers ta montre sera disponible une fois la liaison OAuth activée.',
        );
      }
      return false;
    }

    const linked = await connectGarminAccount(token!);
    if (!linked.ok) {
      if (linked.error) Alert.alert('Connexion Garmin', linked.error);
      return false;
    }
    garmin = { provider: 'garmin', connected: true, lastSyncAt: new Date().toISOString() };
    dispatch({
      type: 'SET_INTEGRATIONS',
      integrations: [
        ...state.profile.integrations.filter((i) => i.provider !== 'garmin'),
        garmin,
      ],
    });
  }

  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) return false;

  let payload;
  try {
    payload = buildGarminWorkoutExport(workout);
  } catch (e) {
    Alert.alert(
      'Envoi impossible',
      e instanceof Error ? e.message : 'Cette discipline ne peut pas être envoyée à Garmin.',
    );
    return false;
  }
  const res = await apiExportGarminWorkout(token!, payload);
  if (res.error) {
    Alert.alert('Échec envoi Garmin', res.error);
    return false;
  }

  dispatch({ type: 'MARK_GARMIN_EXPORTED', workoutId });

  if (!silentSuccess) {
    Alert.alert('Sur ton calendrier Garmin', res.message || GARMIN_SUCCESS_MESSAGE);
  }

  return true;
}

/** Envoie la séance du jour si Garmin lié et pas encore exportée. */
export async function autoExportTodayGarminWorkout(opts: {
  state: AppState;
  dispatch: GarminExportDispatch;
  workoutId: string;
}): Promise<boolean> {
  const { state, dispatch, workoutId } = opts;
  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || workout.discipline === 'rest' || workout.exportedToGarmin) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (workout.date !== today) return false;

  const garmin = state.profile.integrations.find((i) => i.provider === 'garmin' && i.connected);
  if (!garmin || !isRemoteAuthToken(state.authToken)) {
    return false;
  }

  return exportWorkoutToGarmin({
    state,
    dispatch,
    workoutId,
    silentSuccess: true,
    offerInlineConnect: false,
  });
}

export function garminConnectAppHint(): string {
  return Platform.OS === 'ios'
    ? 'Ouvre Garmin Connect sur ton iPhone → sync ta montre.'
    : 'Ouvre Garmin Connect sur ton téléphone → sync ta montre.';
}
