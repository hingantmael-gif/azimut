import { useCallback, useState } from 'react';
import { Text } from 'react-native';
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
import {
  getCameraPermission,
  getMediaLibraryPermission,
  toggleCameraPermission,
  toggleMediaLibraryPermission,
} from '../../src/services/devicePermissions';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

/**
 * Autorisations système réellement demandables ici :
 * notifications, caméra, photos.
 * Localisation / santé / export données → ailleurs (appareils, compte).
 */
export default function DataPermissionsScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const pushOn = Boolean(state.profile.pushEnabled);

  const [cameraOn, setCameraOn] = useState(false);
  const [photosOn, setPhotosOn] = useState(false);
  const [busy, setBusy] = useState<'camera' | 'photos' | 'push' | null>(null);

  const refreshOsPermissions = useCallback(() => {
    void (async () => {
      const [cam, lib] = await Promise.all([
        getCameraPermission(),
        getMediaLibraryPermission(),
      ]);
      setCameraOn(cam.granted);
      setPhotosOn(lib.granted);
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
        dispatch({
          type: 'UPDATE_PROFILE',
          patch: { pushEnabled: false, pushPermissionAsked: true },
        });
        void syncLocalReminders([], false);
        return;
      }
      const granted = await requestPushPermission();
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
        </SettingsSection>

        <SettingsSection title="Ailleurs dans l’app">
          <SettingsRow
            label="Localisation & données de santé"
            value="Appareils"
            onPress={() => router.push('/settings/devices')}
          />
          <SettingsRow
            label="Télécharger mes données"
            value="Compte"
            onPress={() => router.push('/settings/account')}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}
