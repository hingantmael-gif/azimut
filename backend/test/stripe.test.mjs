import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountStripeRoutes, subscriptionFromStripe } from '../src/stripe.js';

const SECRET = 'whsec_test_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.STRIPE_PRICE_MONTHLY = 'price_month';
process.env.STRIPE_PRICE_ANNUAL = 'price_year';
process.env.APP_URL = 'https://app.example';

const real = new Stripe('sk_test_123');
const calls = { session: null, subs: {} };
const fakeClient = {
  webhooks: real.webhooks,
  customers: { create: async () => ({ id: 'cus_1' }), retrieve: async () => ({ email: 'a@b.fr' }) },
  checkout: { sessions: { create: async (p) => { calls.session = p; return { id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' }; } } },
  billingPortal: { sessions: { create: async () => ({ url: 'https://billing.stripe.com/p/x' }) } },
  subscriptions: { retrieve: async (id) => calls.subs[id] },
};

const users = [{ id: 'u1', email: 'a@b.fr', firstName: 'A', lastName: 'B' }];
const applied = [];
function makeApp() {
  const app = express();
  app.use('/billing/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  mountStripeRoutes(
    app,
    { authMiddleware: (req, _res, next) => { req.authEmail = 'a@b.fr'; next(); }, loadUsers: () => users, saveUsers: () => undefined, applySubscription: (email, sub) => applied.push({ email, sub }) },
    { stripeFactory: () => fakeClient },
  );
  return app;
}
const sub = (over = {}) => ({ id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', cancel_at_period_end: false, current_period_end: 1893456000, metadata: { email: 'a@b.fr' }, items: { data: [{ price: { id: 'price_year', recurring: { interval: 'year' } } }] }, ...over });
const signed = (event) => {
  const payload = JSON.stringify(event);
  return { payload, header: real.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
};

let server, base;
test.before(async () => { server = makeApp().listen(0); base = `http://localhost:${server.address().port}`; });
test.after(() => {
  server.close();
  const f = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'stripe_events.json');
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

test('Checkout : crée une session d’abonnement annuelle avec essai et retours', async () => {
  const r = await fetch(`${base}/billing/stripe/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ period: 'annual' }) });
  assert.equal(r.status, 200);
  assert.match((await r.json()).url, /checkout\.stripe\.com/);
  assert.equal(calls.session.mode, 'subscription');
  assert.deepEqual(calls.session.line_items, [{ price: 'price_year', quantity: 1 }]);
  assert.equal(calls.session.subscription_data.trial_period_days, 7);
  assert.match(calls.session.success_url, /^https:\/\/app\.example\/settings\/subscription\?checkout=success/);
});

test('Webhook : signature invalide → 400, rien n’est activé', async () => {
  const r = await fetch(`${base}/billing/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' }, body: JSON.stringify({ id: 'evt_bad', type: 'customer.subscription.updated', data: { object: sub() } }) });
  assert.equal(r.status, 400);
  assert.equal(applied.length, 0);
});

test('Webhook : abonnement actif → Premium annuel activé, idempotent', async () => {
  const { payload, header } = signed({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: sub() } });
  const post = () => fetch(`${base}/billing/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body: payload });
  assert.equal((await post()).status, 200);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].email, 'a@b.fr');
  assert.equal(applied[0].sub.entitlement, 'premium');
  assert.equal(applied[0].sub.productId, 'mova_premium_annual');
  assert.equal((await (await post()).json()).duplicate, true);
  assert.equal(applied.length, 1);
});

test('Webhook : checkout.session.completed relit l’abonnement chez Stripe', async () => {
  calls.subs.sub_2 = sub({ id: 'sub_2', items: { data: [{ price: { id: 'price_month', recurring: { interval: 'month' } } }] } });
  const { payload, header } = signed({ id: 'evt_2', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_2' } } });
  const r = await fetch(`${base}/billing/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body: payload });
  assert.equal(r.status, 200);
  assert.equal(applied.at(-1).sub.productId, 'mova_premium_monthly');
});

test('Webhook : abonnement supprimé / impayé → retour au gratuit', async () => {
  const { payload, header } = signed({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: sub({ status: 'canceled' }) } });
  const r = await fetch(`${base}/billing/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body: payload });
  assert.equal(r.status, 200);
  assert.equal(applied.at(-1).sub.entitlement, 'free');
  assert.equal(applied.at(-1).sub.status, 'expired');
});

test('Statuts : essai = actif, impayé en relance = grâce, résiliation programmée = fin d’auto-renouvellement', () => {
  assert.equal(subscriptionFromStripe(sub({ status: 'trialing' })).status, 'active');
  assert.equal(subscriptionFromStripe(sub({ status: 'past_due' })).status, 'grace_period');
  assert.equal(subscriptionFromStripe(sub({ cancel_at_period_end: true })).autoRenewing, false);
});
