/**
 * Billing endpoints — statut abonnement + webhook RevenueCat.
 * Play RTDN (option B) peut être ajouté plus tard sur /billing/rtdn.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const subsFile = path.join(dataDir, 'subscriptions.json');

function ensureSubsFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(subsFile)) fs.writeFileSync(subsFile, '[]', 'utf8');
}

function loadSubs() {
  ensureSubsFile();
  try {
    return JSON.parse(fs.readFileSync(subsFile, 'utf8'));
  } catch {
    return [];
  }
}

function saveSubs(list) {
  ensureSubsFile();
  fs.writeFileSync(subsFile, JSON.stringify(list, null, 2), 'utf8');
}

function upsertSub(email, subscription) {
  const list = loadSubs();
  const key = String(email || '').toLowerCase();
  const idx = list.findIndex((s) => s.email === key);
  const row = {
    email: key,
    ...subscription,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = { ...list[idx], ...row };
  else list.push(row);
  saveSubs(list);
  return row;
}

function findSub(email) {
  const key = String(email || '').toLowerCase();
  return loadSubs().find((s) => s.email === key) || null;
}

/**
 * Map RevenueCat event → subscription snapshot
 * @see https://www.revenuecat.com/docs/webhooks
 */
function fromRevenueCatEvent(body) {
  const event = body?.event || body;
  const type = String(event?.type || '').toUpperCase();
  const productId =
    event?.product_id || event?.productId || 'mova_premium_annual';
  const expiration =
    event?.expiration_at_ms != null
      ? new Date(Number(event.expiration_at_ms)).toISOString()
      : event?.expiration_at || null;
  const email =
    event?.subscriber_attributes?.$email?.value ||
    event?.app_user_id ||
    body?.app_user_id;

  let status = 'active';
  let entitlement = 'premium';
  if (
    type.includes('EXPIR') ||
    type === 'EXPIRATION' ||
    type === 'SUBSCRIPTION_PAUSED'
  ) {
    status = type.includes('PAUSE') ? 'paused' : 'expired';
    entitlement = 'free';
  } else if (type.includes('CANCEL')) {
    status = 'canceled';
  } else if (type.includes('BILLING_ISSUE') || type.includes('GRACE')) {
    status = 'grace_period';
  } else if (type.includes('UNCANCEL') || type.includes('RENEW') || type.includes('INITIAL') || type.includes('PRODUCT_CHANGE')) {
    status = 'active';
  }

  return {
    email,
    subscription: {
      entitlement,
      status,
      productId,
      currentPeriodEnd: expiration,
      autoRenewing: !type.includes('CANCEL'),
      platform: String(event?.store || 'android').toLowerCase().includes('app_store')
        ? 'ios'
        : 'android',
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

export function mountBillingRoutes(app, { authMiddleware, loadUsers, saveUsers }) {
  app.get('/billing/config', (_req, res) => {
    res.json({
      products: {
        monthly: 'mova_premium_monthly',
        annual: 'mova_premium_annual',
        entitlement: 'premium',
      },
      trialDays: 7,
      display: {
        monthly: '9,99 € / mois',
        annual: '59,99 € / an',
        monthlyEquivalent: '5,00 € / mois',
      },
      manageUrl: 'https://play.google.com/store/account/subscriptions',
    });
  });

  app.get('/billing/status', authMiddleware, (req, res) => {
    const email = req.authEmail;
    const row = findSub(email);
    if (!row) {
      return res.json({
        subscription: {
          entitlement: 'free',
          status: 'none',
          platform: null,
          lastSyncedAt: null,
        },
      });
    }
    const { email: _e, updatedAt: _u, ...subscription } = row;
    res.json({ subscription });
  });

  app.post('/billing/sync', authMiddleware, (req, res) => {
    const email = req.authEmail;
    const subscription = req.body?.subscription;
    if (!subscription || typeof subscription !== 'object') {
      return res.status(400).json({ error: 'subscription required' });
    }
    const saved = upsertSub(email, subscription);
    // Miroir léger sur user.plan si users.json le connaît
    try {
      const users = loadUsers();
      const u = users.find(
        (x) => String(x.email || '').toLowerCase() === String(email).toLowerCase(),
      );
      if (u) {
        const premium = subscription.entitlement === 'premium' &&
          ['active', 'grace_period', 'canceled'].includes(subscription.status);
        if (premium) {
          u.plan = /month/i.test(subscription.productId || '')
            ? 'premium_monthly'
            : 'premium_yearly';
          u.premiumSource = 'paid';
        } else if (u.premiumSource === 'paid') {
          u.plan = 'free';
          u.premiumSource = null;
        }
        u.subscription = subscription;
        saveUsers(users);
      }
    } catch {
      /* ignore */
    }
    res.json({ ok: true, subscription: saved });
  });

  app.post('/billing/webhook/revenuecat', (req, res) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (secret) {
      const auth = req.headers.authorization || '';
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }
    try {
      const mapped = fromRevenueCatEvent(req.body || {});
      if (mapped.email) {
        upsertSub(mapped.email, mapped.subscription);
      }
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String(e?.message || e) });
    }
  });

  /** Stub RTDN — à brancher Pub/Sub si Option B */
  app.post('/billing/rtdn', (req, res) => {
    res.json({
      ok: true,
      note: 'RTDN stub — préférer RevenueCat webhook (/billing/webhook/revenuecat)',
      received: Boolean(req.body),
    });
  });

  const giftsFile = path.join(dataDir, 'premium-gifts.json');

  function loadGifts() {
    try {
      if (!fs.existsSync(giftsFile)) return [];
      const parsed = JSON.parse(fs.readFileSync(giftsFile, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveGifts(list) {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(giftsFile, JSON.stringify(list, null, 2), 'utf8');
  }

  function normalizeEmail(email) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  const OWNER_EMAIL = String(process.env.OWNER_PREMIUM_EMAIL ?? '').trim().toLowerCase();

  /** Le compte connecté est-il Premium offert ? */
  app.get('/billing/gift-status', authMiddleware, (req, res) => {
    const email = normalizeEmail(req.authEmail);
    const gifted = loadGifts().some((g) => normalizeEmail(g.email) === email);
    res.json({ gifted, email });
  });

  /** Liste des cadeaux — owner uniquement */
  app.get('/billing/gifts', authMiddleware, (req, res) => {
    if (!OWNER_EMAIL || normalizeEmail(req.authEmail) !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'owner_only' });
    }
    res.json({ gifts: loadGifts() });
  });

  /** Ajouter / retirer un cadeau Premium — owner uniquement */
  app.post('/billing/gifts', authMiddleware, (req, res) => {
    if (!OWNER_EMAIL || normalizeEmail(req.authEmail) !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'owner_only' });
    }
    const action = String(req.body?.action || '').toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const label = String(req.body?.label || '').trim() || undefined;
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'invalid_email' });
    }
    if (email === OWNER_EMAIL) {
      return res.status(400).json({ error: 'owner_already_premium' });
    }
    let list = loadGifts();
    if (action === 'add') {
      if (list.some((g) => normalizeEmail(g.email) === email)) {
        return res.status(409).json({ error: 'already_gifted', gifts: list });
      }
      list = [{ email, addedAt: new Date().toISOString(), label }, ...list];
      saveGifts(list);
      try {
        const users = loadUsers();
        const u = users.find((x) => normalizeEmail(x.email) === email);
        if (u && u.premiumSource !== 'paid') {
          u.plan = 'premium_yearly';
          u.premiumSource = 'gift';
          saveUsers(users);
        }
      } catch {
        /* ignore */
      }
      return res.json({ ok: true, gifts: list });
    }
    if (action === 'remove') {
      list = list.filter((g) => normalizeEmail(g.email) !== email);
      saveGifts(list);
      try {
        const users = loadUsers();
        const u = users.find((x) => normalizeEmail(x.email) === email);
        if (u && u.premiumSource === 'gift') {
          u.plan = 'free';
          u.premiumSource = null;
          saveUsers(users);
        }
      } catch {
        /* ignore */
      }
      return res.json({ ok: true, gifts: list });
    }
    return res.status(400).json({ error: 'action must be add|remove' });
  });
}
