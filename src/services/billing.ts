/**
 * Billing Azimut — prêt Google Play via RevenueCat.
 *
 * Web / Expo Go : pas d’achats natifs (Play Billing). L’UI et les entitlements
 * locaux (owner / gift / paid sync) restent opérationnels.
 * Build EAS Android : définir EXPO_PUBLIC_REVENUECAT_ANDROID_KEY puis
 * `npx expo install react-native-purchases react-native-purchases-ui`.
 */
import { Platform } from 'react-native';
import { BILLING_PRODUCTS } from '../premium/quotas';
import type { ProfileSubscription } from '../premium/entitlement';
import { resolveApiUrl } from './apiBase';

export type BillingOffer = {
  productId: string;
  title: string;
  priceString: string;
  period: 'monthly' | 'annual';
};

export type PurchaseResult =
  | { ok: true; subscription: ProfileSubscription }
  | { ok: false; error: string; cancelled?: boolean };

const RC_ANDROID_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '').trim();
const RC_IOS_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '').trim();

let configured = false;

export function isNativeBillingAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return Boolean(Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY);
}

export async function configureBilling(appUserId?: string): Promise<void> {
  if (configured || !isNativeBillingAvailable()) return;
  try {
    // Import dynamique — le package peut être absent tant que l’EAS n’est pas prêt
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
    Purchases.configure({ apiKey, appUserID: appUserId || undefined });
    configured = true;
  } catch {
    configured = false;
  }
}

export function listCatalogOffers(): BillingOffer[] {
  return [
    {
      productId: BILLING_PRODUCTS.monthly,
      title: 'Premium mensuel',
      priceString: '9,99 €',
      period: 'monthly',
    },
    {
      productId: BILLING_PRODUCTS.annual,
      title: 'Premium annuel',
      priceString: '59,99 €',
      period: 'annual',
    },
  ];
}

export async function fetchStoreOffers(): Promise<BillingOffer[]> {
  if (!isNativeBillingAvailable()) return listCatalogOffers();
  try {
    await configureBilling();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current?.availablePackages?.length) return listCatalogOffers();
    return current.availablePackages.map(
      (pkg: {
        product: { identifier: string; title: string; priceString: string };
        packageType: string;
      }) => ({
        productId: pkg.product.identifier,
        title: pkg.product.title,
        priceString: pkg.product.priceString,
        period:
          /annual|year/i.test(pkg.packageType) ||
          /annual|year/i.test(pkg.product.identifier)
            ? 'annual'
            : 'monthly',
      }),
    );
  } catch {
    return listCatalogOffers();
  }
}

function subscriptionFromCustomerInfo(info: {
  entitlements?: {
    active?: Record<
      string,
      { productIdentifier?: string; expirationDate?: string }
    >;
  };
}): ProfileSubscription {
  const active = info.entitlements?.active?.[BILLING_PRODUCTS.entitlement];
  if (!active) {
    return {
      entitlement: 'free',
      status: 'expired',
      platform:
        Platform.OS === 'ios'
          ? 'ios'
          : Platform.OS === 'android'
            ? 'android'
            : 'web',
      lastSyncedAt: new Date().toISOString(),
    };
  }
  const productId = active.productIdentifier || BILLING_PRODUCTS.monthly;
  return {
    entitlement: 'premium',
    status: 'active',
    productId,
    currentPeriodEnd: active.expirationDate || null,
    autoRenewing: true,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function purchasePremium(
  period: 'monthly' | 'annual' = 'annual',
): Promise<PurchaseResult> {
  if (!isNativeBillingAvailable()) {
    return {
      ok: false,
      error:
        Platform.OS === 'web'
          ? 'Les abonnements Google Play seront disponibles dans l’app Android. En attendant, demande un accès Premium au compte propriétaire si besoin.'
          : 'Billing non configuré — ajoute EXPO_PUBLIC_REVENUECAT_ANDROID_KEY et un build EAS.',
    };
  }
  try {
    await configureBilling();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages?.find(
      (p: { packageType: string; product: { identifier: string } }) =>
        period === 'annual'
          ? /annual|year/i.test(p.packageType) ||
            p.product.identifier === BILLING_PRODUCTS.annual
          : /month/i.test(p.packageType) ||
            p.product.identifier === BILLING_PRODUCTS.monthly,
    );
    if (!pkg) {
      return { ok: false, error: 'Offre introuvable dans le store.' };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const subscription = subscriptionFromCustomerInfo(customerInfo);
    await syncSubscriptionToBackend(subscription);
    return { ok: true, subscription };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { ok: false, error: 'Achat annulé.', cancelled: true };
    }
    return { ok: false, error: err?.message || 'Achat impossible.' };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!isNativeBillingAvailable()) {
    return {
      ok: false,
      error:
        'Restauration disponible sur l’app Android / iOS installée depuis le store.',
    };
  }
  try {
    await configureBilling();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Purchases = require('react-native-purchases').default;
    const info = await Purchases.restorePurchases();
    const subscription = subscriptionFromCustomerInfo(info);
    await syncSubscriptionToBackend(subscription);
    if (subscription.entitlement !== 'premium') {
      return {
        ok: false,
        error: 'Aucun abonnement à restaurer sur ce compte.',
      };
    }
    return { ok: true, subscription };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, error: err?.message || 'Restauration impossible.' };
  }
}

export async function refreshSubscriptionStatus(
  authToken?: string | null,
): Promise<ProfileSubscription | null> {
  if (isNativeBillingAvailable()) {
    try {
      await configureBilling();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Purchases = require('react-native-purchases').default;
      const info = await Purchases.getCustomerInfo();
      const sub = subscriptionFromCustomerInfo(info);
      await syncSubscriptionToBackend(sub, authToken);
      return sub;
    } catch {
      /* fall through API */
    }
  }
  if (!authToken) return null;
  try {
    const res = await fetch(`${resolveApiUrl()}/billing/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { subscription?: ProfileSubscription };
    return data.subscription ?? null;
  } catch {
    return null;
  }
}

async function syncSubscriptionToBackend(
  subscription: ProfileSubscription,
  authToken?: string | null,
): Promise<void> {
  if (!authToken) return;
  try {
    await fetch(`${resolveApiUrl()}/billing/sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription }),
    });
  } catch {
    /* offline ok */
  }
}

export function planFromSubscription(
  subscription: ProfileSubscription,
): 'free' | 'premium_monthly' | 'premium_yearly' {
  if (subscription.entitlement !== 'premium') return 'free';
  if (
    subscription.status === 'on_hold' ||
    subscription.status === 'paused' ||
    subscription.status === 'expired' ||
    subscription.status === 'none'
  ) {
    return 'free';
  }
  const id = subscription.productId || '';
  if (/month/i.test(id)) return 'premium_monthly';
  return 'premium_yearly';
}

export const PLAY_MANAGE_SUBSCRIPTION_URL =
  'https://play.google.com/store/account/subscriptions';
