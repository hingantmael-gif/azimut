import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { haversineM } from '../engines/liveWorkout';
import {
  PACE_BAD_ACCURACY_M,
  computeAdaptiveWindowPace,
  shouldCountGpsSegment,
  weightedRecentPace,
} from '../engines/gpsPace';

export type GpsPoint = {
  lat: number;
  lng: number;
  alt?: number;
  accuracy?: number;
  timestamp: number;
};

export type LiveTrackState = {
  permission: 'unknown' | 'granted' | 'denied';
  /** GPS allumé (preview ou enregistrement) */
  tracking: boolean;
  /** Enregistrement de la séance en cours */
  recording: boolean;
  paused: boolean;
  points: GpsPoint[];
  /** Dernière position connue (preview) */
  lastPoint: GpsPoint | null;
  distanceM: number;
  currentPaceSecPerKm: number | null;
  avgPaceSecPerKm: number | null;
  recentPaces: number[];
  error: string | null;
  lastAccuracy: number | null;
  /** Secondes sans mouvement significatif (enregistrement actif). */
  stillSec: number;
};

export type UseLiveGpsTrackOptions = {
  /** Seuil d’immobilité avant suggestion de pause auto (défaut 50 s). */
  autoPauseAfterSec?: number;
  /** Appelé une fois quand l’arrêt est détecté (enregistrement, hors pause). */
  onAutoPauseSuggested?: () => void;
};

const MAX_ACCURACY_M = 50;
/** Au-delà : fix Wi‑Fi/IP trop grossier pour la carte (souvent mauvaise ville) */
const WARN_ACCURACY_M = 150;
const DEFAULT_AUTO_PAUSE_SEC = 50;

function toGpsPoint(raw: Location.LocationObject): GpsPoint {
  return {
    lat: raw.coords.latitude,
    lng: raw.coords.longitude,
    alt: raw.coords.altitude ?? undefined,
    accuracy: raw.coords.accuracy ?? undefined,
    timestamp: raw.timestamp ?? Date.now(),
  };
}

/**
 * Sur le web, expo-location peut renvoyer un fix en cache (maximumAge: Infinity).
 * On force un fix frais + haute précision via l’API navigateur.
 */
function webGetFreshPosition(): Promise<Location.LocationObject | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    );
  });
}

function webWatchPosition(
  onPos: (loc: Location.LocationObject) => void,
): { remove: () => void } {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { remove: () => undefined };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onPos({
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        },
        timestamp: pos.timestamp,
      });
    },
    () => undefined,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    },
  );
  return {
    remove: () => {
      navigator.geolocation.clearWatch(id);
    },
  };
}

