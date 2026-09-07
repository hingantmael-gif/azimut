import { Alert, Platform, Share } from 'react-native';
import type { AppState } from '../data/seed';
import type { WatchBrandId } from '../types/domain';
import {
  autoExportTodayGarminWorkout,
  exportWorkoutToGarmin,
} from './garminExport';
import { openWatchCompanion } from '../services/sleepImport';
import {
  buildWatchWorkoutBrief,
  canSendWorkoutToWatch,
  shareWorkoutForWatch,
  watchBrandShortLabel,
  watchExportHint,
  watchExportSuccessMessage,
  watchResendLabel,
  watchSendLabel,
} from '../engines/watchExport';

type WatchExportDispatch = (
  action:
    | { type: 'MARK_GARMIN_EXPORTED'; workoutId: string }
    | { type: 'SET_WATCH'; brandId: WatchBrandId | null }
    | { type: 'SET_INTEGRATIONS'; integrations: AppState['profile']['integrations'] },
) => void;

type WatchRouter = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  push: (href: any) => void;
};

export type WatchWorkoutExportOptions = {
  state: AppState;
  dispatch: WatchExportDispatch;
  workoutId: string;
  router?: WatchRouter;
  silentSuccess?: boolean;
};

export {
  watchSendLabel,
  watchResendLabel,
  watchExportHint,
  watchBrandShortLabel,
  canSendWorkoutToWatch,
};

/**
 * Android = max ~3 boutons d’alerte → choix en 2 étapes.
 * iOS / web = toutes les marques d’un coup.
 */
function pickWatchBrandInteractive(): Promise<WatchBrandId | null> {
  if (Platform.OS === 'android') {
    return new Promise((resolve) => {
      Alert.alert(
        'Quelle montre ?',
        'Un choix unique — Azimut s’en souvient pour les envois et le sommeil.',
        [
          { text: 'Garmin', onPress: () => resolve('garmin') },
          { text: 'Apple Watch', onPress: () => resolve('apple') },
          {
            text: 'Autres…',
            onPress: () => {
              Alert.alert('Autres montres', undefined, [
                { text: 'Galaxy Watch', onPress: () => resolve('samsung') },
                { text: 'Fitbit / Pixel', onPress: () => resolve('google_fitbit') },
                { text: 'Huawei', onPress: () => resolve('huawei') },
                {
                  text: 'Annuler',
                  style: 'cancel',
                  onPress: () => resolve(null),
                },
              ]);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Quelle montre ?',
      'Un choix unique — Azimut s’en souvient pour les envois et le sommeil.',
      [
        { text: 'Garmin', onPress: () => resolve('garmin') },
        { text: 'Apple Watch', onPress: () => resolve('apple') },
        { text: 'Galaxy Watch', onPress: () => resolve('samsung') },
        { text: 'Fitbit / Pixel', onPress: () => resolve('google_fitbit') },
        { text: 'Huawei', onPress: () => resolve('huawei') },
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

async function exportViaCompanionShare(opts: {
  brandId: WatchBrandId;
  workoutId: string;
  state: AppState;
  dispatch: WatchExportDispatch;
  silentSuccess?: boolean;
}): Promise<boolean> {
  const { brandId, workoutId, state, dispatch, silentSuccess } = opts;
  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || workout.discipline === 'rest') return false;

  const opened = await openWatchCompanion(brandId);
  if (!opened.ok && opened.error) {
    Alert.alert('App compagnon', opened.error);
  }

  if (Platform.OS === 'web') {
    try {
      await Share.share({
        message: buildWatchWorkoutBrief(workout),
        title: workout.title,
      });
    } catch {
      /* ignore */
    }
  } else {
    await shareWorkoutForWatch(workout);
  }

  dispatch({ type: 'MARK_GARMIN_EXPORTED', workoutId });

  if (!silentSuccess) {
    Alert.alert('Vers ta montre', watchExportSuccessMessage(brandId));
  }
  return true;
}

/**
 * Stratégie d’envoi selon la montre sélectionnée (sommeil / paramètres).
 *
 * Clics max typiques :
 * 1. Pas de montre → choix marque → envoi (2)
 * 2. Garmin déjà lié → push API (1)
 * 3. Garmin pas lié → OAuth « Lier » → envoi (2–3)
 * 4. Autres marques → ouvre compagnon + partage (1–2)
 */
export async function exportWorkoutToSelectedWatch(
  opts: WatchWorkoutExportOptions,
): Promise<boolean> {
  const { state, dispatch, workoutId, router, silentSuccess = false } = opts;

  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
    Alert.alert(
      'Envoi impossible',
      'Cette séance ne peut pas être envoyée à la montre (repos, brick multi-sport…). Course, vélo, natation et musculation sont pris en charge.',
    );
    return false;
  }

  let brandId = state.profile.watch?.brandId ?? null;

  if (!brandId) {
    const picked = await pickWatchBrandInteractive();
    if (!picked) {
      router?.push('/settings/watch');
      return false;
    }
    brandId = picked;
    dispatch({ type: 'SET_WATCH', brandId });
  }

  if (brandId === 'garmin') {
    return exportWorkoutToGarmin({
      state,
      dispatch,
      workoutId,
      router,
      silentSuccess,
      offerInlineConnect: true,
    });
  }

  return exportViaCompanionShare({
    brandId,
    workoutId,
    state,
    dispatch,
    silentSuccess,
  });
}

/** Auto-envoi séance du jour — Garmin déjà lié uniquement (zéro clic). */
export async function autoExportTodayToWatch(opts: {
  state: AppState;
  dispatch: WatchExportDispatch;
  workoutId: string;
}): Promise<boolean> {
  const brandId = opts.state.profile.watch?.brandId;
  if (brandId && brandId !== 'garmin') return false;

  return autoExportTodayGarminWorkout({
    state: opts.state,
    dispatch: opts.dispatch,
    workoutId: opts.workoutId,
  });
}
