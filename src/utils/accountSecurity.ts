import {
  TRIAL_ACCOUNT_EMAIL,
  TRIAL_PASSWORD,
  isTrialCredentials,
} from './demoAuth';

/** Vérifie le mot de passe avant suppression (compte essai ou session locale). */
export function verifyAccountPassword(
  profileEmail: string,
  profileUsername: string,
  password: string,
): boolean {
  const pwd = password.trim();
  if (!pwd) return false;
  if (
    isTrialCredentials('1', pwd) &&
    (profileEmail === TRIAL_ACCOUNT_EMAIL ||
      profileUsername === '1' ||
      profileEmail === '1')
  ) {
    return true;
  }
  if (profileEmail === TRIAL_ACCOUNT_EMAIL && pwd === TRIAL_PASSWORD) {
    return true;
  }
  // Comptes locaux sans hash stocké : mot de passe saisi accepté si non vide
  return pwd.length >= 1;
}
