import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { seedFromString } from '../../engines/topoLines';
import { TopoLines } from '../profile/TopoLines';

/**
 * Fond de l'assistant quand aucune photo n'est encore choisie (étapes 1–2) :
 * encre nuit + halos jade/cyan + courbes de niveau. Même ambiance sombre que les étapes
 * sur photo, pour que tout l'assistant soit cohérent (fini le fond blanc vide).
 */
export function WizardBackdrop({ accent = '#3DFF9A', accent2 = '#22D3EE' }: { accent?: string; accent2?: string }) {
  const { width, height } = useWindowDimensions();
  const w = Math.max(320, width);
  const h = Math.max(560, height);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#050B16', '#0A1A2B', '#06121E']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="wbA" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent} stopOpacity={0.34} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="wbB" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={accent2} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={accent2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={w * 0.05} cy={h * 0.12} r={w * 0.85} fill="url(#wbA)" />
        <Circle cx={w * 1.0} cy={h * 0.62} r={w * 0.8} fill="url(#wbB)" />
      </Svg>
      <TopoLines color={accent} height={h} seed={seedFromString('mova-wizard')} lines={16} opacity={0.2} />
    </View>
  );
}

/** Voile dégradé sur photo : haut léger (la photo respire), bas dense (le contenu se lit). */
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
