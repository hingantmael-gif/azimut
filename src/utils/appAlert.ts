import { Alert, Platform } from 'react-native';

/** Alerte simple — fonctionne aussi sur web (window.alert). */
export function appAlert(title: string, message: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
  });
}

/** Confirmation OK / Annuler — fonctionne aussi sur web (window.confirm). */
export function appConfirm(
  title: string,
  message: string,
  confirmLabel = 'Continuer',
  cancelLabel = 'Annuler',
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}
