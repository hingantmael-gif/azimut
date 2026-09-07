import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * Comme BTP Pro : l’app = le viewport entier (pas de faux cadre téléphone).
 * Plein écran téléphone / tablette / PC / PWA installée.
 */
export function PhoneShell({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%' as unknown as number,
    minHeight: Platform.OS === 'web' ? ('100dvh' as unknown as number) : undefined,
    height: Platform.OS === 'web' ? ('100%' as unknown as number) : undefined,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
});
