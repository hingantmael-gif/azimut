import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** RSID — Registered Session ID : identifiant stable de l'appareil / navigateur */
const RSID_KEY = '@training/rsid';

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Libellé lisible pour les paramètres */
export function deviceLabel(): string {
  const os = Platform.OS;
  if (os === 'web') return 'Navigateur web';
  if (os === 'ios') return 'iPhone / iPad';
  if (os === 'android') return 'Android';
  return os;
}

/** Retourne l'RSID existant ou en crée un (première visite sur cet appareil). */
export async function getOrCreateRsid(): Promise<string> {
  const existing = await AsyncStorage.getItem(RSID_KEY);
  if (existing) return existing;
  const rsid = `rsid_${Platform.OS}_${randomId()}`;
  await AsyncStorage.setItem(RSID_KEY, rsid);
  return rsid;
}

export async function getCurrentRsid(): Promise<string | null> {
  return AsyncStorage.getItem(RSID_KEY);
}
