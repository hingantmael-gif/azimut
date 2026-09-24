import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOwnerPremiumEmail, normalizeAccountEmail } from '../engines/ownerAccess';
import { resolveApiUrl } from '../services/apiBase';

const GIFTS_KEY = '@azimut/owner-premium-gifts-v1';

export type PremiumGiftEntry = {
  email: string;
  /** ISO */
  addedAt: string;
  /** Affichage optionnel */
  label?: string;
};

async function readRaw(): Promise<PremiumGiftEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(GIFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PremiumGiftEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((e) => ({
        email: normalizeAccountEmail(e.email),
        addedAt: e.addedAt || new Date().toISOString(),
        label: e.label?.trim() || undefined,
      }))
      .filter((e) => e.email.includes('@'));
  } catch {
    return [];
  }
}

async function writeRaw(list: PremiumGiftEntry[]): Promise<void> {
  await AsyncStorage.setItem(GIFTS_KEY, JSON.stringify(list));
}

async function apiGifts(
  token: string | null | undefined,
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  if (!token) return null;
  try {
    return await fetch(`${resolveApiUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
  } catch {
    return null;
  }
}

export async function loadPremiumGifts(
  authToken?: string | null,
): Promise<PremiumGiftEntry[]> {
  const local = await readRaw();
  if (!authToken) return [...local].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const res = await apiGifts(authToken, '/billing/gifts');
  if (res?.ok) {
    try {
      const data = (await res.json()) as { gifts?: PremiumGiftEntry[] };
      const remote = Array.isArray(data.gifts) ? data.gifts : [];
      const remoteNorm = remote
        .map((e) => ({
          email: normalizeAccountEmail(e.email),
          addedAt: e.addedAt || new Date().toISOString(),
          label: e.label?.trim() || undefined,
        }))
        .filter((e) => e.email.includes('@'));

      // Fusion : ne jamais perdre le cache local si l’API est encore vide
      const byEmail = new Map<string, PremiumGiftEntry>();
      for (const g of remoteNorm) byEmail.set(g.email, g);
      for (const g of local) {
        if (!byEmail.has(g.email)) byEmail.set(g.email, g);
      }
      const merged = [...byEmail.values()];

      // Remonte les entrées locales manquantes vers l’API
      for (const g of local) {
        if (!remoteNorm.some((r) => r.email === g.email)) {
          await apiGifts(authToken, '/billing/gifts', {
            method: 'POST',
            body: JSON.stringify({
              action: 'add',
              email: g.email,
              label: g.label,
            }),
          });
        }
      }

      await writeRaw(merged);
      return merged.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    } catch {
      /* fallback local */
    }
  }
  return [...local].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/**
 * True si l’e-mail a un Premium offert.
 * Priorité API (cross-device) puis cache local.
 * `confirmed` = réponse API fiable (sinon ne pas révoquer un gift existant).
 */
export async function isGiftedPremiumEmail(
  email: string | undefined | null,
  authToken?: string | null,
): Promise<boolean> {
  const status = await resolveGiftedPremiumStatus(email, authToken);
  return status.gifted;
}

export async function resolveGiftedPremiumStatus(
  email: string | undefined | null,
  authToken?: string | null,
): Promise<{ gifted: boolean; confirmed: boolean }> {
  const e = normalizeAccountEmail(email);
  if (!e) return { gifted: false, confirmed: true };

  if (authToken) {
    const res = await apiGifts(authToken, '/billing/gift-status');
    if (res?.ok) {
      try {
        const data = (await res.json()) as { gifted?: boolean };
        if (typeof data.gifted === 'boolean') {
          return { gifted: data.gifted, confirmed: true };
        }
      } catch {
        /* fallback */
      }
    }
    // API down / route absente → ne pas confirmer une absence
    if (res && (res.status === 404 || res.status >= 500)) {
      const list = await readRaw();
      return { gifted: list.some((x) => x.email === e), confirmed: false };
    }
  }

  const list = await readRaw();
  return { gifted: list.some((x) => x.email === e), confirmed: !authToken };
}

export async function addPremiumGift(
  email: string,
  label?: string,
  authToken?: string | null,
): Promise<{ ok: true; list: PremiumGiftEntry[] } | { ok: false; error: string }> {
  const e = normalizeAccountEmail(email);
  if (!e.includes('@') || e.length < 5) {
    return { ok: false, error: 'E-mail invalide.' };
  }
  if (isOwnerPremiumEmail(e)) {
    return { ok: false, error: 'Le compte ultra-sécurisé a déjà le Premium Champion.' };
  }

  if (authToken) {
    const res = await apiGifts(authToken, '/billing/gifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'add', email: e, label: label?.trim() || undefined }),
    });
    if (res?.ok) {
      try {
        const data = (await res.json()) as { gifts?: PremiumGiftEntry[] };
        const list = Array.isArray(data.gifts) ? data.gifts : [];
        const normalized = list.map((x) => ({
          email: normalizeAccountEmail(x.email),
          addedAt: x.addedAt || new Date().toISOString(),
          label: x.label,
        }));
        await writeRaw(normalized);
        return { ok: true, list: normalized };
      } catch {
        /* continue local */
      }
    } else if (res && res.status === 409) {
      return { ok: false, error: 'Cet e-mail est déjà dans la liste.' };
    }
  }

  const list = await readRaw();
  if (list.some((x) => x.email === e)) {
    return { ok: false, error: 'Cet e-mail est déjà dans la liste.' };
  }
  const next = [
    { email: e, addedAt: new Date().toISOString(), label: label?.trim() || undefined },
    ...list,
  ];
  await writeRaw(next);
  return { ok: true, list: next };
}

export async function removePremiumGift(
  email: string,
  authToken?: string | null,
): Promise<{ ok: true; list: PremiumGiftEntry[] } | { ok: false; error: string }> {
  const e = normalizeAccountEmail(email);

  if (authToken) {
    const res = await apiGifts(authToken, '/billing/gifts', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove', email: e }),
    });
    if (res?.ok) {
      try {
        const data = (await res.json()) as { gifts?: PremiumGiftEntry[] };
        const list = Array.isArray(data.gifts) ? data.gifts : [];
        const normalized = list.map((x) => ({
          email: normalizeAccountEmail(x.email),
          addedAt: x.addedAt || new Date().toISOString(),
          label: x.label,
        }));
        await writeRaw(normalized);
        return { ok: true, list: normalized };
      } catch {
        /* continue local */
      }
    }
  }

  const list = await readRaw();
  if (!list.some((x) => x.email === e)) {
    return { ok: false, error: 'E-mail introuvable dans les cadeaux Premium.' };
  }
  const next = list.filter((x) => x.email !== e);
  await writeRaw(next);
  return { ok: true, list: next };
}
