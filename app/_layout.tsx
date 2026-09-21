import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { RouteError } from '../src/ui/RouteError';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { AppProvider, useApp } from '../src/store/AppContext';
import { ThemeProvider, useThemeColors } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { I18nProvider } from '../src/i18n/I18nContext';
import { PhoneShell } from '../src/ui/PhoneShell';
import { DialogHost } from '../src/ui/dialog/DialogHost';
import { WebPwaBootstrap } from '../src/ui/WebPwaBootstrap';
import { AmbientSportProvider } from '../src/theme/AmbientSport';
import { InstalledAccountGate } from '../src/ui/auth/InstalledAccountGate';
import { CloudSyncBootstrap } from '../src/ui/sync/CloudSyncBootstrap';
import { RemoteConfigBootstrap } from '../src/ui/sync/RemoteConfigBootstrap';
import { AtmosphereLayer, useHeaderColor } from '../src/ui/atmosphere/ScreenAtmosphere';
import { NotificationBootstrap } from '../src/ui/notifications/NotificationBootstrap';
import { SocialInboxBootstrap } from '../src/ui/notifications/SocialInboxBootstrap';
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

/** Écrans qui dessinent déjà leur propre fond (auth, tracker, navigateurs imbriqués). */
const OWN_BACKDROP = new Set(['program', '(auth)', '(tabs)', 'install', 'session/guided', 'session/live']);

