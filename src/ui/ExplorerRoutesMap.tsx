import { createElement, useEffect, useId, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Svg, { Polyline } from 'react-native-svg';
import { BRAND } from '../constants/brand';

export type ExplorerRoute = {
  id: string;
  latlng: [number, number][];
  color?: string;
  label?: string;
};

type Props = {
  routes: ExplorerRoute[];
  height?: number;
  /** Met en avant un tracé (opacité des autres baissée) */
  focusId?: string | null;
  emptyLabel?: string;
};

const PALETTE = [
  BRAND.accent,
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#EF4444',
  '#84CC16',
];

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

function colorFor(index: number, override?: string): string {
  return override ?? PALETTE[index % PALETTE.length]!;
}

function boundsOfAll(routes: ExplorerRoute[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const r of routes) {
    for (const [lat, lng] of r.latlng) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }
  if (!Number.isFinite(minLat)) return null;
  const padLat = Math.max((maxLat - minLat) * 0.12, 0.002);
  const padLng = Math.max((maxLng - minLng) * 0.12, 0.002);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

type Handle = {
  map: any;
  layers: any[];
};

function paintRoutes(
  h: Handle,
  L: any,
  routes: ExplorerRoute[],
  focusId?: string | null,
) {
  for (const layer of h.layers) {
    try {
      h.map.removeLayer(layer);
    } catch {
      /* ignore */
    }
  }
  h.layers = [];

  const usable = routes.filter((r) => r.latlng.length >= 2);
  if (usable.length === 0) {
    h.map.setView([46.6, 2.4], 5);
    return;
  }

  const group: any[] = [];
  usable.forEach((r, i) => {
    const color = colorFor(i, r.color);
    const focused = !focusId || focusId === r.id;
    const line = L.polyline(r.latlng, {
      color,
      weight: focused ? 5 : 3,
      opacity: focused ? 0.95 : 0.35,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(h.map);
    if (r.label) line.bindTooltip(r.label, { sticky: true });
    h.layers.push(line);
    group.push(line);

    if (focused) {
      const start = L.circleMarker(r.latlng[0], {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: '#00D26A',
        fillOpacity: 1,
      }).addTo(h.map);
      const end = L.circleMarker(r.latlng[r.latlng.length - 1], {
        radius: 5,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(h.map);
      h.layers.push(start, end);
    }
  });

  try {
    const fg = L.featureGroup(group);
    h.map.fitBounds(fg.getBounds(), { padding: [40, 40], maxZoom: 14 });
  } catch {
    h.map.setView([46.6, 2.4], 5);
  }
  setTimeout(() => h.map.invalidateSize(), 80);
}

function LeafletExplorer({ routes, height, focusId, emptyLabel }: Props) {
  const reactId = useId().replace(/:/g, '');
  const domId = `azimut-explorer-${reactId}`;
  const handleRef = useRef<Handle | null>(null);
  const readyRef = useRef(false);
  const routesRef = useRef(routes);
  const focusRef = useRef(focusId);
  routesRef.current = routes;
  focusRef.current = focusId;

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
          zoomControl: false,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          attributionControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '',
        }).addTo(map);
        handleRef.current = { map, layers: [] };
        readyRef.current = true;
        paintRoutes(handleRef.current, L, routesRef.current, focusRef.current);
        setTimeout(() => map.invalidateSize(), 100);
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
  }, [domId]);

  useEffect(() => {
    const h = handleRef.current;
    if (!h || !readyRef.current) return;
    const L = (window as typeof window & { L?: any }).L;
    if (!L) return;
    paintRoutes(h, L, routes, focusId);
  }, [routes, focusId]);

  const empty = routes.every((r) => r.latlng.length < 2);

  return (
    <View style={[styles.map, { height: height ?? 320 }]}>
      {createElement('div', {
        id: domId,
        style: {
          height: '100%',
          width: '100%',
          backgroundColor: '#E8EEF2',
          touchAction: 'none',
        },
      })}
      {empty ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyText}>
            {emptyLabel ??
              'Tes séances GPS s’afficheront ici — enregistre une sortie pour voir le tracé.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SvgExplorer({ routes, height, focusId, emptyLabel }: Props) {
  const h = height ?? 280;
  const usable = routes.filter((r) => r.latlng.length >= 2);
  const b = useMemo(() => boundsOfAll(usable), [usable]);

  if (!b || usable.length === 0) {
    return (
      <View style={[styles.map, styles.empty, { height: h }]}>
        <Text style={styles.emptyText}>
          {emptyLabel ??
            'Tes séances GPS s’afficheront ici — enregistre une sortie pour voir le tracé.'}
        </Text>
      </View>
    );
  }

  const w = 360;
  const toXY = (lat: number, lng: number) => {
    const x = ((lng - b.minLng) / (b.maxLng - b.minLng || 1)) * w;
    const y = (1 - (lat - b.minLat) / (b.maxLat - b.minLat || 1)) * h;
    return `${x},${y}`;
  };

  return (
    <View style={[styles.map, { height: h }]}>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {usable.map((r, i) => {
          const focused = !focusId || focusId === r.id;
          return (
            <Polyline
              key={r.id}
              points={r.latlng.map(([lat, lng]) => toXY(lat, lng)).join(' ')}
              fill="none"
              stroke={colorFor(i, r.color)}
              strokeWidth={focused ? 4 : 2.5}
              strokeOpacity={focused ? 0.95 : 0.4}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </View>
  );
}

/** Carte multi-séances : tous tes tracés GPS sur une même vue (villes / rues). */
export function ExplorerRoutesMap(props: Props) {
  if (Platform.OS === 'web') {
    return <LeafletExplorer {...props} />;
  }
  return <SvgExplorer {...props} />;
}

export function explorerRouteColor(index: number): string {
  return colorFor(index);
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#E8EEF2',
    position: 'relative',
    borderRadius: 12,
  },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyOverlay: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,238,242,0.55)',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
