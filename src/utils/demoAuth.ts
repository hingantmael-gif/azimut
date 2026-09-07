import { markOnboardingCompleted } from '../storage/onboardingPersistence';

/** Identifiants compte essai local — connexion silencieuse uniquement (jamais affichés dans l’UI). */
export const TRIAL_EMAIL_INPUT = '1';
export const TRIAL_PASSWORD = '1';
export const TRIAL_ACCOUNT_EMAIL = '1@demo.local';

export function isTrialCredentials(
  emailOrUsername: string,
  password: string,
): boolean {
  return (
    emailOrUsername.trim() === TRIAL_EMAIL_INPUT &&
    password.trim() === TRIAL_PASSWORD
  );
}

export function isTrialEmailInput(raw: string): boolean {
  return raw.trim() === TRIAL_EMAIL_INPUT;
}

/** Compte essai local « 1 » / « 1.1 » — QA, accès débloqué (fonds, etc.). */
export function isTrialAccount(profile: {
  email?: string | null;
  username?: string | null;
}): boolean {
  const email = (profile.email ?? '').trim().toLowerCase();
  const username = (profile.username ?? '').trim().toLowerCase();
  return (
    email === TRIAL_ACCOUNT_EMAIL ||
    email === TRIAL_EMAIL_INPUT ||
    username === TRIAL_EMAIL_INPUT
  );
}

/** E-mail inscription : format classique uniquement (pas de raccourci essai). */
export function validateRegistrationEmail(
  raw: string,
): { ok: true } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, error: 'Entrez une adresse e-mail valide.' };
  }
  if (value === TRIAL_EMAIL_INPUT || value.toLowerCase() === TRIAL_ACCOUNT_EMAIL) {
    return { ok: false, error: 'Cet e-mail est déjà utilisé.' };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: true };
  }
  if (/[a-zA-Z]{2,}/.test(value)) {
    return { ok: false, error: 'E-mail incorrect.' };
  }
  if (/^\d{2,}$/.test(value) || (/\d/.test(value) && !value.includes('@'))) {
    return { ok: false, error: 'E-mail incorrect.' };
  }
  return { ok: false, error: 'E-mail incorrect.' };
}

export async function loginTrialAccount(
  clearSession: () => Promise<void>,
  dispatch: (action: {
    type: 'LOGIN';
    payload: {
      emailOrUsername: string;
      password: string;
      onboardingCompleted?: boolean;
    };
  }) => void,
): Promise<void> {
  await clearSession();
  await markOnboardingCompleted(TRIAL_EMAIL_INPUT, TRIAL_ACCOUNT_EMAIL);
  dispatch({
    type: 'LOGIN',
    payload: {
      emailOrUsername: TRIAL_EMAIL_INPUT,
      password: TRIAL_PASSWORD,
      onboardingCompleted: true,
    },
  });
}
