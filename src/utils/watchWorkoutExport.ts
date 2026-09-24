import type { AppState } from '../data/seed';
import type { WatchBrandId } from '../types/domain';
import { autoExportTodayGarminWorkout, pushWorkoutToGarminQuiet, type GarminPushResult } from './garminExport';
import { isGarminAuthConfigured } from '../services/garminAuth';
import { buildWatchExportFiles } from '../engines/watchFileFormats';
import { deliverWatchExportBundle } from './downloadWatchFile';
import { detectDeviceKind, type DeviceKind } from './deviceKind';
import { isAppleWatchSchedulingAvailable, scheduleOnAppleWatch } from '../services/appleWatch';
import { buildWatchWorkoutBrief } from '../engines/watchExport';
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
      /** Appareil détecté : les étapes proposées existent vraiment dessus (pas de câble USB sur un téléphone). */
      device: DeviceKind;
      /** Résumé prêt à copier : étapes et allures, avec les répétitions regroupées. */
      briefText: string;
      /** Télécharge / partage le fichier — seulement quand l'utilisateur le demande, jamais automatiquement. */
      download: () => Promise<boolean>;
      /** Note la séance comme préparée pour la montre (copie ou téléchargement faits). */
      markPrepared: () => void;
      /** Apple Watch : ajout direct (WorkoutKit) possible seulement dans l'app iPhone Mova. */
      apple?: { available: boolean; add: () => Promise<{ ok: boolean; error?: string }> };
      /** Garmin : proposer de lier le compte pour un envoi automatique. */
      canLinkGarmin: boolean;
      /** Pourquoi l'envoi automatique n'a pas eu lieu (une phrase, en clair). */
      note?: string;
      workoutId: string;
    }
  | { status: 'error'; title: string; message: string }
  | { status: 'cancelled' };

function fileSteps(
  brandId: WatchBrandId,
  filename: string,
  nextStep: string,
  device: DeviceKind,
  appleNative = false,
): string[] {
  if (brandId === 'apple') {
    if (appleNative) {
      return [
        'Touche « Ajouter à l’Apple Watch » : la séance arrive dans l’app Exercice de ta montre, à la date prévue.',
        'Sur la montre : Exercice › ta séance (la synchronisation se fait toute seule par Bluetooth).',
      ];
    }
    return [
      'Touche « Copier la séance » : le résumé (étapes, « Répéter N × », allures) est prêt.',
      'Sur l’Apple Watch : app Exercice › Ajouter une séance (+) › Personnalisé, puis ajoute les étapes du résumé (les intitulés peuvent varier selon la version).',
      'L’ajout automatique existe dans l’app Mova pour iPhone (pas dans la version web) : voir le mode d’emploi.',
    ];
  }
  const getFile = `Touche « Télécharger le fichier » (${filename}) quand tu en as besoin.`;
  if (brandId === 'garmin') {
    if (device !== 'desktop') {
      // Garmin Connect n'importe pas de fichier de séance depuis le téléphone : on recrée la séance en 1 minute.
      return [
        'Touche « Copier la séance » : le résumé (étapes, répétitions, allures) est prêt.',
        'Ouvre Garmin Connect › Plus › Entraînement et plans › Séances › Créer une séance (les intitulés peuvent varier selon la version).',
        'Ajoute les étapes : le résumé indique déjà les blocs « Répéter N × ».',
        'Enregistre puis « Envoyer à l’appareil » : ta montre la reçoit à la synchronisation Bluetooth.',
      ];
    }
    return [
      getFile,
      'Branche ta montre à l’ordinateur avec son câble USB.',
      'Copie le fichier dans le dossier GARMIN › NewFiles de la montre.',
      'Débranche : la séance apparaît dans Entraînement › Séances.',
    ];
  }
  return [getFile, nextStep];
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
  const device = detectDeviceKind();
  const appleNative = brandId === 'apple' && isAppleWatchSchedulingAvailable();
  const markPrepared = () => dispatch({ type: 'MARK_GARMIN_EXPORTED', workoutId });
  return {
    status: 'file',
    brandId,
    title: `Vers ${watchBrandShortLabel(brandId)}`,
    filename: primary.filename,
    steps: fileSteps(brandId, primary.filename, primary.nextStep, device, appleNative),
    apple:
      brandId === 'apple'
        ? {
            available: appleNative,
            add: async () => {
              const res = await scheduleOnAppleWatch(workout);
              if (res.ok) {
                markPrepared();
                return { ok: true };
              }
              return { ok: false, error: res.reason === 'unsupported' ? 'Indisponible dans cette version.' : res.error };
            },
          }
        : undefined,
    device,
    briefText: buildWatchWorkoutBrief(workout),
    download: async () => {
      const ok = (await deliverWatchExportBundle(primary, extras)).delivered > 0;
      if (ok) markPrepared();
      return ok;
    },
    markPrepared,
    canLinkGarmin: advice.canLink,
    note: advice.note,
    workoutId,
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
