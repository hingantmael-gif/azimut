/** Politique mot de passe Azimut — majuscule, minuscule, chiffre, caractère spécial. */

export const PASSWORD_SPECIAL_CHARS = `!@#$%^&*()_+-=[]{}|;:'",.<>/?\\\`~`;

export type PasswordRuleId = 'lower' | 'upper' | 'digit' | 'special';

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  ok: boolean;
};

const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /\d/;
/** Point, virgule, tirets, underscore, et autres spéciaux courants */
const SPECIAL = /[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?\\`~]/;

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { id: 'lower', label: 'Une lettre minuscule', ok: LOWER.test(password) },
    { id: 'upper', label: 'Une lettre majuscule', ok: UPPER.test(password) },
    { id: 'digit', label: 'Un chiffre', ok: DIGIT.test(password) },
    {
      id: 'special',
      label: 'Un caractère spécial (. , - _ ! @ # …)',
      ok: SPECIAL.test(password),
    },
  ];
}

export function validatePassword(
  password: string,
): { ok: true } | { ok: false; error: string; rules: PasswordRule[] } {
  const rules = getPasswordRules(password);
  const missing = rules.filter((r) => !r.ok);
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    error: `Mot de passe incomplet : ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`,
    rules,
  };
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}
