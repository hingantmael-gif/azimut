import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../Text';
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Polygon } from 'react-native-svg';
import { LinearGradient as FinishGradient } from 'expo-linear-gradient';
import { seedFromString } from '../../engines/topoLines';
import { TopoLines } from './TopoLines';
import { TierAmbience } from './TierAmbience';
import { TierStage } from './TierStage';
import {
  formatPersonalBestCoverLabel,
  getProfileCover,
  type CoverDistanceSport,
  type ProfileCoverDef,
  type ProfileCoverVisual,
} from '../../engines/profileCovers';
import {
  resolvePremiumCoverIntensity,
  resolveRankCoverIntensity,
  type CoverIntensity,
} from '../../engines/coverIntensity';
import type { RankTier } from '../../types/domain';
import type { RankDivision } from '../../engines/rankedLadder';
import { normalizeTier } from '../../engines/rankedLadder';
import { RankBadge, rimColors } from '../ranked/RankBadge';
import {
  FxAuroraVeilIntense,
  FxBoltsIntense,
  FxChampionApex,
  FxCrystalsIntense,
  FxCyberHexIntense,
  FxFlamesIntense,
  FxInfernoIntense,
  FxLiquidGoldIntense,
  FxMaelstromIntense,
  FxMercuryIntense,
  FxRippleIntense,
} from './coverIntensityFx';

const H = 136;

/** Intensité visuelle du crest : bronze = base, champion = max */
function crestTierLevel(tier: RankTier): number {
  switch (normalizeTier(tier)) {
    case 'bronze':
      return 1;
    case 'argent':
      return 2;
    case 'or':
      return 3;
    case 'diamant':
      return 4;
    case 'platine':
      return 5;
    case 'elite':
      return 6;
    case 'champion':
      return 7;
    default:
      return 1;
  }
}
let gradSeq = 0;
function nextGradId(prefix: string) {
  gradSeq += 1;
  return `${prefix}-${gradSeq}`;
}

/**
 * Finition commune à tous les fonds : vignettage bas (lisibilité du texte posé dessus),
 * reflet de lumière en biais et liseré intérieur. Ne masque ni les effets ni les logos de rang.
 */
function CoverFinish({ radius = 0 }: { radius?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <FinishGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      <FinishGradient
        colors={['rgba(0,0,0,0)', 'rgba(3,8,18,0.5)']}
        locations={[0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
        ]}
      />
    </View>
  );
}

type Props = {
  coverId?: string;
  height?: number;
  /** Records (km) pour les fonds « record perso » */
  personalBestKm?: Partial<Record<CoverDistanceSport, number>>;
};

