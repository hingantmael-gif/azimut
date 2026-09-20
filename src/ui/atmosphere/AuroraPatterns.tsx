import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { TopoLines } from '../profile/TopoLines';

/**
 * Familles de motifs animés pour les fonds : chaque discipline a sa propre « matière ».
 * Tous restent DERRIÈRE le contenu (pointerEvents none) et discrets (opacité faible).
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

/** Valeur qui boucle de 0 à 1 (aller-retour si `yoyo`). Figée si `paused`. */
function useLoop(ms: number, paused: boolean, yoyo = false, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (paused) return;
    const up = Animated.timing(v, {
      toValue: 1,
      duration: ms,
      delay,
      easing: yoyo ? Easing.inOut(Easing.sin) : Easing.linear,
      useNativeDriver: true,
    });
    const anim = yoyo
      ? Animated.sequence([up, Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])
      : Animated.sequence([up, Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]);
    const loop = Animated.loop(anim);
    loop.start();
    return () => loop.stop();
  }, [v, ms, paused, yoyo, delay]);
  return v;
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
  const a = useLoop(8200, paused, true);
  const b = useLoop(4600, paused, true, 400);
  const size = { width: w * 1.5, height: h * 1.5, left: -w * 0.25, top: -h * 0.25 };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {layers.map((ls, i) => {
        const v = i === 0 ? a : b;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              ...size,
              transform: [
                { rotate: '-17deg' },
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-70 * (i + 1), 70 * (i + 1)] }) },
              ],
            }}
          >
            <Svg width={size.width} height={size.height}>
              {ls.map((s, k) => (
                <Line key={k} x1={s.x} y1={s.y} x2={s.x + s.len} y2={s.y} stroke={s.c} strokeOpacity={s.a} strokeWidth={s.th} strokeLinecap="round" />
              ))}
            </Svg>
          </Animated.View>
        );
      })}
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
  const drivers = [
    useLoop(16000, paused),
    useLoop(21000, paused),
    useLoop(13000, paused),
    useLoop(25000, paused),
    useLoop(18000, paused),
  ];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {paths.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: w + L + 12,
            height: h,
            transform: [{ translateX: drivers[i]!.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? [-L, 0] : [0, -L] }) }],
          }}
        >
          <Svg width={w + L + 12} height={h}>
            <Path d={d} fill={i % 2 ? color2 : color} fillOpacity={0.09 + i * 0.012} stroke={i % 2 ? color2 : color} strokeOpacity={0.4} strokeWidth={1.4} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

/** Anneaux concentriques en rotation : triathlon (trois disciplines qui tournent ensemble). */
function Orbits({ w, h, color, color2, opacity, paused }: P) {
  const cx = w * 0.82;
  const cy = h * 0.26;
  const radii = [70, 125, 185, 250, 325];
  const spins = [useLoop(30000, paused), useLoop(42000, paused), useLoop(56000, paused), useLoop(38000, paused), useLoop(70000, paused)];
  const third = '#A78BFA';
  const cols = [color, color2, third, color, color2];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {radii.map((r, i) => (
        <Animated.View
          key={r}
          style={{
            position: 'absolute',
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            transform: [{ rotate: spins[i]!.interpolate({ inputRange: [0, 1], outputRange: i % 2 ? ['360deg', '0deg'] : ['0deg', '360deg'] }) }],
          }}
        >
          <Svg width={r * 2} height={r * 2}>
            <Circle cx={r} cy={r} r={r - 2} stroke={cols[i]} strokeOpacity={0.5} strokeWidth={1.4} fill="none" strokeDasharray={i % 2 ? '2 10' : '46 18'} />
            <Circle cx={r} cy={2} r={4.5} fill={cols[i]} fillOpacity={0.9} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

/** Braises qui montent : Ironman. */
function Ember({ x, size, color, ms, delay, h, paused }: { x: number; size: number; color: string; ms: number; delay: number; h: number; paused: boolean }) {
  const v = useLoop(ms, paused, false, delay);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: h - 20,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        boxShadow: `0px 0px ${size * 3}px ${size}px ${color}`,
        opacity: v.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.7, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.95] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 16, -10] }) },
        ],
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
        <Ember key={i} {...e} color={e.c} h={h} paused={paused} />
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
  const pulse = useLoop(5200, paused, true);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }), opacity) }]}
    >
      <Svg width={w} height={h}>
        <Path d={d} stroke={color} strokeOpacity={0.55} strokeWidth={1} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function Bar({ x, bw, bh, color, ms, delay, paused }: { x: number; bw: number; bh: number; color: string; ms: number; delay: number; paused: boolean }) {
  const v = useLoop(ms, paused, true, delay);
  return (
    <Animated.View
      style={
        {
          position: 'absolute',
          left: x,
          bottom: 0,
          width: bw,
          height: bh,
          borderTopLeftRadius: bw / 2,
          borderTopRightRadius: bw / 2,
          backgroundColor: color,
          transformOrigin: 'center bottom',
          transform: [{ scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        } as object
      }
    />
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
        <Bar key={i} {...b} paused={paused} />
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
  const pulse = useLoop(4800, paused, true);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: Animated.multiply(pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), opacity),
          transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) }],
        },
      ]}
    >
      <Svg width={w} height={h + gap}>
        {cells.map((c, i) => (
          <Rect key={i} x={c.x - 1.4} y={c.y - 1.4} width={2.8} height={2.8} rx={1.4} fill={color} fillOpacity={0.7} />
        ))}
      </Svg>
    </Animated.View>
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
