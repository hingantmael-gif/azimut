import { useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { canSendWorkoutToWatch } from '../../engines/watchExport';
import { todayIsoDate } from '../../engines/core';
import { isRemoteAuthToken } from '../../services/integrationsApi';
import { pushWorkoutToGarminQuiet } from '../../utils/garminExport';

const WINDOW_DAYS = 7;

/**
 * Envoi automatique vers Garmin Connect, sans écran ouvert : dès que le compte Garmin est lié,
 * les séances des 7 prochains jours pas encore envoyées partent sur le calendrier Garmin (en silence).
 * Chaque séance n'est tentée qu'une fois par session de l'app ; une erreur Garmin arrête la série.
 */
export function GarminAutoSync() {
  const { state, dispatch } = useApp();
  const tried = useRef(new Set<string>());
  const running = useRef(false);

  const linked = state.profile.integrations.some((i) => i.provider === 'garmin' && i.connected);
  const brand = state.profile.watch?.brandId;
  const watchAllowsGarmin = !brand || brand === 'garmin';

  useEffect(() => {
    if (!linked || !watchAllowsGarmin || !isRemoteAuthToken(state.authToken) || running.current) return;

    const today = todayIsoDate(new Date());
    const end = new Date();
    end.setDate(end.getDate() + WINDOW_DAYS);
    const last = todayIsoDate(end);

    const pending = state.plan
      .filter(
        (w) =>
          !w.adHoc &&
          canSendWorkoutToWatch(w.discipline) &&
          !w.exportedToGarmin &&
          w.date >= today &&
          w.date <= last &&
          !tried.current.has(w.id),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    if (pending.length === 0) return;

    running.current = true;
    void (async () => {
      try {
        for (const w of pending) {
          tried.current.add(w.id);
          const res = await pushWorkoutToGarminQuiet({ state, dispatch, workoutId: w.id });
          if (!res.ok && res.reason === 'api_error') break;
        }
      } finally {
        running.current = false;
      }
    })();
  }, [linked, watchAllowsGarmin, state, dispatch]);

  return null;
}