export function ProfileCover({ coverId, height = H, personalBestKm }: Props) {
  const cover = getProfileCover(coverId);
  const opacity = useRef(new Animated.Value(1)).current;
  const prevId = useRef(coverId);

  useEffect(() => {
    if (prevId.current === coverId) return;
    prevId.current = coverId;
    // Transition de palier : dissolve (cohérent GlobalLevelUpHost / brief §9.3)
    opacity.setValue(0.15);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [coverId, opacity]);

  return (
    <View style={[styles.root, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <Scene cover={cover} height={height} personalBestKm={personalBestKm} />
      </Animated.View>
      {/* Courbes de niveau : jamais sur les fonds de rang (le logo de rang reste net). */}
      {cover.unlock.type !== 'rank' ? (
        <TopoLines color={cover.colors[2]} height={height} seed={seedFromString(cover.id)} />
      ) : (
        <TierAmbience color={cover.colors[2]} height={height} seed={seedFromString(cover.id)} />
      )}
      <CoverFinish />
      {cover.watermark ? (
        <View style={styles.markWrap} pointerEvents="none">
          <View style={styles.markPill}>
            <Text style={styles.watermark}>{cover.watermark}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ProfileCoverPreview({
  cover,
  selected,
  personalBestKm,
}: {
  cover: ProfileCoverDef;
  selected?: boolean;
  personalBestKm?: Partial<Record<CoverDistanceSport, number>>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.preview,
        selected && styles.previewSelected,
        { borderColor: selected ? cover.colors[2] : 'transparent' },
      ]}
    >
      <Scene cover={cover} height={84} compact personalBestKm={personalBestKm} />
      {cover.unlock.type !== 'rank' ? (
        <TopoLines color={cover.colors[2]} height={84} seed={seedFromString(cover.id)} lines={8} opacity={0.34} />
      ) : (
        <TierAmbience color={cover.colors[2]} height={84} seed={seedFromString(cover.id)} count={6} />
      )}
      <CoverFinish radius={14} />
      {cover.watermark ? (
        <View style={styles.previewMarkPill}>
          <Text style={styles.previewMark}>{cover.watermark}</Text>
        </View>
      ) : null}
    </View>
  );
}

function resolveDistanceHero(
  cover: ProfileCoverDef,
  personalBestKm?: Partial<Record<CoverDistanceSport, number>>,
): { label: string; subtitle?: string; mood: KmHeroMood } {
  if (cover.unlock.type === 'personal_best') {
    const km = personalBestKm?.[cover.unlock.sport] ?? 0;
    const { primary } = formatPersonalBestCoverLabel(km);
    const sportLabel =
      cover.unlock.sport === 'bike'
        ? 'Record vélo'
        : cover.unlock.sport === 'swim'
          ? 'Record natation'
          : 'Course à pied · record';
    return {
      label: primary,
      subtitle: sportLabel,
      mood: cover.unlock.sport === 'bike' ? 'pb-bike' : cover.unlock.sport === 'swim' ? 'pb-swim' : 'pb-run',
    };
  }
  const badge = cover.distanceBadge ?? '—';
  if (cover.visual === 'bike-km' || (cover.unlock.type === 'distance' && cover.unlock.sport === 'bike')) {
    return { label: badge, subtitle: 'Vélo', mood: 'bike' };
  }
  if (cover.visual === 'swim-km' || (cover.unlock.type === 'distance' && cover.unlock.sport === 'swim')) {
    return { label: badge, subtitle: 'Natation', mood: 'swim' };
  }
  return { label: badge, subtitle: 'Course', mood: 'run' };
}

type KmHeroMood = 'run' | 'bike' | 'swim' | 'pb-run' | 'pb-bike' | 'pb-swim';

function Scene({
  cover,
  height,
  compact,
  personalBestKm,
}: {
  cover: ProfileCoverDef;
  height: number;
  compact?: boolean;
  personalBestKm?: Partial<Record<CoverDistanceSport, number>>;
}) {
  const [c0, c1, c2] = cover.colors;
  const v = cover.visual;
  const rank =
    cover.unlock.type === 'rank'
      ? { tier: cover.unlock.tier, division: cover.unlock.division }
      : null;

  const intensity: CoverIntensity | null = useMemo(() => {
    if (cover.unlock.type === 'rank') {
      return resolveRankCoverIntensity(cover.unlock.tier, cover.unlock.division, {
        compact,
      });
    }
    if (cover.unlock.type === 'premium') {
      return resolvePremiumCoverIntensity({ compact });
    }
    return null;
  }, [cover.unlock, compact]);

  const fxBase = intensity
    ? { c0, c1, c2, height, intensity }
    : null;

  let body: ReactNode;
  switch (v) {
    case 'breath':
    case 'dusk':
    case 'mist':
      body = (
        <FxBreath
          c0={c0}
          c1={c1}
          c2={c2}
          soft={v !== 'dusk'}
          height={height}
          mood={v}
        />
      );
      break;
    case 'flames':
      body = fxBase ? <FxFlamesIntense {...fxBase} /> : null;
      break;
    case 'mercury':
      body = fxBase ? <FxMercuryIntense {...fxBase} /> : null;
      break;
    case 'liquid-gold':
      body =
        fxBase && rank && normalizeTier(rank.tier) === 'champion' ? (
          <FxChampionApex {...fxBase} />
        ) : fxBase ? (
          <FxLiquidGoldIntense {...fxBase} />
        ) : null;
      break;
    case 'crystals':
      body = fxBase ? <FxCrystalsIntense {...fxBase} /> : null;
      break;
    case 'ripple':
      body = fxBase ? <FxRippleIntense {...fxBase} /> : null;
      break;
    case 'bolts':
      body = fxBase ? <FxBoltsIntense {...fxBase} /> : null;
      break;
    case 'constellation':
      body = <FxConstellation c0={c0} c1={c1} c2={c2} dense={!!compact} height={height} />;
      break;
    case 'aurora-veil':
      body = fxBase ? <FxAuroraVeilIntense {...fxBase} /> : <FxAuroraVeil c0={c0} c1={c1} c2={c2} height={height} />;
      break;
    case 'cyber-hex':
      body = fxBase ? <FxCyberHexIntense {...fxBase} /> : <FxCyberHex c0={c0} c1={c1} c2={c2} height={height} />;
      break;
    case 'maelstrom':
      body = fxBase ? <FxMaelstromIntense {...fxBase} /> : <FxMaelstrom c0={c0} c1={c1} c2={c2} height={height} />;
      break;
    case 'inferno':
      body = fxBase ? <FxInfernoIntense {...fxBase} /> : <FxInferno c0={c0} c1={c1} c2={c2} height={height} />;
      break;
    case 'run-km':
    case 'bike-km':
    case 'swim-km':
    case 'pb-run':
    case 'pb-bike':
    case 'pb-swim':
    case 'lane-10':
    case 'night-21':
    case 'laurel-42':
    case 'ridge-50':
    case 'cosmos-100': {
      const hero = resolveDistanceHero(cover, personalBestKm);
      // Legacy visuals sans badge : fallback chiffres
      const legacyLabel: Record<string, string> = {
        'lane-10': '10K',
        'night-21': '21K',
        'laurel-42': '42K',
        'ridge-50': '50K',
        'cosmos-100': '100K',
      };
      const label =
        cover.distanceBadge ||
        (cover.unlock.type === 'personal_best' ? hero.label : legacyLabel[v]) ||
        hero.label;
      body = (
        <FxKmHero
          label={label}
          subtitle={hero.subtitle}
          mood={hero.mood}
          c0={c0}
          c1={c1}
          c2={c2}
          height={height}
          compact={compact}
        />
      );
      break;
    }
    default:
      body = <View style={[StyleSheet.absoluteFill, { backgroundColor: c0 }]} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {body}
      {/* Scène commune des rangs (rayons, ondes, éclats) : DERRIÈRE le logo de rang. */}
      {rank ? (
        <TierStage color={c2} level={crestTierLevel(rank.tier)} height={height} compact={compact} />
      ) : null}
      {rank ? (
        <RankCrestOverlay
          tier={rank.tier}
          division={rank.division}
          visual={v}
          height={height}
          compact={compact}
          accent={c2}
          glow={intensity?.glow ?? crestTierLevel(rank.tier) / 7}
          reducedMotion={intensity?.reducedMotion}
        />
      ) : null}
    </View>
  );
}

function useLoop(duration: number, easing: (v: number) => number = Easing.linear) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }),
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
          duration: up,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: down,
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
  const gradId = useRef(nextGradId('cg')).current;
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

function Shimmer({ color, height }: { color: string; height: number }) {
  const t = useLoop(2400, Easing.inOut(Easing.quad));
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

/* ——— Gratuit : dégradé animé + taches organiques ——— */

function FxBreath({
  c0,
  c1,
  c2,
  soft,
  height,
  mood = 'breath',
}: {
  c0: string;
  c1: string;
  c2: string;
  soft: boolean;
  height: number;
  mood?: 'breath' | 'dusk' | 'mist';
}) {
  const wash = useLoop(soft ? 9000 : 6500, Easing.inOut(Easing.sin));
  const wash2 = useLoop(soft ? 11000 : 8000, Easing.inOut(Easing.sin));
  const stains = useMemo(() => {
    const base =
      mood === 'mist'
        ? [
            { color: c2, w: 200, h: 130, top: -20, left: -30, dur: 7200, ax: 55, ay: 28 },
            { color: c1, w: 170, h: 150, top: 20, left: 40, dur: 9100, ax: -45, ay: 35 },
            { color: c2, w: 140, h: 110, top: 40, left: 65, dur: 6800, ax: 35, ay: -30 },
            { color: c1, w: 190, h: 100, top: -10, left: 20, dur: 10400, ax: -30, ay: 22 },
          ]
        : mood === 'dusk'
          ? [
              { color: c2, w: 220, h: 160, top: -50, left: 10, dur: 8000, ax: 40, ay: 40 },
              { color: c1, w: 180, h: 200, top: 10, left: -40, dur: 9800, ax: 60, ay: -25 },
              { color: c2, w: 150, h: 140, top: 30, left: 55, dur: 7400, ax: -50, ay: 30 },
              { color: '#A5B4FC', w: 120, h: 90, top: 50, left: 30, dur: 11000, ax: 25, ay: -40 },
            ]
          : [
              { color: c2, w: 210, h: 150, top: -40, left: -20, dur: 7800, ax: 48, ay: 32 },
              { color: c1, w: 160, h: 170, top: 15, left: 50, dur: 9500, ax: -42, ay: 28 },
              { color: c2, w: 130, h: 100, top: 45, left: 5, dur: 7000, ax: 38, ay: -35 },
              { color: c1, w: 180, h: 120, top: -5, left: 35, dur: 10200, ax: -28, ay: 40 },
              { color: c2, w: 100, h: 140, top: 25, left: 70, dur: 8600, ax: -55, ay: 18 },
            ];
    return base.map((s, i) => ({
      ...s,
      r: {
        borderTopLeftRadius: 30 + ((i * 37) % 70),
        borderTopRightRadius: 20 + ((i * 53) % 90),
        borderBottomLeftRadius: 40 + ((i * 29) % 80),
        borderBottomRightRadius: 25 + ((i * 41) % 95),
      },
      rot: i % 2 === 0 ? 18 : -22,
    }));
  }, [c1, c2, mood]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] }),
          },
        ]}
      >
        <CoverGrad c0={c1} c1={c2} c2={c0} height={height} horizontal />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: wash2.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.1] }),
          },
        ]}
      >
        <CoverGrad c0={c2} c1={c0} c2={c1} height={height} />
      </Animated.View>

      {stains.map((s, i) => (
        <OrganicStain
          key={i}
          color={s.color}
          width={s.w}
          heightBl={s.h}
          top={s.top}
          leftPct={s.left}
          duration={s.dur}
          ampX={s.ax}
          ampY={s.ay}
          radii={s.r}
          rotAmp={s.rot}
          soft={soft}
        />
      ))}
    </View>
  );
}

