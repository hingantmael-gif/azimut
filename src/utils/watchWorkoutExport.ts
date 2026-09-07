import { Alert, Platform } from 'react-native';
import type { AppState } from '../data/seed';
import type { WatchBrandId } from '../types/domain';
import {
  autoExportTodayGarminWorkout,
  exportWorkoutToGarmin,
} from './garminExport';
import { openWatchCompanion } from '../services/sleepImport';
import { buildWatchExportFiles } from '../engines/watchFileFormats';
import { deliverWatchExportBundle } from './downloadWatchFile';
import {
  canSendWorkoutToWatch,
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
  /** Marque déjà choisie (évite Alert — préférer la modal UI). */
  brandIdOverride?: WatchBrandId;
  /**
   * Si aucune montre n’est sélectionnée : ouvre le picker UI (modal).
   * Remplace Alert.alert (cassé / vide sur le web).
   */
  requestWatchPick?: () => Promise<WatchBrandId | null>;
};

export {
  watchSendLabel,
  watchResendLabel,
  watchExportHint,
  watchBrandShortLabel,
  canSendWorkoutToWatch,
};

function showResult(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

async function exportFilesAndCompanion(opts: {
  brandId: WatchBrandId;
  workoutId: string;
  state: AppState;
  dispatch: WatchExportDispatch;
  silentSuccess?: boolean;
}): Promise<boolean> {
  const { brandId, workoutId, state, dispatch, silentSuccess } = opts;
  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) return false;

  const { primary, extras } = buildWatchExportFiles(workout, brandId);
  const { delivered } = await deliverWatchExportBundle(primary, extras);

  const opened = await openWatchCompanion(brandId);
  if (!opened.ok && opened.error && !silentSuccess) {
    showResult('App compagnon', opened.error);
  }

  dispatch({ type: 'MARK_GARMIN_EXPORTED', workoutId });

  if (!silentSuccess) {
    const fileLine =
      delivered > 0
        ? `Fichier ${primary.formatLabel} prêt (${primary.filename}).`
        : 'Prépare le fichier dans le partage système.';
    showResult(
      `Vers ${watchBrandShortLabel(brandId)}`,
      `${fileLine}\n\n${primary.nextStep}\n\n${watchExportSuccessMessage(brandId)}`,
    );
  }
  return true;
}

/**
 * Envoi séance → montre :
 * 1. Pas de montre → demande (modal) « Quelle montre ? »
 * 2. Exporte le bon format (Garmin JSON/TCX, Apple WorkoutKit, Samsung/Fitbit/Huawei TCX+JSON)
 * 3. Garmin lié → push API en plus
 */
export async function exportWorkoutToSelectedWatch(
  opts: WatchWorkoutExportOptions,
): Promise<boolean> {
  const {
    state,
    dispatch,
    workoutId,
    router,
    silentSuccess = false,
    brandIdOverride,
    requestWatchPick,
  } = opts;

  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
    showResult(
      'Envoi impossible',
      'Cette séance ne peut pas être envoyée à la montre (repos, brick…). Course, vélo, natation et musculation sont pris en charge.',
    );
    return false;
  }

  let brandId = brandIdOverride ?? state.profile.watch?.brandId ?? null;

  if (!brandId) {
    const picked = requestWatchPick ? await requestWatchPick() : null;
    if (!picked) {
      if (!requestWatchPick) {
        router?.push('/settings/watch');
        showResult(
          'Montre requise',
          'Choisis d’abord ta montre (Paramètres → Montre), puis renvoie la séance.',
        );
      }
      return false;
    }
    brandId = picked;
    dispatch({ type: 'SET_WATCH', brandId });
  }

  // Toujours produire le fichier au bon format (discipline + marque)
  const filesOk = await exportFilesAndCompanion({
    brandId,
    workoutId,
    state,
    dispatch,
    silentSuccess: brandId === 'garmin' ? true : silentSuccess,
  });

  if (brandId === 'garmin') {
    const apiOk = await exportWorkoutToGarmin({
      state,
      dispatch,
      workoutId,
      router,
      silentSuccess,
      offerInlineConnect: true,
    });
    if (!apiOk && filesOk && !silentSuccess) {
      showResult(
        'Fichier Garmin prêt',
        'Le push Garmin Connect n’a pas abouti (compte / liaison). Le fichier JSON/TCX a quand même été préparé — tu peux l’importer dans Garmin Connect.',
      );
    }
    return apiOk || filesOk;
  }

  return filesOk;
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