export function useLiveGpsTrack(options?: UseLiveGpsTrackOptions) {
  const autoPauseAfterSec = options?.autoPauseAfterSec ?? DEFAULT_AUTO_PAUSE_SEC;
  const onAutoPauseSuggestedRef = useRef(options?.onAutoPauseSuggested);
  onAutoPauseSuggestedRef.current = options?.onAutoPauseSuggested;

  const [state, setState] = useState<LiveTrackState>({
    permission: 'unknown',
    tracking: false,
    recording: false,
    paused: false,
    points: [],
    lastPoint: null,
    distanceM: 0,
    currentPaceSecPerKm: null,
    avgPaceSecPerKm: null,
    recentPaces: [],
    error: null,
    lastAccuracy: null,
    stillSec: 0,
  });

  const subRef = useRef<{ remove: () => void } | null>(null);
  const pausedRef = useRef(false);
  const recordingRef = useRef(false);
  const pointsRef = useRef<GpsPoint[]>([]);
  const distanceRef = useRef(0);
  const movingStartRef = useRef<number | null>(null);
  const movingAccumRef = useRef(0);
  const lastMoveAtRef = useRef<number | null>(null);
  const lastDistanceRef = useRef(0);
  const recentPacesRef = useRef<number[]>([]);
  const lastPaceSampleAtRef = useRef(0);
  const autoPauseFiredRef = useRef(false);
  const stillSecRef = useRef(0);

  const stopWatch = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      setState((s) => ({
        ...s,
        permission: granted ? 'granted' : 'denied',
        error: granted
          ? null
          : 'Autorise la localisation pour suivre ta séance (GPS).',
      }));
      return granted;
    } catch {
      setState((s) => ({
        ...s,
        permission: 'denied',
        error: 'Impossible d’accéder au GPS sur cet appareil.',
      }));
      return false;
    }
  }, []);

  const ingestPoint = useCallback((raw: Location.LocationObject) => {
    const acc = raw.coords.accuracy ?? 999;
    const speed = raw.coords.speed;
    const next = toGpsPoint(raw);

    // Toujours afficher la position live (même imprécise), avec message si grossière
    setState((s) => ({
      ...s,
      lastAccuracy: acc,
      lastPoint: next,
      error:
        acc > WARN_ACCURACY_M
          ? `GPS imprécis (±${Math.round(acc)} m) — attends un meilleur signal (extérieur / GPS réel).`
          : null,
    }));

    if (!recordingRef.current || pausedRef.current) return;
    // Trace : tolère jusqu’à 50 m ; allure filtrée plus bas
    if (acc > MAX_ACCURACY_M) return;

    const prev = pointsRef.current[pointsRef.current.length - 1];
    let add = 0;
    let moved = false;
    if (prev) {
      add = haversineM(
        { lat: prev.lat, lng: prev.lng },
        { lat: next.lat, lng: next.lng },
      );
      // Quasi-arrêt, jitter ou saut GPS : pas de point trace, lastMoveAt inchangé
      // (alimente stillSec). Seuil élargi quand le signal est flou.
      if (
        !shouldCountGpsSegment({
          distanceM: add,
          dtSec: (next.timestamp - prev.timestamp) / 1000,
          accuracyPrevM: prev.accuracy,
          accuracyNextM: acc,
          nativeSpeedMps: speed,
        })
      ) {
        return;
      }
      distanceRef.current += add;
      lastMoveAtRef.current = next.timestamp;
      lastDistanceRef.current = distanceRef.current;
      moved = true;
      autoPauseFiredRef.current = false;
    } else {
      movingStartRef.current = next.timestamp;
      lastMoveAtRef.current = next.timestamp;
      lastDistanceRef.current = distanceRef.current;
      moved = true;
    }

    pointsRef.current = [...pointsRef.current, next];

    // Skip agressif accuracy > 25 m pour l’échantillon d’allure
    let currentPace: number | null = null;
    if (acc <= PACE_BAD_ACCURACY_M) {
      currentPace = computeAdaptiveWindowPace(pointsRef.current);
      if (
        currentPace != null &&
        next.timestamp - lastPaceSampleAtRef.current >= 8000
      ) {
        lastPaceSampleAtRef.current = next.timestamp;
        recentPacesRef.current = [
          ...recentPacesRef.current,
          currentPace,
        ].slice(-12);
      }
    }

    // Si on a un historique, pondérer le plus récent (surtout signal bon)
    if (recentPacesRef.current.length >= 2) {
      const smoothed = weightedRecentPace(recentPacesRef.current);
      if (smoothed != null) {
        const blend =
          acc < 12 ? 0.72 : acc < 25 ? 0.55 : 0.35;
        currentPace =
          currentPace != null
            ? currentPace * (1 - blend) + smoothed * blend
            : smoothed;
      }
    }

    const movingSec = (() => {
      if (!movingStartRef.current) return movingAccumRef.current;
      return (
        movingAccumRef.current +
        Math.max(0, (next.timestamp - movingStartRef.current) / 1000)
      );
    })();

    const avgPace =
      distanceRef.current > 30 && movingSec > 10
        ? movingSec / (distanceRef.current / 1000)
        : null;

    if (moved) {
      stillSecRef.current = 0;
    }

    setState((s) => ({
      ...s,
      points: pointsRef.current,
      distanceM: distanceRef.current,
      currentPaceSecPerKm: currentPace,
      avgPaceSecPerKm: avgPace,
      recentPaces: recentPacesRef.current,
      lastAccuracy: acc,
      lastPoint: next,
      stillSec: stillSecRef.current,
      error: null,
    }));
  }, []);

  /** Allume le GPS (carte) sans démarrer le chrono. */
  const prepare = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) return false;
    try {
      if (Platform.OS !== 'web') {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setState((s) => ({
            ...s,
            error: 'Active le GPS / la localisation dans les réglages.',
          }));
          return false;
        }
      }
      if (subRef.current) return true;

      // Fix frais (pas de cache navigateur)
      if (Platform.OS === 'web') {
        const fix = await webGetFreshPosition();
        if (fix) ingestPoint(fix);
        const sub = webWatchPosition(ingestPoint);
        subRef.current = sub;
      } else {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        }).catch(() => null);
        if (fix) ingestPoint(fix);

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2,
            mayShowUserSettingsDialog: true,
          },
          ingestPoint,
        );
        subRef.current = sub;
      }

      setState((s) => ({
        ...s,
        permission: 'granted',
        tracking: true,
        recording: false,
      }));
      return true;
    } catch {
      setState((s) => ({
        ...s,
        error: 'Échec GPS. Réessaie ou vérifie les permissions.',
      }));
      return false;
    }
  }, [ingestPoint, requestPermission]);

  /** Démarre l’enregistrement (trace + distance). */
  const startRecording = useCallback(async () => {
    const ok = await prepare();
    if (!ok) return false;
    pausedRef.current = false;
    recordingRef.current = true;
    pointsRef.current = [];
    distanceRef.current = 0;
    movingStartRef.current = Date.now();
    movingAccumRef.current = 0;
    lastMoveAtRef.current = Date.now();
    lastDistanceRef.current = 0;
    recentPacesRef.current = [];
    lastPaceSampleAtRef.current = 0;
    autoPauseFiredRef.current = false;
    stillSecRef.current = 0;

    // Re-fetch un fix frais au démarrage (évite une vieille position)
    if (Platform.OS === 'web') {
      const fresh = await webGetFreshPosition();
      if (fresh) ingestPoint(fresh);
    } else {
      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      }).catch(() => null);
      if (fresh) ingestPoint(fresh);
    }

    setState((s) => {
      const startPts =
        s.lastPoint != null
          ? [{ ...s.lastPoint, timestamp: Date.now() }]
          : [];
      pointsRef.current = startPts;
      return {
        ...s,
        recording: true,
        paused: false,
        points: startPts,
        distanceM: 0,
        currentPaceSecPerKm: null,
        avgPaceSecPerKm: null,
        recentPaces: [],
        stillSec: 0,
      };
    });
    return true;
  }, [prepare, ingestPoint]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (movingStartRef.current) {
      movingAccumRef.current += Math.max(
        0,
        (Date.now() - movingStartRef.current) / 1000,
      );
      movingStartRef.current = null;
    }
    stillSecRef.current = 0;
    setState((s) => ({ ...s, paused: true, stillSec: 0 }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    movingStartRef.current = Date.now();
    lastMoveAtRef.current = Date.now();
    autoPauseFiredRef.current = false;
    stillSecRef.current = 0;
    setState((s) => ({ ...s, paused: false, stillSec: 0 }));
  }, []);

  const stop = useCallback(() => {
    recordingRef.current = false;
    pausedRef.current = true;
    if (movingStartRef.current) {
      movingAccumRef.current += Math.max(
        0,
        (Date.now() - movingStartRef.current) / 1000,
      );
      movingStartRef.current = null;
    }
    stillSecRef.current = 0;
    stopWatch();
    setState((s) => ({
      ...s,
      tracking: false,
      recording: false,
      paused: true,
      stillSec: 0,
    }));
  }, [stopWatch]);

  const getMovingSec = useCallback(() => {
    let total = movingAccumRef.current;
    if (recordingRef.current && !pausedRef.current && movingStartRef.current) {
      total += Math.max(0, (Date.now() - movingStartRef.current) / 1000);
    }
    return total;
  }, []);

  /** Restaure une séance sauvegardée (en pause). */
  const hydrate = useCallback(
    (opts: { points: GpsPoint[]; distanceM: number; movingSec: number }) => {
      recordingRef.current = true;
      pausedRef.current = true;
      pointsRef.current = opts.points;
      distanceRef.current = opts.distanceM;
      movingAccumRef.current = opts.movingSec;
      movingStartRef.current = null;
      lastMoveAtRef.current = opts.points[opts.points.length - 1]?.timestamp ?? null;
      lastDistanceRef.current = opts.distanceM;
      recentPacesRef.current = [];
      lastPaceSampleAtRef.current = 0;
      autoPauseFiredRef.current = false;
      stillSecRef.current = 0;
      const last = opts.points[opts.points.length - 1] ?? null;
      setState((s) => ({
        ...s,
        recording: true,
        paused: true,
        points: opts.points,
        distanceM: opts.distanceM,
        lastPoint: last ?? s.lastPoint,
        currentPaceSecPerKm: null,
        avgPaceSecPerKm:
          opts.distanceM > 30 && opts.movingSec > 10
            ? opts.movingSec / (opts.distanceM / 1000)
            : null,
        recentPaces: [],
        stillSec: 0,
      }));
    },
    [],
  );

  const getSnapshot = useCallback(() => {
    return {
      points: [...pointsRef.current],
      distanceM: distanceRef.current,
      movingSec: getMovingSec(),
    };
  }, [getMovingSec]);

  // Détection immobilité → pause auto suggérée
  useEffect(() => {
    const t = setInterval(() => {
      if (!recordingRef.current || pausedRef.current) {
        if (stillSecRef.current !== 0) {
          stillSecRef.current = 0;
          setState((s) => (s.stillSec === 0 ? s : { ...s, stillSec: 0 }));
        }
        return;
      }
      const anchor = lastMoveAtRef.current ?? Date.now();
      const still = Math.max(0, (Date.now() - anchor) / 1000);
      stillSecRef.current = still;
      setState((s) =>
        Math.abs(s.stillSec - still) < 0.4 ? s : { ...s, stillSec: still },
      );
      if (
        still >= autoPauseAfterSec &&
        !autoPauseFiredRef.current &&
        onAutoPauseSuggestedRef.current
      ) {
        autoPauseFiredRef.current = true;
        onAutoPauseSuggestedRef.current();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [autoPauseAfterSec]);

  useEffect(() => () => stopWatch(), [stopWatch]);

  return {
    ...state,
    prepare,
    start: startRecording,
    pause,
    resume,
    stop,
    hydrate,
    getSnapshot,
    getMovingSec,
  };
}
