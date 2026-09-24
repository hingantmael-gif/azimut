import { useId, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { rgba } from '../../theme/tokens';
import { TopoLines } from '../profile/TopoLines';
import { LoopView } from './LoopView';

/**
 * Familles de motifs animés pour les fonds : chaque discipline a sa propre « matière ».
 * Tous restent DERRIÈRE le contenu (pointerEvents none) et discrets (opacité faible).
 * Animations en CSS sur le web (voir LoopView) : aucun coût JavaScript par image.
 */
export type PatternKind =
  | 'topo' | 'speed' | 'waves' | 'orbits' | 'embers' | 'hex' | 'bars' | 'dots'
  | 'rain' | 'ripples' | 'stars' | 'bubbles' | 'grid' | 'rays' | 'triangles' | 'dunes' | 'chevrons' | 'confetti' | 'aurora';

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

/**
 * Motif d'un fond de profil (hors rangs) : cohérent avec le sport (course = courbes, vélo = traînées,
 * natation = vagues) ; les fonds « libres » ont chacun leur matière propre.
 */
export function patternForCover(coverId: string, unlock: { type: string; sport?: string }): PatternKind {
  if (unlock.type === 'distance' || unlock.type === 'personal_best') {
    return unlock.sport === 'bike' ? 'speed' : unlock.sport === 'swim' ? 'waves' : 'topo';
  }
  const byId: Record<string, PatternKind> = {
    'free-teal': 'waves',
    'free-night': 'dots',
    'free-sky': 'speed',
    'free-forest': 'topo',
  };
  return byId[coverId] ?? patternForSeed(coverId.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
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
  const third = '#5EEAD4';
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

/**
 * Maillage de dégradés radiaux doux (sobre, sans points ni traits) : trois halos qui dérivent lentement.
 * Remplace l'ancienne trame de points pour les disciplines « autres » et le fond « nuit ».
 */
function Dots({ w, h, color, color2, seed, opacity, paused }: P) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const blobs = useMemo(() => {
    const r = rng(seed + 7);
    return [
      { cx: w * (0.15 + r() * 0.2), cy: h * (0.1 + r() * 0.2), rad: Math.max(w, h) * 0.75, c: color, a: 0.42 },
      { cx: w * (0.65 + r() * 0.25), cy: h * (0.45 + r() * 0.2), rad: Math.max(w, h) * 0.8, c: color2, a: 0.34 },
      { cx: w * (0.2 + r() * 0.3), cy: h * (0.85 + r() * 0.1), rad: Math.max(w, h) * 0.7, c: color, a: 0.26 },
    ];
  }, [w, h, seed, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <LoopView from={{ opacity: 0.75, y: -10 }} to={{ opacity: 1, y: 10 }} ms={9000} paused={paused} style={StyleSheet.absoluteFill}>
        <Svg width={w} height={h}>
          <Defs>
            {blobs.map((b, i) => (
              <RadialGradient key={i} id={`mesh${uid}${i}`} cx={b.cx} cy={b.cy} r={b.rad} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={b.c} stopOpacity={b.a} />
                <Stop offset="1" stopColor={b.c} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {blobs.map((_, i) => (
            <Rect key={i} x={0} y={0} width={w} height={h} fill={`url(#mesh${uid}${i})`} />
          ))}
        </Svg>
      </LoopView>
    </View>
  );
}

/* ——— Motifs supplémentaires (fonds personnalisés) ——— */

const tone = (c: string, a: number) => rgba(c, a);

/** Pluie fine : traits qui tombent en biais. */
function Rain({ w, h, color, color2, seed, opacity, paused }: P) {
  const drops = useMemo(() => {
    const r = rng(seed + 11);
    return Array.from({ length: 28 }, (_, i) => ({
      x: r() * w * 1.2 - w * 0.1,
      len: 22 + r() * 44,
      ms: 2600 + r() * 3200,
      delay: r() * 4000,
      c: i % 3 === 0 ? color2 : color,
      a: 0.35 + r() * 0.5,
    }));
  }, [seed, w, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '9deg' }] }]}>
        {drops.map((d, i) => (
          <LoopView
            key={i}
            stops={[
              { at: 0, pose: { y: -90, opacity: 0 } },
              { at: 15, pose: { y: h * 0.1, opacity: d.a } },
              { at: 85, pose: { y: h * 0.95, opacity: d.a } },
              { at: 100, pose: { y: h * 1.1, opacity: 0 } },
            ]}
            ms={d.ms}
            delay={d.delay}
            yoyo={false}
            linear
            paused={paused}
            style={{ position: 'absolute', left: d.x, top: 0, width: 1.8, height: d.len, borderRadius: 1, backgroundColor: d.c, opacity: 0 }}
          />
        ))}
      </View>
    </View>
  );
}

/** Ondes : cercles qui s'élargissent en s'effaçant. */
function Ripples({ w, h, color, color2, seed, opacity, paused }: P) {
  const centers = useMemo(() => {
    const r = rng(seed + 5);
    return [
      { x: w * (0.2 + r() * 0.2), y: h * (0.15 + r() * 0.15), c: color },
      { x: w * (0.65 + r() * 0.25), y: h * (0.5 + r() * 0.15), c: color2 },
      { x: w * (0.25 + r() * 0.3), y: h * (0.82 + r() * 0.1), c: color },
    ];
  }, [seed, w, h, color, color2]);
  const size = Math.max(w, h) * 0.9;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {centers.flatMap((c, i) =>
        [0, 1, 2].map((k) => (
          <LoopView
            key={`${i}-${k}`}
            stops={[
              { at: 0, pose: { scale: 0.08, opacity: 0.75 } },
              { at: 100, pose: { scale: 1, opacity: 0 } },
            ]}
            ms={9000}
            delay={i * 1800 + k * 3000}
            yoyo={false}
            linear
            paused={paused}
            style={{ position: 'absolute', left: c.x - size / 2, top: c.y - size / 2, width: size, height: size, borderRadius: size / 2, borderWidth: 1.6, borderColor: c.c, opacity: 0 }}
          />
        )),
      )}
    </View>
  );
}

/** Étoiles qui scintillent doucement, par groupes. */
function Stars({ w, h, color, color2, seed, opacity, paused }: P) {
  const groups = useMemo(() => {
    const r = rng(seed + 3);
    return [0, 1, 2].map(() =>
      Array.from({ length: 16 }, () => ({ x: r() * w, y: r() * h, s: 1 + r() * 2.2, c: r() > 0.6 ? color2 : color })),
    );
  }, [seed, w, h, color, color2]);
  const ms = [3800, 5200, 4500];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {groups.map((g, i) => (
        <LoopView key={i} from={{ opacity: 0.12 }} to={{ opacity: 1 }} ms={ms[i]!} delay={i * 900} paused={paused} style={StyleSheet.absoluteFill}>
          <Svg width={w} height={h}>
            {g.map((s, k) => (
              <Circle key={k} cx={s.x} cy={s.y} r={s.s} fill={s.c} fillOpacity={0.9} />
            ))}
          </Svg>
        </LoopView>
      ))}
    </View>
  );
}

