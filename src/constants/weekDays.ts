/** Indices JS Date : 0 = dimanche … 6 = samedi (stockage inchangé). */

/** Affichage Lundi → Dimanche */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
};

export const WEEKDAY_LETTER_LABELS: Record<number, string> = {
  0: 'D',
  1: 'L',
  2: 'M',
  3: 'M',
  4: 'J',
  5: 'V',
  6: 'S',
};

export function weekdayShortLabel(dow: number): string {
  return WEEKDAY_SHORT_LABELS[dow] ?? '?';
}

export function weekdayLetterLabel(dow: number): string {
  return WEEKDAY_LETTER_LABELS[dow] ?? '?';
}
