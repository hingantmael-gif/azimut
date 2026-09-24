import type { AppState } from '../data/seed';
import type { WatchBrandId } from '../types/domain';
import { autoExportTodayGarminWorkout, pushWorkoutToGarminQuiet, type GarminPushResult } from './garminExport';
import { isGarminAuthConfigured } from '../services/garminAuth';
import { buildWatchExportFiles } from '../engines/watchFileFormats';
import { deliverWatchExportBundle } from './downloadWatchFile';
import {
  canSendWorkoutToWatch,
  watchBrandShortLabel,
  watchExportHint,
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
  /** @deprecated : plus de messages intermédiaires. */
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

/** Résultat d'un envoi : affiché dans UNE feuille (jamais une pile d'alertes). */
export type WatchSendOutcome =
  | { status: 'pushed'; brandId: WatchBrandId; title: string; message: string }
  | {
      status: 'file';
      brandId: WatchBrandId;
      title: string;
      filename: string;
      /** Étapes à suivre, dans l'ordre. */
      steps: string[];
      /** Le fichier a-t-il pu être remis (téléchargement / partage) ? */
      delivered: boolean;
      /** Garmin : proposer de lier le compte pour un envoi automatique. */
      canLinkGarmin: boolean;
      /** Pourquoi l'envoi automatique n'a pas eu lieu (une phrase, en clair). */
      note?: string;
      workoutId: string;
      retry: () => Promise<boolean>;
    }
  | { status: 'error'; title: string; message: string }
  | { status: 'cancelled' };

function fileSteps(brandId: WatchBrandId, filename: string, nextStep: string, delivered: boolean): string[] {
  const got = delivered ? `Le fichier « ${filename} » est prêt (dossier Téléchargements ou feuille de partage).` : `Touche « Télécharger à nouveau » pour obtenir « ${filename} ».`;
  if (brandId === 'garmin') {
    return [
      got,
      'Branche ta montre à un ordinateur avec son câble USB.',
      'Copie le fichier dans le dossier GARMIN › NewFiles de la montre.',
      'Débranche : la séance apparaît dans Entraînement › Séances.',
    ];
  }
  return [got, nextStep];
}

/** Explique en une phrase pourquoi Garmin Connect n'a pas reçu la séance, et si on peut proposer de lier le compte. */
export function garminFallbackAdvice(push: GarminPushResult | null): { canLink: boolean; note?: string } {
  if (!push || push.ok) return { canLink: false };
  const configured = isGarminAuthConfigured();
  switch (push.reason) {
    case 'not_linked':
      return configured
        ? { canLink: true, note: 'Lie ton compte Garmin Connect une seule fois : ensuite chaque séance arrive sur ta montre sans câble.' }
        : { canLink: false, note: 'L’envoi automatique Garmin n’est pas encore activé sur cette version de Mova : utilise le fichier ci-dessous.' };
    case 'no_account':
      return { canLink: false, note: 'Connecte-toi avec ton compte Mova pour lier Garmin Connect et envoyer sans câble.' };
    case 'api_error':
      return { canLink: false, note: `Garmin Connect n’a pas accepté l’envoi (${push.error ?? 'erreur inconnue'}). Réessaie plus tard ou utilise le fichier.` };
    default:
      return { canLink: false };
  }
}

async function buildOutcomeForFile(opts: {
  brandId: WatchBrandId;
  workoutId: string;
  state: AppState;
  dispatch: WatchExportDispatch;
  garminPush?: GarminPushResult | null;
}): Promise<WatchSendOutcome> {
  const { brandId, workoutId, state, dispatch, garminPush = null } = opts;
  const advice = brandId === 'garmin' ? garminFallbackAdvice(garminPush) : { canLink: false };
  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
    return { status: 'error', title: 'Envoi impossible', message: 'Cette séance ne peut pas être envoyée à la montre.' };
  }
  const { primary, extras } = buildWatchExportFiles(workout, brandId);
  const { delivered } = await deliverWatchExportBundle(primary, extras);
  dispatch({ type: 'MARK_GARMIN_EXPORTED', workoutId });
  return {
    status: 'file',
    brandId,
    title: `Vers ${watchBrandShortLabel(brandId)}`,
    filename: primary.filename,
    steps: fileSteps(brandId, primary.filename, primary.nextStep, delivered > 0),
    delivered: delivered > 0,
    canLinkGarmin: advice.canLink,
    note: advice.note,
    workoutId,
    retry: async () => (await deliverWatchExportBundle(primary, extras)).delivered > 0,
  };
}

/**
 * Envoi séance → montre, en UN parcours clair :
 * 1. pas de montre choisie → « Quelle montre ? » ;
 * 2. Garmin avec compte lié → envoi direct sur Garmin Connect (une confirmation) ;
 * 3. sinon → vrai fichier de séance (.fit pour Garmin) + étapes précises pour le mettre sur la montre.
 */
export async function exportWorkoutToSelectedWatch(opts: WatchWorkoutExportOptions): Promise<WatchSendOutcome> {
  const { state, dispatch, workoutId, router, brandIdOverride, requestWatchPick } = opts;

  const workout = state.plan.find((w) => w.id === workoutId);
  if (!workout || !canSendWorkoutToWatch(workout.discipline)) {
    return {
      status: 'error',
      title: 'Envoi impossible',
      message: 'Seules les séances de course, de vélo et de natation peuvent être envoyées à une montre.',
    };
  }

  let brandId = brandIdOverride ?? state.profile.watch?.brandId ?? null;
  if (!brandId) {
    const picked = requestWatchPick ? await requestWatchPick() : null;
    if (!picked) {
      if (!requestWatchPick) router?.push('/settings/watch');
      return { status: 'cancelled' };
    }
    brandId = picked;
    dispatch({ type: 'SET_WATCH', brandId });
  }

  let garminPush: GarminPushResult | null = null;
  if (brandId === 'garmin') {
    garminPush = await pushWorkoutToGarminQuiet({ state, dispatch, workoutId });
    if (garminPush.ok) {
      return { status: 'pushed', brandId, title: 'Sur ton calendrier Garmin', message: garminPush.message };
    }
    // Sinon : le fichier prend le relais, avec une phrase qui explique pourquoi (garminFallbackAdvice).
  }

  return buildOutcomeForFile({ brandId, workoutId, state, dispatch, garminPush });
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
