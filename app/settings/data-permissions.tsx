import { useCallback, useState } from 'react';
import { Text } from '../../src/ui/Text';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsToggleRow,
} from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { requestPushPermission, syncLocalReminders } from '../../src/services/pushNotifications';
import { markNotificationPromptHandled } from '../../src/storage/notificationPrompt';
import {
  getCameraPermission,
  getLocationPermission,
  getMediaLibraryPermission,
  toggleCameraPermission,
  toggleLocationPermission,
  toggleMediaLibraryPermission,
} from '../../src/services/devicePermissions';
import { appConfirm } from '../../src/utils/appAlert';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

/**
 * Autorisations réellement demandables ici : notifications, localisation, caméra, photos,
 * et consentement au traitement des données de santé (sommeil, HRV, FC repos, charge).
 * Export / suppression du compte → ailleurs (compte).
 */
export default function DataPermissionsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const pushOn = Boolean(state.profile.pushEnabled);
  const healthConsentOn = state.profile.healthDataConsent !== false;
  const hasHealthData = Boolean(
    state.health.sleep ||
      (state.health.sleepHistory && state.health.sleepHistory.length > 0) ||
      state.health.hrv ||
      state.health.rhr ||
      state.health.bodyLoad,
  );

  const [cameraOn, setCameraOn] = useState(false);
  const [photosOn, setPhotosOn] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const [busy, setBusy] = useState<'camera' | 'photos' | 'push' | 'location' | 'health' | null>(
    null,
  );

  const refreshOsPermissions = useCallback(() => {
    void (async () => {
      const [cam, lib, loc] = await Promise.all([
        getCameraPermission(),
        getMediaLibraryPermission(),
        getLocationPermission(),
      ]);
      setCameraOn(cam.granted);
      setPhotosOn(lib.granted);
      setLocationOn(loc.granted);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshOsPermissions();
    }, [refreshOsPermissions]),
  );

  const togglePush = async () => {
    if (busy) return;
    setBusy('push');
    try {
      if (pushOn) {
        void markNotificationPromptHandled(
          state.profile.id,
          state.profile.email,
          state.profile.username,
        );
        dispatch({
          type: 'UPDATE_PROFILE',
          patch: { pushEnabled: false, pushPermissionAsked: true },
        });
        void syncLocalReminders([], false);
        return;
      }
      const granted = await requestPushPermission();
      void markNotificationPromptHandled(
        state.profile.id,
        state.profile.email,
        state.profile.username,
      );
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: {
          pushEnabled: granted,
          pushPermissionAsked: true,
        },
      });
      if (granted) void syncLocalReminders(state.reminders, true);
    } finally {
      setBusy(null);
    }
  };

  const onToggleCamera = async () => {
    if (busy) return;
    setBusy('camera');
    try {
      const granted = await toggleCameraPermission(!cameraOn);
      setCameraOn(granted);
    } finally {
      setBusy(null);
      refreshOsPermissions();
    }
  };

  const onTogglePhotos = async () => {
    if (busy) return;
    setBusy('photos');
    try {
      const granted = await toggleMediaLibraryPermission(!photosOn);
      setPhotosOn(granted);
    } finally {
      setBusy(null);
      refreshOsPermissions();
    }
  };

  const onToggleLocation = async () => {
    if (busy) return;
    setBusy('location');
    try {
      const granted = await toggleLocationPermission(!locationOn);
      setLocationOn(granted);
    } finally {
      setBusy(null);
      refreshOsPermissions();
    }
  };

  const onToggleHealthConsent = async () => {
    if (busy) return;
    if (healthConsentOn) {
      const confirmed = await appConfirm(
        'Retirer le consentement santé',
        hasHealthData
          ? 'Ton sommeil, ta HRV, ta FC repos et ta charge seront supprimés de Mova. Le reste de l’app (programme, activités, progrès) continue de fonctionner normalement.'
          : 'Mova arrêtera de stocker tes données de santé (sommeil, HRV, FC repos, charge) tant que tu ne les réactives pas.',
        'Retirer',
        'Annuler',
      );
      if (!confirmed) return;
      setBusy('health');
      try {
        dispatch({ type: 'WITHDRAW_HEALTH_CONSENT' });
        dispatch({ type: 'UPDATE_PROFILE', patch: { healthDataConsent: false } });
      } finally {
        setBusy(null);
      }
      return;
    }
    setBusy('health');
    try {
      dispatch({ type: 'UPDATE_PROFILE', patch: { healthDataConsent: true } });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Text
          style={{
            color: colors.textMuted,
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            lineHeight: 20,
            fontSize: 14,
          }}
        >
          Active ou refuse l’accès. Si tu as déjà refusé, l’app t’envoie vers les
          réglages du téléphone (ou du navigateur).
        </Text>

        <SettingsSection title="Autorisations">
          <SettingsToggleRow
            label="Notifications push"
            subtitle="Rappels de séances et alertes"
            value={pushOn}
            onToggle={() => {
              void togglePush();
            }}
          />
          <SettingsToggleRow
            label="Appareil photo"
            subtitle="Prendre une photo de profil"
            value={cameraOn}
            onToggle={() => {
              void onToggleCamera();
            }}
          />
          <SettingsToggleRow
            label="Photos / galerie"
            subtitle="Choisir une photo de profil"
            value={photosOn}
            onToggle={() => {
              void onTogglePhotos();
            }}
          />
          <SettingsToggleRow
            label="Localisation (GPS)"
            subtitle="Distance, allure et tracé pendant une séance"
            value={locationOn}
            onToggle={() => {
              void onToggleLocation();
            }}
          />
        </SettingsSection>

        <SettingsSection title="Données de santé">
          <SettingsToggleRow
            label="Sommeil, HRV, FC repos, charge"
            subtitle={
              healthConsentOn
                ? 'Utilisées pour adapter tes séances (ex. réduire l’intensité après une nuit courte)'
                : 'Désactivé · aucune donnée de santé stockée'
            }
            value={healthConsentOn}
            onToggle={() => {
              void onToggleHealthConsent();
            }}
          />
          <Text
            style={{
              color: colors.textMuted,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.xs,
              lineHeight: 18,
              fontSize: 13,
            }}
          >
            Retirer ce consentement supprime tes données de santé déjà importées et arrête toute
            nouvelle collecte — le reste de l’app continue de fonctionner normalement.
          </Text>
        </SettingsSection>

        <SettingsSection title="Ailleurs dans l’app">
          <SettingsRow
            label="Appareils connectés"
            value="Garmin, montre, sync"
            onPress={() => router.push('/settings/devices')}
          />
          <SettingsRow
            label="Télécharger ou supprimer mes données"
            value="Compte"
            onPress={() => router.push('/settings/account')}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}
