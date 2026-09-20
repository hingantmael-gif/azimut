import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { TopoLines } from '../profile/TopoLines';
import { LoopView } from './LoopView';

/**
 * Familles de motifs animés pour les fonds : chaque discipline a sa propre « matière ».
 * Tous restent DERRIÈRE le contenu (pointerEvents none) et discrets (opacité faible).
 * Animations en CSS sur le web (voir LoopView) : aucun coût JavaScript par image.
 */
export type PatternKind = 'topo' | 'speed' | 'waves' | 'orbits' | 'embers' | 'hex' | 'bars' | 'dots';

const SPORT_PATTERN: Record<string, PatternKind> = {
  run: 'topo',
  bike: 'speed',
  swim: 'waves',
  triathlon: 'orbits',
  ironman: 'embers',
  strength: 'hex',
  calisthenics: 'bars',
  other: 'dots',
};

export function patternForSport(sport?: string | null): PatternKind {
  return (sport && SPORT_PATTERN[sport]) || 'topo';
}

/** Motif stable pour un identifiant quelconque (fonds de profil : chacun le sien). */
export function patternForSeed(seed: number): PatternKind {
  const all: PatternKind[] = ['topo', 'speed', 'waves', 'orbits', 'embers', 'hex', 'bars', 'dots'];
  return all[Math.abs(seed) % all.length]!;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type P = { w: number; h: number; color: string; color2: string; seed: number; opacity: number; paused: boolean };

/** Traînées de vitesse : trait en biais qui glissent à deux vitesses (parallaxe). */
function Speed({ w, h, color, color2, seed, opacity, paused }: P) {
  const layers = useMemo(() => {
    const r = rng(seed);
    const mk = (n: number) =>
      Array.from({ length: n }, () => ({
        x: r() * w * 1.4 - w * 0.2,
        y: r() * h * 1.5 - h * 0.25,
        len: 50 + r() * 170,
        th: 1 + r() * 2.6,
        a: 0.3 + r() * 0.7,
        c: r() > 0.55 ? color2 : color,
      }));
    return [mk(11), mk(8)];
  }, [seed, w, h, color, color2]);
  const size = { width: w * 1.5, height: h * 1.5, left: -w * 0.25, top: -h * 0.25 };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {/* Le cadre est incliné une fois pour toutes ; les traînées glissent le long de l'inclinaison. */}
      <View style={{ position: 'absolute', ...size, transform: [{ rotate: '-17deg' }] }}>
        {layers.map((ls, i) => (
          <LoopView
            key={i}
            from={{ x: -70 * (i + 1) }}
            to={{ x: 70 * (i + 1) }}
            ms={i === 0 ? 8200 : 4600}
            delay={i === 0 ? 0 : 400}
            paused={paused}
            style={StyleSheet.absoluteFill}
          >
            <Svg width={size.width} height={size.height}>
              {ls.map((st, k) => (
                <Line key={k} x1={st.x} y1={st.y} x2={st.x + st.len} y2={st.y} stroke={st.c} strokeOpacity={st.a} strokeWidth={st.th} strokeLinecap="round" />
              ))}
            </Svg>
          </LoopView>
        ))}
      </View>
    </View>
  );
}

/** Vagues superposées qui défilent : natation. */
function Waves({ w, h, color, color2, seed, opacity, paused }: P) {
  const L = Math.max(260, w * 0.9);
  const rows = 5;
  const paths = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: rows }, (_, i) => {
      const base = h * (0.34 + i * 0.13);
      const amp = 9 + r() * 14;
      const phase = r() * Math.PI * 2;
      let d = `M 0 ${h}`;
      for (let x = 0; x <= w + L + 12; x += 12) {
        d += ` L ${x} ${(base + amp * Math.sin((x / L) * Math.PI * 2 + phase)).toFixed(1)}`;
      }
      d += ` L ${w + L + 12} ${h} Z`;
      return d;
    });
  }, [seed, w, h, L]);
  const speeds = [16000, 21000, 13000, 25000, 18000];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {paths.map((d, i) => (
        <LoopView
          key={i}
          from={{ x: i % 2 ? -L : 0 }}
          to={{ x: i % 2 ? 0 : -L }}
          ms={speeds[i]!}
          yoyo={false}
          linear
          paused={paused}
          style={{ position: 'absolute', left: 0, top: 0, width: w + L + 12, height: h }}
        >
          <Svg width={w + L + 12} height={h}>
            <Path d={d} fill={i % 2 ? color2 : color} fillOpacity={0.09 + i * 0.012} stroke={i % 2 ? color2 : color} strokeOpacity={0.4} strokeWidth={1.4} />
          </Svg>
        </LoopView>
      ))}
    </View>
  );
}

