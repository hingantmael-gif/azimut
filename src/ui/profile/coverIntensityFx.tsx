import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import type { CoverIntensity } from '../../engines/coverIntensity';

let gradSeq = 0;
function nextGradId(prefix: string) {
  gradSeq += 1;
  return `${prefix}-${gradSeq}`;
}

function useLoop(duration: number, easing: (v: number) => number = Easing.linear) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: Math.max(400, duration), easing, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, easing]);
  return v;
}

function usePulse(up = 900, down = 900) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: Math.max(200, up),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: Math.max(200, down),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, up, down]);
  return v;
}

function CoverGrad({
  c0,
  c1,
  c2,
  height,
  horizontal,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  horizontal?: boolean;
}) {
  const gradId = useRef(nextGradId('cig')).current;
  const { width: winW } = useWindowDimensions();
  const w = Math.min(winW, 480);
  return (
    <Svg
      width="100%"
      height={height}
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient
          id={gradId}
          x1="0%"
          y1="0%"
          x2={horizontal ? '100%' : '0%'}
          y2={horizontal ? '0%' : '100%'}
        >
          <Stop offset="0%" stopColor={c0} />
          <Stop offset="45%" stopColor={c1} />
          <Stop offset="100%" stopColor={c2} stopOpacity="0.85" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={height} fill={`url(#${gradId})`} />
    </Svg>
  );
}

function Shimmer({ color, height, duration = 2400 }: { color: string; height: number; duration?: number }) {
  const t = useLoop(duration, Easing.inOut(Easing.quad));
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -20,
        bottom: -20,
        width: 56,
        backgroundColor: color,
        opacity: 0.22,
        transform: [
          {
            translateX: t.interpolate({
              inputRange: [0, 1],
              outputRange: [-80, 420],
            }),
          },
          { skewX: '-18deg' },
        ],
      }}
    />
  );
}

