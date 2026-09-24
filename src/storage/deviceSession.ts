import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LEGACY_RSID_KEY = '@training/rsid';
const RSID_KEY = '@azimut/rsid';

function randomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function deviceLabel(): string {
  const os = Platform.OS;
  if (os === 'web') return 'Navigateur web';
  if (os === 'ios') return 'iPhone / iPad';
  if (os === 'android') return 'Android';
  return os;
}

async function resolveRsidKey(): Promise<{ key: string; value: string | null }> {
  const modern = await AsyncStorage.getItem(RSID_KEY);
  if (modern) return { key: RSID_KEY, value: modern };
  const legacy = await AsyncStorage.getItem(LEGACY_RSID_KEY);
  if (legacy) {
    await AsyncStorage.setItem(RSID_KEY, legacy);
    return { key: RSID_KEY, value: legacy };
  }
  return { key: RSID_KEY, value: null };
}

export async function getOrCreateRsid(): Promise<string> {
  const { value } = await resolveRsidKey();
  if (value) return value;
  const rsid = `rsid_${Platform.OS}_${randomId()}`;
  await AsyncStorage.setItem(RSID_KEY, rsid);
  return rsid;
}

export async function getCurrentRsid(): Promise<string | null> {
  const { value } = await resolveRsidKey();
  return value;
}
