import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * Pastille « athlète certifié » Mova : bouclier à facettes (jade → cyan) traversé d'un trait de course
 * qui finit en coche. Volontairement différente de la pastille bleue d'autres réseaux.
 */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Athlète certifié" accessibilityRole="image">
      <Defs>
        <LinearGradient id="mvb" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3DFF9A" />
          <Stop offset="1" stopColor="#22D3EE" />
        </LinearGradient>
      </Defs>
      {/* bouclier à six facettes */}
      <Path d="M12 1.6 20.6 5.2c.5 6.9-1.2 12.4-8.6 17.2C4.6 17.6 2.9 12.100 3.4 5.2Z" fill="url(#mvb)" />
      {/* reflet */}
      <Path d="M12 1.6 3.4 5.2c-.3 4.3.4 7.9 2.300 10.700L12 12Z" fill="#FFFFFF" fillOpacity={0.22} />
      {/* trait de course + coche */}
      <Path d="M7.200 12.400 10.600 15.600 16.800 8.400" fill="none" stroke="#062A22" strokeWidth={2.300} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
