/**
 * Liens vers les stores — vides tant que l'app n'est pas publiée (voir docs/PLAY_STORE.md).
 * Une fois la fiche Google Play en ligne, définis EXPO_PUBLIC_PLAY_STORE_URL et redéploie :
 * le bouton « Obtenir sur Google Play » apparaît automatiquement sur l'écran d'installation
 * et sur le site vitrine ; tant que c'est vide, on affiche « Bientôt disponible » au lieu d'un lien mort.
 */
export const PLAY_STORE_URL = (process.env.EXPO_PUBLIC_PLAY_STORE_URL || '').trim();
/** Idem pour l'App Store (natif iOS), une fois soumise. */
export const APP_STORE_URL = (process.env.EXPO_PUBLIC_APP_STORE_URL || '').trim();

export const PLAY_STORE_PACKAGE = 'app.mova.coach';
