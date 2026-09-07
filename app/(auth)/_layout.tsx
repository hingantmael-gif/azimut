import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/tokens';
import { AlwaysBackButton } from '../../src/ui/navigation/AlwaysBackButton';
import { AUTH_LABELS, AUTH_PLAIN } from '../../src/constants/authLabels';

function AuthHeaderTitle({ title }: { title: string }) {
  const plain = title.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  return (
    <Text
      accessibilityLabel={plain}
      style={{
        color: colors.text,
        fontWeight: '600',
        fontSize: 17,
        writingDirection: 'ltr',
        textAlign: 'center',
      }}
    >
      {plain}
    </Text>
  );
}

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerBackTitle: 'Retour',
        headerLeft: () => (
          <AlwaysBackButton
            tintColor={colors.text}
            fallbackHref="/(auth)/welcome"
          />
        ),
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          title: AUTH_PLAIN.signIn,
          headerShown: true,
          headerTitle: () => <AuthHeaderTitle title={AUTH_LABELS.signIn} />,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Inscription',
          headerShown: true,
          headerTitle: () => <AuthHeaderTitle title="Inscription" />,
        }}
      />
      <Stack.Screen
        name="verify-2fa"
        options={{
          title: 'Vérification',
          headerTitle: () => <AuthHeaderTitle title="Vérification" />,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ title: 'Profil sportif', headerShown: false, headerBackVisible: false }}
      />
    </Stack>
  );
}