function OrganicStain({
  color,
  width,
  heightBl,
  top,
  leftPct,
  duration,
  ampX,
  ampY,
  radii,
  rotAmp,
  soft,
}: {
  color: string;
  width: number;
  heightBl: number;
  top: number;
  leftPct: number;
  duration: number;
  ampX: number;
  ampY: number;
  radii: {
    borderTopLeftRadius: number;
    borderTopRightRadius: number;
    borderBottomLeftRadius: number;
    borderBottomRightRadius: number;
  };
  rotAmp: number;
  soft: boolean;
}) {
  const drift = useLoop(duration, Easing.inOut(Easing.sin));
  const morph = useLoop(duration * 0.72, Easing.inOut(Easing.sin));
  const pulse = usePulse(soft ? 2200 : 1600, soft ? 2200 : 1600);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left: `${leftPct}%`,
        width,
        height: heightBl,
        backgroundColor: color,
        ...radii,
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: soft ? [0.28, 0.52] : [0.32, 0.62],
        }),
        transform: [
          {
            translateX: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [-ampX * 0.35, ampX],
            }),
          },
          {
            translateY: morph.interpolate({
              inputRange: [0, 1],
              outputRange: [-ampY * 0.4, ampY],
            }),
          },
          {
            scaleX: morph.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.75, 1.35, 0.85],
            }),
          },
          {
            scaleY: drift.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1.25, 0.7, 1.15],
            }),
          },
          {
            rotate: morph.interpolate({
              inputRange: [0, 1],
              outputRange: [`${-rotAmp}deg`, `${rotAmp}deg`],
            }),
          },
          {
            skewX: drift.interpolate({
              inputRange: [0, 1],
              outputRange: [`${-rotAmp * 0.35}deg`, `${rotAmp * 0.4}deg`],
            }),
          },
        ],
      }}
    />
  );
}

/* ——— Emblème ranked flottant dans le fond (logo seul, sans anneau / carré) ——— */

function RankCrestOverlay({
  tier,
  division,
  visual,
  height,
  compact,
  accent,
  glow = 0.4,
  reducedMotion,
}: {
  tier: RankTier;
  division: RankDivision | null;
  visual: ProfileCoverVisual;
  height: number;
  compact?: boolean;
  accent: string;
  glow?: number;
  reducedMotion?: boolean;
}) {
  const level = crestTierLevel(tier);
  const pulseMs = reducedMotion
    ? 2800
    : Math.round(2200 - glow * 700);
  const float = usePulse(pulseMs, pulseMs);
  const size = compact
    ? Math.round(height * 0.78)
    : Math.round(height * (tier === 'champion' || tier === 'elite' ? 0.82 : 0.74));
  const sparkN = compact
    ? Math.min(3 + Math.floor(glow * 5), 8)
    : Math.min(4 + Math.round(glow * 12), 18);

  const glowRadius = size * (0.9 + glow * 0.55);
  const glowMin = 0.03 + glow * 0.06;
  const glowMax = 0.08 + glow * 0.18;

  const sparks = useMemo(
    () =>
      Array.from({ length: sparkN }, (_, i) => ({
        id: i,
        angle: (i / sparkN) * Math.PI * 2,
        dist: size * (0.62 + (i % 3) * 0.05),
        delay: i * 120,
      })),
    [size, sparkN],
  );

  const isChampion = normalizeTier(tier) === 'champion';

  return (
    <View style={styles.crestLayer} pointerEvents="none">
      {!compact ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: glowRadius,
            height: glowRadius,
            borderRadius: glowRadius,
            backgroundColor: isChampion ? '#FBBF24' : accent,
            opacity: float.interpolate({
              inputRange: [0, 1],
              outputRange: [glowMin, glowMax],
            }),
          }}
        />
      ) : null}

      {isChampion && !compact ? (
        <View
          style={{
            position: 'absolute',
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: size,
            borderWidth: 1.5,
            borderColor: '#DC2626',
            opacity: 0.45,
          }}
        />
      ) : null}

      {!compact && glow >= 0.25
        ? sparks.map((s) => (
            <CrestSpark
              key={s.id}
              angle={s.angle}
              dist={s.dist}
              delay={s.delay}
              color={
                visual === 'flames' || visual === 'liquid-gold' || visual === 'constellation'
                  ? accent
                  : rimColors(tier).hi
              }
              size={3 + Math.min(level, 5) * 0.4 * (0.7 + glow * 0.5)}
              mode={visual}
            />
          ))
        : null}

      <Animated.View
        style={{
          backgroundColor: 'transparent',
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [-2 - glow * 3, 3 + glow * 3.5],
              }),
            },
            {
              scale: float.interpolate({
                inputRange: [0, 1],
                outputRange: [0.985 - glow * 0.01, 1.01 + glow * 0.02],
              }),
            },
          ],
        }}
      >
        <RankBadge tier={tier} division={division} size={size} />
      </Animated.View>
    </View>
  );
}

function CrestSpark({
  angle,
  dist,
  delay,
  color,
  size,
  mode,
}: {
  angle: number;
  dist: number;
  delay: number;
  color: string;
  size: number;
  mode: ProfileCoverVisual;
}) {
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [twinkle, delay]);

  const x = Math.cos(angle) * dist;
  const y = Math.sin(angle) * dist;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -size / 2 + x,
        marginTop: -size / 2 + y,
        width: size,
        height: mode === 'bolts' ? size * 2.2 : size,
        borderRadius: mode === 'crystals' ? 2 : size,
        backgroundColor: color,
        opacity: twinkle.interpolate({
          inputRange: [0, 1],
          outputRange: [0.25, 0.95],
        }),
        transform: [
          {
            scale: twinkle.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 1.35],
            }),
          },
        ],
      }}
    />
  );
}

/* ——— Bronze : flammes ——— */

