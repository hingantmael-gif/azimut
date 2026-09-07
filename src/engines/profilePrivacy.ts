import type { ProfileVisibility, PrivacySettings } from '../types/domain';

/** Niveau d’accès brut (UI / messages). */
export type ProfileAccessLevel = 'owner' | 'follower' | 'public' | 'restricted';

export type ProfileContentFlags = {
  /** Volumes & activité (km, muscu, nb programmes…) */
  canSeeStats: boolean;
  /** Évolution / temps / progrès */
  canSeeProgress: boolean;
  /**
   * Aperçu programmes : titres / types uniquement
   * (profil public, non abonné).
   */
  canSeeProgramsPreview: boolean;
  /**
   * Détail programmes : complétions, likes, séances liées
   * (abonné ou propriétaire).
   */
  canSeeProgramsDetail: boolean;
  /** Séances enregistrées sur le compte */
  canSeeSessions: boolean;
  canSeeHr: boolean;
};

/**
 * Privé / abonnés-only sans follow → restricted
 * Public sans follow → public
 * Abonné → follower
 */
export function resolveProfileAccess(opts: {
  isOwner: boolean;
  visibility: ProfileVisibility;
  viewerFollows: boolean;
}): ProfileAccessLevel {
  if (opts.isOwner) return 'owner';
  if (opts.viewerFollows) return 'follower';
  if (opts.visibility === 'public') return 'public';
  return 'restricted';
}

/**
 * Règles produit :
 * - Privé (non abonné) → volumes & activité seulement
 * - Public (non abonné) → volumes + évolution + aperçu programmes (pas le détail)
 * - Abonné → tout (sauf masquages explicites)
 */
export function resolveContentFlags(
  access: ProfileAccessLevel,
  privacy: PrivacySettings,
): ProfileContentFlags {
  const hidePrograms = Boolean(privacy.hidePrograms);
  const hideProgress = Boolean(privacy.hideProgress);
  const hideStats = Boolean(privacy.hideStats);
  const hideHr = Boolean(privacy.hideHr);

  if (access === 'owner' || access === 'follower') {
    return {
      canSeeStats: !hideStats,
      canSeeProgress: !hideProgress,
      canSeeProgramsPreview: !hidePrograms,
      canSeeProgramsDetail: !hidePrograms,
      canSeeSessions: !hidePrograms,
      canSeeHr: !hideHr,
    };
  }

  if (access === 'public') {
    return {
      canSeeStats: !hideStats,
      canSeeProgress: !hideProgress,
      canSeeProgramsPreview: !hidePrograms,
      canSeeProgramsDetail: false,
      canSeeSessions: false,
      canSeeHr: false,
    };
  }

  // restricted = privé / abonnés uniquement, sans abonnement
  return {
    canSeeStats: !hideStats,
    canSeeProgress: false,
    canSeeProgramsPreview: false,
    canSeeProgramsDetail: false,
    canSeeSessions: false,
    canSeeHr: false,
  };
}

export function visibilityLabel(v: ProfileVisibility): string {
  if (v === 'public') return 'Public';
  if (v === 'followers_only') return 'Abonnés uniquement';
  if (v === 'masked') return 'Masqué';
  return 'Privé';
}
