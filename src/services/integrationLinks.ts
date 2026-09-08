import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { IntegrationStatus } from '../types/domain';

/** Intégrations proposées dans Réglages → Appareils */
export const SUPPORTED_INTEGRATION_PROVIDERS = [
  'garmin',
  'apple_health',
  'health_connect',
] as const satisfies readonly IntegrationStatus['provider'][];

export type SupportedIntegrationProvider = (typeof SUPPORTED_INTEGRATION_PROVIDERS)[number];

export function isSupportedIntegrationProvider(
  provider: IntegrationStatus['provider'],
): provider is SupportedIntegrationProvider {
  return (SUPPORTED_INTEGRATION_PROVIDERS as readonly string[]).includes(provider);
}

/** Package Android officiel — Garmin Connect™ Mobile */
const GARMIN_ANDROID_PACKAGE = 'com.garmin.android.apps.connectmobile';

/** Schéma URL documenté sur les forums Garmin (iOS) — ouvre l’app Garmin Connect */
const GARMIN_IOS_APP_URL = 'connect://';

/** Connexion web officielle (SSO Garmin) */
const GARMIN_WEB_SIGNIN = 'https://connect.garmin.com/signin';

const GARMIN_IOS_APP_STORE = 'https://apps.apple.com/app/garmin-connect/id583446403';
const GARMIN_ANDROID_PLAY_STORE = `https://play.google.com/store/apps/details?id=${GARMIN_ANDROID_PACKAGE}`;

export type OpenIntegrationResult = { ok: boolean; error?: string };

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

async function openUrlPreferApp(appUrl: string, fallbackUrl: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(appUrl);
      return true;
    } catch {
      /* app absente ou schéma refusé */
    }
  }
  return openExternalUrl(fallbackUrl);
}

/**
 * Ouvre l’application Garmin Connect (ou le store / la page de connexion web).
 * Schémas officiels : connect:// (iOS), intent Android com.garmin.android.apps.connectmobile.
 */
export async function openGarminConnect(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'web') {
    const ok = await openExternalUrl(GARMIN_WEB_SIGNIN);
    return ok
      ? { ok: true }
      : { ok: false, error: 'Impossible d’ouvrir Garmin Connect dans le navigateur.' };
  }

  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(
        `intent://#Intent;package=${GARMIN_ANDROID_PACKAGE};action=android.intent.action.MAIN;end`,
      );
      return { ok: true };
    } catch {
      /* app non installée */
    }
    const ok = await openUrlPreferApp(
      `market://details?id=${GARMIN_ANDROID_PACKAGE}`,
      GARMIN_ANDROID_PLAY_STORE,
    );
    return ok
      ? { ok: true }
      : {
          ok: false,
          error:
            'Garmin Connect n’est pas installé. Installe l’app depuis le Play Store puis réessaie.',
        };
  }

  // iOS — connect:// documenté par Garmin ; sinon fiche App Store
  const opened = await openUrlPreferApp(GARMIN_IOS_APP_URL, GARMIN_IOS_APP_STORE);
  return opened
    ? { ok: true }
    : {
        ok: false,
        error:
          'Garmin Connect n’est pas installé. Installe l’app depuis l’App Store puis réessaie.',
      };
}

/** Apple Santé — app Santé (iOS) ou page d’aide */
export async function openAppleHealth(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'ios') {
    try {
      await Linking.openSettings();
      return { ok: true };
    } catch {
      const ok = await openExternalUrl('https://www.apple.com/fr/health/');
      return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir les réglages.' };
    }
  }
  const ok = await openExternalUrl('https://www.apple.com/fr/health/');
  return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir la page Apple Santé.' };
}

/** Health Connect — app Android ou fiche Play Store */
export async function openHealthConnect(): Promise<OpenIntegrationResult> {
  if (Platform.OS === 'android') {
    const pkg = 'com.google.android.apps.healthdata';
    try {
      await Linking.openURL(
        `intent://#Intent;package=${pkg};action=android.intent.action.MAIN;end`,
      );
      return { ok: true };
    } catch {
      /* Play Store */
    }
    const ok = await openUrlPreferApp(
      `market://details?id=${pkg}`,
      `https://play.google.com/store/apps/details?id=${pkg}`,
    );
    return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir Health Connect.' };
  }
  const ok = await openExternalUrl('https://health.google/health-connect-android/');
  return ok ? { ok: true } : { ok: false, error: 'Impossible d’ouvrir la page Health Connect.' };
}

/** Ouvre l’app ou le site du fournisseur (action immédiate au tap). */
export async function openIntegrationProvider(
  provider: SupportedIntegrationProvider,
): Promise<OpenIntegrationResult> {
  switch (provider) {
    case 'garmin':
      return openGarminConnect();
    case 'apple_health':
      return openAppleHealth();
    case 'health_connect':
      return openHealthConnect();
    default:
      return { ok: false, error: 'Intégration non supportée.' };
  }
}

/** Filtre la liste affichée (plateforme + intégrations supportées). */
export function filterVisibleIntegrations(
  integrations: IntegrationStatus[],
): IntegrationStatus[] {
  return normalizeIntegrations(integrations).filter((item) => {
    if (item.provider === 'apple_health' && Platform.OS === 'android') return false;
    if (item.provider === 'health_connect' && Platform.OS === 'ios') return false;
    // Health Connect : rien à faire sur le web / PWA
    if (item.provider === 'health_connect' && Platform.OS === 'web') return false;
    if (item.provider === 'apple_health' && Platform.OS === 'web') return false;
    return true;
  });
}

/** Garde uniquement les intégrations supportées (sessions anciennes). */
export function normalizeIntegrations(
  integrations: IntegrationStatus[],
): IntegrationStatus[] {
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));
  return SUPPORTED_INTEGRATION_PROVIDERS.map(
    (provider) => byProvider.get(provider) ?? { provider, connected: false },
  );
}
