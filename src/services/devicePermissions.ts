import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PermissionSnapshot = {
  granted: boolean;
  canAskAgain: boolean;
};

async function openAppSettings(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Autorisation',
        'Autorise l’accès dans les paramètres de ton navigateur (icône cadenas à côté de l’adresse).',
      );
      return;
    }
    await Linking.openSettings();
  } catch {
    Alert.alert('Réglages', 'Impossible d’ouvrir les réglages de l’appareil.');
  }
}

function deniedAlert(title: string, body: string): void {
  Alert.alert(title, body, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Ouvrir les réglages', onPress: () => void openAppSettings() },
  ]);
}

export async function getCameraPermission(): Promise<PermissionSnapshot> {
  const r = await ImagePicker.getCameraPermissionsAsync();
  return { granted: r.granted, canAskAgain: r.canAskAgain };
}

export async function getMediaLibraryPermission(): Promise<PermissionSnapshot> {
  const r = await ImagePicker.getMediaLibraryPermissionsAsync();
  return { granted: r.granted, canAskAgain: r.canAskAgain };
}

/**
 * Active la caméra (demande système) ou guide vers les réglages pour désactiver.
 * Les OS ne permettent pas de révoquer une permission depuis l’app.
 */
export async function toggleCameraPermission(wantEnabled: boolean): Promise<boolean> {
  const current = await getCameraPermission();

  if (!wantEnabled) {
    if (!current.granted) return false;
    deniedAlert(
      'Appareil photo',
      'Pour retirer l’accès caméra, désactive-le dans les réglages de l’appareil (ou du navigateur).',
    );
    return current.granted;
  }

  if (current.granted) return true;

  if (!current.canAskAgain) {
    deniedAlert(
      'Appareil photo',
      'L’accès caméra a été refusé. Active-le dans les réglages pour prendre une photo de profil.',
    );
    return false;
  }

  const req = await ImagePicker.requestCameraPermissionsAsync();
  if (!req.granted) {
    Alert.alert(
      'Appareil photo',
      'Accès refusé. Tu pourras réessayer plus tard ou l’activer dans les réglages.',
    );
  }
  return req.granted;
}

export async function toggleMediaLibraryPermission(
  wantEnabled: boolean,
): Promise<boolean> {
  const current = await getMediaLibraryPermission();

  if (!wantEnabled) {
    if (!current.granted) return false;
    deniedAlert(
      'Photos',
      'Pour retirer l’accès à la galerie, désactive-le dans les réglages de l’appareil (ou du navigateur).',
    );
    return current.granted;
  }

  if (current.granted) return true;

  if (!current.canAskAgain) {
    deniedAlert(
      'Photos',
      'L’accès à la galerie a été refusé. Active-le dans les réglages pour choisir une photo de profil.',
    );
    return false;
  }

  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!req.granted) {
    Alert.alert(
      'Photos',
      'Accès refusé. Tu pourras réessayer plus tard ou l’activer dans les réglages.',
    );
  }
  return req.granted;
}
