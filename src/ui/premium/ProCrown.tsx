import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { isPremiumUiVisible } from '../../premium/featureFlags';

type Props = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Forcer l’affichage (tests) — ignore le flag. */
  force?: boolean;
};

/**
 * Couronne Pro (style Canva) — invisible tant que PREMIUM_UI_ENABLED = false.
 */
export function ProCrown({
  size = 14,
  color = '#C9A227',
  style,
  force = false,
}: Props) {
  if (!force && !isPremiumUiVisible()) return null;

  return (
    <View style={[{ width: size, height: size }, style]} accessibilityLabel="Pro">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3.5 8.5 7 13l5-7 5 7 3.5-4.5V18a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V8.5Z"
          fill={color}
        />
        <Path
          d="M7 13 3.5 8.5 5 6l2 4M12 6l-1.2-3L12 6l1.2-3L12 6M17 10l2-4 1.5 2.5"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}
