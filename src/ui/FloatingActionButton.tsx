import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from './motion/softMotion';
import { useThemeColors } from '../theme/ThemeContext';
import { BRAND } from '../constants/brand';

type Props = {
  /** Route cible (défaut : nouveau programme) */
  href?: string;
  accessibilityLabel?: string;
};

/**
 * FAB « + » — remplace le tab Nouveau (audit UX).
 * Toujours visible en bas à droite sur Accueil / Plan.
 */
export function FloatingActionButton({
  href = '/program/new',
  accessibilityLabel = 'Nouveau programme',
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeColors();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 8) + 62,
          right: 18,
        },
      ]}
    >
      <PressableScale
        variant="pop"
        accessibilityLabel={accessibilityLabel}
        onPress={() => router.push(href as '/program/new')}
        contentStyle={[
          styles.fab,
          {
            backgroundColor: colors.accent ?? BRAND.accent,
            ...(Platform.OS === 'web'
              ? ({ boxShadow: '0 8px 24px rgba(7,17,31,0.28)' } as object)
              : {
                  shadowColor: '#07111F',
                  shadowOpacity: 0.28,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }),
          },
        ]}
      >
        <Text style={styles.plus}>+</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 40,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
    marginTop: -2,
  },
});
