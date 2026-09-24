/**
 * INTERRUPTEUR PREMIUM — un seul endroit.
 *
 * Mode actuel : TOUT EST GRATUIT. Le code Premium (paywall, quotas, abonnement, cadeaux, covers, boucliers)
 * reste intact mais désactivé : aucune limite, aucun mot « Premium » visible dans l'app.
 * Pour tout remettre : passer les deux constantes à true.
 */
export const PREMIUM_UI_ENABLED = false;

/** Gates Free/Premium (quotas, multi-programmes, covers prem-*). */
export const PREMIUM_GATES_ENABLED = false;

export function isPremiumUiVisible(): boolean {
  return PREMIUM_UI_ENABLED;
}

export function isPremiumGateActive(): boolean {
  return PREMIUM_UI_ENABLED && PREMIUM_GATES_ENABLED;
}
