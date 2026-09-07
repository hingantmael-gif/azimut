import { createElement, useEffect, useId, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

/** Orange tracé Strava */
const STRAVA_ORANGE = '#FC4C02';
const START_GREEN = '#00D26A';

type Props = {
  latlng: [number, number][];
  height?: number;
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

/** Carte Leaflet (OSM) + polyligne orange Strava — web */
function LeafletRouteMap({ latlng, height }: Props) {
  const reactId = useId().replace(/:/g, '');
  const domId = `strava-map-${reactId}`;
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined' || latlng.length < 2) return;
    let cancelled = false;

    const ensureLeaflet = (): Promise<{ L: any }> =>
      new Promise((resolve, reject) => {
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

    void ensureLeaflet()
      .then(({ L }) => {
        if (cancelled) return;
        const el = document.getElementById(domId);
        if (!el || !L) return;
        el.innerHTML = '';
        const map = L.map(el, { zoomControl: true });
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const line = L.polyline(latlng, {
          color: STRAVA_ORANGE,
          weight: 4,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        L.circleMarker(latlng[0], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: START_GREEN,
          fillOpacity: 1,
        }).addTo(map);
        L.circleMarker(latlng[latlng.length - 1], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: STRAVA_ORANGE,
          fillOpacity: 1,
        }).addTo(map);

        map.fitBounds(line.getBounds(), { padding: [28, 28] });
        setTimeout(() => map.invalidateSize(), 100);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [domId, latlng]);

  return (
    <View style={[styles.map, { height }]}>
      {createElement('div', {
        id: domId,
        style: {
          height: '100%',
          width: '100%',
          backgroundColor: '#E8EEF2',
        },
      })}
    </View>
  );
}

/** Fallback SVG — même style tracé Strava */
function SvgRouteMap({ latlng, height }: Props) {
  const width = 360;
  const h = height ?? 280;
  const pad = 16;

  const { points, start, end } = useMemo(() => {
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
      start: pts[0],
      end: pts[pts.length - 1],
    };
  }, [latlng, h]);

  return (
    <View style={[styles.map, { height: h }]}>
      <Svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`}>
        <Rect x={0} y={0} width={width} height={h} fill="#E8EEF2" />
        <Polyline
          points={points}
          fill="none"
          stroke={STRAVA_ORANGE}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {start ? (
          <Circle cx={start.x} cy={start.y} r={6} fill={START_GREEN} stroke="#fff" strokeWidth={2} />
        ) : null}
        {end ? (
          <Circle cx={end.x} cy={end.y} r={6} fill={STRAVA_ORANGE} stroke="#fff" strokeWidth={2} />
        ) : null}
      </Svg>
    </View>
  );
}

/**
 * Tracé façon Strava : fond carte + ligne #FC4C02, départ vert, arrivée orange.
 */
export function ActivityRouteMap({ latlng, height = 280 }: Props) {
  if (!latlng || latlng.length < 2) {
    return (
      <View style={[styles.map, styles.empty, { height }]}>
        <Text style={styles.emptyText}>Aucun tracé GPS</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return <LeafletRouteMap latlng={latlng} height={height} />;
  }
  return <SvgRouteMap latlng={latlng} height={height} />;
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E8EEF2',
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14 },
});
