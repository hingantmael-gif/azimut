import { useEffect, useMemo } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import {
  INTEGRATION_LABELS,
  formatSyncDate,
  integrationStatus,
} from '../../src/constants/integrations';
import { filterVisibleIntegrations } from '../../src/services/integrationLinks';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { useProviderIntegrations } from '../../src/hooks/useProviderIntegrations';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

/** Applications et appareils connectés — Garmin, Apple Santé, Health Connect */
export default function DevicesScreen() {
  const router = useRouter();
  const { state } = useApp();
  const { colors } = useThemeColors();
  const { busy, onProviderPress, syncFromServer, remoteAuth, garminConfigured } =
    useProviderIntegrations();

  const integrations = useMemo(
    () => filterVisibleIntegrations(state.profile.integrations),
    [state.profile.integrations],
  );

  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  const openOsSettings = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Localisation',
        'Sur le web, autorise la localisation dans les paramètres du navigateur si une activité GPS le demande.',
      );
      return;
    }
    void Linking.openSettings();
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
            Garmin et montre — sync & sommeil.
          </Text>
        </View>

        <SettingsSection title="Montre & sommeil">
          <SettingsRow
            label="Montre"
            onPress={() => router.push('/settings/watch')}
          />
          <SettingsRow
            label="Importer sommeil"
            onPress={() => router.push('/sleep')}
          />
        </SettingsSection>

        <SettingsSection title="Applications">
          {integrations.map((item) => {
            const label = INTEGRATION_LABELS[item.provider] ?? item.provider;
            const status = integrationStatus(item.connected);
            const sync = item.connected ? formatSyncDate(item.lastSyncAt) : '';
            const value =
              busy === item.provider ? 'Ouverture…' : sync ? `${status} · ${sync}` : status;

            return (
              <SettingsRow
                key={item.provider}
                label={label}
                value={value}
                onPress={() => onProviderPress(item)}
              />
            );
          })}
        </SettingsSection>

        <SettingsSection title="Santé & localisation">
          <SettingsRow
            label="Données de santé"
            value="Via les apps ci-dessus"
            showChevron={false}
          />
          <SettingsRow
            label="Localisation (GPS)"
            value="Réglages système"
            onPress={openOsSettings}
          />
          <SettingsRow
            label="Historique de synchronisation"
            value={
              integrations.some((i) => i.connected && i.lastSyncAt)
                ? 'Voir dates ci-dessus'
                : 'Aucune sync'
            }
            showChevron={false}
          />
        </SettingsSection>

        {remoteAuth && !garminConfigured ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
              Liaison OAuth Garmin (sync automatique) : configure EXPO_PUBLIC_GARMIN_CLIENT_ID et
              GARMIN_CLIENT_ID/SECRET côté serveur.
            </Text>
          </View>
        ) : null}
      </AppScrollView>
    </SettingsScreen>
  );
}
