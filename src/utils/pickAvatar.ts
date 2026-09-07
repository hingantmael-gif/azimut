import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

async function ensureLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!req.granted) {
    Alert.alert(
      'Accès photos',
      'Autorise l’accès à la galerie pour choisir une photo de profil.',
    );
    return false;
  }
  return true;
}

async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const req = await ImagePicker.requestCameraPermissionsAsync();
  if (!req.granted) {
    Alert.alert(
      'Accès caméra',
      'Autorise l’accès à la caméra pour prendre une photo de profil.',
    );
    return false;
  }
  return true;
}

/** Photo brute — le cadrage circulaire se fait ensuite dans AvatarCropModal */
const pickerOpts: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.92,
};

/** Galerie → URI locale (ou null si annulé / refusé) */
export async function pickAvatarFromLibrary(): Promise<string | null> {
  if (!(await ensureLibraryPermission())) return null;
  const result = await ImagePicker.launchImageLibraryAsync(pickerOpts);
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

/** Caméra → URI locale (ou null) */
export async function pickAvatarFromCamera(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickAvatarFromLibrary();
  }
  if (!(await ensureCameraPermission())) return null;
  const result = await ImagePicker.launchCameraAsync(pickerOpts);
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}

/** Menu Galerie / Caméra / Retirer */
export function promptAvatarChange(opts: {
  hasAvatar: boolean;
  onPicked: (uri: string) => void;
  onCleared?: () => void;
}): void {
  const buttons: {
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => void;
  }[] = [
    {
      text: 'Galerie',
      onPress: () => {
        void pickAvatarFromLibrary().then((uri) => {
          if (uri) opts.onPicked(uri);
        });
      },
    },
    {
      text: 'Prendre une photo',
      onPress: () => {
        void pickAvatarFromCamera().then((uri) => {
          if (uri) opts.onPicked(uri);
        });
      },
    },
  ];
  if (opts.hasAvatar && opts.onCleared) {
    buttons.push({
      text: 'Retirer la photo',
      style: 'destructive',
      onPress: opts.onCleared,
    });
  }
  buttons.push({ text: 'Annuler', style: 'cancel' });
  Alert.alert('Photo de profil', 'Choisis une source', buttons);
}
