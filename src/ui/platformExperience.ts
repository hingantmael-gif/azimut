import { Platform, useWindowDimensions } from 'react-native';

/** ≤480 = téléphone plein écran ; au-delà = cadre web (tablette / PC). */
const PHONE_MAX_WIDTH = 480;

/** Natif = téléphone ; web large = PC/tablette (cadre sans barre de scroll). */
export function useIsPhoneExperience(): boolean {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return true;
  return width <= PHONE_MAX_WIDTH;
}
