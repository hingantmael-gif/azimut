import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useApp } from '../src/store/AppContext';
import { useThemeColors } from '../src/theme/ThemeContext';

export default function Index() {
  const { state, sessionReady } = useApp();
  const { colors } = useThemeColors();

  if (!sessionReady) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!state.authToken) return <Redirect href="/(auth)/welcome" />;
  if (!state.profile.emailVerified) return <Redirect href="/(auth)/verify-2fa" />;
  if (!state.profile.onboardingCompleted) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
