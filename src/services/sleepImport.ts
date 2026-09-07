import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { WatchBrandId } from '../types/domain';
import {
  openAppleHealth,
  openGarminConnect,
  openHealthConnect,
  type OpenIntegrationResult,
} from './integrationLinks';
import { getWatchEntry } from '../constants/watches';

async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    try {
      await WebBrowser.openBrowserAsync(url);
      return true;
    } catch {
      return false;
    }
  }
}

async function openAppOrStore(appUrl: string, storeUrl: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(appUrl);
      return true;
    } catch {
      /* fallback store */
    }
  }
  return openExternalUrl(storeUrl);
}

export async function openSamsungHealth(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'android') {
    const pkg = 'com.sec.android.app.shealth';
    try {
      await Linking.openURL(
        `intent://#Intent;package=${pkg};action=android.intent.action.MAIN;end`,
      );
      return { ok: true };
    } catch {
      /* store */
    }
    const ok = await openAppOrStore(
      `market://details?id=${pkg}`,
      `https://play.google.com/store/apps/details?id=${pkg}`,
    );
    return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Samsung Health.' };
  }
  const ok = await openExternalUrl('https://www.samsung.com/fr/apps/samsung-health/');
  return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Samsung Health.' };
}

export async function openFitbitApp(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'ios') {
    const ok = await openAppOrStore(
      'fitbit://',
      'https://apps.apple.com/app/fitbit-health-fitness/id462638897',
    );
    return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Fitbit.' };
  }
  if (Platform.OS === 'android') {
    const pkg = 'com.fitbit.FitbitMobile';
    try {
      await Linking.openURL(
        `intent://#Intent;package=${pkg};action=android.intent.action.MAIN;end`,
      );
      return { ok: true };
    } catch {
      /* store */
    }
    const ok = await openAppOrStore(
      `market://details?id=${pkg}`,
      `https://play.google.com/store/apps/details?id=${pkg}`,
    );
    return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Fitbit.' };
  }
  const ok = await openExternalUrl('https://www.fitbit.com/');
  return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Fitbit.' };
}

export async function openHuaweiHealth(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'android') {
    const pkg = 'com.huawei.health';
    try {
      await Linking.openURL(
        `intent://#Intent;package=${pkg};action=android.intent.action.MAIN;end`,
      );
      return { ok: true };
    } catch {
      /* store */
    }
    const ok = await openAppOrStore(
      `market://details?id=${pkg}`,
      `https://play.google.com/store/apps/details?id=${pkg}`,
    );
    return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Huawei Santé.' };
  }
  const ok = await openExternalUrl('https://consumer.huawei.com/fr/mobileservices/health/');
  return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Huawei Santé.' };
}

/**
 * Ouvre l’app compagnon la plus directe pour synchroniser la nuit,
 * puis l’appelant ingère la nuit (démo / API réelle).
 */
export async function openWatchCompanion(brandId: WatchBrandId): Promise<OpenIntegrationResult> {
  switch (brandId) {
    case 'apple':
      return openAppleHealth();
    case 'garmin':
      return openGarminConnect();
    case 'samsung': {
      const samsung = await openSamsungHealth();
      if (Platform.OS === 'android') {
        await openHealthConnect();
      }
      return samsung;
    }
    case 'google_fitbit': {
      const fitbit = await openFitbitApp();
      if (Platform.OS === 'android') {
        await openHealthConnect();
      }
      return fitbit;
    }
    case 'huawei':
      return openHuaweiHealth();
    default:
      return { ok: false, error: `Montre non supportée (${getWatchEntry(brandId).label}).` };
  }
}