function FxFlames({
  c0,
  c1,
  c2,
  count,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  count: number;
  height: number;
}) {
  const tongues = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 1 + i * (98 / count),
        w: 14 + (i % 5) * 6,
        delay: i * 70,
        h: height * (0.42 + (i % 6) * 0.09),
      })),
    [count, height],
  );
  const embers = useMemo(
    () =>
      Array.from({ length: Math.min(count, 12) }, (_, i) => ({
        id: i,
        left: 6 + ((i * 17) % 88),
        delay: i * 140,
        size: 3 + (i % 3),
      })),
    [count],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <View style={[styles.heatFloor, { backgroundColor: c2, height: height * 0.5 }]} />
      <View
        style={[
          styles.heatFloor,
          { backgroundColor: c1, height: height * 0.28, opacity: 0.55 },
        ]}
      />
      {tongues.map((t) => (
        <FlameTongue key={t.id} {...t} c1={c1} c2={c2} />
      ))}
      {embers.map((e) => (
        <RisingEmber key={`e-${e.id}`} {...e} color={c2} height={height} />
      ))}
      <Shimmer color={c2} height={height} />
    </View>
  );
}

function RisingEmber({
  left,
  delay,
  size,
  color,
  height,
}: {
  left: number;
  delay: number;
  size: number;
  color: string;
  height: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 1800 + (delay % 600),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
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

function FlameTongue({
  left,
  w,
  delay,
  h,
  c1,
  c2,
}: {
  left: number;
  w: number;
  delay: number;
  h: number;
  c1: string;
  c2: string;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: 650 + (delay % 350),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
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
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] }),
        transform: [
          { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.3] }) },
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

function FxMercury({
  c0,
  c1,
  c2,
  height,
  rich,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  rich?: boolean;
}) {
  const a = useLoop(2400, Easing.inOut(Easing.sin));
  const b = useLoop(3100, Easing.inOut(Easing.sin));
  const c = useLoop(1800, Easing.inOut(Easing.sin));
  const drops = useMemo(
    () =>
      Array.from({ length: rich ? 14 : 8 }, (_, i) => ({
        id: i,
        left: 4 + i * (rich ? 6.5 : 11),
        top: 8 + (i % 5) * 16,
        s: 12 + (i % 6) * 6,
      })),
    [rich],
  );
  const beads = useMemo(
    () =>
      Array.from({ length: rich ? 16 : 10 }, (_, i) => ({
        id: i,
        left: 5 + ((i * 13) % 90),
        delay: i * 110,
        size: 3 + (i % 4),
      })),
    [rich],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} horizontal />
      {[0, 1, 2, 3, 4, ...(rich ? [5, 6] : [])].map((i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: -50,
            top: `${2 + i * 16}%`,
            width: '150%',
            height: height * 0.24,
            borderRadius: 90,
            backgroundColor: i % 2 ? c2 : c1,
            opacity: 0.32 + i * 0.05,
            transform: [
              {
                translateX: (i % 2 ? b : a).interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [70, -80] : [-55, 90],
                }),
              },
              {
                scaleY: (i % 3 === 0 ? c : i % 2 ? a : b).interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.55, 1.55, 0.65],
                }),
              },
            ],
          }}
        />
      ))}
      {drops.map((d, i) => (
        <Animated.View
          key={d.id}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.s,
            height: d.s * 1.2,
            borderRadius: d.s,
            backgroundColor: i % 2 ? c2 : '#FFFFFF',
            opacity: c.interpolate({
              inputRange: [0, 1],
              outputRange: i % 2 ? [0.25, 0.75] : [0.7, 0.3],
            }),
            transform: [
              {
                translateY: a.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [-10, 14] : [12, -12],
                }),
              },
              {
                scaleX: b.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.65, 1.35, 0.75],
                }),
              },
            ],
          }}
        />
      ))}
      {beads.map((e) => (
        <RisingEmber key={`mb-${e.id}`} {...e} color={iColor(e.id, c1, c2)} height={height} />
      ))}
      <Shimmer color="#FFFFFF" height={height} />
      <Shimmer color="#E2E8F0" height={height} />
    </View>
  );
}

function iColor(i: number, a: string, b: string) {
  return i % 2 ? a : b;
}

/* ——— Or : coulées ——— */