/** Bulles qui montent lentement. */
function Bubbles({ w, h, color, color2, seed, opacity, paused }: P) {
  const items = useMemo(() => {
    const r = rng(seed + 9);
    return Array.from({ length: 12 }, (_, i) => ({
      x: r() * w,
      size: 14 + r() * 40,
      c: i % 2 ? color : color2,
      ms: 9000 + r() * 9000,
      delay: r() * 8000,
    }));
  }, [seed, w, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {items.map((b, i) => (
        <LoopView
          key={i}
          stops={[
            { at: 0, pose: { x: 0, y: 0, opacity: 0 } },
            { at: 12, pose: { x: 6, y: -h * 0.1, opacity: 0.8 } },
            { at: 75, pose: { x: -14, y: -h * 0.7, opacity: 0.6 } },
            { at: 100, pose: { x: 8, y: -h * 0.95, opacity: 0 } },
          ]}
          ms={b.ms}
          delay={b.delay}
          yoyo={false}
          linear
          paused={paused}
          style={{ position: 'absolute', left: b.x, top: h - 10, width: b.size, height: b.size, borderRadius: b.size / 2, borderWidth: 1.5, borderColor: b.c, backgroundColor: tone(b.c, 0.1), opacity: 0 }}
        />
      ))}
    </View>
  );
}

/** Grille qui défile en diagonale. */
function Grid({ w, h, color, opacity, paused }: P) {
  const step = 46;
  const d = useMemo(() => {
    const parts: string[] = [];
    for (let x = 0; x <= w + step * 2; x += step) parts.push(`M ${x} 0 L ${x} ${h + step * 2}`);
    for (let y = 0; y <= h + step * 2; y += step) parts.push(`M 0 ${y} L ${w + step * 2} ${y}`);
    return parts.join(' ');
  }, [w, h]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      <LoopView from={{ x: 0, y: 0 }} to={{ x: -step, y: -step }} ms={9000} yoyo={false} linear paused={paused} style={{ position: 'absolute', left: 0, top: 0, width: w + step * 2, height: h + step * 2 }}>
        <Svg width={w + step * 2} height={h + step * 2}>
          <Path d={d} stroke={color} strokeOpacity={0.4} strokeWidth={1} fill="none" />
        </Svg>
      </LoopView>
    </View>
  );
}

/** Rayons de soleil qui tournent très lentement. */
function Rays({ w, h, color, color2, opacity, paused }: P) {
  const L = Math.hypot(w, h) * 1.15;
  const paths = useMemo(() => {
    const n = 20;
    return Array.from({ length: n }, (_, i) => {
      const a0 = ((Math.PI * 2) / n) * i;
      const a1 = a0 + (Math.PI * 2) / n / 2;
      const p = (a: number) => `${(L + L * Math.cos(a)).toFixed(1)} ${(L + L * Math.sin(a)).toFixed(1)}`;
      return `M ${L} ${L} L ${p(a0)} L ${p(a1)} Z`;
    });
  }, [L]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      <LoopView from={{ rotate: 0 }} to={{ rotate: 360 }} ms={140000} yoyo={false} linear paused={paused} style={{ position: 'absolute', left: w * 0.85 - L, top: -h * 0.05 - L, width: L * 2, height: L * 2 }}>
        <Svg width={L * 2} height={L * 2}>
          {paths.map((d, i) => (
            <Path key={i} d={d} fill={i % 2 ? color2 : color} fillOpacity={0.13} />
          ))}
        </Svg>
      </LoopView>
    </View>
  );
}

/** Facettes triangulaires qui pulsent en alternance. */
function Triangles({ w, h, color, color2, seed, opacity, paused }: P) {
  const s = 80;
  const groups = useMemo(() => {
    const r = rng(seed + 21);
    const a: Array<{ d: string; c: string; o: number }> = [];
    const b: Array<{ d: string; c: string; o: number }> = [];
    for (let row = -1; row * s < h + s; row++) {
      for (let col = -1; col * s < w + s; col++) {
        const x = col * s;
        const y = row * s;
        const t1 = `M ${x} ${y} L ${x + s} ${y} L ${x} ${y + s} Z`;
        const t2 = `M ${x + s} ${y} L ${x + s} ${y + s} L ${x} ${y + s} Z`;
        (r() > 0.5 ? a : b).push({ d: t1, c: r() > 0.5 ? color : color2, o: 0.04 + r() * 0.13 });
        (r() > 0.5 ? a : b).push({ d: t2, c: r() > 0.5 ? color : color2, o: 0.04 + r() * 0.13 });
      }
    }
    return [a, b];
  }, [w, h, seed, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {groups.map((g, i) => (
        <LoopView key={i} from={{ opacity: i ? 1 : 0.35 }} to={{ opacity: i ? 0.35 : 1 }} ms={7000} paused={paused} style={StyleSheet.absoluteFill}>
          <Svg width={w} height={h}>
            {g.map((t, k) => (
              <Path key={k} d={t.d} fill={t.c} fillOpacity={t.o} stroke={t.c} strokeOpacity={0.25} strokeWidth={0.8} />
            ))}
          </Svg>
        </LoopView>
      ))}
    </View>
  );
}

/** Dunes : grandes courbes douces qui dérivent. */
function Dunes({ w, h, color, color2, seed, opacity, paused }: P) {
  const L = Math.max(360, w * 1.6);
  const paths = useMemo(() => {
    const r = rng(seed + 2);
    return Array.from({ length: 4 }, (_, i) => {
      const base = h * (0.42 + i * 0.16);
      const amp = 26 + r() * 26;
      const phase = r() * Math.PI * 2;
      let d = `M 0 ${h}`;
      for (let x = 0; x <= w + L + 14; x += 14) d += ` L ${x} ${(base + amp * Math.sin((x / L) * Math.PI * 2 + phase)).toFixed(1)}`;
      return `${d} L ${w + L + 14} ${h} Z`;
    });
  }, [seed, w, h, L]);
  const speeds = [52000, 68000, 44000, 80000];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {paths.map((d, i) => (
        <LoopView key={i} from={{ x: i % 2 ? -L : 0 }} to={{ x: i % 2 ? 0 : -L }} ms={speeds[i]!} yoyo={false} linear paused={paused} style={{ position: 'absolute', left: 0, top: 0, width: w + L + 14, height: h }}>
          <Svg width={w + L + 14} height={h}>
            <Path d={d} fill={i % 2 ? color2 : color} fillOpacity={0.1 + i * 0.02} />
          </Svg>
        </LoopView>
      ))}
    </View>
  );
}

/** Chevrons qui défilent vers le haut. */
function Chevrons({ w, h, color, color2, opacity, paused }: P) {
  const cw = 64;
  const ch = 70;
  const d = useMemo(() => {
    const parts: string[] = [];
    for (let row = 0; row * ch < h + ch * 3; row++) {
      for (let col = -1; col * cw < w + cw; col++) {
        const x = col * cw + (row % 2 ? cw / 2 : 0);
        const y = row * ch;
        parts.push(`M ${x} ${y + 26} L ${x + cw / 2} ${y} L ${x + cw} ${y + 26}`);
      }
    }
    return parts.join(' ');
  }, [w, h]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      <LoopView from={{ y: 0 }} to={{ y: -ch * 2 }} ms={16000} yoyo={false} linear paused={paused} style={{ position: 'absolute', left: 0, top: 0, width: w + cw, height: h + ch * 3 }}>
        <Svg width={w + cw} height={h + ch * 3}>
          <Path d={d} stroke={color} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d={d} stroke={color2} strokeOpacity={0.18} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" transform={`translate(0 ${ch})`} />
        </Svg>
      </LoopView>
    </View>
  );
}

/** Confettis qui flottent et tournent doucement. */
function Confetti({ w, h, color, color2, seed, opacity, paused }: P) {
  const items = useMemo(() => {
    const r = rng(seed + 13);
    return Array.from({ length: 22 }, (_, i) => ({
      x: r() * w,
      y: r() * h,
      cw: 6 + r() * 6,
      chh: 3 + r() * 3,
      c: i % 2 ? color : color2,
      ms: 6000 + r() * 6000,
      delay: r() * 3000,
      rot: 60 + r() * 200,
      dy: 30 + r() * 60,
    }));
  }, [seed, w, h, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: opacity * 0.85, overflow: 'hidden' }]}>
      {items.map((c, i) => (
        <LoopView
          key={i}
          from={{ x: -14, y: 0, rotate: 0, opacity: 0.35 }}
          to={{ x: 14, y: c.dy, rotate: c.rot, opacity: 0.9 }}
          ms={c.ms}
          delay={c.delay}
          paused={paused}
          style={{ position: 'absolute', left: c.x, top: c.y, width: c.cw, height: c.chh, borderRadius: 1.5, backgroundColor: c.c }}
        />
      ))}
    </View>
  );
}

