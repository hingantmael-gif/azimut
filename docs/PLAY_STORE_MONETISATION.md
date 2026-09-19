# Azimut — checklist Play Store / monétisation (sept. 2026)

## Déjà en place dans le code

- [x] Flags `PREMIUM_UI_ENABLED` + `PREMIUM_GATES_ENABLED`
- [x] Quotas Free : 5 imports / 3 Strava / 3 montre / mois ; 1 programme actif
- [x] Soft paywall (`PaywallSheet`) + page vente `settings/subscription`
- [x] Covers `prem-*` gated Premium
- [x] XP compétitif **égalitaire** (pas de bonus pay-to-win)
- [x] Backend `/billing/status`, `/billing/sync`, `/billing/config`, `/billing/webhook/revenuecat`
- [x] Client `src/services/billing.ts` (RevenueCat via require dynamique)

## À faire dans Google Play Console

1. Compte développeur + fiche app Azimut
2. Monétiser → Abonnements :
   - `azimut_premium_monthly`
   - `azimut_premium_annual`
   - essai gratuit 7 jours (recommandé)
3. Compte de service lié à RevenueCat (lecture abonnements)
4. Testeurs de licence + Play Billing Lab
5. Billing Library **v8+** avant deadline août/nov. 2026

## RevenueCat + EAS

```bash
npx expo install react-native-purchases react-native-purchases-ui
eas build --profile development --platform android
```

Variables :

- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (plus tard)
- `REVENUECAT_WEBHOOK_SECRET` (backend Render)

Entitlement unique : `premium` lié aux 2 product IDs.

## Web vs Android

| Surface | Achats |
|---------|--------|
| PWA GitHub Pages | Présentation + quotas + owner/gift ; pas de Play Billing |
| APK / Play | RevenueCat → `APPLY_SUBSCRIPTION` + `premiumSource: paid` |

## Conformité

- Paiement in-app uniquement (pas de lien web de contournement)
- Lien « Gérer dans Google Play » déjà sur la page abonnement
- Restaurer mes achats → `Purchases.restorePurchases()`
- Ne jamais couper brutalement en `grace_period` (mapping déjà documenté dans `entitlement.ts`)