function RisingEmber({
  left,
  delay,
  size,
  color,
  height,
  duration = 1800,
}: {
  left: number;
  delay: number;
  size: number;
  color: string;
  height: number;
  duration?: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${left}%`,
        bottom: 8,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
        transform: [
          {
            translateY: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -height * 0.85],
            }),
          },
          {
            translateX: t.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 8, -6],
            }),
          },
        ],
      }}
    />
  );
}

type FxBase = {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  intensity: CoverIntensity;
};

/* ——— Bronze : flammes ——— */
export function FxFlamesIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const count = intensity.flameCount;
  const hRatio = intensity.flameHeightRatio;
  const loop = intensity.loopMs;
  const tip = intensity.division === 1 ? '#D97706' : c2;
  const base = intensity.division === 3 ? '#92400E' : c1;

  const tongues = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 2 + i * (96 / Math.max(count, 1)),
        w: 10 + (i % 5) * (intensity.density > 0.5 ? 7 : 5),
        delay: i * Math.round(loop / Math.max(count * 1.2, 4)),
        h: height * (hRatio * 0.85 + (i % 5) * 0.03),
      })),
    [count, height, hRatio, loop, intensity.density],
  );
  const sparks = useMemo(
    () =>
      Array.from({ length: intensity.sparkCount }, (_, i) => ({
        id: i,
        left: 6 + ((i * 17) % 88),
        delay: i * 140,
        size: 2 + (i % 3),
      })),
    [intensity.sparkCount],
  );

  const heat = usePulse(Math.round(loop * 0.9), Math.round(loop * 0.9));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={base} c2={tip} height={height} />
      <View style={[styles.heatFloor, { backgroundColor: tip, height: height * hRatio * 1.15, opacity: 0.35 }]} />
      {intensity.division !== 3 ? (
        <Animated.View
          style={[
            styles.heatFloor,
            {
              backgroundColor: base,
              height: height * 0.12,
              opacity: heat.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }),
              transform: [
                {
                  scaleY: heat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.08],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
      {tongues.map((t) => (
        <FlameTongue key={t.id} {...t} c1={base} c2={tip} duration={Math.round(loop * 0.55)} />
      ))}
      {sparks.map((e) => (
        <RisingEmber
          key={`e-${e.id}`}
          {...e}
          color={tip}
          height={height}
          duration={Math.round(loop * 0.85)}
        />
      ))}
      {intensity.glow > 0.35 ? <Shimmer color={tip} height={height} duration={loop} /> : null}
    </View>
  );
}

function FlameTongue({
  left,
  w,
  delay,
  h,
  c1,
  c2,
  duration,
}: {
  left: number;
  w: number;
  delay: number;
  h: number;
  c1: string;
  c2: string;
  duration: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -10,
        left: `${left}%`,
        width: w,
        height: h,
        borderTopLeftRadius: w,
        borderTopRightRadius: w,
        backgroundColor: c2,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
        transform: [
          { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-3, 4] }) },
        ],
      }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: w * 0.18,
          width: w * 0.55,
          height: h * 0.55,
          borderTopLeftRadius: w,
          borderTopRightRadius: w,
          backgroundColor: c1,
          opacity: 0.75,
        }}
      />
    </Animated.View>
  );
}

/* ——— Argent : mercure ——— */
export function FxMercuryIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const dropsN = intensity.mercuryDrops;
  const loop = intensity.loopMs;
  const a = useLoop(loop, Easing.inOut(Easing.sin));
  const b = useLoop(loop * 1.25, Easing.inOut(Easing.sin));
  const c = useLoop(loop * 0.75, Easing.inOut(Easing.sin));
  const div = intensity.division ?? 1;

  const streams = div >= 2 ? Math.min(dropsN, 8) : 0;
  const pool = div === 1;

  const drops = useMemo(
    () =>
      Array.from({ length: dropsN }, (_, i) => ({
        id: i,
        left: 6 + ((i * 19) % 88),
        top: div === 3 ? 12 + (i % 4) * 18 : 4 + (i % 6) * 12,
        s: 10 + (i % 5) * (div === 1 ? 7 : 4),
      })),
    [dropsN, div],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} horizontal />
      {streams > 0
        ? Array.from({ length: streams }, (_, i) => (
            <Animated.View
              key={`st-${i}`}
              style={{
                position: 'absolute',
                left: `${8 + i * (80 / streams)}%`,
                top: -10,
                width: 6 + (i % 3) * 3,
                height: height * 1.2,
                borderRadius: 20,
                backgroundColor: i % 2 ? c2 : c1,
                opacity: 0.35 + intensity.density * 0.25,
                transform: [
                  {
                    translateY: (i % 2 ? b : a).interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, height * 0.15],
                    }),
                  },
                  {
                    scaleX: c.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.7, 1.4, 0.8],
                    }),
                  },
                ],
              }}
            />
          ))
        : null}
      {pool ? (
        <Animated.View
          style={[
            styles.heatFloor,
            {
              backgroundColor: c2,
              height: height * 0.28,
              opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] }),
              transform: [
                {
                  scaleY: b.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.85, 1.15, 0.9],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
      {drops.map((d, i) => (
        <Animated.View
          key={d.id}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.s,
            height: d.s * (div === 3 ? 1.1 : 1.35),
            borderRadius: d.s,
            backgroundColor: i % 2 ? c2 : '#FFFFFF',
            opacity: c.interpolate({
              inputRange: [0, 1],
              outputRange: i % 2 ? [0.3, 0.85] : [0.75, 0.35],
            }),
            transform: [
              {
                translateY: a.interpolate({
                  inputRange: [0, 1],
                  outputRange:
                    div === 3 ? [-4, 6] : i % 2 ? [-14, 18] : [16, -14],
                }),
              },
              {
                scaleX: b.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: div === 3 ? [0.9, 1.05, 0.95] : [0.65, 1.4, 0.75],
                }),
              },
            ],
          }}
        />
      ))}
      {intensity.glow > 0.4 ? <Shimmer color="#FFFFFF" height={height} duration={loop} /> : null}
    </View>
  );
}

/* ——— Or : liquid-gold ——— */
export function FxLiquidGoldIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const streamN = intensity.goldStreams;
  const loop = intensity.loopMs;
  const t = useLoop(loop, Easing.inOut(Easing.quad));
  const shine = usePulse(Math.round(loop * 0.55), Math.round(loop * 0.55));
  const div = intensity.division ?? 1;
  const splash = div === 1;

  const sparks = useMemo(
    () =>
      Array.from({ length: intensity.sparkCount }, (_, i) => ({
        id: i,
        left: 4 + ((i * 11) % 92),
        top: 8 + (i % 6) * 14,
        animated: div !== 3,
      })),
    [intensity.sparkCount, div],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <View
        style={[
          styles.heatFloor,
          { backgroundColor: c2, height: height * (0.22 + intensity.density * 0.18), opacity: 0.32 },
        ]}
      />
      {Array.from({ length: streamN }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${div === 1 ? 0 : 4 + i * (90 / streamN)}%`,
            width: div === 1 ? 28 + (i % 4) * 10 : 18 + (i % 3) * 8,
            height: height * 1.35,
            top: -height * 0.15,
            borderRadius: 40,
            backgroundColor: i % 2 ? c2 : c1,
            opacity: 0.35 + intensity.density * 0.2,
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 === 0 ? [-24, 28] : [28, -24],
                }),
              },
              {
                scaleX: t.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.65, 1.4, 0.75],
                }),
              },
            ],
          }}
        />
      ))}
      {splash ? (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 4,
            left: '15%',
            width: '70%',
            height: height * 0.14,
            borderRadius: 40,
            backgroundColor: '#FFE08A',
            opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
            transform: [
              {
                scaleX: shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1.2],
                }),
              },
            ],
          }}
        />
      ) : null}
      {sparks.map((s, i) => (
        <Animated.View
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            borderRadius: 4,
            backgroundColor: '#FFF8DC',
            opacity: s.animated
              ? shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [0.15, 1] : [0.9, 0.25],
                })
              : 0.45,
            transform: s.animated
              ? [
                  {
                    scale: shine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.45],
                    }),
                  },
                ]
              : undefined,
          }}
        />
      ))}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c2,
            opacity: shine.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, 0.08 + intensity.glow * 0.22],
            }),
          },
        ]}
      />
      {intensity.glow > 0.35 ? <Shimmer color="#FFF8DC" height={height} duration={loop} /> : null}
    </View>
  );
}