/** Anneaux concentriques en rotation : triathlon (trois disciplines qui tournent ensemble). */
function Orbits({ w, h, color, color2, opacity, paused }: P) {
  const cx = w * 0.82;
  const cy = h * 0.26;
  const radii = [70, 125, 185, 250, 325];
  const speeds = [30000, 42000, 56000, 38000, 70000];
  const third = '#A78BFA';
  const cols = [color, color2, third, color, color2];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {radii.map((r, i) => (
        <LoopView
          key={r}
          from={{ rotate: i % 2 ? 360 : 0 }}
          to={{ rotate: i % 2 ? 0 : 360 }}
          ms={speeds[i]!}
          yoyo={false}
          linear
          paused={paused}
          style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2 }}
        >
          <Svg width={r * 2} height={r * 2}>
            <Circle cx={r} cy={r} r={r - 2} stroke={cols[i]} strokeOpacity={0.5} strokeWidth={1.4} fill="none" strokeDasharray={i % 2 ? '2 10' : '46 18'} />
            <Circle cx={r} cy={2} r={4.5} fill={cols[i]} fillOpacity={0.9} />
          </Svg>
        </LoopView>
      ))}
    </View>
  );
}

/** Braise qui monte (montée + fondu) : Ironman. */
function Ember({ x, size, color, ms, delay, h, paused }: { x: number; size: number; color: string; ms: number; delay: number; h: number; paused: boolean }) {
  const up = -h * 0.95;
  return (
    <LoopView
      stops={[
        { at: 0, pose: { x: 0, y: 0, opacity: 0 } },
        { at: 15, pose: { x: 3, y: up * 0.15, opacity: 1 } },
        { at: 70, pose: { x: 16, y: up * 0.7, opacity: 0.7 } },
        { at: 100, pose: { x: -10, y: up, opacity: 0 } },
      ]}
      ms={ms}
      delay={delay}
      yoyo={false}
      linear
      paused={paused}
      style={{
        position: 'absolute',
        left: x,
        top: h - 20,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0,
        boxShadow: `0px 0px ${size * 3}px ${size}px ${color}`,
      }}
    />
  );
}

function Embers({ w, h, color, color2, seed, opacity, paused }: P) {
  const items = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 11 }, (_, i) => ({
      x: r() * w,
      size: 2.5 + r() * 4.5,
      c: i % 3 === 0 ? '#FFFFFF' : i % 2 ? color : color2,
      ms: 7000 + r() * 7000,
      delay: r() * 6000,
    }));
  }, [seed, w, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {items.map((e, i) => (
        <Ember key={i} x={e.x} size={e.size} color={e.c} ms={e.ms} delay={e.delay} h={h} paused={paused} />
      ))}
    </View>
  );
}

/** Maillage hexagonal qui pulse : musculation. */
function Hex({ w, h, color, opacity, paused }: P) {
  const s = 30;
  const d = useMemo(() => {
    const parts: string[] = [];
    const dx = s * 1.5;
    const dy = Math.sqrt(3) * s;
    for (let col = -1; col * dx < w + s * 2; col++) {
      for (let row = -1; row * dy < h + dy; row++) {
        const cx = col * dx;
        const cy = row * dy + (col % 2 ? dy / 2 : 0);
        const pts = Array.from({ length: 6 }, (_, k) => {
          const a = (Math.PI / 3) * k;
          return `${(cx + s * Math.cos(a)).toFixed(1)} ${(cy + s * Math.sin(a)).toFixed(1)}`;
        });
        parts.push(`M ${pts.join(' L ')} Z`);
      }
    }
    return parts.join(' ');
  }, [w, h]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <LoopView from={{ opacity: 0.45 }} to={{ opacity: 1 }} ms={5200} paused={paused} style={StyleSheet.absoluteFill}>
        <Svg width={w} height={h}>
          <Path d={d} stroke={color} strokeOpacity={0.55} strokeWidth={1} fill="none" />
        </Svg>
      </LoopView>
    </View>
  );
}