/** Aurore boréale : rubans lumineux verticaux qui ondulent. */
function AuroraBands({ w, h, color, color2, seed, opacity, paused }: P) {
  const bands = useMemo(() => {
    const r = rng(seed + 17);
    return Array.from({ length: 6 }, (_, i) => ({
      x: w * (0.0 + i * 0.18 + r() * 0.06),
      bw: w * (0.16 + r() * 0.12),
      c: i % 2 ? color2 : color,
      ms: 7000 + r() * 5000,
      delay: r() * 2500,
    }));
  }, [seed, w, color, color2]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity, overflow: 'hidden' }]}>
      {bands.map((b, i) => (
        <LoopView
          key={i}
          from={{ x: -34, scaleY: 0.82, opacity: 0.5 }}
          to={{ x: 34, scaleY: 1.06, opacity: 1 }}
          ms={b.ms}
          delay={b.delay}
          origin="center top"
          paused={paused}
          style={{ position: 'absolute', left: b.x, top: 0, width: b.bw, height: h * 0.85 }}
        >
          <LinearGradient colors={[tone(b.c, 0), tone(b.c, 0.34), tone(b.c, 0)]} locations={[0, 0.35, 1]} style={{ flex: 1, borderRadius: b.bw / 2 }} />
        </LoopView>
      ))}
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
          <TopoLines color={color} height={props.h} seed={seed} lines={14} opacity={0.3 * opacity} drift={3.6} paused={paused} />
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
        ) : kind === 'rain' ? (
          <Rain {...props} />
        ) : kind === 'ripples' ? (
          <Ripples {...props} />
        ) : kind === 'stars' ? (
          <Stars {...props} />
        ) : kind === 'bubbles' ? (
          <Bubbles {...props} />
        ) : kind === 'grid' ? (
          <Grid {...props} />
        ) : kind === 'rays' ? (
          <Rays {...props} />
        ) : kind === 'triangles' ? (
          <Triangles {...props} />
        ) : kind === 'dunes' ? (
          <Dunes {...props} />
        ) : kind === 'chevrons' ? (
          <Chevrons {...props} />
        ) : kind === 'confetti' ? (
          <Confetti {...props} />
        ) : kind === 'aurora' ? (
          <AuroraBands {...props} />
        ) : (
          <Dots {...props} />
        )
      ) : null}
    </View>
  );
}
