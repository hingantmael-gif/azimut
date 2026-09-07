/**
 * Feature flags Premium / Pro.
 *
 * `PREMIUM_UI_ENABLED` doit rester `false` tant que le paywall n’est pas demandé.
 * Le design (couronne, pastilles) est prêt dans `src/ui/premium/` mais invisible.
 */
export const PREMIUM_UI_ENABLED = false;

/** Quand true + UI activée : les features listées affichent la couronne Pro. */
export const PREMIUM_GATES_ENABLED = false;

export function isPremiumUiVisible(): boolean {
  return PREMIUM_UI_ENABLED;
}

export function isPremiumGateActive(): boolean {
  return PREMIUM_UI_ENABLED && PREMIUM_GATES_ENABLED;
}