/* ——— Diamant ——— */
export function FxCrystalsIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const count = intensity.crystalCount;
  const loop = intensity.loopMs;
  const flash = usePulse(Math.round(loop * 1.4), Math.round(loop * 2.2));
  const div = intensity.division ?? 1;

  const diamonds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 2 + ((i * 37) % 94),
        size: 8 + (i % 5) * (div === 1 ? 5 : 3),
        delay: (i * Math.round(loop / Math.max(count, 4))) % Math.round(loop * 1.4),
        duration: Math.round(loop * (0.9 + (i % 5) * 0.15) * (div === 3 ? 1.35 : div === 2 ? 1 : 0.75)),
        drift: 6 + (i % 5) * 5,
        spin: div !== 3,
        trail: div === 1,
      })),
    [count, loop, div],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {div === 1 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#2563EB',
              opacity: flash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.18, 0] }),
            },
          ]}
        />
      ) : null}
      {diamonds.map((d) => (
        <FallingDiamond key={d.id} {...d} height={height} fill={d.id % 3 === 0 ? '#93C5FD' : d.id % 2 ? c2 : c1} />
      ))}
      {intensity.glow > 0.4 ? <Shimmer color="#E0F2FE" height={height} duration={loop} /> : null}
    </View>
  );
}

function FallingDiamond({
  left,
  size,
  delay,
  duration,
  drift,
  spin,
  height,
  fill,
  trail,
}: {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: boolean;
  height: number;
  fill: string;
  trail?: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);

  const w = size;
  const h = size * 1.25;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: -h,
        width: w,
        height: h,
        opacity: t.interpolate({
          inputRange: [0, 0.08, 0.75, 1],
          outputRange: [0, 0.95, 0.75, 0],
        }),
        transform: [
          {
            translateY: t.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height + h * 2],
            }),
          },
          {
            translateX: t.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, spin ? drift : -drift, spin ? -drift * 0.4 : drift * 0.4],
            }),
          },
          {
            rotate: t.interpolate({
              inputRange: [0, 1],
              outputRange: spin ? ['0deg', '280deg'] : ['0deg', '-40deg'],
            }),
          },
          {
            scale: t.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [0.55, 1.05, 0.85],
            }),
          },
        ],
      }}
    >
      {trail ? (
        <View
          style={{
            position: 'absolute',
            top: -size * 0.8,
            left: size * 0.35,
            width: 2,
            height: size * 0.9,
            backgroundColor: fill,
            opacity: 0.35,
          }}
        />
      ) : null}
      <Svg width={w} height={h} viewBox="0 0 40 50">
        <Polygon points="20,2 36,18 20,48 4,18" fill={fill} opacity={0.9} />
        <Polygon points="20,2 28,18 20,18" fill="#FFFFFF" opacity={0.55} />
        <Polygon points="20,2 12,18 20,18" fill="#FFFFFF" opacity={0.28} />
        <Path d="M4 18 L36 18" stroke="#EFF6FF" strokeWidth={1.2} opacity={0.65} />
      </Svg>
    </Animated.View>
  );
}

