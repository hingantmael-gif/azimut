import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { radii } from '../theme/tokens';

/** Encadre une action quand on arrive depuis le catalogue Fonctionnalités. */
export function FocusTarget({
  active,
  children,
  style,
}: {
  active: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        active
          ? {
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: radii.md,
              padding: 4,
              backgroundColor: colors.accentLight,
            }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