/** Colonnes qui montent et descendent : callisthénie / gainage. */
function Bars({ w, h, color, color2, seed, opacity, paused }: P) {
  const bars = useMemo(() => {
    const r = rng(seed);
    const n = 9;
    const gap = 10;
    const bw = (w - gap * (n + 1)) / n;
    return Array.from({ length: n }, (_, i) => ({
      x: gap + i * (bw + gap),
      bw,
      bh: h * (0.16 + r() * 0.3),
      color: i % 2 ? color2 : color,
      ms: 3200 + r() * 3600,
      delay: r() * 1800,
    }));
  }, [seed, w, h, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: opacity * 0.5 }]}>
      {bars.map((b, i) => (
        <LoopView
          key={i}
          from={{ scaleY: 0.5 }}
          to={{ scaleY: 1 }}
          ms={b.ms}
          delay={b.delay}
          origin="center bottom"
          paused={paused}
          style={{
            position: 'absolute',
            left: b.x,
            bottom: 0,
            width: b.bw,
            height: b.bh,
            borderTopLeftRadius: b.bw / 2,
            borderTopRightRadius: b.bw / 2,
            backgroundColor: b.color,
          }}
        />
      ))}
    </View>
  );
}

/** Trame de points qui respire : sobre, pour les disciplines « autres ». */
function Dots({ w, h, color, opacity, paused }: P) {
  const gap = 26;
  const cells = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let x = gap / 2; x < w + gap; x += gap) for (let y = gap / 2; y < h + gap; y += gap) out.push({ x, y });
    return out;
  }, [w, h]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <LoopView from={{ opacity: 0.4, y: -6 }} to={{ opacity: 1, y: 6 }} ms={4800} paused={paused} style={StyleSheet.absoluteFill}>
        <Svg width={w} height={h + gap}>
          {cells.map((c, i) => (
            <Rect key={i} x={c.x - 1.4} y={c.y - 1.4} width={2.8} height={2.8} rx={1.4} fill={color} fillOpacity={0.7} />
          ))}
        </Svg>
      </LoopView>
    </View>
  );
}

/**
 * Motif animé plein cadre. Mesure son conteneur (les fonds de profil n'ont pas la taille de l'écran)
 * puis dessine la famille demandée.
 */
export function AuroraPattern({
  kind,
  color,
  color2,
  seed,
  opacity = 1,
  paused = false,
}: {
  kind: PatternKind;
  color: string;
  color2: string;
  seed: number;
  opacity?: number;
  paused?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize((s) => (s && Math.abs(s.w - width) < 2 && Math.abs(s.h - height) < 2 ? s : { w: width, h: height }));
  };
  const props = size ? { w: size.w, h: size.h, color, color2, seed, opacity, paused } : null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {props ? (
        kind === 'topo' ? (
          <TopoLines color={color} height={props.h} seed={seed} lines={14} opacity={0.24 * opacity} drift={2.2} paused={paused} />
        ) : kind === 'speed' ? (
          <Speed {...props} />
        ) : kind === 'waves' ? (
          <Waves {...props} />
        ) : kind === 'orbits' ? (
          <Orbits {...props} />
        ) : kind === 'embers' ? (
          <Embers {...props} />
        ) : kind === 'hex' ? (
          <Hex {...props} />
        ) : kind === 'bars' ? (
          <Bars {...props} />
        ) : (
          <Dots {...props} />
        )
      ) : null}
    </View>
  );
}
