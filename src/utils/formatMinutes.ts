/** Durée lisible à partir de minutes entières (« 45 min », « 1 h 30 min », « 2 h »). */
export function formatMinutes(totalMin: number): string {
  if (!Number.isFinite(totalMin) || totalMin <= 0) return '—';
  const min = Math.round(totalMin);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
