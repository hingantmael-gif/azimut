/**
 * Feature flags Premium / Pro.
 * Activés pour la préparation Play Store — la boucle essentielle reste gratuite.
 */
export const PREMIUM_UI_ENABLED = true;

/** Gates Free/Premium (quotas, multi-programmes, covers prem-*). */
export const PREMIUM_GATES_ENABLED = true;

export function isPremiumUiVisible(): boolean {
  return PREMIUM_UI_ENABLED;
}

export function isPremiumGateActive(): boolean {
  return PREMIUM_UI_ENABLED && PREMIUM_GATES_ENABLED;
}
