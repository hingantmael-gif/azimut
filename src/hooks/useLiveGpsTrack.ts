import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { haversineM } from '../engines/liveWorkout';

export type GpsPoint = {
  lat: number;
  lng: number;
  alt?: number;
  accuracy?: number;
  timestamp: number;
};

export type LiveTrackState = {
  permission: 'unknown' | 'granted' | 'denied';
  tracking: boolean;
  paused: boolean;
  points: GpsPoint[];
  distanceM: number;
  /** Allure instantanée (fenêtre récente), sec/km */
  currentPaceSecPerKm: number | null;
  /** Allure moyenne moving */
  avgPaceSecPerKm: number | null;
  error: string | null;
  lastAccuracy: number | null;
};

const MAX_ACCURACY_M = 45;
const MIN_MOVE_M = 2.5;

export function useLiveGpsTrack() {
  const [state, setState] = useState<LiveTrackState>({
    permission: 'unknown',
    tracking: false,
    paused: false,
    points: [],
    distanceM: 0,
    currentPaceSecPerKm: null,
    avgPaceSecPerKm: null,
    error: null,
    lastAccuracy: null,
  });

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const pausedRef = useRef(false);
  const pointsRef = useRef<GpsPoint[]>([]);
  const distanceRef = useRef(0);
  const movingStartRef = useRef<number | null>(null);
  const movingAccumRef = useRef(0);
  const lastMoveAtRef = useRef<number | null>(null);

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
    if (pausedRef.current) return;
    const acc = raw.coords.accuracy ?? 999;
    setState((s) => ({ ...s, lastAccuracy: acc }));
    if (acc > MAX_ACCURACY_M) return;

    const next: GpsPoint = {
      lat: raw.coords.latitude,
      lng: raw.coords.longitude,
      alt: raw.coords.altitude ?? undefined,
      accuracy: acc,
      timestamp: raw.timestamp ?? Date.now(),
    };

    const prev = pointsRef.current[pointsRef.current.length - 1];
    let add = 0;
    if (prev) {
      add = haversineM(
        { lat: prev.lat, lng: prev.lng },
        { lat: next.lat, lng: next.lng },
      );
      if (add < MIN_MOVE_M) return;
      // Filtre vitesse absurde (> ~45 km/h à pied / 80 km/h vélo simplifié)
      const dt = Math.max(0.4, (next.timestamp - prev.timestamp) / 1000);
      const mps = add / dt;
      if (mps > 28) return;
      distanceRef.current += add;
      lastMoveAtRef.current = next.timestamp;
    } else {
      movingStartRef.current = next.timestamp;
      lastMoveAtRef.current = next.timestamp;
    }

    pointsRef.current = [...pointsRef.current, next];

    // Allure fenêtre ~20–35 s
    const pts = pointsRef.current;
    let windowDist = 0;
    let windowT = 0;
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      windowDist += haversineM(
        { lat: a.lat, lng: a.lng },
        { lat: b.lat, lng: b.lng },
      );
      windowT += Math.max(0, (b.timestamp - a.timestamp) / 1000);
      if (windowT >= 25 || windowDist >= 80) break;
    }
    const currentPace =
      windowDist > 12 && windowT > 4
        ? (windowT / (windowDist / 1000))
        : null;

    const movingSec = (() => {
      if (!movingStartRef.current) return 0;
      const now = next.timestamp;
      return movingAccumRef.current + Math.max(0, (now - movingStartRef.current) / 1000);
    })();

    const avgPace =
      distanceRef.current > 30 && movingSec > 10
        ? movingSec / (distanceRef.current / 1000)
        : null;

    setState((s) => ({
      ...s,
      points: pointsRef.current,
      distanceM: distanceRef.current,
      currentPaceSecPerKm: currentPace,
      avgPaceSecPerKm: avgPace,
      error: null,
    }));
  }, []);

  const start = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) return false;

    try {
      // Active services GPS si besoin (Android)
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

      stopWatch();
      pausedRef.current = false;
      pointsRef.current = [];
      distanceRef.current = 0;
      movingStartRef.current = Date.now();
      movingAccumRef.current = 0;
      lastMoveAtRef.current = null;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 3,
          mayShowUserSettingsDialog: true,
        },
        ingestPoint,
      );
      subRef.current = sub;
      setState({
        permission: 'granted',
        tracking: true,
        paused: false,
        points: [],
        distanceM: 0,
        currentPaceSecPerKm: null,
        avgPaceSecPerKm: null,
        error: null,
        lastAccuracy: null,
      });
      return true;
    } catch {
      setState((s) => ({
        ...s,
        error: 'Échec du démarrage GPS. Réessaie ou vérifie les permissions.',
      }));
      return false;
    }
  }, [ingestPoint, requestPermission, stopWatch]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (movingStartRef.current) {
      movingAccumRef.current += Math.max(
        0,
        (Date.now() - movingStartRef.current) / 1000,
      );
      movingStartRef.current = null;
    }
    setState((s) => ({ ...s, paused: true }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    movingStartRef.current = Date.now();
    setState((s) => ({ ...s, paused: false }));
  }, []);

  const stop = useCallback(() => {
    stopWatch();
    pausedRef.current = true;
    if (movingStartRef.current) {
      movingAccumRef.current += Math.max(
        0,
        (Date.now() - movingStartRef.current) / 1000,
      );
      movingStartRef.current = null;
    }
    setState((s) => ({ ...s, tracking: false, paused: true }));
  }, [stopWatch]);

  const getMovingSec = useCallback(() => {
    let total = movingAccumRef.current;
    if (movingStartRef.current && !pausedRef.current) {
      total += Math.max(0, (Date.now() - movingStartRef.current) / 1000);
    }
    return total;
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  return {
    ...state,
    start,
    pause,
    resume,
    stop,
    getMovingSec,
    requestPermission,
  };
}