function FxLiquidGold({
  c0,
  c1,
  c2,
  height,
  rich,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  rich?: boolean;
}) {
  const t = useLoop(2000, Easing.inOut(Easing.quad));
  const shine = useLoop(1200, Easing.inOut(Easing.sin));
  const streamN = rich ? 11 : 7;
  const sparks = useMemo(
    () =>
      Array.from({ length: rich ? 18 : 10 }, (_, i) => ({
        id: i,
        left: 4 + ((i * 11) % 92),
        top: 10 + (i % 5) * 16,
      })),
    [rich],
  );
  const embers = useMemo(
    () =>
      Array.from({ length: rich ? 14 : 8 }, (_, i) => ({
        id: i,
        left: 6 + ((i * 17) % 88),
        delay: i * 100,
        size: 3 + (i % 3),
      })),
    [rich],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <View style={[styles.heatFloor, { backgroundColor: c2, height: height * 0.35, opacity: 0.35 }]} />
      {Array.from({ length: streamN }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${2 + i * (94 / streamN)}%`,
            width: 32 + (i % 3) * 12,
            height: height * 1.4,
            top: -height * 0.18,
            borderRadius: 40,
            backgroundColor: i % 2 ? c2 : c1,
            opacity: 0.45,
            transform: [
              {
                translateY: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 === 0 ? [-30, 34] : [34, -30],
                }),
              },
              {
                scaleX: t.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.7, 1.45, 0.75],
                }),
              },
            ],
          }}
        />
      ))}
      {sparks.map((s, i) => (
        <Animated.View
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: 4 + (i % 3),
            height: 4 + (i % 3),
            borderRadius: 4,
            backgroundColor: '#FFF8DC',
            opacity: shine.interpolate({
              inputRange: [0, 1],
              outputRange: i % 2 ? [0.15, 1] : [0.95, 0.2],
            }),
            transform: [
              {
                scale: shine.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1.5],
                }),
              },
            ],
          }}
        />
      ))}
      {embers.map((e) => (
        <RisingEmber key={`ge-${e.id}`} {...e} color="#FFE08A" height={height} />
      ))}
      <Animated.View
        style={{
          ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
          backgroundColor: c2,
          opacity: shine.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.28] }),
        }}
      />
      <Shimmer color="#FFF8DC" height={height} />
      <Shimmer color="#FBBF24" height={height} />
    </View>
  );
}

/* ——— Diamant : pluie de diamants ——— */

function FxCrystals({
  c0,
  c1,
  c2,
  count,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  count: number;
  height: number;
}) {
  const wash = useLoop(7000, Easing.inOut(Easing.sin));
  const glow = usePulse(1600, 1600);
  const fallN = Math.max(count, 14);
  const diamonds = useMemo(
    () =>
      Array.from({ length: fallN }, (_, i) => ({
        id: i,
        left: 2 + ((i * 37) % 94),
        size: 10 + (i % 5) * 5,
        delay: (i * 180) % 3200,
        duration: 2800 + (i % 7) * 420,
        drift: 8 + (i % 5) * 6,
        spin: i % 2 === 0,
      })),
    [fallN],
  );
  const sparkles = useMemo(
    () =>
      Array.from({ length: Math.min(10, Math.round(fallN / 2)) }, (_, i) => ({
        id: i,
        left: 6 + ((i * 29) % 88),
        delay: i * 160,
        size: 2 + (i % 3),
      })),
    [fallN],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] }),
          },
        ]}
      >
        <CoverGrad c0={c1} c1={c2} c2={c0} height={height} horizontal />
      </Animated.View>
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: c2,
            width: height * 1.35,
            height: height * 1.35,
            top: -height * 0.35,
            left: '22%',
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] }),
          },
        ]}
      />
      {diamonds.map((d) => (
        <FallingDiamond
          key={d.id}
          left={d.left}
          size={d.size}
          delay={d.delay}
          duration={d.duration}
          drift={d.drift}
          spin={d.spin}
          height={height}
          fill={d.id % 3 === 0 ? '#FFFFFF' : d.id % 2 ? c2 : c1}
        />
      ))}
      {sparkles.map((e) => (
        <RisingEmber key={`ds-${e.id}`} {...e} color="#E0F2FE" height={height} />
      ))}
      <Shimmer color="#E0F2FE" height={height} />
      <Shimmer color="#FFFFFF" height={height} />
    </View>
  );
}

/** Losange simple qui tombe du haut vers le bas. */
function FallingDiamond({
  left,
  size,
  delay,
  duration,
  drift,
  spin,
  height,
  fill,
}: {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: boolean;
  height: number;
  fill: string;
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
              outputRange: spin ? ['0deg', '220deg'] : ['0deg', '-180deg'],
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
      <Svg width={w} height={h} viewBox="0 0 40 50">
        <Polygon points="20,2 36,18 20,48 4,18" fill={fill} opacity={0.9} />
        <Polygon points="20,2 28,18 20,18" fill="#FFFFFF" opacity={0.55} />
        <Polygon points="20,2 12,18 20,18" fill="#FFFFFF" opacity={0.28} />
        <Path d="M4 18 L36 18" stroke="#EFF6FF" strokeWidth={1.2} opacity={0.65} />
        <Path d="M20 18 L20 48" stroke="#EFF6FF" strokeWidth={0.8} opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

/* ——— Platine ——— */

function FxRipple({
  c0,
  c1,
  c2,
  height,
  rich,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  rich?: boolean;
}) {
  const t = useLoop(2200, Easing.out(Easing.quad));
  const t2 = useLoop(3200, Easing.out(Easing.quad));
  const wash = usePulse(1200, 1200);
  const ringN = rich ? 10 : 7;
  const beads = useMemo(
    () =>
      Array.from({ length: rich ? 14 : 8 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 15) % 84),
        delay: i * 120,
        size: 3 + (i % 3),
      })),
    [rich],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: c1,
            width: height * 1.5,
            height: height * 1.5,
            top: height * 0.05,
            alignSelf: 'center',
            left: '14%',
            opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
          },
        ]}
      />
      {Array.from({ length: ringN }, (_, i) => {
        const clock = i % 2 ? t2 : t;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              alignSelf: 'center',
              left: '50%',
              top: '42%',
              marginLeft: -22,
              marginTop: -22,
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 2.5,
              borderColor: i % 2 ? c2 : c1,
              opacity: clock.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85 - i * 0.06, 0],
              }),
              transform: [
                {
                  scale: clock.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25 + i * 0.08, 5.8 + i * 0.4],
                  }),
                },
              ],
            }}
          />
        );
      })}
      {beads.map((e) => (
        <RisingEmber key={`pr-${e.id}`} {...e} color={c2} height={height} />
      ))}
      <Shimmer color="#CCFBF1" height={height} />
      <Shimmer color="#FFFFFF" height={height} />
    </View>
  );
}

/* ——— Élite ——— */

function FxBolts({
  c0,
  c1,
  c2,
  height,
  rich,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
  rich?: boolean;
}) {
  const flash = usePulse(rich ? 140 : 180, rich ? 480 : 620);
  const drift = useLoop(1600, Easing.inOut(Easing.sin));
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
    ];
    return rich ? base : base.slice(0, 4);
  }, [height, rich]);
  const sparks = useMemo(
    () =>
      Array.from({ length: rich ? 16 : 10 }, (_, i) => ({
        id: i,
        left: 6 + ((i * 17) % 88),
        delay: i * 80,
        size: 2 + (i % 4),
      })),
    [rich],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c2,
            opacity: flash.interpolate({
              inputRange: [0, 1],
              outputRange: [0.06, rich ? 0.5 : 0.38],
            }),
          },
        ]}
      />
      <Animated.View
        style={{
          ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 14],
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
              opacity={0.4}
              transform={`translate(${b.left}, 0)`}
            />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: flash.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 1, 0.2] }),
          },
        ]}
      >
        <Svg width="100%" height={height}>
          {bolts.map((b, i) => (
            <Path
              key={`f-${i}`}
              d={b.d}
              fill={i % 2 ? '#FFF' : c2}
              transform={`translate(${b.left}, 0)`}
            />
          ))}
        </Svg>
      </Animated.View>
      {sparks.map((e) => (
        <RisingEmber key={`bs-${e.id}`} {...e} color="#FDE68A" height={height} />
      ))}
      <Shimmer color="#FDE68A" height={height} />
    </View>
  );
}

/* ——— Champion : trône céleste ——— */

function FxConstellation({
  c0,
  c1,
  c2,
  dense,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  dense: boolean;
  height: number;
}) {
  const breath = usePulse(1600, 1600);
  const drift = useLoop(7000, Easing.inOut(Easing.sin));
  const spin = useLoop(12000, Easing.linear);
  const spinB = useLoop(16000, Easing.linear);
  const rise = useLoop(4200, Easing.linear);

  const nodes = useMemo(() => {
    // Forme de couronne + ailes
    const crown = [
      [50, 14],
      [38, 28],
      [28, 24],
      [22, 40],
      [34, 48],
      [50, 42],
      [66, 48],
      [78, 40],
      [72, 24],
      [62, 28],
    ];
    const field = [
      [12, 62],
      [22, 78],
      [42, 70],
      [58, 82],
      [74, 68],
      [88, 58],
      [8, 38],
      [92, 32],
      [48, 58],
    ];
    return dense ? [...crown.slice(0, 7), ...field.slice(0, 4)] : [...crown, ...field];
  }, [dense]);

  const links = useMemo(
    () => [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 0],
      [1, 5],
      [9, 5],
    ],
    [],
  );

  const ashes = useMemo(
    () =>
      Array.from({ length: dense ? 6 : 12 }, (_, i) => ({
        id: i,
        left: 6 + ((i * 17) % 88),
        size: 3 + (i % 3),
        delay: i * 90,
      })),
    [dense],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />

      {/* Bloom royal */}
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: c1,
            width: height * 1.6,
            height: height * 1.6,
            top: -height * 0.35,
            left: '18%',
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] }),
            transform: [
              {
                scale: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.88, 1.18],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: c2,
            width: height * 0.95,
            height: height * 0.95,
            top: height * 0.05,
            left: '38%',
            opacity: 0.18,
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 22],
                }),
              },
            ],
          },
        ]}
      />

      {/* Anneaux concentriques */}
      {[1.1, 1.45, 1.85].map((mul, i) => (
        <Animated.View
          key={`ring-${i}`}
          style={{
            position: 'absolute',
            alignSelf: 'center',
            left: '50%',
            top: '48%',
            width: height * mul * 0.55,
            height: height * mul * 0.55,
            marginLeft: (-height * mul * 0.55) / 2,
            marginTop: (-height * mul * 0.55) / 2,
            borderRadius: height,
            borderWidth: i === 1 ? 2 : 1.2,
            borderColor: i === 1 ? c2 : '#FECACA',
            opacity: breath.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12 + i * 0.04, 0.28 + i * 0.06],
            }),
            transform: [
              {
                rotate: (i % 2 ? spinB : spin).interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? ['360deg', '0deg'] : ['0deg', '360deg'],
                }),
              },
              {
                scale: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1.06],
                }),
              },
            ],
          }}
        />
      ))}

      {/* Rayons */}
      {Array.from({ length: dense ? 6 : 10 }, (_, i) => {
        const ang = (i / (dense ? 6 : 10)) * 360;
        return (
          <Animated.View
            key={`beam-${i}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '48%',
              width: 1.5,
              height: height * (0.55 + (i % 3) * 0.08),
              marginLeft: -0.75,
              marginTop: -height * 0.28,
              backgroundColor: i % 2 ? c2 : '#FCA5A5',
              opacity: breath.interpolate({
                inputRange: [0, 1],
                outputRange: [0.08, 0.28],
              }),
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${ang}deg`, `${ang + 360}deg`],
                  }),
                },
              ],
            }}
          />
        );
      })}

      {/* Constellation couronne */}
      {links.map(([a, b], i) => {
        const p = nodes[a];
        const q = nodes[b];
        if (!p || !q) return null;
        const dx = q[0] - p[0];
        const dy = q[1] - p[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <Animated.View
            key={`l-${i}`}
            style={{
              position: 'absolute',
              left: `${p[0]}%`,
              top: `${p[1]}%`,
              width: `${len}%`,
              height: 1.5,
              backgroundColor: c2,
              opacity: breath.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 0.65],
              }),
              transform: [{ rotate: `${ang}deg` }],
            }}
          />
        );
      })}

      {nodes.map(([x, y], i) => (
        <Animated.View
          key={`n-${i}`}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: i < 10 ? 8 : 5,
            height: i < 10 ? 8 : 5,
            marginLeft: i < 10 ? -4 : -2.5,
            marginTop: i < 10 ? -4 : -2.5,
            borderRadius: 5,
            backgroundColor: i === 0 || i === 5 ? '#FFF' : c2,
            opacity: breath.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 1],
            }),
            transform: [
              {
                scale: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.75, 1.4],
                }),
              },
            ],
          }}
        />
      ))}

      {/* Braises dorées montantes */}
      {ashes.map((a) => (
        <Animated.View
          key={`ash-${a.id}`}
          style={{
            position: 'absolute',
            left: `${a.left}%`,
            bottom: 4,
            width: a.size,
            height: a.size,
            borderRadius: a.size,
            backgroundColor: a.id % 2 ? c2 : '#FECACA',
            opacity: rise.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 0.85, 0.5, 0],
            }),
            transform: [
              {
                translateY: rise.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -height * (0.7 + (a.id % 4) * 0.08)],
                }),
              },
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: a.id % 2 ? [-6, 8] : [8, -6],
                }),
              },
            ],
          }}
        />
      ))}

      <Shimmer color="#FDE68A" height={height} />
    </View>
  );
}

/* ——— Premium : calme, lisible ——— */

function FxAuroraVeil({
  c0,
  c1,
  c2,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
}) {
  const a = useLoop(7000, Easing.inOut(Easing.sin));
  const b = useLoop(9500, Easing.inOut(Easing.sin));
  const bands = [
    { col: c2, top: 0.12, h: 0.22 },
    { col: c1, top: 0.32, h: 0.2 },
    { col: '#34D399', top: 0.5, h: 0.18 },
    { col: '#A78BFA', top: 0.68, h: 0.2 },
  ];
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {bands.map((band, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: '-25%',
            width: '150%',
            height: height * band.h,
            top: height * band.top,
            borderRadius: 60,
            backgroundColor: band.col,
            opacity: 0.28,
            transform: [
              {
                translateX: (i % 2 ? b : a).interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [40, -50] : [-50, 45],
                }),
              },
              {
                scaleY: (i % 2 ? a : b).interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.85, 1.25, 0.9],
                }),
              },
              { rotate: `${(i - 1.5) * 2}deg` },
            ],
          }}
        />
      ))}
    </View>
  );
}

function FxCyberHex({
  c0,
  c1,
  c2,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
}) {
  const wave = useLoop(5000, Easing.inOut(Easing.sin));
  const scan = useLoop(4200, Easing.inOut(Easing.quad));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${8 + i * 22}%`,
            top: `${12 + (i % 2) * 18}%`,
            width: 48,
            height: 52,
            borderWidth: 1.5,
            borderColor: i % 2 ? c2 : c1,
            borderRadius: 8,
            opacity: wave.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.2, 0.55, 0.25],
            }),
            transform: [
              {
                scale: wave.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.92, 1.06, 0.94],
                }),
              },
            ],
          }}
        />
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: c2,
          opacity: 0.45,
          transform: [
            {
              translateY: scan.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

function FxMaelstrom({
  c0,
  c1,
  c2,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
}) {
  const spin = useLoop(12000);
  const spinR = useLoop(16000);
  const pulse = usePulse(2200, 2200);
  const size = Math.max(height * 0.85, 90);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <View style={styles.centerFill}>
        {[0.7, 1, 1.3].map((mult, i) => (
          <Animated.View
            key={mult}
            style={{
              position: 'absolute',
              width: size * mult,
              height: size * mult,
              borderRadius: (size * mult) / 2,
              borderWidth: 2,
              borderColor: i === 1 ? c2 : c1,
              borderTopColor: 'transparent',
              opacity: 0.4,
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
                    outputRange: [0.96, 1.04],
                  }),
                },
              ],
            }}
          />
        ))}
        <Animated.View
          style={[
            styles.orb,
            {
              width: 18,
              height: 18,
              backgroundColor: c2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

function FxInferno({
  c0,
  c1,
  c2,
  height,
}: {
  c0: string;
  c1: string;
  c2: string;
  height: number;
}) {
  const wash = useLoop(8000, Easing.inOut(Easing.sin));
  const glow = usePulse(1800, 1800);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }),
          },
        ]}
      >
        <CoverGrad c0={c1} c1={c2} c2={c0} height={height} horizontal />
      </Animated.View>
      <Animated.View
        style={[
          styles.heatFloor,
          {
            backgroundColor: c2,
            height: height * 0.5,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }),
          },
        ]}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            bottom: -20,
            left: `${10 + i * 28}%`,
            width: 90 + i * 20,
            height: height * (0.55 + i * 0.08),
            borderTopLeftRadius: 80,
            borderTopRightRadius: 50,
            backgroundColor: i === 1 ? c2 : c1,
            opacity: glow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.18, 0.38],
            }),
            transform: [
              {
                scaleY: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1.12],
                }),
              },
              {
                translateX: wash.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [12, -10] : [-10, 14],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ——— Distances : typographie km + motifs sport (pas / vélo / bassin) ——— */

function FxKmHero({
  label,
  subtitle,
  mood = 'run',
  c0,
  c1,
  c2,
  height,
  compact,
}: {
  label: string;
  subtitle?: string;
  mood?: KmHeroMood;
  c0: string;
  c1: string;
  c2: string;
  height: number;
  compact?: boolean;
}) {
  const pulse = usePulse(1100, 1100);
  const drift = useLoop(5200, Easing.inOut(Easing.sin));
  const wash = useLoop(4800, Easing.inOut(Easing.sin));
  const spin = useLoop(5200, Easing.linear);
  const stride = usePulse(420, 420);
  const isPb = mood.startsWith('pb');
  const fontSize = compact
    ? isPb
      ? 34
      : 28
    : Math.min(isPb ? 68 : 60, Math.round(height * (isPb ? 0.48 : 0.44)));
  const subSize = compact ? 10 : 13;
  const run = mood === 'run' || mood === 'pb-run';
  const bike = mood === 'bike' || mood === 'pb-bike';
  const swim = mood === 'swim' || mood === 'pb-swim';

  const particles = useMemo(
    () =>
      Array.from({ length: compact ? 8 : 14 }, (_, i) => ({
        id: i,
        left: 4 + ((i * 17) % 92),
        delay: i * 90,
        size: 2 + (i % 4),
      })),
    [compact],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c0, overflow: 'hidden' }]}>
      <CoverGrad c0={c0} c1={c1} c2={c2} height={height} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: wash.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] }),
          },
        ]}
      >
        <CoverGrad c0={c1} c1={c2} c2={c0} height={height} horizontal />
      </Animated.View>

      {run ? (
        <>
          {/* Piste légère : bandes + tirets */}
          {[0.22, 0.38, 0.54, 0.7].map((y, i) => (
            <Animated.View
              key={`lane-${i}`}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: height * y,
                height: i === 1 || i === 2 ? 2 : 1.5,
                backgroundColor: c2,
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1 + i * 0.03, 0.22 + i * 0.04],
                }),
                transform: [
                  {
                    translateX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: i % 2 ? [-20, 24] : [22, -18],
                    }),
                  },
                ],
              }}
            />
          ))}
          {Array.from({ length: compact ? 5 : 7 }, (_, i) => (
            <Animated.View
              key={`dash-${i}`}
              style={{
                position: 'absolute',
                top: height * 0.45,
                left: `${6 + i * (compact ? 18 : 13)}%`,
                width: compact ? 12 : 16,
                height: 2,
                borderRadius: 2,
                backgroundColor: '#FFF',
                opacity: 0.18,
                transform: [
                  {
                    translateX: stride.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -36],
                    }),
                  },
                ],
              }}
            />
          ))}
          <FootprintTrail
            color={c2}
            height={height}
            compact={!!compact}
            stride={stride}
            pulse={pulse}
          />
          {particles.map((e) => (
            <RisingEmber key={`rp-${e.id}`} {...e} color={c2} height={height} />
          ))}
        </>
      ) : null}

      {bike ? (
        <>
          {/* Route */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: height * 0.12,
              height: 4,
              backgroundColor: c2,
              opacity: 0.35,
            }}
          />
          {Array.from({ length: 8 }, (_, i) => (
            <Animated.View
              key={`rd-${i}`}
              style={{
                position: 'absolute',
                bottom: height * 0.11,
                left: `${i * 14}%`,
                width: 16,
                height: 3,
                backgroundColor: '#FFF',
                opacity: 0.45,
                transform: [
                  {
                    translateX: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -56],
                    }),
                  },
                ],
              }}
            />
          ))}
          <BikeSilhouette
            color={c2}
            height={height}
            compact={!!compact}
            spin={spin}
            bounce={pulse}
          />
          {particles.map((e) => (
            <RisingEmber key={`bp-${e.id}`} {...e} color={c1} height={height} />
          ))}
        </>
      ) : null}

      {swim ? (
        <>
          <SwimPoolScene
            c1={c1}
            c2={c2}
            height={height}
            compact={!!compact}
            wash={wash}
            drift={drift}
            pulse={pulse}
          />
          {particles.map((e) => (
            <RisingEmber key={`sp-${e.id}`} {...e} color="#E0F2FE" height={height} />
          ))}
        </>
      ) : null}

      <View style={styles.centerFill} pointerEvents="none">
        <Animated.Text
          style={{
            position: 'absolute',
            fontSize: fontSize * 1.1,
            fontWeight: '900',
            color: c2,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.22],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.04, 1.18],
                }),
              },
            ],
          }}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          style={{
            fontSize,
            fontWeight: '900',
            color: '#FFFFFF',
            letterSpacing: compact ? 1 : isPb ? 1.5 : 2.5,
            textShadowColor: c2,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 14,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.88, 1],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1.04],
                }),
              },
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-2, 3],
                }),
              },
            ],
          }}
        >
          {label}
        </Animated.Text>
        {subtitle ? (
          <Animated.Text
            style={{
              marginTop: compact ? 2 : 4,
              fontSize: subSize,
              fontWeight: '800',
              color: c2,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.75, 1],
              }),
            }}
          >
            {subtitle}
          </Animated.Text>
        ) : null}
      </View>
    </View>
  );
}

