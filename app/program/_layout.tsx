import { Stack } from 'expo-router';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { AlwaysBackButton } from '../../src/ui/navigation/AlwaysBackButton';

export default function ProgramLayout() {
  const { colors } = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
        headerLeft: () => <AlwaysBackButton tintColor={colors.text} />,
      }}
    >
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="progress" options={{ title: 'Évolution' }} />
      <Stack.Screen name="detail" options={{ title: 'Programme' }} />
    </Stack>
  );
}
