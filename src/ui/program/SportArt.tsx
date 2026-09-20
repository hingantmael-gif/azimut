import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
export { distanceLabelFromTitle } from './distanceLabel';

/**
 * Visuels thématiques des disciplines (remplacent les photos) : chaque sport a sa scène
 * dessinée (pistes, roue, vagues, anneaux, montagnes, barre…), un dégradé de marque et un
 * voile sombre en bas — le texte blanc posé dessus reste toujours lisible.
 */
export type ArtKind =
  | 'run'
  | 'bike'
  | 'swim'
  | 'triathlon'
  | 'ironman'
  | 'strength'
  | 'calisthenics'
  | 'other';

export function artKindFor(category?: string | null): ArtKind {
  switch (category) {
    case 'run':
    case 'bike':
    case 'swim':
    case 'triathlon':
    case 'ironman':
    case 'strength':
      return category;
    case 'other':
    case 'calisthenics':
      return 'calisthenics';
    default:
      return 'other';
  }
}

type Look = { from: string; to: string; accent: string; icon: keyof typeof Ionicons.glyphMap };

export const ART_LOOKS: Record<ArtKind, Look> = {
  run: { from: '#052E2B', to: '#0E7C66', accent: '#5EF2B4', icon: 'walk' },
  bike: { from: '#3A1A05', to: '#B45309', accent: '#FCD34D', icon: 'bicycle' },
  swim: { from: '#041B3B', to: '#0369A1', accent: '#7DD3FC', icon: 'water' },
  triathlon: { from: '#1E1145', to: '#5B21B6', accent: '#C4B5FD', icon: 'trophy' },
  ironman: { from: '#3B0A14', to: '#B91C1C', accent: '#FDBA74', icon: 'flame' },
  strength: { from: '#2A0F3D', to: '#9D174D', accent: '#F9A8D4', icon: 'barbell' },
  calisthenics: { from: '#3B1204', to: '#C2410C', accent: '#FDE68A', icon: 'body' },
  other: { from: '#0F172A', to: '#334155', accent: '#94A3B8', icon: 'ellipse' },
};

const W = 520;
const H = 240;

function wave(y: number, amp: number, freq: number, phase: number): string {
  let d = `M -20 ${y}`;
  for (let x = -20; x <= W + 20; x += 20) {
    d += ` L ${x} ${(y + amp * Math.sin(x * freq + phase)).toFixed(1)}`;
  }
  return d;
}

