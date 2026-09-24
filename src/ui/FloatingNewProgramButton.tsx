import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import { IconAdd } from './icons/AppIcons';
import { PressableScale } from './motion/softMotion';

const SIZE = 56;

/** FAB circulaire — nouveau programme (Accueil / Plan). */
export function FloatingNewProgramButton() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <PressableScale
      variant="pop"
      accessibilityLabel="Nouveau programme"
      accessibilityRole="button"
      onPress={() => router.push('/program/new')}
      style={[
        styles.wrap,
        {
          bottom: Math.max(insets.bottom, 12) + 12,
          right: 16,
        },
      ]}
      contentStyle={[
        styles.fab,
        {
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
        },
      ]}
    >
      <View pointerEvents="none">
        <IconAdd size={28} color="#FFFFFF" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 80,
    elevation: 80,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