/* ——— Platine ——— */
export function FxRippleIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const rings = intensity.rippleRings;
  const loop = intensity.loopMs;
  const t = useLoop(loop, Easing.out(Easing.quad));
  const t2 = useLoop(loop * 1.35, Easing.out(Easing.quad));
  const wash = usePulse(Math.round(loop * 0.55), Math.round(loop * 0.55));
  const div = intensity.division ?? 1;
  const sources =
    div === 1
      ? [
          { x: 50, y: 42 },
          { x: 28, y: 58 },
          { x: 72, y: 55 },
        ]
      : [{ x: 50, y: 42 }];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: c1,
            width: height * 1.4,
            height: height * 1.4,
            top: height * 0.05,
            alignSelf: 'center',
            left: '14%',
            opacity: wash.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.18 + intensity.glow * 0.35],
            }),
          },
        ]}
      />
      {sources.flatMap((src, si) =>
        Array.from({ length: Math.ceil(rings / sources.length) }, (_, i) => {
          const clock = (i + si) % 2 ? t2 : t;
          return (
            <Animated.View
              key={`${si}-${i}`}
              style={{
                position: 'absolute',
                left: `${src.x}%`,
                top: `${src.y}%`,
                marginLeft: -22,
                marginTop: -22,
                width: 44,
                height: 44,
                borderRadius: 22,
                borderWidth: 2 + (div === 1 ? 0.5 : 0),
                borderColor: i % 2 ? c2 : c1,
                opacity: clock.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8 - i * 0.05, 0],
                }),
                transform: [
                  {
                    scale: clock.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2 + i * 0.06, 5.2 + i * 0.35],
                    }),
                  },
                ],
              }}
            />
          );
        }),
      )}
      {intensity.glow > 0.45 ? <Shimmer color="#CCFBF1" height={height} duration={loop} /> : null}
    </View>
  );
}

