/**
 * Formate une saisie de date JJ/MM/AAAA :
 * l’utilisateur tape uniquement des chiffres (ex. 01011990),
 * les « / » sont insérés automatiquement après le jour et le mois.
 */
export function formatDateSlashInput(raw: string, maxDigits = 8): string {
  const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Formate une saisie de chrono mm:ss ou h:mm:ss :
 * l’utilisateur tape uniquement des chiffres (ex. 1530 → 15:30, 14500 → 1:45:00).
 * Les « : » s’ajoutent automatiquement.
 */
export function formatRaceClockInput(raw: string, maxDigits = 6): string {
  const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  const hourLen = digits.length - 4;
  return `${digits.slice(0, hourLen)}:${digits.slice(hourLen, hourLen + 2)}:${digits.slice(hourLen + 2)}`;
}