/** Trace de pas de chaussures (gauche/droite) qui avance. */
function FootprintTrail({
  color,
  height,
  compact,
  stride,
  pulse,
}: {
  color: string;
  height: number;
  compact: boolean;
  stride: Animated.Value;
  pulse: Animated.Value;
}) {
  const count = compact ? 5 : 7;
  const soleW = compact ? 9 : 12;
  const soleH = compact ? 16 : 22;
  const heelW = compact ? 6 : 8;
  const heelH = compact ? 5 : 7;
  const laneGap = compact ? 10 : 14;
  const strideStep = compact ? 18 : 24;
  const baseTop = height * (compact ? 0.28 : 0.3);

  const prints = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const isLeft = i % 2 === 0;
        return {
          id: i,
          isLeft,
          leftPct: 4 + i * (88 / Math.max(count - 1, 1)),
          top: baseTop + (isLeft ? -laneGap / 2 : laneGap / 2),
          rotate: isLeft ? '-18deg' : '18deg',
          opacityBase: 0.28 + (i / count) * 0.45,
        };
      }),
    [count, baseTop, laneGap],
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
          transform: [
            {
              translateX: stride.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -strideStep],
              }),
            },
          ],
        },
      ]}
    >
      {prints.map((p) => (
        <View
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.leftPct}%`,
            top: p.top,
            width: soleW,
            height: soleH + heelH * 0.35,
            opacity: p.opacityBase,
            transform: [{ rotate: p.rotate }],
            alignItems: 'center',
          }}
        >
          {/* semelle */}
          <View
            style={{
              width: soleW,
              height: soleH,
              borderRadius: soleW,
              backgroundColor: color,
            }}
          />
          {/* talon */}
          <View
            style={{
              marginTop: -heelH * 0.35,
              width: heelW,
              height: heelH,
              borderRadius: heelW,
              backgroundColor: color,
              opacity: 0.9,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

/** Silhouette vélo + roues qui tournent. */
function BikeSilhouette({
  color,
  height,
  compact,
  spin,
  bounce,
}: {
  color: string;
  height: number;
  compact: boolean;
  spin: Animated.Value;
  bounce: Animated.Value;
}) {
  const s = compact ? 0.7 : 1;
  const w = height * 0.95 * s;
  const wheel = height * 0.28 * s;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: '4%',
        bottom: height * 0.14,
        width: w,
        height: height * 0.5 * s,
        opacity: bounce.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.92] }),
        transform: [
          {
            translateY: bounce.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -4],
            }),
          },
        ],
      }}
    >
      {[0.08, 0.55].map((left, i) => (
        <Animated.View
          key={`wh-${i}`}
          style={{
            position: 'absolute',
            left: `${left * 100}%`,
            bottom: 0,
            width: wheel,
            height: wheel,
            borderRadius: wheel,
            borderWidth: compact ? 2 : 3,
            borderColor: color,
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', i ? '-360deg' : '360deg'],
                }),
              },
            ],
          }}
        >
          {/* rayons */}
          {[0, 45, 90, 135].map((deg) => (
            <View
              key={deg}
              style={{
                position: 'absolute',
                left: '48%',
                top: '8%',
                width: 2,
                height: '84%',
                backgroundColor: color,
                opacity: 0.55,
                transform: [{ rotate: `${deg}deg` }],
              }}
            />
          ))}
        </Animated.View>
      ))}
      {/* cadre */}
      <View
        style={{
          position: 'absolute',
          left: '28%',
          bottom: wheel * 0.55,
          width: w * 0.42,
          height: 3,
          backgroundColor: color,
          transform: [{ rotate: '-18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '38%',
          bottom: wheel * 0.7,
          width: w * 0.28,
          height: 3,
          backgroundColor: color,
          transform: [{ rotate: '28deg' }],
        }}
      />
      {/* cycliste */}
      <View
        style={{
          position: 'absolute',
          left: '42%',
          bottom: wheel * 0.95,
          width: height * 0.08 * s,
          height: height * 0.08 * s,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '40%',
          bottom: wheel * 0.55,
          width: height * 0.07 * s,
          height: height * 0.16 * s,
          borderRadius: 6,
          backgroundColor: color,
          transform: [{ rotate: '18deg' }],
        }}
      />
    </Animated.View>
  );
}

/** Bassin de natation : lignes de couloir + marquages, sans nageur. */
function SwimPoolScene({
  c1,
  c2,
  height,
  compact,
  wash,
  drift,
  pulse,
}: {
  c1: string;
  c2: string;
  height: number;
  compact: boolean;
  wash: Animated.Value;
  drift: Animated.Value;
  pulse: Animated.Value;
}) {
  const laneCount = compact ? 4 : 5;
  const markerSize = compact ? 5 : 7;
  const topPad = height * (compact ? 0.14 : 0.12);
  const bottomPad = height * (compact ? 0.14 : 0.12);
  const usable = Math.max(height - topPad - bottomPad, 24);

  const lanes = useMemo(
    () =>
      Array.from({ length: laneCount }, (_, i) => ({
        id: i,
        top: topPad + (usable * i) / Math.max(laneCount - 1, 1),
      })),
    [laneCount, topPad, usable],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Lavis d’eau subtil */}
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={`wash-${i}`}
          style={{
            position: 'absolute',
            left: -24,
            right: -24,
            top: height * (0.08 + i * 0.28),
            height: height * 0.32,
            borderRadius: height,
            backgroundColor: i % 2 ? c2 : c1,
            opacity: wash.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08 + i * 0.03, 0.16 + i * 0.04],
            }),
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: i % 2 ? [-18, 22] : [16, -14],
                }),
              },
              {
                scaleX: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.06],
                }),
              },
            ],
          }}
        />
      ))}

      {/* Lignes de couloir */}
      {lanes.map((lane) => (
        <Animated.View
          key={`pl-${lane.id}`}
          style={{
            position: 'absolute',
            left: compact ? 14 : 18,
            right: compact ? 14 : 18,
            top: lane.top,
            height: compact ? 1.5 : 2,
            backgroundColor: '#FFFFFF',
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 0.38],
            }),
          }}
        />
      ))}

      {/* Marqueurs latéraux (murs / plots) */}
      {lanes.map((lane) => (
        <View key={`mk-${lane.id}`}>
          <View
            style={{
              position: 'absolute',
              left: compact ? 4 : 6,
              top: lane.top - markerSize / 2,
              width: markerSize,
              height: markerSize,
              borderRadius: markerSize,
              backgroundColor: c2,
              opacity: 0.55,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: compact ? 4 : 6,
              top: lane.top - markerSize / 2,
              width: markerSize,
              height: markerSize,
              borderRadius: markerSize,
              backgroundColor: c2,
              opacity: 0.55,
            }}
          />
        </View>
      ))}

      {/* Reflet / shimmer doux */}
      <Animated.View
        style={{
          position: 'absolute',
          left: '18%',
          right: '18%',
          top: height * 0.2,
          height: height * 0.18,
          borderRadius: 40,
          backgroundColor: '#FFFFFF',
          opacity: wash.interpolate({
            inputRange: [0, 1],
            outputRange: [0.04, 0.12],
          }),
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 16],
              }),
            },
          ],
        }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  markWrap: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingBottom: 10,
  },
  crestLayer: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestHalo: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  markPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(6,13,24,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  watermark: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  preview: {
    height: 84,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
  },
  previewSelected: { borderWidth: 3 },
  previewMarkPill: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(6,13,24,0.5)',
  },
  previewMark: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  orb: { position: 'absolute', borderRadius: 999 },
  heatFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  centerFill: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  skyline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.85,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});
