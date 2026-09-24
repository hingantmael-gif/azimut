/** Teinte d'ambiance par sport / discipline : [couleur principale, couleur secondaire]. */
export const SPORT_TINTS: Record<string, readonly [string, string]> = {
  run: ['#3DFF9A', '#22D3EE'],
  bike: ['#FBBF24', '#F97316'],
  swim: ['#38BDF8', '#6366F1'],
  triathlon: ['#22D3EE', '#5EEAD4'],
  ironman: ['#FB923C', '#F43F5E'],
  strength: ['#A3E635', '#4ADE80'],
  calisthenics: ['#FB923C', '#FBBF24'],
  other: ['#94A3B8', '#3DFF9A'],
};

export type SportTint = readonly [string, string];

export function tintForSport(sport?: string | null): SportTint {
  return (sport && SPORT_TINTS[sport]) || SPORT_TINTS.run!;
}

/**
 * Ramène n'importe quel libellé de sport / discipline (plan, activité, programme, saisie)
 * à une clé de `SPORT_TINTS`.
 */
export function sportKeyFrom(raw?: string | null): string {
  const s = (raw ?? '').toLowerCase();
  if (!s || s === 'rest') return 'run';
  if (s in SPORT_TINTS) return s;
  if (/iron/.test(s)) return 'ironman';
  if (/tri|brick/.test(s)) return 'triathlon';
  if (/swim|nat|pool|eau/.test(s)) return 'swim';
  if (/bike|ride|cycl|v[eé]lo|vtt/.test(s)) return 'bike';
  if (/calis|ppg|pull|street/.test(s)) return 'calisthenics';
  if (/strength|muscu|gym|force|renfo/.test(s)) return 'strength';
  if (/run|course|trail|marathon|semi|10k|5k/.test(s)) return 'run';
  if (/mobil|yoga|stretch/.test(s)) return 'other';
  return 'run';
}

/** Mélange de deux couleurs hex (#RRGGBB) : t = part de `b` (0..1). */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar!, br!)}${c(ag!, bg!)}${c(ab!, bb!)}`;
}

/** Trois couleurs du dégradé de fond selon la teinte et le thème. */
export function atmosphereBase(tint: SportTint, isDark: boolean): readonly [string, string, string] {
  if (isDark) {
    return [mixHex('#050B16', tint[0], 0.06), mixHex('#0A1A2B', tint[1], 0.08), mixHex('#06121E', tint[0], 0.05)];
  }
  return [mixHex('#FFFFFF', tint[0], 0.26), mixHex('#F7FAFC', tint[1], 0.2), mixHex('#FFFFFF', tint[0], 0.22)];
}
