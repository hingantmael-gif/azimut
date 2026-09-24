import { useCallback, useEffect, useRef, useState } from 'react';
import type { WatchBrandId } from '../types/domain';
import {
  autoExportTodayToWatch,
  canSendWorkoutToWatch,
  exportWorkoutToSelectedWatch,
  type WatchSendOutcome,
  watchExportHint,
  watchResendLabel,
  watchSendLabel,
} from '../utils/watchWorkoutExport';
import { useApp, todayWorkout } from '../store/AppContext';
import { connectGarminAccount } from '../services/garminAuth';
import { isRemoteAuthToken } from '../services/integrationsApi';
import { pushWorkoutToGarminQuiet } from '../utils/garminExport';
import { WatchBrandPickModal } from '../ui/watch/WatchBrandPickModal';
import { WatchSendSheet } from '../ui/watch/WatchSendSheet';

/**
 * Envoi séance vers la montre sélectionnée :
 * - si aucune montre → modal « Quelle montre ? » (web + natif)
 * - puis export fichier au bon format + sync compagnon / Garmin API
 */
export function useWatchWorkoutExport() {
  const { state, dispatch } = useApp();
  const [exporting, setExporting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [outcome, setOutcome] = useState<WatchSendOutcome | null>(null);
  const [autoSent, setAutoSent] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const autoTriedRef = useRef<string | null>(null);
  const pickResolverRef = useRef<((id: WatchBrandId | null) => void) | null>(null);

  const workout = todayWorkout(state.plan);
  const brandId = state.profile.watch?.brandId ?? null;
  const sendLabel = watchSendLabel(brandId);
  const resendLabel = watchResendLabel(brandId);
  const hint = watchExportHint(brandId);
  const canSend = canSendWorkoutToWatch(workout?.discipline);

  const closePicker = useCallback((value: WatchBrandId | null) => {
    setPickerVisible(false);
    const resolve = pickResolverRef.current;
    pickResolverRef.current = null;
    resolve?.(value);
  }, []);

  const requestWatchPick = useCallback((): Promise<WatchBrandId | null> => {
    return new Promise((resolve) => {
      pickResolverRef.current = resolve;
      setPickerVisible(true);
    });
  }, []);

  useEffect(() => {
    if (!workout || !canSendWorkoutToWatch(workout.discipline) || workout.exportedToGarmin) {
      return;
    }
    const key = `${workout.id}-${state.authToken ?? ''}-${brandId ?? ''}`;
    if (autoTriedRef.current === key) return;

    void (async () => {
      const ok = await autoExportTodayToWatch({
        state,
        dispatch,
        workoutId: workout.id,
      });
      if (ok) {
        autoTriedRef.current = key;
        setAutoSent(true);
      }
    })();
  }, [
    workout?.id,
    workout?.exportedToGarmin,
    workout?.discipline,
    brandId,
    state,
    dispatch,
  ]);

  const sendWorkout = async (
    workoutId: string,
    router?: { push: (href: any) => void },
  ) => {
    setExporting(true);
    try {
      const { takeUsageQuotaIfNeeded } = await import('../premium/guardQuota');
      const q = await takeUsageQuotaIfNeeded('watchExport', state.profile);
      if (q === 'paywall') {
        router?.push('/settings/subscription');
        return false;
      }
      const result = await exportWorkoutToSelectedWatch({
        state,
        dispatch,
        workoutId,
        router,
        requestWatchPick,
      });
      setOutcome(result.status === 'cancelled' ? null : result);
      return result.status === 'pushed' || result.status === 'file';
    } finally {
      setExporting(false);
    }
  };

  /** Lie Garmin Connect (pop-up / navigateur intégré) puis envoie tout de suite la séance : un seul geste. */
  const linkGarminAndSend = async (workoutId: string) => {
    const token = state.authToken;
    if (!isRemoteAuthToken(token) || linking) return;
    setLinking(true);
    try {
      const linked = await connectGarminAccount(token!);
      if (!linked.ok) {
        if (linked.error && !/annul/i.test(linked.error)) {
          setOutcome({ status: 'error', title: 'Connexion Garmin', message: linked.error });
        }
        return;
      }
      const garmin = { provider: 'garmin' as const, connected: true, lastSyncAt: new Date().toISOString() };
      const integrations = [...state.profile.integrations.filter((i) => i.provider !== 'garmin'), garmin];
      dispatch({ type: 'SET_INTEGRATIONS', integrations });
      const pushed = await pushWorkoutToGarminQuiet({
        state: { ...state, profile: { ...state.profile, integrations } },
        dispatch,
        workoutId,
      });
      setOutcome(
        pushed.ok
          ? { status: 'pushed', brandId: 'garmin', title: 'Sur ton calendrier Garmin', message: pushed.message }
          : {
              status: 'error',
              title: 'Garmin lié, envoi impossible',
              message: pushed.ok ? '' : pushed.error ?? 'Réessaie dans un instant.',
            },
      );
    } finally {
      setLinking(false);
    }
  };

  const WatchPicker = (
    <>
      <WatchBrandPickModal
        visible={pickerVisible}
        onSelect={(id) => {
          dispatch({ type: 'SET_WATCH', brandId: id });
          closePicker(id);
        }}
        onCancel={() => closePicker(null)}
      />
      <WatchSendSheet
        outcome={outcome}
        busy={exporting && !pickerVisible}
        linking={linking}
        onLinkGarmin={(workoutId) => void linkGarminAndSend(workoutId)}
        onClose={() => setOutcome(null)}
      />
    </>
  );

  return {
    exporting,
    autoSent,
    sendWorkout,
    todayWorkout: workout,
    brandId,
    sendLabel,
    resendLabel,
    hint,
    canSend,
    pickerVisible,
    WatchPicker,
    requestWatchPick,
  };
}

/** @deprecated — utiliser useWatchWorkoutExport */
export const useGarminWorkoutExport = useWatchWorkoutExport;