function Motif({ kind, accent, seed }: { kind: ArtKind; accent: string; seed: number }) {
  const s = (seed % 97) / 97;
  switch (kind) {
    case 'run':
      // Pistes qui convergent vers l'horizon, pointillés = mouvement.
      return (
        <G>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path
              key={i}
              d={`M -30 ${150 + i * 26} Q ${W * 0.5} ${90 + i * 10 - s * 20} ${W + 30} ${40 + i * 30}`}
              stroke={i === 2 ? accent : '#FFFFFF'}
              strokeOpacity={i === 2 ? 0.55 : 0.2}
              strokeWidth={i === 2 ? 3 : 2}
              strokeDasharray={i % 2 ? '16 12' : '2 0'}
              fill="none"
            />
          ))}
          <Circle cx={W * 0.78} cy={70} r={46} fill={accent} fillOpacity={0.18} />
          <Circle cx={W * 0.78} cy={70} r={26} fill={accent} fillOpacity={0.28} />
        </G>
      );
    case 'bike':
      return (
        <G>
          <Circle cx={W * 0.74} cy={128} r={96} stroke={accent} strokeOpacity={0.4} strokeWidth={4} fill="none" />
          <Circle cx={W * 0.74} cy={128} r={64} stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={2} fill="none" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 + s;
            return (
              <Line
                key={i}
                x1={W * 0.74}
                y1={128}
                x2={W * 0.74 + 96 * Math.cos(a)}
                y2={128 + 96 * Math.sin(a)}
                stroke="#FFFFFF"
                strokeOpacity={0.14}
                strokeWidth={1.5}
              />
            );
          })}
          <Path d={`M -20 214 Q ${W * 0.5} 168 ${W + 20} 206`} stroke={accent} strokeOpacity={0.5} strokeWidth={3} fill="none" />
        </G>
      );
    case 'swim':
      return (
        <G>
          {[0, 1, 2, 3].map((i) => (
            <Path
              key={i}
              d={wave(120 + i * 30, 12 + i * 3, 0.018 + i * 0.004, s * 6 + i * 1.3)}
              stroke={i === 1 ? accent : '#FFFFFF'}
              strokeOpacity={i === 1 ? 0.6 : 0.22}
              strokeWidth={i === 1 ? 3 : 2}
              fill="none"
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Circle key={i} cx={60 + i * 90 + s * 20} cy={70 + (i % 2) * 34} r={4 + (i % 3) * 2} stroke={accent} strokeOpacity={0.5} fill="none" strokeWidth={1.5} />
          ))}
        </G>
      );
    case 'triathlon':
      return (
        <G>
          <Circle cx={W * 0.62} cy={100} r={70} stroke="#7DD3FC" strokeOpacity={0.55} strokeWidth={4} fill="none" />
          <Circle cx={W * 0.76} cy={128} r={70} stroke="#FCD34D" strokeOpacity={0.55} strokeWidth={4} fill="none" />
          <Circle cx={W * 0.69} cy={82} r={70} stroke="#5EF2B4" strokeOpacity={0.55} strokeWidth={4} fill="none" />
        </G>
      );
    case 'ironman':
      return (
        <G>
          <Circle cx={W * 0.8} cy={78} r={44} fill={accent} fillOpacity={0.3} />
          <Polygon points={`-20,${H} 90,${120 - s * 18} 170,${170} 250,${100 - s * 14} 350,${H}`} fill="#000" fillOpacity={0.28} />
          <Polygon points={`180,${H} 300,${110} 380,${150} 470,${84 - s * 10} 560,${H}`} fill="#000" fillOpacity={0.22} />
          <Path d={`M -20 ${200} Q ${W * 0.5} ${176} ${W + 20} ${208}`} stroke={accent} strokeOpacity={0.45} strokeWidth={3} fill="none" />
        </G>
      );
    case 'strength':
      return (
        <G>
          <Rect x={40} y={116} width={W - 80} height={8} rx={4} fill="#FFFFFF" fillOpacity={0.3} />
          {[0, 1, 2].map((i) => (
            <G key={i}>
              <Rect x={88 + i * 16} y={78 - i * 8} width={12} height={84 + i * 16} rx={4} fill={accent} fillOpacity={0.5 - i * 0.1} />
              <Rect x={W - 100 - i * 16} y={78 - i * 8} width={12} height={84 + i * 16} rx={4} fill={accent} fillOpacity={0.5 - i * 0.1} />
            </G>
          ))}
          <Circle cx={W * 0.5} cy={120} r={56} stroke={accent} strokeOpacity={0.3} strokeWidth={3} fill="none" />
        </G>
      );
    case 'calisthenics':
      return (
        <G>
          <Rect x={70} y={60} width={W - 140} height={9} rx={4} fill="#FFFFFF" fillOpacity={0.35} />
          <Rect x={70} y={60} width={9} height={170} rx={4} fill="#FFFFFF" fillOpacity={0.22} />
          <Rect x={W - 79} y={60} width={9} height={170} rx={4} fill="#FFFFFF" fillOpacity={0.22} />
          <Path d={`M ${W * 0.3} 200 Q ${W * 0.5} ${90 + s * 30} ${W * 0.7} 200`} stroke={accent} strokeOpacity={0.55} strokeWidth={3} fill="none" />
          <Circle cx={W * 0.5} cy={86} r={16} fill={accent} fillOpacity={0.4} />
        </G>
      );
    default:
      return (
        <G>
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 14 }).map((__, c) => (
              <Circle key={`${r}-${c}`} cx={20 + c * 38} cy={30 + r * 36} r={2} fill="#FFFFFF" fillOpacity={0.18} />
            )),
          )}
        </G>
      );
  }
}

export function SportArt({
  kind,
  seed = 0,
  height = 160,
  borderRadius = 20,
  style,
  contentStyle,
  children,
  animated = true,
  // Props historiques de SportCover : acceptées et ignorées (plus de photo).
  source: _source,
  minHeight,
  objectPosition: _objectPosition,
  scrim: _scrim,
}: {
  kind: ArtKind;
  seed?: number;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
  animated?: boolean;
  /** Ignoré : plus aucun chiffre en filigrane (illisible) — seul le symbole du sport reste. */
  label?: string | null;
  source?: unknown;
  minHeight?: number;
  objectPosition?: unknown;
  scrim?: unknown;
}) {
  const look = ART_LOOKS[kind];
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000 + (seed % 5) * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000 + (seed % 5) * 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [drift, seed, animated]);

  const motif = useMemo(() => <Motif kind={kind} accent={look.accent} seed={seed} />, [kind, look.accent, seed]);

  return (
    <View
      style={[
        { height: Math.max(height, minHeight ?? 0), borderRadius, overflow: 'hidden', backgroundColor: look.from },
        style,
      ]}
    >
      <LinearGradient
        colors={[look.from, look.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] }) },
              { scale: 1.06 },
            ],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          {motif}
        </Svg>
      </Animated.View>
      {/* Symbole du sport (coureur, vélo, goutte, trophée…) : net, à droite, sans chiffre ni rotation. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center', opacity: 0.55 }}
      >
        <Ionicons name={look.icon} size={Math.round(Math.max(height, minHeight ?? 0) * 0.42)} color={look.accent} />
      </View>
      {/* Voile sombre en bas : le texte blanc reste lisible sur toutes les teintes. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(3,8,18,0.72)']}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, contentStyle]}>{children}</View>
    </View>
  );
}
