/**
 * Paiements Stripe (abonnement Premium sur le WEB / PWA).
 *
 * Flux :
 *   1. l'app appelle POST /billing/stripe/checkout (connecté) → on crée une Checkout Session et on renvoie son URL ;
 *   2. la personne paie sur la page sécurisée hébergée par Stripe (jamais de carte dans notre code) ;
 *   3. Stripe appelle POST /billing/stripe/webhook (signature vérifiée) → on active / met à jour / coupe le Premium.
 *      Le webhook est la SEULE source de vérité : rediriger vers `success_url` ne suffit pas pour activer le Premium.
 *
 * Variables d'environnement (Render) :
 *   STRIPE_SECRET_KEY       sk_test_… puis sk_live_…
 *   STRIPE_WEBHOOK_SECRET   whsec_… (donné par Stripe pour l'endpoint /billing/stripe/webhook)
 *   STRIPE_PRICE_MONTHLY    price_… (abonnement mensuel)
 *   STRIPE_PRICE_ANNUAL     price_… (abonnement annuel)
 *   APP_URL                 adresse de l'app (redirections après paiement), ex. https://hingantmael-gif.github.io
 *   STRIPE_TRIAL_DAYS       facultatif, 7 par défaut
 */
import Stripe from 'stripe';
import { readDoc, writeDoc } from './storage.js';

const EVENTS_DOC = 'stripe_events';
const MAX_EVENTS = 500;

const env = (k) => String(process.env[k] ?? '').trim();

export function stripeConfigured() {
  return Boolean(env('STRIPE_SECRET_KEY') && env('STRIPE_PRICE_MONTHLY') && env('STRIPE_PRICE_ANNUAL'));
}

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

/** Statut Stripe → statut interne (mêmes valeurs que RevenueCat, cf. billing.js). */
export function mapStripeStatus(status) {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'grace_period'; // paiement en échec : Stripe relance, l'accès est maintenu le temps des relances
    case 'paused':
      return 'paused';
    default:
      return 'expired'; // canceled, unpaid, incomplete, incomplete_expired
  }
}

