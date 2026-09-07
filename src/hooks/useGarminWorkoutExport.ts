import { useEffect, useRef, useState } from 'react';
import {
  autoExportTodayToWatch,
  canSendWorkoutToWatch,
  exportWorkoutToSelectedWatch,
  watchExportHint,
  watchResendLabel,
  watchSendLabel,
} from '../utils/watchWorkoutExport';
import { useApp, todayWorkout } from '../store/AppContext';

/**
 * Envoi séance vers la montre sélectionnée (libellés dynamiques)
 * + auto-envoi Garmin si compte déjà lié.
 */
export function useWatchWorkoutExport() {
  const { state, dispatch } = useApp();
  const [exporting, setExporting] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const autoTriedRef = useRef<string | null>(null);

  const workout = todayWorkout(state.plan);
  const brandId = state.profile.watch?.brandId ?? null;
  const sendLabel = watchSendLabel(brandId);
  const resendLabel = watchResendLabel(brandId);
  const hint = watchExportHint(brandId);
  const canSend = canSendWorkoutToWatch(workout?.discipline);

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
      return await exportWorkoutToSelectedWatch({
        state,
        dispatch,
        workoutId,
        router,
      });
    } finally {
      setExporting(false);
    }
  };

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
  };
}

/** @deprecated — utiliser useWatchWorkoutExport */
export const useGarminWorkoutExport = useWatchWorkoutExport;
