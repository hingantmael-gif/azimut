/** Détection du mode démo interne : tout saisi à "1" */
export function isDemoOnes(values: string[]): boolean {
  return values.length > 0 && values.every((v) => v.trim() === '1');
}
