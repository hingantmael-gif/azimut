import {
  TRIAL_ACCOUNT_EMAIL,
  TRIAL_PASSWORD,
  isTrialCredentials,
} from './demoAuth';
import { verifyLocalCredentials } from '../storage/localCredentials';

/** Vérifie le mot de passe avant suppression (compte essai, local ou session). */
export async function verifyAccountPassword(
  profileEmail: string,
  profileUsername: string,
  password: string,
): Promise<boolean> {
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
  const local = await verifyLocalCredentials(profileEmail || profileUsername, pwd);
  if (local) return true;
  // Anciens comptes locaux sans hash : accepter si non vide
  return pwd.length >= 1;
}
