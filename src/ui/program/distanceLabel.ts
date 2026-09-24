/** Repère de distance tiré du titre d'un programme : « Programme 10 km » → « 10K », Semi → 21K. */
export function distanceLabelFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  if (/marathon/.test(t) && !/semi|demi/.test(t)) return '42K';
  if (/semi|demi/.test(t)) return '21K';
  const km = /(\d+(?:[.,]\d+)?)\s*(km|k)\b/.exec(t);
  if (km) return `${km[1]!.replace(',', '.')}K`;
  const m = /(\d+(?:[.,]\d+)?)\s*m\b/.exec(t);
  return m ? `${m[1]}m` : null;
}
