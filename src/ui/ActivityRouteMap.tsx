import { createElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';
import { BRAND } from '../constants/brand';

/** Tracé Mova (jade) — style Strava mais aux couleurs de l’app */
const ROUTE_COLOR = BRAND.accent;
const ROUTE_GLOW = BRAND.signalMint;
const START_GREEN = '#00D26A';

type Props = {
  latlng: [number, number][];
  height?: number;
  /** Position live (suivi caméra) */
  follow?: boolean;
  /** Afficher les boutons ± (désactivé par défaut — molette / pinch) */
  zoomControl?: boolean;
  emptyLabel?: string;
  /** Précision GPS en mètres — cercle d’incertitude */
  accuracyM?: number | null;
};

function boundsOf(points: [number, number][]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const padLat = Math.max((maxLat - minLat) * 0.08, 0.0008);
  const padLng = Math.max((maxLng - minLng) * 0.08, 0.0008);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

type LeafletHandle = {
  map: any;
  line: any | null;
  glow: any | null;
  startMk: any | null;
  endMk: any | null;
  userMk: any | null;
  accCircle: any | null;
  /** L'utilisateur a zoomé / déplacé la carte : plus aucun recadrage automatique tant qu'il ne le demande pas. */
  userAdjusted: boolean;
  /** Empreinte du dernier tracé cadré (évite de recadrer quand rien n'a changé). */
  framedSig: string;
};

function routeSignature(pts: [number, number][]): string {
  const last = pts[pts.length - 1];
  return `${pts.length}|${last ? last[0] : ''}|${last ? last[1] : ''}`;
}

function ensureLeaflet(): Promise<{ L: any }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('no-dom'));
      return;
    }
    const w = window as typeof window & { L?: any };
    if (w.L) {
      resolve({ L: w.L });
      return;
    }
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const existing = document.getElementById('leaflet-js');
    if (existing) {
      existing.addEventListener('load', () =>
        resolve({ L: (window as typeof window & { L: any }).L }),
      );
      if ((window as typeof window & { L?: any }).L) {
        resolve({ L: (window as typeof window & { L: any }).L });
      }
      return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve({ L: (window as typeof window & { L: any }).L });
    script.onerror = () => reject(new Error('Leaflet'));
    document.head.appendChild(script);
  });
}

function clearLayers(h: LeafletHandle) {
  if (h.line) {
    h.map.removeLayer(h.line);
    h.line = null;
  }
  if (h.glow) {
    h.map.removeLayer(h.glow);
    h.glow = null;
  }
  if (h.startMk) {
    h.map.removeLayer(h.startMk);
    h.startMk = null;
  }
  if (h.endMk) {
    h.map.removeLayer(h.endMk);
    h.endMk = null;
  }
  if (h.userMk) {
    h.map.removeLayer(h.userMk);
    h.userMk = null;
  }
  if (h.accCircle) {
    h.map.removeLayer(h.accCircle);
    h.accCircle = null;
  }
}

