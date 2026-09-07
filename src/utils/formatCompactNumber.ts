/**
 * Affichage compact FR pour volumes / compteurs :
 * 520 → « 520 » · 1 050 → « 1,05 K » · 2 300 000 → « 2,30 M »
 */
export function formatCompactNumber(
  value: number,
  opts?: { empty?: string; maxDecimalsUnderK?: number },
): string {
  if (!Number.isFinite(value) || value <= 0) {
    return opts?.empty ?? '—';
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return `${formatTwoDecimals(abs / 1_000_000)} M`;
  }
  if (abs >= 1_000) {
    return `${formatTwoDecimals(abs / 1_000)} K`;
  }

  const maxDec = opts?.maxDecimalsUnderK ?? 1;
  if (Number.isInteger(abs) || maxDec === 0) {
    return Math.round(abs).toLocaleString('fr-FR');
  }
  const rounded = Math.round(abs * 10 ** maxDec) / 10 ** maxDec;
  return rounded.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec,
  });
}

function formatTwoDecimals(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
