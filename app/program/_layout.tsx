import { Stack } from 'expo-router';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { AtmosphereLayer, useHeaderColor } from '../../src/ui/atmosphere/ScreenAtmosphere';
import { AlwaysBackButton } from '../../src/ui/navigation/AlwaysBackButton';

/** `new` dessine son propre fond (assistant). */

export default function ProgramLayout() {
  const { colors } = useThemeColors();
  const headerColor = useHeaderColor();
  return (
    <Stack
      screenLayout={({ route, children }) => (route.name === 'new' ? children : <AtmosphereLayer>{children}</AtmosphereLayer>)}
      screenOptions={{
        headerStyle: { backgroundColor: headerColor },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
        headerLeft: () => <AlwaysBackButton tintColor={colors.text} />,
        animation: 'fade_from_bottom',
        animationDuration: 400,
      }}
    >
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="progress" options={{ title: 'Évolution' }} />
      <Stack.Screen name="detail" options={{ title: 'Programme' }} />
      <Stack.Screen name="adjust" options={{ title: 'Ajuster' }} />
    </Stack>
  );
}

export { RouteLoading as SuspenseFallback } from '../../src/ui/RouteLoading';