/** Objet Subscription Stripe → « subscription » interne. */
export function subscriptionFromStripe(sub) {
  const price = sub.items?.data?.[0]?.price;
  const annual = price?.recurring?.interval === 'year' || price?.id === env('STRIPE_PRICE_ANNUAL');
  const status = mapStripeStatus(sub.status);
  const endSec = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? null;
  return {
    entitlement: status === 'expired' ? 'free' : 'premium',
    status,
    productId: annual ? 'mova_premium_annual' : 'mova_premium_monthly',
    currentPeriodEnd: endSec ? new Date(endSec * 1000).toISOString() : null,
    autoRenewing: !sub.cancel_at_period_end && status === 'active',
    platform: 'web',
    source: 'stripe',
    stripeSubscriptionId: sub.id,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * @param app Express
 * @param deps { authMiddleware, loadUsers, saveUsers, applySubscription(email, subscription) }
 * @param opts { stripeFactory?: () => Stripe|null }  (tests : client factice)
 */
export function mountStripeRoutes(app, { authMiddleware, loadUsers, saveUsers, applySubscription }, opts = {}) {
  const client = opts.stripeFactory ?? (() => (env('STRIPE_SECRET_KEY') ? new Stripe(env('STRIPE_SECRET_KEY')) : null));
  const appUrl = () => (env('APP_URL') || 'https://hingantmael-gif.github.io').replace(/\/$/, '');
  const me = (req) => loadUsers().find((u) => normalizeEmail(u.email) === normalizeEmail(req.authEmail));

  app.get('/billing/stripe/config', (_req, res) => {
    res.json({ enabled: stripeConfigured(), trialDays: Number(env('STRIPE_TRIAL_DAYS') || 7) });
  });

  /** 1) Crée la page de paiement Stripe et renvoie son adresse. */
  app.post('/billing/stripe/checkout', authMiddleware, async (req, res) => {
    const stripe = client();
    if (!stripe || !stripeConfigured()) return res.status(503).json({ error: 'stripe_not_configured' });
    const user = me(req);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    if (user.premiumSource === 'owner') return res.status(400).json({ error: 'owner_already_premium' });

    const period = req.body?.period === 'monthly' ? 'monthly' : 'annual';
    const price = env(period === 'monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_ANNUAL');
    try {
      // Un client Stripe par compte : le portail de facturation et les relances en dépendent.
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId: String(user.id ?? ''), email: normalizeEmail(user.email) },
        });
        customerId = customer.id;
        const users = loadUsers();
        const u = users.find((x) => normalizeEmail(x.email) === normalizeEmail(user.email));
        if (u) {
          u.stripeCustomerId = customerId;
          saveUsers(users);
        }
      }
      const trialDays = Number(env('STRIPE_TRIAL_DAYS') || 7);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: String(user.id ?? ''),
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        locale: 'fr',
        billing_address_collection: 'auto',
        subscription_data: {
          // 7 jours d'essai une seule fois par client (Stripe ne le redonne pas si l'essai a déjà été pris via ce client)
          ...(trialDays > 0 && !user.stripeTrialUsed ? { trial_period_days: trialDays } : {}),
          metadata: { userId: String(user.id ?? ''), email: normalizeEmail(user.email) },
        },
        success_url: `${appUrl()}/settings/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/settings/subscription?checkout=cancel`,
      });
      res.json({ ok: true, url: session.url, id: session.id });
    } catch (e) {
      console.error('[stripe] checkout', e?.message);
      res.status(502).json({ error: 'stripe_error' });
    }
  });

  /** 2) Portail Stripe : changer de carte, résilier, télécharger ses factures. */
  app.post('/billing/stripe/portal', authMiddleware, async (req, res) => {
    const stripe = client();
    if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });
    const user = me(req);
    if (!user?.stripeCustomerId) return res.status(404).json({ error: 'no_stripe_customer' });
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl()}/settings/subscription`,
      });
      res.json({ ok: true, url: session.url });
    } catch (e) {
      console.error('[stripe] portal', e?.message);
      res.status(502).json({ error: 'stripe_error' });
    }
  });

  /**
   * 3) Webhook. Le corps doit arriver BRUT (Buffer) : voir `express.raw` monté avant `express.json` dans index.js.
   */
  app.post('/billing/stripe/webhook', async (req, res) => {
    const stripe = client();
    const secret = env('STRIPE_WEBHOOK_SECRET');
    if (!stripe || !secret) return res.status(503).json({ error: 'stripe_not_configured' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
    } catch (e) {
      console.warn('[stripe] signature invalide:', e?.message);
      return res.status(400).send('Invalid signature');
    }

    // Idempotence : Stripe peut renvoyer le même événement.
    const seen = readDoc(EVENTS_DOC, () => ({ ids: [] }));
    const ids = Array.isArray(seen.ids) ? seen.ids : [];
    if (ids.includes(event.id)) return res.json({ received: true, duplicate: true });

    try {
      await handleEvent(event);
      writeDoc(EVENTS_DOC, { ids: [...ids, event.id].slice(-MAX_EVENTS) });
      res.json({ received: true });
    } catch (e) {
      // 500 → Stripe réessaie automatiquement (pendant ~3 jours).
      console.error('[stripe] traitement', event.type, e?.message);
      res.status(500).json({ error: 'processing_failed' });
    }

    async function findEmail(sub) {
      const meta = normalizeEmail(sub.metadata?.email);
      if (meta) return meta;
      const users = loadUsers();
      const byCustomer = users.find((u) => u.stripeCustomerId && u.stripeCustomerId === sub.customer);
      if (byCustomer) return normalizeEmail(byCustomer.email);
      const customer = await stripe.customers.retrieve(sub.customer);
      return normalizeEmail(customer?.email);
    }

    async function applySub(sub) {
      const email = await findEmail(sub);
      if (!email) throw new Error(`utilisateur introuvable pour ${sub.id}`);
      const users = loadUsers();
      const u = users.find((x) => normalizeEmail(x.email) === email);
      if (u && !u.stripeCustomerId && sub.customer) {
        u.stripeCustomerId = sub.customer;
      }
      if (u && (sub.status === 'trialing' || sub.trial_end)) u.stripeTrialUsed = true;
      if (u) saveUsers(users);
      applySubscription(email, subscriptionFromStripe(sub));
    }

    async function handleEvent(ev) {
      switch (ev.type) {
        case 'checkout.session.completed': {
          const s = ev.data.object;
          if (s.mode !== 'subscription' || !s.subscription) return;
          const sub = await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id);
          await applySub(sub);
          return;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await applySub(ev.data.object);
          return;
        case 'invoice.payment_failed':
        case 'invoice.paid': {
          const inv = ev.data.object;
          const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription;
          if (!subId) return;
          await applySub(await stripe.subscriptions.retrieve(typeof subId === 'string' ? subId : subId.id));
          return;
        }
        default:
          return; // événement non utilisé
      }
    }
  });
}