/* ——— Élite ——— */
export function FxBoltsIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const n = intensity.boltCount;
  const loop = intensity.loopMs;
  const div = intensity.division ?? 1;
  const flashUp = div === 1 ? 120 : div === 2 ? 160 : 220;
  const flashDown = div === 1 ? 380 : div === 2 ? 520 : 900;
  const flash = usePulse(flashUp, flashDown);
  const drift = useLoop(loop * 0.7, Easing.inOut(Easing.sin));
  const glowPulse = usePulse(Math.round(loop * 0.5), Math.round(loop * 0.5));

  const bolts = useMemo(() => {
    const base = [
      {
        d: `M40 8 L55 ${height * 0.35} L42 ${height * 0.38} L62 ${height * 0.92} L48 ${height * 0.55} L60 ${height * 0.5} Z`,
        left: 8,
      },
      {
        d: `M30 4 L48 ${height * 0.4} L34 ${height * 0.42} L58 ${height * 0.95} L40 ${height * 0.58} L52 ${height * 0.52} Z`,
        left: 85,
      },
      {
        d: `M35 10 L50 ${height * 0.32} L38 ${height * 0.36} L55 ${height * 0.88} L42 ${height * 0.5} L54 ${height * 0.46} Z`,
        left: 165,
      },
      {
        d: `M28 6 L44 ${height * 0.36} L32 ${height * 0.4} L52 ${height * 0.9} L38 ${height * 0.54} L48 ${height * 0.48} Z`,
        left: 45,
      },
      {
        d: `M38 12 L52 ${height * 0.3} L40 ${height * 0.34} L60 ${height * 0.86} L46 ${height * 0.5} L56 ${height * 0.44} Z`,
        left: 220,
      },
      {
        d: `M32 5 L50 ${height * 0.34} L36 ${height * 0.38} L56 ${height * 0.9} L42 ${height * 0.52} L54 ${height * 0.47} Z`,
        left: 125,
      },
      {
        d: `M36 8 L48 ${height * 0.28} L40 ${height * 0.32} L58 ${height * 0.8} L44 ${height * 0.48} L52 ${height * 0.42} Z`,
        left: 190,
      },
    ];
    return base.slice(0, n);
  }, [height, n]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {div === 1 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#7C3AED',
              opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.16] }),
            },
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c2,
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, 0.2 + intensity.glow * 0.28],
            }),
          },
        ]}
      />
      <Animated.View
        style={{
          ...StyleSheet.absoluteFill,
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 12],
              }),
            },
          ],
        }}
      >
        <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
          {bolts.map((b, i) => (
            <Path
              key={`s-${i}`}
              d={b.d}
              fill={i % 2 ? '#FFF' : c2}
              opacity={div >= 2 ? 0.45 : 0.25}
              transform={`translate(${b.left}, 0)`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: flash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 1, 0.15] }),
          },
        ]}
      >
        <Svg width="100%" height={height}>
          {bolts.map((b, i) => (
            <Path key={`f-${i}`} d={b.d} fill={i % 2 ? '#FFF' : c2} transform={`translate(${b.left}, 0)`} />
          ))}
        </Svg>
      </Animated.View>
      {intensity.sparkCount > 0
        ? Array.from({ length: Math.min(intensity.sparkCount, 12) }, (_, i) => (
            <RisingEmber
              key={`bs-${i}`}
              left={4 + ((i * 19) % 90)}
              delay={i * 90}
              size={2 + (i % 3)}
              color="#E9D5FF"
              height={height}
              duration={Math.round(loop * 0.6)}
            />
          ))
        : null}
    </View>
  );
}