function AppShell() {
  const { colors, isDark } = useThemeColors();
  const headerColor = useHeaderColor();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <WebPwaBootstrap />
      <PhoneShell>
        <AuthGate>
          <NotificationBootstrap />
          <InstalledAccountGate />
          <CloudSyncBootstrap />
          <RemoteConfigBootstrap />
          <SocialInboxBootstrap />
          <PendingProgramReviewModal />
          <GlobalLevelUpHost />
          <XpGainToast />
          <SettingsSearchSession />
          <DialogHost />
          <Stack
            screenLayout={({ route, children }) => (OWN_BACKDROP.has(route.name) ? children : <AtmosphereLayer>{children}</AtmosphereLayer>)}
            screenOptions={{
              headerStyle: { backgroundColor: headerColor },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.extrabold, fontSize: 19 },
              contentStyle: { backgroundColor: colors.bgSecondary },
              headerShadowVisible: false,
              headerBackTitle: 'Retour',
              animation: 'fade_from_bottom',
              animationDuration: 420,
              /** Toujours visible — même après refresh (historique vide). */
              headerLeft: () => <AlwaysBackButton tintColor={colors.text} />,
            }}
          >
            <Stack.Screen name="program" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="install" options={{ headerShown: false, title: 'Installer Mova' }} />
            <Stack.Screen name="import-activity" options={{ title: 'Importer Strava' }} />
            <Stack.Screen name="activity/[id]" options={{ title: 'Activité' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Activité' }} />
            <Stack.Screen
              name="session/guided"
             
              options={{ title: 'Séance guidée', headerShown: false }}
            />
            <Stack.Screen
              name="session/live"
             
              options={{ title: 'Séance live', headerShown: false }}
            />
            <Stack.Screen name="session/rpe" options={{ title: 'Effort ressenti' }} />
            <Stack.Screen name="ranked" options={{ title: 'Classement' }} />
            <Stack.Screen name="badges" options={{ title: 'Badges' }} />
            <Stack.Screen name="activities" options={{ title: 'Activités' }} />
            <Stack.Screen name="programs" options={{ title: 'Programmes' }} />
            <Stack.Screen name="library" options={{ title: 'Séances' }} />
            <Stack.Screen name="calisthenics" options={{ title: 'Callisthénie' }} />
            <Stack.Screen name="recovery" options={{ title: 'Récupération' }} />
            <Stack.Screen name="nutrition" options={{ title: 'Nutrition' }} />
            <Stack.Screen name="race-predictor" options={{ title: 'Prédiction' }} />
            <Stack.Screen name="multisport" options={{ title: 'Multi-sport' }} />
            <Stack.Screen name="safety" options={{ title: 'Sécurité' }} />
            <Stack.Screen name="coach-vokal" options={{ title: 'Coach' }} />
            <Stack.Screen name="year-review" options={{ title: 'Bilan annuel' }} />
            <Stack.Screen name="week-review" options={{ title: 'Bilan hebdomadaire' }} />
            <Stack.Screen name="search" options={{ title: 'Athlètes' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="connections" options={{ title: 'Réseau' }} />
            <Stack.Screen name="group/[id]" options={{ title: 'Groupe' }} />
            <Stack.Screen name="user/[username]" options={{ title: 'Profil' }} />
            <Stack.Screen name="user/evolution" options={{ title: 'Évolution' }} />
            <Stack.Screen name="user/programs" options={{ title: 'Programmes' }} />
            <Stack.Screen name="sleep" options={{ title: 'Sommeil' }} />
            <Stack.Screen name="settings/index" options={{ title: 'Paramètres' }} />
            <Stack.Screen name="settings/profile" options={{ title: 'Modifier le profil' }} />
            <Stack.Screen name="settings/profile-cover" options={{ title: 'Fond de profil' }} />
            <Stack.Screen name="settings/goals" options={{ title: 'Objectifs & niveau' }} />
            <Stack.Screen name="settings/sports-data" options={{ title: 'Données sportives' }} />
            <Stack.Screen name="settings/athlete-hub" options={{ title: 'Profil sportif' }} />
            <Stack.Screen name="settings/athlete-profile" options={{ title: 'Objectif & volume' }} />
            <Stack.Screen name="settings/performance" options={{ title: 'Ma forme' }} />
            <Stack.Screen name="settings/subscription" options={{ title: 'Abonnement Premium' }} />
            <Stack.Screen name="settings/watch" options={{ title: 'Montre' }} />
            <Stack.Screen name="settings/training-schedule" options={{ title: 'Disponibilités' }} />
            <Stack.Screen name="settings/devices" options={{ title: 'Appareils & sync' }} />
            {/* integrations / partners : redirects legacy → devices (pas dans le hub) */}
            <Stack.Screen name="settings/privacy" options={{ title: 'Qui peut me voir' }} />
            <Stack.Screen name="settings/data-permissions" options={{ title: 'Autorisations' }} />
            <Stack.Screen name="settings/display" options={{ title: 'Unités et carte' }} />
            <Stack.Screen name="settings/notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="settings/email" options={{ title: 'E-mail' }} />
            <Stack.Screen name="settings/help" options={{ title: 'Centre d\'aide' }} />
            <Stack.Screen name="settings/contact" options={{ title: 'Écrire à Mova' }} />
            <Stack.Screen name="settings/messages" options={{ title: 'Messages' }} />
            <Stack.Screen name="settings/community-rules" options={{ title: 'Règles de la communauté' }} />
            <Stack.Screen name="settings/terms" options={{ title: 'Informations légales' }} />
            <Stack.Screen name="settings/legal/[doc]" options={{ title: 'Document légal' }} />
            <Stack.Screen name="settings/privacy-policy" options={{ title: 'Politique de confidentialité' }} />
            <Stack.Screen name="settings/account" options={{ title: 'Compte et sécurité' }} />
            <Stack.Screen
              name="settings/premium-manage"
              options={{ title: 'Gestion compte premium' }}
            />
          </Stack>
        </AuthGate>
      </PhoneShell>
    </>
  );
}

/** Au-delà de ce délai on affiche l'app quand même (police système en repli). */
const FONT_LOAD_TIMEOUT_MS = 1200;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimeout(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // Évite un flash de police système : on attend Manrope (max 3 s, jamais bloquant).
  if (!fontsLoaded && !fontError && !fontTimeout) {
    return <View style={styles.fontBoot} />;
  }

  return (
    <AppProvider>
      <ThemeProvider>
        <I18nProvider>
          <AmbientSportProvider>
            <AppShell />
          </AmbientSportProvider>
        </I18nProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  fontBoot: {
    flex: 1,
    backgroundColor: '#F5F8F7',
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Pendant le chargement d'une page (découpage par écran) : squelette, jamais du blanc. */
export { RouteLoading as SuspenseFallback } from '../src/ui/RouteLoading';

/** Une page qui plante ou qui ne se charge pas : message + « Réessayer » au lieu d'un écran vide. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <RouteError error={error} retry={retry} />;
}
