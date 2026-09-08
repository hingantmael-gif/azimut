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

/**
 * Normalise une saisie e-mail (espaces, @ pleine chasse, casse).
 * Accepte Gmail, Outlook, Orange, Free, Yahoo, univ, etc.
 */
export function normalizeEmailInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\uFF20/g, '@') // ＠ pleine chasse → @
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Format e-mail large : local@domaine (tous FAI : gmail, outlook, orange.fr, free.fr…).
 * Pas de liste blanche. Accepte aussi domaines à un seul label rare (ex. intranet).
 */
export function isValidEmailFormat(raw: string): boolean {
  const value = normalizeEmailInput(raw);
  if (!value || value.length > 254) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || !domain || local.length > 64) return false;
  if (/\s/.test(local) || /\s/.test(domain)) return false;
  // Domaine avec au moins un point (orange.fr) OU label DNS simple
  return /^[^\s@]+$/.test(domain) && (domain.includes('.') ? /\.[^\s@.]{2,}$/.test(domain) : domain.length >= 2);
}

/** E-mail inscription : tout fournisseur (gmail, outlook, orange.fr, …). */
export function validateRegistrationEmail(
  raw: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const value = normalizeEmailInput(raw);
  if (!value) {
    return { ok: false, error: 'Entrez une adresse e-mail (ex. toi@orange.fr).' };
  }
  if (value === TRIAL_EMAIL_INPUT || value === TRIAL_ACCOUNT_EMAIL) {
    return { ok: false, error: 'Cet e-mail est déjà utilisé.' };
  }
  if (!value.includes('@')) {
    return {
      ok: false,
      error: 'Il manque le @ — ex. prenom@gmail.com ou toi@orange.fr.',
    };
  }
  if (isValidEmailFormat(value)) {
    return { ok: true, email: value };
  }
  return {
    ok: false,
    error:
      'Adresse incomplète. Exemples : toi@gmail.com, toi@outlook.com, toi@orange.fr',
  };
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
