/**
 * Point d’entrée Premium UI — tout est no-op / invisible tant que le flag est off.
 *
 * Usage futur :
 *   import { ProCrown, ProLockBadge, isPremiumUiVisible } from '../ui/premium';
 *   {isPremiumUiVisible() && <ProLockBadge />}
 */
export { isPremiumUiVisible, isPremiumGateActive } from '../../premium/featureFlags';
export { PRO_FEATURES, getProFeature, type ProFeatureId } from '../../premium/proFeatures';
export { ProCrown } from './ProCrown';
export { ProLockBadge, ProLabeledRow } from './ProLockBadge';
export { PaywallSheet } from './PaywallSheet';
export { PremiumBadge } from './PremiumBadge';
export {
  hasPremiumAccess,
  shouldEnforceFreeLimits,
  canStackAnotherProgram,
} from '../../premium/entitlement';
export {
  FREE_QUOTAS,
  BILLING_DISPLAY_PRICES,
  PAYWALL_COPY,
  type PaywallReason,
} from '../../premium/quotas';
