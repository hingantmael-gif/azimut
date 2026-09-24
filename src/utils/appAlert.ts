import { Alert as RNAlert, Platform, type AlertButton } from 'react-native';

/**
 * Dialogues Mova. Quand le `DialogHost` (monté dans le layout racine) est enregistré,
 * tous les messages s'affichent dans l'app, aux couleurs du thème, et fonctionnent
 * partout. Les boîtes natives (`window.confirm/alert`, `Alert.alert` sur web) ne sont
 * qu'un repli : elles peuvent être bloquées (PWA, navigateur embarqué, « ne plus
 * afficher ») et renvoient alors `false` en silence — le bouton qui les déclenche
 * semble alors ne rien faire.
 */
export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type DialogRequest = {
  title: string;
  message: string;
  buttons: DialogButton[];
  /** Appelé quand on ferme sans choisir (fond voilé, retour Android) : exécute le bouton « annuler ». */
  onDismiss?: () => void;
};

type DialogHostFn = (request: DialogRequest) => void;

let host: DialogHostFn | null = null;

/** Appelé par `DialogHost` au montage ; renvoie la fonction de désinscription. */
export function registerDialogHost(fn: DialogHostFn): () => void {
  host = fn;
  return () => {
    if (host === fn) host = null;
  };
}

function normalizeButtons(buttons?: AlertButton[]): DialogButton[] {
  if (!buttons || buttons.length === 0) return [{ text: 'OK' }];
  return buttons.map((b) => ({
    text: b.text ?? 'OK',
    style: b.style,
    onPress: b.onPress ? () => b.onPress?.(undefined as never) : undefined,
  }));
}

/**
 * Remplace `Alert` de react-native (même signature). Passe par le dialogue intégré à
 * l'app ; sans hôte monté, retombe sur le comportement d'origine.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    const normalized = normalizeButtons(buttons);
    if (host) {
      const cancel = normalized.find((b) => b.style === 'cancel');
      host({ title, message: message ?? '', buttons: normalized, onDismiss: cancel?.onPress });
      return;
    }
    RNAlert.alert(title, message, buttons);
  },
};

/** Message d'information (un bouton OK). */
export function appAlert(title: string, message: string): Promise<void> {
  if (host) {
    return new Promise((resolve) => {
      host!({ title, message, buttons: [{ text: 'OK', onPress: () => resolve() }], onDismiss: () => resolve() });
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    RNAlert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
  });
}

/** Confirmation OK / Annuler. Résout `true` si l'utilisateur confirme. */
export function appConfirm(
  title: string,
  message: string,
  confirmLabel = 'Continuer',
  cancelLabel = 'Annuler',
): Promise<boolean> {
  if (host) {
    return new Promise((resolve) => {
      host!({
        title,
        message,
        buttons: [
          { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
          { text: confirmLabel, onPress: () => resolve(true) },
        ],
        onDismiss: () => resolve(false),
      });
    });
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    RNAlert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}
