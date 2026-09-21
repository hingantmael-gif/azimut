# Paiements Stripe — abonnement Premium (web / PWA)

## Ce qui est en place

| Élément | Où |
|---|---|
| Création de la page de paiement (Checkout Session, mode abonnement) | `backend/src/stripe.js` → `POST /billing/stripe/checkout` |
| Portail client (changer de carte, résilier, factures) | `POST /billing/stripe/portal` |
| Webhook (source de vérité : active / met à jour / coupe le Premium) | `POST /billing/stripe/webhook` |
| Bouton « S'abonner » + retour de paiement | `app/settings/subscription.tsx`, `src/services/billing.ts` |
| Tests (signature, idempotence, statuts) | `cd backend && npm test` |

**Principe de sécurité** : aucune donnée de carte ne passe par Mova (page hébergée par Stripe) ; les clés secrètes ne sont
que sur le serveur ; le Premium n'est activé que par le **webhook signé**, jamais par la simple redirection après paiement.

> Sur les apps **natives** iOS / Android, les abonnements numériques doivent passer par les stores (Apple / Google — déjà
> prévu avec RevenueCat). Stripe est utilisé pour le **web / PWA**.

## 1. Créer les produits dans Stripe (mode test)

1. https://dashboard.stripe.com/test/products → **Ajouter un produit** « Mova Premium ».
2. Ajoute **deux prix récurrents** : 9,99 € / mois et 59,99 € / an (EUR).
3. Copie les deux identifiants `price_…`.
4. Réglages → **Portail de facturation** : active-le (annulation, changement de moyen de paiement, factures).

## 2. Variables d'environnement (Render → ton service API → Environment)

Modèle dans `backend/.env.example` (ne commit jamais les vraies valeurs) :

```
STRIPE_SECRET_KEY=sk_test_...          # Developers → API keys → Secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # étape 3
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
APP_URL=https://hingantmael-gif.github.io
STRIPE_TRIAL_DAYS=7
```

En local : copie `backend/.env.example` en `backend/.env` puis `cd backend && npm install && npm run dev`.
Le paquet `stripe` est déjà installé (`npm install stripe` dans `backend/`).

## 3. Brancher le webhook

**En production / test sur Render** : Developers → Webhooks → **Add endpoint**
- URL : `https://azimut-auth-api.onrender.com/billing/stripe/webhook`
- Événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copie le **Signing secret** (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET`.

**En local** (Stripe CLI, https://docs.stripe.com/stripe-cli) :
```
stripe login
stripe listen --forward-to localhost:8787/billing/stripe/webhook
```
La commande affiche un `whsec_…` temporaire à mettre dans `backend/.env`.

## 4. Tester le tunnel avec des cartes fictives

Dans l'app web : Réglages → Abonnement Premium → **S'abonner**. Sur la page Stripe :

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0025 0000 3155` | Authentification 3D Secure demandée |
| `4000 0000 0000 9995` | Paiement refusé (fonds insuffisants) |
| `4000 0000 0000 0341` | Carte acceptée à l'inscription puis refusée au renouvellement |

Date d'expiration : n'importe quelle date future ; CVC : 3 chiffres au hasard ; code postal : au hasard.
Vérifie ensuite : l'écran repasse en « Tu es Premium », et Developers → Webhooks montre des livraisons `200`.
Pour simuler un renouvellement / une résiliation : `stripe trigger customer.subscription.deleted` ou l'horloge de test
(Billing → Test clocks).

## 5. Passer en production (live)

1. **Activer le compte Stripe** : informations de l'entreprise, IBAN de versement, pièce d'identité.
2. Recréer les **produits et prix en mode live** (les `price_…` de test ne fonctionnent pas en live).
3. Créer le **webhook live** (même URL) et récupérer son `whsec_…` live.
4. Sur Render, remplacer par les valeurs **live** : `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, puis redéployer l'API.
5. Activer le **portail de facturation** en mode live.
6. Mettre `BILLING_TRUST_CLIENT=false` sur Render (empêche un client de s'attribuer le Premium via `/billing/sync`).
7. Redéployer l'app web (`node scripts/deploy-install-site.mjs`).
8. Faire **un vrai paiement de 1 %** (ou une carte réelle puis remboursement) pour valider de bout en bout.
9. Côté légal : CGV et politique de confidentialité mentionnant Stripe, droit de rétractation de 14 jours, mentions
   légales de l'éditeur, TVA (Stripe Tax si besoin), facturation.