/* ——— Champion : séquence ~12–15 s ——— */
export function FxChampionApex({ c0, c1, c2, height, intensity }: FxBase) {
  const cycle = useLoop(intensity.reducedMotion ? 20000 : 14000, Easing.linear);
  const gold = useLoop(intensity.loopMs, Easing.inOut(Easing.quad));
  const pulse = usePulse(1600, 1600);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1="#D97706" c2="#FBBF24" height={height} />
      {/* Liseré rouge Champion */}
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFill,
          borderWidth: 2,
          borderColor: '#DC2626',
          opacity: 0.55,
        }}
      />
      {/* Phase or permanente */}
      <View style={[styles.heatFloor, { backgroundColor: '#D97706', height: height * 0.42, opacity: 0.4 }]} />
      {Array.from({ length: intensity.goldStreams }, (_, i) => (
        <Animated.View
          key={`g-${i}`}
          style={{
            position: 'absolute',
            left: `${i * (100 / intensity.goldStreams)}%`,
            width: 26 + (i % 3) * 8,
            height: height * 1.3,
            top: -height * 0.1,
            borderRadius: 40,
            backgroundColor: i % 2 ? '#FBBF24' : '#D97706',
            opacity: 0.45,
            transform: [
              {
                translateY: gold.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [-20, 24] : [24, -20],
                }),
              },
            ],
          }}
        />
      ))}
      {/* Écho Bronze ~2s / 14s ≈ 0.14 */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: cycle.interpolate({
              inputRange: [0, 0.1, 0.18, 0.25],
              outputRange: [0, 0.35, 0.35, 0],
            }),
          },
        ]}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${10 + i * 16}%`,
              width: 16,
              height: height * 0.22,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              backgroundColor: '#F59E0B',
              opacity: 0.7,
            }}
          />
        ))}
      </Animated.View>
      {/* Écho mercure ~5s */}
      <Animated.View
        style={[
          styles.heatFloor,
          {
            height: height * 0.3,
            backgroundColor: '#E2E8F0',
            opacity: cycle.interpolate({
              inputRange: [0.28, 0.35, 0.45, 0.52],
              outputRange: [0, 0.4, 0.4, 0],
            }),
          },
        ]}
      />
      {/* Écho diamant ~8s */}
      <Animated.View
        style={{
          position: 'absolute',
          left: '40%',
          top: 8,
          width: 14,
          height: 18,
          opacity: cycle.interpolate({
            inputRange: [0.5, 0.55, 0.62, 0.68],
            outputRange: [0, 0.9, 0.9, 0],
          }),
          transform: [
            {
              translateY: cycle.interpolate({
                inputRange: [0.5, 0.68],
                outputRange: [0, height * 0.7],
              }),
            },
            { rotate: '25deg' },
          ],
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#FDE68A', borderRadius: 2, opacity: 0.9 }} />
      </Animated.View>
      {/* Écho platine ~10s */}
      <Animated.View
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          marginLeft: -20,
          marginTop: -20,
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: '#FBBF24',
          opacity: cycle.interpolate({
            inputRange: [0.68, 0.72, 0.82],
            outputRange: [0.7, 0.4, 0],
          }),
          transform: [
            {
              scale: cycle.interpolate({
                inputRange: [0.68, 0.82],
                outputRange: [0.4, 5],
              }),
            },
          ],
        }}
      />
      {/* Écho élite ~13s */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: cycle.interpolate({
              inputRange: [0.88, 0.91, 0.95, 1],
              outputRange: [0, 0.85, 0.85, 0],
            }),
          },
        ]}
      >
        <Svg width="100%" height={height}>
          <Path
            d={`M50 6 L62 ${height * 0.35} L52 ${height * 0.38} L70 ${height * 0.9} L56 ${height * 0.52} L66 ${height * 0.48} Z`}
            fill="#FBBF24"
            transform="translate(40,0)"
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#FBBF24',
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.04, 0.12 + intensity.glow * 0.1],
            }),
          },
        ]}
      />
    </View>
  );
}

/* ——— Premium max ——— */
export function FxAuroraVeilIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const a = useLoop(intensity.loopMs * 1.2, Easing.inOut(Easing.sin));
  const b = useLoop(intensity.loopMs * 1.6, Easing.inOut(Easing.sin));
  const c = useLoop(intensity.loopMs * 0.95, Easing.inOut(Easing.sin));
  const d = useLoop(intensity.loopMs * 1.4, Easing.inOut(Easing.sin));
  const clocks = [a, b, c, d];
  const bands = [
    { col: '#3DFF9A', top: 0.1, h: 0.24 },
    { col: c2, top: 0.28, h: 0.22 },
    { col: '#D4FF3F', top: 0.46, h: 0.18 },
    { col: '#0A6B54', top: 0.64, h: 0.22 },
  ];
  const stars = useMemo(
    () =>
      Array.from({ length: Math.round(18 * (intensity.reducedMotion ? 0.4 : 1)) }, (_, i) => ({
        id: i,
        left: 4 + ((i * 23) % 92),
        top: 6 + ((i * 17) % 70),
        delay: i * 180,
      })),
    [intensity.reducedMotion],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {bands.map((band, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: '-30%',
            width: '160%',
            height: height * band.h,
            top: height * band.top,
            borderRadius: 70,
            backgroundColor: band.col,
            opacity: 0.32,
            transform: [
              {
                translateX: clocks[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [50, -60] : [-55, 48],
                }),
              },
              {
                scaleY: clocks[(i + 1) % 4].interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.3, 0.85],
                }),
              },
              { rotate: `${(i - 1.5) * 3}deg` },
            ],
          }}
        />
      ))}
      {stars.map((s) => (
        <StarTwinkle key={s.id} {...s} />
      ))}
    </View>
  );
}

function StarTwinkle({ left, top, delay }: { left: number; top: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        width: 2,
        height: 2,
        borderRadius: 2,
        backgroundColor: '#ECFDF5',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.95] }),
      }}
    />
  );
}

export function FxCyberHexIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const wave = useLoop(3000, Easing.inOut(Easing.sin));
  const echo = useLoop(3000, Easing.inOut(Easing.quad));
  const live = usePulse(1400, 1400);
  const cells = useMemo(() => {
    const out: { left: number; top: number; id: number }[] = [];
    let id = 0;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        out.push({
          id: id++,
          left: 4 + col * 16 + (row % 2) * 8,
          top: 8 + row * 22,
        });
      }
    }
    return out;
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {cells.map((cell, i) => (
        <Animated.View
          key={cell.id}
          style={{
            position: 'absolute',
            left: `${cell.left}%`,
            top: `${cell.top}%`,
            width: 28,
            height: 32,
            borderWidth: 1.2,
            borderColor: i % 3 === 0 ? '#D4FF3F' : c2,
            borderRadius: 6,
            opacity: wave.interpolate({
              inputRange: [0, 0.35, 0.55, 1],
              outputRange: [
                0.12,
                i % 7 === 0 ? 0.75 : 0.22,
                i % 5 === 0 ? 0.65 : 0.2,
                0.14,
              ],
            }),
            transform: [
              {
                scale:
                  i % 11 === 0
                    ? live.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] })
                    : echo.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.95, 1.04, 0.96],
                      }),
              },
            ],
          }}
        />
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          width: 3,
          height: height * 1.4,
          backgroundColor: '#3DFF9A',
          opacity: 0.35,
          transform: [
            {
              translateX: wave.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 420],
              }),
            },
            { rotate: '28deg' },
          ],
        }}
      />
    </View>
  );
}

export function FxMaelstromIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const spin = useLoop(intensity.reducedMotion ? 22000 : 15000);
  const spinR = useLoop(intensity.reducedMotion ? 28000 : 19000);
  const pulse = usePulse(2200, 2200);
  const size = Math.max(height * 0.9, 96);
  const bubbles = useMemo(
    () =>
      Array.from({ length: Math.round(14 * (intensity.reducedMotion ? 0.4 : 1)) }, (_, i) => ({
        id: i,
        angle: (i / 14) * Math.PI * 2,
        r: 0.25 + (i % 5) * 0.12,
        delay: i * 110,
      })),
    [intensity.reducedMotion],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1="#0A6B54" c2="#06B6D4" height={height} />
      <View style={styles.centerFill}>
        {[0.55, 0.8, 1.05, 1.35].map((mult, i) => (
          <Animated.View
            key={mult}
            style={{
              position: 'absolute',
              width: size * mult,
              height: size * mult,
              borderRadius: (size * mult) / 2,
              borderWidth: 2,
              borderColor: i % 2 ? c2 : c1,
              borderTopColor: 'transparent',
              opacity: 0.35 + i * 0.05,
              transform: [
                {
                  rotate: (i % 2 ? spinR : spin).interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', i % 2 ? '-360deg' : '360deg'],
                  }),
                },
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1.05],
                  }),
                },
              ],
            }}
          />
        ))}
        {bubbles.map((b) => (
          <BubbleOrbit key={b.id} {...b} size={size} spin={spin} color="#99F6E4" />
        ))}
      </View>
    </View>
  );
}

function BubbleOrbit({
  angle,
  r,
  delay,
  size,
  spin,
  color,
}: {
  angle: number;
  r: number;
  delay: number;
  size: number;
  spin: Animated.Value;
  color: string;
}) {
  const pulse = usePulse(900 + delay * 0.2, 900);
  const x = Math.cos(angle) * size * r;
  const y = Math.sin(angle) * size * r * 0.55;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 4,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.8] }),
        transform: [
          {
            rotate: spin.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            }),
          },
          { translateX: x },
          { translateY: y },
        ],
      }}
    />
  );
}

export function FxInfernoIntense({ c0, c1, c2, height, intensity }: FxBase) {
  const wash = useLoop(intensity.loopMs, Easing.inOut(Easing.sin));
  const glow = usePulse(Math.round(intensity.loopMs * 0.45), Math.round(intensity.loopMs * 0.45));
  const heat = usePulse(700, 700);
  const tongues = intensity.flameCount;
  const sparks = intensity.sparkCount;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1="#7C2D12" c2="#F97316" height={height} />
      {/* Fumée */}
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={`sm-${i}`}
          style={{
            position: 'absolute',
            left: `${15 + i * 25}%`,
            bottom: height * 0.35,
            width: 70,
            height: height * 0.55,
            borderRadius: 40,
            backgroundColor: '#1C1917',
            opacity: wash.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.2],
            }),
            transform: [
              {
                translateY: wash.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -30],
                }),
              },
              {
                scaleX: wash.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.3, 0.9],
                }),
              },
            ],
          }}
        />
      ))}
      {Array.from({ length: tongues }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            bottom: -16,
            left: `${(i / tongues) * 96}%`,
            width: 22 + (i % 4) * 8,
            height: height * (0.4 + (i % 5) * 0.06),
            borderTopLeftRadius: 40,
            borderTopRightRadius: 28,
            backgroundColor: i % 3 === 0 ? '#FED7AA' : i % 2 ? '#F97316' : '#7C2D12',
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }),
            transform: [
              {
                scaleY: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1.2],
                }),
              },
              {
                translateX: wash.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [8, -8] : [-6, 10],
                }),
              },
            ],
          }}
        />
      ))}
      {/* Distorsion thermique */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: heat.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.08] }),
            backgroundColor: '#FED7AA',
            transform: [
              {
                translateY: heat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-1.5, 1.5],
                }),
              },
            ],
          },
        ]}
      />
      {Array.from({ length: sparks }, (_, i) => (
        <RisingEmber
          key={`inf-${i}`}
          left={4 + ((i * 13) % 92)}
          delay={i * 70}
          size={2 + (i % 4)}
          color="#FED7AA"
          height={height}
          duration={Math.round(intensity.loopMs * 0.7)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heatFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  centerFill: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