/** Applique tracé / marqueurs sur une carte Leaflet déjà prête. */
function paintRoute(
  h: LeafletHandle,
  L: any,
  pts: [number, number][],
  follow?: boolean,
  accuracyM?: number | null,
  recenter?: boolean,
) {
  clearLayers(h);
  if (pts.length < 1) return;

  const last = pts[pts.length - 1]!;

  if (accuracyM != null && accuracyM > 0 && accuracyM < 5000) {
    h.accCircle = L.circle(last, {
      radius: Math.max(8, accuracyM),
      color: ROUTE_COLOR,
      weight: 1,
      opacity: 0.45,
      fillColor: ROUTE_COLOR,
      fillOpacity: 0.12,
    }).addTo(h.map);
  }

  if (pts.length >= 2) {
    h.glow = L.polyline(pts, {
      color: ROUTE_GLOW,
      weight: 10,
      opacity: 0.22,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(h.map);
    h.line = L.polyline(pts, {
      color: ROUTE_COLOR,
      weight: 5,
      opacity: 0.95,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(h.map);

    h.startMk = L.circleMarker(pts[0], {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: START_GREEN,
      fillOpacity: 1,
    }).addTo(h.map);
    h.endMk = L.circleMarker(last, {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: ROUTE_COLOR,
      fillOpacity: 1,
    }).addTo(h.map);

    // Cadrage automatique : jamais une fois que l'utilisateur a pris la main (zoom arrière conservé),
    // et jamais si le tracé n'a pas changé (un simple re-rendu ne doit pas remettre le zoom initial).
    const sig = routeSignature(pts);
    if (!h.userAdjusted && (recenter || h.framedSig !== sig)) {
      if (follow) {
        h.map.setView(last, Math.max(h.map.getZoom(), 16), { animate: true });
      } else {
        h.map.fitBounds(h.line.getBounds(), { padding: [36, 36], maxZoom: 17 });
      }
    }
    h.framedSig = sig;
  } else {
    h.userMk = L.circleMarker(last, {
      radius: 9,
      color: '#fff',
      weight: 3,
      fillColor: ROUTE_COLOR,
      fillOpacity: 1,
    }).addTo(h.map);
    if (!h.userAdjusted && (recenter || h.framedSig !== routeSignature(pts))) h.map.setView(last, 16);
    h.framedSig = routeSignature(pts);
  }

  setTimeout(() => h.map.invalidateSize(), 60);
}

/** Carte Leaflet interactive — pan, zoom molette / pinch, sans ± */
function LeafletRouteMap({
  latlng,
  height,
  follow,
  zoomControl = false,
  emptyLabel,
  accuracyM,
}: Props) {
  const reactId = useId().replace(/:/g, '');
  const domId = `azimut-map-${reactId}`;
  const handleRef = useRef<LeafletHandle | null>(null);
  const readyRef = useRef(false);
  /** Derniers points reçus — appliqués dès que la carte est prête */
  const latlngRef = useRef(latlng);
  const followRef = useRef(follow);
  const accuracyRef = useRef(accuracyM);
  /** Bouton « Recentrer » : visible seulement après un zoom / déplacement manuel. */
  const [showRecenter, setShowRecenter] = useState(false);
  latlngRef.current = latlng;
  followRef.current = follow;
  accuracyRef.current = accuracyM;

  // Init once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;

    void ensureLeaflet()
      .then(({ L }) => {
        if (cancelled) return;
        const el = document.getElementById(domId);
        if (!el || !L) return;
        el.innerHTML = '';
        const map = L.map(el, {
          zoomControl,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          attributionControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '',
        }).addTo(map);

        handleRef.current = {
          map,
          line: null,
          glow: null,
          startMk: null,
          endMk: null,
          userMk: null,
          accCircle: null,
          userAdjusted: false,
          framedSig: '',
        };
        readyRef.current = true;

        // Toute action de l'utilisateur sur la carte (molette, pinch, glisser, double-clic) fige le cadrage.
        const markUser = () => {
          const cur = handleRef.current;
          if (!cur || cur.userAdjusted) return;
          cur.userAdjusted = true;
          setShowRecenter(true);
        };
        for (const ev of ['wheel', 'mousedown', 'touchstart', 'dblclick']) {
          el.addEventListener(ev, markUser, { passive: true });
        }

        const pending = latlngRef.current;
        if (pending.length >= 1) {
          paintRoute(
            handleRef.current,
            L,
            pending,
            followRef.current,
            accuracyRef.current,
          );
        } else {
          // Pas de Paris figé : vue neutre Europe jusqu’au GPS
          map.setView([46.6, 2.4], 5);
        }
        setTimeout(() => map.invalidateSize(), 80);
        if (typeof document !== 'undefined' && !document.getElementById('azimut-hide-leaflet-attr')) {
          const style = document.createElement('style');
          style.id = 'azimut-hide-leaflet-attr';
          style.textContent =
            '.leaflet-control-attribution,.leaflet-bottom.leaflet-right{display:none!important}';
          document.head.appendChild(style);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        handleRef.current?.map?.remove();
      } catch {
        /* ignore */
      }
      handleRef.current = null;
    };
  }, [domId, zoomControl]);

  // Update route / markers when points change
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !readyRef.current) return;
    const w = window as typeof window & { L?: any };
    const L = w.L;
    if (!L) return;
    paintRoute(h, L, latlng, follow, accuracyM);
  }, [latlng, follow, accuracyM]);

  const recenterNow = useCallback(() => {
    const h = handleRef.current;
    const L = (window as typeof window & { L?: any }).L;
    if (!h || !L) return;
    h.userAdjusted = false;
    setShowRecenter(false);
    paintRoute(h, L, latlngRef.current, followRef.current, accuracyRef.current, true);
  }, []);

  return (
    <View style={[styles.map, { height: height ?? '100%' as unknown as number }]}>
      {createElement('div', {
        id: domId,
        style: {
          height: '100%',
          width: '100%',
          backgroundColor: '#E8EEF2',
          touchAction: 'none',
        },
      })}
      {showRecenter && latlng.length >= 1 ? (
        <Pressable onPress={recenterNow} accessibilityRole="button" accessibilityLabel="Recentrer la carte" style={styles.recenterBtn}>
          <Text style={styles.recenterText}>Recentrer</Text>
        </Pressable>
      ) : null}
      {latlng.length < 1 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>
            {emptyLabel ?? 'Autorise le GPS pour afficher ta position'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SvgRouteMap({ latlng, height }: Props) {
  const width = 360;
  const h = typeof height === 'number' ? height : 280;
  const pad = 16;

  const { points, start, end } = useMemo(() => {
    if (latlng.length < 2) {
      return { points: '', start: null as null | { x: number; y: number }, end: null as null | { x: number; y: number } };
    }
    const b = boundsOf(latlng);
    const spanLat = Math.max(b.maxLat - b.minLat, 1e-6);
    const spanLng = Math.max(b.maxLng - b.minLng, 1e-6);
    const toXY = (lat: number, lng: number) => {
      const x = pad + ((lng - b.minLng) / spanLng) * (width - pad * 2);
      const y = pad + ((b.maxLat - lat) / spanLat) * (h - pad * 2);
      return { x, y };
    };
    const pts = latlng.map(([lat, lng]) => toXY(lat, lng));
    return {
      points: pts.map((p) => `${p.x},${p.y}`).join(' '),
      start: pts[0]!,
      end: pts[pts.length - 1]!,
    };
  }, [latlng, h]);

  return (
    <View style={[styles.map, { height: h }]}>
      <Svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`}>
        <Rect x={0} y={0} width={width} height={h} fill="#E8EEF2" />
        {points ? (
          <Polyline
            points={points}
            fill="none"
            stroke={ROUTE_COLOR}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {start ? (
          <Circle cx={start.x} cy={start.y} r={6} fill={START_GREEN} stroke="#fff" strokeWidth={2} />
        ) : null}
        {end ? (
          <Circle cx={end.x} cy={end.y} r={6} fill={ROUTE_COLOR} stroke="#fff" strokeWidth={2} />
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * Carte tracé Mova : pan / zoom (molette, pinch, drag), sans boutons ±.
 */
export function ActivityRouteMap({
  latlng,
  height = 280,
  follow = false,
  zoomControl = false,
  emptyLabel,
  accuracyM,
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <LeafletRouteMap
        latlng={latlng}
        height={height}
        follow={follow}
        zoomControl={zoomControl}
        emptyLabel={emptyLabel}
        accuracyM={accuracyM}
      />
    );
  }
  if (!latlng || latlng.length < 2) {
    return (
      <View style={[styles.map, styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyLabel ?? 'Aucun tracé GPS'}</Text>
      </View>
    );
  }
  return <SvgRouteMap latlng={latlng} height={height} />;
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E8EEF2',
    position: 'relative',
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyOverlay: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,238,242,0.55)',
  },
  recenterBtn: {
    ...({ position: 'absolute' as const, right: 12, bottom: 12 }),
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  recenterText: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  emptyText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
