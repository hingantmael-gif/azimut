export type AuthSession = {
  authToken: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
};

/** Route cible si la session ne correspond pas au segment courant, sinon null. */
export function getAuthRedirect(segments: string[], session: AuthSession): string | null {
  const root = segments[0];
  const page = segments[1];
  const inAuth = root === '(auth)';
  /** Page d’installation PWA — publique, sans compte */
  const inInstall = root === 'install';
  /** Pages légales — publiques (validation Google OAuth) */
  const pathKey = segments.filter(Boolean).join('/');
  const isPublicLegal =
    pathKey === 'settings/privacy-policy' || pathKey === 'settings/terms';

  // Sans compte → écran d’accueil / login (comme BTP Pro), PAS /install (évite spinner infini)
  if (!session.authToken && !inAuth && !inInstall && !isPublicLegal) return '/(auth)/welcome';
  if (
    session.authToken &&
    !session.emailVerified &&
    page !== 'verify-2fa' &&
    page !== 'register'
  ) {
    return '/(auth)/verify-2fa';
  }
  if (
    session.authToken &&
    session.emailVerified &&
    !session.onboardingCompleted &&
    page !== 'onboarding'
  ) {
    return '/(auth)/onboarding';
  }
  if (session.authToken && session.onboardingCompleted && (inAuth || inInstall)) {
    return '/(tabs)';
  }
  return null;
}

export function isRouteAuthorized(segments: string[], session: AuthSession): boolean {
  return getAuthRedirect(segments, session) === null;
}
