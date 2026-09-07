/** Règles identifiant public (@username) — minuscules + chiffres, longueur libre */

const USERNAME_RE = /^[a-z0-9]+$/;

/** Minuscules, chiffres seulement — retire @, espaces, accents, symboles, underscores */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^@+/, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Normalise la saisie (pas de plafond de longueur). */
export function limitUsernameInput(raw: string): string {
  return normalizeUsername(raw);
}

export function validateUsernameFormat(
  username: string,
): { ok: true } | { ok: false; error: string } {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: 'Choisissez un identifiant.' };
  if (!USERNAME_RE.test(u)) {
    return {
      ok: false,
      error: 'Uniquement des lettres minuscules et des chiffres (pas de symboles).',
    };
  }
  return { ok: true };
}

export function formatUsernameDisplay(username: string): string {
  const u = normalizeUsername(username);
  return u ? `@${u}` : '—';
}
