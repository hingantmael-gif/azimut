import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { seedFromString } from '../../engines/topoLines';
import { AuroraPattern, patternForSport } from '../atmosphere/AuroraPatterns';

import { SPORT_TINTS, tintForSport } from '../../theme/sportTints';

export { SPORT_TINTS, tintForSport };

/** Halo qui dérive lentement dans un aller-retour (amplitude visible à l'œil). */
export function DriftBlob({
  size,
  color,
  opacity,
  style,
  dx,
  dy,
  ms,
  delay = 0,
  paused = false,
}: {
  size: number;
  color: string;
  opacity: number;
  style: object;
  dx: number;
  dy: number;
  ms: number;
  delay?: number;
  /** Écran en arrière-plan : on fige l'animation (économie de batterie). */
  paused?: boolean;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const id = useMemo(() => `wb${Math.random().toString(36).slice(2, 8)}`, []);
  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms, delay, paused]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size },
        style,
        {
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-dx, dx] }) },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, -dy] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.1] }) },
          ],
        },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Fond unique de l'assistant « Nouveau programme », à toutes les étapes :
 * encre nuit + (photo du programme fondue, si choisie) + halos qui dérivent + courbes de
 * niveau mobiles, teintés selon le sport. Le mouvement est volontairement lisible.
 */
export function WizardBackdrop({
  sport,
  photo,
  photoStyle,
}: {
  sport?: string | null;
  photo?: ImageSourcePropType | null;
  photoStyle?: StyleProp<ImageStyle>;
}) {
  const { width, height } = useWindowDimensions();
  const w = Math.max(320, width);
  const h = Math.max(560, height);
  const [accent, accent2] = tintForSport(sport);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#050B16', '#0A1A2B', '#06121E']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {photo ? (
        <>
          <ImageBackground
            source={photo}
            style={[StyleSheet.absoluteFill, { opacity: 0.34 }]}
            imageStyle={photoStyle}
            resizeMode="cover"
          />
          {/* Voile : la photo est nette en haut, se fond dans l'ambiance vers le bas. */}
          <LinearGradient
            colors={['rgba(5,11,22,0.05)', 'rgba(5,11,22,0.55)', 'rgba(5,11,22,0.9)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      <DriftBlob size={w * 1.5} color={accent} opacity={0.4} dx={46} dy={34} ms={7600} style={{ top: -h * 0.12, left: -w * 0.55 }} />
      <DriftBlob size={w * 1.4} color={accent2} opacity={0.36} dx={40} dy={44} ms={9200} delay={900} style={{ top: h * 0.32, right: -w * 0.6 }} />
      <DriftBlob size={w * 1.1} color={accent} opacity={0.22} dx={34} dy={30} ms={11000} delay={1800} style={{ bottom: -h * 0.08, left: -w * 0.2 }} />
      <AuroraPattern
        kind={patternForSport(sport)}
        color={accent}
        color2={accent2}
        seed={seedFromString(`mova-wizard-${sport ?? 'x'}`)}
        opacity={0.8}
      />
      {/* Voile en haut : titre et progression « 1/7 » restent lisibles. */}
      <LinearGradient
        colors={['rgba(5,11,22,0.7)', 'rgba(5,11,22,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: h * 0.24 }}
      />
    </View>
  );
}

/** @deprecated Conservé pour compatibilité : la photo se fond désormais dans `WizardBackdrop`. */
export function WizardPhotoScrim() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(5,11,22,0.30)', 'rgba(5,11,22,0.62)', 'rgba(5,11,22,0.92)']}
      locations={[0, 0.38, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}
