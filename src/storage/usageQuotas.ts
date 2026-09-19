import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_QUOTAS } from '../premium/quotas';

const KEY = '@azimut/usage-quotas-v1';

export type UsageQuotaKind = 'import' | 'stravaExport' | 'watchExport';

type UsageBucket = {
  monthKey: string;
  import: number;
  stravaExport: number;
  watchExport: number;
};

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function emptyBucket(key = monthKey()): UsageBucket {
  return { monthKey: key, import: 0, stravaExport: 0, watchExport: 0 };
}

async function readBucket(): Promise<UsageBucket> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyBucket();
    const parsed = JSON.parse(raw) as UsageBucket;
    const key = monthKey();
    if (!parsed?.monthKey || parsed.monthKey !== key) return emptyBucket(key);
    return {
      monthKey: key,
      import: Math.max(0, Number(parsed.import) || 0),
      stravaExport: Math.max(0, Number(parsed.stravaExport) || 0),
      watchExport: Math.max(0, Number(parsed.watchExport) || 0),
    };
  } catch {
    return emptyBucket();
  }
}

async function writeBucket(bucket: UsageBucket): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(bucket));
}

function limitFor(kind: UsageQuotaKind): number {
  switch (kind) {
    case 'import':
      return FREE_QUOTAS.importsPerMonth;
    case 'stravaExport':
      return FREE_QUOTAS.stravaExportsPerMonth;
    case 'watchExport':
      return FREE_QUOTAS.watchExportsPerMonth;
  }
}

export type QuotaSnapshot = {
  kind: UsageQuotaKind;
  used: number;
  limit: number;
  remaining: number;
  monthKey: string;
};

export async function getUsageQuota(kind: UsageQuotaKind): Promise<QuotaSnapshot> {
  const bucket = await readBucket();
  const limit = limitFor(kind);
  const used = bucket[kind];
  return {
    kind,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    monthKey: bucket.monthKey,
  };
}

export async function getAllUsageQuotas(): Promise<Record<UsageQuotaKind, QuotaSnapshot>> {
  const [imp, strava, watch] = await Promise.all([
    getUsageQuota('import'),
    getUsageQuota('stravaExport'),
    getUsageQuota('watchExport'),
  ]);
  return { import: imp, stravaExport: strava, watchExport: watch };
}

/** true si l’action est encore autorisée en gratuit. */
export async function canUseFreeQuota(kind: UsageQuotaKind): Promise<boolean> {
  const snap = await getUsageQuota(kind);
  return snap.remaining > 0;
}

export async function consumeUsageQuota(kind: UsageQuotaKind): Promise<QuotaSnapshot> {
  const bucket = await readBucket();
  bucket[kind] = (bucket[kind] ?? 0) + 1;
  await writeBucket(bucket);
  return getUsageQuota(kind);
}
