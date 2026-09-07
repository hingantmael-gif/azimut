import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/store/AppContext';
import { ThemeProvider, useThemeColors } from '../src/theme/ThemeContext';
import { PhoneShell } from '../src/ui/PhoneShell';
import { NotificationBootstrap } from '../src/ui/notifications/NotificationBootstrap';
import { PendingProgramReviewModal } from '../src/ui/program/PendingProgramReviewModal';
import { GlobalLevelUpHost } from '../src/ui/ranked/GlobalLevelUpHost';
import { XpGainToast } from '../src/ui/ranked/XpGainToast';
import { SettingsSearchSession } from '../src/ui/settings/SettingsSearchSession';
import { AlwaysBackButton } from '../src/ui/navigation/AlwaysBackButton';
import { getAuthRedirect, isRouteAuthorized } from '../src/navigation/authRoute';

function AuthGate({ children }: { children: ReactNode }) {
  const { state, sessionReady } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useThemeColors();

  useEffect(() => {
    if (!sessionReady) return;

    const redirect = getAuthRedirect(segments as string[], {
      authToken: state.authToken,
      emailVerified: state.profile.emailVerified,
      onboardingCompleted: state.profile.onboardingCompleted,
    });
    if (redirect) router.replace(redirect as '/(auth)/welcome');
  }, [
    state.authToken,
    state.profile.emailVerified,
    state.profile.onboardingCompleted,
    segments,
    sessionReady,
    router,
  ]);

  const session = {
    authToken: state.authToken,
    emailVerified: state.profile.emailVerified,
    onboardingCompleted: state.profile.onboardingCompleted,
  };
  const routeOk = isRouteAuthorized(segments as string[], session);

  // Pendant la hydratation / redirect : spinner court — jamais bloqué à l’infini
  if (!sessionReady) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Redirect en cours : laisser le replace se faire sans spinner infini
  if (!routeOk) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

function AppShell() {
  const { colors, isDark } = useThemeColors();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PhoneShell>
        <AuthGate>
          <NotificationBootstrap />
          <PendingProgramReviewModal />
          <GlobalLevelUpHost />
          <XpGainToast />
          <SettingsSearchSession />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bgSecondary },
              headerShadowVisible: false,
              headerBackTitle: 'Retour',
              /** Toujours visible — même après refresh (historique vide). */
              headerLeft: () => <AlwaysBackButton tintColor={colors.text} />,
            }}
          >
            <Stack.Screen name="program" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="install" options={{ headerShown: false, title: 'Installer Azimut' }} />
            <Stack.Screen name="import-activity" options={{ title: 'Importer Strava' }} />
            <Stack.Screen name="activity/[id]" options={{ title: 'Activité' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Activité' }} />
            <Stack.Screen name="session/rpe" options={{ title: 'Effort ressenti' }} />
            <Stack.Screen name="ranked" options={{ title: 'Classement' }} />
            <Stack.Screen name="badges" options={{ title: 'Badges' }} />
            <Stack.Screen name="activities" options={{ title: 'Activités' }} />
            <Stack.Screen name="programs" options={{ title: 'Programmes' }} />
            <Stack.Screen name="recovery" options={{ title: 'Récupération' }} />
            <Stack.Screen name="nutrition" options={{ title: 'Nutrition' }} />
            <Stack.Screen name="race-predictor" options={{ title: 'Prédiction' }} />
            <Stack.Screen name="multisport" options={{ title: 'Multi-sport' }} />
            <Stack.Screen name="safety" options={{ title: 'Sécurité' }} />
            <Stack.Screen name="coach-vokal" options={{ title: 'Coach' }} />
            <Stack.Screen name="year-review" options={{ title: 'Bilan annuel' }} />
            <Stack.Screen name="search" options={{ title: 'Athlètes' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="connections" options={{ title: 'Réseau' }} />
            <Stack.Screen name="user/[username]" options={{ title: 'Profil' }} />
            <Stack.Screen name="user/evolution" options={{ title: 'Évolution' }} />
            <Stack.Screen name="user/programs" options={{ title: 'Programmes' }} />
            <Stack.Screen name="sleep" options={{ title: 'Sommeil' }} />
            <Stack.Screen name="settings/index" options={{ title: 'Paramètres' }} />
            <Stack.Screen name="settings/profile" options={{ title: 'Modifier le profil' }} />
            <Stack.Screen name="settings/profile-cover" options={{ title: 'Fond de profil' }} />
            <Stack.Screen name="settings/goals" options={{ title: 'Objectifs & niveau' }} />
            <Stack.Screen name="settings/sports-data" options={{ title: 'Données sportives' }} />
            <Stack.Screen name="settings/athlete-profile" options={{ title: 'Profil sportif' }} />
            <Stack.Screen name="settings/performance" options={{ title: 'Ma forme' }} />
            <Stack.Screen name="settings/subscription" options={{ title: 'Tout explorer' }} />
            <Stack.Screen name="settings/watch" options={{ title: 'Montre' }} />
            <Stack.Screen name="settings/devices" options={{ title: 'Appareils & sync' }} />
            <Stack.Screen name="settings/integrations" options={{ title: 'Appareils & sync' }} />
            <Stack.Screen name="settings/privacy" options={{ title: 'Qui peut me voir' }} />
            <Stack.Screen name="settings/data-permissions" options={{ title: 'Autorisations' }} />
            <Stack.Screen name="settings/display" options={{ title: 'Unités et carte' }} />
            <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="settings/email" options={{ title: 'E-mail' }} />
            <Stack.Screen name="settings/partners" options={{ title: 'Partenaires' }} />
            <Stack.Screen name="settings/help" options={{ title: 'Centre d\'aide' }} />
            <Stack.Screen name="settings/terms" options={{ title: 'CGU' }} />
            <Stack.Screen name="settings/privacy-policy" options={{ title: 'Politique de confidentialité' }} />
            <Stack.Screen name="settings/account" options={{ title: 'Compte et sécurité' }} />
          </Stack>
        </AuthGate>
      </PhoneShell>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
