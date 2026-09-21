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
      <WatchSendSheet outcome={outcome} busy={exporting && !pickerVisible} onClose={() => setOutcome(null)} />
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
