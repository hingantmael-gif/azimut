/**
 * Libellés FR en clair — sans marques Unicode bidi (LRI/PDI/LRM).
 * Ces marques provoquaient des lettres fantômes (ex. « U » en trop) et
 * des titres inversés (« Programme Nouveau », « connecter Se »).
 * L’ordre LTR est forcé via `writingDirection: 'ltr'` côté Text.
 */

/** Retire tout isolat / marque directionnelle résiduel. */
export function stripBidiMarks(text: string): string {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
}

/** Texte FR brut (compat : anciennement injectait des isolats LTR). */
export function ltrFr(text: string): string {
  return stripBidiMarks(text);
}

/** Texte FR brut (compat : anciennement isolait chaque mot). */
export function forceLtrWords(text: string): string {
  return stripBidiMarks(text);
}

export const AUTH_PLAIN = {
  signIn: 'Se connecter',
  signInBusy: 'Connexion…',
  alreadyHaveAccount: 'Déjà un compte ? Se connecter',
  needAccount: 'Pas encore de compte ? Inscription',
} as const;

/** Alias clairs — mêmes chaînes que AUTH_PLAIN (plus de forceLtrWords). */
export const AUTH_LABELS = {
  signIn: AUTH_PLAIN.signIn,
  signInBusy: AUTH_PLAIN.signInBusy,
  alreadyHaveAccount: AUTH_PLAIN.alreadyHaveAccount,
  needAccount: AUTH_PLAIN.needAccount,
} as const;

export const UI_PLAIN = {
  newProgram: 'Nouveau Programme',
} as const;

export const UI_LABELS = {
  newProgram: UI_PLAIN.newProgram,
} as const;
